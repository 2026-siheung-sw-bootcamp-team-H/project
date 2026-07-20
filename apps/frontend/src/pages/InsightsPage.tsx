import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, FileText, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";

export function InsightsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rules"],
    queryFn: platformApi.getRules
  });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  const rules = data.filter((rule) => rule.validationRunId || rule.reportId);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="AI validation"
        title="AI 검증과 설명"
        description="검증 결과는 수치와 테스트 샘플을, AI 설명은 공격 근거와 룰 변경 이유를 보여줍니다. 둘은 같은 화면이 아닙니다."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
          <FlaskConical className="size-5 text-[#949cf7]" />
          <h2 className="mt-4 font-semibold text-white">검증 결과</h2>
          <p className="mt-2 text-sm leading-6 text-[#949ba4]">
            탐지율, 오탐률, 우회 성공률과 실제 테스트 샘플을 확인합니다.
          </p>
        </section>
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
          <Bot className="size-5 text-[#949cf7]" />
          <h2 className="mt-4 font-semibold text-white">AI 설명 리포트</h2>
          <p className="mt-2 text-sm leading-6 text-[#949ba4]">
            왜 공격인지, 무엇을 보강했는지, 어떤 방식으로 배포할지 설명합니다.
          </p>
        </section>
      </div>
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        {rules.map((rule) => (
          <article
            key={rule.id}
            className="flex flex-col gap-4 border-b border-white/[0.06] p-5 last:border-0 lg:flex-row lg:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <p className="font-mono text-sm font-bold text-white">{rule.id}</p>
                <StatusBadge status={rule.status} />
              </div>
              <p className="mt-2 text-xs text-[#949ba4]">
                탐지 신뢰도 {formatPercent(rule.confidence)} · 정상 요청 오탐{" "}
                {formatPercent(rule.falsePositiveRate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rule.validationRunId && (
                <Link to={`/validation/${rule.validationRunId}`} className={buttonSecondary}>
                  <FlaskConical className="size-4" />
                  검증 결과
                </Link>
              )}
              {rule.reportId && (
                <Link to={`/reports/${rule.reportId}`} className={buttonPrimary}>
                  <FileText className="size-4" />
                  AI 설명 <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
