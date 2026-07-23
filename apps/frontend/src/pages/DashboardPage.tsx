import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, RadioTower, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge
} from "@/components/ui";
import { buttonPrimary, formatDate, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";
import type { DashboardNextAction } from "@/types/domain";

const pipeline = ["수집", "정규화", "탐지", "시그니처", "검증", "Shadow", "승인", "Active"];

const actionCopy: Record<DashboardNextAction, { label: string; title: string }> = {
  REGISTER_SERVICE: { label: "보호 서비스 등록", title: "보호할 서비스를 먼저 등록하세요." },
  TEST_CONNECTION: { label: "서비스 연결 확인", title: "진단 전에 서비스 연결 확인이 필요합니다." },
  RUN_INITIAL_SCAN: {
    label: "초기 보안 진단 시작",
    title: "연결 완료 · 첫 보안 진단을 실행하세요."
  },
  REVIEW_ATTACK_EVENTS: {
    label: "공격 분석 결과 보기",
    title: "진단에서 발견된 공격 요청을 확인하세요."
  },
  VALIDATE_RULE: { label: "우회 검증 시작", title: "생성된 방어 룰의 우회 가능성을 검증하세요." },
  REVIEW_AI_REPORT: { label: "분석 리포트 확인", title: "검증 근거와 배포 권고를 확인하세요." },
  REVIEW_SHADOW: { label: "모니터링 결과 확인", title: "Shadow 재검증과 관찰 결과를 확인하세요." },
  APPROVE_RULE: {
    label: "실제 차단 승인",
    title: "모니터링을 통과한 룰의 실제 차단을 승인하세요."
  },
  DEPLOY_ACTIVE: { label: "Active 차단 전환", title: "승인된 룰을 실제 차단 모드로 전환하세요." },
  VIEW_PROTECTION_RESULT: { label: "보호 효과 확인", title: "배포 전·후 보안 결과를 비교하세요." },
  REVIEW_RULE: { label: "방어 룰 확인", title: "현재 방어 룰 상태를 확인하세요." }
};

export function DashboardPage() {
  const serviceId = useServiceStore((state) => state.selectedServiceId);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", serviceId],
    queryFn: () => platformApi.getDashboard(serviceId ?? undefined),
    refetchInterval: 10000
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "대시보드 데이터를 불러오지 못했습니다."}
      />
    );

  const hasTraffic = data.requestCount > 0;
  const scanRunning = data.latestScan && !["completed", "failed"].includes(data.latestScan.status);
  const noThreats =
    data.initialScan?.status === "completed" &&
    data.initialScan.stage === "initial_scan" &&
    data.initialScan.alertCount === 0;
  const backendAction = actionCopy[data.nextAction];
  const actionTarget: Record<DashboardNextAction, string> = {
    REGISTER_SERVICE: "/services",
    TEST_CONNECTION: "/services",
    RUN_INITIAL_SCAN: "/services",
    REVIEW_ATTACK_EVENTS: "/logs",
    VALIDATE_RULE: data.latestRule ? `/rules/${data.latestRule.id}` : "/rules",
    REVIEW_AI_REPORT: data.latestRule ? `/reports/${data.latestRule.id}` : "/insights",
    REVIEW_SHADOW: data.latestRule ? `/deployments?ruleId=${data.latestRule.id}` : "/deployments",
    APPROVE_RULE: data.latestRule ? `/deployments?ruleId=${data.latestRule.id}` : "/deployments",
    DEPLOY_ACTIVE: data.latestRule ? `/deployments?ruleId=${data.latestRule.id}` : "/deployments",
    VIEW_PROTECTION_RESULT: data.latestRule
      ? `/deployments?ruleId=${data.latestRule.id}`
      : "/deployments",
    REVIEW_RULE: data.latestRule ? `/rules/${data.latestRule.id}` : "/rules"
  };
  const nextAction = scanRunning
    ? {
        to: `/scans/${data.latestScan!.id}`,
        label: "진단 진행 상황 보기",
        title: `보안 진단이 ${data.latestScan!.progress}% 진행되었습니다.`
      }
    : noThreats && data.nextAction === "REVIEW_ATTACK_EVENTS"
      ? {
          to: `/scans/${data.initialScan!.id}`,
          label: "진단 결과 확인",
          title: "초기 진단이 완료됐으며 현재 발견된 공격 패턴이 없습니다."
        }
      : { ...backendAction, to: actionTarget[data.nextAction] };
  const pipelineIndex = {
    REGISTER_SERVICE: 0,
    TEST_CONNECTION: 0,
    RUN_INITIAL_SCAN: 1,
    REVIEW_ATTACK_EVENTS: 3,
    VALIDATE_RULE: 4,
    REVIEW_AI_REPORT: 5,
    REVIEW_SHADOW: 6,
    APPROVE_RULE: 7,
    DEPLOY_ACTIVE: 7,
    VIEW_PROTECTION_RESULT: 8,
    REVIEW_RULE: 4
  }[data.nextAction];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security command center"
        title="보안 운영 대시보드"
        description="요청 수집부터 시그니처 검증, WAF 배포까지 현재 방어 상태를 한 화면에서 추적합니다."
        actions={
          <Link to={nextAction.to} className={buttonPrimary}>
            {nextAction.label}
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard
          label="누적 수집 이벤트"
          value={data.requestCount.toLocaleString()}
          detail="누적 ingress"
        />
        <MetricCard
          label="공격 의심"
          value={data.suspiciousCount.toLocaleString()}
          detail="최근 100건 중 분석 필요"
          tone={data.suspiciousCount ? "danger" : "success"}
        />
        <MetricCard
          label="차단 요청"
          value={data.blockedCount.toLocaleString()}
          detail="WAF enforcement"
          tone="danger"
        />
        <MetricCard
          label="활성 룰"
          value={data.activeRuleCount.toLocaleString()}
          detail="Active signatures"
          tone="success"
        />
        <MetricCard
          label="평균 탐지율"
          value={formatPercent(data.averageDetectionRate)}
          detail="검증 완료 룰"
          tone="success"
        />
        <MetricCard
          label="오탐률"
          value={formatPercent(data.averageFalsePositiveRate)}
          detail="False positive"
          tone={data.averageFalsePositiveRate > 0.1 ? "warning" : "success"}
        />
        <MetricCard
          label="Shadow 룰"
          value={data.shadowRuleCount.toLocaleString()}
          detail="관찰 모드"
          tone="warning"
        />
        <MetricCard
          label="배포 기록"
          value={data.deploymentCount.toLocaleString()}
          detail="DB에 저장된 WAF 이력"
        />
      </section>

      <section className="security-panel flex flex-col gap-4 rounded-md border-l-2 border-l-[#6366f1] p-4 md:flex-row md:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded bg-[#6366f1]/15 text-[#a5b4fc]">
          <RadioTower className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#818cf8]">
            Operator queue
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{nextAction.title}</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] text-[#6ee7b7]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#10b981]" />
          LIVE · 10S REFRESH
        </span>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <Panel
          title="트래픽 분석"
          description="최근 5시간 정상·공격·차단 요청 추이"
          action={<span className="font-mono text-[10px] text-[#64748b]">REQUESTS / HOUR</span>}
        >
          {hasTraffic ? (
            <div className="h-80 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.hourlyRequests}>
                  <defs>
                    <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#273244" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #273244",
                      borderRadius: 4,
                      fontSize: 12
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="normal"
                    name="정상"
                    stroke="#38bdf8"
                    fill="url(#traffic)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="attack"
                    name="공격"
                    stroke="#ef4444"
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    name="차단"
                    stroke="#10b981"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="트래픽이 수집되면 시간대별 추이가 표시됩니다." />
          )}
        </Panel>

        <Panel title="방어 파이프라인" description="현재 운영 단계와 다음 작업">
          <ol className="p-5">
            {pipeline.map((step, index) => {
              const completed = index < pipelineIndex;
              return (
                <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                  <span
                    className={`relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${completed ? "border-[#10b981]/40 bg-[#10b981]/15 text-[#6ee7b7]" : "border-[#273244] bg-[#0b0f19] text-[#64748b]"}`}
                  >
                    {completed ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <span className="font-mono text-[9px]">{index + 1}</span>
                    )}
                  </span>
                  {index < pipeline.length - 1 && (
                    <span className="absolute left-[9px] top-5 h-full w-px bg-[#273244]" />
                  )}
                  <div>
                    <p
                      className={`text-xs font-semibold ${completed ? "text-[#d1fae5]" : "text-[#9ca3af]"}`}
                    >
                      {step}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase text-[#4b5563]">
                      {completed ? "complete" : index === pipelineIndex ? "current" : "pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <Panel
          title="최근 위험 이벤트"
          description="공격 및 의심 요청을 우선 표시"
          action={
            <Link
              to="/logs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7dd3fc]"
            >
              전체 로그 보기
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {data.recentLogs.length === 0 ? (
            <EmptyState label="표시할 이벤트가 없습니다." />
          ) : (
            <div>
              {data.recentLogs.map((log) => (
                <Link
                  key={log.id}
                  to={`/logs/${log.id}`}
                  className="security-table-row grid gap-3 px-5 py-3.5 first:border-t-0 sm:grid-cols-[110px_86px_minmax(0,1fr)_110px_90px] sm:items-center"
                >
                  <span className="font-mono text-[10px] text-[#64748b]">
                    {formatDate(log.occurredAt)}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#9ca3af]">{log.method}</span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-[#e5e7eb]">{log.path}</p>
                    <p className="mt-1 text-[10px] text-[#64748b]">
                      {log.attackCategory ?? log.ip}
                    </p>
                  </div>
                  <StatusBadge status={log.classification} />
                  <StatusBadge status={log.action} />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="보호 서비스" description="외부 요청 경로 상태">
          <div className="p-5">
            {data.service ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded bg-[#38bdf8]/10 text-[#7dd3fc]">
                      <ShieldCheck className="size-4" />
                    </span>
                    <span className="text-sm font-semibold text-white">{data.service.name}</span>
                  </div>
                  <StatusBadge status={data.service.status} />
                </div>
                <dl className="grid gap-4 border-t border-[#273244] pt-4 text-xs">
                  <div>
                    <dt className="text-[#64748b]">보안 경로</dt>
                    <dd className="mt-1 font-mono text-[#d1d5db]">{data.service.connection}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748b]">마지막 요청</dt>
                    <dd className="mt-1 text-[#d1d5db]">
                      {data.service.lastRequestAt
                        ? formatDate(data.service.lastRequestAt)
                        : "아직 없음"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="text-center">
                <AlertTriangle className="mx-auto size-6 text-[#f59e0b]" />
                <p className="mt-3 text-sm text-[#9ca3af]">등록된 서비스가 없습니다.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
