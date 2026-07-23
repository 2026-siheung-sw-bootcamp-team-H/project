import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Filter, Radio, RefreshCw, Search, ShieldCheck, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonPrimary, buttonSecondary, formatDate } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { shopApi } from "@/services/shopApi";
import { useServiceStore } from "@/stores/serviceStore";
import type { AttackCategory, EnforcementAction, TrafficClassification } from "@/types/domain";

const attackTests: Record<AttackCategory, { label: string; payload: string }> = {
  SQL_INJECTION: {
    label: "SQL 삽입",
    payload:
      "%252555%25254e%252549%25254f%25254e%25252f%25252a%25252a%25252f%252553%252545%25254c%252545%252543%252554"
  },
  XSS: { label: "XSS", payload: '<svg onload="alert(1)">' },
  PATH_TRAVERSAL: { label: "경로 탐색", payload: "../../../../etc/passwd" }
};

type ClassificationFilter = "all" | TrafficClassification;
type ActionFilter = "all" | EnforcementAction;
type SourceFilter = "all" | "real" | "simulation" | "telemetry";

const severityBorder: Record<TrafficClassification, string> = {
  attack: "border-l-[#ef4444]",
  suspicious: "border-l-[#f59e0b]",
  unknown: "border-l-[#64748b]",
  normal: "border-l-[#10b981]"
};

