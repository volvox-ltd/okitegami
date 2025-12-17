'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import Logo from './Logo';

type Props = {
  currentUser: User | null;
  nickname: string | null;
};

export default function Header({ currentUser, nickname }: Props) {
  return (
    <div className="absolute top-0 left-0 z-10 w-full p-3 bg-white/90 backdrop-blur-sm shadow-sm flex justify-center items-center pointer-events-none">
      
      {/* ★変更：ロゴとタイトルを中央寄せのコンテナでまとめる */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <Logo className="w-8 h-8 text-bunko-ink" />
        <h1 className="text-center font-serif text-lg tracking-widest text-bunko-ink">
          おきてがみ
          <span className="text-xs ml-2 relative -top-0.5 text-gray-600 font-sans">by 木林文庫 (β版)</span>
        </h1>
      </div>
      
      {/* 右端：ログイン/ユーザー情報（そのまま） */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        {currentUser ? (
          <Link href="/mypage">
            <span className="text-[10px] text-gray-500 font-serif border border-gray-300 rounded-full px-2 py-1 bg-white hover:bg-gray-50 hover:text-green-700 hover:border-green-700 transition-colors cursor-pointer">
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