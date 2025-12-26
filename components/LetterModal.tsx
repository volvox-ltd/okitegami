'use client';
import { useState, useEffect, TouchEvent } from 'react';
// 共通クライアントを使用してセッション不整合を解消
import { supabase } from '@/utils/supabase'; 
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Next.jsの画像最適化コンポーネント
import Image from 'next/image';
import IconUserLetter from './IconUserLetter';
import IconAdminLetter from './IconAdminLetter';
import IconPost from './IconPost';
// ★追加：スイッチをインポート
import { ENABLE_PHOTO_UPLOAD } from '@/utils/constants';

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; password?: string | null; attached_stamp_id?: number | null;
  parent_id?: string | null;
  is_postcard?: boolean; // ★追加
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
  
  // ★絵葉書用のフリップ状態
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
    
    // 絵葉書モードではない場合、従来のページ構成ロジック
    if (!isPostcard) {
      if (ENABLE_PHOTO_UPLOAD && letter.image_url) {
        newPages.push({ type: 'image', content: letter.image_url });
      }

      const text = letter.content || '';
      if (text.includes(PAGE_DELIMITER)) {
        text.split(PAGE_DELIMITER).forEach(p => newPages.push({ type: 'text', content: p }));
      } else {
        for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
          newPages.push({ type: 'text', content: text.slice(i, i + CHARS_PER_PAGE) });
        }
      }
    } else {
      // 絵葉書モードの場合（ページ遷移は不要、フリップで対応）
      newPages.push({ type: 'postcard', content: letter.content });
    }
    
    setPages(newPages);
  }, [letter, ENABLE_PHOTO_UPLOAD, isPostcard]);

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };

  const handleFinish = async () => { 
    const isNewObtained = await checkStamp(); 
    if (!isNewObtained) {
      handleClose(); 
    }
  };

  const handleNext = () => { if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

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

  const borderColor = isOfficial ? 'border-yellow-600' : 'border-green-700';
  const bgColor = isOfficial ? 'bg-[#fdfcf5]' : 'bg-white';
  const textColor = isOfficial ? 'text-[#5d4037]' : 'text-gray-800';
  const Icon = isPostedInBox ? IconPost : (isOfficial ? IconAdminLetter : IconUserLetter);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      {gotStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
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

      {/* ★ 絵葉書UIか通常便箋UIかの出し分け */}
      <div 
        className={`relative w-full max-w-md h-[85vh] md:h-[600px] transition-all duration-700 font-sans ${isPostcard ? 'preserve-3d cursor-pointer' : ''} ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        style={{ perspective: '1000px' }}
        onClick={() => isPostcard && !isLocked && setIsFlipped(!isFlipped)}
      >
        
        {/* --- 表面（ポストカードなら写真、便箋なら共通レイアウト） --- */}
        <div className={`absolute inset-0 w-full h-full backface-hidden shadow-2xl rounded-2xl border-4 ${borderColor} ${bgColor} flex flex-col ${isPostcard ? '' : 'z-20'}`}>
          <div className="h-24 md:h-28 flex items-center justify-between px-6 border-b border-gray-100/50 relative shrink-0">
            <div className="flex items-center gap-3 w-full pr-8">
               <div className={`shrink-0 drop-shadow-sm ${isPostedInBox ? 'text-red-600' : ''}`}><Icon className="w-10 h-10" /></div>
               <div className="overflow-hidden w-full">
                 <h2 className={`font-bold font-serif text-base md:text-lg leading-tight line-clamp-2 ${textColor}`}>{isLocked ? '秘密の手紙' : letter.title}</h2>
                 <p className="text-xs text-gray-400 font-serif mt-0.5 truncate font-sans">📍 {letter.spot_name}</p>
               </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-2 font-sans">✕</button>
          </div>
          
          {!isLocked && (
            <div className="absolute top-24 md:top-28 right-4 z-10 flex gap-2 font-sans">
              {isMyPost ? (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="bg-red-50 text-red-500 text-xs px-3 py-1 rounded-full shadow hover:bg-red-100 font-bold transition-colors">削除</button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full shadow transition-colors font-bold ${isFavorited ? 'bg-pink-50 text-pink-500 border border-pink-200' : 'bg-white text-gray-400 border border-gray-200 hover:text-pink-400'}`}>
                  {isFavorited ? '♥ お気に入り' : '♡ お気に入り'}
                </button>
              )}
            </div>
          )}

          <div className="flex-1 relative overflow-hidden overflow-x-auto pt-12 pb-8 px-6 md:pt-14 md:pb-10 md:px-8 flex items-center justify-center touch-pan-y" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {isLocked ? (
              <div className="flex flex-col items-center justify-center w-full h-full animate-fadeIn space-y-4 font-sans">
                <div className="text-4xl">🔒</div>
                <p className="font-serif text-gray-600 text-sm tracking-widest">合言葉が必要です</p>
                <div className="w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <input type="text" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center mb-2 font-serif focus:outline-none" placeholder="合言葉" />
                  <button onClick={handleUnlock} className="w-full bg-green-700 text-white font-bold py-2 rounded shadow hover:bg-green-800 text-sm font-sans">開ける</button>
                  {unlockError && <p className="text-red-500 text-xs text-center mt-2">合言葉が違います</p>}
                </div>
              </div>
            ) : isPostcard ? (
              // 絵葉書の表面
              <div className="w-full h-full flex flex-col items-center justify-center animate-fadeIn">
                <div className="relative w-full h-full p-2">
                  <Image 
                    src={letter.image_url!} 
                    fill 
                    alt="Postcard" 
                    // ★ CSSフィルター(sepiaなど)を削除し、シンプルに表示
                    className="object-cover rounded shadow-inner" 
                  />
                  {/* ★ ここにあった消印ラベルの <div> ブロックを全て削除しました */}
                </div>
                <p className="text-[10px] text-gray-400 mt-4 animate-pulse">タップで裏返す</p>
              </div>
            ) : (
              // 通常の便箋の表示：縦書き
              <div className="w-full h-full">
                {pages[currentPage]?.type === 'image' && (
                   <div className="w-full h-full flex items-center justify-center animate-fadeIn p-2">
                     <div className="relative transform rotate-1">
                       <Image src={pages[currentPage].content} alt="Photo" width={800} height={1200} className="w-auto h-auto max-w-full max-h-[45vh] md:max-h-[50vh] rounded shadow-md border-4 border-white object-contain" sizes="(max-width: 768px) 100vw, 400px" priority />
                     </div>
                   </div>
                )}
                {pages[currentPage]?.type === 'text' && (
                  <div className={`w-full h-full text-base md:text-lg leading-loose font-serif tracking-widest [writing-mode:vertical-rl] whitespace-pre-wrap ${textColor} animate-fadeIn`}>
                    {renderContent(pages[currentPage].content)}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isLocked && !isPostcard && (
            <div className="h-16 border-t border-gray-100/50 flex items-center justify-between px-6 shrink-0 bg-white/30 backdrop-blur-sm rounded-b-xl relative font-sans">
              <div className="absolute left-6 top-1/2 -translate-y-1/2">
                 {!isMyPost && !isOfficial && (
                   <button onClick={(e) => { e.stopPropagation(); handleReport(); }} disabled={isReported} className="text-gray-300 hover:text-red-400 p-2 transition-colors disabled:text-gray-200">
                     {isReported ? '✓' : '⚐'}
                   </button>
                 )}
              </div>
              <div className="flex-1 flex justify-center items-center gap-4">
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className={`text-sm font-bold flex items-center gap-1 ${currentPage < pages.length - 1 ? 'text-gray-600 hover:text-orange-600' : 'invisible'}`}><span className="text-lg">←</span> 次へ</button>
                <span className="text-xs text-gray-400 font-serif tracking-widest w-8 text-center">- {currentPage + 1} -</span>
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentPage === 0} className={`text-sm font-bold flex items-center gap-1 ${currentPage === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-orange-500'}`}>前へ <span className="text-lg">→</span></button>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  {currentPage === pages.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); handleFinish(); }} className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow-sm transition-transform active:scale-95 ${isOfficial ? 'bg-[#826d36]' : 'bg-green-700'}`}>
                      読み終わる
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* --- 裏面（絵葉書専用メッセージ面） --- */}
        {isPostcard && (
          <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] shadow-2xl rounded-2xl border-4 border-white bg-[#fdfcf5] flex flex-col p-8">
             <div className="flex justify-between border-b border-gray-200 pb-4 mb-6">
                <span className="text-xs font-bold text-gray-300 tracking-widest font-sans uppercase">Postcard</span>
                <div className="w-10 h-12 border border-gray-200 rounded-sm bg-red-50/50 flex items-center justify-center text-[8px] text-red-200 font-bold uppercase leading-none text-center">Stamp<br/>Here</div>
             </div>
             
             <div className="flex-1 font-serif text-base leading-relaxed text-[#5d4037] whitespace-pre-wrap overflow-y-auto">
                {letter.content}
             </div>

             <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-end font-sans">
                <div>
                   <p className="text-[10px] text-gray-400">📍 Location</p>
                   <p className="text-xs font-bold text-[#5d4037]">{letter.spot_name}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleFinish(); }} 
                  className="bg-[#5d4037] text-white px-6 py-2 rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform"
                >
                  読み終わる
                </button>
             </div>
          </div>
        )}

      </div>
      
      <style jsx global>{` 
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } } 
        .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } 
      `}</style>
    </div>
  );
}