export interface PrintShop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  created_at: string;
}

export interface PrintOrder {
  id: string;
  user_id: string;
  shop_id: string;
  copies: number;
  size: string;
  color: string;
  sides: string;
  total_pages: number;
  file_paths: string[];
  status: string;
  created_at: string;
  print_shops?: PrintShop;
}
