import { useQuery } from "@tanstack/react-query";
import { Search, ShieldAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { products } from "@/data/shopData";
import { shopApi } from "@/services/shopApi";
import { ProductCard } from "@/shop/components/ProductCard";

export function ShopSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);
  const securityCheck = useQuery({
    queryKey: ["shop", "search", query],
    queryFn: () => shopApi.search(query),
    enabled: Boolean(query),
    retry: false
  });
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return products.filter((product) =>
      [product.name, product.englishName, product.category, product.description]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim()) navigate(`/demo-shop/search?q=${encodeURIComponent(input.trim())}`);
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">Search</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">무엇을 찾고 있나요?</h1>
      <form
        className="mt-8 flex max-w-2xl items-center border-b-2 border-stone-950"
        onSubmit={submit}
      >
        <Search className="size-5 text-stone-500" />
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="검색어"
          placeholder="상품명, 카테고리 검색"
          autoFocus
          className="w-full bg-transparent px-4 py-4 text-lg outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          className="rounded-full bg-stone-950 px-5 py-2.5 text-xs font-bold text-white"
        >
          검색
        </button>
      </form>

      {query && (
        <div className="mt-12">
          {securityCheck.data?.blocked ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
              <ShieldAlert className="mx-auto size-9 text-red-600" />
              <h2 className="mt-4 text-xl font-bold text-red-950">
                보안 정책에 의해 요청이 차단되었습니다
              </h2>
              <p className="mt-2 text-sm text-red-700">
                입력값에서 공격 패턴이 탐지되었습니다. Request ID: {securityCheck.data.requestId}
              </p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-bold">“{query}” 검색 결과</h2>
                <span className="text-xs text-stone-500">{results.length}개 상품</span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-24 text-center">
              <Search className="mx-auto size-8 text-stone-300" />
              <h2 className="mt-4 text-lg font-bold">검색 결과가 없습니다</h2>
              <p className="mt-2 text-sm text-stone-500">다른 검색어를 입력해 보세요.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
