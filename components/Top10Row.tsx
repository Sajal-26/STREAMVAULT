import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import MediaCard from './MediaCard';

interface Top10RowProps {
  items: MediaItem[];
}

const Top10Row: React.FC<Top10RowProps> = ({ items }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = rowRef.current;
    if (!ref) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(ref);
    return () => observer.disconnect();
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { current } = rowRef;
      const scrollAmount = direction === 'left' ? -(current.clientWidth * 0.8) : (current.clientWidth * 0.8);
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 500);
    }
  };

  if (!items || items.length === 0) return null;

  const top10Items = items.slice(0, 10);

  return (
    <div className="mb-16 relative group/row">
      <div className="px-4 md:px-12 flex items-center gap-4 mb-6 md:mb-8 select-none">
        <h2 
            className="text-5xl md:text-7xl font-black tracking-tighter text-transparent transition-colors duration-300"
            style={{ WebkitTextStroke: '2px var(--color-primary)' }}
        >
            TOP 10
        </h2>
        <span className="text-base md:text-xl font-bold text-white uppercase tracking-widest leading-tight max-w-[100px]">
            Content Today
        </span>
      </div>
      
      <div className="relative">
        {canScrollLeft && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
          >
            <ChevronLeft className="w-10 h-10 text-white hover:scale-125 transition-transform drop-shadow-lg" />
          </button>
        )}

        <div 
          ref={rowRef}
          onScroll={checkScroll}
          className="flex space-x-0 overflow-x-auto hide-scrollbar pb-12 pt-12 px-4 md:px-12"
        >
          {top10Items.map((item, index) => (
             <div key={item.id} className="relative flex-shrink-0 pr-6 group cursor-pointer">
                 <div className="flex items-end relative">
                     {/* The Number */}
                     <span 
                        className="text-[9rem] sm:text-[11rem] md:text-[14rem] font-black leading-none tracking-tighter select-none scale-y-110 origin-bottom transform translate-y-3 z-0 transition-all duration-300 text-transparent group-hover:text-[var(--color-primary)]"
                        style={{ WebkitTextStroke: '4px var(--color-primary)' }}
                     >
                        {index + 1}
                     </span>
                     
                     {/* The Card Container */}
                     <div className="min-w-[130px] w-[130px] sm:min-w-[150px] sm:w-[150px] md:min-w-[180px] md:w-[180px] z-10 -ml-2 sm:-ml-4 md:-ml-6 mb-2 transition-transform duration-300 group-hover:scale-105 origin-center">
                        <MediaCard item={item} />
                     </div>
                 </div>
             </div>
          ))}
        </div>

        {canScrollRight && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
          >
            <ChevronRight className="w-10 h-10 text-white hover:scale-125 transition-transform drop-shadow-lg" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Top10Row;