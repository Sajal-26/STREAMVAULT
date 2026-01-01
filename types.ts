

export interface WatchlistItem {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
}

export interface ContinueWatchingItem extends WatchlistItem {
  season?: number;
  episode?: number;
  watchedAt: number;
  progress?: number; // Percentage (0-100)
  watchedDuration?: number; // Seconds watched
  totalDuration?: number; // Total duration in seconds
}

export interface WatchHistoryItem extends WatchlistItem {
  watchedAt: number;
}

export interface LikedItem extends WatchlistItem {
  likedAt?: string;
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  profile_path?: string | null; // For People
  logo_path?: string | null; // For Companies
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count?: number; // Added for filtering
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'person' | 'collection' | 'company';
  original_language?: string;
  genre_ids?: number[];
  character?: string; // For cast credits
  job?: string; // For crew credits
  progress?: number; // Optional progress for UI
  watchedDuration?: number; // Optional duration for UI
  totalDuration?: number; // Optional total duration for UI
  season?: number; // Optional season for Continue Watching context
  episode?: number; // Optional episode for Continue Watching context
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
  season_number?: number; // Added for next_episode context
  vote_average: number;
  runtime?: number;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode[];
  vote_average?: number; // Some endpoints provide this
  videos?: {
    results: { key: string; type: string; site: string; name: string }[];
  };
}

export interface Image {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  iso_639_1: string | null;
}

export interface BelongsToCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface CollectionDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: MediaItem[];
}

export interface Company {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface MediaDetails extends MediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: { season_number: number; name: string; episode_count: number; air_date?: string }[];
  tagline?: string;
  status?: string; // Added
  last_air_date?: string; // Added
  next_episode_to_air?: Episode | null; // Added
  production_companies?: Company[]; // Added
  networks?: Network[]; // Added
  videos?: {
    results: { key: string; type: string; site: string; name: string }[];
  };
  images?: {
    logos: Image[];
    backdrops: Image[];
  };
  credits?: {
    cast: { id: number; name: string; profile_path: string | null; character: string }[];
    crew: { id: number; name: string; job: string }[];
  };
  similar?: {
    results: MediaItem[];
  };
  created_by?: { id: number; name: string }[];
  belongs_to_collection?: BelongsToCollection | null;
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  combined_credits: {
    cast: MediaItem[];
    crew: MediaItem[];
  };
}

export interface Genre {
  id: number;
  name: string;
}