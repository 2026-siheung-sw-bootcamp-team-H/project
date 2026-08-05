import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Layers3,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge
} from "@/components/ui";
import { buttonPrimary, formatDate, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";
import type { DashboardNextAction } from "@/types/domain";

const metricTones = {
  neutral: {
    icon: "border-slate-400/15 bg-slate-400/[0.07] text-slate-300",
    value: "text-slate-100",
    line: "from-slate-300/70"
  },
  danger: {
    icon: "border-rose-400/20 bg-rose-400/[0.08] text-rose-300",
    value: "text-rose-200",
    line: "from-rose-400/80"
  },
  success: {
    icon: "border-teal-400/20 bg-teal-400/[0.08] text-teal-300",
    value: "text-teal-200",
    line: "from-teal-400/80"
  },
  accent: {
    icon: "border-violet-400/20 bg-violet-400/[0.08] text-violet-300",
    value: "text-violet-200",
    line: "from-violet-400/80"
  }
} as const;

function DashboardMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: keyof typeof metricTones;
}) {
  const style = metricTones[tone];
  return (
    <article className="group relative min-h-36 px-5 py-5 transition-colors hover:bg-white/[0.015]">
      <div
        className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r ${style.line} via-transparent to-transparent opacity-60`}
      />
      <div className="flex items-center gap-3">
        <span className={`grid size-8 place-items-center rounded-md border ${style.icon}`}>
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
        <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b96a8]">{label}</p>
      </div>
      <p
        className={`mt-5 font-mono text-[2rem] font-semibold leading-none tracking-[-0.06em] ${style.value}`}
      >
        {value}
      </p>
      <p className="mt-3 text-[11px] text-[#5f6b7d]">{detail}</p>
    </article>
  );
}

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
  const latestValidation = data.latestValidation;
  const showHardeningImpact =
    latestValidation &&
    ["passed", "failed"].includes(latestValidation.status) &&
    latestValidation.rounds.length > 0;
  const enhancedDefenseLayer =
    data.activeRuleCount > 0
      ? "OWASP CRS + ANVIL"
      : data.shadowRuleCount > 0
        ? "OWASP CRS + ANVIL · Shadow"
        : "ANVIL 배포 대기";
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

      <section className="security-panel overflow-hidden rounded-lg">
        <div className="grid divide-y divide-[#202b3b] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <DashboardMetric
            icon={Activity}
            label="누적 수집 이벤트"
            value={data.requestCount.toLocaleString()}
            detail="누적 ingress"
            tone="neutral"
          />
          <DashboardMetric
            icon={ShieldAlert}
            label="최근 100건 공격 탐지"
            value={data.suspiciousCount.toLocaleString()}
            detail="분석이 필요한 공격 요청"
            tone="danger"
          />
          <DashboardMetric
            icon={ShieldCheck}
            label="누적 WAF 차단"
            value={data.blockedCount.toLocaleString()}
            detail="기본 CRS 및 배포 룰"
            tone="success"
          />
          <DashboardMetric
            icon={Layers3}
            label="활성 방어 룰"
            value={data.activeRuleCount.toLocaleString()}
            detail={`Shadow 관찰 ${data.shadowRuleCount.toLocaleString()}개`}
            tone="accent"
          />
        </div>
      </section>

      {showHardeningImpact && (
        <section className="security-panel overflow-hidden rounded-lg border-l-2 border-l-[#6366f1]">
          <div className="flex flex-col gap-3 border-b border-[#202b3b] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#818cf8]">
                Latest rule hardening
              </p>
              <h2 className="mt-1 text-sm font-semibold text-white">최근 룰 보강 전·후 비교</h2>
            </div>
            <Link
              to={`/validation/${latestValidation.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7dd3fc]"
            >
              검증 결과 자세히 보기
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid divide-y divide-[#202b3b] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-[#64748b]">공격 탐지율</p>
              <div className="mt-3 flex items-center gap-3 font-mono">
                <span className="text-lg text-[#94a3b8]">
                  {formatPercent(latestValidation.initialAttackDetectionRate)}
                </span>
                <ArrowRight className="size-4 text-[#6366f1]" />
                <strong className="text-xl text-emerald-200">
                  {formatPercent(latestValidation.attackDetectionRate)}
                </strong>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-[#64748b]">우회 성공률</p>
              <div className="mt-3 flex items-center gap-3 font-mono">
                <span className="text-lg text-[#94a3b8]">
                  {formatPercent(latestValidation.initialBypassSuccessRate)}
                </span>
                <ArrowRight className="size-4 text-[#6366f1]" />
                <strong className="text-xl text-emerald-200">
                  {formatPercent(latestValidation.bypassSuccessRate)}
                </strong>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-[#64748b]">방어 계층</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-semibold text-[#94a3b8]">OWASP CRS</span>
                <ArrowRight className="size-4 shrink-0 text-[#6366f1]" />
                <strong className="text-xs font-semibold text-violet-200">
                  {enhancedDefenseLayer}
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

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

      <Panel
        title="트래픽 흐름"
        description="최근 5시간 요청과 보안 처리 추이"
        action={
          <div className="hidden items-center gap-4 text-[10px] text-[#7b8798] sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#94a3b8]" />
              정상 요청
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#fb7185]" />
              공격 탐지
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#2dd4bf]" />
              WAF 차단
            </span>
          </div>
        }
        className="bg-[radial-gradient(circle_at_70%_25%,rgba(59,130,246,0.035),transparent_38%)]"
      >
        {hasTraffic ? (
          <div className="h-[340px] px-5 pb-5 pt-7">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.hourlyRequests}
                margin={{ top: 4, right: 10, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.16} />
                    <stop offset="78%" stopColor="#94a3b8" stopOpacity={0.015} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#202b3b" strokeDasharray="3 7" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#536074"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  stroke="#536074"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tickMargin={8}
                />
                <Tooltip
                  cursor={{ stroke: "#475569", strokeDasharray: "3 4", strokeWidth: 1 }}
                  contentStyle={{
                    background: "rgba(8, 13, 23, 0.96)",
                    border: "1px solid #2a3547",
                    borderRadius: 8,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
                    fontSize: 11
                  }}
                  labelStyle={{ color: "#cbd5e1", marginBottom: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="normal"
                  name="정상"
                  stroke="#94a3b8"
                  fill="url(#traffic)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#cbd5e1", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="attack"
                  name="공격"
                  stroke="#fb7185"
                  fill="transparent"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#fb7185", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="차단"
                  stroke="#2dd4bf"
                  fill="transparent"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#2dd4bf", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState label="트래픽이 수집되면 시간대별 추이가 표시됩니다." />
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="보안 판정 구성"
          description="최근 100건 요청의 정상·의심·공격 비율"
          action={
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Latest sample
            </span>
          }
        >
          {data.securityDecisionDistribution.length > 0 ? (
            <div className="grid min-h-[260px] items-center gap-2 px-5 py-4 sm:grid-cols-[minmax(220px,0.9fr)_1fr]">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.securityDecisionDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={86}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {data.securityDecisionDistribution.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(8, 13, 23, 0.96)",
                        border: "1px solid #2a3547",
                        borderRadius: 8,
                        fontSize: 11
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <strong className="font-mono text-2xl text-white">
                    {data.securityDecisionDistribution
                      .reduce((sum, item) => sum + item.value, 0)
                      .toLocaleString()}
                  </strong>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                    Requests
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {data.securityDecisionDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between border-b border-[#202b3b] pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="flex items-center gap-2.5 text-xs text-[#aab4c3]">
                      <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#e5e7eb]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="집계할 요청이 없습니다." />
          )}
        </Panel>

        <Panel
          title="WAF 처리 결과"
          description="최근 100건 요청의 허용·관찰·차단 현황"
          action={
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              WAF decisions
            </span>
          }
        >
          {data.enforcementActionDistribution.length > 0 ? (
            <div className="h-[260px] px-5 py-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.enforcementActionDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid stroke="#202b3b" strokeDasharray="3 7" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#536074"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={84}
                    stroke="#8b96a8"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.04)" }}
                    contentStyle={{
                      background: "rgba(8, 13, 23, 0.96)",
                      border: "1px solid #2a3547",
                      borderRadius: 8,
                      fontSize: 11
                    }}
                  />
                  <Bar dataKey="value" name="요청 수" barSize={18} radius={[0, 4, 4, 0]}>
                    {data.enforcementActionDistribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="집계할 처리 결과가 없습니다." />
          )}
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
