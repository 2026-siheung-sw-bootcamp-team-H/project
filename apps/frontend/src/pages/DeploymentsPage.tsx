import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Code2,
  Download,
  Eye,
  RotateCcw,
  Rocket,
  ShieldCheck,
  UserCheck,
  X
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatDate } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";

const deployableStatuses = [
  "holdout_passed",
  "shadow_mode",
  "approval_required",
  "approved",
  "active"
];

const auditActionLabels: Record<string, string> = {
  RULE_SHADOW: "Shadow 모드 적용",
  RULE_APPROVAL_REQUESTED: "실제 차단 승인 요청",
  RULE_APPROVED: "Active 차단 승인",
  RULE_ACTIVE: "ModSecurity Active 적용",
  RULE_REJECTED: "룰 배포 반려",
  RULE_ROLLBACK: "룰 롤백"
};

export function DeploymentsPage() {
  const [reviewReason, setReviewReason] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const serviceId = useServiceStore((state) => state.selectedServiceId);
  const rulesQuery = useQuery({
    queryKey: ["rules", serviceId],
    queryFn: () => platformApi.getRules(serviceId ?? undefined),
    enabled: Boolean(serviceId)
  });
  const requestedRuleId = searchParams.get("ruleId");
  const selectedId =
    rulesQuery.data?.find((rule) => rule.id === requestedRuleId)?.id ??
    rulesQuery.data?.find((rule) => deployableStatuses.includes(rule.status))?.id ??
    rulesQuery.data?.[0]?.id ??
    "";
  const ruleQuery = useQuery({
    queryKey: ["rule", selectedId],
    queryFn: () => platformApi.getRule(selectedId),
    enabled: Boolean(selectedId)
  });
  const deploymentsQuery = useQuery({
    queryKey: ["deployments", serviceId],
    queryFn: () => platformApi.getDeployments(serviceId ?? undefined),
    enabled: Boolean(serviceId)
  });
  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", serviceId],
    queryFn: () => platformApi.getAuditLogs(50),
    enabled: Boolean(serviceId),
    refetchInterval: 10_000
  });
  const servicesQuery = useQuery({ queryKey: ["services"], queryFn: platformApi.getServices });
  const shadowMetricsQuery = useQuery({
    queryKey: ["shadow-metrics", selectedId],
    queryFn: () => platformApi.getShadowMetrics(selectedId),
    enabled: Boolean(
      selectedId &&
        ["shadow_mode", "approval_required", "approved", "active"].includes(
          ruleQuery.data?.status ?? ""
        )
    ),
    refetchInterval: 5000
  });
  const artifactQuery = useQuery({
    queryKey: ["rule-artifact", selectedId],
    queryFn: () => platformApi.getRuleArtifact(selectedId),
    enabled: Boolean(selectedId)
  });
  const securityScansQuery = useQuery({
    queryKey: ["security-scans", ruleQuery.data?.protectedServiceId],
    queryFn: () => platformApi.getSecurityScans(ruleQuery.data?.protectedServiceId),
    enabled: Boolean(ruleQuery.data?.protectedServiceId),
    refetchInterval: 5000
  });
  const comparisonQuery = useQuery({
    queryKey: ["security-scan-comparison", selectedId],
    queryFn: () => platformApi.getSecurityScanComparison(selectedId),
    enabled: ruleQuery.data?.status === "active",
    retry: false
  });

  const action = useMutation({
    mutationFn: async () => {
      const rule = ruleQuery.data;
      if (!rule) throw new Error("배포할 룰을 선택해 주세요.");
      if (rule.status === "holdout_passed") {
        try {
          return await platformApi.deployRule(rule.id, "shadow");
        } catch (error) {
          if (platformApi.isApiError(error) && error.code === "BEFORE_DEPLOYMENT_SCAN_REQUIRED") {
            return platformApi.startSecurityScan({
              stage: "BEFORE_DEPLOYMENT",
              protectedServiceId: rule.protectedServiceId,
              ruleId: rule.id
            });
          }
          throw error;
        }
      }
      if (rule.status === "shadow_mode") return platformApi.requestApproval(rule.id);
      if (rule.status === "approval_required")
        return platformApi.approveRule(rule.id, "검증 결과와 Shadow 모니터링 확인");
      if (rule.status === "approved") return platformApi.deployRule(rule.id, "active");
      if (rule.status === "active") return platformApi.deployRule(rule.id, "rollback");
      throw new Error("현재 상태에서는 배포 작업을 실행할 수 없습니다.");
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rule", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["rules", serviceId] }),
        queryClient.invalidateQueries({ queryKey: ["deployments", serviceId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", serviceId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs", serviceId] })
      ]);
      if ("scan" in result) {
        navigate(`/scans/${result.scan.id}`);
      } else if ("securityScan" in result && result.securityScan) {
        navigate(`/scans/${result.securityScan.id}`);
      }
    }
  });
  const reject = useMutation({
    mutationFn: async () => {
      if (!reviewReason.trim()) throw new Error("반려 사유를 입력해 주세요.");
      return platformApi.rejectRule(selectedId, reviewReason.trim());
    },
    onSuccess: async () => {
      setReviewReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rule", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["rules", serviceId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs", serviceId] })
      ]);
    }
  });
  const shadowRescan = useMutation({
    mutationFn: async () => {
      const rule = ruleQuery.data;
      if (!rule) throw new Error("재검증할 룰을 찾지 못했습니다.");
      const shadowDeployment = deploymentsQuery.data?.find(
        (item) => item.ruleId === rule.id && item.status === "shadow"
      );
      return platformApi.startSecurityScan({
        stage: "SHADOW_VERIFICATION",
        protectedServiceId: rule.protectedServiceId,
        ruleId: rule.id,
        ...(shadowDeployment ? { deploymentId: shadowDeployment.id } : {})
      });
    },
    onSuccess: ({ scan }) => navigate(`/scans/${scan.id}`)
  });

  if (!serviceId || rulesQuery.isLoading || deploymentsQuery.isLoading) return <LoadingState />;
  if (rulesQuery.isError || deploymentsQuery.isError)
    return <ErrorState message="배포 정보를 불러오지 못했습니다." />;
  const rules = rulesQuery.data ?? [];
  if (rules.length === 0)
    return (
      <EmptyState label="배포할 방어 룰이 없습니다. 먼저 공격 요청에서 시그니처를 생성하고 검증하세요." />
    );
  if (ruleQuery.isLoading) return <LoadingState />;
  const rule = ruleQuery.data;
  if (!rule) return <ErrorState message="선택한 룰을 찾지 못했습니다." />;

  const protectedService = servicesQuery.data?.find((item) => item.id === rule.protectedServiceId);
  const canDeployToLocalWaf = protectedService?.slug === "demo-shop";
  const actionLabel = (
    {
      holdout_passed: "Shadow 모드로 배포",
      shadow_mode: "실제 차단 요청",
      approval_required: "실제 차단 승인",
      approved: "Active 차단 전환",
      active: "이전 버전으로 롤백"
    } as Partial<Record<typeof rule.status, string>>
  )[rule.status];
  const deploymentBlocked =
    !canDeployToLocalWaf &&
    ["holdout_passed", "shadow_mode", "approval_required", "approved"].includes(rule.status);
  const activeStep =
    rule.status === "active"
      ? 4
      : rule.status === "approved" || rule.status === "approval_required"
        ? 3
        : rule.status === "shadow_mode"
          ? 2
          : 1;
  const histories = (deploymentsQuery.data ?? []).filter((item) => item.ruleId === rule.id);
  const ruleIds = new Set(rules.map((item) => item.id));
  const recentAdminActions = (auditLogsQuery.data ?? [])
    .filter((item) => ruleIds.has(item.resourceId) && Boolean(auditActionLabels[item.action]))
    .slice(0, 10);
  const shadowScan = securityScansQuery.data?.find(
    (scan) => scan.ruleId === rule.id && scan.stage === "shadow_verification"
  );
  const waitingForShadowVerification =
    rule.status === "shadow_mode" && shadowScan?.status !== "completed";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="WAF delivery"
        title="방어 룰 배포 관리"
        description="먼저 요청을 차단하지 않는 Shadow 모드로 적용해 탐지 결과를 확인한 뒤, 관리자 승인 후 실제 차단으로 전환합니다."
        actions={
          actionLabel ? (
            <button
              type="button"
              onClick={() => action.mutate()}
              disabled={action.isPending || deploymentBlocked || waitingForShadowVerification}
              className={rule.status === "active" ? buttonSecondary : buttonPrimary}
            >
              {rule.status === "active" ? (
                <RotateCcw className="size-4" />
              ) : (
                <Rocket className="size-4" />
              )}
              {action.isPending
                ? "처리 중..."
                : deploymentBlocked
                  ? "외부 WAF 자동 배포 미지원"
                  : waitingForShadowVerification
                    ? "Shadow 자동 재검증 중"
                    : actionLabel}
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <Link to={`/rules/${rule.id}`} className={buttonPrimary}>
              룰 상태 확인
              <ArrowRight className="size-4" />
            </Link>
          )
        }
      />
      {(action.isError || reject.isError || shadowRescan.isError) && (
        <ErrorState message={(action.error ?? reject.error ?? shadowRescan.error)?.message} />
      )}

      {deploymentBlocked && (
        <section className="rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
          일반 외부 서비스는 현재 연결 확인·ZAP 진단·룰 검증과 ModSecurity 룰 Export까지 지원합니다.
          실제 Shadow/Active 자동 적용은 로컬 Demo Shop WAF에서만 가능합니다.
        </section>
      )}

      <label className="block max-w-xl">
        <span className="mb-2 block text-xs font-semibold text-[#949ba4]">배포 대상 룰</span>
        <select
          value={rule.id}
          onChange={(event) => setSearchParams({ ruleId: event.target.value })}
          className="w-full rounded-md border border-white/[0.08] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none focus:border-[#5865f2]"
        >
          {rules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.externalId} · {item.status}
            </option>
          ))}
        </select>
      </label>

      <ol className="grid gap-2 sm:grid-cols-4">
        {["검증 통과", "차단 없이 관찰", "관리자 승인", "실제 차단"].map((label, index) => {
          const step = index + 1;
          const done = step < activeStep;
          return (
            <li
              key={label}
              className={`rounded-lg border p-4 ${step === activeStep ? "border-[#5865f2]/50 bg-[#5865f2]/10" : "border-white/[0.06] bg-[#1e1f22]"}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-400 text-[#111214]" : step === activeStep ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#6d6f78]"}`}
              >
                {done ? <Check className="size-3.5" /> : step}
              </span>
              <p
                className={`mt-3 text-sm font-semibold ${step <= activeStep ? "text-white" : "text-[#6d6f78]"}`}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-[#5865f2]/35 bg-[#5865f2]/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#5865f2] text-white">
            <ShieldCheck className="size-7" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm font-bold text-white">{rule.externalId}</p>
              <StatusBadge status={rule.status} />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white">Nginx / ModSecurity</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b5bac1]">
              Shadow 모드는 요청을 막지 않고 탐지 결과만 기록하며, 적용 직후 자동 재검증을
              시작합니다. 결과를 확인하고 승인하면 생성된 SecRule이 실제 공격 요청을 차단합니다.
            </p>
          </div>
          <Link to={`/reports/${rule.id}`} className={buttonSecondary}>
            <Eye className="size-4" />
            검증 근거
          </Link>
        </div>
      </section>

      {rule.status === "approval_required" && (
        <section className="security-panel rounded-md border-l-2 border-l-[#f59e0b] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-[#fcd34d]" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-white">관리자 배포 심사</h2>
              <p className="mt-1 text-xs text-[#9ca3af]">
                검증 리포트와 Shadow 관찰 결과를 확인한 뒤 승인하거나 사유를 남겨 반려합니다.
              </p>
              <textarea
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                placeholder="반려 시 개선이 필요한 조건과 근거를 입력하세요."
                className="mt-4 min-h-24 w-full rounded border border-[#273244] bg-[#0b0f19] p-3 text-sm text-white placeholder:text-[#4b5563] focus:border-[#f59e0b]"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => reject.mutate()}
                  disabled={reject.isPending}
                  className="inline-flex min-h-10 items-center gap-2 rounded border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 text-sm font-semibold text-[#fca5a5] hover:bg-[#ef4444]/15"
                >
                  <X className="size-4" />
                  {reject.isPending ? "반려 중..." : "사유와 함께 반려"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="security-panel rounded-md p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-4 text-[#38bdf8]" />
            <h2 className="text-sm font-semibold text-white">Shadow 모니터링</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">MATCHES</p>
              <p className="mt-2 font-mono text-lg text-white">
                {shadowMetricsQuery.data?.matchedRequests.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">NORMAL HIT</p>
              <p className="mt-2 font-mono text-lg text-white">
                {shadowMetricsQuery.data?.normalHits.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">OBSERVED</p>
              <p className="mt-2 font-mono text-lg text-white">
                {shadowMetricsQuery.data?.observedRequests.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">ATTACK MATCH</p>
              <p className="mt-2 font-mono text-lg text-white">
                {shadowMetricsQuery.data?.attackMatches.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">FALSE POSITIVE</p>
              <p className="mt-2 font-mono text-lg text-white">
                {shadowMetricsQuery.data
                  ? `${(shadowMetricsQuery.data.estimatedFalsePositiveRate * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded border border-[#273244] bg-[#0b0f19] p-3">
              <p className="text-[10px] text-[#64748b]">ACTIVE 권고</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {shadowMetricsQuery.data
                  ? shadowMetricsQuery.data.activeRecommended
                    ? "권고"
                    : "추가 관찰"
                  : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#64748b]">
            최소 요청 수나 최소 관찰 시간을 임의로 적용하지 않습니다. 승인 가능 여부는 최신 리포트와
            Shadow ZAP 재검증 결과를 백엔드가 최종 판단합니다.
          </p>
          <div className="mt-4 flex items-center justify-between rounded border border-[#273244] bg-[#0b0f19] px-3 py-2 text-xs">
            <span className="text-[#64748b]">Shadow ZAP 재검증</span>
            {shadowScan ? (
              <div className="flex items-center gap-3">
                <Link to={`/scans/${shadowScan.id}`} className="font-semibold text-[#7dd3fc]">
                  {shadowScan.status === "completed"
                    ? "완료"
                    : shadowScan.status === "failed"
                      ? "실패"
                      : `${shadowScan.progress}% 진행 중`}
                </Link>
                {shadowScan.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => shadowRescan.mutate()}
                    className="font-semibold text-[#fcd34d]"
                  >
                    다시 확인
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => shadowRescan.mutate()}
                disabled={shadowRescan.isPending}
                className="font-semibold text-[#fcd34d]"
              >
                {shadowRescan.isPending ? "재검증 시작 중..." : "모의 공격으로 다시 확인"}
              </button>
            )}
          </div>
        </section>
        <section className="security-panel rounded-md p-5">
          <div className="flex items-center gap-3">
            <Code2 className="size-4 text-[#a5b4fc]" />
            <h2 className="text-sm font-semibold text-white">ModSecurity SecRule</h2>
            {artifactQuery.data && (
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([artifactQuery.data.modSecurityRule], {
                    type: "text/plain;charset=utf-8"
                  });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = `${rule.externalId}-v${artifactQuery.data.version}.conf`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
                className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-[#a5b4fc] hover:text-white"
              >
                <Download className="size-4" /> 룰 내보내기
              </button>
            )}
          </div>
          {rule.status === "rolled_back" && (
            <div className="mt-4 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-xs leading-5 text-[#fcd34d]">
              이 룰은 롤백되어 현재 WAF 적용 파일에서 제거되었습니다. 아래 SecRule은 배포 이력
              확인용 원문입니다.
            </div>
          )}
          <pre className="mt-5 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[#273244] bg-[#0b0f19] p-5 font-mono text-[11px] leading-5 text-[#9ca3af]">
            {artifactQuery.data?.modSecurityRule ??
              "백엔드가 생성한 ModSecurity 원문을 불러오는 중입니다."}
          </pre>
          <p className="mt-4 text-[11px] leading-5 text-[#64748b]">
            프론트에서 룰 문자열을 재생성하지 않고 백엔드가 검증·배포한 원문만 표시합니다.
          </p>
        </section>
      </div>

      {rule.status === "active" && (
        <section className="security-panel rounded-md p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#10b981]">
                Protection result
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">배포 전·후 보호 효과</h2>
              <p className="mt-1 text-xs text-[#9ca3af]">
                ZAP의 배포 전 기준 진단과 Active 적용 후 최종 진단을 비교합니다.
              </p>
            </div>
            {comparisonQuery.data?.after && (
              <Link to={`/scans/${comparisonQuery.data.after.id}`} className={buttonSecondary}>
                최종 진단 보기
              </Link>
            )}
          </div>
          {comparisonQuery.data ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-[#273244] bg-[#0b0f19] p-4">
                <p className="text-[10px] text-[#64748b]">배포 전 발견</p>
                <p className="mt-2 font-mono text-2xl text-rose-300">
                  {comparisonQuery.data.before.alertCount}
                </p>
              </div>
              <div className="rounded border border-[#273244] bg-[#0b0f19] p-4">
                <p className="text-[10px] text-[#64748b]">배포 후 발견</p>
                <p className="mt-2 font-mono text-2xl text-emerald-300">
                  {comparisonQuery.data.after.alertCount}
                </p>
              </div>
              <div className="rounded border border-[#273244] bg-[#0b0f19] p-4">
                <p className="text-[10px] text-[#64748b]">해결된 항목</p>
                <p className="mt-2 font-mono text-2xl text-white">
                  {comparisonQuery.data.summary.resolvedCount}
                </p>
              </div>
              <div className="rounded border border-[#273244] bg-[#0b0f19] p-4">
                <p className="text-[10px] text-[#64748b]">감소율</p>
                <p className="mt-2 font-mono text-2xl text-[#a5b4fc]">
                  {(comparisonQuery.data.summary.reductionRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded border border-dashed border-[#273244] p-5 text-sm text-[#9ca3af]">
              배포 후 자동 진단이 완료되면 전·후 비교가 표시됩니다.
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">배포 이력</h2>
          <p className="mt-1 text-xs text-[#949ba4]">실제 백엔드에 저장된 상태 전환 기록입니다.</p>
        </div>
        {histories.length === 0 ? (
          <EmptyState label="아직 배포 이력이 없습니다." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {histories.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_160px_160px] sm:items-center"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-white">
                    {item.ruleExternalId}
                  </p>
                  <p className="mt-1 text-xs text-[#949ba4]">{item.target}</p>
                </div>
                <StatusBadge status={item.status === "shadow" ? "ready" : item.status} />
                <span className="text-xs text-[#6d6f78]">
                  {item.deployedAt ? formatDate(item.deployedAt) : "-"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="security-panel overflow-hidden rounded-md">
        <div className="flex items-start justify-between gap-4 border-b border-[#273244] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">최근 관리자 작업</h2>
            <p className="mt-1 text-xs text-[#9ca3af]">
              선택한 서비스의 승인·배포·반려·롤백 감사 기록입니다.
            </p>
          </div>
          <UserCheck className="size-4 text-[#a5b4fc]" />
        </div>
        {auditLogsQuery.isLoading ? (
          <LoadingState label="관리자 작업 기록을 불러오는 중입니다." />
        ) : recentAdminActions.length === 0 ? (
          <EmptyState label="아직 기록된 관리자 배포 작업이 없습니다." />
        ) : (
          <ol>
            {recentAdminActions.map((item) => {
              const relatedRule = rules.find((candidate) => candidate.id === item.resourceId);
              return (
                <li
                  key={item.id}
                  className="grid gap-3 border-b border-[#273244] px-5 py-4 last:border-0 sm:grid-cols-[120px_minmax(0,1fr)_180px] sm:items-center"
                >
                  <span className="flex items-center gap-2 font-mono text-[10px] text-[#64748b]">
                    <Clock3 className="size-3.5" />
                    {formatDate(item.createdAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {relatedRule?.externalId ?? "보호 서비스"} ·{" "}
                      {auditActionLabels[item.action] ?? item.action}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[#64748b]">
                      {typeof item.metadata.targetType === "string"
                        ? item.metadata.targetType
                        : item.resourceType}
                    </p>
                  </div>
                  <span className="text-xs text-[#9ca3af]">
                    {item.user?.name ?? "시스템 관리자"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
