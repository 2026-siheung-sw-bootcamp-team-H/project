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
import { AlertTriangle, ArrowRight, Check, RadioTower, RotateCcw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { demoSteps, useDemoFlowStore } from "@/stores/demoFlowStore";

const nextActions = [
  { title: "Demo Shop을 보호 서비스에 연결하세요", cta: "서비스 연결" },
  { title: "테스트 공격을 보내 실시간 요청을 확인하세요", cta: "공격 요청 보내기" },
  { title: "탐지된 공격에서 시그니처를 만드세요", cta: "요청 분석" },
  { title: "AI 우회 검증으로 룰을 보강하세요", cta: "AI 검증 시작" },
  { title: "AI 설명을 읽고 배포 근거를 확인하세요", cta: "AI 설명 확인" },
  { title: "검증된 룰을 Shadow 모드로 배포하세요", cta: "배포 화면 열기" }
] as const;

export function DashboardPage() {
  const step = useDemoFlowStore((state) => state.step);
  const reset = useDemoFlowStore((state) => state.reset);
  const completed = step >= demoSteps.length;
  const current = Math.min(step, demoSteps.length - 1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: platformApi.getDashboard
  });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const primaryAction = completed ? (
    <button type="button" onClick={reset} className={buttonSecondary}>
      <RotateCcw className="size-4" />
      데모 다시 시작
    </button>
  ) : (
    <Link to={demoSteps[current].path} className={buttonPrimary}>
      {nextActions[current].cta}
      <ArrowRight className="size-4" />
    </Link>
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Security overview"
        title="보안 운영 현황"
        description="Demo Shop으로 들어오는 요청, 차단 이벤트, 활성 룰과 AI 검증 상태를 한눈에 확인합니다."
        actions={primaryAction}
      />

      <section
        className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${completed ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-[#5865f2]/30 bg-[#5865f2]/10"}`}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${completed ? "bg-emerald-400 text-[#111214]" : "bg-[#5865f2] text-white"}`}
        >
          {completed ? (
            <Check className="size-5" />
          ) : (
            <span className="text-sm font-bold">{current + 1}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
            {completed ? "Demo complete" : `다음 작업 · ${current + 1}/${demoSteps.length}`}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {completed
              ? "서비스 연결부터 Shadow 배포까지 완료했습니다."
              : nextActions[current].title}
          </p>
        </div>
        <div className="flex gap-1.5">
          {demoSteps.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-7 rounded-full ${index < step ? "bg-emerald-400" : index === step ? "bg-[#5865f2]" : "bg-white/10"}`}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="최근 24시간 요청"
          value={data.requestCount.toLocaleString()}
          detail="정상·공격 요청 전체"
        />
        <MetricCard
          label="차단 이벤트"
          value={data.blockedCount.toLocaleString()}
          detail="전체 요청의 6.8%"
          tone="danger"
        />
        <MetricCard
          label="활성 방어 룰"
          value={data.activeRuleCount.toLocaleString()}
          detail="Nginx + ModSecurity 적용"
          tone="success"
        />
        <MetricCard
          label="평균 탐지 신뢰도"
          value={formatPercent(data.averageConfidence)}
          detail="AI 검증 완료 룰 기준"
          tone="success"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">시간대별 요청</h2>
              <p className="mt-1 text-xs text-[#949ba4]">정상 요청과 공격·차단 추이</p>
            </div>
            <span className="flex items-center gap-2 text-xs text-emerald-300">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourlyRequests}>
                <defs>
                  <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5865f2" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#5865f2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff0a" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#6d6f78"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#6d6f78" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#111214",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 8
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="normal"
                  name="정상"
                  stroke="#949cf7"
                  fill="url(#traffic)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="attack"
                  name="공격"
                  stroke="#fb7185"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="차단"
                  stroke="#34d399"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">현재 보호 상태</h2>
            <p className="mt-1 text-xs text-[#949ba4]">Demo Shop 연결 요약</p>
          </div>
          <div className="p-5">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <RadioTower className="size-5" />
            </span>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{data.service.name}</p>
                <p className="mt-1 text-xs text-[#6d6f78]">{data.service.connection}</p>
              </div>
              <StatusBadge status="connected" />
            </div>
            <div className="my-5 h-px bg-white/[0.06]" />
            <dl className="space-y-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#949ba4]">원본 서버</dt>
                <dd className="font-mono text-white">Backend :4000</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#949ba4]">보안 관문</dt>
                <dd className="text-white">Nginx + ModSecurity</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#949ba4]">최근 검증</dt>
                <dd className="text-emerald-300">통과</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">최근 보안 이벤트</h2>
            <p className="mt-1 text-xs text-[#949ba4]">관리자 확인이 필요한 요청</p>
          </div>
          <Link to="/logs" className="text-xs font-semibold text-[#949cf7]">
            전체 요청 보기
          </Link>
        </div>
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-3">
          {[
            {
              type: "SQL Injection",
              path: "/products?id=1 UNION SELECT",
              state: "차단",
              icon: AlertTriangle
            },
            { type: "XSS", path: "/reviews · onerror=alert(1)", state: "차단", icon: ShieldCheck },
            {
              type: "Path traversal",
              path: "/files?name=../../etc/passwd",
              state: "관찰",
              icon: AlertTriangle
            }
          ].map((event) => {
            const Icon = event.icon;
            return (
              <article key={event.type} className="bg-[#1e1f22] p-5">
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-rose-300" />
                  <span className="text-xs text-[#949ba4]">{event.state}</span>
                </div>
                <p className="mt-5 text-sm font-semibold text-white">{event.type}</p>
                <p className="mt-2 truncate font-mono text-xs text-[#6d6f78]">{event.path}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
