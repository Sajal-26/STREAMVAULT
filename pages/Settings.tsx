import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Check, Trash2, User } from 'lucide-react';

const COLORS = [
  { name: 'Red', value: '#E50914' },
  { name: 'Blue', value: '#007AFF' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Cyan', value: '#06b6d4' },
];

const Settings: React.FC = () => {
  const { 
    accentColor, 
    setAccentColor,
    clearData
  } = useAuth();
  const { showToast } = useToast();

  const handleClearData = () => {
      if(window.confirm("Are you sure? This will delete your Watchlist and Liked items from this browser.")) {
          clearData();
          showToast('All local data has been cleared.', 'error');
      }
  };

  const handleColorChange = (color: string) => {
      setAccentColor(color);
      showToast('Theme accent color updated.', 'success');
  };

  return (
    <div className="min-h-screen bg-background text-primary transition-colors duration-300 pt-24 pb-12">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-secondary mb-10">Customize your StreamVault experience.</p>

        {/* Profile Section */}
        <section className="bg-surface rounded-lg p-6 mb-8 border border-white/5 shadow-sm">
           <h2 className="text-xl font-bold mb-6 border-b border-gray-700/20 pb-2">Guest Profile</h2>
           <div className="flex items-center mb-6">
              <div className="w-16 h-16 rounded-md bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white text-2xl font-bold mr-6 shadow-md">
                <User className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="text-lg font-medium">Guest User</h3>
                 <p className="text-secondary text-sm">Local Session • Data stored in browser</p>
                 <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-bold rounded">
                    ACTIVE
                 </span>
              </div>
           </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-surface rounded-lg p-6 mb-8 border border-white/5 shadow-sm">
           <h2 className="text-xl font-bold mb-6 border-b border-gray-700/20 pb-2">Appearance</h2>
           
           {/* Accent Color */}
           <div>
              <label className="block text-sm font-medium text-secondary mb-4">Accent Color</label>
              <div className="flex flex-wrap gap-4">
                 {COLORS.map((c) => (
                    <button
                       key={c.name}
                       onClick={() => handleColorChange(c.value)}
                       className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                       style={{ backgroundColor: c.value }}
                       title={c.name}
                    >
                       {accentColor === c.value && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                    </button>
                 ))}
              </div>
           </div>
        </section>

        {/* Data Management */}
        <section className="bg-surface rounded-lg p-6 mb-8 border border-white/5 shadow-sm">
           <h2 className="text-xl font-bold mb-6 border-b border-gray-700/20 pb-2 text-red-500">Danger Zone</h2>
           <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-white">Clear All Data</h4>
                    <p className="text-sm text-secondary">Remove your watchlist, liked items, and preferences.</p>
                </div>
                <button 
                    onClick={handleClearData}
                    className="flex items-center px-4 py-2 border border-red-500/50 text-red-500 rounded hover:bg-red-500/10 transition"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Clear Data
                </button>
           </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;