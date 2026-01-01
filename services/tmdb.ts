import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MediaItem, MediaDetails, Genre, SeasonDetails, PersonDetails, CollectionDetails } from '../types';

// PROXY CONFIGURATION
// Strategy: Try Direct Access first. If that fails (CORS/Network), rotate through proxies.
const PROXY_GENERATORS = [
    // 1. Direct Access (Best performance, works if no CORS/Network blocks)
    (url: string) => url,
    // 2. CodeTabs (Reliable)
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    // 3. AllOrigins (Reliable backup)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 4. CorsProxy.io (Fast, reliable)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 5. ThingProxy (Last resort)
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

// Helper: Fetch with a robust timeout
const fetchWithTimeout = async (url: string, timeoutMs: number = 15000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const targetUrl = `${TMDB_BASE_URL}${endpoint}?${queryParams}`;
  
  let lastError: any;

  // Attempt Loop: Try Direct -> Proxies
  for (const generateProxyUrl of PROXY_GENERATORS) {
      const isDirect = generateProxyUrl(targetUrl) === targetUrl;
      const fetchUrl = generateProxyUrl(targetUrl);
      
      try {
          // Use a shorter timeout for direct to fail fast if blocked, longer for proxies
          const timeout = isDirect ? 10000 : 20000;
          const response = await fetchWithTimeout(fetchUrl, timeout); 
          
          if (!response.ok) {
              // 404/401 are logical errors, not network/proxy errors. Stop trying.
              if (response.status === 404) throw new Error('Resource not found (404)');
              if (response.status === 401) throw new Error('TMDB API Key is invalid.');
              
              // If it's a 403/429/500, it might be a block or temporary issue.
              // If Direct failed with 403 (often CORS/WAF), we proceed to proxy.
              console.warn(`${isDirect ? 'Direct' : 'Proxy'} attempt failed: ${response.status}`);
              continue; 
          }
          
          return await response.json();

      } catch (error: any) {
          console.warn(`${isDirect ? 'Direct' : 'Proxy'} attempt error:`, error.message);
          lastError = error;
      }
  }

  console.error(`All fetch attempts failed for URL: ${targetUrl}`, lastError);
  throw lastError || new Error('Failed to fetch data from TMDB.');
};

export const tmdbService = {
  getTrending: async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week', page: number = 1) => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/trending/${mediaType}/${timeWindow}`, { page: page.toString() });
  },

  getPopular: async (type: 'movie' | 'tv', page: number = 1) => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/${type}/popular`, { page: page.toString() });
  },

  getTopRated: async (type: 'movie' | 'tv', page: number = 1) => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/${type}/top_rated`, { page: page.toString() });
  },

  getDetails: async (type: 'movie' | 'tv', id: number) => {
    return fetchFromTMDB<MediaDetails>(`/${type}/${id}`, {
      append_to_response: 'videos,credits,similar,images',
      include_image_language: 'en,null'
    });
  },

  getSeasonDetails: async (tvId: number, seasonNumber: number) => {
    return fetchFromTMDB<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`, {
        append_to_response: 'videos'
    });
  },

  search: async (query: string, page: number = 1) => {
    return fetchFromTMDB<{ results: MediaItem[] }>('/search/multi', { query, page: page.toString() });
  },

  // Search specifically for collections
  searchCollections: async (query: string, page: number = 1) => {
    return fetchFromTMDB<{ results: MediaItem[] }>('/search/collection', { query, page: page.toString() });
  },

  // Search keywords (for lists like "Oscar", "Anime", etc)
  searchKeywords: async (query: string, page: number = 1) => {
    return fetchFromTMDB<{ results: { id: number, name: string }[] }>('/search/keyword', { query, page: page.toString() });
  },

  getGenres: async (type: 'movie' | 'tv') => {
    return fetchFromTMDB<{ genres: Genre[] }>(`/genre/${type}/list`);
  },
  
  discover: async (type: 'movie' | 'tv', genreId?: number, page: number = 1, keywordId?: number) => {
      const params: Record<string, string> = {
          page: page.toString(),
          sort_by: 'popularity.desc'
      };
      if (genreId) params.with_genres = genreId.toString();
      if (keywordId) params.with_keywords = keywordId.toString();
      
      return fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, params);
  },

  discoverByProvider: async (providerId: number, type: 'movie' | 'tv', page: number = 1) => {
      return fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, {
          with_watch_providers: providerId.toString(),
          watch_region: 'US',
          sort_by: 'popularity.desc',
          page: page.toString()
      });
  },

  getPersonDetails: async (personId: number) => {
      return fetchFromTMDB<PersonDetails>(`/person/${personId}`, {
          append_to_response: 'combined_credits'
      });
  },

  getCollectionDetails: async (collectionId: number) => {
      return fetchFromTMDB<CollectionDetails>(`/collection/${collectionId}`);
  },

  getPersonCredits: async (personId: number) => {
      return fetchFromTMDB<{cast: MediaItem[], crew: MediaItem[]}>(`/person/${personId}/combined_credits`);
  }
};