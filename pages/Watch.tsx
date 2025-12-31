import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching } = useAuth();
  const [showUI, setShowUI] = useState(true);
  const [playerUrl, setPlayerUrl] = useState<string>('');
  
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Track current episode state locally to handle internal player navigation updates
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  // Initialize Player URL
  // IMPORTANT: We only run this when ID or Type changes. 
  // We do NOT run this when season/episode changes in the URL, otherwise the iframe reloads 
  // and interrupts playback when we try to sync the URL with the player.
  useEffect(() => {
      const baseUrl = "https://player.videasy.net";
      const color = accentColor.replace('#', '');
      const commonParams = `?color=${color}&overlay=true&autoplayNextEpisode=true&episodeSelector=true&autoplay=true`;

      let src = "";
      if (type === 'movie') {
          src = `${baseUrl}/movie/${id}${commonParams}`;
      } else if (type === 'tv') {
          // Use initial params or default to 1
          const s = season || 1;
          const e = episode || 1;
          src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}&nextEpisode=true`;
      }
      setPlayerUrl(src);
  }, [type, id, accentColor]); // Intentionally exclude season/episode

  // Fetch initial details needed for Continue Watching entry
  useEffect(() => {
    const fetchDetails = async () => {
      if (!id || !type) return;
      try {
        const details = await tmdbService.getDetails(type as 'movie' | 'tv', parseInt(id));
        detailsRef.current = details;
        
        // Initial add (without progress) only if not already present
        addToContinueWatching({
          mediaId: parseInt(id),
          mediaType: type as 'movie' | 'tv',
          title: details.title || details.name || 'Unknown',
          posterPath: details.poster_path,
          voteAverage: details.vote_average,
          releaseDate: details.release_date || details.first_air_date,
          season: currentSeasonRef.current,
          episode: currentEpisodeRef.current,
          watchedAt: Date.now(),
          progress: 0,
          watchedDuration: 0,
          totalDuration: 0
        });
      } catch (error) {
        console.error("Failed to fetch details", error);
      }
    };
    fetchDetails();
  }, [id, type]); 

  // Listen for progress messages from Videasy
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          try {
              let data = event.data;
              
              if (typeof data === "string") {
                  try {
                      data = JSON.parse(data);
                  } catch (e) { return; }
              }

              if (!data) return;

              const payload = data.data || data.payload || data;

              // 1. Detect Episode Change (If supported by player)
              // Some players send metadata in the payload
              if (type === 'tv' && payload.season && payload.episode) {
                   const newSeason = parseInt(payload.season);
                   const newEpisode = parseInt(payload.episode);

                   if (newSeason !== currentSeasonRef.current || newEpisode !== currentEpisodeRef.current) {
                       currentSeasonRef.current = newSeason;
                       currentEpisodeRef.current = newEpisode;
                       
                       // Silently update URL without triggering React Router navigation (which would reload iframe)
                       const newPath = `/watch/tv/${id}/${newSeason}/${newEpisode}`;
                       window.history.replaceState(null, '', '#' + newPath);
                   }
              }

              // 2. Handle Progress
              const currentTime = payload.currentTime ?? payload.time ?? payload.position;
              const duration = payload.duration ?? payload.total ?? payload.length ?? payload.videoLength;

              if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
                  const now = Date.now();
                  
                  // Throttle updates
                  const isFirstProgress = lastUpdateRef.current === 0 && currentTime > 0;
                  if (!isFirstProgress && (now - lastUpdateRef.current < 2000)) {
                      return;
                  }
                  
                  lastUpdateRef.current = now;

                  if (detailsRef.current && id && type) {
                      const progressPercent = (currentTime / duration) * 100;
                      
                      addToContinueWatching({
                          mediaId: parseInt(id),
                          mediaType: type as 'movie' | 'tv',
                          title: detailsRef.current.title || detailsRef.current.name || 'Unknown',
                          posterPath: detailsRef.current.poster_path,
                          voteAverage: detailsRef.current.vote_average,
                          releaseDate: detailsRef.current.release_date || detailsRef.current.first_air_date,
                          season: currentSeasonRef.current,
                          episode: currentEpisodeRef.current,
                          watchedAt: Date.now(),
                          progress: progressPercent,
                          watchedDuration: currentTime,
                          totalDuration: duration
                      });
                  }
              }
          } catch (e) {
              console.error("Error handling player message", e);
          }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [id, type, addToContinueWatching]);

  // Auto-hide UI
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

  const handleBack = () => {
      // Navigate explicitly to details page instead of using -1 (history.back)
      // This ensures we land on a useful page even if the history stack is messy
      navigate(`/details/${type}/${id}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Back Button */}
      <div className={`absolute top-0 left-0 w-full p-4 z-50 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all transform hover:scale-110"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Video Player */}
      {playerUrl && (
          <iframe
            src={playerUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="encrypted-media; autoplay; picture-in-picture"
            title="StreamVault Player"
          />
      )}
    </div>
  );
};

export default Watch;