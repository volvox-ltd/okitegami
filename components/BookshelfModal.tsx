'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

type Props = {
  areaKey: string;
  displayName: string;
  onClose: () => void;
  currentUser: User | null;
  onSelectMemory: (letterId: string) => void;
};

type Memory = {
  id: string;
  created_at: string;
  originalSender: string;
  originalSenderId: string;
  replySender: string;
  replySenderId: string;
  color: string;
};

export default function BookshelfModal({ areaKey, displayName, onClose, currentUser, onSelectMemory }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  // 選択中の本のインデックス (1-28)。nullなら書架全体を表示
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true);
      try {
        const { data: replies, error: replyError } = await supabase
          .from('letters')
          .select('id, created_at, user_id, parent_id')
          .eq('area_key', areaKey)
          .eq('is_thanked', true)
          .order('created_at', { ascending: false });

        if (replyError) throw replyError;

        if (replies && replies.length > 0) {
          const parentIds = replies.map(r => r.parent_id).filter(Boolean);
          const { data: parents } = await supabase.from('letters').select('id, user_id').in('id', parentIds);
          const allUserIds = Array.from(new Set([...replies.map(r => r.user_id), ...(parents?.map(p => p.user_id) || [])]));
          const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', allUserIds);

          const colors = ['bg-amber-800', 'bg-red-900', 'bg-blue-900', 'bg-green-900', 'bg-orange-900', 'bg-stone-700'];
          
          const formatted = replies.map((r: any, i: number) => {
            const rSenderProfile = profiles?.find(p => p.id === r.user_id);
            const parentLetter = parents?.find(p => p.id === r.parent_id);
            const oSenderProfile = profiles?.find(p => p.id === parentLetter?.user_id);

            return {
              id: r.id,
              created_at: new Date(r.created_at).toLocaleDateString('ja-JP').replace(/\//g, '.'),
              originalSender: oSenderProfile?.nickname || '誰か',
              originalSenderId: parentLetter?.user_id || '',
              replySender: rSenderProfile?.nickname || '誰か',
              replySenderId: r.user_id,
              color: colors[i % colors.length]
            };
          });
          setMemories(formatted);
        }
      } catch (err) {
        console.error('地層取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMemories();
  }, [areaKey]);

  // 名前の頭文字から本棚のインデックス(1-28)を決定
  const getBookIndex = (name: string): number => {
    const firstChar = name.charAt(0).toUpperCase();
    if (/[A-Z]/.test(firstChar)) {
      return firstChar.charCodeAt(0) - 64; // A=1, B=2 ... Z=26
    } else if (/[0-9]/.test(firstChar)) {
      return 27; // 数字
    } else {
      return 28; // 記号・日本語・その他
    }
  };

  const getBookLabel = (index: number) => {
    if (index <= 26) return String.fromCharCode(64 + index); // A-Z
    if (index === 27) return "0-9";
    return "#";
  };

  // 28通りの本にグループ化
  const groupedBooks = useMemo(() => {
    const books: Record<number, Memory[]> = {};
    for (let i = 1; i <= 28; i++) books[i] = [];
    memories.forEach(m => {
      const idx = getBookIndex(m.replySender);
      books[idx].push(m);
    });
    return books;
  }, [memories]);

  const filteredMemories = selectedBookIndex ? groupedBooks[selectedBookIndex] : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-left">
      <div className="bg-[#f7f4ea] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#8a776a]/20 font-sans flex flex-col h-[85vh]">
        
        {/* ヘッダー部分 */}
        <div className="p-6 border-b border-[#8a776a]/10 flex justify-between items-center bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            {selectedBookIndex && (
              <button onClick={() => setSelectedBookIndex(null)} className="p-1 hover:bg-stone-200 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#8a776a" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
            )}
            <div>
              <h2 className="font-serif font-bold text-[#5d4037] leading-none">{displayName}の記憶の地層</h2>
              {selectedBookIndex && <p className="text-[10px] text-[#8a776a] mt-1 font-bold tracking-widest">Index: {getBookLabel(selectedBookIndex)}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 px-2 text-xl transition-colors">✕</button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto bg-[#f0ede4] custom-scrollbar">
          {loading ? (
            <p className="text-center text-xs text-gray-400 font-serif py-20 animate-pulse">物語を紐解いています...</p>
          ) : selectedBookIndex === null ? (
            /* --- STEP 1: 書架ビュー（本の並び） --- */
            <div className="p-6 grid grid-cols-4 sm:grid-cols-7 gap-y-8 gap-x-3">
              {Array.from({ length: 28 }).map((_, i) => {
                const index = i + 1;
                const count = groupedBooks[index].length;
                const imgPath = `/shelf/books/book__${String(index).padStart(3, '0')}.svg`;

                return (
                  <div key={index} 
                    onClick={() => count > 0 && setSelectedBookIndex(index)}
                    className={`flex flex-col items-center group transition-all ${count > 0 ? 'cursor-pointer' : 'opacity-20 grayscale'}`}
                  >
                    <div className="relative w-full aspect-[1/4] transform transition-transform group-hover:scale-110 group-active:scale-95">
                      <Image src={imgPath} alt={`Book ${getBookLabel(index)}`} fill className="object-contain drop-shadow-md" />
                      
                      {/* 背表紙ラベル */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-serif font-bold text-white/90 -rotate-90 md:rotate-0 tracking-tighter">
                          {getBookLabel(index)}
                        </span>
                      </div>

                      {/* 未読・件数バッジ */}
                      {count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-amber-600 text-white text-[7px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 border border-white shadow-sm font-bold z-10">
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* --- STEP 2: 本の中身（手紙リスト） --- */
            <div className="p-4 space-y-3 animate-slideUp">
              {filteredMemories.map((m) => {
                const isParticipant = currentUser && (currentUser.id === m.originalSenderId || currentUser.id === m.replySenderId);
                return (
                  <div key={m.id} 
                    onClick={() => isParticipant && onSelectMemory(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg shadow-sm border-l-8 ${m.color} bg-white transition-all 
                      ${isParticipant ? 'cursor-pointer active:scale-[0.98] hover:bg-stone-50 border-r border-orange-200' : 'cursor-default opacity-90'}`}
                  >
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[10px] font-mono text-gray-400">{m.created_at}</span>
                      <span className="text-[11px] font-serif text-[#5d4037] tracking-wider">
                        <span className="font-bold">{m.originalSender}</span> から <span className="font-bold">{m.replySender}</span> へ
                        {isParticipant && <span className="ml-2 text-[8px] text-orange-500 font-sans font-bold italic">VIEW</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 bg-white/80 text-center border-t border-[#8a776a]/5 shrink-0">
          <p className="text-[9px] text-gray-400 font-serif tracking-widest leading-relaxed">
            ここには、この街の片隅で生まれた<br/>
            名もなき感謝が静かに眠っています
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #8a776a33; border-radius: 10px; }
      `}</style>
    </div>
  );
}