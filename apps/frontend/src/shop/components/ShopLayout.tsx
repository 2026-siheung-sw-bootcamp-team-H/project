import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useShopStore } from "@/stores/shopStore";

const navItems = [
  { to: "/demo-shop", label: "Shop" },
  { to: "/demo-shop?category=desk", label: "Desk" },
  { to: "/demo-shop?category=audio", label: "Audio" },
  { to: "/demo-shop?category=lifestyle", label: "Lifestyle" }
];

export function ShopLayout() {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cartCount = useShopStore((state) =>
    state.cart.reduce((total, item) => total + item.quantity, 0)
  );
  const customer = useShopStore((state) => state.customer);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Morrow · Demo Shop";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/demo-shop/search?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] font-sans text-stone-900">
      <div className="bg-stone-950 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-stone-200">
        Demo Shop · 검색·로그인·리뷰 테스트 요청은 ANVIL에서 관찰됩니다
      </div>
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-[#f7f6f2]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="쇼핑 메뉴 열기"
            className="rounded-full p-2 hover:bg-stone-200 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Link to="/demo-shop" className="shrink-0 text-xl font-black tracking-[-0.06em]">
            Morrow<span className="text-orange-600">.</span>
          </Link>
          <nav className="ml-7 hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/demo-shop"}
                className="text-xs font-semibold text-stone-500 transition hover:text-stone-950"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <form
            className="ml-auto hidden max-w-sm flex-1 items-center rounded-full bg-stone-200/70 px-4 md:flex"
            onSubmit={submitSearch}
          >
            <Search className="size-4 text-stone-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="상품 검색"
              placeholder="상품 검색"
              className="w-full bg-transparent px-3 py-2.5 text-xs outline-none placeholder:text-stone-500"
            />
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <Link
              to="/demo-shop/search"
              aria-label="검색"
              className="rounded-full p-2.5 hover:bg-stone-200 md:hidden"
            >
              <Search className="size-5" />
            </Link>
            <Link
              to="/demo-shop/login"
              aria-label={customer ? `${customer.name} 계정` : "로그인"}
              className="rounded-full p-2.5 hover:bg-stone-200"
            >
              <UserRound className="size-5" />
            </Link>
            <Link
              to="/demo-shop/cart"
              aria-label={`장바구니 ${cartCount}개`}
              className="relative rounded-full p-2.5 hover:bg-stone-200"
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-orange-600 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="쇼핑 메뉴 닫기"
            className="absolute inset-0 bg-stone-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[84%] max-w-sm flex-col bg-[#f7f6f2] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <strong className="text-xl tracking-[-0.06em]">Morrow.</strong>
              <button
                type="button"
                aria-label="메뉴 닫기"
                className="rounded-full p-2 hover:bg-stone-200"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-8 flex items-center rounded-full bg-stone-200 px-4"
              onSubmit={submitSearch}
            >
              <Search className="size-4 text-stone-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="모바일 상품 검색"
                placeholder="상품 검색"
                className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              />
            </form>
            <nav className="mt-7 grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl px-3 py-3.5 text-sm font-semibold hover:bg-stone-200"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              to="/login"
              className="mt-auto flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-xs font-semibold text-stone-600"
            >
              <LockKeyhole className="size-4" /> 보안 관리자 콘솔
            </Link>
          </aside>
        </div>
      )}

      <Outlet />

      <footer className="mt-24 border-t border-stone-200 bg-stone-950 text-stone-400">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto] lg:px-8">
          <div>
            <p className="text-xl font-black tracking-[-0.06em] text-white">Morrow.</p>
            <p className="mt-3 max-w-sm text-xs leading-5">
              일상에 오래 남을 좋은 물건을 소개하는 데모 스토어입니다.
            </p>
          </div>
          <div className="text-xs leading-7">
            <p className="mb-2 font-bold text-white">Customer</p>
            <p>배송 및 반품</p>
            <p>자주 묻는 질문</p>
            <p>제품 보증</p>
          </div>
          <div className="text-xs leading-7">
            <p className="mb-2 font-bold text-white">Security demo</p>
            <Link to="/login" className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <LockKeyhole className="size-3.5" /> ANVIL 열기
            </Link>
            <p>수집 대상: Demo Shop API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
