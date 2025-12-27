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
  parent_id?: string | null; created_at?: string;
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
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const isMyPost = currentUser && currentUser.id === letter.user_id;
  const isPostedInBox = !!letter.parent_id;
  const isOfficial = !!letter.is_official;

  useEffect(() => {
    setIsVisible(true);
    const initModal = async () => {
      setIsCheckingAuth(true);
      if (isMyPost) { setIsLocked(false); } 
      else if (currentUser && letter.password) {
        const { data } = await supabase.from('letter_reads').select('id').eq('letter_id', letter.id).eq('user_id', currentUser.id).limit(1);
        setIsLocked(!(data && data.length > 0));
      } 
      else if (!currentUser && letter.password) {
        const storedReads = localStorage.getItem('read_letter_ids');
        setIsLocked(!storedReads || !JSON.parse(storedReads).includes(letter.id));
      }
      else if (!letter.password) { setIsLocked(false); recordRead(); }
      if (currentUser) await checkFavorite();
      setIsCheckingAuth(false);
    };
    initModal();
  }, [letter.id, currentUser?.id]); 

  const recordRead = async () => {
    if (currentUser && currentUser.id === letter.user_id) return;
    if (currentUser) {
      const { data } = await supabase.from('letter_reads').select('id').eq('letter_id', letter.id).eq('user_id', currentUser.id).limit(1);
      if (data && data.length > 0) { if (onRead) onRead(letter.id); return; }
    }
    const { error } = await supabase.from('letter_reads').insert({ letter_id: letter.id, user_id: currentUser?.id || null });
    if (!error && onRead) onRead(letter.id);
  };

  const handleUnlock = () => {
    if (inputPassword === letter.password) { setIsLocked(false); setUnlockError(false); recordRead(); } 
    else { setUnlockError(true); }
  };

  const checkFavorite = async () => {
    if (!currentUser || !letter.id) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', currentUser.id).eq('letter_id', letter.id).maybeSingle();
    if (data) setIsFavorited(true);
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      if (confirm('お気に入り登録するにはログインが必要です。ログイン画面へ移動しますか？')) {
        router.push(`/login?next=${encodeURIComponent(`/?open_post=${letter.id}`)}`);
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
      const { data: existing } = await supabase.from('user_stamps').select('count').eq('user_id', currentUser.id).eq('post_id', letter.id).maybeSingle();
      if (!existing) {
        await supabase.from('user_stamps').insert({ user_id: currentUser.id, post_id: letter.id, stamp_id: letter.attached_stamp_id, count: 1 });
        const { data: stampData } = await supabase.from('stamps').select('*').eq('id', letter.attached_stamp_id).maybeSingle();
        if (stampData) { setGotStamp(stampData); return true; }
      }
    } catch (e) { console.error(e); }
    return false;
  };

  useEffect(() => {
    const newPages = [];
    const text = letter.content || '';
    const PAGE_DELIMITER = '<<<PAGE>>>';
    if (text.includes(PAGE_DELIMITER)) {
      text.split(PAGE_DELIMITER).forEach(p => newPages.push({ type: 'text', content: p }));
    } else {
      for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
        newPages.push({ type: 'text', content: text.slice(i, i + CHARS_PER_PAGE) });
      }
    }
    setPages(newPages);
  }, [letter]);

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };
  const handleFinish = async () => { if (!(await checkStamp())) handleClose(); };
  const handleNext = () => { if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (!error) { handleClose(); onDeleted?.(); }
  };

  const handleReport = async () => {
    if (!confirm('通報しますか？')) return;
    await supabase.from('reports').insert({ letter_id: letter.id, reporter_id: currentUser?.id || null, reason: '不適切なコンテンツ' });
    setIsReported(true);
  };

  if (isCheckingAuth) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      {gotStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-[#fdfcf5] p-8 rounded-sm shadow-2xl flex flex-col items-center animate-bounce-in pointer-events-auto border-4 border-double border-[#5d4037]/20 max-w-xs text-center relative">
            <h3 className="font-bold text-[#5d4037] mb-4 font-serif text-lg tracking-widest">切手を受け取りました</h3>
            <div className="w-24 h-32 border-4 border-white shadow-lg rotate-3 mb-5 bg-white p-1 relative">
              <Image src={gotStamp.image_url} fill className="object-contain" alt="stamp" priority />
            </div>
            <p className="font-bold text-sm text-[#5d4037] mb-1 font-serif">{gotStamp.name}</p>
            <button onClick={handleClose} className="bg-[#5d4037] text-white text-xs font-bold px-8 py-2.5 rounded-full mt-4">閉じる</button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-[380px] aspect-[1/1.48] bg-white shadow-2xl flex flex-col px-6 py-4 rounded-sm z-20">
        <div className="flex justify-center items-center shrink-0 relative h-10 mb-2">
          {/* ★ 修正：左端にボタンを配置（自分の投稿なら削除、他人の投稿ならお気に入り） */}
          {!isLocked && (
            <div className="absolute left-0 z-30">
              {isMyPost ? (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="bg-pink-50 text-pink-500 text-[10px] px-3 py-1 rounded-full font-bold border border-pink-100 transition-all hover:scale-105 active:scale-95">削除</button>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} 
                  className={`flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-full border shadow-sm transition-all active:scale-95 ${isFavorited ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-pink-300'}`}
                >
                  {isFavorited ? '♥' : '♡'} お気に入り
                </button>
              )}
            </div>
          )}
          
          <button onClick={handleClose} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* --- 本文エリア（タップでページめくり、最後なら最初に戻る） --- */}
        <div 
          className="flex-1 relative flex flex-col overflow-hidden mt-2" 
          onClick={() => {
            if (currentPage < pages.length - 1) {
              handleNext();
            } else {
              setCurrentPage(0); // 最後のページなら最初に戻る
            }
          }} 
          onTouchStart={e => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); }} 
          onTouchMove={e => setTouchEnd(e.targetTouches[0].clientX)} 
          onTouchEnd={onTouchEnd}
        >
          {isLocked ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 font-sans" onClick={e => e.stopPropagation()}>
              <div className="text-4xl">🔒</div>
              <input type="text" value={inputPassword} onChange={e => setInputPassword(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-center font-serif text-sm outline-none" placeholder="合言葉" />
              <button onClick={handleUnlock} className="w-full bg-[#8a776a] text-white font-bold py-2 rounded shadow text-sm">開ける</button>
              {unlockError && <p className="text-red-400 text-[10px]">合言葉が違います</p>}
            </div>
          ) : (
            <>
              {/* ★ 修正：タイトルと場所を固定位置に配置（アニメーションの外） */}
              <div className="flex justify-between items-baseline mb-6 shrink-0 pointer-events-none">
                <h2 className="text-lg font-bold font-serif text-[#8a776a] leading-tight">{letter.title}</h2>
                <p className="text-[10px] text-gray-400 font-sans tracking-widest truncate ml-4">📍 {letter.spot_name}</p>
              </div>
              
              <div key={currentPage} className="flex-1 overflow-hidden animate-pageTurn">
                <div 
                  className="w-full h-full text-base font-serif tracking-[0.2em] [writing-mode:vertical-rl] whitespace-pre-wrap text-[#5d4037]" 
                  style={{ 
                    lineHeight: '2.5rem', 
                    backgroundImage: 'linear-gradient(to left, transparent calc(100% - 1px), #f0f4f5 1px)', 
                    backgroundSize: '2.5rem 100%', 
                    backgroundPosition: 'right top' 
                  }}
                >
                  {letter.content.split('<<<PAGE>>>')[currentPage] || pages[currentPage]?.content}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-16 flex items-center justify-between shrink-0 font-sans mt-auto border-gray-100">
          {!isLocked && (
            <>
              <div className="w-24">
                {currentPage === pages.length - 1 ? (
                  <button onClick={(e) => { e.stopPropagation(); handleFinish(); }} className="bg-[#1a4d2e] text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-md">読み終わる</button>
                ) : (
                  <span className="text-xs text-gray-300 font-serif font-bold">{currentPage + 1} / {pages.length}</span>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className={`text-xs font-bold ${currentPage < pages.length - 1 ? 'text-[#8a776a]' : 'text-gray-200 pointer-events-none'}`}>← 次へ</button>
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className={`text-xs font-bold ${currentPage > 0 ? 'text-[#8a776a]' : 'text-gray-200 pointer-events-none'}`}>前へ →</button>
              </div>
              <div className="w-24 flex justify-end">
                {/* ★ 修正：フッター右端のお気に入りボタンを削除（ヘッダー左側に移動したため） */}
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx global>{` .animate-pageTurn { animation: pageTurn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; } @keyframes pageTurn { 0% { transform: translateX(30px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } } `}</style>
    </div>
  );
}