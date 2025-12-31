import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching } = useAuth();
  const [showUI, setShowUI] = useState(true);

  // Track History / Continue Watching
  useEffect(() => {
    const trackHistory = async () => {
      if (!id || !type) return;
      try {
        // Fetch minimal details to save for history
        const details = await tmdbService.getDetails(type as 'movie' | 'tv', parseInt(id));
        
        addToContinueWatching({
          mediaId: parseInt(id),
          mediaType: type as 'movie' | 'tv',
          title: details.title || details.name || 'Unknown',
          posterPath: details.poster_path,
          voteAverage: details.vote_average,
          season: season ? parseInt(season) : undefined,
          episode: episode ? parseInt(episode) : undefined,
          watchedAt: Date.now()
        });
      } catch (error) {
        console.error("Failed to track history", error);
      }
    };

    trackHistory();
  }, [id, type, season, episode]);

  // Auto-hide UI (Back button) after inactivity
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timeout = setTimeout(() => setShowUI(false), 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Construct Player URL
  const baseUrl = "https://player.videasy.net";
  const color = accentColor.replace('#', '');
  // Added autoplay=true here
  const commonParams = `?color=${color}&overlay=true&autoplayNextEpisode=true&episodeSelector=true&autoplay=true`;

  let src = "";
  if (type === 'movie') {
      src = `${baseUrl}/movie/${id}${commonParams}`;
  } else if (type === 'tv') {
      const s = season || 1;
      const e = episode || 1;
      src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}&nextEpisode=true`;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Back Button */}
      <div className={`absolute top-0 left-0 w-full p-4 z-50 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all transform hover:scale-110"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Video Player */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        allowFullScreen
        allow="encrypted-media; autoplay; picture-in-picture"
        title="StreamVault Player"
      />
    </div>
  );
};

export default Watch;