export interface Market {
  id: string;
  title: string;
  volume: number;
  openInterest: number;
  category: string;
  platform: 'polymarket' | 'kalshi';
  url: string;
  price?: number;
}

export interface TreemapData {
  name: string;
  value?: number;
  children?: TreemapData[];
  market?: Market;
  category?: string;
}

export interface ApiResponse {
  markets: Market[];
  totalVolume: number;
  lastUpdated: string;
}
