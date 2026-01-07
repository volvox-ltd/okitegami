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
      // 縦書き（vertical-rl）では一番右が始まりなので、スクロール位置を最大にする
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
      
      {/* 背景レイヤー */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* ボード本体：高さを dvh に対応させ、スマホ横向き時は画面いっぱいに広がるよう調整 */}
      <div className="relative bg-[#fdfcf5] w-full max-w-5xl h-[92dvh] sm:h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
        
        {/* 閉じるボタン：横向き時は邪魔にならないよう少し小さく調整可能 */}
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

        {/* コンテンツエリア：
          ★修正点：overflow-y-auto を追加。
          画面の高さが足りない場合、縦書きの一行が画面を突き抜けても縦スクロールで読めるようになります。
        */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative py-12 sm:py-16 px-6 md:px-16 scroll-smooth custom-scrollbar"
        >
          <div 
            className="min-h-full flex flex-col items-start gap-12 sm:gap-16 text-bunko-ink font-serif"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
            }}
          >
            {/* 1. タイトルエリア */}
            <div className="flex flex-col justify-start border-gray-400 pl-6 py-2 shrink-0 h-auto">
               <h2 className="text-xl md:text-3xl text-black tracking-[0.2em] leading-normal font-normal">
                 「おきてがみ」とは
               </h2>
            </div>

            {/* 2. 導入文 */}
            <p className="text-sm sm:text-base md:text-lg text-gray-600 tracking-[0.15em] leading-[2.2] sm:leading-[2.5] whitespace-pre-wrap shrink-0 pt-2 font-light">
              この世界には、誰かが残した手紙が置かれています。
              
              地図を頼りにその場所を訪れ、誰かの物語を拾ったり、
              あなた自身が手紙を残したり。
              
              散歩のついでに、言葉の宝探しをしてみませんか。
            </p>

            {/* 3. セクション：探す・読む */}
            {/* ★修正点：min-h を画面の高さに合わせてレスポンシブに (sm:min-h-[360px]) */}
            <div className="p-6 sm:p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-auto min-h-0 sm:min-h-[360px]">
              <h3 className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4">
                手紙を 探す・読む
              </h3>
              
              <div className="text-xs sm:text-sm md:text-base text-gray-500 leading-[2.5] sm:leading-[2.8] tracking-[0.1em] flex flex-col gap-6 sm:gap-8 font-light">
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">一、地図を見る</span>
                  <span className="text-black font-normal">「封筒」</span>や<span className="text-black font-normal">「ハガキ」</span>が目印です。<br/>
                  タップすると詳細が見られます。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">二、場所へ行く</span>
                  実際にその場所へ足を運びます。<br/>
                  <span className="text-black pb-1">30m以内</span>に近づくと鍵が開きます。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">三、手紙を開く</span>
                  ピンを押して手紙を読みます。<br/>
                  お気に入りに保存したり、返事を書いたりできます。
                </div>
              </div>
            </div>

            {/* 4. セクション：書く・置く */}
            <div className="p-6 sm:p-8 border border-gray-200 rounded-sm bg-white/40 shrink-0 h-auto min-h-0 sm:min-h-[360px]">
              <h3 className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-black tracking-[0.2em] font-normal h-auto inline-block pl-4">
                手紙を 書く・置く
              </h3>
              
              <div className="text-xs sm:text-sm md:text-base text-gray-500 leading-[2.5] sm:leading-[2.8] tracking-[0.1em] flex flex-col gap-6 sm:gap-8 font-light">
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">一、場所を決める</span>
                  好きな場所で右下の
                  <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-green-700 text-white rounded-full mx-2 align-baseline relative -top-[1px] shadow-sm border border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </span>
                  を押します。<br/>
                  <span className="text-[10px] text-gray-400 tracking-wider">（※ログインが必要です）</span>
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">二、手紙を書く</span>
                  便箋に書いたり、その場所の風景を撮ってポストカードも作れます。<br/>
                  合言葉で鍵をかけることも可能です。
                </div>
                <div>
                  <span className="block ml-3 text-gray-400 text-[10px] sm:text-xs mb-1 tracking-widest">三、そっと置く</span>
                  手紙は<span className="text-black pb-1">48時間</span>で地図から消えます。<br/>
                  <span className="text-[10px] text-gray-400 tracking-wider">（鮮度を保つためです）</span>
                </div>
              </div>
            </div>

            {/* 5. 署名 */}
            <div className="flex flex-col justify-end pb-2 shrink-0 ml-8">
              <p className="text-xs sm:text-sm text-gray-400 tracking-[0.3em]">
                木林文庫 庵主
              </p>
            </div>
            
            {/* 右端の余白 */}
            <div className="w-16 shrink-0"></div>

          </div>
        </div>
      </div>

      {/* アニメーション・スクロールバー制御 */}
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
        /* スクロールバーを見やすく、かつデザインを損なわないよう調整 */
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}