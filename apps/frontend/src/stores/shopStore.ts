import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShopCartItem } from "@/types/shop";

type ShopCustomer = { name: string; email: string };

type ShopState = {
  cart: ShopCartItem[];
  customer: ShopCustomer | null;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: ShopCustomer) => void;
  clearCustomer: () => void;
};

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      cart: [],
      customer: null,
      addToCart: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.cart.find((item) => item.productId === productId);
          return {
            cart: existing
              ? state.cart.map((item) =>
                  item.productId === productId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                )
              : [...state.cart, { productId, quantity }]
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart
            .map((item) => (item.productId === productId ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
        })),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((item) => item.productId !== productId) })),
      clearCart: () => set({ cart: [] }),
      setCustomer: (customer) => set({ customer }),
      clearCustomer: () => set({ customer: null })
    }),
    { name: "demo-shop-state" }
  )
);
