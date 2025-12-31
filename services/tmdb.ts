import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MediaItem, MediaDetails, Genre, SeasonDetails, PersonDetails } from '../types';

// PROXY CONFIGURATION
// We rotate through these if one fails or times out.
// 'raw' endpoints are preferred to avoid JSON parsing issues.
const PROXY_GENERATORS = [
    // Primary: Very reliable, good for bypassing blocks (Slower but works)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // Secondary: Usually fastest, but often blocks cloud IPs (403)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Tertiary: Backup
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

// Helper: Fetch with a robust timeout to prevent mobile hanging but allow for slow networks
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

  // Attempt Loop: Try proxies in order
  for (const generateProxyUrl of PROXY_GENERATORS) {
      const proxyUrl = generateProxyUrl(targetUrl);
      
      try {
          // 15s timeout: Mobile networks can be slow. 
          const response = await fetchWithTimeout(proxyUrl, 15000); 
          
          if (!response.ok) {
              // 404 is a real error (not found), 401 is bad key. Return immediately.
              if (response.status === 404) throw new Error('Resource not found (404)');
              if (response.status === 401) throw new Error('TMDB API Key is invalid.');
              
              // 403 (Forbidden) usually means the Proxy blocked us.
              // 429 (Too Many Requests) means rate limit.
              // 5xx means proxy server error.
              // In all these cases, we try the next proxy.
              console.warn(`Proxy ${proxyUrl} failed with status ${response.status}`);
              continue; 
          }
          
          return await response.json();

      } catch (error: any) {
          // Timeout or Network Error (TypeError: Failed to fetch) -> Try next proxy
          console.warn(`Proxy ${proxyUrl} failed:`, error.message);
          lastError = error;
      }
  }

  console.error(`All proxies failed for URL: ${targetUrl}`, lastError);
  throw lastError || new Error('Failed to fetch data from TMDB via any proxy.');
};

export const tmdbService = {
  getTrending: async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week') => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/trending/${mediaType}/${timeWindow}`);
  },

  getPopular: async (type: 'movie' | 'tv') => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/${type}/popular`);
  },

  getTopRated: async (type: 'movie' | 'tv') => {
    return fetchFromTMDB<{ results: MediaItem[] }>(`/${type}/top_rated`);
  },

  getDetails: async (type: 'movie' | 'tv', id: number) => {
    return fetchFromTMDB<MediaDetails>(`/${type}/${id}`, {
      append_to_response: 'videos,credits,similar,images',
      include_image_language: 'en,null'
    });
  },

  getSeasonDetails: async (tvId: number, seasonNumber: number) => {
    return fetchFromTMDB<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
  },

  search: async (query: string) => {
    return fetchFromTMDB<{ results: MediaItem[] }>('/search/multi', { query });
  },

  getGenres: async (type: 'movie' | 'tv') => {
    return fetchFromTMDB<{ genres: Genre[] }>(`/genre/${type}/list`);
  },
  
  discover: async (type: 'movie' | 'tv', genreId?: number, page: number = 1) => {
      const params: Record<string, string> = {
          page: page.toString(),
          sort_by: 'popularity.desc'
      };
      if (genreId) params.with_genres = genreId.toString();
      return fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, params);
  },

  discoverByProvider: async (providerId: number, type: 'movie' | 'tv') => {
      return fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, {
          with_watch_providers: providerId.toString(),
          watch_region: 'US'
      });
  },

  getPersonDetails: async (personId: number) => {
      return fetchFromTMDB<PersonDetails>(`/person/${personId}`, {
          append_to_response: 'combined_credits'
      });
  }
};