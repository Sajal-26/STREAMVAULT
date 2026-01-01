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
      {/* Header Section */}
      <div className="px-4 md:px-12 flex items-center gap-3 mb-6 md:mb-8 select-none">
        <h2 
            className="text-6xl md:text-8xl font-black tracking-tighter text-transparent transition-colors duration-300"
            style={{ WebkitTextStroke: '2px var(--color-primary)' }}
        >
            TOP 10
        </h2>
        <div className="flex flex-col justify-center space-y-1 mt-2">
            <span className="text-sm md:text-lg font-bold text-white uppercase tracking-widest leading-none">
                CONTENT
            </span>
            <span className="text-sm md:text-lg font-bold text-white uppercase tracking-widest leading-none">
                TODAY
            </span>
        </div>
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
          className="flex space-x-0 overflow-x-auto hide-scrollbar pb-12 pt-8 px-4 md:px-12"
        >
          {top10Items.map((item, index) => (
             <div key={item.id} className="relative flex-shrink-0 pr-6 group cursor-pointer">
                 <div className="flex items-end relative">
                     {/* The Number */}
                     {/* 
                        Using font-bold instead of font-black to ensure counters (holes in 4, 0, etc) are visible.
                        Reduced stroke width to 3px for cleaner hollow look.
                     */}
                     <span 
                        className="text-[10rem] sm:text-[12rem] md:text-[15rem] font-bold leading-none tracking-tighter select-none scale-y-110 origin-bottom transform translate-y-4 z-0 transition-all duration-300 text-transparent group-hover:text-[var(--color-primary)]"
                        style={{ WebkitTextStroke: '3px var(--color-primary)' }}
                     >
                        {index + 1}
                     </span>
                     
                     {/* The Card Container */}
                     <div className="min-w-[130px] w-[130px] sm:min-w-[150px] sm:w-[150px] md:min-w-[180px] md:w-[180px] z-10 -ml-2 sm:-ml-4 md:-ml-8 mb-2 transition-transform duration-300 group-hover:scale-105 origin-center">
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