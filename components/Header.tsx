'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import Logo from './Logo';

// ★修正：onAboutClick を受け取れるように型定義を追加
type Props = {
  currentUser: User | null;
  nickname: string | null;
  onAboutClick?: () => void; 
};

export default function Header({ currentUser, nickname, onAboutClick }: Props) {
  return (
    <div className="absolute top-0 left-0 z-10 w-full p-3 px-4 bg-white/90 backdrop-blur-sm shadow-sm flex justify-start md:justify-center items-center pointer-events-none">
      
      {/* 左側：ロゴ */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <Logo className="w-6 h-6 md:w-8 md:h-8 text-bunko-ink" />
        <h1 className="font-serif text-sm md:text-lg tracking-widest text-bunko-ink">
          おきてがみ
          <span className="text-[10px] md:text-xs ml-2 relative -top-0.5 text-gray-600 font-sans">by 木林文庫 (β版)</span>
        </h1>
      </div>
      
      {/* 右側：ボタンエリア */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-3">
        
        {/* ★追加：遊び方ボタン（はてなアイコン） */}
        {onAboutClick && (
          <button 
            onClick={onAboutClick}
            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-500 hover:text-green-700 hover:border-green-700 transition-colors shadow-sm"
          >
            <span className="text-xs font-bold font-serif">?</span>
          </button>
        )}

        {/* ログイン / マイページボタン */}
        {currentUser ? (
          <Link href="/mypage">
            <span className="text-[10px] text-gray-500 font-serif border border-gray-300 rounded-full px-2 py-1 bg-white hover:bg-gray-50 hover:text-green-700 hover:border-green-700 transition-colors cursor-pointer block">
              {nickname ? `${nickname} さん` : '...'}
            </span>
          </Link>
        ) : (
          <Link href="/login" className="text-[10px] font-bold text-green-700 bg-white px-3 py-1.5 rounded-full border border-green-700 shadow-sm hover:bg-green-50 transition-colors">
            ログイン
          </Link>
        )}
      </div>
    </div>
  );
}