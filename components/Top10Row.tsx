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
    <div className="mb-12 px-4 md:px-12 relative group/row">
      <div className="flex items-baseline gap-2 mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tighter">
            Top 10
        </h2>
        <span className="text-lg font-bold text-secondary uppercase tracking-widest">
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
          className="flex space-x-0 overflow-x-auto hide-scrollbar pb-8 pt-4 -ml-4" // Negative margin to handle the big numbers padding
        >
          {top10Items.map((item, index) => (
             <div key={item.id} className="relative flex-shrink-0 pl-4 pr-2 group">
                 <div className="flex items-end relative">
                     {/* The Number */}
                     <span 
                        className="text-[10rem] md:text-[14rem] font-black leading-none text-black tracking-tighter select-none scale-y-110 origin-bottom transform translate-y-2 translate-x-4 z-0"
                        style={{ WebkitTextStroke: '4px #555' }}
                     >
                        {index + 1}
                     </span>
                     
                     {/* The Card Container */}
                     <div className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[180px] md:w-[180px] z-10 -ml-6 md:-ml-8 mb-4">
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