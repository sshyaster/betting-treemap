export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: 'crypto' | 'economy' | 'politics';
}

// Google News RSS topic IDs
const GOOGLE_NEWS_TOPICS = {
  economy: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB',
  politics: 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZ4ZERBU0FtVnVHZ0pWVXlnQVAB',
};

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function fetchGoogleNews(topicId: string, category: 'economy' | 'politics'): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/topics/${topicId}?hl=en-US&gl=US&ceid=US:en`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let idx = 0;
    while ((match = itemRegex.exec(xml)) !== null && idx < 15) {
      const block = match[1];
      const title = block.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || '';
      const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';

      if (title && link) {
        items.push({
          id: `${category}-${idx}`,
          title: decodeHTMLEntities(title),
          url: link,
          source: decodeHTMLEntities(source),
          publishedAt: pubDate,
          category,
        });
        idx++;
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchCryptoNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/news?page=1', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).slice(0, 15).map((item: { id: string; title: string; url: string; author: string; news_site: string; created_at: string }, i: number) => ({
      id: `crypto-${i}`,
      title: item.title,
      url: item.url,
      source: item.news_site || item.author || 'Unknown',
      publishedAt: new Date(Number(item.created_at) * 1000).toISOString(),
      category: 'crypto' as const,
    }));
  } catch {
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const [crypto, economy, politics] = await Promise.all([
    fetchCryptoNews(),
    fetchGoogleNews(GOOGLE_NEWS_TOPICS.economy, 'economy'),
    fetchGoogleNews(GOOGLE_NEWS_TOPICS.politics, 'politics'),
  ]);
  return [...crypto, ...economy, ...politics];
}

export { GOOGLE_NEWS_TOPICS };
