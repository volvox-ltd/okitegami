'use client';

import IconUserLetter from './IconUserLetter';
import IconPostcard from './IconPostcard';

type ClusterListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedLetters: any[];
  onSelectLetter: (id: string) => Promise<void>;
};

export default function ClusterListModal({
  isOpen,
  onClose,
  selectedLetters,
  onSelectLetter
}: ClusterListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f7f4ea] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* ヘッダー */}
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <h3 className="font-serif font-bold text-stone-700">この場所に集まった手紙</h3>
          <button onClick={onClose} className="text-stone-400 text-xl px-2 hover:text-stone-600 transition-colors">
            ✕
          </button>
        </div>

        {/* リスト部分 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {selectedLetters.map((l) => (
            <div
              key={l.id}
              onClick={() => onSelectLetter(l.id)}
              className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-stone-50 transition-colors"
            >
              {/* アイコンの描き分け */}
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                {l.is_postcard ? (
                  <IconPostcard className="w-8 h-8" />
                ) : (
                  <IconUserLetter className="w-8 h-8" />
                )}
              </div>

              {/* テキスト情報 */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-stone-800 truncate">{l.title}</p>
                <p className="text-[10px] text-stone-400">置かれた場所：{l.spot_name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}