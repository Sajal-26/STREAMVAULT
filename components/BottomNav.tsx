import React from 'react';
import { Link, useLocation } from '../services/skipService';
import { Home, Film, Tv, List } from 'lucide-react';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'Series', path: '/tv', icon: Tv },
    { name: 'My List', path: '/watchlist', icon: List },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#141414]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => (
          <Link 
            key={item.name}
            to={item.path} 
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95 ${
              isActive(item.path) ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;