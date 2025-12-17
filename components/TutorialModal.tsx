'use client';
import { useState } from 'react';
import Image from 'next/image'; // 画像を使う場合

type Props = {
  onClose: () => void;
};

export default function TutorialModal({ onClose }: Props) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "ようこそ、おきてがみへ",
      desc: "ここは、地図に残す「置き手紙」のアプリです。\n誰かに宛てた言葉や、この場所の記憶を\nそっと置いていきませんか？",
      icon: "💌"
    },
    {
      title: "時間は48時間だけ",
      desc: "置かれた手紙は、48時間が経つと\n地図から消えてしまいます。\nその時だけの、儚い出会いです。",
      icon: "⏳"
    },
    {
      title: "近づくと読めます",
      desc: "地図上の手紙は、その場所まで\n実際に歩いて近づくことで開封できます。\n街を歩いて、手紙を探してみましょう。",
      icon: "🚶"
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        
        {/* 背景の装飾 */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-700 to-green-500"></div>

        {/* アイコン */}
        <div className="text-6xl mb-6 animate-bounce">
          {currentStep.icon}
        </div>

        {/* タイトルと説明 */}
        <h2 className="text-xl font-bold font-serif text-bunko-ink mb-4">
          {currentStep.title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap mb-8 font-medium">
          {currentStep.desc}
        </p>

        {/* ステップインジケーター（丸ポチ） */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-colors ${i + 1 === step ? 'bg-green-700' : 'bg-gray-200'}`}
            ></div>
          ))}
        </div>

        {/* ボタン */}
        <button
          onClick={() => {
            if (step < steps.length) {
              setStep(step + 1);
            } else {
              onClose();
            }
          }}
          className="w-full py-3.5 bg-green-700 text-white rounded-full font-bold shadow-lg hover:bg-green-800 transition-all active:scale-95"
        >
          {step < steps.length ? '次へ' : 'はじめる'}
        </button>

      </div>
    </div>
  );
}