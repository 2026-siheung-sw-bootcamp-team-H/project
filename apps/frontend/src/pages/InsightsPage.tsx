import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";

export function InsightsPage() {
  const serviceId = useServiceStore((state) => state.selectedServiceId);
  const aiQuery = useQuery({ queryKey: ["ai-status"], queryFn: platformApi.getAiStatus });
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rules", serviceId],
    queryFn: () => platformApi.getRules(serviceId ?? undefined),
    enabled: Boolean(serviceId)
  });
  if (!serviceId || isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  const rules = data.filter((rule) => rule.validationRunId);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Validation evidence"
        title="검증 결과와 배포 근거"
        description={
          aiQuery.data?.enabled && aiQuery.data.configured
            ? `${aiQuery.data.provider} ${aiQuery.data.model ?? "기본 모델"}과 결정론적 검증 결과를 함께 사용한 관리자용 배포 근거입니다.`
            : "결정론적 우회·Holdout 검증 결과를 바탕으로 관리자용 배포 근거를 제공합니다."
        }
      />
      <section className="security-panel overflow-hidden rounded-md">
        {rules.length === 0 ? (
          <EmptyState label="아직 완료된 룰 검증이 없습니다." />
        ) : (
          rules.map((rule) => (
            <article
              key={rule.id}
              className="flex flex-col gap-4 border-b border-[#273244] p-5 last:border-0 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold text-white">{rule.externalId}</p>
                  <StatusBadge status={rule.status} />
                </div>
                <p className="mt-2 text-xs text-[#9ca3af]">
                  신뢰도 {formatPercent(rule.confidence)} · 오탐률{" "}
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
                <Link to={`/reports/${rule.id}`} className={buttonPrimary}>
                  <FileText className="size-4" />
                  검증 리포트
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
