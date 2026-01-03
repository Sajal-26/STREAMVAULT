import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';
import { RotateCw } from 'lucide-react'; 

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching, removeFromContinueWatching, addToWatchHistory } = useAuth();
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Ref to track play state inside event listeners without dependency issues
  const isPlayingRef = useRef(false);
  // Ref to track last pause time to filter stray timeupdates
  const lastPauseTimeRef = useRef(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const addedToHistoryRef = useRef<boolean>(false);
  
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  const [showRotateHint, setShowRotateHint] = useState(false);

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      if (window.innerWidth < window.innerHeight && window.innerWidth < 768) {
        setShowRotateHint(true);
      } else {
        setShowRotateHint(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    forceLandscape(true);

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const forceLandscape = async (silent = false) => {
      try {
          if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
          }
          if (screen.orientation && (screen.orientation as any).lock) {
              await (screen.orientation as any).lock('landscape');
          }
      } catch (e) {
          if (!silent) console.debug("Landscape lock failed:", e);
      }
  };

  // Initialize Player URL (Vidify)
  useEffect(() => {
      const baseUrl = "https://player.vidify.top/embed";
      const color = accentColor.replace('#', '');
      
      const params = new URLSearchParams({
        primarycolor: color,
        secondarycolor: '1f2937',
        iconcolor: 'ffffff',
        autoplay: 'true',
        poster: 'true',
        chromecast: 'true',
        servericon: 'true', 
        setting: 'true',
        pip: 'true',
        download: 'true',
        watchparty: 'true',
        font: 'Roboto',
        fontcolor: 'ffffff',
        fontsize: '20',
        opacity: '0.5',
        hidenextbutton: 'true',
        hideposter: 'true',
        hidechromecast: 'true',
        hideepisodelist: 'true',
        hideservericon: 'true',
        hidepip: 'true',
        hideprimarycolor: 'true',
        hidesecondarycolor: 'true',
        hideiconcolor: 'true',
        hideiconset: 'true',
        hideautonext: 'true',
        hideautoplay: 'true',
      });

      const commonParams = `?${params.toString()}`;

      let src = "";
      if (type === 'movie') {
          src = `${baseUrl}/movie/${id}${commonParams}`;
      } else if (type === 'tv') {
          const s = season || 1;
          const e = episode || 1;
          src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}`;
      }
      setPlayerUrl(src);
      addedToHistoryRef.current = false;
      setIsPlaying(false);
      isPlayingRef.current = false;
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
        
        const mediaTitle = details.title || details.name || 'Unknown';

        addToContinueWatching({
          mediaId: parseInt(id),
          mediaType: type as 'movie' | 'tv',
          title: mediaTitle,
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

  // Keep Ref in sync
  useEffect(() => {
      isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Player Communication & Logic Loop (Vidify Watch Progress)
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          // Security Check
          if (event.origin !== 'https://player.vidify.top') return;

          const data = event.data;
          
          if (data?.type === 'WATCH_PROGRESS' && data.data) {
              const { currentTime, duration, eventType } = data.data;

              // --- STATE MANAGEMENT ---
              
              const isPausedState = eventType === 'pause' || eventType === 'ended';
              const isActiveState = eventType === 'play' || eventType === 'buffer';
              const isTimeUpdate = eventType === 'timeupdate';

              // 1. Explicit Pause/Ended
              if (isPausedState) {
                  if (isPlayingRef.current) {
                      setIsPlaying(false);
                      isPlayingRef.current = false;
                      lastPauseTimeRef.current = Date.now();
                  }
              }
              // 2. Explicit Play/Buffer
              else if (isActiveState) {
                  if (!isPlayingRef.current) {
                      setIsPlaying(true);
                      isPlayingRef.current = true;
                  }
              }
              // 3. TimeUpdate (Implicit Play)
              else if (isTimeUpdate) {
                  const timeSincePause = Date.now() - lastPauseTimeRef.current;
                  if (!isPlayingRef.current && timeSincePause > 1000) {
                      setIsPlaying(true);
                      isPlayingRef.current = true;
                  }
              }

              // --- METADATA & PROGRESS ---
              
              // Parse numbers safely
              const curr = Number(currentTime);
              let dur = Number(duration);

              // Fallback: If player reports 0 duration, try to use TMDB runtime
              if ((isNaN(dur) || dur <= 0) && detailsRef.current?.runtime) {
                  dur = detailsRef.current.runtime * 60; // Minutes to seconds
              }

              if (!isNaN(curr) && !isNaN(dur) && dur > 0) {
                  const now = Date.now();
                  const progressPercent = (curr / dur) * 100;
                  
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

                  if (progressPercent > 95) {
                      removeFromContinueWatching(parseInt(id!));
                  } else if (now - lastUpdateRef.current > 5000 && eventType !== 'pause') { 
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
                              watchedDuration: curr,
                              totalDuration: dur
                          });
                      }
                  }
              }
          }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [id, type, addToContinueWatching, removeFromContinueWatching, addToWatchHistory, navigate]);

  // Handle Space Bar to Pause/Play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (iframeRef.current && iframeRef.current.contentWindow) {
                const command = isPlaying ? 'PAUSE' : 'PLAY';
                iframeRef.current.contentWindow.postMessage({ type: command }, '*');
                
                const newState = !isPlaying;
                setIsPlaying(newState);
                isPlayingRef.current = newState;
                
                if (!newState) {
                   lastPauseTimeRef.current = Date.now();
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden group font-sans select-none">
      {/* Video Player */}
      {playerUrl && (
          <iframe
            ref={iframeRef}
            src={playerUrl}
            className="w-full h-full border-0 bg-black relative z-10"
            allowFullScreen
            allow="encrypted-media; autoplay; picture-in-picture"
            title="StreamVault Player"
          />
      )}

      {/* Manual Orientation Toggle (Visible if Portrait) */}
      {showRotateHint && (
         <button
            onClick={() => forceLandscape(false)}
            className="absolute bottom-20 right-5 z-[110] bg-black/60 text-white p-3 rounded-full backdrop-blur-md border border-white/20 shadow-xl animate-pulse flex items-center gap-2"
         >
            <RotateCw className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Rotate</span>
         </button>
      )}
    </div>
  );
};

export default Watch;