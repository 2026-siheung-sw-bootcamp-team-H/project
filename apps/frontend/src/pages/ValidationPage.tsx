import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

const roundNames = ["기본 공격 재생", "주석·공백 우회", "인코딩·대소문자 우회"];
const roundChanges = [
  "UNION과 SELECT 키워드 순서 조건 추가",
  "SQL 주석 제거 정규화 추가",
  "URL 디코딩과 특수문자 비율 조건 추가"
];

export function ValidationPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const reportReviewed = useDemoFlowStore((state) => state.reportReviewed);
  const {
    data: run,
    isLoading,
    isError
  } = useQuery({ queryKey: ["validation", id], queryFn: () => platformApi.getValidation(id) });
  if (isLoading) return <LoadingState />;
  if (isError || !run) return <ErrorState message="검증 결과를 찾지 못했습니다." />;

  function openReport() {
    navigate("/reports/report-301");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Step 5 · Explain"
        title="AI 우회 검증 결과"
        description="점수가 높다는 사실보다, 어떤 우회가 실패했고 룰이 왜 바뀌었는지를 확인하는 화면입니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openReport} className={buttonPrimary}>
              {reportReviewed ? <Check className="size-4" /> : <ShieldCheck className="size-4" />}AI
              설명 확인 <ArrowRight className="size-4" />
            </button>
            <StatusBadge status={run.status} />
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="공격 탐지율"
          value={formatPercent(run.attackDetectionRate)}
          detail="공격 100건 중 탐지한 비율"
          tone="success"
        />
        <MetricCard
          label="정상 요청 오탐률"
          value={formatPercent(run.falsePositiveRate)}
          detail="정상을 잘못 막은 비율"
          tone="success"
        />
        <MetricCard
          label="AI 우회 성공률"
          value={formatPercent(run.bypassSuccessRate)}
          detail="현재 룰을 통과한 우회 공격"
          tone="warning"
        />
        <MetricCard
          label="종합 신뢰도"
          value={formatPercent(run.confidence)}
          detail="탐지율과 오탐률을 함께 반영"
          tone="success"
        />
      </div>

      <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">AI가 룰을 보강한 과정</h2>
          <p className="mt-1 text-xs text-[#949ba4]">
            우회가 성공할 때마다 조건을 보강하고 같은 공격을 다시 시험했습니다.
          </p>
        </div>
        <ol className="divide-y divide-white/[0.06]">
          {run.rounds.map((round, index) => (
            <li
              key={round.round}
              className="grid gap-4 p-5 md:grid-cols-[40px_1fr_200px] md:items-center"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#5865f2]/15 text-sm font-bold text-[#949cf7]">
                {round.round}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {roundNames[index] ?? `검증 ${round.round}차`}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#949ba4]">
                  변경: {roundChanges[index] ?? "탐지 조건 보강"}
                </p>
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
      </section>

      <section className="rounded-xl border border-[#5865f2]/30 bg-[#5865f2]/10 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#5865f2]">
            <FileText className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#949cf7]">
              다음 작업
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">AI 설명을 읽고 배포 여부 판단</h2>
            <p className="mt-2 text-sm leading-6 text-[#b5bac1]">
              검증 수치의 근거, 공격 정규화 전후, 운영자가 확인할 사항을 한 장의 리포트로
              설명합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
