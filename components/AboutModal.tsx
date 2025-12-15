'use client';

type Props = {
  onClose: () => void;
};

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      
      {/* 背景：真っ白な紙 */}
      <div className="bg-white w-full max-w-2xl h-[70vh] rounded-md shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white rounded-full p-2 transition-colors shadow-sm"
          title="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 内容（横スクロール・縦書き） */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative py-10 px-6 md:px-10 flex flex-row-reverse">
          
          <div 
            className="h-full text-bunko-ink leading-loose tracking-widest text-base font-serif"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
              height: '100%',
            }}
          >
            {/* タイトル */}
            <div className="h-full flex flex-col justify-start ml-12 border-l border-bunko-red/50 pl-6 inline-block align-top">
               <h2 className="text-xl md:text-2xl font-bold text-bunko-red">木林のおきてがみとは</h2>
            </div>

            {/* 本文 */}
            <p className="whitespace-pre-wrap inline-block align-top ml-8">
              木林文庫の近隣に、手紙があります。
              
              地図にある<span className="font-bold text-bunko-red mx-1">「緑の本」</span>が手紙の目印です。
              その場所まで足を運び、50メートル以内に近づくと、手紙の封を切ることができます。
              気になる人、街のこと、あるいはあなたへのメッセージ。
              散歩のついでに、ちょっとした物語を拾ってみてください。
            </p>

            {/* 遊び方リスト */}
            <div className="inline-block align-top ml-10 p-4 border border-bunko-gray/20 rounded bg-bunko-paper/50 h-auto">
              <p className="font-bold mb-4 text-bunko-gray">【 使い方 】</p>
              <p className="mb-4">一、地図を見て、手紙の場所を探す</p>
              <p className="mb-4">二、その場所まで実際に行ってみる</p>
              <p>三、近づいて「手紙を開く」を押す</p>
            </div>

            {/* 署名 */}
            <p className="mt-auto ml-12 text-sm text-bunko-gray inline-block align-bottom">
              木林文庫 庵主
            </p>
            
          </div>

          {/* 右端の余白調整用 */}
          <div className="w-8 flex-shrink-0"></div>
        </div>
      </div>
    </div>
  );
}