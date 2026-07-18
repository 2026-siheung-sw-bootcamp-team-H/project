import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

type HealthStatus = {
  status: "ok";
  service: string;
  timestamp: string;
};

type ApiState =
  | { status: "loading" }
  | { status: "success"; health: HealthStatus }
  | { status: "error" };

const features = [
  {
    label: "Styling",
    value: "Tailwind CSS v4",
    description: "유틸리티 클래스와 Vite 플러그인으로 빠르게 조합합니다."
  },
  {
    label: "Frontend",
    value: "React + Vite",
    description: "반응형 레이아웃과 상태별 UI를 한 컴포넌트에서 실험합니다."
  },
  {
    label: "Backend",
    value: "Docker ready",
    description: "모노레포를 유지하면서 Express 서버만 컨테이너로 실행합니다."
  }
];

export function App() {
  const [count, setCount] = useState(0);
  const [apiState, setApiState] = useState<ApiState>({ status: "loading" });

  async function checkBackend() {
    setApiState({ status: "loading" });

    try {
      const health = await apiClient<HealthStatus>("/api/health");
      setApiState({ status: "success", health });
    } catch {
      setApiState({ status: "error" });
    }
  }

  useEffect(() => {
    void checkBackend();
  }, []);

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_60%)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <a href="/" className="flex items-center gap-3 rounded-lg">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-300 font-black text-slate-950 shadow-lg shadow-cyan-400/20">
              S
            </span>
            <span className="font-semibold tracking-tight">Siheung Lab</span>
          </a>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Tailwind experiment
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Monorepo, two runtimes
            </p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-balance sm:text-6xl">
              프론트는 가볍게,
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                백엔드는 독립적으로.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              styled-components를 걷어내고 Tailwind CSS로 전환한 실험 화면입니다. 아래 카드에서
              반응형, 상태 스타일, 임의 값, API 연동을 함께 확인할 수 있습니다.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCount((current) => current + 1)}
                className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                인터랙션 테스트 · {count}
              </button>
              <a
                href="http://localhost:4000/api-docs"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                Swagger 열기
              </a>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Live check
                </p>
                <h2 className="mt-1 text-xl font-bold">Backend status</h2>
              </div>
              <span
                className={`size-3 rounded-full ${
                  apiState.status === "success"
                    ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                    : apiState.status === "error"
                      ? "bg-rose-400"
                      : "animate-pulse bg-amber-300"
                }`}
              />
            </div>

            <div className="rounded-2xl bg-slate-950/70 p-4 font-mono text-sm text-slate-300 ring-1 ring-white/5">
              {apiState.status === "loading" && <p className="text-amber-300">연결 확인 중...</p>}
              {apiState.status === "error" && (
                <p className="text-rose-300">백엔드에 연결할 수 없습니다.</p>
              )}
              {apiState.status === "success" && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="text-slate-500">status</dt>
                  <dd className="text-emerald-300">{apiState.health.status}</dd>
                  <dt className="text-slate-500">service</dt>
                  <dd>{apiState.health.service}</dd>
                  <dt className="text-slate-500">checked</dt>
                  <dd>{new Date(apiState.health.timestamp).toLocaleTimeString("ko-KR")}</dd>
                </dl>
              )}
            </div>

            <button
              type="button"
              onClick={() => void checkBackend()}
              disabled={apiState.status === "loading"}
              className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-50"
            >
              다시 확인
            </button>
          </aside>
        </section>

        <section className="grid gap-4 border-t border-white/10 py-8 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                {feature.label}
              </p>
              <h2 className="mt-2 text-lg font-bold">{feature.value}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
