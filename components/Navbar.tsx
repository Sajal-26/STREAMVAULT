import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Settings, Star, Download, Layers, Building2, List } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface SuggestionGroup {
  label: string;
  items: MediaItem[];
  icon: React.ReactNode;
}

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionGroup[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          // Parallel search for categorized preview
          const [multiRes, collectionRes, companyRes, keywordRes] = await Promise.all([
             tmdbService.search(searchQuery, 1),
             tmdbService.searchCollections(searchQuery, 1),
             tmdbService.searchCompanies(searchQuery, 1),
             tmdbService.searchKeywords(searchQuery, 1)
          ]);

          const groups: SuggestionGroup[] = [];

          // 1. Movies & TV (Top 3)
          const media = multiRes.results
             .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
             .slice(0, 3);
          if (media.length > 0) {
              groups.push({
                  label: 'Movies & TV',
                  items: media,
                  icon: <Star className="w-3 h-3" />
              });
          }

          // 2. Collections (Top 2)
          const collections = collectionRes.results.slice(0, 2).map((c: any) => ({
             ...c, media_type: 'collection' as const
          }));
          if (collections.length > 0) {
              groups.push({
                  label: 'Collections',
                  items: collections,
                  icon: <Layers className="w-3 h-3" />
              });
          }

          // 3. Companies (Top 2)
          const companies = companyRes.results.slice(0, 2).map((c: any) => ({
             id: c.id, 
             title: c.name, 
             name: c.name, 
             logo_path: c.logo_path,
             poster_path: null, 
             backdrop_path: null, 
             overview: '', 
             vote_average: 0,
             media_type: 'company' as const
          }));
          if (companies.length > 0) {
              groups.push({
                  label: 'Companies',
                  items: companies,
                  icon: <Building2 className="w-3 h-3" />
              });
          }

          // 4. Lists / Keywords (Top 2)
          const lists = keywordRes.results.slice(0, 2).map((k: any) => ({
             id: k.id,
             title: k.name,
             name: k.name,
             poster_path: null, 
             backdrop_path: null, 
             overview: 'List',
             vote_average: 0,
             media_type: 'collection' as const // Treat keyword as collection for UI simplicity here, handled in click
          }));
          // Hack: Add a flag or handle click specifically for keywords
          // We'll treat them as a special type for the handler
          const finalLists = lists.map(l => ({...l, media_type: 'keyword_list' as any}));

          if (finalLists.length > 0) {
              groups.push({
                  label: 'Lists & Themes',
                  items: finalLists,
                  icon: <List className="w-3 h-3" />
              });
          }

          setSuggestions(groups);
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

  const handleSuggestionClick = (item: MediaItem | any) => {
    setShowSuggestions(false);
    setSearchQuery('');
    
    if (item.media_type === 'movie' || item.media_type === 'tv') {
        navigate(`/details/${item.media_type}/${item.id}`);
    } else if (item.media_type === 'collection') {
        navigate(`/collection/${item.id}`);
    } else if (item.media_type === 'company') {
        navigate(`/category/company_${item.id}`);
    } else if (item.media_type === 'keyword_list') {
        navigate(`/category/keyword_${item.id}`);
    } else if (item.media_type === 'person') {
        navigate(`/person/${item.id}`);
    }
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
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
                        placeholder="Search StreamVault..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                        className="bg-transparent text-white text-sm focus:outline-none placeholder-gray-400 w-full h-full pl-10 pr-4"
                    />
                </div>
              </form>
              
              {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
                      {suggestions.map((group, gIdx) => (
                          <div key={gIdx}>
                              <div className="px-3 py-2 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                  {group.icon} {group.label}
                              </div>
                              {group.items.map((item) => (
                                <div 
                                    key={`${item.media_type}-${item.id}`}
                                    onClick={() => handleSuggestionClick(item)}
                                    className="flex items-center p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                                >
                                    <div className="w-10 h-14 shrink-0 rounded bg-gray-800 overflow-hidden mr-3 flex items-center justify-center">
                                        {item.media_type === 'company' && item.logo_path ? (
                                             <img src={`${IMAGE_BASE_URL}/w92${item.logo_path}`} alt={item.name} className="w-full h-auto object-contain p-1" />
                                        ) : item.poster_path ? (
                                            <img src={`${IMAGE_BASE_URL}/w92${item.poster_path}`} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-[10px] text-gray-500 text-center p-1">{item.title?.[0] || item.name?.[0]}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-white truncate">{item.title || item.name}</h4>
                                        <div className="flex items-center text-xs text-gray-400 mt-1">
                                            {item.vote_average > 0 && (
                                                <span className="flex items-center text-green-400 mr-2">
                                                    <Star className="w-3 h-3 mr-0.5 fill-current" />
                                                    {item.vote_average.toFixed(1)}
                                                </span>
                                            )}
                                            {item.release_date && <span>{item.release_date.split('-')[0]}</span>}
                                        </div>
                                    </div>
                                </div>
                              ))}
                          </div>
                      ))}
                      <div 
                        onClick={(e) => handleSearch(e as any)}
                        className="p-3 text-center text-xs font-medium text-brand-primary cursor-pointer hover:bg-white/5 transition-colors uppercase tracking-wider border-t border-white/10"
                      >
                          View All Results
                      </div>
                  </div>
              )}
            </div>

            {installPrompt && (
                <button 
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    title="Install StreamVault App"
                >
                    <Download className="w-4 h-4" /> Install App
                </button>
            )}

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
            {installPrompt && (
               <button
                  onClick={() => {
                      handleInstallClick();
                      setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-brand-primary hover:text-white hover:bg-white/10 flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" /> Install App
               </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;