import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleAlert,
  FileCheck2,
  GitCompareArrows,
  Rocket,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { buttonPrimary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";

function extractAiRecommendation(value: string) {
  const marker = "AI 설명:";
  const recommendation = value.includes(marker)
    ? value.split(marker).slice(1).join(marker).trim()
    : value;
  return recommendation
    .replace(/shadow mode\s*\(섀도우 모드\)/gi, "Shadow 모드")
    .replace(/shadow mode/gi, "Shadow 모드");
}

export function ReportPage() {
  const { id: ruleId = "" } = useParams();
  const reportQuery = useQuery({
    queryKey: ["report", ruleId],
    queryFn: () => platformApi.getReport(ruleId)
  });
  const ruleQuery = useQuery({
    queryKey: ["rule", ruleId],
    queryFn: () => platformApi.getRule(ruleId),
    enabled: Boolean(ruleId)
  });
  const validationQuery = useQuery({
    queryKey: ["validation", ruleQuery.data?.validationRunId],
    queryFn: () => platformApi.getValidation(ruleQuery.data?.validationRunId ?? ""),
    enabled: Boolean(ruleQuery.data?.validationRunId)
  });
  const sourceLogQuery = useQuery({
    queryKey: ["log", ruleQuery.data?.sourceLogId],
    queryFn: () => platformApi.getLog(ruleQuery.data?.sourceLogId ?? ""),
    enabled: Boolean(ruleQuery.data?.sourceLogId)
  });

  if (reportQuery.isLoading || ruleQuery.isLoading)
    return <LoadingState label="검증 근거를 정리하는 중입니다." />;
  if (reportQuery.isError || !reportQuery.data)
    return <ErrorState message="검증 리포트를 불러오지 못했습니다." />;

  const report = reportQuery.data;
  const validation = validationQuery.data;
  const usedAi = report.provider !== "deterministic-fallback";
  const providerLabel =
    report.provider === "openai"
      ? "OpenAI API"
      : report.provider === "gemini"
        ? "Gemini API"
        : "기본 검증 엔진";
  const deploymentBlocked = report.deploymentRecommendation.includes("권장하지 않습니다");
  const recommendation = extractAiRecommendation(report.deploymentRecommendation);
  const decisionTitle = deploymentBlocked
    ? "룰을 보강한 뒤 다시 검증하세요"
    : "Shadow 적용을 검토할 수 있습니다";

  return (
    <div className="space-y-7">
      <Link
        to="/insights"
        className="inline-flex items-center gap-2 text-sm text-[#949ba4] transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        검증 결과 목록
      </Link>

      <PageHeader
        eyebrow="Validation intelligence"
        title="AI 검증 리포트"
        description="공격 요청에서 시작해 룰 검증과 Holdout 평가까지 이어진 결과를 배포 판단에 필요한 순서로 정리했습니다."
        actions={
          <Link to={`/deployments?ruleId=${report.ruleId}`} className={buttonPrimary}>
            <Rocket className="size-4" />
            배포 검토
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <section className="security-panel overflow-hidden rounded-xl">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#38bdf8]/20 bg-[#38bdf8]/[0.07] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7dd3fc]">
                {usedAi ? <Sparkles className="size-3" /> : <FileCheck2 className="size-3" />}
                {usedAi ? `${providerLabel} 생성` : "Fallback 생성"}
              </span>
              <span className="rounded-full border border-[#273244] px-3 py-1.5 font-mono text-[9px] text-[#64748b]">
                REPORT {report.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
              배포 판단
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
              {decisionTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ca3af]">{recommendation}</p>
          </div>

          <div
            className={`border-t p-6 lg:border-l lg:border-t-0 ${
              deploymentBlocked
                ? "border-[#f59e0b]/20 bg-[#f59e0b]/[0.045]"
                : "border-[#10b981]/20 bg-[#10b981]/[0.045]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-10 place-items-center rounded-full ${
                  deploymentBlocked
                    ? "bg-[#f59e0b]/10 text-[#fcd34d]"
                    : "bg-[#10b981]/10 text-[#6ee7b7]"
                }`}
              >
                {deploymentBlocked ? (
                  <CircleAlert className="size-5" />
                ) : (
                  <ShieldCheck className="size-5" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {deploymentBlocked ? "배포 보류" : "검증 기준 통과"}
                </p>
                <p className="mt-1 text-xs text-[#64748b]">
                  최종 적용은 관리자 승인 후 진행됩니다.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["공격 탐지율", validation ? formatPercent(validation.attackDetectionRate) : "—"],
                [
                  "정상 요청 오탐률",
                  validation ? formatPercent(validation.falsePositiveRate) : "—"
                ],
                ["우회 성공률", validation ? formatPercent(validation.bypassSuccessRate) : "—"],
                ["종합 신뢰도", validation ? formatPercent(validation.confidence) : "—"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/[0.06] bg-black/15 p-3">
                  <dt className="text-[10px] text-[#64748b]">{label}</dt>
                  <dd className="mt-2 font-mono text-lg font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-[#273244] bg-[#0b0f19]/55 px-4 py-3 text-xs leading-5 text-[#9ca3af]">
        {usedAi
          ? `${providerLabel}가 검증 지표와 룰 조건을 설명했습니다. 수치와 통과 여부는 백엔드 검증 결과를 그대로 사용합니다.`
          : "AI 호출을 사용하지 못해 백엔드 검증 결과만으로 리포트를 구성했습니다."}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.72fr)]">
        <div className="space-y-5">
          <section className="security-panel rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <BrainCircuit className="size-4 text-[#7dd3fc]" />
              <h2 className="text-sm font-semibold text-white">공격 분석 요약</h2>
            </div>
            <p className="mt-5 text-[15px] leading-8 text-[#cbd5e1]">{report.attackSummary}</p>
          </section>

          <section className="security-panel overflow-hidden rounded-lg">
            <div className="flex items-center gap-3 border-b border-[#273244] px-5 py-4 sm:px-6">
              <GitCompareArrows className="size-4 text-[#a5b4fc]" />
              <h2 className="text-sm font-semibold text-white">요청과 검증된 룰 조건</h2>
            </div>
            <div className="grid gap-px bg-[#273244] md:grid-cols-2">
              <div className="bg-[#111827] p-5 sm:p-6">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#fda4af]">
                  Source request
                </p>
                <code className="mt-4 block max-h-44 overflow-auto break-all rounded-md bg-[#0b0f19] p-4 text-xs leading-6 text-[#94a3b8]">
                  {sourceLogQuery.data?.rawRequest ||
                    report.normalizationComparison.before ||
                    "요청 본문 없음"}
                </code>
              </div>
              <div className="bg-[#111827] p-5 sm:p-6">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#6ee7b7]">
                  Validated condition
                </p>
                <code className="mt-4 block max-h-44 overflow-auto break-all rounded-md bg-[#0b0f19] p-4 text-xs leading-6 text-[#e2e8f0]">
                  {report.normalizationComparison.after || "정규화된 요청 없음"}
                </code>
              </div>
            </div>
          </section>

          <section className="security-panel rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <FileCheck2 className="size-4 text-[#a5b4fc]" />
              <h2 className="text-sm font-semibold text-white">검증 근거</h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {report.detectionEvidence.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-lg border border-[#273244] bg-[#0b0f19]/60 p-4 text-sm leading-6 text-[#cbd5e1]"
                >
                  <Check className="mt-1 size-4 shrink-0 text-[#6ee7b7]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="security-panel rounded-lg p-5 sm:p-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              우회 검증 결과
            </p>
            <p className="mt-4 text-sm leading-7 text-[#cbd5e1]">{report.bypassResult}</p>
            <div className="my-5 h-px bg-[#273244]" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              판단 근거
            </p>
            <p className="mt-4 text-sm leading-7 text-[#cbd5e1]">{report.confidenceReason}</p>
          </section>

          <section className="security-panel rounded-lg p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
                  Before deployment
                </p>
                <h2 className="mt-2 text-sm font-semibold text-white">배포 전 확인</h2>
              </div>
              <ShieldCheck className="size-4 text-[#a5b4fc]" />
            </div>
            <ol className="mt-5 space-y-3">
              {report.operatorGuide.map((item, index) => (
                <li
                  key={item}
                  className="grid grid-cols-[28px_1fr] gap-3 rounded-lg border border-[#273244] bg-[#0b0f19]/55 p-3 text-xs leading-5 text-[#cbd5e1]"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-[#6366f1]/10 font-mono text-[10px] text-[#a5b4fc]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1">{item}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
