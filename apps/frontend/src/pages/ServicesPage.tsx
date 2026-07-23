import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Globe2,
  Pause,
  Play,
  Radar,
  Server,
  ShieldCheck,
  Store
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatDate } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";

const emptyForm = {
  name: "",
  publicDomain: "",
  originUrl: "",
  proxyUrl: ""
};

export function ServicesPage() {
  const [form, setForm] = useState(emptyForm);
  const [showRegistration, setShowRegistration] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedServiceId = useServiceStore((state) => state.selectedServiceId);
  const selectService = useServiceStore((state) => state.selectService);
  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: platformApi.getServices
  });
  const services = servicesQuery.data ?? [];
  const service =
    services.find((item) => item.id === searchParams.get("serviceId")) ??
    services.find((item) => item.id === selectedServiceId) ??
    services[0] ??
    null;

  useEffect(() => {
    if (service && service.id !== selectedServiceId) selectService(service.id);
  }, [selectService, selectedServiceId, service]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["services"] }),
      queryClient.invalidateQueries({ queryKey: ["service"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    ]);
  };

  const register = useMutation({
    mutationFn: async () => {
      const created = await platformApi.createService({
        name: form.name.trim(),
        publicDomain: form.publicDomain.trim(),
        originUrl: form.originUrl.trim(),
        ...(form.proxyUrl.trim() ? { proxyUrl: form.proxyUrl.trim() } : {}),
        connection: "Nginx + ModSecurity"
      });
      return platformApi.testServiceConnection(created.id);
    },
    onSuccess: async (result) => {
      setShowRegistration(false);
      setForm(emptyForm);
      selectService(result.serviceId);
      setSearchParams({ serviceId: result.serviceId });
      await refresh();
    }
  });

  const connection = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error("연결을 확인할 서비스를 선택해 주세요.");
      return service.status === "disabled"
        ? platformApi.resumeService(service.id)
        : platformApi.testServiceConnection(service.id);
    },
    onSuccess: refresh
  });

  const disable = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error("중지할 서비스를 선택해 주세요.");
      return platformApi.updateServiceStatus(service.id, "DISABLED");
    },
    onSuccess: refresh
  });

  const initialScan = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error("진단할 서비스를 선택해 주세요.");
      return platformApi.startInitialScan(service.id);
    },
    onSuccess: ({ scan }) => {
      void refresh();
      navigate(`/scans/${scan.id}`);
    }
  });

  if (servicesQuery.isLoading) return <LoadingState />;
  if (servicesQuery.isError)
    return <ErrorState message="보호 서비스 목록을 불러오지 못했습니다." />;

  if (!service || showRegistration) {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="Protected service"
          title={service ? "새 보호 서비스 등록" : "보호할 서비스를 등록하세요"}
          description="서비스를 저장한 뒤 실제 연결 상태를 자동 확인합니다. 연결이 확인돼야 초기 보안 진단을 시작할 수 있습니다."
          actions={
            service ? (
              <button
                type="button"
                onClick={() => setShowRegistration(false)}
                className={buttonSecondary}
              >
                등록 취소
              </button>
            ) : undefined
          }
        />
        {register.isError && <ErrorState message={register.error.message} />}
        <form
          className="security-panel mx-auto max-w-3xl rounded-md p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold text-[#9ca3af]">서비스 이름</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="예: 회사 쇼핑몰"
                className="w-full rounded border border-[#273244] bg-[#0b0f19] px-4 py-3 text-sm text-white outline-none focus:border-[#6366f1]"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold text-[#9ca3af]">
                사용자 접속 주소
              </span>
              <input
                required
                type="url"
                value={form.publicDomain}
                onChange={(event) =>
                  setForm((current) => ({ ...current, publicDomain: event.target.value }))
                }
                placeholder="https://shop.example.com"
                className="w-full rounded border border-[#273244] bg-[#0b0f19] px-4 py-3 text-sm text-white outline-none focus:border-[#6366f1]"
              />
              <span className="mt-2 block text-[11px] text-[#64748b]">
                고객이 브라우저에서 보는 주소
              </span>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold text-[#9ca3af]">
                원본 서버 주소
              </span>
              <input
                required
                type="url"
                value={form.originUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, originUrl: event.target.value }))
                }
                placeholder="https://origin.example.com"
                className="w-full rounded border border-[#273244] bg-[#0b0f19] px-4 py-3 text-sm text-white outline-none focus:border-[#6366f1]"
              />
              <span className="mt-2 block text-[11px] text-[#64748b]">
                WAF를 거치기 전 실제 서비스 주소
              </span>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold text-[#9ca3af]">
                보호 프록시 주소 · 선택
              </span>
              <input
                type="url"
                value={form.proxyUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, proxyUrl: event.target.value }))
                }
                placeholder="https://waf.example.com"
                className="w-full rounded border border-[#273244] bg-[#0b0f19] px-4 py-3 text-sm text-white outline-none focus:border-[#6366f1]"
              />
              <span className="mt-2 block text-[11px] text-[#64748b]">
                입력하면 연결 확인과 진단이 이 주소를 우선 사용합니다.
              </span>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={register.isPending} className={buttonPrimary}>
              <ShieldCheck className="size-4" />
              {register.isPending ? "등록 및 연결 확인 중..." : "서비스 등록 및 연결 확인"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  const isDemoShop = service.slug === "demo-shop";
  const pendingError = connection.error ?? initialScan.error ?? disable.error;
  const primaryAction =
    service.status === "connected"
      ? {
          label: initialScan.isPending ? "진단 준비 중..." : "초기 보안 진단 시작",
          icon: Radar,
          onClick: () => initialScan.mutate(),
          pending: initialScan.isPending
        }
      : {
          label:
            service.status === "disabled"
              ? connection.isPending
                ? "보호 다시 시작 중..."
                : "보호 다시 시작"
              : connection.isPending
                ? "연결 확인 중..."
                : "서비스 연결 확인",
          icon: service.status === "disabled" ? Play : ArrowRight,
          onClick: () => connection.mutate(),
          pending: connection.isPending
        };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Protected service"
        title={`${service.name} 연결 상태`}
        description="등록된 서비스의 연결과 진단 상태를 관리합니다. 초기 진단은 연결이 확인된 서비스에서만 실행됩니다."
        actions={
          <>
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.pending}
              className={buttonPrimary}
            >
              <PrimaryIcon className="size-4" />
              {primaryAction.label}
            </button>
            {isDemoShop && (
              <Link to="/demo-shop" className={buttonSecondary}>
                <Store className="size-4" /> Demo Shop 열기
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              className={buttonSecondary}
            >
              새 서비스 등록
            </button>
          </>
        }
      />

      {services.length > 1 && (
        <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="보호 서비스 선택">
          {services.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                selectService(item.id);
                setSearchParams({ serviceId: item.id });
              }}
              className={`flex items-center justify-between rounded-md border p-4 text-left ${item.id === service.id ? "border-[#6366f1]/50 bg-[#6366f1]/10" : "border-[#273244] bg-[#111827] hover:border-[#374151]"}`}
            >
              <span>
                <span className="block text-sm font-semibold text-white">{item.name}</span>
                <span className="mt-1 block truncate font-mono text-[10px] text-[#64748b]">
                  {item.publicDomain}
                </span>
              </span>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </nav>
      )}

      {connection.isSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm text-emerald-200">
          <Check className="size-4" /> 연결 확인 완료 · HTTP {connection.data.statusCode ?? "-"} ·{" "}
          {connection.data.latencyMs}ms
        </div>
      )}
      {pendingError && <ErrorState message={pendingError.message} />}

      <section className="security-panel rounded-md p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">실제 요청 경로</h2>
            <p className="mt-1 text-xs text-[#9ca3af]">
              사용자 주소와 원본 서버 사이의 보호 경로입니다.
            </p>
          </div>
          <StatusBadge status={service.status} />
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {[
            {
              icon: Globe2,
              label: "사용자 접속 주소",
              value: service.publicDomain,
              note: "고객이 보는 주소"
            },
            {
              icon: ShieldCheck,
              label: "보안 관문",
              value: service.proxyUrl ?? "연결된 보호 프록시 없음",
              note: service.connection
            },
            {
              icon: Server,
              label: "원본 서비스",
              value: service.originUrl,
              note: "통과한 요청의 목적지"
            }
          ].map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.label} className="contents">
                <article
                  className={`rounded-md border p-5 ${index === 1 ? "border-[#6366f1]/40 bg-[#6366f1]/10" : "border-[#273244] bg-[#0b0f19]"}`}
                >
                  <Icon className={`size-5 ${index === 1 ? "text-[#a5b4fc]" : "text-[#9ca3af]"}`} />
                  <p className="mt-6 text-xs text-[#9ca3af]">{node.label}</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                    {node.value}
                  </p>
                  <p className="mt-2 text-xs text-[#64748b]">{node.note}</p>
                </article>
                {index < 2 && (
                  <ArrowRight className="mx-auto size-4 rotate-90 text-[#64748b] lg:rotate-0" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="security-panel rounded-md border-l-2 border-l-[#10b981] p-5">
          <p className="font-mono text-[10px] text-[#64748b]">CONNECTION</p>
          <p className="mt-2 font-semibold text-white">
            {service.status === "connected" ? "정상 연결" : service.status}
          </p>
        </article>
        <article className="security-panel rounded-md border-l-2 border-l-[#6366f1] p-5">
          <p className="font-mono text-[10px] text-[#64748b]">SECURITY SCANS</p>
          <p className="mt-2 font-semibold text-white">{service.scanCount}회</p>
        </article>
        <article className="security-panel rounded-md border-l-2 border-l-[#38bdf8] p-5">
          <p className="font-mono text-[10px] text-[#64748b]">LAST REQUEST</p>
          <p className="mt-2 font-semibold text-white">
            {service.lastRequestAt ? formatDate(service.lastRequestAt) : "아직 없음"}
          </p>
        </article>
      </section>

      <div className="flex justify-end">
        {service.status !== "disabled" && (
          <button
            type="button"
            onClick={() => disable.mutate()}
            disabled={disable.isPending}
            className={buttonSecondary}
          >
            <Pause className="size-4" /> {disable.isPending ? "보호 중지 중..." : "보호 일시 중지"}
          </button>
        )}
      </div>
    </div>
  );
}
