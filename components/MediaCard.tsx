import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface MediaCardProps {
  item: MediaItem;
}

const MediaCard: React.FC<MediaCardProps> = ({ item }) => {
  const title = item.title || item.name;
  const imagePath = item.poster_path ? `${IMAGE_BASE_URL}/w500${item.poster_path}` : 'https://picsum.photos/300/450?grayscale';

  return (
    <Link to={`/details/${item.media_type || 'movie'}/${item.id}`} className="group relative block w-full aspect-[2/3] overflow-hidden rounded-md bg-surface transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-2xl">
      <img
        src={imagePath}
        alt={title}
        className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        loading="lazy"
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/60 to-transparent">
        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-1">{title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-300">
           <span className="flex items-center text-green-400 font-medium">
             <Star className="w-3 h-3 mr-1 fill-current" />
             {item.vote_average?.toFixed(1)}
           </span>
           <span>
             {new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}
           </span>
        </div>
      </div>
    </Link>
  );
};

export default MediaCard;