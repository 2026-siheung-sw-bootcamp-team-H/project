import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Eye,
  FileCode2,
  RotateCcw,
  Rocket,
  Server,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { buttonPrimary, buttonSecondary } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useDemoFlowStore } from "@/stores/demoFlowStore";

export function DeploymentsPage() {
  const queryClient = useQueryClient();
  const deployed = useDemoFlowStore((state) => state.deployed);
  const advance = useDemoFlowStore((state) => state.advance);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["deployments"],
    queryFn: platformApi.getDeployments
  });
  const target = data?.find((item) => item.id === "dep-2");
  const mutation = useMutation({
    mutationFn: () => platformApi.deploy("dep-2"),
    onSuccess: () => {
      advance(6);
      void queryClient.invalidateQueries({ queryKey: ["deployments"] });
    }
  });
  if (isLoading) return <LoadingState />;
  if (isError || !target) return <ErrorState />;

  const isDone = deployed || target.status === "deployed";
  const activeIndex = isDone ? 3 : 2;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Step 6 · Deploy"
        title={isDone ? "Shadow 배포가 완료됐습니다" : "검증된 룰을 안전하게 배포"}
        description="이번 데모에서는 여러 배포 형식을 한꺼번에 보여주지 않습니다. Demo Shop 앞단의 Nginx + ModSecurity 한 곳에만 적용합니다."
        actions={
          isDone ? (
            <Link to="/dashboard" className={buttonPrimary}>
              완료 결과 보기 <ArrowRight className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className={buttonPrimary}
            >
              {mutation.isPending ? "배포 중..." : "Shadow 배포 실행"}
              <ArrowRight className="size-4" />
            </button>
          )
        }
      />

      <ol className="grid gap-2 sm:grid-cols-4">
        {["AI 검증", "설명 확인", "Shadow 적용", "Active 차단"].map((label, index) => {
          const done = index < activeIndex;
          return (
            <li
              key={label}
              className={`rounded-lg border p-4 ${index === activeIndex ? "border-[#5865f2]/50 bg-[#5865f2]/10" : "border-white/[0.06] bg-[#1e1f22]"}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-400 text-[#111214]" : index === activeIndex ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#6d6f78]"}`}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <p
                className={`mt-3 text-sm font-semibold ${index <= activeIndex ? "text-white" : "text-[#6d6f78]"}`}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>

      <section
        className={`rounded-xl border p-6 sm:p-8 ${isDone ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-[#5865f2]/35 bg-[#5865f2]/10"}`}
      >
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
          <span
            className={`grid size-14 shrink-0 place-items-center rounded-xl ${isDone ? "bg-emerald-400 text-[#111214]" : "bg-[#5865f2] text-white"}`}
          >
            {isDone ? <ShieldCheck className="size-7" /> : <Rocket className="size-6" />}
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
              SIG-SQLI-014 · Nginx + ModSecurity
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {isDone ? "관찰 모드로 적용됨" : "Shadow 모드로 먼저 적용"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b5bac1]">
              {isDone
                ? "요청을 실제로 막지는 않고, 새 룰이 어떤 요청을 탐지했는지 기록합니다. 오탐이 없으면 Active 차단으로 전환할 수 있습니다."
                : "새 룰이 공격으로 판단한 요청을 기록하되 차단하지 않습니다. 정상 사용자가 영향을 받는지 먼저 확인합니다."}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
          <div className="flex items-center gap-3">
            <Server className="size-5 text-[#949cf7]" />
            <h2 className="text-sm font-semibold text-white">배포하면 어디가 바뀌나요?</h2>
          </div>
          <div className="mt-5 rounded-md bg-[#111214] p-4 font-mono text-xs leading-6 text-[#b5bac1]">
            <p>shop.example.com</p>
            <p className="text-[#6d6f78]">↓</p>
            <p className="text-[#c9cdfb]">
              Nginx + ModSecurity <span className="text-emerald-300">+ SIG-SQLI-014</span>
            </p>
            <p className="text-[#6d6f78]">↓</p>
            <p>Backend :4000</p>
          </div>
        </section>
        <section className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
          <div className="flex items-center gap-3">
            <FileCode2 className="size-5 text-[#949cf7]" />
            <h2 className="text-sm font-semibold text-white">문제가 생기면?</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#b5bac1]">
            새 룰만 비활성화하면 이전 상태로 즉시 돌아갑니다. Nginx 주소나 실제 서비스 주소는
            변경되지 않습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/reports/report-301" className={buttonSecondary}>
              <Eye className="size-4" />
              AI 설명 다시 보기
            </Link>
            <button type="button" disabled={!isDone} className={buttonSecondary}>
              <RotateCcw className="size-4" />
              롤백
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
