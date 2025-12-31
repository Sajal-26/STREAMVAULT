import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MediaItem, MediaDetails, Genre, SeasonDetails, PersonDetails } from '../types';

// List of proxies to rotate through if one fails
// This is necessary because public proxies often get rate-limited or blocked by TMDB
const PROXY_GENERATORS = [
    // Option 1: CodeTabs - Usually reliable for simple GET requests
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    // Option 2: CorsProxy.io - Fast, but frequently 403s due to high traffic
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Option 3: AllOrigins - Good fallback, but sometimes returns 522/520 if TMDB blocks their IP
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // Option 4: ThingProxy - Another backup
    (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`
];

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const targetUrl = `${TMDB_BASE_URL}${endpoint}?${queryParams}`;
  
  let lastError: any;

  // Try proxies in sequence
  for (const generateProxyUrl of PROXY_GENERATORS) {
      const proxyUrl = generateProxyUrl(targetUrl);
      
      try {
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
              // If it's a 4xx client error (except 403/429), it might be a valid API error (e.g. 404 movie not found)
              // We shouldn't rotate for 404s.
              if (response.status === 404) {
                 throw new Error('Resource not found (404)');
              }

              // 401: Invalid API Key - Don't rotate, the key is wrong.
              if (response.status === 401) {
                  throw new Error('TMDB API Key is invalid or expired.');
              }

              // For 403 (Forbidden), 429 (Too Many Requests), or 5xx (Server Error), 
              // it's likely a proxy issue or rate limit. Try the next proxy.
              if (response.status === 403 || response.status === 429 || response.status >= 500) {
                  console.warn(`Proxy ${proxyUrl} returned ${response.status}. Rotating...`);
                  continue; // Try next proxy
              }
              
              throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
          }
          
          return response.json();

      } catch (error: any) {
          // Network errors (CORS, offline, etc) catch here.
          console.warn(`Proxy fetch failed for ${proxyUrl}:`, error.message);
          lastError = error;
          // Continue to next proxy
      }
  }

  // If we get here, all proxies failed
  console.error("All proxies failed for URL:", targetUrl);
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
      append_to_response: 'videos,credits,similar',
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