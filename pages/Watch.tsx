import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SkipForward, FastForward, RotateCcw, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';
import { skipService, SkipInterval } from '../services/skipService';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching } = useAuth();
  const [showUI, setShowUI] = useState(true);
  const [playerUrl, setPlayerUrl] = useState<string>('');
  
  // Smart Skip State
  const [skipIntervals, setSkipIntervals] = useState<SkipInterval[]>([]);
  const [activeSkipInterval, setActiveSkipInterval] = useState<SkipInterval | null>(null);
  
  // Button Visibility State
  const [showManualSkipIntro, setShowManualSkipIntro] = useState(false);
  const [showNextEp, setShowNextEp] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const detailsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Track playback state
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  
  const currentSeasonRef = useRef(season ? parseInt(season) : 1);
  const currentEpisodeRef = useRef(episode ? parseInt(episode) : 1);

  // Initialize Player URL
  useEffect(() => {
      const baseUrl = "https://player.videasy.net";
      const color = accentColor.replace('#', '');
      const commonParams = `?color=${color}&overlay=true&autoplayNextEpisode=true&episodeSelector=true&autoplay=true`;

      let src = "";
      if (type === 'movie') {
          src = `${baseUrl}/movie/${id}${commonParams}`;
      } else if (type === 'tv') {
          const s = season || 1;
          const e = episode || 1;
          src = `${baseUrl}/tv/${id}/${s}/${e}${commonParams}&nextEpisode=true`;
      }
      setPlayerUrl(src);
      
      // Reset states
      setSkipIntervals([]);
      setActiveSkipInterval(null);
      setShowManualSkipIntro(false);
      setShowNextEp(false);
      currentTimeRef.current = 0;
      durationRef.current = 0;
  }, [type, id, accentColor]); 

  // Fetch Metadata & Skip Intervals
  useEffect(() => {
    const fetchMeta = async () => {
      if (!id || !type) return;
      
      const s = currentSeasonRef.current;
      const e = currentEpisodeRef.current;

      try {
        // 1. Get Media Details
        const details = await tmdbService.getDetails(type as 'movie' | 'tv', parseInt(id));
        detailsRef.current = details;

        // 2. Get Skip Intervals (Simulated "Exact" Timestamps)
        const intervals = await skipService.getSkipIntervals(type, id, s, e);
        setSkipIntervals(intervals);
        
        // 3. Update Continue Watching
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

              // 2. Handle Time Update
              const currentTime = payload.currentTime ?? payload.time ?? payload.position;
              const duration = payload.duration ?? payload.total ?? payload.length ?? payload.videoLength;

              if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
                  currentTimeRef.current = currentTime;
                  durationRef.current = duration;

                  // --- SKIP LOGIC ---
                  
                  // Check for Exact Intervals first
                  const currentInterval = skipIntervals.find(i => currentTime >= i.start && currentTime < i.end);
                  
                  if (currentInterval) {
                      // We have exact data: Show Smart Button
                      setActiveSkipInterval(currentInterval);
                      setShowManualSkipIntro(false);
                  } else {
                      // No exact data: Fallback Logic
                      setActiveSkipInterval(null);
                      
                      // Manual Skip Intro: Show for first 5 mins (300s) if no exact intro found
                      const hasExactIntro = skipIntervals.some(i => i.type === 'intro');
                      if (!hasExactIntro) {
                          const isStart = currentTime < 300; 
                          setShowManualSkipIntro(prev => (prev !== isStart ? isStart : prev));
                      }
                  }

                  // Next Episode Logic (Smart Outro or End of File)
                  if (type === 'tv') {
                      const hasExactOutro = skipIntervals.some(i => i.type === 'outro');
                      let isEnd = false;
                      
                      if (hasExactOutro && currentInterval?.type === 'outro') {
                          isEnd = true;
                      } else {
                          // Fallback: Last 2 minutes or 95%
                          const remaining = duration - currentTime;
                          isEnd = remaining < 120;
                      }
                      
                      setShowNextEp(prev => (prev !== isEnd ? isEnd : prev));
                  }

                  // --- SAVE PROGRESS ---
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
  }, [id, type, skipIntervals, addToContinueWatching, navigate]);

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

  // --- PLAYER CONTROLS ---

  const seek = (seconds: number) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
          const target = currentTimeRef.current + seconds;
          // Try multiple formats for compatibility
          iframeRef.current.contentWindow.postMessage({ action: 'seek', time: target }, '*');
          iframeRef.current.contentWindow.postMessage({ event: 'command', func: 'seek', args: [target] }, '*');
          // Update local ref for immediate UI feedback
          currentTimeRef.current = target;
      }
  };

  const handleSkipIntro = () => {
      if (activeSkipInterval) {
          // Exact Skip
          const seekTime = activeSkipInterval.end - currentTimeRef.current;
          seek(seekTime);
      } else {
          // Manual Skip (+85s)
          seek(85);
      }
  };

  const handleNextEpisode = () => {
    if (type !== 'tv' || !detailsRef.current) return;
    
    const currS = currentSeasonRef.current;
    const currE = currentEpisodeRef.current;
    
    const seasonData = detailsRef.current.seasons?.find((s: any) => s.season_number === currS);
    
    if (seasonData && currE < seasonData.episode_count) {
        // Next Ep
        navigate(`/watch/tv/${id}/${currS}/${currE + 1}`);
    } else {
        // Next Season
        const nextS = currS + 1;
        const nextSeason = detailsRef.current.seasons?.find((s: any) => s.season_number === nextS);
        if (nextSeason) {
            navigate(`/watch/tv/${id}/${nextS}/1`);
        } else {
            navigate(`/details/tv/${id}`);
        }
    }
  };

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

      {/* Bottom Controls Panel */}
      <div className={`absolute bottom-12 right-12 z-50 flex flex-col items-end gap-4 transition-all duration-500 ${showUI || showNextEp ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          {/* Main Control Row */}
          <div className="flex items-center gap-3">
              
              {/* Manual Rewind -10s */}
              <button
                onClick={() => seek(-10)}
                className="p-3 bg-black/60 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 border border-white/10 group/rw"
                title="Rewind 10s"
              >
                  <RotateCcw className="w-5 h-5 group-hover/rw:-rotate-45 transition-transform" />
                  <span className="sr-only">-10s</span>
              </button>

              {/* Skip Intro Button (Smart or Manual) */}
              {(activeSkipInterval?.type === 'intro' || showManualSkipIntro) && (
                 <button
                    onClick={handleSkipIntro}
                    className="group relative flex items-center px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/10 rounded-lg text-white font-bold transition-all hover:scale-105 shadow-xl"
                 >
                    <FastForward className="w-5 h-5 mr-2 fill-white group-hover:animate-pulse" /> 
                    <span className="mr-1">Skip Intro</span>
                    {/* Tooltip explaining action */}
                    {!activeSkipInterval && (
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Jump +85s
                        </span>
                    )}
                 </button>
              )}

              {/* Manual Forward +10s */}
              <button
                onClick={() => seek(10)}
                className="p-3 bg-black/60 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 border border-white/10 group/fw"
                title="Forward 10s"
              >
                  <RotateCw className="w-5 h-5 group-hover/fw:rotate-45 transition-transform" />
                  <span className="sr-only">+10s</span>
              </button>

          </div>

          {/* Next Episode Button */}
          {showNextEp && type === 'tv' && (
              <button
                onClick={handleNextEpisode}
                className="flex items-center px-6 py-3 bg-white text-black hover:bg-gray-200 backdrop-blur-md rounded-lg font-bold transition-all transform hover:scale-105 shadow-2xl animate-in slide-in-from-right-10 fade-in duration-500 mt-2"
              >
                <span className="mr-2">Next Episode</span>
                <SkipForward className="w-5 h-5 fill-black" /> 
              </button>
          )}
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