export function LogsPage() {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<ClassificationFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [attackCategory, setAttackCategory] = useState<AttackCategory>("SQL_INJECTION");
  const serviceId = useServiceStore((state) => state.selectedServiceId);
  const queryClient = useQueryClient();
  const servicesQuery = useQuery({ queryKey: ["services"], queryFn: platformApi.getServices });
  const selectedService = servicesQuery.data?.find((service) => service.id === serviceId);
  const canRunDemoAttack = selectedService?.slug === "demo-shop";
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["logs", serviceId],
    queryFn: () => platformApi.getLogs(serviceId ?? undefined),
    enabled: Boolean(serviceId),
    refetchInterval: 5000
  });
  const attack = useMutation({
    mutationFn: () =>
      shopApi.runAttackSimulation(attackCategory, attackTests[attackCategory].payload),
    onSuccess: async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["logs", serviceId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", serviceId] })
      ])
  });

  const filtered = useMemo(
    () =>
      (data ?? []).filter((log) => {
        const text =
          `${log.method} ${log.path} ${log.ip} ${log.attackCategory ?? ""}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (classification === "all" || log.classification === classification) &&
          (actionFilter === "all" || log.action === actionFilter) &&
          (sourceFilter === "all" || log.source === sourceFilter)
        );
      }),
    [actionFilter, classification, data, query, sourceFilter]
  );

  if (servicesQuery.isLoading || (servicesQuery.data?.length && !serviceId)) {
    return <LoadingState label="보호 서비스 요청을 불러오는 중입니다." />;
  }
  if (!serviceId) return <EmptyState label="먼저 보호 서비스를 등록해 주세요." />;
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="실시간 요청 로그를 불러오지 못했습니다." />;
  const generatedId = attack.data?.requestId;
  const blockedByWaf = attack.data?.blocked === true && !generatedId;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live traffic explorer"
        title="요청 로그 탐색"
        description="검색과 필터로 정상·의심·공격 요청 및 WAF 처리 결과를 조사합니다. 데이터는 5초마다 갱신됩니다."
        actions={
          <>
            {canRunDemoAttack && (
              <>
                <label>
                  <span className="sr-only">모의 공격 유형</span>
                  <select
                    value={attackCategory}
                    onChange={(event) => setAttackCategory(event.target.value as AttackCategory)}
                    disabled={attack.isPending}
                    className="min-h-10 rounded-md border border-[#273244] bg-[#111827] px-3 text-sm font-semibold text-[#d1d5db] focus:border-[#6366f1]"
                  >
                    {Object.entries(attackTests).map(([category, test]) => (
                      <option key={category} value={category}>
                        {test.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => attack.mutate()}
                  disabled={attack.isPending}
                  className={buttonPrimary}
                >
                  <Swords className="size-4" />
                  {attack.isPending
                    ? "전송 중..."
                    : `${attackTests[attackCategory].label} 공격 테스트`}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={buttonSecondary}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </>
        }
      />

      {generatedId && (
        <section className="security-panel flex flex-col gap-4 rounded-md border-l-2 border-l-[#ef4444] p-4 md:flex-row md:items-center">
          <span className="relative grid size-10 shrink-0 place-items-center rounded bg-[#ef4444]/10 text-[#fca5a5]">
            <Radio className="size-5" />
            <span className="absolute -right-1 -top-1 size-2.5 animate-pulse rounded-full bg-[#ef4444]" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">새 공격 이벤트가 수집되었습니다.</p>
            <p className="mt-1 font-mono text-[10px] text-[#64748b]">EVENT {generatedId}</p>
          </div>
          <Link to={`/logs/${generatedId}`} className={buttonPrimary}>
            이벤트 조사
            <ArrowRight className="size-4" />
          </Link>
        </section>
      )}
      {blockedByWaf && (
        <section className="security-panel flex items-center gap-4 rounded-md border-l-2 border-l-[#10b981] p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded bg-[#10b981]/10 text-[#6ee7b7]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              Active 룰이 공격 요청을 차단했습니다.
            </p>
            <p className="mt-1 text-xs text-[#9ca3af]">
              WAF가 백엔드 도달 전에 HTTP 403으로 응답했습니다. 수집 로그는 잠시 후 갱신됩니다.
            </p>
          </div>
        </section>
      )}
      {attack.isError && <ErrorState message={attack.error.message} />}

      <section className="security-panel rounded-md">
        <div className="grid gap-3 border-b border-[#273244] p-4 lg:grid-cols-[minmax(240px,1fr)_160px_160px_160px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="경로, IP fingerprint, 공격 유형 검색"
              className="h-10 w-full rounded border border-[#273244] bg-[#0b0f19] pl-10 pr-3 font-mono text-xs text-white placeholder:text-[#4b5563] focus:border-[#6366f1]"
            />
          </label>
          <label>
            <span className="sr-only">요청 출처 필터</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="h-10 w-full appearance-none rounded border border-[#273244] bg-[#0b0f19] px-3 text-xs text-[#d1d5db] focus:border-[#6366f1]"
            >
              <option value="all">모든 요청 출처</option>
              <option value="real">실제 요청</option>
              <option value="simulation">모의 공격</option>
              <option value="telemetry">수집 지표</option>
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">위험도 필터</span>
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value as ClassificationFilter)}
              className="h-10 w-full appearance-none rounded border border-[#273244] bg-[#0b0f19] px-3 text-xs text-[#d1d5db] focus:border-[#6366f1]"
            >
              <option value="all">모든 위험도</option>
              <option value="attack">공격</option>
              <option value="suspicious">의심</option>
              <option value="normal">정상</option>
              <option value="unknown">미분류</option>
            </select>
          </label>
          <label>
            <span className="sr-only">처리 결과 필터</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
              className="h-10 w-full appearance-none rounded border border-[#273244] bg-[#0b0f19] px-3 text-xs text-[#d1d5db] focus:border-[#6366f1]"
            >
              <option value="all">모든 처리 결과</option>
              <option value="allowed">ALLOW</option>
              <option value="blocked">BLOCK</option>
              <option value="monitored">MONITOR</option>
            </select>
          </label>
          <div className="flex items-center justify-end gap-2 px-2 font-mono text-[10px] text-[#6ee7b7]">
            <Filter className="size-3.5" />
            {filtered.length} / {data.length} EVENTS
          </div>
        </div>

        <div className="hidden grid-cols-[116px_74px_minmax(280px,1fr)_130px_110px_92px_24px] gap-3 border-b border-[#273244] bg-[#0d1420] px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748b] lg:grid">
          <span>Timestamp</span>
          <span>Method</span>
          <span>Request</span>
          <span>Category</span>
          <span>Severity</span>
          <span>Action</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <EmptyState label="현재 필터에 일치하는 요청이 없습니다." />
        ) : (
          <div>
            {filtered.map((log) => (
              <Link
                key={log.id}
                to={`/logs/${log.id}`}
                className={`security-table-row grid gap-3 border-l-2 px-5 py-3.5 lg:grid-cols-[116px_74px_minmax(280px,1fr)_130px_110px_92px_24px] lg:items-center ${severityBorder[log.classification]} ${generatedId === log.id ? "bg-[#ef4444]/[0.04]" : ""}`}
              >
                <span className="font-mono text-[10px] text-[#64748b]">
                  {formatDate(log.occurredAt)}
                </span>
                <span className="font-mono text-xs font-bold text-[#d1d5db]">{log.method}</span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-mono text-xs text-[#f3f4f6]">{log.path}</p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${log.source === "simulation" ? "bg-amber-400/10 text-amber-300" : log.source === "telemetry" ? "bg-sky-400/10 text-sky-300" : "bg-emerald-400/10 text-emerald-300"}`}
                    >
                      {log.source === "simulation"
                        ? "모의 공격"
                        : log.source === "telemetry"
                          ? "Telemetry"
                          : "실제 요청"}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-[#64748b]">
                    {log.ip} · HTTP {log.statusCode || "—"}
                  </p>
                </div>
                <span className="truncate font-mono text-[10px] text-[#9ca3af]">
                  {log.attackCategory?.replaceAll("_", " ") ?? "—"}
                </span>
                <StatusBadge status={log.classification} />
                <StatusBadge status={log.action} />
                <ArrowRight className="size-4 text-[#4b5563]" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
