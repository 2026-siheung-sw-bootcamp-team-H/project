import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Orbit, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { platformApi } from "@/services/platformApi";
import { useAuthStore } from "@/stores/authStore";

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
    <main className="grid min-h-screen bg-[#111214] text-white lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#5865f2] p-12 lg:flex xl:p-16">
        <Link to="/onboarding" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/15">
            <Orbit className="size-5" />
          </span>
          <strong>Aegis Loop</strong>
        </Link>
        <div className="relative z-10 max-w-lg">
          <p className="text-sm font-semibold text-indigo-100">Operator console</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.05em]">
            방어의 마지막 결정은
            <br />
            관리자가 합니다.
          </h1>
          <p className="mt-6 text-base leading-7 text-indigo-100">
            AI는 우회 공격을 만들고 룰을 보강하지만, 운영 환경에 적용하는 결정은 항상 관리자가 검증
            근거를 확인한 뒤 내립니다.
          </p>
        </div>
        <p className="text-xs text-indigo-200">Aegis Loop · Adaptive web defense</p>
      </section>
      <section className="grid place-items-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <Link
            to="/onboarding"
            className="mb-10 inline-flex items-center gap-2 text-sm text-[#949ba4] hover:text-white"
          >
            <ArrowLeft className="size-4" /> 온보딩으로 돌아가기
          </Link>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-lg bg-[#5865f2]">
              <Orbit className="size-5" />
            </span>
            <strong>Aegis Loop</strong>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">관리자 로그인</h2>
          <p className="mt-2 text-sm text-[#949ba4]">데모 계정이 미리 입력되어 있습니다.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase text-[#b5bac1]">
                이메일
              </span>
              <span className="flex items-center rounded-md bg-[#1e1f22] px-3 ring-1 ring-white/[0.06] focus-within:ring-[#5865f2]">
                <Mail className="size-4 text-[#6d6f78]" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase text-[#b5bac1]">
                비밀번호
              </span>
              <span className="flex items-center rounded-md bg-[#1e1f22] px-3 ring-1 ring-white/[0.06] focus-within:ring-[#5865f2]">
                <LockKeyhole className="size-4 text-[#6d6f78]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent px-3 py-3 text-sm outline-none"
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
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#5865f2] px-4 py-3 text-sm font-semibold hover:bg-[#4752c4] disabled:opacity-50"
            >
              <ShieldCheck className="size-4" />
              {submitting ? "확인 중..." : "방어 콘솔 시작"}
              <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="mt-5 rounded-md bg-[#1e1f22] p-4 text-xs text-[#949ba4]">
            <p className="font-semibold text-[#dbdee1]">데모 계정</p>
            <p className="mt-2 font-mono">admin@sentinel.local · demo1234</p>
          </div>
        </div>
      </section>
    </main>
  );
}
