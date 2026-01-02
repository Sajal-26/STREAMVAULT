import React from 'react';
import { Link, useNavigate } from '../services/skipService';
import { Play, Info, X, Plus, Check } from 'lucide-react';
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

  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();
  const matchScore = item.vote_average ? Math.round(item.vote_average * 10) : 0;

  // --- RENDER FOR CAST / PERSON (New Design: Text Below Image) ---
  if (isPerson) {
      return (
        <Link to={linkTarget} className="block group w-full cursor-pointer">
            <div className="aspect-[2/3] rounded-md overflow-hidden bg-gray-800 mb-2 relative ring-1 ring-white/10 group-hover:ring-white/30 transition-all">
                {imagePath ? (
                    <img
                        src={imagePath}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-secondary">
                        <span className="text-xs text-center p-2">{title}</span>
                    </div>
                )}
            </div>
            <div className="px-1">
                <h3 className="text-white font-bold text-sm leading-tight truncate">{title}</h3>
                {item.character && (
                    <p className="text-gray-400 text-xs truncate">{item.character}</p>
                )}
            </div>
        </Link>
      );
  }

  // --- RENDER FOR COLLECTIONS / COMPANIES ---
  if (isCollection || isCompany) {
      return (
        <Link to={linkTarget} className="group relative block w-full aspect-[2/3] rounded-md bg-gray-800 overflow-hidden ring-1 ring-white/10 hover:ring-brand-primary transition-all">
             <div className={`absolute inset-0 ${isCompany ? 'bg-white p-4 flex items-center justify-center' : ''}`}>
                {imagePath ? (
                    <img
                        src={imagePath}
                        alt={title}
                        className={`w-full h-full ${isCompany ? 'object-contain' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-secondary p-2 text-center">
                        <span className="text-xs font-bold">{title}</span>
                    </div>
                )}
             </div>
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-xs font-bold text-white uppercase tracking-wider border border-white px-2 py-1 rounded">View</span>
             </div>
        </Link>
      );
  }

  // --- RENDER FOR MOVIES / TV (HOVER CARD STYLE) ---
  return (
    <div className="relative w-full aspect-[2/3] group/card">
      {/* 1. Base Static Card (Visible on Mobile, Base on Desktop) */}
      <div className="absolute inset-0 rounded-md overflow-hidden bg-gray-800 ring-1 ring-white/10">
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
          
          {/* Continue Watching Progress (Base Card) */}
          {(item.progress !== undefined && item.progress > 0) && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm px-2 py-1">
                  <div className="flex items-center justify-between text-[9px] text-gray-300 mb-0.5">
                     <span className="truncate max-w-[60px]">{item.media_type === 'tv' ? `S${item.season} E${item.episode}` : 'Resume'}</span>
                  </div>
                  <div className="w-full h-0.5 bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary" style={{ width: `${item.progress}%` }}></div>
                  </div>
              </div>
          )}
          
          {/* Always Visible Remove Button */}
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

      {/* 2. Hover Overlay Card (Desktop Only) */}
      {/* 
          Geometry: 
          Width 130% -> Left -15% (Centers horizontally)
          Height 160% -> Top -30% (Centers vertically)
          This ensures the card expands evenly from the center.
      */}
      <div className="hidden md:block absolute top-[-30%] left-[-15%] w-[130%] h-[160%] bg-[#141414] rounded-lg shadow-2xl z-50 opacity-0 scale-95 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 delay-150 origin-center pointer-events-none group-hover/card:pointer-events-auto ring-1 ring-white/10 overflow-hidden">
          
          {/* Preview Image Area (Takes up more space now to maintain visual scale) */}
          <div className="relative h-[65%] w-full bg-black">
              {item.backdrop_path ? (
                  <img src={`${IMAGE_BASE_URL}/w300${item.backdrop_path}`} alt={title} className="w-full h-full object-cover" />
              ) : (
                  <img src={imagePath || ''} alt={title} className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#141414] to-transparent"></div>
              <h4 className="absolute bottom-3 left-3 text-white font-bold text-shadow shadow-black text-sm line-clamp-1 pr-2">{title}</h4>
          </div>

          {/* Action & Info Area */}
          <div className="h-[35%] p-3 flex flex-col justify-between bg-[#141414]">
              
              {/* Buttons */}
              <div className="flex items-center gap-2">
                  <button onClick={handlePlay} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition shadow-md">
                      <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                  </button>
                  <button onClick={handleToggleList} className="w-8 h-8 rounded-full border-2 border-gray-500 hover:border-white flex items-center justify-center transition text-white">
                      {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                  <Link to={linkTarget} className="w-8 h-8 rounded-full border-2 border-gray-500 hover:border-white flex items-center justify-center transition text-white ml-auto">
                      <Info className="w-4 h-4" />
                  </Link>
              </div>

              {/* Metadata */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-gray-300">
                  <span className="text-green-400 font-bold">{matchScore}% Match</span>
                  <span className="border border-gray-500 px-1 rounded text-[9px] leading-tight">HD</span>
                  <span>{year}</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1 mt-1">
                  {item.genre_ids?.slice(0, 3).map(id => (
                      <span key={id} className="text-[10px] text-gray-400 flex items-center">
                         <span className="w-1 h-1 bg-gray-600 rounded-full mr-1"></span> Genre
                      </span>
                  ))}
              </div>
          </div>
      </div>

      {/* Mobile Click Handler (Invisible Link Layer) */}
      <Link 
        to={linkTarget} 
        className="md:hidden absolute inset-0 z-30"
        aria-label={`View details for ${title}`}
      />
    </div>
  );
};

export default MediaCard;