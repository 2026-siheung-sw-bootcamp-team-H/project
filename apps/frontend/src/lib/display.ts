export const buttonPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#818cf8]/30 bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(99,102,241,0.18)] transition hover:bg-[#4f46e5] disabled:cursor-wait disabled:opacity-50";

export const buttonSecondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#273244] bg-[#111827] px-4 py-2.5 text-sm font-semibold text-[#d1d5db] transition hover:border-[#3b4a63] hover:bg-[#1f2937] hover:text-white disabled:cursor-wait disabled:opacity-50";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed((value * 100) % 1 === 0 ? 0 : 1)}%`;
}

export function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}
