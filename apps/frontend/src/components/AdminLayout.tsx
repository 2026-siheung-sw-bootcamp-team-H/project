import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  RadioTower,
  Rocket,
  Server,
  ShieldCheck,
  Store,
  Wifi,
  X
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { formatDate } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useAuthStore } from "@/stores/authStore";
import { useServiceStore } from "@/stores/serviceStore";

const navItems = [
  { path: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { path: "/services", label: "보호 서비스", icon: Server },
  { path: "/logs", label: "실시간 요청", icon: RadioTower },
  { path: "/rules", label: "방어 룰", icon: ShieldCheck },
  { path: "/insights", label: "검증 결과", icon: FileSearch },
  { path: "/deployments", label: "배포 관리", icon: Rocket }
] as const;

const routeNames: Record<string, string> = {
  dashboard: "대시보드",
  services: "보호 서비스",
  logs: "실시간 요청",
  rules: "방어 룰",
  insights: "검증 결과",
  validation: "룰 검증",
  reports: "검증 리포트",
  deployments: "배포 관리"
};

function serviceDomain(value?: string) {
  if (!value) return "보호 서비스 미선택";
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function requestActivity(lastRequestAt?: string) {
  if (!lastRequestAt) return { label: "수집된 요청 없음", active: false, detail: "—" };
  const elapsed = Date.now() - new Date(lastRequestAt).getTime();
  return elapsed <= 60_000
    ? { label: "요청 수집 중", active: true, detail: "최근 1분" }
    : { label: "최근 요청", active: false, detail: formatDate(lastRequestAt) };
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const selectedServiceId = useServiceStore((state) => state.selectedServiceId);
  const selectService = useServiceStore((state) => state.selectService);
  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: platformApi.getServices,
    refetchInterval: 15_000
  });
  const systemStatusQuery = useQuery({
    queryKey: ["system-status"],
    queryFn: platformApi.getSystemStatus,
    refetchInterval: 30_000
  });
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const selectedService =
    services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
  const section = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const ingest = requestActivity(selectedService?.lastRequestAt);
  const infrastructureHealthy = Boolean(
    systemStatusQuery.data?.backend.available &&
      systemStatusQuery.data.zap.available &&
      systemStatusQuery.data.search.available
  );
  const serviceHealthy = selectedService?.status === "connected";
  const allHealthy = infrastructureHealthy && serviceHealthy;
  const systemLabel = systemStatusQuery.isLoading
    ? "시스템 상태 확인 중"
    : allHealthy
      ? "시스템 정상"
      : "확인 필요한 항목 있음";

  useEffect(() => {
    if (services.length === 0) {
      if (selectedServiceId) selectService(null);
      return;
    }
    if (!services.some((service) => service.id === selectedServiceId)) {
      selectService(services[0].id);
    }
  }, [selectService, selectedServiceId, services]);

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-[#273244] px-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setMenuOpen(false)}
        >
          <BrandLogo className="size-9" />
          <span>
            <strong className="block text-sm tracking-[0.2em] text-white">ANVIL</strong>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#64748b]">
              Security operations
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="p-2 text-[#9ca3af] lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <X className="size-4" />
        </button>
      </div>
      <label className="mx-3 mt-3 block">
        <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#64748b]">
          Protected asset
        </span>
        <select
          value={selectedService?.id ?? ""}
          onChange={(event) => selectService(event.target.value || null)}
          disabled={servicesQuery.isLoading || services.length === 0}
          className="h-10 w-full rounded-md border border-[#273244] bg-[#0b0f19] px-3 text-xs font-semibold text-[#e5e7eb] outline-none focus:border-[#6366f1] disabled:text-[#64748b]"
        >
          {services.length === 0 && <option value="">등록된 서비스 없음</option>}
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      <nav className="flex-1 overflow-y-auto p-3 pt-5">
        <p className="mb-2 px-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#64748b]">
          Security operations
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#1f2937] text-white before:absolute before:-left-3 before:h-6 before:w-0.5 before:bg-[#6366f1]"
                      : "text-[#9ca3af] hover:bg-[#182131] hover:text-white"
                  }`
                }
              >
                <Icon className="size-4 text-[#64748b] group-hover:text-[#a5b4fc]" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-[#273244] p-3">
        <div
          className={`mb-2 flex items-center justify-between rounded border px-3 py-2 font-mono text-[10px] ${ingest.active ? "border-[#10b981]/20 bg-[#10b981]/[0.06] text-[#6ee7b7]" : "border-[#273244] bg-[#0b0f19] text-[#9ca3af]"}`}
        >
          <span className="flex items-center gap-2">
            <Wifi className="size-3" />
            {ingest.label}
          </span>
          <span>{ingest.detail}</span>
        </div>
        {selectedService?.slug === "demo-shop" ? (
          <Link
            to="/demo-shop"
            className="mb-2 flex items-center gap-3 rounded px-3 py-2.5 text-sm text-[#9ca3af] hover:bg-[#1f2937] hover:text-white"
          >
            <Store className="size-4" /> {selectedService.name} 열기
          </Link>
        ) : selectedService ? (
          <a
            href={selectedService.publicDomain}
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-3 rounded px-3 py-2.5 text-sm text-[#9ca3af] hover:bg-[#1f2937] hover:text-white"
          >
            <Store className="size-4" /> {selectedService.name} 열기
          </a>
        ) : null}
        <div className="flex items-center gap-3 rounded-md border border-[#273244] bg-[#0b0f19] p-2.5">
          <span className="grid size-8 place-items-center rounded bg-[#1f2937] text-xs font-bold text-[#a5b4fc]">
            AD
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {admin?.name ?? "보안 관리자"}
            </p>
            <p className="truncate text-[10px] text-[#64748b]">{admin?.email}</p>
          </div>
          <button
            type="button"
            aria-label="로그아웃"
            onClick={logout}
            className="p-2 text-[#64748b] hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-ambient min-h-screen text-[#f9fafb]">
      <div className="admin-grid" />
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#273244] bg-[#0d1420] transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar}
      </aside>
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#273244] bg-[#0b0f19]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              className="p-2 text-[#d1d5db] lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-white">{routeNames[section] ?? section}</p>
              <p className="hidden font-mono text-[9px] uppercase tracking-wider text-[#64748b] sm:block">
                {serviceDomain(selectedService?.publicDomain)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative hidden sm:block">
              <span className="sr-only">보호 서비스 선택</span>
              <select
                value={selectedService?.id ?? ""}
                onChange={(event) => selectService(event.target.value || null)}
                disabled={servicesQuery.isLoading || services.length === 0}
                className="h-9 max-w-56 rounded border border-[#273244] bg-[#111827] px-3 pr-8 text-xs font-semibold text-[#e5e7eb] outline-none focus:border-[#6366f1] disabled:text-[#64748b]"
              >
                {services.length === 0 && <option value="">등록된 서비스 없음</option>}
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <details className="group relative">
              <summary
                aria-label={systemLabel}
                className={`flex cursor-pointer list-none items-center gap-2 rounded-md border bg-[#111827] px-3 py-2 text-xs font-semibold [&::-webkit-details-marker]:hidden ${allHealthy ? "border-[#10b981]/25 text-[#a7f3d0]" : "border-[#f59e0b]/30 text-[#fde68a]"}`}
              >
                <span
                  className={`size-1.5 rounded-full ${allHealthy ? "bg-[#10b981]" : "bg-[#f59e0b]"}`}
                />
                <span className="hidden md:inline">{systemLabel}</span>
                <Activity className="size-4 md:hidden" />
              </summary>
              <div className="absolute right-0 top-12 z-50 w-80 rounded-md border border-[#273244] bg-[#0d1420] p-4 shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-[#273244] pb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">시스템 상태</p>
                    <p className="mt-1 text-[10px] text-[#64748b]">30초마다 자동 확인</p>
                  </div>
                  {allHealthy ? (
                    <CheckCircle2 className="size-4 text-[#6ee7b7]" />
                  ) : (
                    <AlertTriangle className="size-4 text-[#fcd34d]" />
                  )}
                </div>
                <dl className="mt-3 space-y-3 text-xs">
                  {[
                    {
                      label: "Backend",
                      ok: systemStatusQuery.data?.backend.available,
                      detail: systemStatusQuery.data?.backend.detail ?? "확인 중"
                    },
                    {
                      label: "ZAP",
                      ok: systemStatusQuery.data?.zap.available,
                      detail: systemStatusQuery.data?.zap.detail ?? "확인 중"
                    },
                    {
                      label: "검색 엔진",
                      ok: systemStatusQuery.data?.search.available,
                      detail: systemStatusQuery.data?.search.detail ?? "확인 중"
                    },
                    {
                      label: "AI",
                      ok: systemStatusQuery.data?.ai.available,
                      detail: systemStatusQuery.data?.ai.detail ?? "확인 중"
                    },
                    {
                      label: "보호 서비스",
                      ok: serviceHealthy,
                      detail: selectedService
                        ? selectedService.status === "connected"
                          ? "연결됨"
                          : "연결 확인 필요"
                        : "미등록"
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[82px_1fr_auto] items-center gap-2"
                    >
                      <dt className="text-[#9ca3af]">{item.label}</dt>
                      <dd className="truncate text-[#d1d5db]">{item.detail}</dd>
                      <span
                        className={`size-1.5 rounded-full ${item.ok ? "bg-[#10b981]" : "bg-[#f59e0b]"}`}
                      />
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-lg border border-[#273244] bg-[#111827]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 rounded px-2 py-2 text-[10px] ${active ? "bg-[#6366f1] text-white" : "text-[#9ca3af]"}`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
