import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Radio, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, formatDate } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

export function LogsPage() {
  const attackSent = useDemoFlowStore((state) => state.attackSent);
  const advance = useDemoFlowStore((state) => state.advance);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["logs"],
    queryFn: platformApi.getLogs
  });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const featured = data.find((log) => log.id === "log-1048");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Step 2 · Observe"
        title="실시간 요청에서 공격을 확인"
        description="연결된 Demo Shop으로 테스트 공격을 보내고, Nginx와 ModSecurity가 기록한 요청을 확인합니다."
        actions={
          !attackSent ? (
            <button type="button" onClick={() => advance(2)} className={buttonPrimary}>
              공격 요청 보내기 <ArrowRight className="size-4" />
            </button>
          ) : featured ? (
            <Link to="/logs/log-1048" className={buttonPrimary}>
              요청 분석하기 <ArrowRight className="size-4" />
            </Link>
          ) : undefined
        }
      />

      {!attackSent ? (
        <section className="rounded-xl border border-[#5865f2]/40 bg-[#5865f2]/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#5865f2]">
              <Swords className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#949cf7]">
                현재 작업
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">SQL Injection 공격 재현</h2>
              <p className="mt-2 text-sm leading-6 text-[#b5bac1]">
                상품 검색 파라미터에 UNION SELECT 구문을 삽입합니다. 데모 데이터만 사용하며 실제
                외부 공격은 발생하지 않습니다.
              </p>
            </div>
          </div>
        </section>
      ) : featured ? (
        <section className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-rose-400/15 text-rose-300">
              <Radio className="size-5" />
              <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full border-2 border-[#1b171b] bg-rose-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="attack" />
                <StatusBadge status={featured.action} />
                <span className="text-xs text-[#949ba4]">방금 전</span>
              </div>
              <p className="mt-2 break-all font-mono text-sm font-semibold text-white">
                {featured.method} {featured.path}
              </p>
              <p className="mt-1 text-xs text-[#949ba4]">
                새 공격 요청을 포착했습니다. 상단의 요청 분석 버튼으로 탐지 근거를 확인하세요.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">요청 타임라인</h2>
            <p className="mt-1 text-xs text-[#949ba4]">최신 요청부터 표시합니다.</p>
          </div>
          <span className="flex items-center gap-2 text-xs text-emerald-300">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {data.map((log) => (
            <Link
              key={log.id}
              to={`/logs/${log.id}`}
              className={`grid gap-3 p-4 transition hover:bg-[#2b2d31] sm:grid-cols-[120px_90px_1fr_110px] sm:items-center ${attackSent && log.id === "log-1048" ? "bg-rose-400/[0.05]" : ""}`}
            >
              <span className="text-xs text-[#6d6f78]">{formatDate(log.occurredAt)}</span>
              <span className="font-mono text-xs font-semibold text-[#b5bac1]">{log.method}</span>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-white">{log.path}</p>
                <p className="mt-1 text-xs text-[#6d6f78]">{log.ip}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={log.classification} />
                <ArrowRight className="size-4 text-[#6d6f78]" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      {attackSent && (
        <p className="flex items-center gap-2 text-xs text-emerald-300">
          <Check className="size-4" />
          공격 요청 수집 완료 · 다음 단계는 시그니처 생성입니다.
        </p>
      )}
    </div>
  );
}
