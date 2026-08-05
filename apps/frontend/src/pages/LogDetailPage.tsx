import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FileCode2, RefreshCw, ScanSearch } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EnforcementAttributionBadges } from "@/components/EnforcementAttributionBadges";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";

export function LogDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: log,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["log", id],
    queryFn: () => platformApi.getLog(id)
  });
  const normalize = useMutation({
    mutationFn: () => platformApi.normalizeLog(id),
    onSuccess: (result) => queryClient.setQueryData(["log", id], result)
  });
  const createRule = useMutation({
    mutationFn: () => platformApi.generateRule(id),
    onSuccess: (rule) => {
      void queryClient.invalidateQueries({ queryKey: ["rules"] });
      navigate(`/rules/${rule.id}`);
    }
  });

  if (isLoading) return <LoadingState />;
  if (isError || !log) return <ErrorState message="요청 로그를 찾지 못했습니다." />;
  const canGenerate = Boolean(log.attackCategory);

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
        eyebrow={`Request · ${log.id}`}
        title="요청 분석과 시그니처 생성"
        description="수집된 요청의 비식별 원본, 정규화 결과, 탐지 근거를 확인하고 공격 요청에서 방어 룰 초안을 생성합니다."
        actions={
          <>
            <button
              type="button"
              onClick={() => normalize.mutate()}
              disabled={normalize.isPending}
              className={buttonSecondary}
            >
              <RefreshCw className={`size-4 ${normalize.isPending ? "animate-spin" : ""}`} />
              다시 정규화
            </button>
            <button
              type="button"
              onClick={() => createRule.mutate()}
              disabled={createRule.isPending || !canGenerate}
              className={buttonPrimary}
            >
              <FileCode2 className="size-4" />
              {createRule.isPending ? "룰 생성 중..." : "시그니처 생성"}
              <ArrowRight className="size-4" />
            </button>
            <StatusBadge status={log.classification} />
            <StatusBadge status={log.action} />
          </>
        }
      />
      {!canGenerate && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] p-4 text-sm text-amber-200">
          정상 요청에서는 방어 룰을 만들 수 없습니다. 공격 또는 의심 요청을 선택하세요.
        </div>
      )}
      {(createRule.isError || normalize.isError) && (
        <ErrorState message={(createRule.error ?? normalize.error)?.message} />
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">비식별 요청 원문</h2>
              <p className="mt-1 text-xs text-[#949ba4]">민감 정보는 수집 단계에서 제거됩니다.</p>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-rose-200">
              {log.rawRequest}
            </pre>
          </section>
          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">정규화 결과</h2>
              <p className="mt-1 text-xs text-[#949ba4]">
                인코딩과 주석 차이를 제거해 비교 가능한 형태로 변환합니다.
              </p>
            </div>
            <p className="break-all p-5 font-mono text-sm leading-6 text-emerald-200">
              {log.normalizedRequest || "정규화 결과 없음"}
            </p>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="security-panel rounded-md p-5">
            <div className="flex items-center gap-3">
              <ScanSearch className="size-5 text-[#38bdf8]" />
              <h2 className="text-sm font-semibold text-white">탐지·처리 근거</h2>
            </div>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                  Attack category
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {log.attackCategory ?? "정상 또는 미분류"}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                  Detection reason
                </dt>
                <dd className="mt-2 space-y-2">
                  {log.detectionReasons.length ? (
                    log.detectionReasons.map((reason) => (
                      <p
                        key={reason}
                        className="border-l-2 border-[#f59e0b] pl-3 text-xs leading-5 text-[#d1d5db]"
                      >
                        {reason}
                      </p>
                    ))
                  ) : (
                    <span className="text-xs text-[#9ca3af]">저장된 탐지 사유가 없습니다.</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                  Extracted tokens
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {log.tokens.length ? (
                    log.tokens.map((token) => (
                      <code
                        key={token}
                        className="rounded-sm border border-[#273244] bg-[#0b0f19] px-2 py-1 text-xs text-[#a5b4fc]"
                      >
                        {token}
                      </code>
                    ))
                  ) : (
                    <span className="text-xs text-[#9ca3af]">토큰 없음</span>
                  )}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[#273244] pt-4">
                <div>
                  <dt className="text-[10px] text-[#64748b]">ENFORCEMENT SOURCE</dt>
                  <dd className="mt-1 text-xs text-white">{log.enforcementSource}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-[#64748b]">RESULT</dt>
                  <dd className="mt-1 text-xs text-white">
                    HTTP {log.statusCode || "-"} · {log.action.toUpperCase()}
                  </dd>
                </div>
              </div>
              {log.enforcementAttributions.length > 0 && (
                <div className="border-t border-[#273244] pt-4">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                    차단 주체
                  </dt>
                  <dd className="mt-2">
                    <EnforcementAttributionBadges items={log.enforcementAttributions} />
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
