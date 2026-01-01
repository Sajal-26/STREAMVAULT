import React, { useState, useEffect } from 'react';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import ContentRow from './ContentRow';

// User defined provider map
const PROVIDER_CONFIG = [
  { key: 'netflix', name: 'Netflix', id: 8, color: '#E50914' },
  { key: 'prime_video', name: 'Prime', id: 9, color: '#00A8E1' },
  { key: 'disney_hotstar', name: 'Disney+', id: 122, color: '#113CCF' }, // Using 122 (Hotstar) as per request, generic Disney+ is 337 usually
  { key: 'zee5', name: 'Zee5', id: 232, color: '#FF0000' },
  { key: 'sony_liv', name: 'Sony LIV', id: 237, color: '#F89406' },
  { key: 'apple_tv', name: 'Apple TV', id: 2, color: '#A3AAAE' },
];

interface ProviderRowProps {
  type: 'movie' | 'tv';
  titlePrefix: string;
}

const ProviderRow: React.FC<ProviderRowProps> = ({ type, titlePrefix }) => {
  const [selectedProvider, setSelectedProvider] = useState(PROVIDER_CONFIG[0]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await tmdbService.discoverByProvider(selectedProvider.id, type);
        if (isMounted) {
          setItems(res.results.map(item => ({ ...item, media_type: type })));
        }
      } catch (error) {
        console.error(`Failed to fetch ${type} for provider ${selectedProvider.name}`, error);
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [selectedProvider, type]);

  return (
    <div className="mb-8 md:mb-12">
      {/* Custom Header with Tabs */}
      <div className="px-4 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          
          {/* Title Area */}
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center">
            <span 
                className="w-1 h-5 md:h-6 mr-3 rounded-full transition-colors duration-300"
                style={{ backgroundColor: selectedProvider.color }}
            ></span>
            {titlePrefix} <span style={{ color: selectedProvider.color }} className="ml-2 transition-colors duration-300">{selectedProvider.name}</span>
          </h2>

          {/* Provider Tabs */}
          <div className="flex items-center space-x-4 md:space-x-6 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
              {PROVIDER_CONFIG.map((provider) => (
                  <button
                    key={provider.key}
                    onClick={() => setSelectedProvider(provider)}
                    className={`whitespace-nowrap text-sm md:text-base font-medium transition-all duration-300 border-b-2 pb-1 ${
                        selectedProvider.key === provider.key 
                        ? 'text-white border-white scale-105' 
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                      {provider.name}
                  </button>
              ))}
          </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="px-4 md:px-12 flex space-x-4 overflow-hidden">
             {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="min-w-[150px] w-[150px] sm:min-w-[180px] sm:w-[180px] md:min-w-[220px] md:w-[220px] aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
            ))}
        </div>
      ) : (
        /* Passing an Empty Title to ContentRow because we built our own custom header above */
        <div className="-mt-12"> {/* Negative margin to pull the row up into our custom header space */}
             <ContentRow title="" items={items} />
        </div>
      )}
    </div>
  );
};

export default ProviderRow;