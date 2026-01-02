import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import { tmdbService } from '../services/tmdb';
import { CollectionDetails as CollectionDetailsType } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { Layers } from 'lucide-react';

const CollectionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await tmdbService.getCollectionDetails(parseInt(id));
        setCollection(res);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <CollectionSkeleton />;
  
  if (!collection) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 pt-20">
            <Navbar />
            <h2 className="text-2xl font-bold text-primary mb-4">Collection Not Found</h2>
            <button 
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-600 text-white rounded font-medium hover:bg-white/10 transition"
            >
                Go Back
            </button>
        </div>
      );
  }

  const backdrop = collection.backdrop_path ? `${IMAGE_BASE_URL}/original${collection.backdrop_path}` : '';
  const parts = collection.parts
    .map(p => ({ ...p, media_type: 'movie' as const }))
    .sort((a, b) => {
        if (!a.release_date) return 1;
        if (!b.release_date) return -1;
        return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
    });

  return (
    <div className="min-h-screen bg-background text-primary pb-20">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] w-full bg-black overflow-hidden group">
        <div className="absolute inset-0">
          <img src={backdrop} alt={collection.name} className="w-full h-full object-cover opacity-60" />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12">
             <div className="max-w-4xl">
                <div className="flex items-center gap-3 mb-4 text-brand-primary">
                    <Layers className="w-6 h-6" />
                    <span className="text-sm font-bold uppercase tracking-wider">Collection</span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white leading-tight">
                    {collection.name}
                </h1>
                <p className="text-gray-200 text-base md:text-lg leading-relaxed max-w-2xl">
                    {collection.overview}
                </p>
                <div className="mt-6 flex items-center gap-4 text-sm text-gray-300">
                    <span className="bg-white/10 px-3 py-1 rounded-full border border-white/5">
                        {parts.length} Movies
                    </span>
                </div>
             </div>
        </div>
      </div>

      <div className="px-4 md:px-12 py-8">
         <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="w-1 h-6 bg-brand-primary mr-3 rounded-full"></span>
            Movies in this Collection
         </h2>
         
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {parts.map(item => (
                <MediaCard key={item.id} item={item} />
            ))}
         </div>
      </div>
    </div>
  );
};

const CollectionSkeleton = () => {
    return (
        <div className="min-h-screen bg-background">
            <div className="h-20 w-full bg-black/50 fixed top-0 z-50"></div>
            <div className="relative h-[50vh] md:h-[60vh] w-full bg-surface animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-12">
                     <div className="h-4 w-24 bg-white/10 rounded mb-4"></div>
                     <div className="h-12 w-2/3 md:w-1/2 bg-white/10 rounded mb-4"></div>
                     <div className="h-20 w-full md:w-1/3 bg-white/5 rounded"></div>
                </div>
            </div>
            <div className="px-4 md:px-12 py-8">
                 <div className="h-8 w-48 bg-white/10 rounded mb-6"></div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default CollectionDetails;