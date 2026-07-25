import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FlaskConical,
  Rocket,
  ShieldCheck
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import type { MatchCondition, MatchLeaf } from "@/types/domain";

const conditionLabels: Record<string, string> = {
  keyword_sequence: "키워드 순서",
  special_character_density: "특수문자 비율",
  html_tag_with_event_handler: "이벤트 핸들러 포함 태그",
  javascript_scheme: "JavaScript 스킴",
  path_traversal_pattern: "상위 경로 이동",
  sensitive_path: "민감 경로"
};

function describeCondition(condition: MatchLeaf | MatchCondition): {
  label: string;
  value: string;
} {
  if ("type" in condition) {
    return {
      label: conditionLabels[condition.type] ?? condition.type.replaceAll("_", " "),
      value:
        condition.values?.join(" · ") ??
        (condition.threshold === undefined ? "설정값 없음" : `기준 ${condition.threshold}`)
    };
  }

  const joiner = condition.operator === "all" ? " + " : " 또는 ";
  return {
    label: condition.operator === "all" ? "모든 조건" : "조건 중 하나",
    value: condition.conditions
      .map((child) => {
        const description = describeCondition(child);
        return `${description.label}: ${description.value}`;
      })
      .join(joiner)
  };
}

export function RuleDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [validationElapsedSeconds, setValidationElapsedSeconds] = useState(0);
  const {
    data: rule,
    isLoading,
    isError
  } = useQuery({ queryKey: ["rule", id], queryFn: () => platformApi.getRule(id) });
  const aiQuery = useQuery({ queryKey: ["ai-status"], queryFn: platformApi.getAiStatus });
  const validation = useMutation({
    mutationFn: () => platformApi.validateRule(id),
    onSuccess: (run) => {
      void queryClient.invalidateQueries({ queryKey: ["rule", id] });
      void queryClient.invalidateQueries({ queryKey: ["rules"] });
      navigate(`/validation/${run.id}`);
    }
  });
  useEffect(() => {
    if (!validation.isPending) {
      setValidationElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setValidationElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [validation.isPending]);

  if (isLoading) return <LoadingState />;
  if (isError || !rule) return <ErrorState message="방어 룰을 찾지 못했습니다." />;
  const canValidate = ["draft", "review_required"].includes(rule.status);
  const aiConfigured = Boolean(aiQuery.data?.enabled && aiQuery.data.configured);
  const elapsedMinutes = Math.floor(validationElapsedSeconds / 60);
  const elapsedSeconds = String(validationElapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="space-y-7">
      <Link
        to={rule.sourceLogId ? `/logs/${rule.sourceLogId}` : "/rules"}
        className="inline-flex items-center gap-2 text-sm text-[#949ba4] hover:text-white"
      >
        <ArrowLeft className="size-4" />
        {rule.sourceLogId ? "원본 공격 요청" : "방어 룰 목록"}
      </Link>
      <PageHeader
        eyebrow={`Signature · ${rule.externalId}`}
        title="방어 룰 검증"
        description={
          aiConfigured
            ? "AI 우회 생성과 결정론적 변형을 최대 5라운드 실행하고, 잠금된 Holdout 데이터셋으로 최종 검증합니다."
            : "결정론적 우회 변형을 최대 5라운드 실행하고, 잠금된 Holdout 데이터셋으로 최종 검증합니다. AI 설정 후 추가 우회 생성이 활성화됩니다."
        }
        actions={
          <>
            {rule.validationRunId && (
              <Link to={`/validation/${rule.validationRunId}`} className={buttonSecondary}>
                기존 검증 결과
                <ArrowRight className="size-4" />
              </Link>
            )}
            {rule.validationRunId && (
              <Link to={`/deployments?ruleId=${rule.id}`} className={buttonSecondary}>
                <Rocket className="size-4" />
                배포 관리로 이동
              </Link>
            )}
            <button
              type="button"
              onClick={() => validation.mutate()}
              disabled={validation.isPending || !canValidate}
              className={buttonPrimary}
            >
              <FlaskConical className={`size-4 ${validation.isPending ? "animate-pulse" : ""}`} />
              {validation.isPending
                ? "우회·오탐 검증 중"
                : aiConfigured
                  ? "AI 우회·오탐 검증 시작"
                  : "우회·오탐 검증 시작"}
              <ArrowRight className="size-4" />
            </button>
            <StatusBadge status={rule.status} />
          </>
        }
      />
      {validation.isError && <ErrorState message={validation.error.message} />}
      {validation.isPending && (
        <section
          aria-live="polite"
          className="overflow-hidden rounded-xl border border-[#5865f2]/35 bg-[#5865f2]/10"
        >
          <div className="h-1 w-full overflow-hidden bg-white/[0.05]">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-[#5865f2] to-[#60a5fa]" />
          </div>
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#5865f2] text-white">
                <FlaskConical className="size-5 animate-pulse" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">방어 룰을 검증하고 있습니다</h2>
                <p className="mt-1 text-sm leading-6 text-[#b5bac1]">
                  AI 응답과 반복 횟수에 따라 수 분 걸릴 수 있습니다. 완료되면 검증 결과 화면으로
                  자동 이동합니다.
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-[#c9cdfb] sm:ml-auto">
                {elapsedMinutes}:{elapsedSeconds}
              </span>
            </div>
            <div className="grid gap-2 text-xs text-[#b5bac1] sm:grid-cols-3">
              {["우회 공격 변형 생성", "룰 보강 및 정상 요청 확인", "Holdout 최종 평가·리포트"].map(
                (step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-black/10 px-3 py-3"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.08] font-mono text-[10px] text-[#c9cdfb]">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}
      <div
        className={`rounded-md border p-4 text-xs ${aiConfigured ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-200"}`}
      >
        {aiConfigured
          ? `AI 설정됨 · ${aiQuery.data?.provider} ${aiQuery.data?.model ?? "기본 모델"} · 호출 실패 시 기본 검증으로 대체됩니다.`
          : "AI 미설정 · 현재 검증은 결정론적 우회 데이터와 Holdout 지표를 사용합니다."}
      </div>
      {!canValidate && !rule.validationRunId && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] p-4 text-sm text-amber-200">
          현재 룰 상태에서는 새 검증을 시작할 수 없습니다.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[#949cf7]" />
              <div>
                <h2 className="font-mono text-sm font-bold text-white">
                  {rule.externalId} · v{rule.version}
                </h2>
                <p className="mt-1 text-xs text-[#949ba4]">{rule.category}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#b5bac1]">{rule.summary}</p>
            <div className="mt-6 rounded-md bg-[#111214] p-4">
              <p className="text-xs font-semibold text-[#949ba4]">사람이 읽는 룰 조건</p>
              <p className="mt-2 text-sm leading-6 text-white">
                요청의 {rule.definition.target.join(", ")}에서 아래 조건을{" "}
                {rule.definition.match.operator === "all" ? "모두" : "하나 이상"} 만족하면{" "}
                {rule.definition.action === "block" ? "차단" : "관찰"}합니다.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {rule.definition.match.conditions.map((condition, index) => {
                const description = describeCondition(condition);
                return (
                  <div
                    key={`${description.label}-${index}`}
                    className="flex flex-col gap-2 rounded-md border border-white/[0.06] p-4 sm:flex-row sm:items-center"
                  >
                    <span className="text-sm font-semibold text-white">{description.label}</span>
                    <span className="ml-auto text-right font-mono text-xs text-[#c9cdfb]">
                      {description.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="security-panel rounded-md">
            <div className="flex items-center gap-3 border-b border-[#273244] px-5 py-4">
              <Clock3 className="size-4 text-[#38bdf8]" />
              <div>
                <h2 className="text-sm font-semibold text-white">버전 이력</h2>
                <p className="mt-1 text-xs text-[#9ca3af]">검증 과정에서 채택된 룰 변경 기록</p>
              </div>
            </div>
            {rule.versionHistory.length ? (
              <ol className="divide-y divide-[#273244]">
                {rule.versionHistory.map((version) => (
                  <li
                    key={version.version}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[70px_1fr_120px] sm:items-center"
                  >
                    <span className="font-mono text-xs font-bold text-[#a5b4fc]">
                      v{version.version}
                    </span>
                    <span className="text-xs text-[#d1d5db]">{version.note}</span>
                    <span className="font-mono text-[10px] text-[#64748b]">
                      {new Date(version.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-5 text-xs text-[#9ca3af]">저장된 버전 이력이 없습니다.</p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-[#5865f2]/30 bg-[#5865f2]/10 p-5">
            <FlaskConical className="size-5 text-[#949cf7]" />
            <h2 className="mt-4 text-lg font-bold text-white">검증 기준</h2>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-[#b5bac1]">
              <li className="flex gap-2">
                <Check className="size-4 text-emerald-300" />
                공격 탐지율 80% 이상
              </li>
              <li className="flex gap-2">
                <Check className="size-4 text-emerald-300" />
                정상 요청 오탐률 10% 이하
              </li>
              <li className="flex gap-2">
                <Check className="size-4 text-emerald-300" />
                우회 성공률 10% 이하
              </li>
              <li className="flex gap-2">
                <Check className="size-4 text-emerald-300" />
                Holdout 무결성 확인
              </li>
            </ul>
          </section>
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <p className="text-xs text-[#6d6f78]">현재 신뢰도</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatPercent(rule.confidence)}</p>
            <p className="mt-1 text-xs text-[#949ba4]">
              오탐률 {formatPercent(rule.falsePositiveRate)}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
