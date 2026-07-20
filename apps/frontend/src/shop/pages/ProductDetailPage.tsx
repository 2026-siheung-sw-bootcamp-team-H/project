import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Star
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatPrice } from "@/lib/display";
import { shopApi } from "@/services/shopApi";
import { useShopStore } from "@/stores/shopStore";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [review, setReview] = useState("");
  const [added, setAdded] = useState(false);
  const addToCart = useShopStore((state) => state.addToCart);
  const customer = useShopStore((state) => state.customer);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shop", "product", id],
    queryFn: () => shopApi.getProduct(id)
  });
  const reviewMutation = useMutation({
    mutationFn: () => shopApi.createReview(id, review),
    onSuccess: (result) => {
      if (result.accepted) setReview("");
    }
  });

  function addProduct() {
    addToCart(id, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (review.trim()) reviewMutation.mutate();
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-[70vh] max-w-7xl animate-pulse px-5 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-[2rem] bg-stone-200" />
          <div className="space-y-5 py-10">
            <div className="h-4 w-24 rounded bg-stone-200" />
            <div className="h-12 w-3/4 rounded bg-stone-200" />
            <div className="h-4 w-full rounded bg-stone-200" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-7xl place-items-center px-5 text-center">
        <div>
          <ShieldAlert className="mx-auto size-10 text-red-500" />
          <h1 className="mt-5 text-2xl font-black">상품 요청을 처리하지 못했습니다</h1>
          <p className="mt-3 text-sm text-stone-500">
            {error instanceof Error ? error.message : "상품을 찾을 수 없습니다."}
          </p>
          <Link
            to="/demo-shop"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-xs font-bold text-white"
          >
            <ArrowLeft className="size-4" /> 쇼핑 계속하기
          </Link>
        </div>
      </main>
    );
  }

  const product = data.data;
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          to="/demo-shop"
          className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft className="size-4" /> 상품 목록
        </Link>
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="overflow-hidden rounded-[2rem] bg-stone-200">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-square size-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center lg:py-8">
            <div className="flex items-center gap-3">
              {product.badge && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[9px] font-black tracking-wider text-orange-700">
                  {product.badge}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {product.category}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-stone-500">{product.englishName}</p>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-1 text-xs font-bold">
                <Star className="size-4 fill-orange-500 text-orange-500" />
                {product.rating}
              </div>
              <span className="text-xs text-stone-400">리뷰 {product.reviewCount}개</span>
            </div>
            <p className="mt-7 text-2xl font-black">{formatPrice(product.price)}</p>
            {product.originalPrice && (
              <p className="mt-1 text-sm text-stone-400 line-through">
                {formatPrice(product.originalPrice)}
              </p>
            )}
            <p className="mt-7 text-sm leading-7 text-stone-600">{product.description}</p>

            <div className="mt-8 border-t border-stone-200 pt-7">
              <p className="text-xs font-bold">
                색상{" "}
                <span className="ml-2 font-normal text-stone-500">
                  {product.colors[selectedColor]}
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                {product.colors.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(index)}
                    aria-label={`${color} 색상 선택`}
                    className={`grid size-9 place-items-center rounded-full border-2 p-1 ${selectedColor === index ? "border-stone-950" : "border-transparent"}`}
                  >
                    <span
                      className={`size-full rounded-full ${index === 0 ? "bg-stone-800" : index === 1 ? "bg-stone-300" : "bg-emerald-700"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <div className="flex items-center rounded-full border border-stone-300 bg-white">
                <button
                  type="button"
                  aria-label="수량 줄이기"
                  className="p-3"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-xs font-bold">{quantity}</span>
                <button
                  type="button"
                  aria-label="수량 늘리기"
                  className="p-3"
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-4 text-xs font-bold text-white transition hover:bg-orange-600"
              >
                {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
                {added ? "장바구니에 담았습니다" : "장바구니 담기"}
              </button>
              <button
                type="button"
                aria-label="관심 상품 추가"
                className="grid size-12 place-items-center rounded-full border border-stone-300 bg-white hover:text-orange-600"
              >
                <Heart className="size-5" />
              </button>
            </div>
            <ul className="mt-8 space-y-3 border-t border-stone-200 pt-7">
              {product.details.map((detail) => (
                <li key={detail} className="flex items-center gap-3 text-xs text-stone-600">
                  <Check className="size-4 text-emerald-700" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[2rem] bg-white p-6 sm:p-10 lg:grid-cols-[0.7fr_1.3fr] lg:p-14">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">
              Customer review
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
              사용 경험을
              <br />
              남겨주세요.
            </h2>
            <p className="mt-4 text-xs leading-6 text-stone-500">
              리뷰 요청은 Demo Shop API를 거쳐 보안 검사를 받습니다. 입력한 요청은 관리자 콘솔
              로그에서 확인할 수 있습니다.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="size-4" /> Aegis Loop protected
            </div>
          </div>
          <form onSubmit={submitReview}>
            <label className="text-xs font-bold" htmlFor="review-content">
              {customer ? `${customer.name}님의 리뷰` : "리뷰 내용"}
            </label>
            <textarea
              id="review-content"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              rows={6}
              placeholder="제품에 대한 솔직한 경험을 작성해 주세요."
              className="mt-3 w-full resize-none rounded-2xl border border-stone-200 bg-[#f7f6f2] p-4 text-sm leading-6 outline-none transition focus:border-stone-500"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] text-stone-400">
                악성 스크립트 패턴은 활성 WAF 룰에 의해 차단됩니다.
              </p>
              <button
                type="submit"
                disabled={reviewMutation.isPending || !review.trim()}
                className="rounded-full bg-stone-950 px-6 py-3 text-xs font-bold text-white disabled:opacity-40"
              >
                {reviewMutation.isPending ? "등록 중..." : "리뷰 등록"}
              </button>
            </div>
            {reviewMutation.data && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-xs ${reviewMutation.data.blocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {reviewMutation.data.blocked
                  ? `보안 정책이 리뷰 요청을 차단했습니다. ${reviewMutation.data.requestId}`
                  : `리뷰가 등록되었습니다. Request ID: ${reviewMutation.data.requestId}`}
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
