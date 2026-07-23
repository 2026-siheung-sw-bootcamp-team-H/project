import { ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/display";
import { useShopStore } from "@/stores/shopStore";
import type { Product } from "@/types/shop";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useShopStore((state) => state.addToCart);

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-stone-200">
        <Link
          to={`/demo-shop/products/${product.id}`}
          className="block aspect-[4/4.5] overflow-hidden"
        >
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
        </Link>
        {product.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-stone-950 px-2.5 py-1 text-[9px] font-bold tracking-wider text-white">
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={() => addToCart(product.id)}
          className="absolute inset-x-4 bottom-4 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-bold text-stone-950 opacity-0 shadow-xl transition hover:bg-orange-600 hover:text-white group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
        >
          <ShoppingBag className="size-4" /> 장바구니 담기
        </button>
      </div>
      <div className="px-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/demo-shop/products/${product.id}`}
              className="truncate text-sm font-bold tracking-tight hover:text-orange-600"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-[11px] text-stone-500">{product.englishName}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-stone-600">
            <Star className="size-3 fill-current" /> {product.rating}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-bold">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-stone-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
