import type { ReactNode } from "react";
import { AlertTriangle, Check, CircleHelp, LoaderCircle } from "lucide-react";
import type {
  RuleStatus,
  ServiceStatus,
  TrafficClassification,
  ValidationStatus
} from "@/types/domain";

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
    <header className="grid gap-4 border-b border-[#273244] pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div>
        {eyebrow && (
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#f9fafb] sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9ca3af]">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">{actions}</div>}
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
  const toneStyle = {
    default: "border-l-[#38bdf8]",
    success: "border-l-[#10b981]",
    warning: "border-l-[#f59e0b]",
    danger: "border-l-[#ef4444]"
  }[tone];
  const valueColor = {
    default: "text-[#f9fafb]",
    success: "text-[#6ee7b7]",
    warning: "text-[#fcd34d]",
    danger: "text-[#fca5a5]"
  }[tone];
  return (
    <article className={`security-panel rounded-md border-l-2 p-4 ${toneStyle}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">
        {label}
      </p>
      <p className={`mt-3 font-mono text-2xl font-semibold tracking-[-0.04em] ${valueColor}`}>
        {value}
      </p>
      {detail && <p className="mt-1 text-[11px] leading-5 text-[#6b7280]">{detail}</p>}
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
    <section className={`security-panel overflow-hidden rounded-md ${className}`}>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-[#273244] px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-[#f9fafb]">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-[#9ca3af]">{description}</p>}
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
    info: "border-[#38bdf8]/30 bg-[#38bdf8]/[0.06] text-[#bae6fd]",
    success: "border-[#10b981]/25 bg-[#10b981]/[0.06] text-[#a7f3d0]",
    warning: "border-[#f59e0b]/25 bg-[#f59e0b]/[0.06] text-[#fde68a]"
  }[tone];
  return (
    <aside className={`flex gap-3 rounded-md border p-4 ${colors}`}>
      <CircleHelp className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-xs leading-5 text-[#d1d5db]">{children}</div>
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
          className={`rounded-md border p-4 ${index === active ? "border-[#6366f1]/60 bg-[#6366f1]/10" : "border-[#273244] bg-[#111827]"}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid size-6 place-items-center rounded-full text-xs font-bold ${index < active ? "bg-[#10b981] text-[#0b0f19]" : index === active ? "bg-[#6366f1] text-white" : "bg-[#1f2937] text-[#64748b]"}`}
            >
              {index < active ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={`text-sm font-semibold ${index <= active ? "text-white" : "text-[#64748b]"}`}
            >
              {step.label}
            </span>
          </div>
          {step.description && (
            <p className="mt-2 text-xs leading-5 text-[#9ca3af]">{step.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

const labels: Record<string, string> = {
  draft: "초안",
  sandbox_tested: "샌드박스 통과",
  holdout_passed: "Holdout 통과",
  shadow_mode: "Shadow 관찰",
  approval_required: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
  active: "차단 적용",
  review_required: "재검토 필요",
  failed: "실패",
  rolled_back: "롤백됨",
  disabled: "비활성",
  normal: "정상",
  suspicious: "의심",
  attack: "공격",
  unknown: "미분류",
  blocked: "BLOCK",
  allowed: "ALLOW",
  monitored: "MONITOR",
  connected: "연결됨",
  disconnected: "연결 끊김",
  pending: "연결 확인 전",
  unhealthy: "연결 이상",
  deployed: "배포됨",
  shadow: "Shadow",
  ready: "배포 준비",
  exported: "내보냄",
  queued: "대기",
  running: "검증 중",
  hardening: "보강 중"
};

type BadgeStatus =
  | RuleStatus
  | ValidationStatus
  | TrafficClassification
  | "blocked"
  | "allowed"
  | "monitored"
  | "connected"
  | "disconnected"
  | ServiceStatus
  | "deployed"
  | "shadow"
  | "ready"
  | "exported";

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const success = [
    "active",
    "approved",
    "holdout_passed",
    "passed",
    "normal",
    "allowed",
    "connected",
    "deployed"
  ].includes(status);
  const danger = ["failed", "rejected", "attack", "blocked", "unhealthy"].includes(status);
  const info = ["monitored", "shadow", "shadow_mode"].includes(status);
  const color = success
    ? "border-[#10b981]/25 bg-[#10b981]/10 text-[#6ee7b7]"
    : danger
      ? "border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]"
      : info
        ? "border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#7dd3fc]"
        : "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fcd34d]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${color}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}

export function LoadingState({ label = "데이터를 불러오는 중입니다." }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center p-8 text-[#9ca3af]">
      <div className="flex items-center gap-3 text-sm">
        <LoaderCircle className="size-5 animate-spin text-[#818cf8]" />
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
  return (
    <div className="grid min-h-40 place-items-center p-8 text-center text-sm text-[#9ca3af]">
      {label}
    </div>
  );
}
