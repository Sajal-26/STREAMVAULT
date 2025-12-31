import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MediaItem, MediaDetails, Genre, SeasonDetails, PersonDetails } from '../types';

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams}`;
  
  // Using api.allorigins.win/raw as a fallback proxy since corsproxy.io is often rate-limited/blocked by TMDB.
  // This acts as a transparent proxy to bypass CORS/ISP blocks.
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('TMDB API Key is invalid or expired.');
      }
      if (response.status === 403) {
         throw new Error('TMDB API Access Forbidden (403). The Proxy or Key is rate-limited.');
      }
      throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Fetch failed for ${endpoint}:`, error);
    throw error;
  }
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