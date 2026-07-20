export const buttonPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#5865f2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:cursor-wait disabled:opacity-50";

export const buttonSecondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-[#2b2d31] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-[#35373c] hover:text-white disabled:cursor-wait disabled:opacity-50";

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
