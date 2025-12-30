import React from 'react';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { useAuth } from '../context/AuthContext';
import { MediaItem } from '../types';
import { ThumbsUp } from 'lucide-react';

const LikedContent: React.FC = () => {
  const { likedItems } = useAuth();

  const mapLikedToMedia = (item: any): MediaItem => ({
      id: item.mediaId,
      title: item.title,
      name: item.title,
      poster_path: item.posterPath,
      backdrop_path: null,
      overview: '',
      vote_average: item.voteAverage,
      media_type: item.mediaType
  });

  return (
    <div className="min-h-screen bg-background pt-24 text-primary">
      <Navbar />
      <div className="px-4 md:px-12">
        <div className="flex items-center space-x-3 mb-6">
            <ThumbsUp className="w-6 h-6 md:w-8 md:h-8 text-brand-primary fill-brand-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary">Liked Content</h1>
        </div>
        
        {likedItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {likedItems.map(item => (
              <MediaCard key={item.mediaId} item={mapLikedToMedia(item)} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            <p className="text-xl">You haven't liked any content yet.</p>
            <p className="text-sm mt-2">Hit the thumbs up button on movies and shows you enjoy!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedContent;