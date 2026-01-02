import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { Play, Plus, ThumbsUp, ChevronDown, Check, Users } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MediaDetails, SeasonDetails } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import ContentRow from '../components/ContentRow';
import Navbar from '../components/Navbar';
import { db } from '../services/firebase';
import { ref, set } from 'firebase/database';

const Details: React.FC = () => {
  const params = useParams();
  const type = params.type as 'movie' | 'tv';
  const id = params.id;
  
  const navigate = useNavigate();
  const { 
    watchlist, addToWatchlist, removeFromWatchlist,
    likedItems, addToLikes, removeFromLikes
  } = useAuth();
  const { showToast } = useToast();
  
  const [data, setData] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extra Data States
  const [seasonData, setSeasonData] = useState<SeasonDetails | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  
  const [logoPath, setLogoPath] = useState<string | null>(null);

  const inWatchlist = watchlist.some(i => i.mediaId === Number(id));
  const isLiked = likedItems.some(i => i.mediaId === Number(id));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await tmdbService.getDetails(type, Number(id));
        setData(res);
        
        // Logo
        const logos = res.images?.logos || [];
        const englishLogo = logos.find((l: any) => l.iso_639_1 === 'en');
        setLogoPath(englishLogo ? englishLogo.file_path : (logos[0]?.file_path || null));

        if (type === 'tv') {
             // Fetch season 1 by default or first available
             const seasonNum = res.seasons?.[0]?.season_number || 1;
             setSelectedSeasonNumber(seasonNum);
             const seasonRes = await tmdbService.getSeasonDetails(Number(id), seasonNum);
             setSeasonData(seasonRes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id && type) fetchData();
    window.scrollTo(0,0);
  }, [id, type]);

  const handleSeasonChange = async (seasonNum: number) => {
      setSelectedSeasonNumber(seasonNum);
      setIsSeasonDropdownOpen(false);
      try {
          const res = await tmdbService.getSeasonDetails(Number(id), seasonNum);
          setSeasonData(res);
      } catch (e) { console.error(e); }
  };

  const toggleWatchlist = () => {
      if (!data) return;
      if (inWatchlist) {
          removeFromWatchlist(data.id);
          showToast('Removed from Watchlist', 'info');
      } else {
          addToWatchlist({
              mediaId: data.id,
              mediaType: type,
              title: data.title || data.name || '',
              posterPath: data.poster_path,
              voteAverage: data.vote_average,
              releaseDate: data.release_date || data.first_air_date
          });
          showToast('Added to Watchlist', 'success');
      }
  };

  const toggleLike = () => {
      if (!data) return;
      if (isLiked) {
          removeFromLikes(data.id);
      } else {
          addToLikes({
              mediaId: data.id,
              mediaType: type,
              title: data.title || data.name || '',
              posterPath: data.poster_path,
              voteAverage: data.vote_average,
              releaseDate: data.release_date || data.first_air_date
          });
          showToast('Added to Liked Content', 'success');
      }
  };

  const handlePlay = () => {
      if (type === 'movie') navigate(`/watch/movie/${id}`);
      else navigate(`/watch/tv/${id}/${selectedSeasonNumber}/1`);
  };

  const startWatchParty = async () => {
      if (!data) return;
      
      const newRoomId = Math.random().toString(36).substr(2, 6).toUpperCase();
      const userId = localStorage.getItem('sv_userid') || Math.random().toString(36).substr(2, 9);
      const username = localStorage.getItem('sv_username') || `Host`;
      
      localStorage.setItem('sv_userid', userId);

      // Create room with this content selected
      await set(ref(db, `rooms/${newRoomId}`), {
          hostId: userId,
          createdAt: Date.now(),
          users: { [userId]: username },
          state: {
              mediaType: type,
              mediaId: Number(id),
              season: selectedSeasonNumber,
              episode: 1, // Default to ep 1 for parties started from details
              title: data.title || data.name
          }
      });
      
      navigate(`/party/${newRoomId}`);
  };

  if (loading) return <div className="min-h-screen bg-black animate-pulse" />;
  if (!data) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Content not found</div>;

  const backdrop = data.backdrop_path ? `${IMAGE_BASE_URL}/original${data.backdrop_path}` : '';
  const year = new Date(data.release_date || data.first_air_date || '').getFullYear();
  const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0);

  const formatRuntime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-background text-primary pb-20">
      <Navbar />
      
      {/* Hero */}
      <div className="relative h-[70vh] w-full bg-black overflow-hidden">
        <div className="absolute inset-0">
             <img src={backdrop} className="w-full h-full object-cover opacity-60" alt={data.title || data.name} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12">
            <div className="max-w-4xl">
                 {logoPath ? (
                    <img src={`${IMAGE_BASE_URL}/w500${logoPath}`} className="h-24 md:h-32 object-contain mb-6 origin-left" alt="Title Logo" />
                 ) : (
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">{data.title || data.name}</h1>
                 )}
                 
                 <div className="flex items-center gap-4 text-sm md:text-base text-gray-200 mb-6">
                     <span className="text-green-400 font-bold">{data.vote_average.toFixed(1)} Match</span>
                     <span>{year}</span>
                     <span>{type === 'movie' ? formatRuntime(runtime) : `${data.number_of_seasons} Seasons`}</span>
                     {data.genres?.map(g => (
                         <span key={g.id} className="border border-white/20 px-2 py-0.5 rounded text-xs">{g.name}</span>
                     ))}
                 </div>

                 <p className="text-gray-300 text-lg mb-8 line-clamp-3 max-w-2xl">{data.overview}</p>
                 
                 <div className="flex flex-wrap items-center gap-4">
                     <button onClick={handlePlay} className="flex items-center px-8 py-3 bg-white text-black rounded font-bold hover:bg-gray-200 transition">
                         <Play className="w-6 h-6 mr-2 fill-black" /> Play
                     </button>
                     <button onClick={startWatchParty} className="flex items-center px-6 py-3 bg-white/10 text-white border border-white/10 rounded font-bold hover:bg-brand-primary hover:border-brand-primary transition">
                         <Users className="w-5 h-5 mr-2" /> Watch Party
                     </button>
                     <button onClick={toggleWatchlist} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition border border-white/10">
                         {inWatchlist ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                     </button>
                     <button onClick={toggleLike} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition border border-white/10">
                         <ThumbsUp className={`w-6 h-6 ${isLiked ? 'fill-brand-primary text-brand-primary' : ''}`} />
                     </button>
                 </div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-12 py-8 space-y-12">
          {/* TV Seasons */}
          {type === 'tv' && seasonData && (
              <div>
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Episodes</h2>
                      <div className="relative">
                          <button 
                            onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                            className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded border border-white/10 hover:bg-white/20 transition"
                          >
                              {seasonData.name} <ChevronDown className="w-4 h-4" />
                          </button>
                          {isSeasonDropdownOpen && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
                                  {data.seasons?.map(s => (
                                      <button
                                        key={s.season_number}
                                        onClick={() => handleSeasonChange(s.season_number)}
                                        className="block w-full text-left px-4 py-3 hover:bg-white/10 text-sm border-b border-white/5 last:border-0"
                                      >
                                          {s.name}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="space-y-4">
                      {seasonData.episodes?.map(ep => (
                          <div key={ep.id} className="group flex flex-col md:flex-row gap-4 p-4 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition cursor-pointer" onClick={() => navigate(`/watch/tv/${id}/${selectedSeasonNumber}/${ep.episode_number}`)}>
                               <div className="w-full md:w-48 aspect-video flex-shrink-0 bg-gray-800 rounded overflow-hidden relative">
                                   {ep.still_path ? (
                                       <img src={`${IMAGE_BASE_URL}/w300${ep.still_path}`} className="w-full h-full object-cover" alt={ep.name} />
                                   ) : (
                                       <div className="flex items-center justify-center h-full text-gray-500">No Image</div>
                                   )}
                                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                       <Play className="w-8 h-8 text-white fill-white" />
                                   </div>
                               </div>
                               <div className="flex-1">
                                   <div className="flex items-center justify-between mb-2">
                                       <h4 className="font-bold text-lg">{ep.episode_number}. {ep.name}</h4>
                                       <span className="text-sm text-gray-400">{ep.runtime}m</span>
                                   </div>
                                   <p className="text-gray-400 text-sm line-clamp-2">{ep.overview}</p>
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Cast */}
          {data.credits?.cast && data.credits.cast.length > 0 && (
              <ContentRow 
                title="Cast" 
                items={data.credits.cast.slice(0, 10).map(c => ({
                    id: c.id,
                    media_type: 'person',
                    name: c.name,
                    profile_path: c.profile_path,
                    title: c.name,
                    poster_path: null,
                    backdrop_path: null,
                    overview: '',
                    vote_average: 0
                }))} 
              />
          )}

          {/* Similar */}
          {data.similar?.results && data.similar.results.length > 0 && (
              <ContentRow title="More Like This" items={data.similar.results.map(i => ({...i, media_type: type}))} />
          )}
      </div>
    </div>
  );
};

export default Details;