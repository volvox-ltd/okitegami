'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onClose: () => void;
};

export default function AboutModal({ onClose }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = container.scrollWidth;
      const handleScroll = () => {
        if (container.scrollLeft < container.scrollWidth - 50) {
           setShowScrollHint(false);
        }
      };
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-[#fdfcf5] w-full max-w-5xl h-[92dvh] sm:h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
        
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 landscape:top-2 landscape:right-2 z-50 text-gray-500 hover:text-black transition-colors p-2 tracking-widest text-[10px] sm:text-xs font-serif border border-gray-300 rounded-full px-3 sm:px-4 bg-white/80 hover:bg-white shadow-sm"
        >
          閉じる
        </button>

        {showScrollHint && (
          <div className="absolute bottom-6 left-6 z-40 flex items-center gap-2 text-bunko-gray animate-pulse pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-xs font-serif tracking-widest writing-vertical-rl">左へスクロール</span>
          </div>
        )}

        {/* コンテンツエリアの修正：
          1. overflow-y-hidden で縦スクロールを完全に禁止。
          2. landscape:py-6 で横向き時の上下余白を半分以下に削減。
        */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative py-12 landscape:py-6 sm:py-16 px-6 landscape:px-10 md:px-16 scroll-smooth custom-scrollbar h-full"
        >
          {/* 内部の修正：
            landscape:gap-8 でセクション間の間隔を詰め、画面の有効活用を図ります。
          */}
          <div 
            className="h-full flex flex-col items-start gap-12 landscape:gap-8 sm:gap-16 text-bunko-ink font-serif"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
            }}
          >
            {/* 1. タイトルエリア */}
            <div className="flex flex-col justify-start border-gray-400 pl-6 landscape:pl-4 py-2 shrink-0 max-h-full">
               <h2 className="text-xl landscape:text-lg md:text-3xl text-black tracking-[0.2em] leading-normal font-normal">
                 「おきてがみ」とは
               </h2>
            </div>

            {/* 2. 導入文：行間（leading）を横向き時に詰めることで、より多くの文字を表示可能に */}
            <p className="text-sm landscape:text-xs sm:text-base md:text-lg text-gray-600 tracking-[0.15em] leading-[2.2] landscape:leading-[1.8] sm:leading-[2.5] whitespace-pre-wrap shrink-0 pt-2 font-light max-h-full">
              この世界には、誰かが残した手紙が置かれています。
              
              地図を頼りにその場所を訪れ、誰かの物語を拾ったり、
              あなた自身が手紙を残したり。
              
              散歩のついでに、言葉の宝探しをしてみませんか。
            </p>

            {/* 3. セクション：探す・読む 
                修正点：
                1. landscape:p-4 で内側の余白を削減。
                2. h-full max-h-full で親の高さにピッタリ合わせ、文字を自動改行させる。
            */}
            <div className="p-6 landscape:p-4 sm:p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-full max-h-full overflow-hidden">
              <h3 className="text-base landscape:text-sm sm:text-lg md:text-xl mb-6 landscape:mb-3 sm:mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4 landscape:pl-2">
                手紙を 探す・読む
              </h3>
              
              {/* 行間を landscape:leading-[2.0] に最適化 */}
              <div className="text-xs landscape:text-[10px] sm:text-sm md:text-base text-gray-500 leading-[2.5] landscape:leading-[2.0] sm:leading-[2.8] tracking-[0.1em] flex flex-col gap-6 landscape:gap-3 sm:gap-8 font-light h-full">
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">一、地図を見る</span>
                  <span className="text-black font-normal">「封筒」</span>や<span className="text-black font-normal">「ハガキ」</span>が目印です。<br/>
                  タップすると詳細が見られます。
                </div>
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">二、場所へ行く</span>
                  実際にその場所へ足を運びます。<br/>
                  <span className="text-black pb-1">30m以内</span>に近づくと鍵が開きます。
                </div>
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">三、手紙を開く</span>
                  ピンを押して手紙を読みます。<br/>
                  お気に入りに保存したり、返事を書いたりできます。
                </div>
              </div>
            </div>

            {/* 4. セクション：書く・置く */}
            <div className="p-6 landscape:p-4 sm:p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-full max-h-full overflow-hidden">
              <h3 className="text-base landscape:text-sm sm:text-lg md:text-xl mb-6 landscape:mb-3 sm:mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4 landscape:pl-2">
                手紙を 書く・置く
              </h3>
              
              <div className="text-xs landscape:text-[10px] sm:text-sm md:text-base text-gray-500 leading-[2.5] landscape:leading-[2.0] sm:leading-[2.8] tracking-[0.1em] flex flex-col gap-6 landscape:gap-3 sm:gap-8 font-light h-full">
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">一、場所を決める</span>
                  好きな場所で右下の
                  <span className="inline-flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 bg-green-700 text-white rounded-full mx-1 sm:mx-2 align-baseline relative -top-[1px] shadow-sm border border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2 h-2 sm:w-3 sm:h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </span>
                  を押します。<br/>
                  <span className="text-[9px] landscape:text-[8px] text-gray-400 tracking-wider">（※ログインが必要）</span>
                </div>
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">二、手紙を書く</span>
                  便箋に書いたり、風景を撮って絵葉書も作れます。
                </div>
                <div className="max-h-full">
                  <span className="block ml-3 landscape:ml-1 text-gray-400 text-[10px] landscape:text-[8px] sm:text-xs mb-1 tracking-widest">三、そっと置く</span>
                  手紙は<span className="text-black pb-1">48時間</span>で地図から消えます。<br/>
                  <span className="text-[9px] landscape:text-[8px] text-gray-400 tracking-wider">（鮮度を保つため）</span>
                </div>
              </div>
            </div>

            {/* 5. 署名 */}
            <div className="flex flex-col justify-end pb-2 shrink-0 ml-8 landscape:ml-4 h-full">
              <p className="text-xs landscape:text-[10px] sm:text-sm text-gray-400 tracking-[0.3em] whitespace-nowrap">
                木林文庫 庵主
              </p>
            </div>
            
            <div className="w-16 landscape:w-8 shrink-0"></div>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .writing-vertical-rl {
          writing-mode: vertical-rl;
          text-orientation: upright;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px; /* 横スクロールバーを少し触りやすく */
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}