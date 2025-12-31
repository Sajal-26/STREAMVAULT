import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Play, Info, X, User } from 'lucide-react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface MediaCardProps {
  item: MediaItem;
  onRemove?: (id: number) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const title = item.title || item.name;
  
  // Logic for different media types (Movie/TV uses poster_path, Person uses profile_path)
  const imageKey = item.media_type === 'person' ? item.profile_path : item.poster_path;
  const imagePath = imageKey ? `${IMAGE_BASE_URL}/w342${imageKey}` : null;
  const mediaType = item.media_type || 'movie';

  const isPerson = mediaType === 'person';
  const isCollection = mediaType === 'collection'; // Note: Collections usually don't have a direct watch page in this flow, but search returns them

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPerson || isCollection) {
         // Cannot play a person or collection directly
         navigate(isPerson ? `/person/${item.id}` : `/details/movie/${item.id}`); // Fallback for collection to details? No, let's just go to info
         return;
    }

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
      if (!seconds) return '';
      const mins = Math.floor(seconds / 60);
      if (mins < 1) return '< 1 min';
      return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  // Determine link target
  let linkTarget = `/details/${mediaType}/${item.id}`;
  if (isPerson) linkTarget = `/person/${item.id}`;
  // For collections in search, we don't have a dedicated page, so we might point to search? 
  // Or if it came from search, it usually lacks 'parts'. 
  // Let's disable link for collection unless we build a page, OR assume it's a movie inside a collection context.
  // Current requirement doesn't specify collection page, just "section in details".
  // If clicked in search, let's just not link anywhere special or go to search for that collection name?
  // Actually, easiest is to treat collection clicks in Search as "Do nothing" or "Show items". 
  // For now, if collection, we disable the link overlay or just link to home.
  if (isCollection) linkTarget = "#"; 

  return (
    <div className="group/card relative block w-full aspect-[2/3] rounded-md bg-surface transition-all duration-300 hover:scale-110 hover:z-20 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-pointer ring-1 ring-white/5 hover:ring-white/20">
      <div className="absolute inset-0 overflow-hidden rounded-md bg-gray-800">
          {imagePath ? (
            <img
                src={imagePath}
                alt={title}
                className="h-full w-full object-cover transition-opacity duration-300 group-hover/card:opacity-40"
                loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary p-2 text-center">
                {isPerson ? <User className="w-12 h-12 mb-2 opacity-50" /> : <Info className="w-12 h-12 mb-2 opacity-50" />}
                <span className="text-xs">{title}</span>
            </div>
          )}
      </div>

      {/* Progress Bar (Visible Always if progress exists) */}
      {(item.progress !== undefined && item.progress > 0) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm px-2 py-1.5 rounded-b-md">
              <div className="flex items-center justify-between text-[11px] text-gray-200 mb-1 font-semibold">
                 <span>{formatWatchedTime(item.watchedDuration || 0)}</span>
              </div>
              <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
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

      {/* Default Link Overlay */}
      {mediaType !== 'collection' && (
          <Link 
            to={linkTarget} 
            className="absolute inset-0 z-0 rounded-md"
            aria-label={`View details for ${title}`}
          />
      )}

      {/* Hover Overlay Content */}
      <div className={`absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none bg-gradient-to-t from-black via-black/40 to-transparent rounded-md ${item.progress ? 'pb-10' : ''}`}>
        
        {/* Action Buttons - Hide for People/Collections */}
        {!isPerson && !isCollection && (
            <div className="flex gap-2 mb-3 pointer-events-auto transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                <button 
                    onClick={handlePlay}
                    className="flex-1 flex items-center justify-center bg-white text-black py-2 rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-lg"
                >
                    <Play className="w-3 h-3 mr-1 fill-black" /> Watch
                </button>
                <Link 
                    to={linkTarget}
                    className="flex-1 flex items-center justify-center bg-gray-600/60 text-white py-2 rounded font-bold text-xs hover:bg-gray-500 transition-colors backdrop-blur-sm shadow-lg border border-white/10"
                >
                    <Info className="w-3 h-3 mr-1" /> Info
                </Link>
            </div>
        )}

        {isPerson && (
             <div className="flex gap-2 mb-3 pointer-events-auto transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                <Link 
                    to={linkTarget}
                    className="flex-1 flex items-center justify-center bg-brand-primary text-white py-2 rounded font-bold text-xs hover:opacity-90 transition-colors shadow-lg"
                >
                    View Profile
                </Link>
            </div>
        )}

        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-1 drop-shadow-md">{title}</h3>
        {!isPerson && !isCollection && (
            <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center text-green-400 font-medium drop-shadow-md">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {item.vote_average?.toFixed(1)}
            </span>
            <span className="drop-shadow-md">
                {new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}
            </span>
            </div>
        )}
        {isPerson && <p className="text-xs text-gray-300">Person</p>}
        {isCollection && <p className="text-xs text-gray-300">Collection</p>}
      </div>
    </div>
  );
};

export default MediaCard;