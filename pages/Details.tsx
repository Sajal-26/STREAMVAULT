import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Plus, Star, ThumbsUp, ChevronDown, Check } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MediaDetails, SeasonDetails } from '../types';
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

  // TV Specific State
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [seasonData, setSeasonData] = useState<SeasonDetails | null>(null);

  const fetchDetails = async () => {
    if (!type || !id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await tmdbService.getDetails(type, parseInt(id));
      setData(res);
      if (type === 'tv') {
          setSelectedSeasonNumber(1);
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

  useEffect(() => {
    const fetchSeason = async () => {
        if (type === 'tv' && id && data && !error) {
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-brand-primary rounded-full border-t-transparent"></div></div>;
  
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
              voteAverage: data.vote_average
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
              voteAverage: data.vote_average
          });
          showToast(`Marked as Liked`, 'success');
      }
  };

  const handlePlay = () => {
    if (type === 'movie') {
        navigate(`/watch/movie/${id}`);
    } else {
        navigate(`/watch/tv/${id}/1/1`);
    }
  };

  const handleEpisodePlay = (seasonNum: number, episodeNum: number) => {
      navigate(`/watch/tv/${id}/${seasonNum}/${episodeNum}`);
  };

  return (
    <div className="min-h-screen bg-background text-primary pb-20">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[55vh] md:h-[70vh] w-full bg-black">
        <div className="absolute inset-0">
          <img src={backdrop} alt={data.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-8 md:pb-12 flex flex-col md:flex-row items-end gap-8">
            <div className="flex-1 w-full">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 text-white leading-tight">{data.title || data.name}</h1>
                {data.tagline && <p className="text-gray-300 italic mb-3 md:mb-4 text-sm md:text-lg">{data.tagline}</p>}
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm font-medium text-gray-300 mb-6">
                    <span className="text-green-400 flex items-center"><Star className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current"/> {data.vote_average.toFixed(1)} Match</span>
                    <span>{year}</span>
                    {runtime && <span>{runtime}</span>}
                    {data.number_of_seasons && <span>{data.number_of_seasons} Seasons</span>}
                    <span className="border border-gray-500 px-2 rounded text-[10px] md:text-xs py-0.5">HD</span>
                </div>

                <div className="flex space-x-3 mb-6">
                    <button 
                        onClick={handlePlay}
                        className="flex items-center px-6 py-2 md:py-3 bg-white text-black font-bold rounded hover:bg-opacity-90 transition text-sm md:text-base"
                    >
                        <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-black" /> Play
                    </button>
                     <button 
                        onClick={handleWatchlistToggle}
                        className="flex items-center px-4 py-2 md:py-3 bg-gray-600/60 backdrop-blur text-white font-bold rounded hover:bg-gray-600 transition text-sm md:text-base"
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
                    >
                        <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-white' : ''}`} />
                    </button>
                </div>

                <p className="hidden md:block text-gray-200 text-base md:text-lg leading-relaxed max-w-2xl">{data.overview}</p>
            </div>
        </div>
      </div>

      <div className="px-4 md:px-12 py-8 grid grid-cols-1 md:grid-cols-3 gap-10">
         <div className="md:col-span-2">
            
            {/* Mobile Only Overview */}
            <div className="md:hidden mb-8">
               <h3 className="text-lg font-bold mb-2">Synopsis</h3>
               <p className="text-gray-300 text-sm leading-relaxed">{data.overview}</p>
            </div>

            {type === 'tv' && (
                <div className="mb-12">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-primary">Episodes</h3>
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
                                         <div className="flex justify-between items-baseline mb-2">
                                             <h4 className="font-bold text-base md:text-lg text-primary">{ep.episode_number}. {ep.name}</h4>
                                             <span className="text-xs md:text-sm text-secondary">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                                         </div>
                                         <p className="text-secondary text-xs md:text-sm line-clamp-2 md:line-clamp-3 leading-relaxed">
                                             {ep.overview || "No description available for this episode."}
                                         </p>
                                     </div>
                                 </div>
                             ))
                         ) : (
                             <div className="text-secondary py-10 text-center">Loading episodes...</div>
                         )}
                     </div>
                </div>
            )}
         </div>

         {/* Right Sidebar Metadata */}
         <div className="space-y-6 text-sm text-secondary h-fit md:sticky md:top-24">
             <div>
                 <span className="block text-secondary mb-2 font-bold uppercase tracking-wider text-xs">Genres</span>
                 <div className="flex flex-wrap gap-2">
                     {data.genres.map(g => (
                         <span key={g.id} className="text-primary bg-surface px-2 py-1 rounded text-xs hover:bg-white/10 cursor-pointer transition">{g.name}</span>
                     ))}
                 </div>
             </div>
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs">Created By</span>
                <span className="text-primary">StreamVault Originals</span>
             </div>
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs">Original Language</span>
                <span className="text-primary uppercase">English</span>
             </div>
             <div>
                <span className="block text-secondary mb-1 font-bold uppercase tracking-wider text-xs">Status</span>
                <span className="text-primary uppercase">Released</span>
             </div>
         </div>
      </div>

      {/* Full Width Cast Section */}
      <div className="px-4 md:px-12 mb-12">
        <h2 className="text-lg md:text-2xl font-bold text-primary mb-4 flex items-center">
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
                    <p className="text-xs text-secondary truncate">{person.character}</p>
                </Link>
            ))}
        </div>
      </div>

      {/* Full Width More Like This Section */}
      {data.similar && data.similar.results.length > 0 && (
          <ContentRow title="More Like This" items={data.similar.results.map(i => ({...i, media_type: type as 'movie' | 'tv'}))} />
      )}
    </div>
  );
};

export default Details;