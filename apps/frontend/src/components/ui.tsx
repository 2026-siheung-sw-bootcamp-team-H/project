import type { ReactNode } from "react";
import { AlertTriangle, Check, CircleHelp, LoaderCircle } from "lucide-react";
import type { RuleStatus, TrafficClassification, ValidationStatus } from "@/types/domain";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-4 border-b border-white/[0.06] pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#949cf7]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-white sm:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      <p className="max-w-3xl text-sm leading-6 text-[#949ba4] md:col-span-2">{description}</p>
    </header>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "default"
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const valueColor = {
    default: "text-white",
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-rose-300"
  }[tone];
  return (
    <article className="rounded-lg border border-white/[0.06] bg-[#1e1f22] p-5">
      <p className="text-xs font-medium text-[#949ba4]">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-[#6d6f78]">{detail}</p>}
    </article>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-white/[0.06] bg-[#1e1f22] ${className}`}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-[#949ba4]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function GuideCallout({
  title,
  children,
  tone = "info"
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "success" | "warning";
}) {
  const colors = {
    info: "border-[#5865f2]/30 bg-[#5865f2]/10 text-[#c9cdfb]",
    success: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200",
    warning: "border-amber-400/20 bg-amber-400/[0.07] text-amber-200"
  }[tone];
  return (
    <aside className={`flex gap-3 rounded-lg border p-4 ${colors}`}>
      <CircleHelp className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-xs leading-5 text-[#b5bac1]">{children}</div>
      </div>
    </aside>
  );
}

export function FlowStepper({
  steps,
  active
}: {
  steps: Array<{ label: string; description?: string }>;
  active: number;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`rounded-lg border p-4 ${index === active ? "border-[#5865f2]/60 bg-[#5865f2]/10" : "border-white/[0.06] bg-[#1e1f22]"}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid size-6 place-items-center rounded-full text-xs font-bold ${index < active ? "bg-emerald-400 text-[#111214]" : index === active ? "bg-[#5865f2] text-white" : "bg-[#2b2d31] text-[#6d6f78]"}`}
            >
              {index < active ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={`text-sm font-semibold ${index <= active ? "text-white" : "text-[#6d6f78]"}`}
            >
              {step.label}
            </span>
          </div>
          {step.description && (
            <p className="mt-2 text-xs leading-5 text-[#949ba4]">{step.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

const labels: Record<string, string> = {
  draft: "초안",
  testing: "AI 검증 중",
  passed: "검증 통과",
  review_required: "승인 필요",
  active: "차단 적용",
  failed: "실패",
  normal: "정상",
  suspicious: "의심",
  attack: "공격",
  unknown: "미분류",
  blocked: "차단",
  allowed: "허용",
  connected: "연결됨",
  deployed: "배포됨",
  ready: "배포 준비",
  exported: "내보냄",
  queued: "대기",
  running: "검증 중",
  hardening: "보강 중"
};

export function StatusBadge({
  status
}: {
  status:
    | RuleStatus
    | ValidationStatus
    | TrafficClassification
    | "blocked"
    | "allowed"
    | "connected"
    | "deployed"
    | "ready"
    | "exported";
}) {
  const success = ["active", "passed", "normal", "allowed", "connected", "deployed"].includes(
    status
  );
  const danger = ["failed", "attack", "blocked"].includes(status);
  const color = success
    ? "bg-emerald-400/10 text-emerald-300"
    : danger
      ? "bg-rose-400/10 text-rose-300"
      : "bg-amber-400/10 text-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${color}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}

export function LoadingState({ label = "데이터를 불러오는 중입니다." }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-[#949ba4]">
      <div className="flex items-center gap-3 text-sm">
        <LoaderCircle className="size-5 animate-spin text-[#949cf7]" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ message = "데이터를 불러오지 못했습니다." }: { message?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-center">
      <div>
        <AlertTriangle className="mx-auto size-7 text-rose-400" />
        <p className="mt-3 text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="grid min-h-40 place-items-center p-8 text-sm text-[#949ba4]">{label}</div>;
}
