import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

type Props = {
  currentUser: User | null;
  nickname: string | null;
  onAboutClick: () => void;
  isHidden: boolean;
};

export default function Header({ currentUser, nickname, onAboutClick, isHidden }: Props) {
  return (
    <header
      // ★修正: py-3 -> py-2 に変更して上下の余白を詰める
      className={`fixed top-0 left-0 w-full z-50 bg-[#fdfcf5]/80 backdrop-blur-md border-b border-[#e6e2d3] px-4 py-2 flex justify-between items-center transition-transform duration-500 shadow-sm pointer-events-none ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* 左側：ロゴ & タイトル画像 */}
      <Link href="/" className="pointer-events-auto">
        <Image
          src="/logo-title.png"
          alt="おきてがみ"
          // width/heightはアスペクト比計算用（1000:335）
          width={1000} 
          height={335} 
          // ★修正: h-12 md:h-14 -> h-9 md:h-11 に変更して画像を小さく
          className="h-9 md:h-11 w-auto object-contain pl-1"
          priority
        />
      </Link>

      {/* 右側メニュー */}
      <div className="flex items-center gap-2 pointer-events-auto">
        
        {/* 「？」アイコンボタン */}
        <button 
          onClick={onAboutClick} 
          // ★修正: ヘッダー高さに合わせてボタンも少し小さく (w-9 h-9 -> w-8 h-8), アイコンも小さく (w-5 h-5 -> w-4 h-4)
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-bunko-ink transition-colors bg-white/60 hover:bg-white rounded-full border border-transparent hover:border-gray-200 shadow-sm"
          aria-label="おきてがみとは？"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 17.25h.007v.008H12v-.008z" />
          </svg>
        </button>
        
        {currentUser ? (
          <Link href="/mypage">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <span className="text-xs font-bold text-gray-700 max-w-[80px] truncate font-serif">
                {nickname || 'マイページ'}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </Link>
        ) : (
          <Link 
            href="/login" 
            className="text-xs font-bold bg-white/80 backdrop-blur text-gray-700 px-5 py-2 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all font-sans"
          >
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}