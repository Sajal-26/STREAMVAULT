import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Play, Info, X } from 'lucide-react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface MediaCardProps {
  item: MediaItem;
  onRemove?: (id: number) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const title = item.title || item.name;
  const imagePath = item.poster_path ? `${IMAGE_BASE_URL}/w500${item.poster_path}` : 'https://picsum.photos/300/450?grayscale';
  const mediaType = item.media_type || 'movie';

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mediaType === 'movie') {
        navigate(`/watch/movie/${item.id}`);
    } else {
        // Default to S1 E1
        navigate(`/watch/tv/${item.id}/1/1`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRemove) onRemove(item.id);
  };

  const formatWatchedTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      if (mins < 1) return '< 1 min';
      return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="group/card relative block w-full aspect-[2/3] overflow-hidden rounded-md bg-surface transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-2xl">
      <img
        src={imagePath}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110 group-hover/card:opacity-40"
        loading="lazy"
      />

      {/* Progress Bar (Visible Always if progress exists) */}
      {(item.progress !== undefined && item.progress > 0) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-sm p-2">
              <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1 font-medium">
                 <span>{item.watchedDuration ? formatWatchedTime(item.watchedDuration) : ''}</span>
                 <span>{Math.round(item.progress)}%</span>
              </div>
              <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary rounded-full transition-all duration-300" 
                    style={{ width: `${item.progress}%` }}
                  ></div>
              </div>
          </div>
      )}
      
      {/* Remove Button (For Continue Watching) */}
      {onRemove && (
          <button
            onClick={handleRemove}
            className="absolute top-1 right-1 z-30 p-1.5 bg-black/60 text-white rounded-full hover:bg-brand-primary transition-colors opacity-0 group-hover/card:opacity-100"
            title="Remove from Continue Watching"
          >
              <X className="w-3 h-3" />
          </button>
      )}

      {/* Default Link Overlay (Invisible, covers whole card for navigation if not clicking buttons) */}
      <Link 
        to={`/details/${mediaType}/${item.id}`} 
        className="absolute inset-0 z-0"
        aria-label={`View details for ${title}`}
      />

      {/* Hover Overlay Content */}
      <div className={`absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none bg-gradient-to-t from-black via-black/40 to-transparent ${item.progress ? 'pb-12' : ''}`}>
        
        {/* Action Buttons - Pointer events auto to allow clicking */}
        <div className="flex gap-2 mb-3 pointer-events-auto transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
            <button 
                onClick={handlePlay}
                className="flex-1 flex items-center justify-center bg-white text-black py-2 rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-lg"
            >
                <Play className="w-3 h-3 mr-1 fill-black" /> Watch
            </button>
            <Link 
                to={`/details/${mediaType}/${item.id}`}
                className="flex-1 flex items-center justify-center bg-gray-600/60 text-white py-2 rounded font-bold text-xs hover:bg-gray-500 transition-colors backdrop-blur-sm shadow-lg border border-white/10"
            >
                <Info className="w-3 h-3 mr-1" /> Info
            </Link>
        </div>

        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-1 drop-shadow-md">{title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-300">
           <span className="flex items-center text-green-400 font-medium drop-shadow-md">
             <Star className="w-3 h-3 mr-1 fill-current" />
             {item.vote_average?.toFixed(1)}
           </span>
           <span className="drop-shadow-md">
             {new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}
           </span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;