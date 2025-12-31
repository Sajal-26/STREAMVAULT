export interface WatchlistItem {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  voteAverage: number;
}

export interface ContinueWatchingItem extends WatchlistItem {
  season?: number;
  episode?: number;
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
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  character?: string; // For cast credits
  job?: string; // For crew credits
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
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
}

export interface Image {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  iso_639_1: string | null;
}

export interface MediaDetails extends MediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  seasons?: { season_number: number; name: string; episode_count: number }[];
  tagline?: string;
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