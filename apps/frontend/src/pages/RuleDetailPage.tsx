import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bot, Check, FlaskConical, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

const conditionLabels: Record<string, string> = {
  keyword_sequence: "키워드 순서",
  special_character_density: "특수문자 비율",
  html_tag_with_event_handler: "이벤트 핸들러 포함 태그",
  javascript_scheme: "JavaScript 스킴",
  path_traversal_pattern: "상위 경로 이동",
  sensitive_path: "민감 경로"
};

export function RuleDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const validated = useDemoFlowStore((state) => state.validationCompleted);
  const advance = useDemoFlowStore((state) => state.advance);
  const {
    data: rule,
    isLoading,
    isError
  } = useQuery({ queryKey: ["rule", id], queryFn: () => platformApi.getRule(id) });
  const mutation = useMutation({
    mutationFn: () => platformApi.validateRule(id),
    onSuccess: (run) => {
      advance(4);
      navigate(`/validation/${run.id}`);
    }
  });
  if (isLoading) return <LoadingState />;
  if (isError || !rule) return <ErrorState message="방어 룰을 찾지 못했습니다." />;

  return (
    <div className="space-y-7">
      <Link
        to="/logs/log-1048"
        className="inline-flex items-center gap-2 text-sm text-[#949ba4] hover:text-white"
      >
        <ArrowLeft className="size-4" />
        공격 요청으로 돌아가기
      </Link>
      <PageHeader
        eyebrow="Step 4 · Evolve"
        title="AI 우회 검증을 시작"
        description="현재 룰을 바로 배포하지 않습니다. AI가 공격 표현을 바꾸며 우회를 시도하고, 실패한 조건을 보강합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || validated}
              className={buttonPrimary}
            >
              {validated ? (
                <>
                  <Check className="size-4" />
                  검증 완료
                </>
              ) : (
                <>
                  <FlaskConical className="size-4" />
                  {mutation.isPending ? "AI 검증 중..." : "AI 우회 검증 시작"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
            <StatusBadge status={rule.status} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[#949cf7]" />
              <div>
                <h2 className="font-mono text-sm font-bold text-white">
                  {rule.id} · v{rule.version}
                </h2>
                <p className="mt-1 text-xs text-[#949ba4]">{rule.category}</p>
              </div>
            </div>
            <div className="mt-6 rounded-md bg-[#111214] p-4">
              <p className="text-xs font-semibold text-[#949ba4]">사람이 읽는 룰 조건</p>
              <p className="mt-2 text-sm leading-6 text-white">
                요청의 {rule.definition.target.join(", ")}에서 아래 조건을{" "}
                {rule.definition.match.operator === "all" ? "모두" : "하나 이상"} 만족하면 공격으로
                판단합니다.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {rule.definition.match.conditions.map((condition) => (
                <div
                  key={condition.type}
                  className="flex flex-col gap-2 rounded-md border border-white/[0.06] p-4 sm:flex-row sm:items-center"
                >
                  <span className="text-sm font-semibold text-white">
                    {conditionLabels[condition.type] ?? condition.type}
                  </span>
                  <span className="ml-auto font-mono text-xs text-[#c9cdfb]">
                    {condition.values?.join(" → ") ?? `기준 ${condition.threshold}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <h2 className="text-sm font-semibold text-white">AI가 시도할 우회 방식</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["URL 이중 인코딩", "SQL 주석 삽입", "대소문자·공백 변형"].map((item, index) => (
                <div key={item} className="rounded-md bg-[#111214] p-4">
                  <span className="text-xs font-bold text-[#949cf7]">0{index + 1}</span>
                  <p className="mt-2 text-sm text-[#dbdee1]">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-[#5865f2]/30 bg-[#5865f2]/10 p-5">
            <Bot className="size-5 text-[#949cf7]" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#949cf7]">
              현재 작업
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">Adversarial 검증 실행</h2>
            <p className="mt-2 text-sm leading-6 text-[#b5bac1]">
              공격 샘플과 정상 요청을 함께 재생해 탐지율과 오탐률을 계산합니다.
            </p>
          </section>
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <h2 className="text-sm font-semibold text-white">배포 전 안전장치</h2>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-[#b5bac1]">
              {[
                "탐지율 95% 이상",
                "정상 요청 오탐률 2% 이하",
                "관리자 설명 확인 필수",
                "첫 배포는 Shadow 모드"
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
