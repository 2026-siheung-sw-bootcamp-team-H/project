import { type CSSProperties, lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ReconstructionCanvas } from "@/components/ReconstructionCanvas";

const DefenseLatticeScene = lazy(() =>
  import("@/components/DefenseLatticeScene").then((module) => ({
    default: module.DefenseLatticeScene
  }))
);

const stories = [
  {
    index: "01",
    label: "Observe",
    title: "평범한 요청 사이에서\n공격의 흔적을 골라냅니다.",
    description:
      "서비스로 들어오는 요청을 정규화하고, 흩어진 변형과 우회 흔적을 하나의 공격 흐름으로 묶습니다."
  },
  {
    index: "02",
    label: "Harden",
    title: "잡아낸 패턴을\n끝까지 다시 시험합니다.",
    description:
      "시그니처를 만든 뒤 AI 우회 공격과 정상 요청을 함께 통과시켜, 실제 운영에 쓸 수 있는 룰인지 확인합니다."
  },
  {
    index: "03",
    label: "Deploy",
    title: "검증된 룰만\n단계적으로 적용합니다.",
    description:
      "Shadow 모드에서 영향을 먼저 살펴보고, 관리자가 승인한 룰만 실제 차단에 사용합니다. 문제가 생기면 바로 되돌릴 수 있습니다."
  }
] as const;

const stageSignals = [
  ["NORMALIZE", "TRACE", "CORRELATE"],
  ["GENERATE", "RED TEAM", "HOLDOUT"],
  ["SHADOW", "APPROVE", "ENFORCE"]
] as const;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function sceneStyle(progress: number, target: number, radius = 0.27): CSSProperties {
  const visibility = clamp(1 - Math.abs(progress - target) / radius);
  const eased = visibility * visibility * (3 - 2 * visibility);
  return {
    opacity: 0.16 + eased * 0.84,
    filter: `blur(${(1 - eased) * 9}px)`,
    transform: `translate3d(0, ${(1 - eased) * 46}px, 0) scale(${0.975 + eased * 0.025})`,
    letterSpacing: `${(1 - eased) * 0.012}em`
  };
}

