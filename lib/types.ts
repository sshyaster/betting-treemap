export type Timeframe = '24h' | '1w' | '1m' | '1y' | 'all' | 'oi';

export interface MarketOutcome {
  name: string;
  price: number; // 0-1
}

export interface Market {
  id: string;
  title: string;
  volume: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  volumeAll: number;
  openInterest: number;
  category: string;
  platform: 'polymarket' | 'kalshi';
  url: string;
  price?: number;
  outcomes?: MarketOutcome[]; // top outcomes for multi-option markets
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
