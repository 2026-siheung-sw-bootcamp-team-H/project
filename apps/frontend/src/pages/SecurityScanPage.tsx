import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Radar, RotateCcw, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorState,
  FlowStepper,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge
} from "@/components/ui";
import { buttonPrimary, buttonSecondary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import type { SecurityScan } from "@/types/domain";

const steps = [
  { label: "연결 확인", description: "진단 대상과 보호 주소를 확인합니다." },
  { label: "페이지 탐색", description: "서비스의 접근 가능한 경로를 찾습니다." },
  { label: "모의 공격", description: "허용된 범위에서 보안 요청을 실행합니다." },
  { label: "결과 분석", description: "발견 항목과 위험도를 정리합니다." },
  { label: "진단 완료", description: "다음 보안 작업을 안내합니다." }
];

function activeStep(scan: SecurityScan) {
  if (scan.status === "completed" || scan.status === "failed") return 4;
  if (scan.status === "collecting_results") return 3;
  if (scan.status === "active_scanning") return 2;
  if (scan.status === "spidering") return 1;
  return 0;
}

const stageLabels: Record<SecurityScan["stage"], string> = {
  initial_scan: "초기 보안 진단",
  before_deployment: "배포 전 기준 진단",
  shadow_verification: "Shadow 자동 재검증",
  after_deployment: "배포 후 최종 진단",
  ad_hoc: "보안 재진단"
};

export function SecurityScanPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const scanQuery = useQuery({
    queryKey: ["security-scan", id],
    queryFn: () => platformApi.getSecurityScan(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1200;
    }
  });
  const retry = useMutation({
    mutationFn: async () => {
      const scan = scanQuery.data;
      if (!scan) throw new Error("재실행할 진단을 찾지 못했습니다.");
      if (scan.stage === "initial_scan")
        return platformApi.startInitialScan(scan.protectedServiceId);
      return platformApi.startSecurityScan({
        stage: scan.stage.toUpperCase() as
          | "BEFORE_DEPLOYMENT"
          | "SHADOW_VERIFICATION"
          | "AFTER_DEPLOYMENT"
          | "AD_HOC",
        protectedServiceId: scan.protectedServiceId,
        ...(scan.ruleId ? { ruleId: scan.ruleId } : {}),
        ...(scan.deploymentId ? { deploymentId: scan.deploymentId } : {})
      });
    },
    onSuccess: ({ scan }) => navigate(`/scans/${scan.id}`, { replace: true })
  });

  if (scanQuery.isLoading) return <LoadingState label="보안 진단 상태를 확인하는 중입니다." />;
  if (scanQuery.isError || !scanQuery.data)
    return <ErrorState message="보안 진단 정보를 불러오지 못했습니다." />;

  const scan = scanQuery.data;
  const running = !["completed", "failed"].includes(scan.status);
  const noThreats =
    scan.status === "completed" && scan.stage === "initial_scan" && scan.alertCount === 0;
  const completedClean = scan.status === "completed" && scan.alertCount === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Security scan · ${scan.stage.replaceAll("_", " ")}`}
        title={running ? `${stageLabels[scan.stage]} 진행 중` : stageLabels[scan.stage]}
        description="진단은 백그라운드에서 계속됩니다. 다른 화면으로 이동한 뒤에도 이 페이지에서 현재 진행 상태를 다시 확인할 수 있습니다."
        actions={
          <>
            {scan.status === "completed" && scan.ruleId && (
              <Link to={`/deployments?ruleId=${scan.ruleId}`} className={buttonPrimary}>
                배포 흐름 계속 <ArrowRight className="size-4" />
              </Link>
            )}
            {scan.status === "completed" && !scan.ruleId && scan.alertCount > 0 && (
              <Link to="/logs" className={buttonPrimary}>
                공격 로그 확인 <ArrowRight className="size-4" />
              </Link>
            )}
            {noThreats && (
              <Link to="/dashboard" className={buttonPrimary}>
                대시보드 확인 <ArrowRight className="size-4" />
              </Link>
            )}
            {scan.status === "failed" && (
              <button
                type="button"
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className={buttonPrimary}
              >
                <RotateCcw className="size-4" />{" "}
                {retry.isPending ? "다시 시작 중..." : "진단 다시 시작"}
              </button>
            )}
            <StatusBadge
              status={
                scan.status === "completed"
                  ? "passed"
                  : scan.status === "failed"
                    ? "failed"
                    : "running"
              }
            />
          </>
        }
      />

      {retry.isError && <ErrorState message={retry.error.message} />}

      <section className="security-panel rounded-md p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded bg-[#6366f1]/15 text-[#a5b4fc]">
              <Radar className={`size-5 ${running ? "animate-pulse" : ""}`} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                {running ? "안전한 모의 공격을 실행하고 있습니다." : "진단 작업이 종료되었습니다."}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase text-[#64748b]">
                {scan.status.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <strong className="font-mono text-2xl text-white">{scan.progress}%</strong>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#111827]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#38bdf8] transition-[width] duration-500"
            style={{ width: `${scan.progress}%` }}
          />
        </div>
      </section>

      <FlowStepper steps={steps} active={activeStep(scan)} />

      {scan.status === "failed" && (
        <section className="rounded-md border border-rose-400/25 bg-rose-400/[0.07] p-5 text-sm text-rose-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">진단을 완료하지 못했습니다.</p>
              <p className="mt-1 text-xs leading-5 text-[#d1d5db]">
                {scan.errorMessage ?? "ZAP 상태와 서비스 연결을 확인한 뒤 다시 실행해 주세요."}
              </p>
            </div>
          </div>
        </section>
      )}

      {scan.status === "completed" && (
        <>
          <section
            className={`rounded-md border-l-2 p-5 ${completedClean ? "border border-emerald-400/20 border-l-emerald-400 bg-emerald-400/[0.06]" : "security-panel border-l-rose-400"}`}
          >
            <div className="flex items-start gap-3">
              {completedClean ? (
                <Check className="mt-0.5 size-5 text-emerald-300" />
              ) : (
                <ShieldCheck className="mt-0.5 size-5 text-rose-300" />
              )}
              <div>
                <h2 className="font-semibold text-white">
                  {completedClean
                    ? scan.stage === "initial_scan"
                      ? "현재 확인된 공격 패턴이 없습니다."
                      : "보안 재검증이 완료되었습니다."
                    : `${scan.alertCount}개의 보안 항목을 발견했습니다.`}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#9ca3af]">
                  {completedClean
                    ? scan.stage === "initial_scan"
                      ? "서비스는 계속 수집됩니다. 필요할 때 새 진단을 실행할 수 있습니다."
                      : "배포 관리 화면으로 돌아가 다음 상태를 확인하세요."
                    : "발견된 공격 요청을 확인하고 필요한 항목으로 방어 룰을 생성하세요."}
                </p>
              </div>
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="전체 발견" value={scan.alertCount.toLocaleString()} />
            <MetricCard
              label="높음"
              value={scan.highCount.toLocaleString()}
              tone={scan.highCount ? "danger" : "success"}
            />
            <MetricCard
              label="중간"
              value={scan.mediumCount.toLocaleString()}
              tone={scan.mediumCount ? "warning" : "success"}
            />
            <MetricCard label="낮음" value={scan.lowCount.toLocaleString()} />
            <MetricCard label="정보" value={scan.informationalCount.toLocaleString()} />
          </div>
        </>
      )}

      {running && (
        <div className="flex justify-end">
          <Link to="/dashboard" className={buttonSecondary}>
            백그라운드에서 계속
          </Link>
        </div>
      )}
    </div>
  );
}
