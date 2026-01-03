import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { useAuth } from '../context/AuthContext';
import { tmdbService } from '../services/tmdb';

const Watch: React.FC = () => {
  const { type, id, season, episode } = useParams();
  const navigate = useNavigate();
  const { accentColor, addToContinueWatching, removeFromContinueWatching, addToWatchHistory } = useAuth();
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
          // Security Check
          if (event.origin !== 'https://player.vidify.top') return;

          const data = event.data;
          
          if (data?.type === 'WATCH_PROGRESS' && data.data) {
              const { currentTime, duration, eventType } = data.data;

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
  }, [id, type, addToContinueWatching, removeFromContinueWatching, addToWatchHistory, navigate]);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden group font-sans select-none">
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