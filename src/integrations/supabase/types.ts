export interface PrintOrder {
  id: string;
  user_id: string;
  location: string;
  copies: number;
  size: string;
  color: string;
  sides: string;
  total_pages: number;
  file_paths: string[];
  status: string;
  created_at: string;
}