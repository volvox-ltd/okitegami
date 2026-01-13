'use client';
import Link from 'next/link';

type MypageHeaderProps = {
  email: string | undefined;
  acornCount: number;
  onAcornClick: () => void;
};

export default function MypageHeader({ email, acornCount, onAcornClick }: MypageHeaderProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm px-6 py-4 shadow-sm text-center relative sticky top-0 z-10">
      <Link href="/" className="absolute top-1/2 -translate-y-1/2 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-black transition-colors">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
         </svg>
      </Link>
      <h1 className="text-lg font-bold font-serif text-bunko-ink tracking-widest">マイページ</h1>
      {email && <p className="text-[10px] text-gray-400 mt-1 font-sans">{email}</p>}
        <div 
        onClick={onAcornClick}
        className="flex items-center gap-1.5 bg-amber-50/50 px-3 py-0.5 rounded-full border border-amber-100 shadow-sm mt-2 mx-auto w-fit cursor-pointer hover:bg-amber-100 transition-colors active:scale-95">
        <img src="/acorn.svg" alt="acorn" className="w-4 h-4" />
        <span className="text-[11px] font-bold text-amber-900 font-mono">{acornCount || 0}</span>
        <span className="text-[8px] text-amber-700 font-serif tracking-tighter">どんぐり</span>
      </div>

    </div>
  );
}