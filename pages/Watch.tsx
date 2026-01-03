import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching, removeFromContinueWatching, addToWatchHistory } = useAuth();
  const [showUI, setShowUI] = useState(true);
  const [playerUrl, setPlayerUrl] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const addedToHistoryRef = useRef<boolean>(false);
  
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  // Initialize Player URL (Vidify)
  useEffect(() => {
      const baseUrl = "https://player.vidify.top/embed";
      const color = accentColor.replace('#', '');
      
      // Config: Netflix-like (using app accent color), autoplay enabled, essential settings only.
      // Removed logo as requested.
      const commonParams = `?primarycolor=${color}&secondarycolor=${color}&iconcolor=${color}&autoplay=true`;

      let src = "";
      if (type === 'movie') {
          src = `${baseUrl}/movie/${id}${commonParams}`;
      } else if (type === 'tv') {
          const s = season || 1;
          const e = episode || 1;
          src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}`;
      }
      setPlayerUrl(src);
      // Reset history flag on navigation
      addedToHistoryRef.current = false;
  }, [type, id, accentColor, season, episode]); 

  // Fetch Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      if (!id || !type) return;
      
      const s = currentSeasonRef.current;
      const e = currentEpisodeRef.current;

      try {
        const details = await tmdbService.getDetails(type as 'movie' | 'tv', parseInt(id));
        detailsRef.current = details;

        // Update Continue Watching (Start)
        addToContinueWatching({
          mediaId: parseInt(id),
          mediaType: type as 'movie' | 'tv',
          title: details.title || details.name || 'Unknown',
          posterPath: details.poster_path,
          voteAverage: details.vote_average,
          releaseDate: details.release_date || details.first_air_date,
          season: s,
          episode: e,
          watchedAt: Date.now(),
          progress: 0,
          watchedDuration: 0,
          totalDuration: 0
        });
      } catch (error) {
        console.error("Failed to fetch metadata", error);
      }
    };
    fetchMeta();
  }, [id, type, season, episode]); 

  // Player Communication & Logic Loop (Vidify Watch Progress)
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          // Vidify sends data in event.data with type 'WATCH_PROGRESS'
          const data = event.data;
          
          if (data?.type === 'WATCH_PROGRESS' && data.data) {
              const { currentTime, duration, eventType } = data.data;

              // Handle Episode Change if detected (optional, usually internal to player but we track URL)
              // Since Vidify is an embed, it might not push navigation events out for season/episode changes cleanly
              // outside of what we control via URL. We rely on the user navigating or 'next' buttons if implemented.

              if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
                  const now = Date.now();
                  const progressPercent = (currentTime / duration) * 100;
                  
                  // Logic: > 90% -> Add to Watch History (Completed)
                  if (progressPercent > 90 && !addedToHistoryRef.current && detailsRef.current) {
                      addToWatchHistory({
                          mediaId: parseInt(id!),
                          mediaType: type as 'movie' | 'tv',
                          title: detailsRef.current.title || detailsRef.current.name || 'Unknown',
                          posterPath: detailsRef.current.poster_path,
                          voteAverage: detailsRef.current.vote_average,
                          releaseDate: detailsRef.current.release_date || detailsRef.current.first_air_date,
                          watchedAt: Date.now()
                      });
                      addedToHistoryRef.current = true;
                  }

                  // Logic: > 95% -> Remove from Continue Watching
                  if (progressPercent > 95) {
                      removeFromContinueWatching(parseInt(id!));
                  } else if (now - lastUpdateRef.current > 5000 && eventType !== 'pause') { 
                      // Only update continue watching every 5s if under 95%
                      lastUpdateRef.current = now;
                      if (detailsRef.current && id && type) {
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
              }
          }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [id, type, addToContinueWatching, removeFromContinueWatching, addToWatchHistory, navigate]);

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

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden group font-sans select-none">
      {/* Top Controls (Back) */}
      <div className={`absolute top-0 left-0 w-full p-6 z-50 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => navigate(`/details/${type}/${id}`)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md transition-all transform hover:scale-110 border border-white/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Video Player */}
      {playerUrl && (
          <iframe
            ref={iframeRef}
            src={playerUrl}
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            allow="encrypted-media; autoplay; picture-in-picture"
            title="StreamVault Player"
          />
      )}
    </div>
  );
};

export default Watch;