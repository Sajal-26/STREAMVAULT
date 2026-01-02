import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { Play, Plus, ThumbsUp, ChevronDown, Check, Users, ArrowLeft, Globe, Building2, Signal, LayoutGrid, List } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MediaDetails, SeasonDetails, MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import ContentRow from '../components/ContentRow';
import Navbar from '../components/Navbar';
import { db } from '../services/firebase';
import { ref, set } from '../services/firebase';

const Details: React.FC = () => {
  const params = useParams();
  const type = params.type as 'movie' | 'tv';
  const id = params.id;
  
  const navigate = useNavigate();
  const { 
    watchlist, addToWatchlist, removeFromWatchlist,
    likedItems, addToLikes, removeFromLikes,
    continueWatching
  } = useAuth();
  const { showToast } = useToast();
  
  const [data, setData] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extra Data States
  const [seasonData, setSeasonData] = useState<SeasonDetails | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  
  // Episode View Control
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [visibleEpisodes, setVisibleEpisodes] = useState(6);

  // Actor Cross-Reference
  const [actorCredits, setActorCredits] = useState<MediaItem[]>([]);
  const [leadingActorName, setLeadingActorName] = useState<string>("");
  
  const [logoPath, setLogoPath] = useState<string | null>(null);

  const inWatchlist = watchlist.some(i => i.mediaId === Number(id));
  const isLiked = likedItems.some(i => i.mediaId === Number(id));

  // Determine current progress for this show (from Continue Watching list)
  const currentCW = continueWatching.find(i => i.mediaId === Number(id) && i.mediaType === 'tv');

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
             // Prefer last watched season if available, else 1
             let seasonNum = currentCW?.season || res.seasons?.[0]?.season_number || 1;
             // Ensure season exists
             if(res.seasons && !res.seasons.some((s: any) => s.season_number === seasonNum)) {
                 seasonNum = 1;
             }
             
             setSelectedSeasonNumber(seasonNum);
             const seasonRes = await tmdbService.getSeasonDetails(Number(id), seasonNum);
             setSeasonData(seasonRes);
             setVisibleEpisodes(Math.max(6, (currentCW?.episode || 0) + 2)); // Auto expand slightly to current ep
        }

        // Fetch "More from Leading Actor"
        if (res.credits?.cast && res.credits.cast.length > 0) {
            const lead = res.credits.cast[0];
            setLeadingActorName(lead.name);
            const credits = await tmdbService.getPersonCredits(lead.id);
            // Filter out the current movie/show and sort by popularity
            const otherWorks = [...credits.cast]
                .filter(m => m.id !== res.id && m.poster_path)
                .sort((a,b) => (b.vote_count || 0) - (a.vote_count || 0));
            
            // Deduplicate by ID and take top 10
            const uniqueWorks = Array.from(new Map(otherWorks.map(item => [item.id, item])).values()).slice(0, 15);
            setActorCredits(uniqueWorks);
        }

      } catch (e) {
        console.error("Failed to fetch details:", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (id && type) {
        fetchData();
    } else {
        setLoading(false);
    }
    window.scrollTo(0,0);
  }, [id, type]);

  const handleSeasonChange = async (seasonNum: number) => {
      setSelectedSeasonNumber(seasonNum);
      setIsSeasonDropdownOpen(false);
      setVisibleEpisodes(6); // Reset pagination on season change
      try {
          const res = await tmdbService.getSeasonDetails(Number(id), seasonNum);
          setSeasonData(res);
      } catch (e) { console.error(e); }
  };

  const handleLoadMoreEpisodes = () => {
      setVisibleEpisodes(prev => prev + 6);
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
      if (type === 'movie') {
          navigate(`/watch/movie/${id}`);
      } else {
          // Resume where left off or start S1E1
          const s = currentCW?.season || selectedSeasonNumber;
          const e = currentCW?.episode || 1;
          navigate(`/watch/tv/${id}/${s}/${e}`);
      }
  };

  const startWatchParty = async () => {
      if (!data) return;
      
      try {
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
          
          showToast('Watch Party Created!', 'success');
          navigate(`/party/${newRoomId}`);
      } catch (error) {
          console.error("Watch party creation failed", error);
          showToast('Failed to start Watch Party. Try again.', 'error');
      }
  };

  const getEpisodeProgress = (seasonNum: number, episodeNum: number) => {
      // Logic:
      // If currentCW indicates we are past this episode (higher season OR same season higher episode), return 100%.
      // If matches exactly, return cw.progress.
      // Else 0.
      
      if (currentCW) {
          const cwSeason = currentCW.season || 1;
          const cwEpisode = currentCW.episode || 1;

          if (cwSeason > seasonNum) return 100;
          if (cwSeason === seasonNum) {
              if (cwEpisode > episodeNum) return 100;
              if (cwEpisode === episodeNum) return currentCW.progress || 0;
          }
      }
      return 0;
  };

  if (loading) return (
    <div className="min-h-screen bg-background text-primary">
        <Navbar />
        <div className="relative h-[50vh] md:h-[70vh] w-full bg-gray-900 animate-pulse">
            <div className="absolute bottom-0 left-0 w-full px-5 md:px-12 pb-8 md:pb-12">
                <div className="h-8 md:h-12 w-2/3 bg-gray-800 rounded mb-4" />
                <div className="h-6 w-1/3 bg-gray-800 rounded mb-6" />
                <div className="h-24 w-full max-w-2xl bg-gray-800 rounded mb-8" />
                <div className="flex gap-4">
                    <div className="h-10 md:h-12 w-32 bg-gray-800 rounded" />
                    <div className="h-10 md:h-12 w-32 bg-gray-800 rounded" />
                </div>
            </div>
        </div>
    </div>
  );

  if (!data) return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">Content not found</h2>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-brand-primary hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
      </div>
  );

  const backdrop = data.backdrop_path ? `${IMAGE_BASE_URL}/original${data.backdrop_path}` : '';
  const year = new Date(data.release_date || data.first_air_date || '').getFullYear();
  const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0);

  const formatRuntime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
  };

  const isReleased = (dateStr?: string) => {
      if (!dateStr) return false;
      return new Date(dateStr) <= new Date();
  };

  const getDaysUntil = (dateStr: string) => {
      const diff = new Date(dateStr).getTime() - Date.now();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-background text-primary pb-24 md:pb-20">
      <Navbar />
      
      {/* Hero */}
      <div className="relative h-[55vh] md:h-[80vh] w-full bg-black overflow-hidden group">
        <div className="absolute inset-0">
             <img src={backdrop} className="w-full h-full object-cover opacity-60" alt={data.title || data.name} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-5 md:px-12 pb-8 md:pb-12">
            <div className="max-w-4xl">
                 {logoPath ? (
                    <img src={`${IMAGE_BASE_URL}/w500${logoPath}`} className="h-16 md:h-32 object-contain mb-4 md:mb-6 origin-left" alt="Title Logo" />
                 ) : (
                    <h1 className="text-3xl md:text-6xl font-bold mb-3 md:mb-4">{data.title || data.name}</h1>
                 )}
                 
                 {/* Mobile Optimized Metadata */}
                 <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs md:text-base text-gray-200 mb-4 md:mb-6 font-medium">
                     <span className="text-green-400 font-bold">{data.vote_average.toFixed(1)} Match</span>
                     <span className="text-gray-400">|</span>
                     <span className="flex items-center gap-1">{year}</span>
                     <span className="text-gray-400">|</span>
                     <span className="flex items-center gap-1">{type === 'movie' ? formatRuntime(runtime) : `${data.number_of_seasons} Seasons`}</span>
                     {data.status && <span className="hidden md:inline-block ml-2 px-2 py-0.5 bg-white/10 rounded text-xs uppercase tracking-wider font-bold">{data.status}</span>}
                 </div>

                 {/* Genres - Compact on mobile */}
                 <div className="flex flex-wrap gap-2 mb-6 hidden md:flex">
                    {data.genres?.map(g => (
                         <span key={g.id} className="border border-white/20 px-2 py-0.5 rounded text-xs hover:bg-white/10 transition cursor-default">{g.name}</span>
                     ))}
                 </div>
                 
                 {/* Overview - Truncated on mobile */}
                 <p className="hidden md:block text-gray-300 text-lg mb-8 line-clamp-3 max-w-2xl">{data.overview}</p>
                 
                 {/* Action Buttons - Stack on mobile, Row on Desktop */}
                 <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                     {/* Primary Play Button */}
                     <button 
                        onClick={handlePlay} 
                        className="w-full md:w-auto flex items-center justify-center px-6 md:px-8 py-3 bg-white text-black rounded font-bold hover:bg-gray-200 transition"
                    >
                         <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-black" /> {currentCW ? 'Resume' : 'Play'}
                     </button>

                     {/* Secondary Actions Row */}
                     <div className="flex items-center justify-around md:justify-start gap-4 md:gap-4 mt-2 md:mt-0">
                         <button 
                            onClick={toggleWatchlist} 
                            className="flex flex-col md:flex-row items-center gap-1 md:gap-0 p-2 md:p-3 text-gray-300 hover:text-white transition md:bg-white/10 md:rounded-full md:border md:border-white/10"
                            title="My List"
                        >
                             {inWatchlist ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                             <span className="text-[10px] md:hidden">My List</span>
                         </button>
                         
                         <button 
                            onClick={toggleLike} 
                            className="flex flex-col md:flex-row items-center gap-1 md:gap-0 p-2 md:p-3 text-gray-300 hover:text-white transition md:bg-white/10 md:rounded-full md:border md:border-white/10"
                            title="Rate"
                        >
                             <ThumbsUp className={`w-6 h-6 ${isLiked ? 'fill-brand-primary text-brand-primary' : ''}`} />
                             <span className="text-[10px] md:hidden">Rate</span>
                         </button>
                         
                         <button 
                            onClick={startWatchParty} 
                            className="flex flex-col md:flex-row items-center gap-1 md:gap-0 p-2 md:p-3 text-gray-300 hover:text-white transition md:bg-white/10 md:rounded-full md:border md:border-white/10"
                            title="Watch Party"
                         >
                             <Users className="w-6 h-6" />
                             <span className="text-[10px] md:hidden">Party</span>
                         </button>
                     </div>
                 </div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-5 md:px-12 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Left: Episodes & Cast (Grid Column) */}
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
              
              {/* Mobile Overview (Visible only on mobile) */}
              <div className="md:hidden space-y-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{data.overview}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.genres?.map(g => (
                         <span key={g.id} className="text-[10px] text-gray-400 border border-white/20 px-2 py-1 rounded">{g.name}</span>
                     ))}
                 </div>
              </div>

              {/* Next Episode Banner (TV Only) */}
              {data.next_episode_to_air && (
                  <div className="bg-gradient-to-r from-brand-primary/20 to-transparent border-l-4 border-brand-primary p-4 md:p-6 rounded-r-lg">
                      <h3 className="text-base md:text-xl font-bold mb-2 flex items-center gap-2">
                          <Signal className="w-4 h-4 md:w-5 md:h-5 text-brand-primary" /> 
                          Next Episode Arriving
                      </h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                           <div className="flex-1">
                               <p className="text-lg md:text-2xl font-bold">{data.next_episode_to_air.name}</p>
                               <p className="text-sm text-secondary">
                                   S{data.next_episode_to_air.season_number} E{data.next_episode_to_air.episode_number}
                               </p>
                           </div>
                           <div className="text-left md:text-right mt-2 md:mt-0">
                               <p className="text-base md:text-lg font-bold text-white">
                                   {new Date(data.next_episode_to_air.air_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                               </p>
                               <p className="text-sm text-brand-primary font-bold">
                                   {getDaysUntil(data.next_episode_to_air.air_date)} days left
                               </p>
                           </div>
                      </div>
                  </div>
              )}

              {/* TV Seasons */}
              {type === 'tv' && seasonData && (
                  <div>
                      <div className="flex items-center justify-between mb-4 md:mb-6">
                          <h2 className="text-xl md:text-2xl font-bold">Episodes</h2>
                          <div className="flex items-center gap-2 md:gap-3">
                              {/* View Toggle */}
                              <div className="hidden md:flex bg-white/10 rounded-lg p-1 border border-white/5">
                                  <button 
                                      onClick={() => setViewMode('list')}
                                      className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                      title="List View"
                                  >
                                      <List className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={() => setViewMode('grid')}
                                      className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                      title="Grid View"
                                  >
                                      <LayoutGrid className="w-4 h-4" />
                                  </button>
                              </div>

                              <div className="relative z-20">
                                  <button 
                                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                    className="flex items-center gap-2 bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded border border-white/10 hover:bg-white/20 transition text-xs md:text-sm font-medium"
                                  >
                                      {seasonData.name} <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                                  </button>
                                  {isSeasonDropdownOpen && (
                                      <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded shadow-xl max-h-60 overflow-y-auto">
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
                      </div>
                      
                      <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4" : "space-y-3 md:space-y-4"}>
                          {seasonData.episodes?.slice(0, visibleEpisodes).map(ep => {
                              const released = isReleased(ep.air_date);
                              const progress = getEpisodeProgress(selectedSeasonNumber, ep.episode_number);
                              
                              if (viewMode === 'grid') {
                                  // Grid View Card
                                  return (
                                    <div 
                                        key={ep.id}
                                        className={`group relative bg-surface rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition ${released ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                                        onClick={() => released && navigate(`/watch/tv/${id}/${selectedSeasonNumber}/${ep.episode_number}`)}
                                    >
                                        <div className="aspect-video bg-gray-800 relative">
                                            {ep.still_path ? (
                                                <img src={`${IMAGE_BASE_URL}/w300${ep.still_path}`} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" alt={ep.name} />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500 text-xs">No Image</div>
                                            )}
                                            {released && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                    <Play className="w-8 h-8 text-white fill-white" />
                                                </div>
                                            )}
                                            {!released && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white border border-white/50 px-2 py-0.5 rounded">Soon</span>
                                                </div>
                                            )}
                                            {progress > 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                                                    <div className="h-full bg-brand-primary" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-xs md:text-sm text-white line-clamp-1">{ep.episode_number}. {ep.name}</h4>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 mb-2 min-h-[2.5em]">{ep.overview || "No description."}</p>
                                        </div>
                                    </div>
                                  );
                              }

                              // List View Row (Default for Mobile)
                              return (
                                <div 
                                    key={ep.id} 
                                    className={`group flex flex-row gap-3 md:gap-4 p-2 md:p-4 rounded border border-white/5 md:border-transparent transition bg-white/5 md:bg-transparent ${released ? 'hover:bg-white/5 hover:border-white/5 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                    onClick={() => released && navigate(`/watch/tv/${id}/${selectedSeasonNumber}/${ep.episode_number}`)}
                                >
                                    <div className="w-32 md:w-48 aspect-video flex-shrink-0 bg-gray-800 rounded overflow-hidden relative">
                                        {ep.still_path ? (
                                            <img src={`${IMAGE_BASE_URL}/w300${ep.still_path}`} className="w-full h-full object-cover" alt={ep.name} />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-500 text-xs">No Image</div>
                                        )}
                                        {released ? (
                                            <div className="hidden md:flex absolute inset-0 bg-black/40 items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Play className="w-8 h-8 text-white fill-white" />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white border border-white/50 px-2 py-1 rounded">Soon</span>
                                            </div>
                                        )}
                                        {progress > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                                                <div className="h-full bg-brand-primary" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="font-bold text-sm md:text-lg text-white line-clamp-2">{ep.episode_number}. {ep.name}</h4>
                                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                        </div>
                                        <p className="hidden md:block text-gray-400 text-sm line-clamp-2 mb-3">{ep.overview || "No description available."}</p>
                                        <p className="md:hidden text-gray-400 text-xs line-clamp-2">{ep.overview || "No description."}</p>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                      
                      {/* Show More Button */}
                      {seasonData.episodes && visibleEpisodes < seasonData.episodes.length && (
                          <div className="mt-6 flex justify-center">
                              <button 
                                onClick={handleLoadMoreEpisodes}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold text-white transition flex items-center gap-2 group"
                              >
                                  Show More Episodes
                                  <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-1" />
                              </button>
                          </div>
                      )}
                  </div>
              )}

              {/* Cast (Movies Only) */}
              {type === 'movie' && data.credits?.cast && data.credits.cast.length > 0 && (
                  <ContentRow 
                    title="Cast" 
                    items={data.credits.cast.slice(0, 20).map(c => ({
                        id: c.id,
                        media_type: 'person',
                        name: c.name,
                        profile_path: c.profile_path,
                        title: c.name,
                        character: c.character, 
                        poster_path: null,
                        backdrop_path: null,
                        overview: '',
                        vote_average: 0
                    }))} 
                  />
              )}
          </div>

          {/* Right: Info Sidebar (Hidden on mobile, mapped to bottom) */}
          <div className="hidden lg:block space-y-8">
              {/* Detailed Stats */}
              <div className="bg-surface p-6 rounded-lg border border-white/5 space-y-6">
                  <div>
                      <h3 className="text-gray-400 text-sm font-bold uppercase mb-1">Original Language</h3>
                      <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-brand-primary" />
                          <span className="text-white capitalize">{new Intl.DisplayNames(['en'], { type: 'language' }).of(data.original_language || 'en')}</span>
                      </div>
                  </div>
                  
                  {data.status && (
                      <div>
                          <h3 className="text-gray-400 text-sm font-bold uppercase mb-1">Status</h3>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${data.status === 'Ended' || data.status === 'Released' ? 'bg-green-900/50 text-green-400' : 'bg-brand-primary/20 text-brand-primary'}`}>
                              {data.status}
                          </span>
                      </div>
                  )}

                  {/* Networks (TV) */}
                  {data.networks && data.networks.length > 0 && (
                      <div>
                          <h3 className="text-gray-400 text-sm font-bold uppercase mb-3">Network</h3>
                          <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg justify-center">
                              {data.networks.map(net => (
                                  net.logo_path ? (
                                      <img key={net.id} src={`${IMAGE_BASE_URL}/w92${net.logo_path}`} alt={net.name} className="h-6 object-contain filter grayscale hover:grayscale-0 transition" title={net.name} />
                                  ) : <span key={net.id} className="text-black font-bold text-xs">{net.name}</span>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Production Companies */}
                  {data.production_companies && data.production_companies.length > 0 && (
                      <div>
                          <h3 className="text-gray-400 text-sm font-bold uppercase mb-3">Production</h3>
                          <div className="space-y-3">
                              {data.production_companies.slice(0, 4).map(comp => (
                                  <div key={comp.id} className="flex items-center gap-3">
                                      {comp.logo_path ? (
                                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1">
                                              <img src={`${IMAGE_BASE_URL}/w92${comp.logo_path}`} className="w-full h-full object-contain" alt={comp.name} />
                                          </div>
                                      ) : (
                                          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                              <Building2 className="w-4 h-4 text-gray-400" />
                                          </div>
                                      )}
                                      <span className="text-sm text-gray-200">{comp.name}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Full Width Bottom Rows */}
      <div className="-mt-8">
        {/* Cast (TV Only - Moved here for full width space) */}
        {type === 'tv' && data.credits?.cast && data.credits.cast.length > 0 && (
            <ContentRow 
            title="Cast" 
            items={data.credits.cast.slice(0, 20).map(c => ({
                id: c.id,
                media_type: 'person',
                name: c.name,
                profile_path: c.profile_path,
                title: c.name,
                character: c.character, 
                poster_path: null,
                backdrop_path: null,
                overview: '',
                vote_average: 0
            }))} 
            />
        )}

        {actorCredits.length > 0 && (
            <ContentRow 
                title={`More from ${leadingActorName}`} 
                items={actorCredits} 
            />
        )}

        {data.similar?.results && data.similar.results.length > 0 && (
            <ContentRow title="More Like This" items={data.similar.results.map(i => ({...i, media_type: type}))} />
        )}
      </div>
    </div>
  );
};

export default Details;