// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f4ea] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xs space-y-6">
        <div className="text-6xl animate-bounce-slow">🕊️</div>
        <h2 className="font-serif text-xl font-bold text-gray-800">
          手紙が届かなかったようです
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed font-sans">
          お探しのページは、風に吹かれてどこかへ消えてしまったか、<br />
          もともと存在しなかったのかもしれません。
        </p>
        <Link 
          href="/" 
          className="inline-block mt-8 px-8 py-3 bg-green-700 text-white rounded-full text-xs font-bold shadow-md hover:bg-green-800 transition-all active:scale-95"
        >
          地図へ戻る
        </Link>
      </div>
    </div>
  );
}