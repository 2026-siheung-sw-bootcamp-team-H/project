import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Filter, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatPercent } from "@/lib/display";
import { platformApi } from "@/services/platformApi";
import { useServiceStore } from "@/stores/serviceStore";
import type { AttackCategory, RuleStatus } from "@/types/domain";

export function RulesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | RuleStatus>("all");
  const [category, setCategory] = useState<"all" | AttackCategory>("all");
  const serviceId = useServiceStore((state) => state.selectedServiceId);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rules", serviceId],
    queryFn: () => platformApi.getRules(serviceId ?? undefined),
    enabled: Boolean(serviceId)
  });
  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (rule) =>
          `${rule.externalId} ${rule.summary}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === "all" || rule.status === status) &&
          (category === "all" || rule.category === category)
      ),
    [category, data, query, status]
  );

  if (!serviceId || isLoading) {
    return <LoadingState label="선택한 서비스의 방어 룰을 불러오는 중입니다." />;
  }
  if (isError || !data) return <ErrorState />;
  const statuses = [...new Set(data.map((rule) => rule.status))];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Signature registry"
        title="WAF 시그니처 룰"
        description="공격 요청에서 생성된 룰의 버전, 검증 신뢰도와 배포 생애주기를 추적합니다."
      />
      <section className="security-panel rounded-md">
        <div className="grid gap-3 border-b border-[#273244] p-4 lg:grid-cols-[minmax(260px,1fr)_190px_190px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="룰 ID 또는 설명 검색"
              className="h-10 w-full rounded border border-[#273244] bg-[#0b0f19] pl-10 pr-3 font-mono text-xs text-white placeholder:text-[#4b5563] focus:border-[#6366f1]"
            />
          </label>
          <select
            aria-label="룰 상태"
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | RuleStatus)}
            className="h-10 rounded border border-[#273244] bg-[#0b0f19] px-3 text-xs text-[#d1d5db]"
          >
            <option value="all">모든 상태</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            aria-label="공격 카테고리"
            value={category}
            onChange={(event) => setCategory(event.target.value as "all" | AttackCategory)}
            className="h-10 rounded border border-[#273244] bg-[#0b0f19] px-3 text-xs text-[#d1d5db]"
          >
            <option value="all">모든 카테고리</option>
            <option value="SQL_INJECTION">SQL Injection</option>
            <option value="XSS">XSS</option>
            <option value="PATH_TRAVERSAL">Path Traversal</option>
          </select>
          <div className="flex items-center justify-end gap-2 px-2 font-mono text-[10px] text-[#7dd3fc]">
            <Filter className="size-3.5" />
            {filtered.length} RULES
          </div>
        </div>
        <div className="hidden grid-cols-[minmax(260px,1fr)_150px_130px_110px_110px_100px_24px] gap-3 border-b border-[#273244] bg-[#0d1420] px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748b] lg:grid">
          <span>Signature</span>
          <span>Category</span>
          <span>Status</span>
          <span>Confidence</span>
          <span>False positive</span>
          <span>Updated</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <EmptyState label="조건에 맞는 방어 룰이 없습니다." />
        ) : (
          <div>
            {filtered.map((rule) => (
              <Link
                key={rule.id}
                to={`/rules/${rule.id}`}
                className="security-table-row grid gap-4 border-l-2 border-l-[#6366f1] px-5 py-4 lg:grid-cols-[minmax(260px,1fr)_150px_130px_110px_110px_100px_24px] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded bg-[#6366f1]/10 text-[#a5b4fc]">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-white">
                      {rule.externalId} <span className="text-[#64748b]">v{rule.version}</span>
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[#64748b]">{rule.summary}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#9ca3af]">
                  {rule.category.replaceAll("_", " ")}
                </span>
                <StatusBadge status={rule.status} />
                <span className="font-mono text-xs font-semibold text-[#6ee7b7]">
                  {formatPercent(rule.confidence)}
                </span>
                <span
                  className={`font-mono text-xs ${rule.falsePositiveRate > 0.1 ? "text-[#fcd34d]" : "text-[#9ca3af]"}`}
                >
                  {formatPercent(rule.falsePositiveRate)}
                </span>
                <span className="font-mono text-[10px] text-[#64748b]">
                  {formatDate(rule.createdAt)}
                </span>
                <ArrowRight className="size-4 text-[#4b5563]" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
