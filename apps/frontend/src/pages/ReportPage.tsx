import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, GitCompareArrows, Info, Rocket } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { buttonPrimary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

export function ReportPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const advance = useDemoFlowStore((state) => state.advance);
  const {
    data: report,
    isLoading,
    isError
  } = useQuery({ queryKey: ["report", id], queryFn: () => platformApi.getReport(id) });
  if (isLoading) return <LoadingState />;
  if (isError || !report) return <ErrorState message="AI 설명 리포트를 찾지 못했습니다." />;

  return (
    <div className="space-y-7">
      <Link
        to="/validation/val-301"
        className="inline-flex items-center gap-2 text-sm text-[#949ba4] hover:text-white"
      >
        <ArrowLeft className="size-4" />
        검증 결과로 돌아가기
      </Link>
      <PageHeader
        eyebrow={`AI explanation · ${report.ruleId}`}
        title="이 룰을 배포해도 되는 이유"
        description="AI가 낸 결론을 그대로 믿는 화면이 아닙니다. 관리자가 배포 여부를 판단할 수 있도록 공격 근거와 위험을 설명합니다."
        actions={
          <button
            type="button"
            onClick={() => {
              advance(5);
              navigate("/deployments");
            }}
            className={buttonPrimary}
          >
            <Rocket className="size-4" />
            배포 검토로 이동 <ArrowRight className="size-4" />
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <p className="text-xs font-semibold text-[#949cf7]">01 · 발견한 공격</p>
            <h2 className="mt-2 text-lg font-bold text-white">
              상품 조회 파라미터의 SQL Injection
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#b5bac1]">
              상품 ID 대신 UNION SELECT 구문을 넣어 데이터베이스의 다른 정보를 읽으려는 요청입니다.
              URL 인코딩과 SQL 주석을 섞어 기존 탐지를 우회하려 했습니다.
            </p>
          </section>
          <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
              <GitCompareArrows className="size-4 text-[#949cf7]" />
              <h2 className="text-sm font-semibold text-white">02 · 숨김 문자를 제거한 결과</h2>
            </div>
            <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
              <div className="bg-[#1e1f22] p-5">
                <p className="text-xs font-semibold text-rose-300">공격 원문</p>
                <code className="mt-3 block break-all text-xs leading-6 text-[#b5bac1]">
                  %55%4e%49%4f%4e/**/%53%45%4c%45%43%54
                </code>
              </div>
              <div className="bg-[#1e1f22] p-5">
                <p className="text-xs font-semibold text-emerald-300">정규화 후</p>
                <code className="mt-3 block break-all text-xs leading-6 text-white">
                  union select
                </code>
              </div>
            </div>
          </section>
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <p className="text-xs font-semibold text-[#949cf7]">03 · AI가 바꾼 것</p>
            <ul className="mt-4 space-y-3 text-sm text-[#b5bac1]">
              {[
                "SQL 주석을 먼저 제거하는 정규화 단계 추가",
                "URL 인코딩을 두 번 해제해 숨은 키워드 확인",
                "특수문자 비율을 함께 검사해 단순 문장 오탐 감소"
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Recommendation
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">Shadow 배포 권장</h2>
            <p className="mt-3 text-sm leading-6 text-[#b5bac1]">
              탐지율 96%, 오탐률 2%, 우회 성공률 4%입니다. 즉시 차단보다 24시간 관찰 모드로 먼저
              적용하는 것이 안전합니다.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-[#111214]/60 p-3">
                <strong className="block text-lg text-emerald-300">96%</strong>
                <span className="text-[10px] text-[#949ba4]">탐지</span>
              </div>
              <div className="rounded bg-[#111214]/60 p-3">
                <strong className="block text-lg text-amber-300">2%</strong>
                <span className="text-[10px] text-[#949ba4]">오탐</span>
              </div>
              <div className="rounded bg-[#111214]/60 p-3">
                <strong className="block text-lg text-rose-300">4%</strong>
                <span className="text-[10px] text-[#949ba4]">우회</span>
              </div>
            </div>
          </section>
          <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-[#949cf7]" />
              <h2 className="text-sm font-semibold text-white">관리자가 확인할 것</h2>
            </div>
            <ol className="mt-4 space-y-3 text-xs leading-5 text-[#b5bac1]">
              <li>1. 정상 검색 문장에서 SQL 단어가 함께 쓰이는 경우</li>
              <li>2. Shadow 로그에서 정상 요청이 탐지되는지</li>
              <li>3. 이상 발생 시 이전 룰로 즉시 롤백 가능한지</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
