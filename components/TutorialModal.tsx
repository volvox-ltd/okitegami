'use client';
import { useState } from 'react';

type Props = {
  onClose: () => void;
};

export default function TutorialModal({ onClose }: Props) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "ようこそ「おきてがみ」へ",
      desc: "ここは、地図に残す「置き手紙」のアプリです。\n誰かに宛てた言葉や思い出を\nそっと置いてみませんか？",
      image: "/tutorial_1.png"
    },
    {
      title: "近づいて読んでみる",
      desc: "地図上の手紙は、その場所まで\n実際に行くと開封できます。\n街を歩いて、手紙を探してみましょう。",
      image: "/tutorial_2.png"
    },
    {
      title: "時間は48時間だけ",
      desc: "置かれた手紙は、48時間経つと\n地図から消えてしまいます。\n手紙に返事を書くこともできます。",
      image: "/tutorial_3.png"
    },
    {
      title: "秘密の手紙を書く",
      desc: "置いた手紙は、大切な人だけに\n読んでもらうこともできます\n合言葉を決めて、手紙に鍵をかけることもできます。",
      image: "/tutorial_4.png"
    },
    {
      title: "位置情報を許可する",
      desc: "周辺の手紙を表示するために、スマートフォンの位置情報の使用を許可してください。",
      note: "※許可画面が出ない場合は、ブラウザの設定から「位置情報」を有効にして再読み込みしてください。",
      image: "/tutorial_5.png"
    }
  ];

  const currentStep = steps[step - 1];

  // 位置情報の要求と終了
  const handleFinalStep = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => onClose(),
        (error) => {
          console.error("Tutorial location error:", error);
          onClose();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleFinalStep();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden flex flex-col items-center">
        
        {/* スキップボタン（右上） */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-xs font-bold text-gray-400 hover:text-gray-600 tracking-widest"
        >
          スキップ
        </button>
        
        {/* アイコン（PNG画像） */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 mb-6 relative">
          <img 
            src={currentStep.image} 
            alt={currentStep.title} 
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        {/* タイトル */}
        <h2 className="text-xl font-bold font-serif text-bunko-ink mb-4 leading-relaxed">
          {currentStep.title}
        </h2>

        {/* 説明文 */}
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
          {currentStep.desc}
        </p>

        {/* 注釈 */}
        {currentStep.note && (
          <p className="text-[10px] text-gray-400 leading-relaxed mt-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
            {currentStep.note}
          </p>
        )}

        <div className="mt-auto w-full">
          {/* ステップインジケーター */}
          <div className="flex justify-center gap-2 mb-8 mt-6">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-colors ${i + 1 === step ? 'bg-green-700' : 'bg-gray-200'}`}
              ></div>
            ))}
          </div>

          {/* ボタンエリア */}
          <div className="flex gap-3 w-full">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-full font-bold shadow-sm hover:bg-gray-200 transition-all active:scale-95 tracking-widest"
              >
                戻る
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-[2] py-3.5 bg-green-700 text-white rounded-full font-bold shadow-lg hover:bg-green-800 transition-all active:scale-95 tracking-widest"
            >
              {step < steps.length ? '次へ' : '許可してはじめる'}
            </button>
          </div>
        </div>

      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}