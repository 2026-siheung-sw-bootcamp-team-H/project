export type ProductCategory = "desk" | "audio" | "lifestyle";

export type Product = {
  id: string;
  name: string;
  englishName: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  description: string;
  details: string[];
  colors: string[];
  imageUrl: string;
  badge?: string;
  featured?: boolean;
};

export type ShopCartItem = {
  productId: string;
  quantity: number;
};

export type ShopRequestResult<T> = {
  data: T;
  requestId: string;
  blocked: boolean;
};
