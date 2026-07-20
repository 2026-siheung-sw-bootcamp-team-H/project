import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileCode2, ScanSearch } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

export function LogDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const ruleCreated = useDemoFlowStore((state) => state.ruleCreated);
  const advance = useDemoFlowStore((state) => state.advance);
  const {
    data: log,
    isLoading,
    isError
  } = useQuery({ queryKey: ["log", id], queryFn: () => platformApi.getLog(id) });
  const mutation = useMutation({
    mutationFn: () => platformApi.generateRule(id),
    onSuccess: (rule) => {
      advance(3);
      navigate(`/rules/${rule.id}`);
    }
  });
  if (isLoading) return <LoadingState />;
  if (isError || !log) return <ErrorState message="요청 로그를 찾지 못했습니다." />;

  return (
    <div className="space-y-7">
      <Link
        to="/logs"
        className="inline-flex items-center gap-2 text-sm text-[#949ba4] hover:text-white"
      >
        <ArrowLeft className="size-4" />
        실시간 요청
      </Link>
      <PageHeader
        eyebrow="Step 3 · Signature"
        title="이 요청을 방어 룰로 전환"
        description="원문 전체를 외우는 룰이 아니라, 같은 공격 유형을 다시 찾아낼 수 있는 핵심 토큰과 조건을 추출합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || ruleCreated}
              className={buttonPrimary}
            >
              {ruleCreated ? (
                <>
                  <Check className="size-4" />
                  생성 완료
                </>
              ) : (
                <>
                  <FileCode2 className="size-4" />
                  {mutation.isPending ? "생성 중..." : "시그니처 만들기"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
            <StatusBadge status={log.classification} />
            <StatusBadge status={log.action} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">요청 원문</h2>
              <p className="mt-1 text-xs text-[#949ba4]">사용자가 실제로 보낸 HTTP 요청입니다.</p>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-rose-200">
              {log.rawRequest}
            </pre>
          </section>
          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">정규화 결과</h2>
              <p className="mt-1 text-xs text-[#949ba4]">
                인코딩과 대소문자 차이를 제거해 비교 가능한 형태로 바꿨습니다.
              </p>
            </div>
            <p className="break-all p-5 font-mono text-sm leading-6 text-emerald-200">
              {log.normalizedRequest}
            </p>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <div className="flex items-center gap-3">
              <ScanSearch className="size-5 text-[#949cf7]" />
              <h2 className="text-sm font-semibold text-white">탐지 근거</h2>
            </div>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs text-[#6d6f78]">공격 유형</dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {log.attackCategory ?? "미분류"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6d6f78]">추출된 토큰</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {log.tokens.map((token) => (
                    <code
                      key={token}
                      className="rounded bg-[#111214] px-2 py-1 text-xs text-[#c9cdfb]"
                    >
                      {token}
                    </code>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6d6f78]">처리 결과</dt>
                <dd className="mt-1 text-sm text-white">
                  HTTP {log.statusCode} · {log.action === "blocked" ? "요청 차단" : "요청 허용"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-[#5865f2]/30 bg-[#5865f2]/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#949cf7]">
              현재 작업
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">시그니처 초안 생성</h2>
            <p className="mt-2 text-sm leading-6 text-[#b5bac1]">
              UNION, SELECT와 특수문자 밀도를 조합한 탐지 조건을 만듭니다.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
