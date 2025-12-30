import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Settings, Star } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Glass effect logic
      setIsScrolled(currentScrollY > 50);

      // Smart Navbar logic (Hide on down, Show on up)
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await tmdbService.search(searchQuery);
          const filtered = res.results
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 5);
          setSuggestions(filtered);
          setShowSuggestions(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (type: string, id: number) => {
    navigate(`/details/${type}/${id}`);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'TV Shows', path: '/tv' },
    { name: 'My List', path: '/watchlist' },
    { name: 'Liked', path: '/liked' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isScrolled ? 'glass shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-brand-primary tracking-tighter mr-2">
              STREAM<span className="text-white">VAULT</span>
            </Link>

            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? 'text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <div className="relative" ref={searchContainerRef}>
              <form onSubmit={handleSearch} className="group">
                <div className="relative flex items-center bg-black/30 border border-transparent focus-within:border-white/20 rounded-full transition-all duration-300 w-10 group-hover:w-64 focus-within:w-64 overflow-hidden h-10">
                    {/* Fixed Icon Container */}
                    <div className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center pointer-events-none z-10">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Titles, people, genres"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                        className="bg-transparent text-white text-sm focus:outline-none placeholder-gray-400 w-full h-full pl-10 pr-4"
                    />
                </div>
              </form>
              
              {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {suggestions.map((item) => (
                          <div 
                              key={item.id}
                              onClick={() => handleSuggestionClick(item.media_type, item.id)}
                              className="flex items-center p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                          >
                              <div className="w-10 h-14 shrink-0 rounded bg-gray-800 overflow-hidden mr-3">
                                  {item.poster_path ? (
                                      <img src={`${IMAGE_BASE_URL}/w92${item.poster_path}`} alt={item.title} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">N/A</div>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-white truncate">{item.title || item.name}</h4>
                                  <div className="flex items-center text-xs text-gray-400 mt-1">
                                      <span className="capitalize mr-2">{item.media_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                                      {item.vote_average > 0 && (
                                          <span className="flex items-center text-green-400">
                                              <Star className="w-3 h-3 mr-0.5 fill-current" />
                                              {item.vote_average.toFixed(1)}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                      <div 
                        onClick={(e) => handleSearch(e as any)}
                        className="p-3 text-center text-xs font-medium text-brand-primary cursor-pointer hover:bg-white/5 transition-colors uppercase tracking-wider"
                      >
                          View All Results
                      </div>
                  </div>
              )}
            </div>

            <Link to="/settings" className="text-gray-300 hover:text-white transition p-1">
                <Settings className="w-5 h-5" />
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
             <form onSubmit={handleSearch} className="px-3 py-2">
               <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 text-white px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
             </form>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10"
              >
                {link.name}
              </Link>
            ))}
             <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;