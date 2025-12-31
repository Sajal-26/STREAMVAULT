import React from 'react';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { useAuth } from '../context/AuthContext';
import { MediaItem } from '../types';

const Watchlist: React.FC = () => {
  const { watchlist } = useAuth();

  const mapWatchlistToMedia = (item: any): MediaItem => ({
      id: item.mediaId,
      title: item.title,
      name: item.title,
      poster_path: item.posterPath,
      backdrop_path: null,
      overview: '',
      vote_average: item.voteAverage,
      media_type: item.mediaType,
      release_date: item.releaseDate,
      first_air_date: item.releaseDate
  });

  return (
    <div className="min-h-screen bg-background pt-24 text-primary">
      <Navbar />
      <div className="px-4 md:px-12">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6">My List</h1>
        
        {watchlist.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {watchlist.map(item => (
              <MediaCard key={item.mediaId} item={mapWatchlistToMedia(item)} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            <p className="text-xl">Your watchlist is empty.</p>
            <p className="text-sm mt-2">Start adding movies and shows you want to watch!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;