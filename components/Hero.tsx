import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from '../services/skipService';
import { Play, Info, ChevronLeft, ChevronRight, Star, Calendar, Clock } from 'lucide-react';
import { MediaItem } from '../types';
import { tmdbService } from '../services/tmdb';
import { IMAGE_BASE_URL } from '../constants';

interface HeroProps {
  items: MediaItem[];
}

const Hero: React.FC<HeroProps> = ({ items }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Current Item Details
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [genres, setGenres] = useState<{id: number, name: string}[]>([]);
  const [runtime, setRuntime] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);

  const item = items[currentIndex];

  useEffect(() => {
    const fetchHeroDetails = async () => {
      if (item) {
        const mediaType = item.media_type || 'movie';
        // Only fetch if movie or tv
        if (mediaType !== 'movie' && mediaType !== 'tv') return;

        try {
           // Fetch full details
           const res = await tmdbService.getDetails(mediaType, item.id);
           
           // Logo
           const logos = res.images?.logos || [];
           const englishLogo = logos.find(l => l.iso_639_1 === 'en');
           setLogoPath(englishLogo ? englishLogo.file_path : (logos[0]?.file_path || null));

           // Genres
           setGenres(res.genres || []);

           // Runtime / Rating
           setRuntime(res.runtime || (res.episode_run_time ? res.episode_run_time[0] : null));
           setRating(res.vote_average);

        } catch (e) {
          console.error("Failed to fetch hero details", e);
        }
      }
    };

    fetchHeroDetails();
  }, [item]);

  const changeSlide = useCallback((direction: 'next' | 'prev') => {
      if (isAnimating || items.length <= 1) return;
      setIsAnimating(true);
      
      setTimeout(() => {
          setCurrentIndex(prev => {
              if (direction === 'next') return (prev + 1) % items.length;
              return (prev - 1 + items.length) % items.length;
          });
          setIsAnimating(false);
      }, 500); // Wait for fade out
  }, [isAnimating, items.length]);

  if (!item) return <div className="h-[60vh] md:h-[95vh] bg-gray-900 animate-pulse" />;

  const backdrop = item.backdrop_path ? `${IMAGE_BASE_URL}/original${item.backdrop_path}` : null;
  
  const handlePlay = () => {
      const type = item.media_type || 'movie';
      if (type === 'tv') {
          navigate(`/watch/tv/${item.id}/1/1`);
      } else if (type === 'movie') {
          navigate(`/watch/movie/${item.id}`);
      }
  };

  const linkTarget = item.media_type === 'person' 
     ? `/person/${item.id}`
     : `/details/${item.media_type || 'movie'}/${item.id}`;

  const year = new Date(item.release_date || item.first_air_date || '').getFullYear();
  const formatRuntime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
  };

  return (
    <div className="relative h-[65vh] md:h-[95vh] w-full overflow-hidden group bg-black">
      
      {/* Background Image with Transition */}
      <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        {backdrop ? (
            <img 
              src={backdrop} 
              alt={item.title} 
              className="w-full h-full object-cover opacity-70"
            />
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
        )}
      </div>

      {/* Heavy Gradient Overlays for Cinematic Look */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
      
      {/* Navigation Buttons - Absolute positioned at edges */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-2 md:px-4 z-30">
          <button 
            onClick={() => changeSlide('prev')}
            className="pointer-events-auto p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all transform hover:scale-110 group/btn"
          >
              <ChevronLeft className="w-8 h-8 md:w-12 md:h-12 drop-shadow-lg" />
          </button>
          
          <button 
            onClick={() => changeSlide('next')}
            className="pointer-events-auto p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all transform hover:scale-110 group/btn"
          >
              <ChevronRight className="w-8 h-8 md:w-12 md:h-12 drop-shadow-lg" />
          </button>
      </div>

      {/* Content Container - Align Bottom Left */}
      <div className={`absolute inset-0 flex flex-col justify-end px-4 md:px-16 lg:px-24 pb-24 md:pb-48 max-w-7xl transition-opacity duration-500 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'} z-20 pointer-events-none`}>
        <div className="max-w-3xl pointer-events-auto">
            {/* Logo or Title */}
            {logoPath ? (
            <img 
                src={`${IMAGE_BASE_URL}/w500${logoPath}`} 
                alt={item.title} 
                className="w-2/3 md:w-1/2 max-w-[300px] md:max-w-[450px] max-h-[120px] md:max-h-[180px] object-contain mb-6 origin-left drop-shadow-2xl"
            />
            ) : (
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-4 drop-shadow-lg tracking-tight leading-tight">
                {item.title || item.name}
            </h1>
            )}
            
            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-200 mb-6">
                <div className="flex items-center text-yellow-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    <span>{rating.toFixed(1)}/10</span>
                </div>
                
                {year && (
                    <div className="flex items-center text-gray-200 bg-white/10 px-2 py-1 rounded backdrop-blur-md">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {year}
                    </div>
                )}
                
                {runtime && (
                    <div className="flex items-center text-gray-200 bg-white/10 px-2 py-1 rounded backdrop-blur-md">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {formatRuntime(runtime)}
                    </div>
                )}
                
                {genres.slice(0, 3).map(g => (
                    <span key={g.id} className="text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs">
                        {g.name}
                    </span>
                ))}
            </div>

            <p className="hidden md:block text-base md:text-lg text-gray-300 line-clamp-3 mb-8 drop-shadow-md max-w-2xl leading-relaxed text-shadow-sm">
            {item.overview}
            </p>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={handlePlay}
                    className="flex items-center px-6 md:px-8 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-all transform hover:scale-105 text-base md:text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-black" />
                    Play
                </button>
                
                <Link 
                    to={linkTarget}
                    className="flex items-center px-6 md:px-8 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg font-bold hover:bg-white/20 transition-all transform hover:scale-105 text-base md:text-lg border border-white/10"
                >
                    <Info className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                    See More
                </Link>
            </div>
        </div>
      </div>
      
      {/* Carousel Indicators - Moved up to avoid overlap */}
      <div className="absolute bottom-16 right-8 md:right-16 flex space-x-2 z-30">
          {items.map((_, idx) => (
              <button 
                key={idx} 
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'}`}
              />
          ))}
      </div>
    </div>
  );
};

export default Hero;