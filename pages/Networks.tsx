import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ContentRow from '../components/ContentRow';
import { tmdbService } from '../services/tmdb';
import { OTT_PROVIDERS } from '../constants';
import { MediaItem } from '../types';
import { PlayCircle } from 'lucide-react';

const Networks: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState(OTT_PROVIDERS[0]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [tvShows, setTvShows] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [movieRes, tvRes] = await Promise.all([
                tmdbService.discoverByProvider(activeProvider.id, 'movie'),
                tmdbService.discoverByProvider(activeProvider.id, 'tv')
            ]);
            setMovies(movieRes.results);
            setTvShows(tvRes.results);
        } catch (error) {
            console.error("Failed to fetch provider data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [activeProvider]);

  return (
    <div className="min-h-screen bg-background text-primary pt-24 pb-12">
      <Navbar />
      
      <div className="px-4 md:px-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 flex items-center">
            <PlayCircle className="w-6 h-6 md:w-8 md:h-8 mr-3 text-brand-primary" /> 
            Streaming Networks
        </h1>

        {/* Provider Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-4 mb-12 pb-4">
            {OTT_PROVIDERS.map((provider) => (
                <button
                    key={provider.id}
                    onClick={() => setActiveProvider(provider)}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${
                        activeProvider.id === provider.id 
                        ? 'border-brand-primary scale-105 shadow-[0_0_20px_rgba(229,9,20,0.5)]' 
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-500'
                    }`}
                >
                    <div className="w-20 h-20 md:w-32 md:h-32 bg-surface flex items-center justify-center p-2">
                        <img 
                            src={provider.logo} 
                            alt={provider.name} 
                            className="w-full h-full object-contain drop-shadow-md"
                        />
                    </div>
                    {/* Active Indicator */}
                    {activeProvider.id === provider.id && (
                        <div className="absolute inset-0 bg-brand-primary/10 pointer-events-none" />
                    )}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-6 flex items-baseline">
                <h2 className="text-xl md:text-2xl font-bold">Popular on <span className="text-brand-primary">{activeProvider.name}</span></h2>
             </div>

             {loading ? (
                <div className="space-y-12">
                    <div className="space-y-4">
                        <div className="h-6 w-32 bg-white/10 rounded"></div>
                        <div className="flex space-x-3 md:space-x-4 overflow-hidden">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[200px] md:w-[200px] aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-6 w-32 bg-white/10 rounded"></div>
                        <div className="flex space-x-3 md:space-x-4 overflow-hidden">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[200px] md:w-[200px] aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                            ))}
                        </div>
                    </div>
                </div>
             ) : (
                <>
                    <ContentRow title="Movies" items={movies.map(m => ({...m, media_type: 'movie'}))} />
                    <ContentRow title="TV Shows" items={tvShows.map(t => ({...t, media_type: 'tv'}))} />
                </>
             )}
        </div>
      </div>
    </div>
  );
};

export default Networks;