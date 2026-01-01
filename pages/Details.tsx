import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Plus, Star, ThumbsUp, ChevronDown, Check, X, Share2, Calendar } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MediaDetails, SeasonDetails, MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import ContentRow from '../components/ContentRow';
import Navbar from '../components/Navbar';

const Details: React.FC = () => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const navigate = useNavigate();
  const { 
    watchlist, addToWatchlist, removeFromWatchlist,
    likedItems, addToLikes, removeFromLikes
  } = useAuth();
  const { showToast } = useToast();
  
  const [data, setData] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extra Data States
  const [collectionParts, setCollectionParts] = useState<MediaItem[]>([]);
  const [moreFromActor, setMoreFromActor] = useState<MediaItem[]>([]);
  const [moreFromCreator, setMoreFromCreator] = useState<MediaItem[]>([]);
  const [actorName, setActorName] = useState("");
  const [creatorName, setCreatorName] = useState("");

  // TV Specific State
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [seasonData, setSeasonData] = useState<SeasonDetails | null>(null);

  // Media Assets State
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [playingVideoKey, setPlayingVideoKey] = useState<string | null>(null);
  
  // Share State
  const [isSharing, setIsSharing] = useState(false);

  // Helper to extract official trailer
  const extractTrailerKey = useCallback((videoList: { key: string; type: string; site: string }[]) => {
      const officialTrailer = videoList.find(v => v.type === 'Trailer') || videoList.find(v => v.type === 'Teaser') || videoList[0];
      return officialTrailer ? officialTrailer.key : null;
  }, []);

  const fetchDetails = async () => {
    if (!type || !id) return;
    setLoading(true);
    setError(false);
    // Reset extra states on id change
    setCollectionParts([]);
    setMoreFromActor([]);
    setMoreFromCreator([]);

    try {
      const res = await tmdbService.getDetails(type, parseInt(id));
      setData(res);

      // Find Logo
      const logos = res.images?.logos || [];
      const englishLogo = logos.find(l => l.iso_639_1 === 'en');
      setLogoPath(englishLogo ? englishLogo.file_path : (logos[0]?.file_path || null));

      // Process Videos (Initial - Series Level or Movie)
      const youtubeVideos = res.videos?.results.filter(v => v.site === 'YouTube') || [];
      setTrailerKey(extractTrailerKey(youtubeVideos));

      if (type === 'tv') {
          // If we have next episode to air, select that season by default, otherwise season 1
          const nextEp = res.next_episode_to_air;
          if (nextEp && nextEp.season_number) {
            setSelectedSeasonNumber(nextEp.season_number);
          } else {
            setSelectedSeasonNumber(1);
          }
      }
    } catch (error) {
      console.error(error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    window.scrollTo(0,0);
  }, [type, id]);

  // Fetch Extras (Collection, Actor, Creator) once main data is loaded
  useEffect(() => {
      if (!data) return;

      const fetchExtras = async () => {
          // 1. Collection
          if (data.belongs_to_collection) {
              try {
                  const colRes = await tmdbService.getCollectionDetails(data.belongs_to_collection.id);
                  // Sort by release date to show in order
                  const sortedParts = colRes.parts.sort((a, b) => {
                      if (!a.release_date) return 1;
                      if (!b.release_date) return -1;
                      return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
                  });
                  setCollectionParts(sortedParts.map(p => ({...p, media_type: 'movie'})));
              } catch (e) { console.error("Error fetching collection", e); }
          }

          // 2. More from Top Actor
          const topActor = data.credits?.cast?.[0];
          if (topActor) {
              setActorName(topActor.name);
              try {
                  const creditsRes = await tmdbService.getPersonCredits(topActor.id);
                  const filtered = creditsRes.cast
                      .filter(i => i.id !== data.id && i.poster_path)
                      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
                      .slice(0, 15);
                  setMoreFromActor(filtered);
              } catch (e) { console.error("Error fetching actor credits", e); }
          }

          // 3. More from Creator/Director
          let creatorId: number | null = null;
          let cName = "";

          if (type === 'movie') {
              const director = data.credits?.crew?.find(c => c.job === 'Director');
              if (director) {
                  creatorId = director.id;
                  cName = director.name;
              }
          } else if (type === 'tv' && data.created_by && data.created_by.length > 0) {
              creatorId = data.created_by[0].id;
              cName = data.created_by[0].name;
          }

          if (creatorId) {
              setCreatorName(cName);
              try {
                  const creditsRes = await tmdbService.getPersonCredits(creatorId);
                  const items = [...creditsRes.crew, ...creditsRes.cast];
                  const unique = Array.from(new Map(items.map(item => [item.id, item])).values());
                  
                  const filtered = unique
                      .filter(i => i.id !== data.id && i.poster_path)
                      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
                      .slice(0, 15);

                  setMoreFromCreator(filtered);
              } catch (e) { console.error("Error fetching creator credits", e); }
          }
      };

      fetchExtras();
  }, [data]);

  useEffect(() => {
    const fetchSeason = async () => {
        if (type === 'tv' && id && data && !error) {
            setSeasonData(null); // Clear stale data immediately
            try {
                const sData = await tmdbService.getSeasonDetails(parseInt(id), selectedSeasonNumber);
                setSeasonData(sData);
            } catch (err) {
                console.error("Failed to fetch season", err);
            }
        }
    };
    fetchSeason();
  }, [type, id, selectedSeasonNumber, data, error]);

  const closeTrailer = () => {
      setShowTrailerModal(false);
      setPlayingVideoKey(null);
  };

  const getLanguageName = (code?: string) => {
    if (!code) return 'Unknown';
    try {
      return new Intl.DisplayNames(['en'], { type: 'language' }).of(code);
    } catch (e) {
      return code.toUpperCase();
    }
  };

  const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleShare = async () => {
      if (isSharing || !id || !type) return;
      setIsSharing(true);
      
      try {
          const prefix = type === 'movie' ? 'm' : 't';
          const idBase36 = parseInt(id).toString(36);
          const shortCode = `${prefix}${idBase36}`;
          const origin = window.location.origin + window.location.pathname;
          const baseUrl = origin.endsWith('/') ? origin : origin + '/';
          const shortUrl = `${baseUrl}#/s/${shortCode}`;

          await navigator.clipboard.writeText(shortUrl);
          showToast(`Link copied: ${shortUrl}`, 'success');
      } catch (e) {
          showToast('Failed to copy link', 'error');
      } finally {
          setIsSharing(false);
      }
  };

  if (loading) return <DetailsSkeleton />;
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 pt-20">
        <Navbar />
        <h2 className="text-2xl font-bold text-primary mb-4">Something went wrong</h2>
        <p className="text-secondary mb-6">We couldn't load the details for this title.</p>
        <div className="flex space-x-4">
             <button 
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-600 text-white rounded font-medium hover:bg-white/10 transition"
            >
              Go Back
            </button>
            <button 
              onClick={fetchDetails}
              className="px-6 py-2 bg-brand-primary text-white rounded font-medium hover:opacity-90 transition"
            >
              Retry
            </button>
        </div>
      </div>
    );
  }

  const backdrop = data.backdrop_path ? `${IMAGE_BASE_URL}/original${data.backdrop_path}` : '';
  const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : null;
  const year = new Date(data.release_date || data.first_air_date || '').getFullYear();

  const isInWatchlist = watchlist.some(w => w.mediaId === data.id);
  const isLiked = likedItems.some(l => l.mediaId === data.id);

  const creators = type === 'tv' 
    ? data.created_by 
    : data.credits?.crew.filter(person => person.job === 'Director');

  const handleWatchlistToggle = () => {
      if (isInWatchlist) {
          removeFromWatchlist(data.id);
          showToast(`Removed from My List`, 'info');
      } else {
          addToWatchlist({
              mediaId: data.id,
              mediaType: type as 'movie' | 'tv',
              title: data.title || data.name || 'Unknown',
              posterPath: data.poster_path,
              voteAverage: data.vote_average,
              releaseDate: data.release_date || data.first_air_date
          });
          showToast(`Added to My List`, 'success');
      }
  };

  const handleLikeToggle = () => {
      if (isLiked) {
          removeFromLikes(data.id);
          showToast(`Removed from Liked Content`, 'info');
      } else {
          addToLikes({
              mediaId: data.id,
              mediaType: type as 'movie' | 'tv',
              title: data.title || data.name || 'Unknown',
              posterPath: data.poster_path,
              voteAverage: data.vote_average,
              releaseDate: data.release_date || data.first_air_date
          });
          showToast(`Marked as Liked`, 'success');
      }
  };

  const handlePlay = () => {
    if (type === 'movie') {
        navigate(`/watch/movie/${id}`);
    } else {
        // If next episode logic set a season, use it, else 1
        navigate(`/watch/tv/${id}/${selectedSeasonNumber}/1`);
    }
  };

  const handleEpisodePlay = (seasonNum: number, episodeNum: number) => {
      navigate(`/watch/tv/${id}/${seasonNum}/${episodeNum}`);
  };

  return (
    <div className="min-h-screen bg-background text-primary pb-20">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[65vh] md:h-[80vh] w-full bg-black overflow-hidden group">
        <div className="absolute inset-0">
          <img src={backdrop} alt={data.title} className="w-full h-full object-cover" />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-8 md:pb-12 flex flex-col md:flex-row items-end gap-8">
            <div className="flex-1 w-full pt-20 md:pt-0">
                {logoPath ? (
                   <img 
                     src={`${IMAGE_BASE_URL}/w500${logoPath}`} 
                     alt={data.title} 
                     className="w-3/4 md:w-1/2 max-w-[400px] max-h-[150px] object-contain mb-6 origin-left transition-transform duration-700 drop-shadow-2xl"
                   />
                ) : (
                   <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 text-white leading-tight">{data.title || data.name}</h1>
                )}

                {data.tagline && <p className="text-gray-300 italic mb-3 md:mb-4 text-sm md:text-lg">{data.tagline}</p>}
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm font-medium text-gray-300 mb-6 cursor-default">
                    <span className="text-green-400 flex items-center"><Star className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current"/> {data.vote_average.toFixed(1)} Match</span>
                    <span>{year}</span>
                    {runtime && <span>{runtime}</span>}
                    {data.number_of_seasons && <span>{data.number_of_seasons} Seasons</span>}
                    <span className="border border-gray-500 px-2 rounded text-[10px] md:text-xs py-0.5">HD</span>
                    {data.status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs uppercase border ${data.status === 'Ended' || data.status === 'Canceled' ? 'border-red-500/50 text-red-400' : 'border-green-500/50 text-green-400'}`}>
                            {data.status}
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-3 mb-6 flex-wrap gap-y-3">
                    <button 
                        onClick={handlePlay}
                        className="flex items-center px-6 py-2 md:py-3 bg-white text-black font-bold rounded hover:bg-opacity-90 transition text-sm md:text-base"
                    >
                        <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-black" /> Play
                    </button>
                     <button 
                        onClick={handleWatchlistToggle}
                        className="flex items-center px-4 py-2 md:py-3 bg-gray-600/60 backdrop-blur text-white font-bold rounded hover:bg-gray-600 transition text-sm md:text-base border border-white/10"
                    >
                        {isInWatchlist ? (
                             <><Check className="w-4 h-4 md:w-5 md:h-5 mr-2" /> My List</>
                        ) : (
                             <><Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" /> My List</>
                        )}
                    </button>
                     <button 
                        onClick={handleLikeToggle}
                        className={`flex items-center p-2 md:p-3 border rounded-full transition text-white ${isLiked ? 'bg-white/20 border-white' : 'border-gray-500 hover:border-white'}`}
                        title={isLiked ? "Unlike" : "Like"}
                    >
                        <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-white' : ''}`} />
                    </button>
                    <button 
                        onClick={handleShare}
                        className="flex items-center p-2 md:p-3 border border-gray-500 rounded-full transition text-white hover:border-white"
                        title="Share"
                        disabled={isSharing}
                    >
                        <Share2 className={`w-4 h-4 md:w-5 md:h-5 ${isSharing ? 'animate-pulse text-brand-primary' : ''}`} />
                    </button>
                </div>

                <p className="hidden md:block text-gray-200 text-base md:text-lg leading-relaxed max-w-2xl cursor-default">{data.overview}</p>
            </div>
        </div>
      </div>

      <div className="px-4 md:px-12 py-8 grid grid-cols-1 md:grid-cols-3 gap-10">
         <div className="md:col-span-2">
            
            {/* Mobile Only Overview */}
            <div className="md:hidden mb-8">
               <h3 className="text-lg font-bold mb-2 cursor-default">Synopsis</h3>
               <p className="text-gray-300 text-sm leading-relaxed cursor-default">{data.overview}</p>
            </div>

            {/* Next Episode Banner (TV Only) */}
            {data.next_episode_to_air && (
                <div className="mb-8 p-4 bg-gradient-to-r from-brand-primary/20 to-transparent border-l-4 border-brand-primary rounded-r-md">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" /> Next Episode Airing
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-xl font-bold text-white">{data.next_episode_to_air.name}</p>
                            <p className="text-sm text-gray-300 mt-1">
                                Season {data.next_episode_to_air.season_number} • Episode {data.next_episode_to_air.episode_number}
                            </p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-brand-primary font-bold text-lg">
                                {new Date(data.next_episode_to_air.air_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Mark your calendar</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Episodes Section */}
            {type === 'tv' && (
                <div className="mb-12">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-primary cursor-default">Episodes</h3>
                        <div className="relative w-full sm:w-auto">
                            <select 
                                value={selectedSeasonNumber}
                                onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                                className="w-full sm:w-auto appearance-none bg-surface border border-gray-600 text-primary py-2 pl-4 pr-10 rounded text-base font-medium focus:outline-none focus:border-brand-primary cursor-pointer"
                            >
                                {data.seasons?.filter(s => s.season_number > 0).map(s => (
                                    <option key={s.season_number} value={s.season_number}>
                                        Season {s.season_number} ({s.episode_count} Episodes)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-primary pointer-events-none" />
                        </div>
                     </div>

                     <div className="space-y-4 md:space-y-6">
                         {seasonData ? (
                             seasonData.episodes.map(ep => (
                                 <div 
                                    key={ep.id} 
                                    onClick={() => handleEpisodePlay(selectedSeasonNumber, ep.episode_number)}
                                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-md hover:bg-surface transition group cursor-pointer border-b border-gray-700/50 sm:border-0"
                                 >
                                     <div className="w-full sm:w-48 aspect-video flex-shrink-0 relative rounded overflow-hidden bg-surface">
                                         {ep.still_path ? (
                                             <img src={`${IMAGE_BASE_URL}/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center text-secondary text-xs">No Preview</div>
                                         )}
                                         <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                            <Play className="w-8 h-8 fill-white text-white" />
                                         </div>
                                     </div>
                                     <div className="flex-1 flex flex-col justify-center">
                                         <div className="flex flex-wrap justify-between items-baseline mb-2">
                                             <h4 className="font-bold text-base md:text-lg text-primary mr-2">{ep.episode_number}. {ep.name}</h4>
                                             <div className="flex items-center text-xs md:text-sm text-secondary cursor-default">
                                                {ep.vote_average > 0 && (
                                                    <span className="flex items-center text-yellow-500 font-semibold mr-3">
                                                        <Star className="w-3 h-3 mr-1 fill-current" /> {ep.vote_average.toFixed(1)}
                                                    </span>
                                                )}
                                                {ep.runtime ? `${ep.runtime}m` : ''}
                                             </div>
                                         </div>
                                         <p className="text-secondary text-xs md:text-sm line-clamp-2 md:line-clamp-3 leading-relaxed cursor-default">
                                             {ep.overview || "No description available for this episode."}
                                         </p>
                                         <p className="text-[10px] text-gray-500 mt-2">
                                             Aired: {formatDate(ep.air_date)}
                                         </p>
                                     </div>
                                 </div>
                             ))
                         ) : (
                             <div className="space-y-4">
                                {[1,2,3].map(i => (
                                    <div key={i} className="h-24 w-full bg-surface animate-pulse rounded"></div>
                                ))}
                             </div>
                         )}
                     </div>
                </div>
            )}

            {/* Cast Section */}
            <div className="mb-10">
              <h2 className="text-lg md:text-2xl font-bold text-primary mb-4 flex items-center cursor-default">
                <span className="w-1 h-5 md:h-6 bg-brand-primary mr-3 rounded-full"></span>
                Top Cast
              </h2>
              <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4 scroll-smooth">
                  {data.credits?.cast.slice(0, 15).map(person => (
                      <Link to={`/person/${person.id}`} key={person.id} className="group min-w-[100px] w-[100px] sm:min-w-[120px] sm:w-[120px] text-center flex-shrink-0">
                          <div className="w-full aspect-square rounded-full overflow-hidden mb-3 bg-surface border-2 border-transparent group-hover:border-brand-primary transition-all duration-300">
                              {person.profile_path ? (
                                  <img src={`${IMAGE_BASE_URL}/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs">N/A</div>
                              )}
                          </div>
                          <p className="text-sm font-bold text-primary truncate group-hover:text-brand-primary transition-colors">{person.name}</p>
                          <p className="text-xs text-secondary truncate cursor-default">{person.character}</p>
                      </Link>
                  ))}
              </div>
            </div>

            {/* Official Trailer Section */}
            {trailerKey && (
                <div className="mb-10 md:mb-12">
                    <h2 className="text-lg md:text-2xl font-bold text-primary mb-4 flex items-center cursor-default">
                        <span className="w-1 h-5 md:h-6 bg-brand-primary mr-3 rounded-full"></span>
                        Official Trailer
                    </h2>
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                         <iframe 
                            src={`https://www.youtube.com/embed/${trailerKey}?rel=0&showinfo=0&autoplay=0&modestbranding=1`}
                            title="Official Trailer"
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            loading="lazy"
                            frameBorder="0"
                         ></iframe>
                    </div>
                </div>
            )}
         </div>

         {/* Right Sidebar Metadata */}
         <div className="space-y-6 text-sm text-secondary h-fit md:sticky md:top-24 bg-surface/30 p-4 rounded-lg border border-white/5">
             {/* Genres */}
             <div>
                 <span className="block text-secondary mb-2 font-bold uppercase tracking-wider text-xs cursor-default">Genres</span>
                 <div className="flex flex-wrap gap-2">
                     {data.genres.map(g => (
                         <Link 
                            key={g.id} 
                            to={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${g.id}`}
                            className="text-primary bg-white/10 px-2 py-1 rounded text-xs hover:bg-brand-primary hover:text-white cursor-pointer transition"
                         >
                            {g.name}
                         </Link>
                     ))}
                 </div>
             </div>
             
             {/* Credits */}
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs cursor-default">
                    {type === 'movie' ? 'Directed By' : 'Created By'}
                </span>
                <div className="flex flex-wrap gap-2">
                    {creators && creators.length > 0 ? (
                        creators.map((c, i) => (
                             <React.Fragment key={c.id}>
                                <Link to={`/person/${c.id}`} className="text-primary hover:text-brand-primary transition-colors hover:underline">
                                    {c.name}
                                </Link>
                                {i < creators.length - 1 && <span className="text-secondary">, </span>}
                             </React.Fragment>
                        ))
                    ) : (
                        <span className="text-primary cursor-default">Unknown</span>
                    )}
                </div>
             </div>

             {/* Dates */}
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs cursor-default">
                    {type === 'tv' ? 'First Aired' : 'Release Date'}
                </span>
                <span className="text-primary cursor-default block">
                  {formatDate(data.release_date || data.first_air_date)}
                </span>
             </div>

             {type === 'tv' && data.last_air_date && (
                 <div>
                    <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs cursor-default">Last Aired</span>
                    <span className="text-primary cursor-default block">
                        {formatDate(data.last_air_date)}
                    </span>
                 </div>
             )}

             {/* Language */}
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs cursor-default">Original Language</span>
                <span className="text-primary uppercase cursor-default block">
                  {getLanguageName(data.original_language)}
                </span>
             </div>
             
             {/* Status */}
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs cursor-default">Status</span>
                <span className={`text-primary uppercase cursor-default font-medium ${data.status === 'Ended' || data.status === 'Canceled' ? 'text-red-400' : 'text-green-400'}`}>
                  {data.status || 'Unknown'}
                </span>
             </div>

             {/* Networks (TV) */}
            {type === 'tv' && data.networks && data.networks.length > 0 && (
                <div>
                    <span className="block text-secondary mb-2 font-bold uppercase tracking-wider text-xs cursor-default">Networks</span>
                    <div className="flex flex-wrap gap-2 bg-white/90 p-2 rounded justify-center">
                        {data.networks.map(n => (
                            n.logo_path ? (
                                <img key={n.id} src={`${IMAGE_BASE_URL}/w92${n.logo_path}`} alt={n.name} title={n.name} className="h-4 object-contain" />
                            ) : (
                                <span key={n.id} className="text-black text-xs font-bold">{n.name}</span>
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* Production */}
            {data.production_companies && data.production_companies.length > 0 && (
                <div>
                    <span className="block text-secondary mb-2 font-bold uppercase tracking-wider text-xs cursor-default">Production</span>
                    <div className="flex flex-col gap-1.5">
                        {data.production_companies.slice(0, 5).map(c => (
                            <span key={c.id} className="text-gray-300 text-xs flex items-center">
                                {c.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* Stacked Row Content */}
      
      {/* Collection Section */}
      {data.belongs_to_collection && collectionParts.length > 0 && (
            <ContentRow title={`Collection: ${data.belongs_to_collection.name}`} items={collectionParts} />
      )}

      {/* More from Leading Actor */}
      {moreFromActor.length > 0 && (
          <ContentRow title={`More from ${actorName}`} items={moreFromActor} />
      )}

      {/* More from Creator */}
      {moreFromCreator.length > 0 && (
          <ContentRow title={`More from ${creatorName}`} items={moreFromCreator} />
      )}

      {/* Full Width More Like This Section */}
      {data.similar && data.similar.results.length > 0 && (
          <ContentRow title="More Like This" items={data.similar.results.map(i => ({...i, media_type: type as 'movie' | 'tv'}))} />
      )}

      {/* Video Modal Overlay */}
      {showTrailerModal && playingVideoKey && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={closeTrailer}>
              <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                  <button 
                      onClick={closeTrailer}
                      className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-md group"
                      title="Close Trailer"
                  >
                      <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                  <iframe
                      src={`https://www.youtube.com/embed/${playingVideoKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                      title="Trailer Player"
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      frameBorder="0"
                  ></iframe>
              </div>
          </div>
      )}
    </div>
  );
};

const DetailsSkeleton = () => {
    return (
        <div className="min-h-screen bg-background">
            <div className="h-20 w-full bg-black/50 fixed top-0 z-50"></div>
            
            {/* Hero Skeleton */}
            <div className="relative h-[65vh] md:h-[80vh] w-full bg-surface animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12">
                    <div className="h-10 md:h-16 w-2/3 md:w-1/3 bg-white/10 rounded mb-4"></div>
                    <div className="flex gap-4 mb-6">
                        <div className="h-4 w-20 bg-white/10 rounded"></div>
                        <div className="h-4 w-10 bg-white/10 rounded"></div>
                        <div className="h-4 w-16 bg-white/10 rounded"></div>
                    </div>
                    <div className="flex gap-4 mb-6">
                         <div className="h-12 w-32 bg-white/20 rounded"></div>
                         <div className="h-12 w-32 bg-white/10 rounded"></div>
                    </div>
                    <div className="h-24 w-full md:w-2/3 bg-white/5 rounded hidden md:block"></div>
                </div>
            </div>

            <div className="px-4 md:px-12 py-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-8">
                     <div className="h-8 w-40 bg-white/10 rounded mb-4"></div>
                     <div className="flex space-x-4 overflow-hidden">
                        {[1,2,3,4,5].map(i => (
                             <div key={i} className="flex-shrink-0 text-center">
                                 <div className="w-[100px] h-[100px] rounded-full bg-surface border border-white/5 mb-2 animate-pulse"></div>
                                 <div className="h-3 w-16 mx-auto bg-white/5 rounded"></div>
                             </div>
                        ))}
                     </div>
                </div>
                <div className="space-y-6">
                     <div className="h-32 bg-surface rounded animate-pulse border border-white/5"></div>
                </div>
            </div>
        </div>
    );
}

export default Details;