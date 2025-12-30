import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { MediaItem } from '../types';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
}

const ContentRow: React.FC<ContentRowProps> = ({ title, items }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { current } = rowRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 100 : current.offsetWidth - 100;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8 md:mb-12 px-4 md:px-12 relative group">
      <h2 className="text-lg md:text-2xl font-bold text-primary mb-3 md:mb-4 flex items-center">
        <span className="w-1 h-5 md:h-6 bg-brand-primary mr-3 rounded-full"></span>
        {title}
      </h2>
      
      <div className="relative">
        <button 
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-background to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer disabled:opacity-0"
        >
          <ChevronLeft className="w-8 h-8 text-primary hover:scale-125 transition-transform" />
        </button>

        <div 
          ref={rowRef}
          className="flex space-x-3 md:space-x-4 overflow-x-auto hide-scrollbar pb-4 scroll-smooth"
        >
          {items.map((item) => (
             <div key={item.id} className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[200px] md:w-[200px]">
                <MediaCard item={item} />
             </div>
          ))}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-background to-transparent items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-primary hover:scale-125 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ContentRow;