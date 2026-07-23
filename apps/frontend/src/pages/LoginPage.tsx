import { lazy, Suspense, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { ReconstructionCanvas } from "@/components/ReconstructionCanvas";
import { platformApi } from "@/services/platformApi";
import { useAuthStore } from "@/stores/authStore";

const DefenseLatticeScene = lazy(() =>
  import("@/components/DefenseLatticeScene").then((module) => ({
    default: module.DefenseLatticeScene
  }))
);

export function LoginPage() {
  const [email, setEmail] = useState("admin@sentinel.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  if (token) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const session = await platformApi.login(email, password);
      setSession(session.token, { name: session.name, email: session.email });
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", {
        replace: true
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#02050a] text-white lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 p-12 lg:flex xl:p-16">
        <div className="pointer-events-none absolute inset-0">
          <ReconstructionCanvas progress={0.58} />
          <div className="absolute inset-0 opacity-85 [mask-image:radial-gradient(circle_at_58%_58%,black_5%,rgba(0,0,0,.92)_42%,transparent_78%)]">
            <Suspense fallback={null}>
              <DefenseLatticeScene progress={0.72} />
            </Suspense>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,5,10,.1),rgba(2,5,10,.22)_48%,rgba(2,5,10,.86))]" />
          <div className="onboarding-security-grid absolute inset-0" />
          <div className="onboarding-signal-noise absolute inset-0" />
        </div>
        <Link to="/onboarding" className="relative z-10 flex items-center gap-3">
          <BrandLogo className="size-10" />
          <span>
            <strong className="block text-sm tracking-[0.22em]">ANVIL</strong>
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/45">
              Adaptive web defense
            </span>
          </span>
        </Link>
        <div className="relative z-10 max-w-xl pb-10">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-100/65">
            Operator console
          </p>
          <h1 className="mt-5 text-[clamp(2.65rem,3.7vw,4.2rem)] font-black leading-[0.96] tracking-[-0.055em]">
            검증 결과를 확인하고
            <br />
            적용 여부를 결정하세요.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-white/58">
            탐지된 공격, 우회 테스트, 오탐 지표와 배포 이력을 한곳에서 확인할 수 있습니다. 실제
            차단은 관리자의 승인 후에만 시작됩니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-2">
            {["LIVE TRAFFIC", "AI VALIDATION", "WAF DELIVERY"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 font-mono text-[8px] tracking-[0.17em] text-white/55 backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <span className="relative size-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(125,225,255,.9)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-cyan-200/40" />
          </span>
          Security pipeline ready
        </div>
      </section>
      <section className="relative grid min-h-screen place-items-center px-5 py-10 sm:px-10 lg:bg-[#070b12]/80 lg:backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(83,120,255,.12),transparent_38%)] lg:hidden" />
        <div className="relative w-full max-w-[430px]">
          <Link
            to="/onboarding"
            className="mb-12 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> 온보딩으로 돌아가기
          </Link>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo className="size-11" />
            <strong className="tracking-[0.2em]">ANVIL</strong>
          </div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em] text-cyan-100/55">
            Secure access
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em]">관리자 로그인</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">
            보호 서비스와 방어 룰을 관리하려면 로그인하세요.
          </p>
          <form
            className="mt-9 space-y-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_30px_90px_rgba(0,0,0,.32)] backdrop-blur sm:p-6"
            onSubmit={handleSubmit}
          >
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-white/65">이메일</span>
              <span className="flex items-center rounded-lg border border-white/10 bg-black/20 px-3 transition focus-within:border-cyan-200/45 focus-within:bg-black/30">
                <Mail className="size-4 text-white/35" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-white/65">비밀번호</span>
              <span className="flex items-center rounded-lg border border-white/10 bg-black/20 px-3 transition focus-within:border-cyan-200/45 focus-within:bg-black/30">
                <LockKeyhole className="size-4 text-white/35" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"
                  required
                />
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-md bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3.5 text-sm font-bold text-[#07101b] transition hover:bg-cyan-50 disabled:opacity-50"
            >
              <ShieldCheck className="size-4" />
              {submitting ? "로그인 중..." : "ANVIL 콘솔 열기"}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>
          <div className="mt-5 flex items-center justify-between rounded-lg border border-white/[0.07] px-4 py-3 text-xs text-white/38">
            <span>데모 계정</span>
            <span className="font-mono text-white/55">admin@sentinel.local · demo1234</span>
          </div>
        </div>
      </section>
    </main>
  );
}
