import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, LogOut, ShieldCheck, ShoppingBag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { shopApi } from "@/services/shopApi";
import { useShopStore } from "@/stores/shopStore";

export function ShopLoginPage() {
  const [email, setEmail] = useState("shopper@demo.local");
  const [password, setPassword] = useState("shop1234");
  const navigate = useNavigate();
  const customer = useShopStore((state) => state.customer);
  const setCustomer = useShopStore((state) => state.setCustomer);
  const clearCustomer = useShopStore((state) => state.clearCustomer);
  const loginMutation = useMutation({
    mutationFn: () => shopApi.login(email, password),
    onSuccess: (result) => setCustomer(result.customer)
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  if (customer) {
    return (
      <main className="mx-auto grid min-h-[65vh] max-w-7xl place-items-center px-5 py-12">
        <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-7" />
          </span>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">
            Welcome back
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            {customer.name}님, 반갑습니다.
          </h1>
          <p className="mt-2 text-sm text-stone-500">{customer.email}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              to="/demo-shop"
              className="flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-xs font-bold text-white"
            >
              <ShoppingBag className="size-4" /> 쇼핑 계속하기
            </Link>
            <button
              type="button"
              onClick={clearCustomer}
              className="flex items-center justify-center gap-2 rounded-full border border-stone-300 px-5 py-3.5 text-xs font-bold"
            >
              <LogOut className="size-4" /> 로그아웃
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-7xl gap-12 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
      <div className="relative hidden overflow-hidden rounded-[2rem] bg-stone-900 lg:block">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85"
          alt="Morrow 데모 쇼핑 공간"
          className="absolute inset-0 size-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">
            Morrow members
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            좋아하는 제품과
            <br />
            주문 내역을 한곳에서.
          </h2>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">
            Member access
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            데모 회원 계정으로 로그인하세요. 로그인 요청도 보안 콘솔에 기록됩니다.
          </p>
          <form className="mt-9 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-xs font-bold">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-stone-950"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-stone-950"
                required
              />
            </label>
            {loginMutation.isError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                {loginMutation.error.message}
              </p>
            )}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-4 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
              <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Demo account
            </p>
            <p className="mt-2 font-mono text-xs text-stone-700">shopper@demo.local / shop1234</p>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-stone-400">
            <ShieldCheck className="size-3.5 text-emerald-700" />
            Aegis Loop 요청 검사 활성화
          </p>
          <button
            type="button"
            onClick={() => navigate("/demo-shop")}
            className="mx-auto mt-4 block text-xs font-semibold text-stone-500 hover:text-stone-950"
          >
            회원가입 없이 둘러보기
          </button>
        </div>
      </div>
    </main>
  );
}
