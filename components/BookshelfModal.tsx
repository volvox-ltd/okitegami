'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import { addAcorns } from '@/utils/acorn';

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
  color: string;
  parentTitle: string;
  thankedReplySenders: string[];
};

type BookStyle = {
  index: number;
  label: string;
  memories: Memory[];
  hasData: boolean;
  baseColor: string;
  width: number;
  height: number;
  rotation: number;
  marginLeft: number;
  marginRight: number;
  transformOrigin: string;
  zIndex: number;
};

type Cluster = 
  | { type: 'vertical'; books: BookStyle[] }
  | { type: 'stack'; books: BookStyle[] };

// 46文字の五十音リスト（重複と空欄を排除）
const JP_CHART = [
  'あ','い','う','え','お',
  'か','き','く','け','こ',
  'さ','し','す','せ','そ',
  'た','ち','つ','て','と',
  'な','に','ぬ','ね','の',
  'は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も',
  'や','ゆ','よ',
  'ら','り','る','れ','ろ',
  'わ','を','ん'
];

export default function BookshelfModal({ areaKey, displayName, onClose, currentUser, onSelectMemory }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true);
      try {
        // 1. このエリアで「ありがとう」された返信をすべて取得
        const { data: replies } = await supabase
          .from('letters').select('id, user_id, parent_id, created_at')
          .eq('area_key', areaKey).eq('is_thanked', true);

        if (replies && replies.length > 0) {
          // 2. 重複を除いた親ID（元手紙）のリストを作成
          const parentIds = Array.from(new Set(replies.map(r => r.parent_id).filter(Boolean)));
          
          // 3. 親手紙の詳細を取得
          const { data: parents } = await supabase.from('letters').select('id, user_id, title').in('id', parentIds);
          
          // 4. 全員のプロフィールを取得
          const allUserIds = Array.from(new Set([...replies.map(r => r.user_id), ...(parents?.map(p => p.user_id) || [])]));
          const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', allUserIds);

          const colors = ['bg-[#5d4037]', 'bg-[#8c4b4b]', 'bg-[#4a6d5a]', 'bg-[#a67c52]', 'bg-[#554a6d]'];

          // 5. 親手紙ごとにグループ化
          // ★ 修正：Memory型の定義と、戻り値のオブジェクトを完全に一致させる
          const formatted: Memory[] = (parents || []).map((p: any, i: number) => {
            const oSender = profiles?.find((prof: any) => prof.id === p.user_id);
            const rSenders = replies
              .filter((r: any) => r.parent_id === p.id)
              .map((r: any) => profiles?.find((prof: any) => prof.id === r.user_id)?.nickname || '誰か');

            return {
              id: p.id,
              created_at: new Date().toLocaleDateString('ja-JP').replace(/\//g, '.'),
              originalSender: oSender?.nickname || '誰か',
              originalSenderId: p.user_id,
              parentTitle: p.title || '無題',
              color: colors[i % colors.length],
              thankedReplySenders: Array.from(new Set(rSenders))
            };
          });
          setMemories(formatted);
          // ★ どんぐり加算：初めてこの図書館を開いた時に3つ
          if (currentUser) {
            await addAcorns(currentUser.id, 3, 'first_library_open', { area_key: areaKey });
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchMemories();
  }, [areaKey]);

  const getIndexFromTitle = (title: string): number => {
    if (!title) return 49;
    
    // 1. 最初の1文字を取得し、濁点・半濁点を除去して正規化する
    const rawFirstChar = title.charAt(0);
    const normalizedFirstChar = rawFirstChar.normalize('NFD').replace(/[\u3099\u309a]/g, ''); 

    // 2. 以降の判定はすべて「正規化後の文字」を使う
    const firstUpper = normalizedFirstChar.toUpperCase();

    if (/[A-Z]/.test(firstUpper)) return 47; // アルファベット
    if (/[0-9]/.test(normalizedFirstChar)) return 48; // 数字

    const code = normalizedFirstChar.charCodeAt(0); // 正規化後の文字コード
    if ((code >= 12353 && code <= 12438) || (code >= 12449 && code <= 12538)) {
      const hiraCode = code >= 12449 ? code - 96 : code;
      const hiraChar = String.fromCharCode(hiraCode);
      const jpIndex = JP_CHART.indexOf(hiraChar);
      if (jpIndex !== -1) return jpIndex + 1; // 1-46番
    }
    return 49; // その他（漢字、記号）
  };

  const getBookLabel = (index: number) => {
    if (index <= 46) return JP_CHART[index - 1];
    if (index === 47) return "A-Z";
    if (index === 48) return "0-9";
    return "#";
  };

  const shelfClusters = useMemo(() => {
    const grouped: Record<number, Memory[]> = {};
    for (let i = 1; i <= 49; i++) grouped[i] = [];
    
    memories.forEach(m => {
      const idx = getIndexFromTitle(m.parentTitle);
      grouped[idx].push(m);
    });

    const createStyle = (idx: number): BookStyle => ({
      index: idx, label: getBookLabel(idx), memories: grouped[idx],
      hasData: grouped[idx].length > 0,
      baseColor: grouped[idx].length > 0 ? ['bg-[#5d4037]', 'bg-[#8c4b4b]', 'bg-[#4a6d5a]', 'bg-[#a67c52]', 'bg-[#554a6d]'][idx % 5] : 'bg-[#b0aaa4]',
      width: [20, 24, 18, 22][idx % 4], height: [100, 115, 130, 105][idx % 4],
      rotation: 0, marginLeft: 0, marginRight: 0, transformOrigin: 'bottom center', zIndex: grouped[idx].length > 0 ? 100 + idx : 10 + idx
    });

    const res: Cluster[] = [];
    let i = 1;

    while (i <= 49) {
      const remains = 50 - i;

      if (Math.random() < 0.3 && i <= 45 && remains >= 2) { 
        const size = Math.min(2 + Math.floor(Math.random() * 3), remains);
        const stack = [];
        for (let j = 0; j < size; j++) {
          const b = createStyle(i + j);
          b.marginLeft = Math.floor(Math.random() * 41) - 20;
          stack.push(b);
        }
        res.push({ type: 'stack', books: stack.reverse() });
        i += size;
      } else { 
        const size = remains < 8 ? remains : Math.max(4, Math.min(4 + Math.floor(Math.random() * 3), remains));
        const group: BookStyle[] = [];
        const tiltMode = size >= 4 ? (Math.random() > 0.5 ? 1 : 2) : 0;
        const angle = 6 + Math.random() * 3; 
        const rad = angle * (Math.PI / 180);

        for (let j = 0; j < size; j++) {
          const b = createStyle(i + j);
          if (tiltMode === 1 && j === 0) {
            b.rotation = angle;
            b.transformOrigin = 'bottom right';
            b.marginRight = b.height * Math.sin(rad);
            b.marginLeft = 0;
          } else if (tiltMode === 2 && j === size - 1) {
            b.rotation = -angle;
            b.transformOrigin = 'bottom left';
            b.marginLeft = b.height * Math.sin(rad);
            b.marginRight = 0;
          } else {
            b.rotation = 0;
            b.transformOrigin = 'bottom center';
            b.marginLeft = 0;
            b.marginRight = 0;
          }
          group.push(b);
        }
        res.push({ type: 'vertical', books: group });
        i += size;
      }
    }
    return res;
  }, [memories]);

  const allBooks = useMemo(() => shelfClusters.flatMap(c => c.books), [shelfClusters]);
  const filteredMemories = selectedBookIndex ? allBooks.find(b => b.index === selectedBookIndex)?.memories || [] : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#d4c4a8] w-full max-w-6xl rounded-sm shadow-2xl overflow-hidden flex flex-col border-[16px] border-[#5c3a21] relative outline outline-1 outline-[#3a1e0f]/50" style={{ maxHeight: '80vh' }}>
        
        <div className="absolute inset-0 bg-[url('/texture/wood_pattern_dark.png')] bg-cover opacity-10 pointer-events-none mix-blend-overlay z-20"></div>

        <div className="p-4 bg-[#4a2e1b] text-[#e8dec7] flex justify-between items-center z-30 relative border-b-2 border-[#3a1e0f] shrink-0">
          <h2 className="font-serif font-bold tracking-[0.2em] text-sm sm:text-base">
            {displayName}の図書館 {selectedBookIndex && `[${getBookLabel(selectedBookIndex)}]`}
          </h2>
          <button onClick={onClose} className="hover:text-white text-2xl px-2">✕</button>
        </div>

        <div className="flex-1 bg-[#f0e6d2] relative z-10 overflow-hidden flex flex-col">
          {loading ? (
            <div className="h-48 flex items-center justify-center font-serif text-[#8b5e3c] animate-pulse">手紙を紐解いています...</div>
          ) : selectedBookIndex === null ? (
            
            <div className="overflow-x-auto custom-scrollbar-x px-4 pt-20 pb-8 flex items-end h-full">
              <div className="flex items-end border-b-[16px] border-[#6d4629] pb-0 min-w-max relative px-8">
                <div className="absolute inset-x-0 bottom-[-16px] h-[16px] bg-[#5c3a21] z-10"></div>

                {shelfClusters.map((cluster, cIdx) => (
                  <div key={cIdx} className="flex items-end shrink-0 mx-1 relative">
                    {cluster.type === 'vertical' ? (
                      <div className="flex items-end">
                        {cluster.books.map((b) => (
                          <div key={b.index}
                            onClick={() => b.hasData && setSelectedBookIndex(b.index)}
                            style={{ 
                              width: `${b.width}px`, height: `${b.height}px`,
                              transform: `rotate(${b.rotation}deg)`, 
                              transformOrigin: b.transformOrigin,
                              marginLeft: `${b.marginLeft}px`, 
                              marginRight: `${b.marginRight}px`,
                              zIndex: b.hasData ? 100 + b.index : b.index
                            }}
                            className={`relative transition-all duration-300 shadow-md border-[0.5px] border-black/15 rounded-[1px]
                              ${b.hasData ? 'cursor-pointer hover:brightness-110 hover:-translate-y-1 hover:z-[200]' : 'grayscale opacity-90 pointer-events-none'}
                              ${b.baseColor}`}
                          >
                            <div className="absolute inset-0 flex flex-col py-2 justify-between bg-gradient-to-r from-black/5 via-transparent to-black/5">
                              <div className="flex-1 flex items-center justify-center overflow-hidden px-1">
                                <span className={`text-[9px] font-bold text-[#e8dec7]/90 whitespace-nowrap tracking-tighter ${b.label.length > 1 ? '' : '-rotate-90'}`}>{b.label}</span>
                              </div>
                            </div>
                            {b.hasData && (
                              <div className="absolute -top-3 -right-2 bg-[#9a3412] text-white text-[7px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full border border-[#f2e9d5] shadow-sm font-bold z-50">{b.memories.length}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col-reverse items-center justify-end px-1">
                        {cluster.books.map((b, sIdx) => (
                          <div key={b.index}
                            onClick={() => b.hasData && setSelectedBookIndex(b.index)}
                            style={{ width: '74px', height: '18px', marginLeft: `${b.marginLeft}px`, zIndex: b.zIndex }} 
                            className={`relative transition-all duration-300 border-[0.5px] border-black/30 rounded-[2px] shadow-sm
                              ${b.hasData ? 'cursor-pointer hover:brightness-110 hover:z-[200]' : 'grayscale opacity-90 pointer-events-none'}
                              ${b.baseColor} ${sIdx > 0 ? '-mt-[1.5px]' : ''}`}
                          >
                            <div className="absolute inset-0 flex flex-row items-center px-2 justify-between bg-gradient-to-b from-white/10 to-black/20">
                              <span className="text-[8px] font-bold text-[#e8dec7]/90 whitespace-nowrap tracking-tighter">{b.label}</span>
                            </div>
                            {b.hasData && sIdx === cluster.books.length - 1 && (
                              <div className="absolute -top-1 -right-2 bg-[#9a3412] text-white text-[7px] min-w-[14px] h-3.5 flex items-center justify-center rounded-full border border-[#f2e9d5] shadow-sm font-bold z-[210]">
                                {b.memories.length}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <button onClick={() => setSelectedBookIndex(null)} className="text-[#8b5e3c] text-xs font-bold mb-4 flex items-center gap-1">← 図書館へ戻る</button>
              <div className="space-y-3 pb-4">
                {filteredMemories.map((m) => {
                  // ★ 修正：isParticipant 判定を削除し、誰でもクリックできるようにする
                  return (
                    <div key={m.id} onClick={() => onSelectMemory(m.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg shadow-sm border-l-8 ${m.color} bg-white transition-all 
                        cursor-pointer active:scale-[0.98] hover:bg-stone-50 border-r border-orange-100`}
                    >
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-gray-400">{m.created_at}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-[12px] font-serif font-bold text-[#4a2e1b]">{m.parentTitle}</span>
                          <span className="text-[10px] font-serif text-[#5d4037]/70 italic">
                            {m.originalSender} さんの手紙
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-[#f0e6d2] border-t border-[#5c3a21]/10 shrink-0 relative z-30 text-center">
          <p className="text-[10px] text-[#5d4037]/70 font-serif italic tracking-[0.2em]">この街の手紙が集まる図書館</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .custom-scrollbar-x::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar-x::-webkit-scrollbar-thumb { background: #5c3a21; border-radius: 4px; border: 2px solid #f0e6d2; }
        .custom-scrollbar-x::-webkit-scrollbar-track { background: #f0e6d2; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #5c3a2144; border-radius: 10px; }
      `}</style>
    </div>
  );
}