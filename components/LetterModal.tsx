'use client';

import { useState, useRef, useEffect } from 'react';

type Props = {
  letter: {
    title: string;
    spot_name: string;
    content: string;
    image_url?: string;
  };
  onClose: () => void;
};

export default function LetterModal({ letter, onClose }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const scrollWidth = contentRef.current.scrollWidth;
      const clientWidth = contentRef.current.clientWidth;
      setTotalPages(Math.ceil(scrollWidth / clientWidth));
    }
  }, [letter]);

  const handleNext = () => {
    if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      
      <div className="bg-white w-full max-w-2xl h-[80vh] md:h-[70vh] rounded-md shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* ↓↓ 修正箇所：閉じるボタン ↓↓
           bg-gray-200 (通常時の背景)
           text-gray-500 (通常時のアイコン色)
           hover:bg-red-500 (ホバー時の背景：くっきりした赤)
           hover:text-white (ホバー時のアイコン色：白)
        */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white rounded-full p-2 transition-colors shadow-sm"
          title="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-hidden relative py-10 px-6 md:px-10">
          <div 
            className="h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(${currentPage * 100}%)`, width: '100%' }}
          >
            <div 
              ref={contentRef}
              className="h-full text-bunko-ink leading-loose tracking-widest text-base md:text-lg font-serif"
              style={{
                writingMode: 'vertical-rl',
                columnWidth: 'auto', columnCount: 'auto', columnFill: 'auto',
                height: '100%', width: '100%',
              }}
            >
              <div className="h-full flex flex-col justify-start ml-8 border-l border-bunko-red/30 pl-6 inline-block align-top">
                 <h2 className="text-xl md:text-2xl font-bold mb-2">{letter.title}</h2>
                 <p className="text-sm text-bunko-gray mb-8">{letter.spot_name}</p>
                 {letter.image_url && (
                   <img src={letter.image_url} className="w-48 rounded shadow-md object-cover mb-4 grayscale-[0.2] sepia-[0.3]" />
                 )}
              </div>
              <p className="whitespace-pre-wrap inline-block">{letter.content}</p>
              <p className="mt-8 ml-4 text-sm text-bunko-gray inline-block">木林より</p>
            </div>
          </div>
        </div>

        <div className="bg-[#f9f9f9] p-4 flex justify-between items-center text-bunko-ink font-serif text-sm border-t border-gray-100">
          <button 
            onClick={handleNext} disabled={currentPage >= totalPages - 1}
            className={`px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors ${currentPage >= totalPages - 1 ? 'opacity-30' : ''}`}
          >
            ← 次の頁
          </button>
          <span>{currentPage + 1} / {totalPages}</span>
          <button 
            onClick={handlePrev} disabled={currentPage === 0}
            className={`px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors ${currentPage === 0 ? 'opacity-30' : ''}`}
          >
            前の頁 →
          </button>
        </div>
      </div>
    </div>
  );
}