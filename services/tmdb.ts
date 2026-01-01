import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import {
  MediaItem,
  MediaDetails,
  Genre,
  SeasonDetails,
  PersonDetails,
  CollectionDetails
} from '../types';

// ---------------- PROXY CONFIG ----------------
const PROXY_GENERATORS = [
  (url: string) => url,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

const fetchFromTMDB = async <T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> => {
  const query = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const targetUrl = `${TMDB_BASE_URL}${endpoint}?${query}`;
  let lastError: any;

  for (const gen of PROXY_GENERATORS) {
    const isDirect = gen(targetUrl) === targetUrl;
    try {
      const res = await fetchWithTimeout(gen(targetUrl), isDirect ? 10000 : 20000);
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid TMDB key');
        if (res.status === 404) throw new Error('Not found');
        continue;
      }
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('TMDB fetch failed');
};

// ---------------- QUALITY FILTER ----------------
const filterQualityContent = (items: MediaItem[]) =>
  items.filter(item => {
    const hasImage =
      item.poster_path ||
      item.backdrop_path ||
      item.profile_path ||
      item.logo_path;

    if (!hasImage) return false;

    if (
      item.media_type === 'person' ||
      item.media_type === 'company' ||
      item.media_type === 'collection'
    ) {
      return true;
    }

    return (item.vote_count ?? 0) > 0;
  });

// ---------------- SERVICE ----------------
export const tmdbService = {
  getTrending: async (mediaType: 'all' | 'movie' | 'tv', time: 'day' | 'week', page = 1) => {
    const res = await fetchFromTMDB<{ results: MediaItem[]; page: number; total_pages: number }>(
      `/trending/${mediaType}/${time}`,
      { page: page.toString() }
    );
    return {
      results: filterQualityContent(res.results),
      page: res.page,
      total_pages: res.total_pages,
    };
  },

  getPopular: async (type: 'movie' | 'tv', page = 1) => {
    const res = await fetchFromTMDB<{ results: MediaItem[]; page: number; total_pages: number }>(
      `/${type}/popular`,
      { page: page.toString() }
    );
    return {
      results: filterQualityContent(res.results),
      page: res.page,
      total_pages: res.total_pages,
    };
  },

  getTopRated: async (type: 'movie' | 'tv', page = 1) => {
    const res = await fetchFromTMDB<{ results: MediaItem[]; page: number; total_pages: number }>(
      `/${type}/top_rated`,
      { page: page.toString() }
    );
    return {
      results: filterQualityContent(res.results),
      page: res.page,
      total_pages: res.total_pages,
    };
  },

  discover: async (
    type: 'movie' | 'tv',
    genreId?: number,
    page = 1,
    keywordId?: number,
    companyId?: number,
    networkId?: number
  ) => {
    const params: Record<string, string> = {
      page: page.toString(),
      sort_by: 'popularity.desc',
      'vote_count.gte': '1',
    };

    if (genreId) params.with_genres = genreId.toString();
    if (keywordId) params.with_keywords = keywordId.toString();
    if (companyId) params.with_companies = companyId.toString();
    if (networkId) params.with_networks = networkId.toString();

    const res = await fetchFromTMDB<{ results: MediaItem[]; page: number; total_pages: number }>(
      `/discover/${type}`,
      params
    );

    return {
      results: filterQualityContent(res.results),
      page: res.page,
      total_pages: res.total_pages,
    };
  },

  discoverByProvider: async (providerId: number, type: 'movie' | 'tv', page = 1) => {
    const res = await fetchFromTMDB<{ results: MediaItem[]; page: number; total_pages: number }>(
      `/discover/${type}`,
      {
        with_watch_providers: providerId.toString(),
        watch_region: 'US',
        sort_by: 'popularity.desc',
        page: page.toString(),
        'vote_count.gte': '1',
      }
    );

    return {
      results: filterQualityContent(res.results),
      page: res.page,
      total_pages: res.total_pages,
    };
  },

  // ✅ FIXED: PAGINATED LIST SUPPORT
  getList: async (listId: number | string, page = 1) => {
    const res = await fetchFromTMDB<{
      items: MediaItem[];
      name: string;
      page: number;
      total_pages: number;
    }>(`/list/${listId}`, { page: page.toString() });

    return {
      results: filterQualityContent(res.items),
      name: res.name,
      page: res.page,
      total_pages: res.total_pages,
    };
  },
};
