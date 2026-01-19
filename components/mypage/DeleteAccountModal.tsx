'use client';
import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keepLetters: boolean) => void;
  isUpdating: boolean;
};

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isUpdating }: Props) {
  const [keepLetters, setKeepLetters] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#fdfcf5] w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-red-100 text-left">
        <h3 className="text-sm font-bold text-gray-800 mb-4 font-serif">退会のお手続き</h3>
        
        <div className="space-y-4 mb-6">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            これまでにご利用いただいたアカウントを削除します。<br />
            あなたが街に残した「おきてがみ」の取り扱いを選択してください。
          </p>

          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="radio" 
                className="mt-1 accent-green-700"
                checked={keepLetters === true}
                onChange={() => setKeepLetters(true)}
              />
              <div>
                <span className="block text-xs font-bold text-gray-800">手紙を街に残す（推奨）</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">あなたの手紙とニックネームは地図に残り続けます。アカウント情報は削除されます。</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="radio" 
                className="mt-1 accent-red-600"
                checked={keepLetters === false}
                onChange={() => setKeepLetters(false)}
              />
              <div>
                <span className="block text-xs font-bold text-gray-800">すべてを完全に削除する</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">手紙、お気に入り、切手帳など、すべてのデータが消去され、復元できなくなります。</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-gray-600"
          >
            キャンセル
          </button>
          <button 
            onClick={() => onConfirm(keepLetters)}
            disabled={isUpdating}
            className={`flex-1 py-3 rounded-full text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
              keepLetters ? 'bg-gray-800' : 'bg-red-600'
            }`}
          >
            {isUpdating ? '処理中...' : '退会を確定する'}
          </button>
        </div>
      </div>
    </div>
  );
}