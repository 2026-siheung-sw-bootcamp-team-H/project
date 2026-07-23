import { ArrowRight, Box, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { categoryLabels, products } from "@/data/shopData";
import { ProductCard } from "@/shop/components/ProductCard";
import type { ProductCategory } from "@/types/shop";

const categoryValues = ["all", "desk", "audio", "lifestyle"] as const;

export function ShopHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const category = categoryValues.includes(requestedCategory as (typeof categoryValues)[number])
    ? (requestedCategory as "all" | ProductCategory)
    : "all";
  const filteredProducts =
    category === "all" ? products : products.filter((product) => product.category === category);

  function setCategory(nextCategory: "all" | ProductCategory) {
    setSearchParams(nextCategory === "all" ? {} : { category: nextCategory });
  }

  return (
    <main>
      <section className="mx-auto max-w-[1480px] px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative min-h-[590px] overflow-hidden rounded-[2rem] bg-stone-900 sm:min-h-[650px]">
          <img
            src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1800&q=88"
            alt="정돈된 데스크 위 디지털 제품"
            className="absolute inset-0 size-full object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/60 to-transparent" />
          <div className="relative flex min-h-[590px] max-w-2xl flex-col justify-end p-7 pb-12 text-white sm:min-h-[650px] sm:p-14 lg:p-20">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-orange-300">
              Work beautifully · 2026
            </p>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.07em] sm:text-7xl">
              Better things,
              <br />
              better rhythm.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-stone-300 sm:text-base">
              더 오래 집중하고, 더 편안히 쉬기 위해 고른 데스크와 라이프스타일 제품.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-xs font-bold text-stone-950 transition hover:bg-orange-500 hover:text-white"
              >
                컬렉션 보기 <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        {[
          [Truck, "무료 배송", "5만원 이상 주문"],
          [RotateCcw, "간편 반품", "구매 후 14일"],
          [ShieldCheck, "안전한 결제", "암호화 결제 처리"],
          [Box, "정성스런 포장", "재활용 패키지"]
        ].map(([Icon, title, description]) => {
          const FeatureIcon = Icon as typeof Truck;
          return (
            <div key={String(title)} className="flex items-center gap-3 py-2">
              <FeatureIcon className="size-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-xs font-bold">{String(title)}</p>
                <p className="mt-0.5 text-[10px] text-stone-500">{String(description)}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section id="products" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">
              Curated collection
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              오늘의 좋은 선택
            </h2>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categoryValues.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${category === value ? "bg-stone-950 text-white" : "text-stone-500 hover:bg-stone-200"}`}
              >
                {categoryLabels[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 pt-9 sm:gap-x-6 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#dbe3d4] lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-600">
              Designed for focus
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.06em]">
              집중이 필요한 순간,
              <br />더 적은 방해.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-stone-600">
              소리와 빛, 손끝의 감각까지. 매일 사용하는 도구일수록 단순하고 편안해야 합니다.
            </p>
            <button
              type="button"
              onClick={() => setCategory("desk")}
              className="mt-7 inline-flex w-fit items-center gap-2 border-b border-stone-900 pb-1 text-xs font-bold"
            >
              Desk collection <ArrowRight className="size-3.5" />
            </button>
          </div>
          <img
            src="https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=1200&q=85"
            alt="집중을 위한 미니멀 데스크"
            loading="lazy"
            className="min-h-96 size-full object-cover"
          />
        </div>
      </section>
    </main>
  );
}
