import { useState, useEffect } from 'react';

interface CryptoSnapshotData {
  price: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
  snapshotAt: string;
}

interface MarketSnapshotData {
  marketId: string;
  title: string;
  category: string;
  volume24hr: number;
  openInterest: number;
  price: number | null;
  snapshotAt: string;
}

export function useCryptoSnapshots(coinId: string, days = 30) {
  const [snapshots, setSnapshots] = useState<CryptoSnapshotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/snapshots/crypto?coinId=${coinId}&days=${days}`)
      .then(r => r.json())
      .then(data => setSnapshots(data.snapshots || []))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [coinId, days]);

  return { snapshots, loading };
}

export function useMarketSnapshots(platform: string, days = 30, marketId?: string) {
  const [snapshots, setSnapshots] = useState<MarketSnapshotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ platform, days: String(days) });
    if (marketId) params.set('marketId', marketId);

    fetch(`/api/snapshots/markets?${params}`)
      .then(r => r.json())
      .then(data => setSnapshots(data.snapshots || []))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [platform, days, marketId]);

  return { snapshots, loading };
}
