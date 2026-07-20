import { useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Circle,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Orbit,
  RotateCcw,
  Store,
  X
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { demoSteps, useDemoFlowStore } from "@/stores/demoFlowStore";

const routeNames: Record<string, string> = {
  dashboard: "대시보드",
  services: "서비스 연결",
  logs: "실시간 요청",
  rules: "방어 룰",
  insights: "AI 검증",
  validation: "AI 우회 검증",
  reports: "AI 설명",
  deployments: "배포"
};

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const step = useDemoFlowStore((state) => state.step);
  const resetFlow = useDemoFlowStore((state) => state.reset);
  const section = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const currentIndex = Math.min(step, demoSteps.length - 1);

  function restartDemo() {
    resetFlow();
    clearSession();
    navigate("/onboarding", { replace: true });
  }

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  const sidebar = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setMenuOpen(false)}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-[#5865f2]">
            <Orbit className="size-4" />
          </span>
          <span>
            <strong className="block text-sm text-white">Aegis Loop</strong>
            <span className="text-[10px] text-[#6d6f78]">Demo workspace</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="p-2 text-[#949ba4] lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <X className="size-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <NavLink
          to="/dashboard"
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `mb-5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white"}`
          }
        >
          <LayoutDashboard className="size-4" />
          대시보드
        </NavLink>
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#6d6f78]">
          방어 루프
        </p>
        <ol className="space-y-1">
          {demoSteps.map((item, index) => {
            const unlocked = index <= step;
            const done = index < step || step === demoSteps.length;
            const active =
              item.path === "/logs"
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
            const content = (
              <>
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#6d6f78]"}`}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : unlocked ? (
                    <Circle className="size-2.5 fill-current" />
                  ) : (
                    <Lock className="size-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="size-3.5" />}
              </>
            );
            return (
              <li key={item.id}>
                {unlocked ? (
                  <Link
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm ${active ? "bg-[#404249] text-white" : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white"}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className="flex cursor-not-allowed items-center gap-3 px-2.5 py-2.5 text-sm text-[#5c5e66]"
                    title="이전 단계를 먼저 완료하세요"
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <Link
          to="/demo-shop"
          className="mb-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#b5bac1] hover:bg-[#35373c] hover:text-white"
        >
          <Store className="size-4" />
          Demo Shop 열기
        </Link>
        <button
          type="button"
          onClick={restartDemo}
          className="mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#b5bac1] hover:bg-[#35373c] hover:text-white"
        >
          <RotateCcw className="size-4" />
          데모 처음부터
        </button>
        <div className="flex items-center gap-3 rounded-md bg-[#1e1f22] p-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-[#5865f2] text-xs font-bold">
            AD
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {admin?.name ?? "보안 관리자"}
            </p>
            <p className="truncate text-[10px] text-[#6d6f78]">{admin?.email}</p>
          </div>
          <button
            type="button"
            aria-label="로그아웃"
            onClick={logout}
            className="p-2 text-[#6d6f78] hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1]">
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#2b2d31] transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar}
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#1e1f22]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              className="p-2 text-[#b5bac1] lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-white">{routeNames[section] ?? section}</p>
              <p className="hidden text-[10px] text-[#6d6f78] sm:block">
                Demo Shop · 보호 워크스페이스
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-[#b5bac1]">
                {step >= demoSteps.length
                  ? "방어 루프 완료"
                  : `${step + 1} / ${demoSteps.length} · ${demoSteps[currentIndex].label}`}
              </p>
              <div className="mt-1 h-1 w-36 overflow-hidden rounded-full bg-[#2b2d31]">
                <div
                  className="h-full bg-[#5865f2]"
                  style={{ width: `${Math.max(8, (step / demoSteps.length) * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              aria-label="알림"
              className="rounded-md bg-[#2b2d31] p-2.5 text-[#949ba4] hover:text-white"
            >
              <Bell className="size-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-7 pb-24 sm:px-6 lg:py-9">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-xl border border-white/10 bg-[#2b2d31]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        <Link
          to="/dashboard"
          className="flex flex-col items-center gap-1 rounded-md px-3 py-2 text-[10px] text-[#b5bac1]"
        >
          <LayoutDashboard className="size-4" />
          대시보드
        </Link>
        {demoSteps.slice(Math.max(0, currentIndex - 1), currentIndex + 2).map((item, index) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex flex-col items-center gap-1 rounded-md px-3 py-2 text-[10px] ${item.id === demoSteps[currentIndex].id ? "bg-[#5865f2] text-white" : "text-[#b5bac1]"}`}
          >
            <span className="font-bold">{Math.max(0, currentIndex - 1) + index + 1}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
