import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';
import { RotateCw, Play } from 'lucide-react'; // Added Play icon for overlay hint
import { IMAGE_BASE_URL } from '../constants';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching, removeFromContinueWatching, addToWatchHistory } = useAuth();
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const addedToHistoryRef = useRef<boolean>(false);
  const idleTimerRef = useRef<any>(null); // Timer for screensaver
  
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  const [showRotateHint, setShowRotateHint] = useState(false);
  
  // New State for Screensaver Overlay
  const [showOverlay, setShowOverlay] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      // Show hint if in portrait mode on a likely mobile device (width < height)
      if (window.innerWidth < window.innerHeight && window.innerWidth < 768) {
        setShowRotateHint(true);
      } else {
        setShowRotateHint(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    // Attempt automatic lock on mount (might fail without gesture)
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
      // User selected theme (remove hash for URL param)
      const color = accentColor.replace('#', '');
      
      const params = new URLSearchParams({
        // Visuals
        primarycolor: color,
        secondarycolor: '1f2937',
        iconcolor: 'ffffff',
        
        // Features Enabled
        autoplay: 'true',
        poster: 'true',
        chromecast: 'true',
        servericon: 'true', 
        setting: 'true',
        pip: 'true',
        download: 'true',
        watchparty: 'true',
        
        // Subtitles
        font: 'Roboto',
        fontcolor: 'ffffff',
        fontsize: '20',
        opacity: '0.5',
        
        // Hiding UI Elements / Settings
        hidenextbutton: 'true',
        hideposter: 'true',
        hidechromecast: 'true',
        hideepisodelist: 'true',
        hideservericon: 'true',
        hidepip: 'true',
        hideprimarycolor: 'true',
        hidesecondarycolor: 'true',
        hideiconcolor: 'true',
        // hideprogresscontrol: 'true', // Keep enabled
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
      // Reset history flag on navigation
      addedToHistoryRef.current = false;
  }, [type, id, accentColor, season, episode]); 

  // Fetch Metadata & Logo
  useEffect(() => {
    const fetchMeta = async () => {
      if (!id || !type) return;
      
      const s = currentSeasonRef.current;
      const e = currentEpisodeRef.current;

      try {
        const details = await tmdbService.getDetails(type as 'movie' | 'tv', parseInt(id));
        detailsRef.current = details;
        
        const mediaTitle = details.title || details.name || 'Unknown';
        setTitle(mediaTitle);

        // Extract Logo (English preferred, fallback to first)
        const logos = details.images?.logos || [];
        const logo = logos.find((l: any) => l.iso_639_1 === 'en') || logos[0];
        setLogoPath(logo ? logo.file_path : null);

        // Update Continue Watching (Start)
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

  // Idle Timer Logic (Screensaver)
  useEffect(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setShowOverlay(false);

      if (!isPlaying) {
          // If paused, start timer to show overlay
          idleTimerRef.current = setTimeout(() => {
              setShowOverlay(true);
          }, 5000); // 5 Seconds
      }

      return () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
  }, [isPlaying]);

  const handleOverlayInteraction = () => {
      // Hide overlay on interaction and restart timer if still paused
      setShowOverlay(false);
      if (!isPlaying) {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => {
              setShowOverlay(true);
          }, 5000);
      }
  };

  // Player Communication & Logic Loop (Vidify Watch Progress)
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          // Security Check
          if (event.origin !== 'https://player.vidify.top') return;

          const data = event.data;
          
          if (data?.type === 'WATCH_PROGRESS' && data.data) {
              const { currentTime, duration, eventType } = data.data;

              // Update Play State
              if (eventType === 'play' || eventType === 'buffer') setIsPlaying(true);
              if (eventType === 'pause' || eventType === 'ended') setIsPlaying(false);
              // Fallback: If time is updating, we are playing
              if (eventType === 'timeupdate' && !isPlaying) setIsPlaying(true);

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
  }, [id, type, addToContinueWatching, removeFromContinueWatching, addToWatchHistory, navigate, isPlaying]);

  // Handle Space Bar to Pause/Play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            // Try to toggle play state via postMessage
            if (iframeRef.current && iframeRef.current.contentWindow) {
                const command = isPlaying ? 'PAUSE' : 'PLAY';
                iframeRef.current.contentWindow.postMessage({ type: command }, '*');
                
                // Optimistic update
                setIsPlaying(!isPlaying);
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

      {/* Idle Pause Overlay (Screensaver) */}
      {showOverlay && (
          <div 
            className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-700 cursor-pointer"
            onMouseMove={handleOverlayInteraction}
            onClick={handleOverlayInteraction}
          >
              <div className="flex flex-col items-center p-8 text-center animate-in slide-in-from-bottom-10 duration-700">
                  {logoPath ? (
                      <img 
                        src={`${IMAGE_BASE_URL}/w500${logoPath}`} 
                        alt={title} 
                        className="w-2/3 max-w-sm md:max-w-md object-contain mb-6 drop-shadow-2xl"
                      />
                  ) : (
                      <h1 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-xl">{title}</h1>
                  )}
                  
                  {type === 'tv' && (
                      <div className="flex flex-col items-center gap-2">
                         <div className="text-xl md:text-2xl text-white font-bold tracking-widest uppercase drop-shadow-md">
                             Season {currentSeasonRef.current} • Episode {currentEpisodeRef.current}
                         </div>
                         {/* Optional Resume Hint */}
                         <div className="mt-4 flex items-center gap-2 text-white/50 text-sm font-medium uppercase tracking-wider animate-pulse">
                            <Play className="w-4 h-4 fill-current" /> Click to Resume
                         </div>
                      </div>
                  )}
              </div>
          </div>
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