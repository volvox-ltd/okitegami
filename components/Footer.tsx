'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import IconMap from '@/components/IconMap';
import IconShelf from '@/components/IconShelf';
import IconAbout from '@/components/IconAbout';

type Props = {
  currentUser: User | null;
  onResetMap: () => void;  // 地図（手紙を探す）ボタン用
  onAboutClick: () => void; // Aboutボタン用
};

export default function Footer({ currentUser, onResetMap, onAboutClick }: Props) {
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-2xl h-16 flex justify-around items-center z-40 px-2 pointer-events-auto">
      
      {/* 1. 手紙を探す (地図リセット) */}
      <button 
        onClick={onResetMap}
        className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
      >
        <IconMap className="w-7 h-7 mt-2 mb-2 text-bunko-gray group-hover:text-orange-500 transition-colors" />
        <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">手紙を探す</span>
      </button>

      {/* 2. マイページ (ログイン時のみ表示) */}
      {currentUser && (
        <Link href="/mypage" className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group">
          <IconShelf className="w-7 h-7 mt-2 mb-2 text-bunko-gray group-hover:text-orange-500 transition-colors" />
          <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">
            マイページ
          </span>
        </Link>
      )}

      {/* 3. おきてがみとは */}
      <button 
        onClick={onAboutClick}
        className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
      >
        <IconAbout className="w-7 h-7 mt-2 mb-2 text-bunko-gray group-hover:text-orange-500 transition-colors" />
        <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">おきてがみとは</span>
      </button>
      
    </div>
  );
}