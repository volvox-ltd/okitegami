'use client';
import { useState, useEffect, TouchEvent } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation'; // ★追加
import Link from 'next/link';
import IconUserLetter from './IconUserLetter';
import IconAdminLetter from './IconAdminLetter';
import IconPost from './IconPost'; // ★追加

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string;
  title: string;
  spot_name: string;
  content: string;
  lat: number;
  lng: number;
  image_url?: string;
  is_official?: boolean;
  user_id?: string;
  password?: string | null;
  attached_stamp_id?: number | null;
  parent_id?: string | null;
};

type Props = {
  letter: Letter;
  currentUser: User | null;
  onClose: () => void;
  onDeleted?: () => void;
};

const CHARS_PER_PAGE = 140; 

export default function LetterModal({ letter, currentUser, onClose, onDeleted }: Props) {
  const router = useRouter(); // ★追加
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); 
  const [pages, setPages] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [gotStamp, setGotStamp] = useState<any>(null);
  const [isReported, setIsReported] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const isMyPost = currentUser && currentUser.id === letter.user_id;
  const isPostedInBox = !!letter.parent_id;

  useEffect(() => {
    setIsVisible(true);
    if (letter.password && !isMyPost) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
      // checkStamp(); // ★ここでは呼び出さない（読了時へ移動）
      recordRead(); 
    }
    checkFavorite();
  }, [letter, currentUser]); 

  const recordRead = async () => {
    if (currentUser && currentUser.id === letter.user_id) return;
    await supabase.from('letter_reads').insert({
      letter_id: letter.id,
      user_id: currentUser?.id || null,
    });
  };

  const checkStamp = async () => {
    // 既に演出が表示されている、または自分の投稿、または切手がない場合はスキップ
    if (gotStamp || isMyPost || !letter.attached_stamp_id || !currentUser) return;

    try {
      const { data: existing } = await supabase
        .from('user_stamps')
        .select('count')
        .eq('user_id', currentUser.id)
        .eq('stamp_id', letter.attached_stamp_id)
        .single();

      if (existing) {
        await supabase
          .from('user_stamps')
          .update({ count: (existing.count || 1) + 1 })
          .eq('user_id', currentUser.id)
          .eq('stamp_id', letter.attached_stamp_id);
      } else {
        await supabase.from('user_stamps').insert({
          user_id: currentUser.id,
          stamp_id: letter.attached_stamp_id,
          count: 1
        });
      }

      const { data: stampData } = await supabase
        .from('stamps')
        .select('*')
        .eq('id', letter.attached_stamp_id)
        .single();
      if (stampData) setGotStamp(stampData);

    } catch (e) {
      console.error("切手処理エラー:", e);
    }
  };

  const handleUnlock = () => {
    if (inputPassword === letter.password) {
      setIsLocked(false);
      setUnlockError(false);
      // checkStamp(); // ★ここでは呼び出さない
      recordRead(); 
    } else {
      setUnlockError(true);
    }
  };

  const checkFavorite = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', currentUser.id).eq('letter_id', letter.id).single();
    if (data) setIsFavorited(true);
  };

  const toggleFavorite = async () => {
    if (!currentUser) return alert('ログインが必要です');
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('letter_id', letter.id);
      setIsFavorited(false);
    } else {
      await supabase.from('favorites').insert({ user_id: currentUser.id, letter_id: letter.id });
      setIsFavorited(true);
    }
  };

  const PAGE_DELIMITER = '<<<PAGE>>>';

  useEffect(() => {
    const newPages = [];
    if (letter.image_url) newPages.push({ type: 'image', content: letter.image_url });

    if (!letter.content) {
      newPages.push({ type: 'text', content: '' });
    } else {
      if (letter.content.includes(PAGE_DELIMITER)) {
        letter.content.split(PAGE_DELIMITER).forEach(p => newPages.push({ type: 'text', content: p }));
      } else {
        for (let i = 0; i < letter.content.length; i += CHARS_PER_PAGE) {
          newPages.push({ type: 'text', content: letter.content.slice(i, i + CHARS_PER_PAGE) });
        }
      }
    }
    setPages(newPages);
  }, [letter]);

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };
  
  // ★修正：「読み終わる」ボタンを押した時に切手付与ロジックを走らせる
  const handleFinish = () => {
    checkStamp();
    // 切手演出がない場合はすぐに閉じる。ある場合は演出側の「閉じる」ボタンで閉じられる。
    if (!letter.attached_stamp_id || isMyPost) {
      handleClose();
    }
  };

  const handleNext = () => { if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

  const onTouchStart = (e: TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (error) alert('削除失敗');
    else { alert('削除しました'); handleClose(); if (onDeleted) onDeleted(); }
  };

  const handleReport = async () => {
    if (!confirm('この手紙を不適切なコンテンツとして通報しますか？')) return;
    try {
      await supabase.from('reports').insert({ letter_id: letter.id, reporter_id: currentUser?.id || null, reason: '不適切なコンテンツ' });
      alert('通報を受け付けました。');
      setIsReported(true);
    } catch (e) { alert('送信に失敗しました'); }
  };

  const renderContent = (text: string) => {
    if (!letter.is_official) return text; 
    const regex = /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      parts.push(<a key={match.index} href={match[1]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline decoration-blue-400 hover:text-blue-800 font-sans">{match[2]}</a>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  const isOfficial = letter.is_official;
  const borderColor = isOfficial ? 'border-yellow-600' : 'border-green-700';
  const bgColor = isOfficial ? 'bg-[#fdfcf5]' : 'bg-white';
  const textColor = isOfficial ? 'text-[#5d4037]' : 'text-gray-800';
  
  // ★修正：ポストへの投函なら IconPost を優先
  const Icon = isPostedInBox ? IconPost : (isOfficial ? IconAdminLetter : IconUserLetter);
  const pageData = pages[currentPage];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

      {gotStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          {/* 背景クリックでも閉じられるように透明な板を敷く */}
          <div className="absolute inset-0 pointer-events-auto" onClick={handleClose}></div>
          <div className="bg-[#fdfcf5] p-8 rounded-sm shadow-2xl flex flex-col items-center animate-bounce-in pointer-events-auto border-4 border-double border-[#5d4037]/20 max-w-xs text-center font-sans relative">
            <h3 className="font-bold text-[#5d4037] mb-4 font-serif text-lg tracking-widest leading-relaxed">切手を受け取りました</h3>
            <div className="w-24 h-32 border-4 border-white shadow-lg rotate-3 mb-5 bg-white p-1">
              <div className="w-full h-full border border-gray-100 flex items-center justify-center bg-gray-50">
                <img src={gotStamp.image_url} className="w-full h-full object-contain" alt="stamp" />
              </div>
            </div>
            <p className="font-bold text-sm text-[#5d4037] mb-1 font-serif">{gotStamp.name}</p>
            <p className="text-[10px] text-gray-400 mb-6 font-serif">切手帳に記録されました</p>
            <button onClick={handleClose} className="bg-[#5d4037] text-white text-xs font-bold px-8 py-2.5 rounded-full shadow hover:bg-[#4a332d] transition-colors tracking-wider font-sans">閉じる</button>
          </div>
        </div>
      )}

      <div className={`relative w-full max-w-md h-[85vh] md:h-[600px] shadow-2xl rounded-2xl transform transition-all duration-300 border-4 ${borderColor} ${bgColor} flex flex-col ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        <div className="h-24 md:h-28 flex items-center justify-between px-6 border-b border-gray-100/50 relative shrink-0">
          <div className="flex items-center gap-3 w-full pr-8">
             {/* ★アイコンの表示部分：ポスト投函時は赤色にする等の装飾 */}
             <div className={`shrink-0 drop-shadow-sm ${isPostedInBox ? 'text-red-600' : ''}`}><Icon className="w-10 h-10" /></div>
             <div className="overflow-hidden w-full">
               <h2 className={`font-bold font-serif text-base md:text-lg leading-tight line-clamp-2 ${textColor}`}>
                 {isLocked ? '秘密の手紙' : letter.title}
               </h2>
               <p className="text-xs text-gray-400 font-serif mt-0.5 truncate font-sans">📍 {letter.spot_name}</p>
               
               {/* ★追加：アーカイブへのリンクボタン */}
               {isPostedInBox && !isLocked && (
                 <button 
                  onClick={() => router.push(`/post/${letter.parent_id}`)}
                  className="mt-1 text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 font-sans"
                 >
                   📮 全てのアーカイブを読む
                 </button>
               )}
             </div>
          </div>
          <button onClick={handleClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-2 font-sans">✕</button>
        </div>

        {/* ...（中略：書き直し/削除/お気に入りボタン部分はそのまま）... */}
        {!isLocked && (
          <div className="absolute top-24 md:top-28 right-4 z-10 flex gap-2 font-sans">
            {isMyPost ? (
              <>
                {!isPostedInBox && (
                  <Link href={`/post/edit/${letter.id}`}>
                    <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full shadow hover:bg-gray-200 font-bold transition-colors">書き直す</button>
                  </Link>
                )}
                <button onClick={handleDelete} className="bg-red-50 text-red-500 text-xs px-3 py-1 rounded-full shadow hover:bg-red-100 font-bold transition-colors">削除</button>
              </>
            ) : (
              currentUser && (
                <button onClick={toggleFavorite} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full shadow transition-colors font-bold ${isFavorited ? 'bg-pink-50 text-pink-500 border border-pink-200' : 'bg-white text-gray-400 border border-gray-200 hover:text-pink-400'}`}>
                  {isFavorited ? '♥ お気に入り' : '♡ お気に入り'}
                </button>
              )
            )}
          </div>
        )}

        <div className="flex-1 relative overflow-hidden overflow-x-auto pt-12 pb-8 px-6 md:pt-14 md:pb-10 md:px-8 flex items-center justify-center touch-pan-y" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {isLocked ? (
            <div className="flex flex-col items-center justify-center w-full h-full animate-fadeIn space-y-4 font-sans">
              <div className="text-4xl">🔒</div>
              <p className="font-serif text-gray-600 text-sm tracking-widest">合言葉が必要です</p>
              <div className="w-full max-w-[200px]">
                <input type="text" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center mb-2 font-serif" placeholder="合言葉" />
                <button onClick={handleUnlock} className="w-full bg-green-700 text-white font-bold py-2 rounded shadow hover:bg-green-800 text-sm font-sans">開ける</button>
                {unlockError && <p className="text-red-500 text-xs text-center mt-2">合言葉が違います</p>}
              </div>
            </div>
          ) : (
            <>
              {pageData?.type === 'image' && (
                 <div className="w-full h-full flex items-center justify-center animate-fadeIn p-2">
                   <img src={pageData.content} alt="Photo" className="max-w-full max-h-full object-contain rounded shadow-md border-4 border-white transform rotate-1" />
                 </div>
              )}
              {pageData?.type === 'text' && (
                <div className={`w-full h-full text-base md:text-lg leading-loose font-serif tracking-widest [writing-mode:vertical-rl] whitespace-pre-wrap ${textColor} animate-fadeIn`}>
                  {renderContent(pageData.content)}
                </div>
              )}
            </>
          )}
        </div>

        {!isLocked && (
          <div className="h-16 border-t border-gray-100/50 flex items-center justify-between px-6 shrink-0 bg-white/30 backdrop-blur-sm rounded-b-xl relative font-sans">
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
               {!isMyPost && !isOfficial && (
                 <button onClick={handleReport} disabled={isReported} className="text-gray-300 hover:text-red-400 p-2 transition-colors disabled:text-gray-200">
                   {isReported ? '✓' : '⚐'}
                 </button>
               )}
            </div>
            <div className="flex-1 flex justify-center items-center gap-4">
              <div className="flex items-center">
                {currentPage < pages.length - 1 ? (
                  <button onClick={handleNext} className="text-sm font-bold flex items-center gap-1 text-gray-600 hover:text-orange-600 transition-colors pl-2 py-2">
                    <span className="text-lg">←</span> 次へ
                  </button>
                ) : (
                  // ★修正：最後のページで「読み終わる」を押した時に handleFinish を実行
                  <button onClick={handleFinish} className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow-sm transition-transform active:scale-95 ${isOfficial ? 'bg-[#826d36]' : 'bg-green-700'}`}>
                    読み終わる
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 font-serif tracking-widest w-8 text-center">- {currentPage + 1} -</span>
              <div className="flex items-center">
                <button onClick={handlePrev} disabled={currentPage === 0} className={`text-sm font-bold flex items-center gap-1 transition-colors pr-2 py-2 ${currentPage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-orange-500'}`}>
                  前へ <span className="text-lg">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}