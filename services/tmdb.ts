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

// Helper: Auto-detect region
// Caches result in localStorage to avoid repeated API calls
const getRegion = async (): Promise<string> => {
    const cached = localStorage.getItem('sv_user_region');
    if (cached) return cached;

    try {
        // Use geojs.io for lightweight country lookup
        const res = await fetch('https://get.geojs.io/v1/ip/country.json');
        if (res.ok) {
            const data = await res.json();
            const country = data.country || 'US';
            localStorage.setItem('sv_user_region', country);
            return country;
        }
    } catch (e) {
        console.warn("Failed to auto-detect region, defaulting to US", e);
    }
    return 'US';
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
    return fetchFromTMDB<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`, {
        append_to_response: 'videos'
    });
  },

  search: async (query: string) => {
    return fetchFromTMDB<{ results: MediaItem[] }>('/search/multi', { query });
  },

  // Added: Search specifically for collections to merge into search results if needed
  searchCollections: async (query: string) => {
    return fetchFromTMDB<{ results: MediaItem[] }>('/search/collection', { query });
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
      // Auto-detect region
      const region = await getRegion();
      
      // 1. Try fetching with the detected region
      let res = await fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, {
          with_watch_providers: providerId.toString(),
          watch_region: region,
          sort_by: 'popularity.desc'
      });

      // 2. Fallback: If results are sparse (< 10), try without region (defaults to US usually)
      if (!res.results || res.results.length < 10) {
          // console.log(`Sparse results for provider ${providerId} in ${region}, falling back to default/US`);
          res = await fetchFromTMDB<{ results: MediaItem[] }>(`/discover/${type}`, {
              with_watch_providers: providerId.toString(),
              sort_by: 'popularity.desc'
          });
      }

      return res;
  },

  getPersonDetails: async (personId: number) => {
      return fetchFromTMDB<PersonDetails>(`/person/${personId}`, {
          append_to_response: 'combined_credits'
      });
  },

  // Added: Fetch Collection Details
  getCollectionDetails: async (collectionId: number) => {
      return fetchFromTMDB<CollectionDetails>(`/collection/${collectionId}`);
  },

  // Added: Get combined credits for a person (for "More from X" section)
  getPersonCredits: async (personId: number) => {
      return fetchFromTMDB<{cast: MediaItem[], crew: MediaItem[]}>(`/person/${personId}/combined_credits`);
  }
};