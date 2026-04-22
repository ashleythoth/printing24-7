export interface PrintShop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Product {
  id: string;
  print_type: "document" | "photo";
  name: string;
  description: string;
  color_modes: string[];
  sides: string[];
  sizes: string[];
  finishes: string[];
  min_pages: number;
  max_pages: number;
  available_to_shops: boolean;
  status: string;
  created_at: string;
}

export interface PricingTier {
  id: string;
  shop_product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  product_id: string;
  enabled: boolean;
  products: Product;
  pricing_tiers: PricingTier[];
}

export interface PrintOrder {
  id: string;
  user_id: string;
  shop_id: string;
  shop_product_id: string;
  copies: number;
  color_mode: string;
  sides: string;
  size: string;
  finish: string;
  total_quantity: number;
  total_price: number;
  file_paths: string[];
  status: string;
  created_at: string;
  print_shops?: PrintShop;
  shop_products?: ShopProduct & { products: Product };
}
