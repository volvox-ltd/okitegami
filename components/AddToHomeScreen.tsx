'use client';
import { useState, useEffect } from 'react';

type Props = {
  isOpen: boolean; // 親から表示制御できるようにする
  onClose: () => void;
  message?: string; // 場面によってメッセージを変えられるように
};

export default function AddToHomeScreen({ isOpen, onClose, message = "ホーム画面に追加すると、アプリとして使えます" }: Props) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS判定（iPhone/iPad かつ Safari）
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // すでにPWAとしてインストール済みか判定
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);
  }, []);

  // iOSじゃない、または既にアプリ化済みなら表示しない
  if (!isIOS || isStandalone || !isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-slideUp">
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl rounded-2xl p-4 relative">
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl">📲</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 mb-1">ホーム画面に追加</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* 手順の説明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-center justify-between gap-2">
            <span>画面下の</span>
            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 rounded text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </span>
            <span>を押して、<br/>「ホーム画面に追加」を選択</span>
          </div>
        </div>

        {/* 下向きの矢印（Safariのメニューバーを指す） */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 transform rotate-45"></div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}