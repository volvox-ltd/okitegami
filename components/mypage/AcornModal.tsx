'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

type AcornLog = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

type AcornModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string; // 履歴取得のために追加
};

export default function AcornModal({ isOpen, onClose, userId }: AcornModalProps) {
  const [view, setView] = useState<'history' | 'info'>('history');
  const [logs, setLogs] = useState<AcornLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 履歴データの取得
  useEffect(() => {
    if (isOpen && view === 'history' && userId) {
      const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
          .from('acorn_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) setLogs(data);
        setLoading(false);
      };
      fetchLogs();
    }
  }, [isOpen, view, userId]);

  if (!isOpen) return null;

  const rules = [
    { label: '手紙を書いたとき', points: 1 },
    { label: 'お返事を書いたとき', points: 1 },
    { label: '手紙が図書館に蔵書されたとき', points: 1, note: '「お返事ありがとう」を送受信した際' },
    { label: '雨の日に手紙を書いたとき', points: 2 },
    { label: '雨の日に返事を書いたとき', points: 2 },
    { label: '新しい街の図書館を初めて開いたとき', points: 3 },
  ];

  const getReasonText = (reason: string) => {
    const map: Record<string, string> = {
      'letter_written': '手紙を書いた',
      'reply_sent': 'お返事を出した',
      'thank_received': '手紙が図書館に蔵書された',
      'rain_bonus': '雨の日ボーナス',
      'first_library_open': '初めての図書館'
    };
    return map[reason] || 'どんぐり獲得';
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#fdfcf5] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-amber-100 animate-fadeIn flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー：切り替えボタン付き */}
        <div className="px-6 py-4 border-b border-amber-50 flex justify-between items-center bg-amber-50/30">
          <div className="flex items-center gap-2">
            <img src="/acorn.svg" alt="" className="w-4 h-4" />
            <h2 className="font-serif font-bold text-amber-900 text-sm tracking-wider">
              {view === 'history' ? 'どんぐりの履歴' : 'どんぐりのあつめかた'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(view === 'history' ? 'info' : 'history')}
              className="text-amber-700 hover:text-amber-900 transition-colors"
              title={view === 'history' ? '説明を見る' : '履歴を見る'}
            >
              {view === 'history' ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 px-2 py-1 rounded-full">
                  あつめかた？
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 px-2 py-1 rounded-full">
                  履歴を見る📋
                </span>
              )}
            </button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {view === 'history' ? (
            /* --- 1ページ目：履歴一覧 --- */
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] text-amber-700/50 font-serif">記録を確認中...</p>
                </div>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center border-b border-amber-50 pb-3 last:border-0">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-bold text-stone-700 font-serif">{getReasonText(log.reason)}</p>
                      <p className="text-[9px] text-stone-400 font-sans tracking-tighter">
                        {new Date(log.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                      <span className="text-xs font-bold text-amber-700 font-mono">+{log.amount}</span>
                      <img src="/acorn.svg" alt="" className="w-3 h-3" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-2">
                  <p className="text-2xl opacity-20">🌰</p>
                  <p className="text-[10px] text-stone-400 font-serif">まだどんぐりの記録がありません</p>
                </div>
              )}
            </div>
          ) : (
            /* --- 2ページ目：ルール説明（既存のブラッシュアップ） --- */
            <div className="animate-fadeIn">
              <div className="space-y-4 text-left">
                {rules.map((rule, i) => (
                  <div key={i} className="flex justify-between items-start gap-4 border-b border-amber-50 pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-stone-700 font-serif">{rule.label}</p>
                      {rule.note && <p className="text-[9px] text-stone-400 font-sans mt-0.5 leading-relaxed">{rule.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-bold text-amber-600 font-mono">+{rule.points}</span>
                      <img src="/acorn.svg" alt="" className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <div className="flex items-center gap-2 mb-3 justify-center">
                  <span className="text-xs"></span>
                  <h3 className="text-[11px] font-bold text-amber-800 font-serif tracking-widest">どんぐりが貯まると</h3>
                  <span className="text-xs"></span>
                </div>
                <div className="space-y-3 px-1">
                  <div className="flex items-start gap-3">
                    <span className="text-sm">📮</span>
                    <p className="text-[10px] text-stone-600 font-sans leading-relaxed text-left">
                      <span className="font-bold text-amber-700 text-xs">100個</span>貯まると、<span className="font-bold text-amber-700 text-xs">「ハガキ」</span>で手紙を出せるようになります。
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-left">
                    <span className="text-sm">🎨</span>
                    <p className="text-[10px] text-stone-600 font-sans leading-relaxed">
                      集めた数に応じて、切手帳に飾れる限定の<span className="font-bold text-amber-700 text-xs">「記念切手」</span>をプレゼントします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-amber-50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-amber-800 text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}