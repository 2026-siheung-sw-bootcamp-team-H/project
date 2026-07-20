import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Globe2, Server, ShieldCheck, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { buttonPrimary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

const nodes = [
  {
    label: "사용자가 보는 주소",
    value: "shop.example.com",
    note: "주소는 바뀌지 않습니다",
    icon: Globe2
  },
  {
    label: "보안 관문",
    value: "Nginx + ModSecurity",
    note: "요청을 먼저 검사합니다",
    icon: ShieldCheck
  },
  { label: "실제 서비스", value: "Backend :4000", note: "통과한 요청만 받습니다", icon: Server }
] as const;

export function ServicesPage() {
  const navigate = useNavigate();
  const connected = useDemoFlowStore((state) => state.serviceConnected);
  const advance = useDemoFlowStore((state) => state.advance);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["service"],
    queryFn: platformApi.getService
  });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  function connect() {
    advance(1);
    window.setTimeout(() => navigate("/logs"), 450);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Step 1 · Connect"
        title="Demo Shop을 보호 서비스에 연결"
        description="실제 사이트 주소를 바꾸는 작업이 아닙니다. DNS가 바라보는 대상을 원본 서버에서 Nginx 보안 관문으로 변경합니다."
        actions={
          <>
            <button type="button" onClick={connect} disabled={connected} className={buttonPrimary}>
              {connected ? (
                <>
                  <Check className="size-4" />
                  연결 완료
                </>
              ) : (
                <>
                  서비스 연결하기 <ArrowRight className="size-4" />
                </>
              )}
            </button>
            <a
              href="/demo-shop"
              className="inline-flex items-center gap-2 rounded-md bg-[#2b2d31] px-4 py-2.5 text-sm font-semibold hover:bg-[#35373c]"
            >
              <Store className="size-4" />
              Demo Shop 열기
            </a>
          </>
        }
      />

      <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">요청이 이동하는 경로</h2>
            <p className="mt-1 text-xs text-[#949ba4]">
              왼쪽에서 오른쪽 순서로 모든 요청이 전달됩니다.
            </p>
          </div>
          {connected && (
            <span className="inline-flex items-center gap-2 rounded bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
              <Check className="size-3.5" />
              연결됨
            </span>
          )}
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const value = index === 2 ? data.apiUrl : node.value;
            return (
              <div key={node.label} className="contents">
                <article
                  className={`rounded-lg border p-5 ${index === 1 ? "border-[#5865f2]/40 bg-[#5865f2]/10" : "border-white/[0.06] bg-[#111214]"}`}
                >
                  <Icon className={`size-5 ${index === 1 ? "text-[#949cf7]" : "text-[#949ba4]"}`} />
                  <p className="mt-6 text-xs text-[#949ba4]">{node.label}</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-[#6d6f78]">{node.note}</p>
                </article>
                {index < nodes.length - 1 && (
                  <ArrowRight className="mx-auto size-4 rotate-90 text-[#6d6f78] lg:rotate-0" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
          <h2 className="text-sm font-semibold text-white">이 연결로 달라지는 것</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#6d6f78]">사용자 접속 주소</dt>
              <dd className="mt-1 text-sm font-medium text-white">그대로 유지</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6f78]">DNS 연결 대상</dt>
              <dd className="mt-1 text-sm font-medium text-white">Nginx 프록시로 변경</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6f78]">공격 요청</dt>
              <dd className="mt-1 text-sm font-medium text-white">ModSecurity에서 차단</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6f78]">정상 요청</dt>
              <dd className="mt-1 text-sm font-medium text-white">원본 서버로 전달</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-[#5865f2]/30 bg-[#5865f2]/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#949cf7]">현재 작업</p>
          <h2 className="mt-2 text-lg font-bold text-white">보안 관문 연결 확인</h2>
          <p className="mt-2 text-sm leading-6 text-[#b5bac1]">
            상단의 연결 버튼을 누르면 다음 화면에서 실제 공격 요청을 보내게 됩니다.
          </p>
        </div>
      </section>
    </div>
  );
}
