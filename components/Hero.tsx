import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { MediaItem } from '../types';
import { tmdbService } from '../services/tmdb';
import { IMAGE_BASE_URL } from '../constants';

interface HeroProps {
  item: MediaItem | null;
}

const Hero: React.FC<HeroProps> = ({ item }) => {
  const navigate = useNavigate();
  const [logoPath, setLogoPath] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeroDetails = async () => {
      if (item) {
        // Fix: Ensure we only fetch details for movies or tv shows.
        const mediaType = item.media_type;
        if (mediaType !== 'movie' && mediaType !== 'tv') return;

        try {
           // Fetch full details to get the logo
           const res = await tmdbService.getDetails(mediaType, item.id);
           
           // Find Logo (prefer English PNG)
           const logos = res.images?.logos || [];
           const englishLogo = logos.find(l => l.iso_639_1 === 'en');
           setLogoPath(englishLogo ? englishLogo.file_path : (logos[0]?.file_path || null));

        } catch (e) {
          console.error("Failed to fetch hero details", e);
        }
      }
    };

    fetchHeroDetails();
  }, [item]);

  if (!item) return <div className="h-[60vh] md:h-[85vh] bg-gray-900 animate-pulse" />;

  const backdrop = item.backdrop_path ? `${IMAGE_BASE_URL}/w1280${item.backdrop_path}` : null;
  
  const handlePlay = () => {
      const type = item.media_type || 'movie';
      if (type === 'tv') {
          navigate(`/watch/tv/${item.id}/1/1`);
      } else if (type === 'movie') {
          navigate(`/watch/movie/${item.id}`);
      }
  };

  // Determine correct info link
  const linkTarget = item.media_type === 'person' 
     ? `/person/${item.id}`
     : `/details/${item.media_type || 'movie'}/${item.id}`;

  return (
    <div className="relative h-[60vh] md:h-[85vh] w-full overflow-hidden group bg-gray-900">
      {/* Background Image */}
      <div className="absolute inset-0">
        {backdrop ? (
            <img 
              src={backdrop} 
              alt={item.title} 
              className="w-full h-full object-cover"
            />
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
        )}
      </div>

      {/* Gradient Overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pt-24 px-4 md:px-12 max-w-5xl pb-32 md:pb-48">
        
        {/* Logo or Title */}
        {logoPath ? (
           <img 
             src={`${IMAGE_BASE_URL}/w500${logoPath}`} 
             alt={item.title} 
             className="w-2/3 md:w-1/2 max-w-[500px] max-h-[200px] object-contain mb-6 md:mb-8 origin-left transition-transform duration-700 drop-shadow-2xl"
           />
        ) : (
           <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 md:mb-4 drop-shadow-lg tracking-tight leading-tight pt-10">
             {item.title || item.name}
           </h1>
        )}
        
        <p className="hidden md:block text-base md:text-lg text-gray-200 line-clamp-3 mb-6 md:mb-8 max-w-2xl drop-shadow-md">
          {item.overview}
        </p>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlay}
            className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-white text-black rounded-md font-bold hover:bg-opacity-90 transition transform hover:scale-105 text-sm md:text-base"
          >
            <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-black" />
            Play
          </button>
          
          <Link 
            to={linkTarget}
            className="flex items-center px-4 md:px-6 py-2 md:py-3 bg-gray-600/70 backdrop-blur-sm text-white rounded-md font-bold hover:bg-gray-600 transition transform hover:scale-105 text-sm md:text-base"
          >
            <Info className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;