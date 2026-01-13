'use client';

type AcornModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AcornModal({ isOpen, onClose }: AcornModalProps) {
  if (!isOpen) return null;

  const rules = [
    { label: '手紙を書いたとき', points: 1 },
    { label: 'お返事を書いたとき', points: 1 },
    { label: '手紙が図書館に蔵書されたとき', points: 1, note: '「お返事ありがとう」で送った人と返した人それぞれに' },
    { label: '雨の日に手紙を書いたとき', points: 2 },
    { label: '雨の日に返事を書いたとき', points: 2 },
    { label: '新しい街の図書館を初めて開いたとき', points: 3 },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#fdfcf5] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-amber-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <img src="/acorn.svg" alt="acorn" className="w-10 h-10" />
          </div>
          <h2 className="font-serif font-bold text-amber-900 text-lg mb-1">どんぐりのあつめかた</h2>
          <p className="text-[10px] text-amber-700/60 font-sans mb-6 tracking-widest">木林文庫での活動に応じてどんぐりが貯まります</p>

          <div className="space-y-3 text-left">
            {rules.map((rule, i) => (
              <div key={i} className="flex justify-between items-start gap-4 border-b border-amber-50 pb-2 last:border-0">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-stone-700 font-serif">{rule.label}</p>
                  {rule.note && <p className="text-[9px] text-stone-400 font-sans mt-0.5">{rule.note}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-bold text-amber-600 font-mono">+{rule.points}</span>
                  <img src="/acorn.svg" alt="" className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>

          {/* --- ここからインセンティブの追記 --- */}
          <div className="mt-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <span className="text-xs">✨</span>
              <h3 className="text-[11px] font-bold text-amber-800 font-serif tracking-widest">どんぐりが貯まると</h3>
              <span className="text-xs">✨</span>
            </div>
            
            <div className="space-y-3 text-left px-1">
              <div className="flex items-start gap-3">
                <span className="text-sm">📮</span>
                <p className="text-[10px] text-stone-600 font-sans leading-relaxed">
                  どんぐりが<span className="font-bold text-amber-700 text-xs">100個</span>貯まると、特別な<span className="font-bold text-amber-700 text-xs">「ハガキ」</span>で手紙を出せるようになります。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-sm">🎨</span>
                <p className="text-[10px] text-stone-600 font-sans leading-relaxed">
                  集めた数に応じて、切手帳に飾れる限定の<span className="font-bold text-amber-700 text-xs">「記念切手」</span>をプレゼントします。
                </p>
              </div>
            </div>
          </div>
          {/* --- ここまで --- */}

          <button 
            onClick={onClose}
            className="mt-8 w-full py-3 bg-amber-800 text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}