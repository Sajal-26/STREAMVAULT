import React, { useRef, useState } from 'react';
import { Link, useNavigate } from '../services/skipService';
import { Play, Info, X, Plus, Check, ThumbsUp } from 'lucide-react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import { useAuth } from '../context/AuthContext';

interface MediaCardProps {
  item: MediaItem;
  onRemove?: (id: number) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<'left' | 'center' | 'right'>('center');

  const title = item.title || item.name;
  const isPerson = item.media_type === 'person';
  const isCollection = item.media_type === 'collection';
  const isCompany = item.media_type === 'company';
  
  // Image Logic
  let imageKey: string | null | undefined = item.poster_path;
  if (isPerson) imageKey = item.profile_path;
  if (isCompany) imageKey = item.logo_path;

  const imageSize = isCompany ? 'w500' : 'w342';
  const imagePath = imageKey ? `${IMAGE_BASE_URL}/${imageSize}${imageKey}` : null;
  
  // Backdrop for hover state
  const backdropPath = item.backdrop_path ? `${IMAGE_BASE_URL}/w780${item.backdrop_path}` : imagePath;

  // Link Logic
  let linkTarget = `/details/${item.media_type || 'movie'}/${item.id}`;
  if (isPerson) linkTarget = `/person/${item.id}`;
  if (isCollection) linkTarget = `/collection/${item.id}`;
  if (isCompany) linkTarget = `/category/company_${item.id}`;

