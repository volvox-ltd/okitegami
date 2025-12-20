'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import Logo from './Logo';

type Props = {
  currentUser: User | null;
  nickname: string | null;
  onAboutClick?: () => void; 
};

export default function Header({ currentUser, nickname, onAboutClick }: Props) {
  return (
    // ★修正：top-0 ではなく top-safe (またはパディング調整) を行いたいですが、
    // absolute配置なので、env(safe-area-inset-top) を margin-top に適用するのが最も安全です。
    // また、z-indexを上げて地図より手前に来ることを確実にします。
    <div 
      className="absolute left-0 z-50 w-full p-3 px-4 bg-white/90 backdrop-blur-sm shadow-sm flex justify-between items-center pointer-events-none transition-all"
      style={{ top: 'env(safe-area-inset-top)' }} // ★ここを追加：セーフエリアの下に配置
    >
      
      {/* 左側：ロゴ & タイトル */}
      <div className="flex items-center gap-2 pointer-events-auto pl-1">
        <Logo className="w-10 h-10 md:w-10 md:h-10 text-bunko-ink" />
        <div className="flex flex-col">
          <h1 className="font-serif text-sm md:text-lg tracking-widest text-bunko-ink leading-none">
            おきてがみ
          </h1>
        </div>
      </div>
      
      {/* 右側：ボタンエリア */}
      <div className="pointer-events-auto flex items-center gap-3 pr-1">
        
        {/* 遊び方ボタン */}
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
            <span className="text-[10px] text-gray-500 font-serif border border-gray-300 rounded-full px-3 py-1 bg-white hover:bg-gray-50 hover:text-green-700 hover:border-green-700 transition-colors cursor-pointer block shadow-sm">
              {nickname ? nickname : 'マイページ'}
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