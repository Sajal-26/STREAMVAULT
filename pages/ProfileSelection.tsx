import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Profile } from '../types';

const ProfileSelection: React.FC = () => {
  const { profiles, selectProfile, addProfile } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (profile: Profile) => {
    selectProfile(profile);
    navigate('/');
  };

  const handleAddProfile = () => {
    const name = prompt("Enter profile name:");
    if (name) addProfile(name);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center animate-in fade-in duration-700">
      <h1 className="text-3xl md:text-5xl text-primary font-normal mb-12">Who's watching?</h1>
      
      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
        {profiles.map((profile) => (
          <div 
            key={profile.id} 
            onClick={() => handleSelect(profile)}
            className="group flex flex-col items-center cursor-pointer w-24 md:w-32"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-200 mb-4">
               <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-secondary group-hover:text-primary transition-colors text-lg">{profile.name}</span>
          </div>
        ))}

        <div 
            onClick={handleAddProfile}
            className="group flex flex-col items-center cursor-pointer w-24 md:w-32"
        >
            <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center rounded-md overflow-hidden border-2 border-transparent group-hover:bg-primary group-hover:text-background hover:border-primary transition-all duration-200 mb-4 bg-surface text-secondary">
               <PlusCircle className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <span className="text-secondary group-hover:text-primary transition-colors text-lg">Add Profile</span>
        </div>
      </div>

      <button className="mt-20 border border-secondary text-secondary px-8 py-2 hover:border-primary hover:text-primary transition tracking-widest uppercase">
        Manage Profiles
      </button>
    </div>
  );
};

export default ProfileSelection;