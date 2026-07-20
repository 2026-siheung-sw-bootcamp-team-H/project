import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";

export function RulesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rules"],
    queryFn: platformApi.getRules
  });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Signatures"
        title="방어 룰"
        description="공격 요청에서 만들어진 시그니처와 AI 검증 상태를 확인합니다. 데모 진행 중에는 현재 단계와 관련된 룰을 먼저 보여줍니다."
      />
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
        <div className="divide-y divide-white/[0.06]">
          {data.map((rule) => (
            <Link
              key={rule.id}
              to={`/rules/${rule.id}`}
              className="grid gap-4 p-5 hover:bg-[#2b2d31] sm:grid-cols-[1fr_150px_120px_24px] sm:items-center"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-[#5865f2]/15 text-[#949cf7]">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-sm font-bold text-white">{rule.id}</p>
                  <p className="mt-1 text-xs text-[#949ba4]">
                    {rule.category.replaceAll("_", " ")} · v{rule.version}
                  </p>
                </div>
              </div>
              <StatusBadge status={rule.status} />
              <span className="text-xs text-[#949ba4]">
                신뢰도 <b className="text-white">{formatPercent(rule.confidence)}</b>
              </span>
              <ArrowRight className="size-4 text-[#6d6f78]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
