import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { products } from "@/data/shopData";
import { formatPrice } from "@/lib/display";
import { useShopStore } from "@/stores/shopStore";

export function ShopCartPage() {
  const cart = useShopStore((state) => state.cart);
  const updateQuantity = useShopStore((state) => state.updateQuantity);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const items = cart.flatMap((cartItem) => {
    const product = products.find((item) => item.id === cartItem.productId);
    return product ? [{ ...cartItem, product }] : [];
  });
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal >= 50000 || subtotal === 0 ? 0 : 3000;

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600">Your bag</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">장바구니</h1>
      {items.length === 0 ? (
        <div className="grid min-h-96 place-items-center text-center">
          <div>
            <ShoppingBag className="mx-auto size-10 text-stone-300" />
            <h2 className="mt-5 text-xl font-bold">장바구니가 비어 있습니다</h2>
            <p className="mt-2 text-sm text-stone-500">마음에 드는 제품을 담아보세요.</p>
            <Link
              to="/demo-shop"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-xs font-bold text-white"
            >
              <ArrowLeft className="size-4" /> 쇼핑 계속하기
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="divide-y divide-stone-200 border-y border-stone-200">
            {items.map(({ product, quantity }) => (
              <article key={product.id} className="flex gap-4 py-6 sm:gap-6">
                <Link
                  to={`/demo-shop/products/${product.id}`}
                  className="size-28 shrink-0 overflow-hidden rounded-2xl bg-stone-200 sm:size-36"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/demo-shop/products/${product.id}`}
                        className="font-bold hover:text-orange-600"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-[11px] text-stone-500">{product.englishName}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`${product.name} 삭제`}
                      onClick={() => removeFromCart(product.id)}
                      className="p-2 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between">
                    <div className="flex items-center rounded-full border border-stone-300 bg-white">
                      <button
                        type="button"
                        aria-label="수량 줄이기"
                        className="p-2"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-7 text-center text-[11px] font-bold">{quantity}</span>
                      <button
                        type="button"
                        aria-label="수량 늘리기"
                        className="p-2"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <p className="text-sm font-black">{formatPrice(product.price * quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="h-fit rounded-[1.6rem] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-black">주문 요약</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between text-stone-500">
                <dt>상품 금액</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-stone-500">
                <dt>배송비</dt>
                <dd>{shipping === 0 ? "무료" : formatPrice(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-5 text-base font-black">
                <dt>총 결제 금액</dt>
                <dd>{formatPrice(subtotal + shipping)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="mt-7 w-full rounded-full bg-orange-600 px-5 py-4 text-xs font-bold text-white hover:bg-orange-700"
            >
              주문하기
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-stone-400">
              <ShieldCheck className="size-3.5" /> 안전한 데모 결제 환경
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
