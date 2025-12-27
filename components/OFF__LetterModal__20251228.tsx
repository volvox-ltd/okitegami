'use client';
import { useState, useEffect, TouchEvent } from 'react';
import { supabase } from '@/utils/supabase'; 
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import IconUserLetter from './IconUserLetter';
import IconAdminLetter from './IconAdminLetter';
import IconPost from './IconPost';
import { ENABLE_PHOTO_UPLOAD } from '@/utils/constants';

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; password?: string | null; attached_stamp_id?: number | null;
  parent_id?: string | null;
  is_postcard?: boolean;
  created_at?: string;
};

type Props = {
  letter: Letter;
  currentUser: User | null;
  onClose: () => void;
  onDeleted?: () => void;
  onRead?: (id: string) => void;
};

const CHARS_PER_PAGE = 140; 

export default function LetterModal({ letter, currentUser, onClose, onDeleted, onRead }: Props) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(!!letter.password); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); 
  const [pages, setPages] = useState<any[]>([]); 
  const [isFavorited, setIsFavorited] = useState(false);
  const [gotStamp, setGotStamp] = useState<any>(null);
  const [isReported, setIsReported] = useState(false);
  
  // 葉書用のフリップ状態
  const [isFlipped, setIsFlipped] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const isMyPost = currentUser && currentUser.id === letter.user_id;
  const isPostedInBox = !!letter.parent_id;
  const isOfficial = !!letter.is_official;
  const isPostcard = !!letter.is_postcard;

  useEffect(() => {
    setIsVisible(true);
    
    const initModal = async () => {
      setIsCheckingAuth(true);

      if (isMyPost) {
        setIsLocked(false);
      } 
      else if (currentUser && letter.password) {
        const { data } = await supabase
          .from('letter_reads')
          .select('id')
          .eq('letter_id', letter.id)
          .eq('user_id', currentUser.id)
          .limit(1);

        if (data && data.length > 0) {
          setIsLocked(false); 
        } else {
          setIsLocked(true);
        }
      } 
      else if (!currentUser && letter.password) {
        const storedReads = localStorage.getItem('read_letter_ids');
        if (storedReads) {
          const readIds = JSON.parse(storedReads);
          if (readIds.includes(letter.id)) {
            setIsLocked(false);
          } else {
            setIsLocked(true);
          }
        } else {
          setIsLocked(true);
        }
      }
      else if (!letter.password) {
        setIsLocked(false);
        recordRead(); 
      }
      
      if (currentUser) await checkFavorite();
      setIsCheckingAuth(false);
    };

    initModal();
  }, [letter.id, currentUser?.id]); 

  const recordRead = async () => {
    if (currentUser && currentUser.id === letter.user_id) return;
    
    if (currentUser) {
      const { data } = await supabase
        .from('letter_reads')
        .select('id')
        .eq('letter_id', letter.id)
        .eq('user_id', currentUser.id)
        .limit(1);
      if (data && data.length > 0) {
          if (onRead) onRead(letter.id);
          return;
      }
    }

    const { error } = await supabase.from('letter_reads').insert({
      letter_id: letter.id,
      user_id: currentUser?.id || null,
    });

    if (!error && onRead) onRead(letter.id);
  };

  const handleUnlock = () => {
    if (inputPassword === letter.password) {
      setIsLocked(false);
      setUnlockError(false);
      recordRead(); 
    } else {
      setUnlockError(true);
    }
  };

  const checkFavorite = async () => {
    if (!currentUser || !letter.id) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', currentUser.id).eq('letter_id', letter.id).maybeSingle();
    if (data) setIsFavorited(true);
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      if (confirm('お気に入り登録するにはログインが必要です。ログイン画面へ移動しますか？')) {
        const returnUrl = encodeURIComponent(`/?open_post=${letter.id}`);
        router.push(`/login?next=${returnUrl}`);
      }
      return;
    }
    if (isFavorited) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('letter_id', letter.id);
      if (!error) setIsFavorited(false);
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: currentUser.id, letter_id: letter.id });
      if (!error) setIsFavorited(true);
    }
  };

  const checkStamp = async () => {
    if (gotStamp || isMyPost || !letter.attached_stamp_id || !currentUser) return false;
    try {
      const { data: existing } = await supabase
        .from('user_stamps')
        .select('count')
        .eq('user_id', currentUser.id)
        .eq('post_id', letter.id) 
        .maybeSingle();

      if (existing) {
        return false; 
      } else {
        await supabase.from('user_stamps').insert({ 
          user_id: currentUser.id, 
          post_id: letter.id, 
          stamp_id: letter.attached_stamp_id, 
          count: 1 
        });
        
        const { data: stampData } = await supabase.from('stamps').select('*').eq('id', letter.attached_stamp_id).maybeSingle();
        if (stampData) {
          setGotStamp(stampData);
          return true; 
        }
      }
    } catch (e) { console.error("切手処理エラー:", e); }
    return false;
  };

  const PAGE_DELIMITER = '<<<PAGE>>>';
  useEffect(() => {
    const newPages = [];
    if (!isPostcard) {
      const text = letter.content || '';
      if (text.includes(PAGE_DELIMITER)) {
        text.split(PAGE_DELIMITER).forEach(p => newPages.push({ type: 'text', content: p }));
      } else {
        for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
          newPages.push({ type: 'text', content: text.slice(i, i + CHARS_PER_PAGE) });
        }
      }
    } else {
      newPages.push({ type: 'postcard', content: letter.content });
    }
    setPages(newPages);
  }, [letter, isPostcard]);

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };

  const handleFinish = async () => { 
    const isNewObtained = await checkStamp(); 
    if (!isNewObtained) {
      handleClose(); 
    }
  };

  const handleNext = () => { if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

  const handleBodyClick = (e: React.MouseEvent) => {
    if (isPostcard) return;
    if (currentPage < pages.length - 1) handleNext();
  };

  const onTouchStart = (e: TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (isPostcard || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (!error) { alert('削除しました'); handleClose(); if (onDeleted) onDeleted(); }
  };

  const handleReport = async () => {
    if (!confirm('この手紙を不適切なコンテンツとして通報しますか？')) return;
    try { await supabase.from('reports').insert({ letter_id: letter.id, reporter_id: currentUser?.id || null, reason: '不適切なコンテンツ' }); alert('通報を受け付けました。'); setIsReported(true); } catch (e) {}
  };

  const renderContent = (text: string) => {
    if (!letter.is_official) return text; 
    const regex = /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/g;
    const parts = []; let lastIndex = 0; let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      parts.push(<a key={match.index} href={match[1]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-sans">{match[2]}</a>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  if (isCheckingAuth) return null;

  // 日本時間での日付・時刻取得
  const postDate = new Date(letter.created_at || Date.now());
  const yy = postDate.getFullYear().toString().slice(-2);
  const mm = (postDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = postDate.getDate().toString().padStart(2, '0');
  const hh = postDate.getHours().toString().padStart(2, '0');
  const min = postDate.getMinutes().toString().padStart(2, '0');

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* 切手取得演出 */}
      {gotStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto" onClick={handleClose}></div>
          <div className="bg-[#fdfcf5] p-8 rounded-sm shadow-2xl flex flex-col items-center animate-bounce-in pointer-events-auto border-4 border-double border-[#5d4037]/20 max-w-xs text-center font-sans relative">
            <h3 className="font-bold text-[#5d4037] mb-4 font-serif text-lg tracking-widest leading-relaxed">切手を受け取りました</h3>
            <div className="w-24 h-32 border-4 border-white shadow-lg rotate-3 mb-5 bg-white p-1 relative">
                <Image src={gotStamp.image_url} fill className="object-contain p-1" alt="stamp" sizes="96px" priority />
            </div>
            <p className="font-bold text-sm text-[#5d4037] mb-1 font-serif">{gotStamp.name}</p>
            <p className="text-[10px] text-gray-400 mb-6 font-serif">切手帳に記録されました</p>
            <button onClick={handleClose} className="bg-[#5d4037] text-white text-xs font-bold px-8 py-2.5 rounded-full shadow hover:bg-[#4a332d] transition-colors tracking-wider font-sans">閉じる</button>
          </div>
        </div>
      )}

      {/* モーダルコンテナ */}
      <div 
        className={`relative w-full max-w-[380px] aspect-[1/1.48] transition-all duration-700 font-sans ${isPostcard ? 'preserve-3d' : ''} ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        style={{ perspective: '1500px' }}
      >
        
        {/* --- 表面 (便箋本体 または 葉書文字面) --- */}
        <div 
          className={`absolute inset-0 w-full h-full backface-hidden bg-white shadow-2xl flex flex-col px-6 py-4 rounded-sm ${isPostcard ? 'cursor-pointer' : ''} ${isPostcard ? '' : 'z-20'}`}
          onClick={() => isPostcard && !isLocked && letter.image_url && setIsFlipped(!isFlipped)}
        >
          
          {/* 切手・消印エリア：サイズ 72x90, 位置 calc(var(--spacing) * 3) */}
          {isPostcard && !isLocked && (
            <div 
              className="absolute pointer-events-none z-30"
              style={{ left: 'calc(var(--spacing) * 3)', top: 'calc(var(--spacing) * 3)', width: '72px', height: '90px' }}
            >
               <div className="relative w-full h-full">
                 <Image src="/postcard__stamp.png" fill className="object-contain" alt="stamp" priority />
                 
                 {/* ★ 修正：消印スタンプデザインの刷新 */}
                 <div className="absolute left-6 top-10 w-16 h-16 border-2 border-black/20 rounded-full flex items-center justify-center flex-col rotate-12 mix-blend-multiply">
                    {/* 上部：おきてがみ (8px) */}
                    <span className="text-[8px] text-black/20 font-bold uppercase leading-tight font-sans tracking-[0.15em]">おきてがみ</span>
                    <div className="w-full border-t border-black/20 my-0.5" />
                    {/* 中部：日付 (10px) */}
                    <span className="text-[10px] text-black/20 font-bold tracking-[0.1em] leading-tight font-sans">{yy}.{mm}.{dd}</span>
                    <div className="w-full border-t border-black/20 my-0.5" />
                    {/* 下部：時間 (6px) */}
                    <span className="text-[6px] text-black/20 font-bold tracking-[0.2em] leading-tight font-sans">{hh}:{min}</span>
                 </div>
               </div>
            </div>
          )}

          {/* ヘッダーエリア */}
          <div className="flex justify-center items-center shrink-0 relative h-10 mb-2">
            {!isPostcard && isMyPost && !isLocked && (
              <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="absolute left-0 bg-pink-50 text-pink-500 text-[10px] px-3 py-1 rounded-full font-bold border border-pink-100 transition-all z-30">削除</button>
            )}
            
            {/* ★ 修正：ml-[0.4em] を追加して視覚的なセンターを補正 */}
            <span className="text-sm font-bold tracking-[0.4em] ml-[0.4em] text-[#8a776a] font-sans">POST CARD</span>
            
            <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600 font-sans z-30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* コンテンツエリア */}
          <div 
            className={`flex-1 relative flex overflow-hidden ${!isPostcard ? 'cursor-pointer flex-col mt-2' : 'flex-row-reverse items-start'}`}
            onClick={handleBodyClick}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          >
            {isLocked ? (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-4 font-sans animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <div className="text-4xl">🔒</div>
                <p className="font-serif text-gray-500 text-xs tracking-widest">合言葉が必要です</p>
                <div className="w-full max-w-[160px]">
                  <input type="text" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-center mb-2 font-serif text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" placeholder="合言葉" />
                  <button onClick={handleUnlock} className="w-full bg-[#8a776a] text-white font-bold py-2 rounded shadow text-sm">開ける</button>
                  {unlockError && <p className="text-red-400 text-[10px] text-center mt-2">合言葉が違います</p>}
                </div>
              </div>
            ) : isPostcard ? (
              /* --- ハガキ表面レイアウト --- */
              <>
                {/* タイトル：右端 */}
                <div className="w-12 shrink-0 flex items-start justify-center pt-12 pb-5">
                   <h3 className="font-bold text-[#8a776a] font-serif [writing-mode:vertical-rl] tracking-widest text-base leading-none h-auto">{letter.title}</h3>
                </div>
                {/* 本文：上揃え */}
                <div className="flex-1 h-full flex flex-col justify-start pt-12 pb-5">
                   <p className="text-sm md:text-base leading-[2.2] font-serif tracking-[0.15em] [writing-mode:vertical-rl] whitespace-pre-wrap text-[#5d4037] h-full overflow-hidden">
                     {renderContent(letter.content)}
                   </p>
                </div>
              </>
            ) : (
              /* --- 便箋ページレイアウト --- */
              <div key={currentPage} className="w-full h-full animate-pageTurn flex flex-col">
                <div className="flex justify-between items-start mb-6">
                   <h2 className="text-lg font-bold font-serif text-[#8a776a]">{letter.title}</h2>
                </div>
                <div className="flex-1 w-full h-full overflow-hidden">
                   <div 
                     className="w-full h-full text-base font-serif tracking-[0.2em] [writing-mode:vertical-rl] whitespace-pre-wrap text-[#5d4037]"
                     style={{ 
                       lineHeight: '2.5rem',
                       backgroundImage: 'linear-gradient(to left, transparent calc(100% - 1px), #f0f4f5 1px)',
                       backgroundSize: '2.5rem 100%',
                       backgroundPosition: 'right top'
                     }}
                   >
                     <div>{renderContent(pages[currentPage]?.content)}</div>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* フッターエリア */}
          <div className="h-12 flex items-center justify-between shrink-0 font-sans mt-auto">
            {!isLocked && (
              <>
                <div className="w-24">
                  {isPostcard ? (
                    isMyPost && <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="bg-pink-50 text-pink-500 text-[10px] px-4 py-2 rounded-full font-bold border border-pink-100 shadow-sm transition-all hover:bg-pink-100 active:scale-95">削除</button>
                  ) : (
                    currentPage === pages.length - 1 ? (
                      <button onClick={(e) => { e.stopPropagation(); handleFinish(); }} className="bg-[#1a4d2e] text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-md">読み終わる</button>
                    ) : (
                      <span className="text-xs text-gray-300 font-serif font-bold">{currentPage + 1} / {pages.length}</span>
                    )
                  )}
                </div>

                <div className="flex-1 flex justify-center items-center">
                  <span className="text-[10px] text-gray-400 tracking-widest font-bold animate-pulse">タップで裏返す</span>
                </div>

                <div className="w-24 flex justify-end">
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} 
                     className={`flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-full border shadow-sm transition-all active:scale-95 ${isFavorited ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-pink-300'}`}
                   >
                     {isFavorited ? '♥' : '♡'} お気に入り
                   </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- 裏面 (ハガキ写真面：全面表示) --- */}
        {isPostcard && (
          <div 
            className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-black shadow-2xl flex flex-col rounded-sm overflow-hidden cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
             {letter.image_url ? (
               <>
                 <Image src={letter.image_url} fill className="object-cover" alt="Postcard photo" priority />
                 
                 {/* ★ 視認性向上のための上下グラデーション 
                    明るい写真でも白文字が浮き出るように、上下にふんわりとした黒の影を敷きます
                 */}
                 <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
                 <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />
                 
                 {/* 裏面ヘッダー */}
                 <div className="absolute top-4 inset-x-6 flex justify-center items-center z-20 h-10">
                    <span className="text-white text-sm font-bold tracking-[0.4em] ml-[0.4em] font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      POST CARD
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-white hover:text-white/80 drop-shadow-md">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </div>

                 {/* 裏面フッター：場所名とガイド */}
                 <div className="absolute bottom-6 inset-x-6 flex flex-col items-center justify-center z-20">
                    {/* 場所名：たっぷりとした字間と白文字 */}
                    <p className="text-white text-[11px] font-bold tracking-[0.5em] ml-[0.5em] mb-3 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {letter.spot_name}
                    </p>
                    {/* ガイド */}
                    <span className="text-white/90 text-[10px] font-bold font-sans tracking-widest drop-shadow-md">
                      タップで裏返す
                    </span>
                 </div>
               </>
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-sm">写真がありません</div>
             )}
          </div>
        )}
      </div>
      
      <style jsx global>{` 
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { 
          backface-visibility: hidden; 
          -webkit-backface-visibility: hidden; 
        }
        @keyframes pageTurn {
          0% { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-pageTurn { animation: pageTurn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } } 
        .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } 
      `}</style>
    </div>
  );
}