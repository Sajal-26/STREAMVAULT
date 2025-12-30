import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tmdbService } from '../services/tmdb';
import { PersonDetails as PersonDetailsType, MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';

const PersonDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<PersonDetailsType | null>(null);
  const [credits, setCredits] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerson = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await tmdbService.getPersonDetails(parseInt(id));
        setPerson(res);
        
        // Combine cast and crew, remove duplicates, sort by popularity
        const allCredits = [...res.combined_credits.cast];
        // Filter out items without poster or backdrop to keep quality high
        const filtered = allCredits
            .filter(c => c.poster_path)
            .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            
        // Remove duplicate IDs
        const uniqueCredits = Array.from(new Map(filtered.map(item => [item.id, item])).values());
        
        setCredits(uniqueCredits);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerson();
    window.scrollTo(0,0);
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-brand-primary rounded-full border-t-transparent"></div></div>;
  if (!person) return <div className="text-primary text-center pt-40">Person not found.</div>;

  return (
    <div className="min-h-screen bg-background text-primary pt-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-16">
            {/* Left Column - Image & Personal Info */}
            <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
                <div className="w-48 h-72 md:w-full md:h-auto aspect-[2/3] rounded-lg overflow-hidden shadow-2xl mb-6 bg-surface">
                    {person.profile_path ? (
                        <img src={`${IMAGE_BASE_URL}/w500${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-secondary">No Image</div>
                    )}
                </div>

                <div className="w-full space-y-4 text-sm text-gray-300">
                    <div>
                        <h3 className="font-bold text-white mb-1">Known For</h3>
                        <p>{person.known_for_department}</p>
                    </div>
                    {person.birthday && (
                        <div>
                            <h3 className="font-bold text-white mb-1">Born</h3>
                            <p>{new Date(person.birthday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    )}
                     {person.place_of_birth && (
                        <div>
                            <h3 className="font-bold text-white mb-1">Place of Birth</h3>
                            <p>{person.place_of_birth}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Bio & Content */}
            <div className="w-full md:w-3/4">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">{person.name}</h1>
                
                <div className="mb-10">
                    <h3 className="text-xl font-bold mb-3">Biography</h3>
                    <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-line">
                        {person.biography || "We don't have a biography for " + person.name + "."}
                    </p>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <span className="w-1 h-6 bg-brand-primary mr-3 rounded-full"></span>
                        Known For
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                        {credits.map(item => (
                            <MediaCard key={`${item.id}-${item.media_type}`} item={item} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PersonDetails;