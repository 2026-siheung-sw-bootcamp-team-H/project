import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Orbit, RotateCcw, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { DefenseTunnel } from "@/components/DefenseTunnel";
import { SecurityOrb } from "@/components/SecurityOrb";

const scenes = [
  {
    kicker: "01 · Observe",
    title: "공격을 먼저 봅니다.",
    body: "보호할 서비스를 연결하면 모든 요청이 Nginx 보안 관문을 지나갑니다. 정상 요청과 공격 요청을 같은 타임라인에서 확인합니다.",
    stat: "Request captured",
    icon: Shield
  },
  {
    kicker: "02 · Evolve",
    title: "우회할수록 룰은 강해집니다.",
    body: "탐지된 공격에서 시그니처 초안을 만들고, AI가 인코딩·공백·주석 변형으로 우회를 시도해 약점을 찾습니다.",
    stat: "3 hardening rounds",
    icon: Sparkles
  },
  {
    kicker: "03 · Protect",
    title: "사람이 이해한 뒤 배포합니다.",
    body: "AI 설명과 오탐률을 관리자가 확인한 뒤 Shadow 모드로 배포합니다. AI가 임의로 운영 차단을 켜지 않습니다.",
    stat: "Operator approved",
    icon: Check
  }
] as const;

export function OnboardingPage() {
  const [scene, setScene] = useState(0);
  const sections = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setScene(Number((visible.target as HTMLElement).dataset.scene));
      },
      { threshold: [0.45, 0.7] }
    );
    sections.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative bg-[#111214] text-white selection:bg-[#5865f2]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <DefenseTunnel phase={scene} />
        <div className="absolute inset-0 bg-[#08090d]/35" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#08090d_0%,rgba(8,9,13,.9)_38%,rgba(8,9,13,.12)_75%,rgba(8,9,13,.45)_100%)]" />
      </div>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#111214]/90 px-5 backdrop-blur md:px-10">
        <Link to="/onboarding" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#5865f2]">
            <Orbit className="size-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">Aegis Loop</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#111214] hover:bg-slate-200"
        >
          관리자 로그인 <ArrowRight className="size-4" />
        </Link>
      </header>
      <section className="relative z-10 flex min-h-screen items-center overflow-hidden px-5 pb-12 pt-24 md:px-10">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#aeb4ff]">
              자가진화형 웹 방어 플랫폼
            </p>
            <h1 className="mt-5 text-[clamp(3.4rem,7vw,6.8rem)] font-black leading-[0.88] tracking-[-0.07em]">
              공격보다
              <br />한 단계 먼저.
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md bg-[#5865f2] px-6 py-3.5 text-sm font-semibold shadow-[0_16px_50px_rgba(88,101,242,.32)] hover:bg-[#6d78f5]"
              >
                데모 시작하기 <ArrowRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => sections.current[0]?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-md bg-[#2b2d31] px-5 py-3 text-sm font-semibold text-[#dbdee1] hover:bg-[#35373c]"
              >
                흐름 먼저 보기 <ArrowDown className="size-4" />
              </button>
            </div>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#b5bac1]">
              공격을 포착하고, 우회 패턴을 학습하고, 사람이 이해할 수 있는 근거와 함께 방어 룰을
              배포합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#949ba4]">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />
                Nginx connected
              </span>
              <span>96% detection</span>
              <span>2% false positive</span>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[680px]">
            <div className="absolute inset-[8%] rounded-full bg-[#5865f2]/20 blur-[90px]" />
            <div className="absolute inset-0">
              <SecurityOrb />
            </div>
            <div className="absolute left-[3%] top-[20%] rounded-lg border border-rose-300/25 bg-[#160f16]/80 px-4 py-3 shadow-2xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                Incoming attack
              </p>
              <p className="mt-1 font-mono text-xs text-white">UNION/**/SELECT</p>
            </div>
            <div className="absolute bottom-[17%] right-[2%] rounded-lg border border-emerald-300/25 bg-[#0d1715]/85 px-4 py-3 shadow-2xl backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Defense evolved
              </p>
              <p className="mt-1 text-xs font-semibold text-white">Signature v3 · Ready</p>
            </div>
            <div className="absolute right-[6%] top-[12%] flex items-center gap-2 rounded-full border border-white/10 bg-[#111214]/80 px-3 py-2 text-[10px] text-[#b5bac1] backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-[#949cf7]" />
              AI hardening · round 3
            </div>
          </div>
        </div>
      </section>
      {scenes.map((item, index) => {
        const Icon = item.icon;
        return (
          <section
            key={item.kicker}
            ref={(element) => {
              sections.current[index] = element;
            }}
            data-scene={index}
            className="relative z-10 flex min-h-screen items-center px-5 py-24 md:px-10"
          >
            <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-[#949cf7]">{item.kicker}</p>
                <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
                  {item.title}
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-[#b5bac1]">{item.body}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1e1f22]/90 p-6 shadow-2xl backdrop-blur">
                <span className="grid size-11 place-items-center rounded-lg bg-[#5865f2]">
                  <Icon className="size-5" />
                </span>
                <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-[#949ba4]">
                  Defense loop
                </p>
                <p className="mt-2 text-xl font-bold">{item.stat}</p>
                <div className="mt-6 flex gap-1.5">
                  {scenes.map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 flex-1 rounded-full ${dot <= index ? "bg-[#5865f2]" : "bg-white/10"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
      <section className="relative z-10 border-t border-white/[0.06] bg-[#111214]/90 px-5 py-24 text-center md:px-10">
        <RotateCcw className="mx-auto size-6 text-[#949cf7]" />
        <h2 className="mt-5 text-4xl font-bold tracking-tight">이제 방어 루프를 실행해보세요.</h2>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#5865f2] px-5 py-3 text-sm font-semibold hover:bg-[#4752c4]"
        >
          관리자 로그인 <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  );
}
