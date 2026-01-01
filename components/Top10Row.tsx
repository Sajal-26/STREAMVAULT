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
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
  };

  useEffect(() => {
    checkScroll();
    const ref = rowRef.current;
    if (!ref) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(ref);
    return () => observer.disconnect();
  }, [items]);

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount =
      dir === 'left'
        ? -rowRef.current.clientWidth * 0.85
        : rowRef.current.clientWidth * 0.85;

    rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!items?.length) return null;
  const top10Items = items.slice(0, 10);

  return (
    <div className="mb-20 relative group/row">
      {/* HEADER */}
      <div className="px-6 md:px-14 flex items-center gap-4 mb-10 select-none">
        <h2
          className="text-[5rem] md:text-[7rem] font-black tracking-tight text-transparent transition-colors duration-300"
          style={{ WebkitTextStroke: '2.5px var(--color-primary)' }}
        >
          TOP 10
        </h2>
        <div className="flex flex-col leading-tight mt-3">
          <span className="text-white font-bold tracking-[0.35em] text-sm md:text-lg">
            CONTENT
          </span>
          <span className="text-white font-bold tracking-[0.35em] text-sm md:text-lg">
            TODAY
          </span>
        </div>
      </div>

      <div className="relative">
        {/* LEFT ARROW */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-30 w-14
              bg-gradient-to-r from-black/90 to-transparent
              flex items-center justify-center
              opacity-0 group-hover/row:opacity-100 transition"
          >
            <ChevronLeft className="w-12 h-12 text-white hover:scale-125 transition" />
          </button>
        )}

        {/* ROW */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto hide-scrollbar
            px-6 md:px-14 pt-10 pb-16"
        >
          {top10Items.map((item, index) => (
            <div
              key={item.id}
              className="relative flex-shrink-0 pr-8 group"
            >
              <div className="flex items-end relative">
                {/* NUMBER */}
                <span
                  className="
                    absolute -left-6 md:-left-10 bottom-0
                    text-[11rem] sm:text-[13rem] md:text-[16rem]
                    font-bold leading-none tracking-tighter
                    text-transparent select-none
                    scale-y-110
                    transition-all duration-300
                    group-hover:text-[var(--color-primary)]"
                  style={{ WebkitTextStroke: '4px var(--color-primary)' }}
                >
                  {index + 1}
                </span>

                {/* CARD */}
                <div
                  className="
                    relative z-10
                    min-w-[140px] sm:min-w-[165px] md:min-w-[190px]
                    transition-transform duration-300
                    group-hover:scale-105
                  "
                >
                  <MediaCard item={item} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT ARROW */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-30 w-14
              bg-gradient-to-l from-black/90 to-transparent
              flex items-center justify-center
              opacity-0 group-hover/row:opacity-100 transition"
          >
            <ChevronRight className="w-12 h-12 text-white hover:scale-125 transition" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Top10Row;