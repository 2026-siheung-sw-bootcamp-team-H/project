import { products as productPresentation } from "@/data/shopData";
import { queryClient } from "@/lib/queryClient";
import { apiClient, ApiClientError } from "@/services/apiClient";
import type { Product, ShopRequestResult } from "@/types/shop";

type BackendProduct = Pick<
  Product,
  "id" | "name" | "englishName" | "category" | "price" | "rating" | "reviewCount" | "description"
> &
  Partial<Product>;

function enrichProduct(product: BackendProduct): Product {
  const presentation = productPresentation.find((item) => item.id === product.id);
  return {
    id: product.id,
    name: product.name,
    englishName: product.englishName,
    category: product.category,
    price: product.price,
    rating: product.rating,
    reviewCount: product.reviewCount,
    description: product.description,
    originalPrice: product.originalPrice ?? presentation?.originalPrice,
    details: product.details ?? presentation?.details ?? ["Demo Shop 상품"],
    colors: product.colors ?? presentation?.colors ?? ["Default"],
    imageUrl:
      product.imageUrl ??
      presentation?.imageUrl ??
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    badge: product.badge ?? presentation?.badge,
    featured: product.featured ?? presentation?.featured
  };
}

async function refreshSecurityViews() {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ["logs"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  ]).catch(() => undefined);
}

export const shopApi = {
  async getProduct(productId: string): Promise<ShopRequestResult<Product>> {
    const result = await apiClient<ShopRequestResult<BackendProduct>>(
      `/api/demo-shop/products?id=${encodeURIComponent(productId)}`
    );
    await refreshSecurityViews();
    return { ...result, data: enrichProduct(result.data) };
  },

  async search(query: string): Promise<ShopRequestResult<Product[]>> {
    try {
      const result = await apiClient<ShopRequestResult<BackendProduct[]>>(
        `/api/demo-shop/search?q=${encodeURIComponent(query)}`,
        { acceptErrorData: true }
      );
      await refreshSecurityViews();
      return { ...result, data: result.data.map(enrichProduct) };
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        await refreshSecurityViews();
        return { data: [], requestId: "", blocked: true };
      }
      throw error;
    }
  },

  async runAttackSimulation(
    category: "SQL_INJECTION" | "XSS" | "PATH_TRAVERSAL",
    payload: string
  ): Promise<ShopRequestResult<Product[]>> {
    try {
      const result = await apiClient<ShopRequestResult<BackendProduct[]>>(
        `/api/demo-shop/search?q=${encodeURIComponent(payload)}`,
        {
          acceptErrorData: true,
          headers: {
            "x-aegis-simulation-id": crypto.randomUUID(),
            "x-aegis-test-category": category
          }
        }
      );
      await refreshSecurityViews();
      return { ...result, data: result.data.map(enrichProduct) };
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        await refreshSecurityViews();
        return { data: [], requestId: "", blocked: true };
      }
      throw error;
    }
  },

  async login(email: string, password: string) {
    const result = await apiClient<{
      customer: { name: string; email: string };
      requestId: string;
    }>("/api/demo-shop/login", { method: "POST", body: { email, password } });
    await refreshSecurityViews();
    return result;
  },

  async createReview(productId: string, content: string) {
    const result = await apiClient<{ accepted: boolean; blocked: boolean; requestId: string }>(
      "/api/demo-shop/reviews",
      { method: "POST", body: { productId, content }, acceptErrorData: true }
    );
    await refreshSecurityViews();
    return result;
  }
};
