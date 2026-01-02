import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from '../services/skipService';
import MediaCard from './MediaCard';
import { MediaItem } from '../types';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  categoryId?: string;
  onRemove?: (id: number) => void;
}

const ContentRow: React.FC<ContentRowProps> = ({ title, items, categoryId, onRemove }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      const hasOverflow = scrollWidth > clientWidth;
      
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(hasOverflow && Math.ceil(scrollLeft + clientWidth) < scrollWidth);
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
      const scrollAmount = direction === 'left' 
        ? -(current.clientWidth * 0.8) 
        : (current.clientWidth * 0.8);
        
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 500);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 px-4 md:px-12 relative group/row">
      {/* Title */}
      <div className="flex items-center gap-4 mb-2 md:mb-3 relative z-20">
        {title && (
            <h2 className="text-lg md:text-xl font-bold text-primary flex items-center hover:text-white transition-colors">
             {title}
             {categoryId && (
                 <Link 
                    to={`/category/${categoryId}`}
                    className="ml-2 text-xs font-semibold text-brand-primary flex items-center hover:text-white transition-colors"
                 >
                    Explore <ArrowRight className="w-3 h-3 ml-0.5" />
                 </Link>
             )}
            </h2>
        )}
      </div>
      
      <div className="relative">
        {canScrollLeft && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer h-full"
          >
            <ChevronLeft className="w-10 h-10 text-white hover:scale-125 transition-transform drop-shadow-lg" />
          </button>
        )}

        {/* 
            Container Padding Logic:
            The hover card grows significantly (approx 75% wider and taller due to content).
            We add substantial padding to top and bottom to ensure the expanded card is not clipped by overflow-hidden.
            Then we apply negative margins to the outer container (or adjacent elements) to compensate for this visual whitespace.
            
            pt-20 (80px) and pb-20 (80px) should cover the growth.
            -my-16 pulls the layout back.
        */}
        <div 
          ref={rowRef}
          onScroll={checkScroll}
          className="flex space-x-3 md:space-x-4 overflow-x-auto hide-scrollbar px-1 py-20 -my-16 relative z-10"
        >
          {items.map((item) => (
             <div key={item.id} className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[200px] md:w-[200px] flex-shrink-0 transition-transform duration-300">
                <MediaCard item={item} onRemove={onRemove} />
             </div>
          ))}
        </div>

        {canScrollRight && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer h-full"
          >
            <ChevronRight className="w-10 h-10 text-white hover:scale-125 transition-transform drop-shadow-lg" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ContentRow;