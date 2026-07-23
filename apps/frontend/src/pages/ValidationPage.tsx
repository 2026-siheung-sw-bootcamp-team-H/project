import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge
} from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";

export function ValidationPage() {
  const { id = "" } = useParams();
  const {
    data: run,
    isLoading,
    isError
  } = useQuery({ queryKey: ["validation", id], queryFn: () => platformApi.getValidation(id) });
  const aiQuery = useQuery({ queryKey: ["ai-status"], queryFn: platformApi.getAiStatus });
  if (isLoading) return <LoadingState label="샌드박스와 holdout 검증 결과를 불러오는 중입니다." />;
  if (isError || !run) return <ErrorState message="검증 결과를 찾지 못했습니다." />;
  const aiConfigured = Boolean(aiQuery.data?.enabled && aiQuery.data.configured);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Validation · ${run.id}`}
        title="우회 및 Holdout 검증 결과"
        description={
          aiConfigured
            ? "AI와 결정론적 변형 공격, 정상 요청, 잠금된 Holdout 데이터셋으로 측정한 실제 검증 결과입니다."
            : "결정론적 변형 공격, 정상 요청, 잠금된 Holdout 데이터셋으로 측정한 실제 검증 결과입니다."
        }
        actions={
          <>
            <Link to={`/reports/${run.ruleId}`} className={buttonPrimary}>
              <FileText className="size-4" />
              검증 리포트
              <ArrowRight className="size-4" />
            </Link>
            <Link to={`/deployments?ruleId=${run.ruleId}`} className={buttonSecondary}>
              <ShieldCheck className="size-4" />
              배포 검토
            </Link>
            <StatusBadge status={run.status} />
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="공격 탐지율"
          value={formatPercent(run.attackDetectionRate)}
          detail="공격 샘플을 탐지한 비율"
          tone="success"
        />
        <MetricCard
          label="정상 요청 오탐률"
          value={formatPercent(run.falsePositiveRate)}
          detail="정상 요청을 잘못 탐지한 비율"
          tone={run.falsePositiveRate <= 0.1 ? "success" : "danger"}
        />
        <MetricCard
          label="우회 성공률"
          value={formatPercent(run.bypassSuccessRate)}
          detail="현재 룰을 통과한 변형 공격"
          tone={run.bypassSuccessRate <= 0.1 ? "success" : "warning"}
        />
        <MetricCard
          label="종합 신뢰도"
          value={formatPercent(run.confidence)}
          detail="탐지와 오탐을 함께 반영"
          tone="success"
        />
      </div>

      <section
        className={`security-panel grid gap-5 rounded-md border-l-2 p-5 md:grid-cols-[1fr_repeat(4,minmax(100px,160px))] md:items-center ${run.holdout?.passed ? "border-l-[#10b981]" : "border-l-[#f59e0b]"}`}
      >
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#38bdf8]">
            Locked holdout evaluation
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {run.holdout
              ? run.holdout.passed
                ? "최종 검증 통과"
                : "최종 검증 재검토"
              : "Holdout 결과 없음"}
          </h2>
          <p className="mt-1 text-xs text-[#9ca3af]">
            학습·보강에 사용하지 않은 잠금 데이터셋 결과입니다.
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b]">SAMPLES</p>
          <p className="mt-1 font-mono text-lg text-white">{run.holdout?.sampleCount ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b]">DETECTION</p>
          <p className="mt-1 font-mono text-lg text-[#6ee7b7]">
            {run.holdout ? formatPercent(run.holdout.attackDetectionRate) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b]">FALSE POSITIVE</p>
          <p className="mt-1 font-mono text-lg text-[#fcd34d]">
            {run.holdout ? formatPercent(run.holdout.falsePositiveRate) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#64748b]">CONFIDENCE</p>
          <p className="mt-1 font-mono text-lg text-[#a5b4fc]">
            {run.holdout ? formatPercent(run.holdout.confidence) : "—"}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">룰 보강 과정</h2>
          <p className="mt-1 text-xs text-[#949ba4]">
            각 라운드에서 변형 공격을 만들고 더 안전한 후보 룰을 비교했습니다.
          </p>
        </div>
        {run.rounds.length === 0 ? (
          <EmptyState label="저장된 검증 라운드가 없습니다." />
        ) : (
          <ol className="divide-y divide-white/[0.06]">
            {run.rounds.map((round) => (
              <li
                key={round.round}
                className="grid gap-4 p-5 md:grid-cols-[40px_1fr_220px] md:items-center"
              >
                <span className="grid size-9 place-items-center rounded-full bg-[#5865f2]/15 text-sm font-bold text-[#949cf7]">
                  {round.round}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{round.strategy}</p>
                  <p className="mt-1 text-xs leading-5 text-[#949ba4]">{round.ruleChange}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded bg-emerald-400/10 p-2 text-emerald-300">
                    탐지 {formatPercent(round.detectionRate)}
                  </span>
                  <span className="rounded bg-rose-400/10 p-2 text-rose-300">
                    우회 {formatPercent(round.bypassSuccessRate)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">검증 샘플</h2>
          <p className="mt-1 text-xs text-[#949ba4]">실제 판정과 기대값을 비교합니다.</p>
        </div>
        {run.samples.length === 0 ? (
          <EmptyState label="표시할 검증 샘플이 없습니다." />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {run.samples.slice(0, 12).map((sample) => (
              <article
                key={sample.id}
                className="grid gap-3 p-4 text-xs sm:grid-cols-[80px_1fr_100px] sm:items-center"
              >
                <span className="font-semibold uppercase text-[#949cf7]">{sample.kind}</span>
                <code className="truncate text-[#b5bac1]">{sample.input}</code>
                <span
                  className={
                    sample.detected === sample.expected ? "text-emerald-300" : "text-rose-300"
                  }
                >
                  {sample.detected === sample.expected ? "예상과 일치" : "판정 불일치"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