export function OnboardingPage() {
  const rootRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const previousTitle = document.title;
    const previousScrollRestoration = window.history.scrollRestoration;
    document.title = "ANVIL · Adaptive Web Defense";
    window.history.scrollRestoration = "manual";
    const root = rootRef.current;
    let frame = 0;
    let resetFrame = 0;

    const resetScroll = () => {
      if (!root) return;
      root.scrollTop = 0;
      setProgress(0);
    };

    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!root) return;
        const range = Math.max(root.scrollHeight - root.clientHeight, 1);
        setProgress(clamp(root.scrollTop / range));
      });
    };

    resetScroll();
    resetFrame = window.requestAnimationFrame(resetScroll);
    const resetTimer = window.setTimeout(resetScroll, 80);
    updateProgress();
    root?.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      document.title = previousTitle;
      window.history.scrollRestoration = previousScrollRestoration;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resetFrame);
      window.clearTimeout(resetTimer);
      root?.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  function goToProgress(target: number) {
    const root = rootRef.current;
    if (!root) return;
    root.scrollTo({
      top: (root.scrollHeight - root.clientHeight) * target,
      behavior: "smooth"
    });
  }

  return (
    <main
      ref={rootRef}
      className="relative h-screen snap-y snap-proximity overflow-y-auto scroll-smooth bg-[#02050a] text-white selection:bg-white selection:text-black"
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#02050a]">
        <ReconstructionCanvas progress={progress} />
        <div
          className="absolute inset-0 bg-[#020711]"
          style={{ opacity: 0.44 - clamp((progress - 0.18) / 0.72) * 0.14 }}
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,rgba(0,0,0,.92)_52%,transparent_90%)]">
          <Suspense fallback={null}>
            <DefenseLatticeScene progress={progress} />
          </Suspense>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,5,10,.25),transparent_25%,transparent_68%,rgba(2,5,10,.48))]" />
        <div className="onboarding-security-grid absolute inset-0" />
        <div className="onboarding-signal-noise absolute inset-0" />
      </div>

      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-end px-6 py-6 sm:px-10 lg:px-14">
        <Link
          to="/login"
          className="group inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
        >
          Admin login
          <span className="grid size-9 place-items-center rounded-full border border-white/30 transition group-hover:bg-white group-hover:text-black">
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </header>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px bg-white/10">
        <span
          className="block h-full origin-left bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 shadow-[0_0_14px_rgba(103,226,255,.75)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <nav
        aria-label="온보딩 단계"
        className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex lg:right-14"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((target, index) => {
          const active = Math.abs(progress - target) < 0.13;
          return (
            <button
              key={target}
              type="button"
              aria-label={`${index === 0 ? "시작" : `${index}번째`} 온보딩 단계로 이동`}
              onClick={() => goToProgress(target)}
              className="group flex items-center justify-end gap-3"
            >
              <span
                className={`font-mono text-[8px] tracking-[0.16em] transition ${active ? "text-white/70" : "text-transparent group-hover:text-white/45"}`}
              >
                {String(index).padStart(2, "0")}
              </span>
              <span
                className={`block h-px transition-all ${active ? "w-8 bg-cyan-200 shadow-[0_0_8px_rgba(125,225,255,.8)]" : "w-3 bg-white/25 group-hover:w-5 group-hover:bg-white/50"}`}
              />
            </button>
          );
        })}
      </nav>

      <section className="relative z-10 flex min-h-screen snap-start items-center justify-center px-6 text-center">
        <div className="onboarding-core-halo pointer-events-none absolute left-1/2 top-1/2 size-[min(76vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <div className="onboarding-orbit onboarding-orbit-one pointer-events-none absolute left-1/2 top-1/2 size-[min(68vw,650px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <div className="onboarding-orbit onboarding-orbit-two pointer-events-none absolute left-1/2 top-1/2 size-[min(54vw,510px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        <div
          className="max-w-5xl will-change-[transform,filter,opacity]"
          style={{
            opacity: clamp(1 - progress * 3.7),
            filter: `blur(${progress * 12}px)`,
            transform: `scale(${1 - progress * 0.055}) translateY(${-progress * 70}px)`
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/58 sm:text-xs">
            Self-evolving web defense
          </p>
          <h1 className="onboarding-wordmark mt-6 text-[clamp(3.7rem,10vw,8.2rem)] font-black uppercase leading-[0.8] tracking-[-0.05em] drop-shadow-[0_10px_40px_rgba(0,0,0,.55)]">
            ANVIL
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-white/65 sm:text-lg">
            공격이 바뀌면, 방어도 다시 검증되어야 합니다.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/45 sm:gap-4">
            {["Observe", "Harden", "Deploy"].map((item, index) => (
              <span key={item} className="flex items-center gap-2 sm:gap-4">
                {index > 0 && <span className="h-px w-5 bg-white/15 sm:w-10" />}
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => goToProgress(0.25)}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/50 transition hover:text-white"
        >
          Scroll to reconstruct
          <ArrowDown className="size-4 animate-bounce" />
        </button>
      </section>

      {stories.map((story, index) => (
        <section
          key={story.index}
          className={`relative z-10 flex min-h-[118vh] snap-center items-center px-6 py-28 sm:px-10 lg:px-16 ${
            index === 1 ? "justify-end text-right" : "justify-start"
          }`}
        >
          <div
            className="max-w-[760px] will-change-[transform,filter,opacity] transition-[opacity,filter] duration-150"
            style={sceneStyle(progress, 0.25 + index * 0.25, 0.255)}
          >
            <div
              className={`mb-7 flex items-center gap-4 ${
                index === 1 ? "justify-end" : "justify-start"
              }`}
            >
              <span className="font-mono text-xs text-white/75">{story.index}</span>
              <span className="h-px w-12 bg-white/35" />
              <span className="text-[10px] font-bold uppercase tracking-[0.34em] text-white/55">
                {story.label}
              </span>
            </div>
            <h2 className="whitespace-pre-line text-[clamp(2.15rem,4.4vw,4.25rem)] font-black leading-[0.96] tracking-[-0.048em] drop-shadow-[0_8px_36px_rgba(0,0,0,.82)]">
              {story.title}
            </h2>
            <p
              className={`mt-8 max-w-xl text-base leading-8 text-white/68 sm:text-lg ${
                index === 1 ? "ml-auto" : ""
              }`}
            >
              {story.description}
            </p>
            <div
              className={`mt-10 flex flex-wrap gap-2 ${index === 1 ? "justify-end" : "justify-start"}`}
            >
              {stageSignals[index].map((signal, signalIndex) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-3 py-1.5 font-mono text-[8px] tracking-[0.18em] text-white/58 backdrop-blur-md"
                >
                  <span
                    className={`size-1 rounded-full ${signalIndex === 2 ? "bg-violet-300" : "bg-cyan-200"}`}
                  />
                  {signal}
                </span>
              ))}
            </div>
            <div
              className={`mt-7 flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-100/40 ${
                index === 1 ? "justify-end" : "justify-start"
              }`}
            >
              <span className="relative size-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(125,225,255,.8)]">
                <span className="absolute inset-0 animate-ping rounded-full bg-cyan-200/40" />
              </span>
              Live pipeline · stage {story.index}
            </div>
          </div>
        </section>
      ))}

      <section className="relative z-10 flex min-h-screen snap-end items-center justify-center px-6 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[min(94vw,1040px)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(2,5,10,.88)_0%,rgba(2,5,10,.68)_42%,rgba(2,5,10,.18)_66%,transparent_78%)]" />
        <div
          className="relative max-w-5xl will-change-[transform,filter,opacity]"
          style={sceneStyle(progress, 0.97, 0.2)}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-white/60">
            Ready for operation
          </p>
          <h2 className="mt-7 text-[clamp(2.35rem,4.8vw,4.7rem)] font-black leading-[0.94] tracking-[-0.05em] drop-shadow-[0_8px_40px_rgba(0,0,0,.78)]">
            검증 결과를 확인할 차례입니다.
            <br />
            배포 여부를 직접 결정하세요.
          </h2>
          <Link
            to="/login"
            className="group mt-11 inline-flex items-center gap-4 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition hover:bg-[#dce7f5]"
          >
            ANVIL 콘솔 열기
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-7 left-6 z-20 hidden items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/42 sm:flex lg:left-14">
        <span className="relative size-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(125,225,255,.9)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-200/50" />
        </span>
        {progress < 0.28
          ? "Request stream observed"
          : progress < 0.78
            ? "Signature hardening in progress"
            : "Deployment evidence ready"}
      </div>
      <div className="pointer-events-none fixed bottom-7 right-6 z-20 hidden font-mono text-[9px] tracking-[0.18em] text-white/38 sm:block lg:right-14">
        TRACE{" "}
        {Math.round(progress * 100)
          .toString()
          .padStart(3, "0")}{" "}
        / 100
      </div>
    </main>
  );
}
