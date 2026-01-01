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
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  // Initialize Player URL
  useEffect(() => {
      const baseUrl = "https://player.videasy.net";
      const color = accentColor.replace('#', '');
      // Removed overlay=true and episodeSelector=true to remove the external player's custom buttons
      const commonParams = `?color=${color}&autoplayNextEpisode=true&autoplay=true`;

      let src = "";
      if (type === 'movie') {
          src = `${baseUrl}/movie/${id}${commonParams}`;
      } else if (type === 'tv') {
          const s = season || 1;
          const e = episode || 1;
          src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}&nextEpisode=true`;
      }
      setPlayerUrl(src);
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

  // Player Communication & Logic Loop
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

              // 1. Detect Episode Change from Player Internal Navigation
              if (type === 'tv' && payload.season && payload.episode) {
                   const newSeason = parseInt(payload.season);
                   const newEpisode = parseInt(payload.episode);

                   if (newSeason !== currentSeasonRef.current || newEpisode !== currentEpisodeRef.current) {
                       currentSeasonRef.current = newSeason;
                       currentEpisodeRef.current = newEpisode;
                       // Trigger internal navigation
                       navigate(`/watch/tv/${id}/${newSeason}/${newEpisode}`, { replace: true });
                   }
              }

              // 2. Handle Time Update & Save Progress
              const currentTime = payload.currentTime ?? payload.time ?? payload.position;
              const duration = payload.duration ?? payload.total ?? payload.length ?? payload.videoLength;

              if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
                  const now = Date.now();
                  if (now - lastUpdateRef.current > 5000) { // Update every 5s
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
              }
          } catch (e) {
              // Silent error
          }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [id, type, addToContinueWatching, navigate]);

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