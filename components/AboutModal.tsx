'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onClose: () => void;
};

export default function AboutModal({ onClose }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // 初期表示時に一番右（文章の書き出し）へスクロールする
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = container.scrollWidth;
      
      const handleScroll = () => {
        // スクロールしたらヒントを消すなどの処理があればここへ
        if (container.scrollLeft < container.scrollWidth - 50) {
           setShowScrollHint(false);
        }
      };
      
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      {/* 1. 背景レイヤー（暗くして地図を透かす） */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* 2. ボード本体：生成り色 (#fdfcf5) */}
      <div className="relative bg-[#fdfcf5] w-full max-w-5xl h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
        
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-gray-500 hover:text-black transition-colors p-2 tracking-widest text-xs font-serif border border-gray-300 rounded-full px-4 bg-white/80 hover:bg-white shadow-sm"
        >
          閉じる
        </button>

        {/* スクロールヒント */}
        {showScrollHint && (
          <div className="absolute bottom-6 left-6 z-40 flex items-center gap-2 text-bunko-gray animate-pulse pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-xs font-serif tracking-widest writing-vertical-rl">スクロール</span>
          </div>
        )}

        {/* コンテンツエリア（横スクロール・縦書き） */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative py-16 px-6 md:px-16 scroll-smooth"
        >
          <div 
            className="h-full flex flex-col items-start gap-16 text-bunko-ink font-serif"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
            }}
          >
            {/* 1. タイトルエリア */}
            <div className="flex flex-col justify-start border-gray-400 pl-6 py-2 shrink-0 h-auto">
               <h2 className="text-2xl md:text-3xl text-black tracking-[0.2em] leading-normal font-normal">
                 「おきてがみ」とは
               </h2>
            </div>

            {/* 2. 導入文 */}
            <p className="text-base md:text-lg text-gray-600 tracking-[0.15em] leading-[2.5] whitespace-pre-wrap shrink-0 pt-2 font-light">
              木林文庫の近隣には、誰かが残した手紙が隠されています。
              
              地図を頼りにその場所を訪れ、物語を拾ったり、
              あるいはあなた自身が、誰かのために手紙を残したり。
              
              散歩のついでに、言葉の宝探しをしてみませんか。
            </p>

            {/* 3. セクション：探す・読む */}
            <div className="p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-auto min-h-[360px]">
              <h3 className="text-lg md:text-xl mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4">
                手紙を 探す・読む
              </h3>
              
              <div className="text-sm md:text-base text-gray-500 leading-[2.8] tracking-[0.1em] flex flex-col gap-8 font-light">
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">一、地図を見る</span>
                  <span className="text-black font-normal">「緑の本」</span>や<span className="text-black font-normal">「茶色の本」</span>が目印です。<br/>
                  タップすると詳細が見られます。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">二、場所へ行く</span>
                  実際にその場所へ足を運びます。<br/>
                  <span className="text-black pb-1">50m以内</span>に近づくと鍵が開きます。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">三、手紙を開く</span>
                  ピンを押して手紙を読みます。<br/>
                  お気に入りに保存もできます。
                </div>
              </div>
            </div>

            {/* 4. セクション：書く・置く */}
            <div className="p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-auto min-h-[360px]">
              <h3 className="text-lg md:text-xl mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4">
                手紙を 書く・置く
              </h3>
              
              <div className="text-sm md:text-base text-gray-500 leading-[2.8] tracking-[0.1em] flex flex-col gap-8 font-light">
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">一、場所を決める</span>
                  好きな場所で右下の
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-black text-white rounded-full text-[10px] mx-2 align-baseline relative -top-[1px]">＋</span>
                  を押します。<br/>
                  <span className="text-xs text-gray-400 tracking-wider">（※ログインが必要です）</span>
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">二、手紙を書く</span>
                  文章や、その場の写真を添えられます。<br/>
                  合言葉で鍵をかけることも可能です。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-xs mb-1 tracking-widest">三、そっと置く</span>
                  手紙は<span className="text-black pb-1">48時間</span>で地図から消えます。<br/>
                  <span className="text-xs text-gray-400 tracking-wider">（鮮度を保つためです）</span>
                </div>
              </div>
            </div>

            {/* 5. 署名 */}
            <div className="flex flex-col justify-end pb-2 shrink-0 ml-8">
              <p className="text-sm text-gray-400 tracking-[0.3em]">
                木林文庫 庵主
              </p>
            </div>
            
            {/* 右端の余白 */}
            <div className="w-16 shrink-0"></div>

          </div>
        </div>
      </div>

      {/* アニメーション用スタイル */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        /* 縦書き用ユーティリティクラス（念のため） */
        .writing-vertical-rl {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
      `}</style>
    </div>
  );
}