  const inWatchlist = watchlist.some(i => i.mediaId === item.id);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPerson || isCollection || isCompany) {
         if (isPerson) navigate(`/person/${item.id}`);
         if (isCollection) navigate(`/collection/${item.id}`);
         if (isCompany) navigate(`/category/company_${item.id}`);
         return;
    }

    if (item.media_type === 'movie') {
        navigate(`/watch/movie/${item.id}`);
    } else {
        const s = item.season || 1;
        const e = item.episode || 1;
        navigate(`/watch/tv/${item.id}/${s}/${e}`);
    }
  };

  const handleToggleList = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (inWatchlist) {
          removeFromWatchlist(item.id);
      } else {
          addToWatchlist({
              mediaId: item.id,
              mediaType: item.media_type as 'movie' | 'tv',
              title: title || '',
              posterPath: item.poster_path,
              voteAverage: item.vote_average,
              releaseDate: item.release_date || item.first_air_date
          });
      }
  };

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRemove) onRemove(item.id);
  };

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    
    // We scale to approx 1.75x width. 
    // If centered, it protrudes 0.375x width on each side.
    const overhang = rect.width * 0.4; 

    if (rect.left < overhang) {
        setHoverPos('left');
    } else if (viewportW - rect.right < overhang) {
        setHoverPos('right');
    } else {
        setHoverPos('center');
    }
  };

  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();
  const matchScore = item.vote_average ? Math.round(item.vote_average * 10) : 0;

  // --- STATIC CARDS (Person, Collection, Company) ---
  if (isPerson || isCollection || isCompany) {
      return (
        <Link to={linkTarget} className="block group w-full cursor-pointer relative">
            <div className="aspect-[2/3] rounded-md overflow-hidden bg-gray-800 mb-2 relative ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                {imagePath ? (
                    <img
                        src={imagePath}
                        alt={title}
                        className={`w-full h-full ${isCompany ? 'object-contain p-4 bg-white' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
                        loading="lazy"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-secondary p-2 text-center">
                        <span className="text-xs font-bold">{title}</span>
                    </div>
                )}
            </div>
            {!isCompany && (
                <div className="px-1">
                    <h3 className="text-white font-bold text-sm leading-tight truncate">{title}</h3>
                    {isPerson && item.character && (
                        <p className="text-gray-400 text-xs truncate">{item.character}</p>
                    )}
                </div>
            )}
        </Link>
      );
  }

  // --- PLAYABLE MEDIA CARD (Movies/TV) ---
  return (
    <div 
        ref={cardRef} 
        onMouseEnter={handleMouseEnter}
        className="relative w-full aspect-[2/3] group/card"
    >
      
      {/* 1. Base Static Card (Always Visible) */}
      {/* REMOVED: group-hover/card:opacity-0 logic. The base card now stays visible behind the popout. */}
      <div className="absolute inset-0 rounded-md overflow-hidden bg-gray-800 ring-1 ring-white/10 transition-opacity duration-300">
          {imagePath ? (
            <img
                src={imagePath}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-secondary p-2 text-center bg-gray-900">
                <span className="text-xs">{title}</span>
            </div>
          )}
          
          {/* Progress Bar (Base) */}
          {(item.progress !== undefined && item.progress > 0) && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm px-2 py-1">
                  <div className="w-full h-0.5 bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary" style={{ width: `${item.progress}%` }}></div>
                  </div>
              </div>
          )}
          
          {/* Always Visible Remove Button (if provided) */}
          {onRemove && (
              <button
                onClick={handleRemove}
                className="absolute top-1 right-1 z-20 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                title="Remove"
              >
                  <X className="w-3 h-3" />
              </button>
          )}
      </div>

      {/* 2. HOVER CARD (Pop-out) - Desktop Only */}
      <div className={`
          hidden md:block absolute top-1/2 
          w-[175%] bg-[#141414] rounded-lg shadow-2xl z-[60] 
          transition-all duration-300 ease-in-out delay-300 ring-1 ring-white/10 overflow-hidden
          opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto group-hover/card:scale-100 scale-95
          ${hoverPos === 'left' ? 'left-0 -translate-y-1/2 origin-left' : ''}
          ${hoverPos === 'center' ? 'left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center' : ''}
          ${hoverPos === 'right' ? 'right-0 -translate-y-1/2 origin-right' : ''}
      `}>
          
          {/* Top: Video/Backdrop Area (Aspect Video 16:9) */}
          <div className="relative aspect-video w-full bg-black">
              <img 
                src={backdropPath || ''} 
                alt={title} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#141414] to-transparent"></div>
              
              {/* Title Overlay on Image */}
              <h4 className="absolute bottom-2 left-3 text-white font-bold text-shadow-lg shadow-black text-sm md:text-base line-clamp-1 pr-12 z-10">
                  {title}
              </h4>

              {/* Hover Card Remove Button */}
              {onRemove && (
                  <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm ring-1 ring-white/20"
                    title="Remove from row"
                  >
                      <X className="w-4 h-4" />
                  </button>
              )}
          </div>

          {/* Bottom: Info Area */}
          <div className="p-3 bg-[#141414] flex flex-col gap-3 shadow-inner-top">
              
              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePlay} 
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition shadow-md"
                    title="Play"
                  >
                      <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                  </button>
                  <button 
                    onClick={handleToggleList} 
                    className="w-8 h-8 rounded-full border-2 border-gray-500 hover:border-white flex items-center justify-center transition text-white"
                    title={inWatchlist ? "Remove from List" : "Add to List"}
                  >
                      {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-500 hover:border-white flex items-center justify-center transition text-white cursor-pointer">
                      <ThumbsUp className="w-3.5 h-3.5" />
                  </div>

                  <Link 
                    to={linkTarget} 
                    className="w-8 h-8 rounded-full border-2 border-gray-500 hover:border-white flex items-center justify-center transition text-white ml-auto"
                    title="More Info"
                  >
                      <Info className="w-4 h-4" />
                  </Link>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-300">
                  <span className="text-green-400">{matchScore}% Match</span>
                  <span className="border border-gray-500 px-1 rounded text-[9px]">HD</span>
                  <span>{year}</span>
                  {item.media_type === 'tv' && <span>{item.season ? `S${item.season}` : 'Series'}</span>}
              </div>

              {/* Genres Row */}
              <div className="flex flex-wrap gap-1.5">
                  {item.genre_ids?.slice(0, 3).map(id => (
                      <span key={id} className="text-[10px] text-gray-400 capitalize flex items-center">
                          <span className="w-1 h-1 bg-gray-500 rounded-full mr-1.5"></span>
                          Genre
                      </span>
                  ))}
              </div>

              {/* Overview (Clamped) */}
              {item.overview && (
                  <p className="text-[10px] text-gray-400 line-clamp-3 leading-relaxed mt-1">
                      {item.overview}
                  </p>
              )}
          </div>
      </div>

      {/* Mobile Click Handler */}
      <Link 
        to={linkTarget} 
        className="md:hidden absolute inset-0 z-30"
        aria-label={`View details for ${title}`}
      />
    </div>
  );
};

export default MediaCard;