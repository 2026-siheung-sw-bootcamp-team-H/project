import type { EnforcementAttribution } from "@/types/domain";

const attributionStyle = {
  owasp_crs: {
    label: "OWASP CRS",
    className: "border-sky-400/20 bg-sky-400/[0.07] text-sky-200"
  },
  anvil_signature: {
    label: "ANVIL",
    className: "border-violet-400/25 bg-violet-400/[0.09] text-violet-200"
  },
  modsecurity: {
    label: "ModSecurity",
    className: "border-amber-400/20 bg-amber-400/[0.07] text-amber-200"
  },
  internal_rule: {
    label: "내부 엔진",
    className: "border-slate-400/20 bg-slate-400/[0.07] text-slate-300"
  }
} as const;

function attributionLabel(item: EnforcementAttribution) {
  if (item.type !== "anvil_signature") return attributionStyle[item.type].label;
  return item.action === "monitor" ? "ANVIL 감시" : "ANVIL 차단";
}

function attributionDetails(items: EnforcementAttribution[]) {
  return items
    .map((item) =>
      [
        attributionLabel(item),
        item.ruleId,
        item.action === "monitor" ? "감시" : item.action === "block" ? "차단" : "허용",
        item.message
      ]
        .filter(Boolean)
        .join(" · ")
    )
    .join("\n");
}

export function EnforcementAttributionBadges({
  items,
  compact = false
}: {
  items: EnforcementAttribution[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  const hasCrs = items.some((item) => item.type === "owasp_crs");
  const hasAnvil = items.some(
    (item) => item.type === "anvil_signature" || item.type === "internal_rule"
  );

  if (compact && (hasCrs || hasAnvil)) {
    const label =
      hasCrs && hasAnvil ? "CRS + ANVIL 공동 탐지" : hasCrs ? "CRS 차단" : "ANVIL 추가 탐지";
    const className =
      hasCrs && hasAnvil
        ? "border-indigo-300/25 bg-indigo-400/[0.09] text-indigo-100"
        : hasCrs
          ? attributionStyle.owasp_crs.className
          : attributionStyle.anvil_signature.className;

    return (
      <span
        title={attributionDetails(items)}
        className={`inline-flex items-center rounded border px-2 py-1 text-[9px] font-semibold tracking-wide ${className}`}
      >
        {label}
      </span>
    );
  }

  const groupedItems = [...new Set(items.map((item) => item.type))].map((type) => {
    const group = items.filter((item) => item.type === type);
    const sorted = [...group].sort((left, right) => {
      const actionPriority = { block: 0, monitor: 1, allow: 2 };
      if (actionPriority[left.action] !== actionPriority[right.action]) {
        return actionPriority[left.action] - actionPriority[right.action];
      }
      if (left.type === "owasp_crs") {
        const leftPenalty = left.ruleId?.startsWith("949") ? 1 : 0;
        const rightPenalty = right.ruleId?.startsWith("949") ? 1 : 0;
        if (leftPenalty !== rightPenalty) return leftPenalty - rightPenalty;
      }
      return (left.ruleId ?? "").localeCompare(right.ruleId ?? "");
    });
    return { item: sorted[0], count: group.length };
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groupedItems.map(({ item, count }) => {
        const style = attributionStyle[item.type];
        return (
          <span
            key={`${item.type}:${item.ruleId ?? "unknown"}`}
            title={items
              .filter((candidate) => candidate.type === item.type)
              .map((candidate) => [candidate.ruleId, candidate.message].filter(Boolean).join(" · "))
              .join("\n")}
            className={`inline-flex items-center gap-1 rounded border font-mono font-semibold ${compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[10px]"} ${style.className}`}
          >
            <span>{attributionLabel(item)}</span>
            {item.ruleId && <span className="opacity-70">· {item.ruleId}</span>}
            {count > 1 && <span className="opacity-50">+{count - 1}</span>}
          </span>
        );
      })}
    </div>
  );
}
