import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { MediaItem } from '../types';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  onRemove?: (id: number) => void;
}

const ContentRow: React.FC<ContentRowProps> = ({ title, items, onRemove }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      // Only show arrows if there is actual overflow
      const hasOverflow = scrollWidth > clientWidth;
      
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(hasOverflow && Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    
    // ResizeObserver ensures we detect overflow changes when images load or window resizes
    const ref = rowRef.current;
    if (!ref) return;

    const observer = new ResizeObserver(() => {
        checkScroll();
    });
    
    observer.observe(ref);
    return () => observer.disconnect();
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { current } = rowRef;
      const scrollAmount = direction === 'left' 
        ? -(current.clientWidth * 0.8) 
        : (current.clientWidth * 0.8);
        
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      // Timeout to check scroll state after animation finishes
      setTimeout(checkScroll, 500);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12 px-4 md:px-12 relative group/row">
      <h2 className="text-lg md:text-2xl font-bold text-primary mb-3 md:mb-4 flex items-center">
        <span className="w-1 h-5 md:h-6 bg-brand-primary mr-3 rounded-full"></span>
        {title}
      </h2>
      
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
          className="flex space-x-3 md:space-x-4 overflow-x-auto hide-scrollbar pb-4 scroll-smooth pt-4 -mt-4 px-1" // Added padding top to account for hover scale
        >
          {items.map((item) => (
             <div key={item.id} className="min-w-[150px] w-[150px] sm:min-w-[180px] sm:w-[180px] md:min-w-[220px] md:w-[220px] flex-shrink-0 mb-4">
                <MediaCard item={item} onRemove={onRemove} />
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

export default ContentRow;