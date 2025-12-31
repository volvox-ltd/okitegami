'use client';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/utils/supabase'; 
import { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; password?: string | null; attached_stamp_id?: number | null;
  parent_id?: string | null; created_at?: string;
  allow_reply?: boolean;
};

type ReplyLetter = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  nickname?: string | null;
};

type Props = {
  letter: Letter;
  currentUser: User | null;
  onClose: () => void;
  onDeleted?: (id?: string) => void;
  onRead?: (id: string) => void;
  initialLayer?: number;
  isRainy?: boolean;
  hideReply?: boolean;    
  hideFavorite?: boolean; 
  isMyPage?: boolean;     
};

const CHARS_PER_PAGE = 140; 

function LetterModalContent({ 
  letter, currentUser, onClose, onDeleted, onRead, initialLayer = 0, isRainy = false,
  hideReply = false, hideFavorite = false, isMyPage = false
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(!!letter.password); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); 
  const [pages, setPages] = useState<any[]>([]); 
  const [isFavorited, setIsFavorited] = useState(false);
  const [gotStamp, setGotStamp] = useState<any>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [activeLayer, setActiveLayer] = useState(initialLayer); 
  const [replies, setReplies] = useState<ReplyLetter[]>([]); 
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0); 
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const minSwipeDistance = 40;

  const isMyPost = currentUser && currentUser.id === letter.user_id;

  useEffect(() => {
    if (searchParams.get('trigger_reply') === 'true' && searchParams.get('open_post') === letter.id && currentUser) {
      setMode('write');
      const newUrl = window.location.pathname + window.location.search.replace(/[&?]trigger_reply=true/, '').replace(/^&/, '?');
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentUser, letter.id, searchParams]);

  useEffect(() => {
    setIsVisible(true);
    const initModal = async () => {
      setIsCheckingAuth(true);
      
      if (letter.user_id) {
        const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', letter.user_id).maybeSingle();
        if (profile) setNickname(profile.nickname);
      }
      if (currentUser) {
        const { data: myProfile } = await supabase.from('profiles').select('nickname').eq('id', currentUser.id).maybeSingle();
        if (myProfile) setMyNickname(myProfile.nickname);
      }

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
      
      if (currentUser) {
        await checkFavorite();
        let query = supabase.from('letters')
          .select('id, content, created_at, user_id')
          .eq('parent_id', letter.id)
          .order('created_at', { ascending: false });

        if (!isMyPost) query = query.eq('user_id', currentUser.id);

        const { data: repliesData } = await query;
        if (repliesData) {
          const enrichedReplies = await Promise.all(repliesData.map(async (r) => {
            if (r.user_id === currentUser.id) return { ...r, nickname: myNickname };
            const { data: p } = await supabase.from('profiles').select('nickname').eq('id', r.user_id).maybeSingle();
            return { ...r, nickname: p?.nickname || '名無し' };
          }));
          setReplies(enrichedReplies as any);
        }
      }
      setIsCheckingAuth(false);
    };
    initModal();
  }, [letter.id, currentUser?.id, isMyPost, myNickname]); 

  const recordRead = async () => {
    if (currentUser && currentUser.id === letter.user_id) return;
    await supabase.from('letter_reads').insert({ letter_id: letter.id, user_id: currentUser?.id || null });
    if (onRead) onRead(letter.id);
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
      router.push(`/login?next=${encodeURIComponent(`/?open_post=${letter.id}`)}`);
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
  
  const handleNext = () => { 
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1); 
    } else if (pages.length > 1) {
      setCurrentPage(0); 
    }
  };

  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (confirm('返信を書くにはログインが必要です。ログイン画面へ移動しますか？')) {
        router.push(`/login?next=${encodeURIComponent(`/?open_post=${letter.id}&trigger_reply=true`)}`);
      }
      return;
    }
    setMode('write');
  };

  const submitReply = async () => {
    if (!replyContent.trim()) return alert('お返事を入力してください');
    if (!currentUser) return alert('ログインが必要です');
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('letters').insert({
        title: `Re: ${letter.title}`,
        content: replyContent,
        spot_name: letter.spot_name,
        lat: letter.lat,
        lng: letter.lng,
        user_id: currentUser.id,
        parent_id: letter.id,
        is_official: false
      }).select('id, content, created_at, user_id').single();

      if (error) throw error;
      const newReply = { ...data, nickname: myNickname };
      setReplies([newReply as any, ...replies]);
      setMode('read');
      setActiveLayer(0); 
    } catch (e) { alert('送信に失敗しました'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteReply = async () => {
    const currentReply = replies[currentReplyIndex];
    if (!currentReply || !confirm('この返事を削除しますか？')) return;
    const deletedId = currentReply.id;
    const { error } = await supabase.from('letters').delete().eq('id', deletedId);
    if (!error) {
      const newReplies = replies.filter((_, i) => i !== currentReplyIndex);
      setReplies(newReplies);
      setCurrentReplyIndex(0);
      
      if (newReplies.length === 0) {
        if (isMyPage) {
          onDeleted?.(deletedId); 
          handleClose();
        } else {
          setActiveLayer(0); 
        }
      }
    }
  };

  const handleDeleteParent = async () => {
    if (!confirm('本当にこの手紙を削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (!error) { 
      onDeleted?.(letter.id);
      handleClose(); 
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setTouchEndX(null); setTouchEndY(null);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };
  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX || !touchStartY || !touchEndY) return;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (activeLayer === 0 && mode === 'read') {
        if (diffX > minSwipeDistance) handleNext();
        if (diffX < -minSwipeDistance) handlePrev();
      }
    } else {
      if (replies.length > 0 && mode === 'read') {
        if (diffY > minSwipeDistance && activeLayer === 0) setActiveLayer(1);
        if (diffY < -minSwipeDistance && activeLayer === 1) setActiveLayer(0);
      }
    }
    setTouchStartX(null); setTouchEndX(null); setTouchStartY(null); setTouchEndY(null);
  };

  if (isCheckingAuth) return null;

  const currentReply = replies[currentReplyIndex];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      <div className="relative w-full max-w-[380px] aspect-[1/1.48] perspective-1000 overflow-visible" onClick={e => e.stopPropagation()}>
        
        <div 
          className={`absolute inset-0 bg-white shadow-2xl flex flex-col px-6 py-4 rounded-sm transition-all duration-500 ease-out ${activeLayer === 0 ? 'z-30 translate-y-0 scale-100' : 'z-10 -translate-y-[85%] scale-[0.92] opacity-60 blur-[0.5px]'}`}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          {isRainy && <div className="absolute inset-0 z-40 pointer-events-none rainy-overlay"></div>}

          <div className="flex justify-center items-center shrink-0 relative h-10 mb-2">
            {!isLocked && !isMyPost && activeLayer === 0 && !hideFavorite && (
              <div className="absolute left-0 z-[45]">
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} className={`flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-full border shadow-sm transition-all active:scale-95 ${isFavorited ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{isFavorited ? '♥' : '♡'} お気に入り</button>
              </div>
            )}
            <button onClick={handleClose} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600 z-[45]"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>

          <div className={`flex-1 relative flex flex-col overflow-hidden mt-2 ${isRainy ? 'rainy-text-container' : ''}`} onClick={() => (activeLayer === 0 && mode === 'read' && pages.length > 1) && handleNext()}>
            {isLocked ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4" onClick={e => e.stopPropagation()}>
                <div className="text-4xl">🔒</div>
                <input type="text" value={inputPassword} onChange={e => setInputPassword(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-center font-serif text-sm outline-none" placeholder="合言葉" />
                <button onClick={handleUnlock} className="w-full bg-[#8a776a] text-white font-bold py-2 rounded shadow text-sm active:scale-95">開ける</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6 shrink-0 pointer-events-none min-h-[3rem]">
                  <h2 className={`text-lg font-bold font-serif text-[#8a776a] flex-1 leading-relaxed pr-4 ${isRainy ? 'blur-[0.3px]' : ''}`}>{letter.title}</h2>
                  <p className="text-[10px] text-gray-400 font-sans tracking-widest shrink-0 mt-1 italic">{nickname ? `${nickname} より` : ''}</p>
                </div>
                <div key={currentPage} className="flex-1 overflow-hidden animate-pageTurn">
                  <div className="w-full h-full text-[14px] font-serif tracking-[0.2em] [writing-mode:vertical-rl] [text-orientation:mixed] whitespace-pre-wrap text-[#5d4037] modal-html-content" style={{ lineHeight: '2.5rem', backgroundImage: 'linear-gradient(to left, transparent calc(100% - 1px), #f0f4f5 1px)', backgroundSize: '2.5rem 100%', backgroundPosition: 'right top', fontFeatureSettings: '"vpal" 1' }} dangerouslySetInnerHTML={{ __html: letter.content.split('<<<PAGE>>>')[currentPage] || pages[currentPage]?.content || '' }} />
                </div>
              </>
            )}
          </div>

          <div className="h-16 flex items-center justify-between shrink-0 font-sans mt-auto z-[45]">
            {!isLocked && activeLayer === 0 && (
              <>
                <div className="flex items-center gap-2">
                  {currentPage === pages.length - 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleFinish(); }} className="bg-stone-500 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-md active:scale-95 tracking-widest">読み終わる</button>
                      {letter.allow_reply && !isMyPost && replies.length === 0 && !hideReply && (
                        <button onClick={handleReplyClick} className="bg-orange-500 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-md active:scale-95 tracking-widest">返事を書く</button>
                      )}
                    </>
                  )}
                  {isMyPost && <button onClick={(e) => { e.stopPropagation(); handleDeleteParent(); }} className="bg-pink-50 text-pink-500 text-[10px] px-4 py-2 rounded-full font-bold border border-pink-100 shadow-sm active:scale-95">削除</button>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-4">
                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className={`text-xs font-bold ${(pages.length > 1) ? 'text-[#8a776a]' : 'text-gray-200 pointer-events-none'}`}>← 次へ</button>
                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className={`text-xs font-bold ${currentPage > 0 ? 'text-[#8a776a]' : 'text-gray-200 pointer-events-none'}`}>前へ →</button>
                  </div>
                  <span className="text-[9px] text-gray-300 font-serif font-bold">{currentPage + 1} / {pages.length}</span>
                </div>
              </>
            )}
          </div>
          {replies.length > 0 && activeLayer === 0 && mode === 'read' && (
            <div className="absolute bottom-[-31px] left-1/2 -translate-x-1/2 w-[55%] flex justify-center z-[45]" onClick={() => setActiveLayer(1)}>
              <div className="bg-[#fdfcf5] w-full h-8 shadow-xl border-[#5d4037]/10 flex justify-center items-center cursor-pointer animate-bounce-soft rounded-b-md">
                <span className="inline-flex items-center gap-1 text-[9px] text-[#8a776a] font-serif tracking-[0.4em] opacity-80 pl-[0.4em]">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="h-3 w-3"><path d="M19 9l-7 7-7-7" /></svg>
                  {isMyPost ? `${replies.length}通の返事` : '返事の手紙'}
                </span>
              </div>
            </div>
          )}
        </div>

        {mode === 'write' && (
          <div className="absolute inset-0 bg-[#fdfcf5] shadow-2xl flex flex-col px-6 py-4 rounded-sm z-50 animate-slideUp">
             {isRainy && <div className="absolute inset-0 z-[55] pointer-events-none rainy-overlay"></div>}
            <div className="flex justify-between items-center h-10 mb-4 shrink-0 z-[60]">
              <span className="text-[10px] font-bold text-orange-600 tracking-widest font-serif uppercase">Write Reply</span>
              <button onClick={() => setMode('read')} className="text-[10px] text-gray-400 font-bold hover:text-gray-600">✕ 戻る</button>
            </div>
            <textarea autoFocus value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="ここにメッセージを入力してください..." className={`flex-1 w-full bg-transparent border-none focus:ring-0 text-[12px] font-serif leading-relaxed text-[#5d4037] resize-none z-[60] ${isRainy ? 'blur-[0.4px]' : ''}`} />
            <div className="h-16 flex items-center justify-end z-[60]">
              <button onClick={submitReply} disabled={isSubmitting} className="bg-orange-600 text-white px-8 py-2.5 rounded-full text-[10px] font-bold shadow-lg active:scale-95 disabled:bg-gray-300">お返事を出す</button>
            </div>
          </div>
        )}

        {replies.length > 0 && mode === 'read' && (
          <div 
            className={`absolute inset-0 bg-[#fdfcf5] shadow-2xl flex flex-col px-6 py-4 rounded-sm transition-all duration-500 ease-out border border-[#5d4037]/5 ${activeLayer === 1 ? 'z-40 translate-y-0 scale-[0.96]' : 'z-10 translate-y-[96%] opacity-0 pointer-events-none'}`}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          >
            {isRainy && <div className="absolute inset-0 z-[45] pointer-events-none rainy-overlay"></div>}
            <div className="flex justify-between items-center h-10 mb-4 shrink-0 z-[46]">
              <button onClick={(e) => { e.stopPropagation(); setActiveLayer(0); }} className="text-[10px] text-orange-600 font-bold hover:underline underline-offset-4 font-serif flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 15l7-7 7 7" /></svg>
                手紙に戻る
              </button>
              <button onClick={handleClose} className="text-[10px] text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className={`flex-1 bg-white/60 p-[calc(var(--spacing)*6.6)] rounded border border-orange-50 overflow-hidden mb-2 relative z-[46] ${isRainy ? 'rainy-text-container' : ''}`}>
               <div className="w-full h-full text-[14px] font-serif tracking-[0.2em] [writing-mode:vertical-rl] [text-orientation:mixed] whitespace-pre-wrap text-[#5d4037]" style={{ lineHeight: '2.5rem', backgroundImage: 'linear-gradient(to left, transparent calc(100% - 1px), #f7f3f0 1px)', backgroundSize: '2.5rem 100%', fontFeatureSettings: '"vpal" 1' }}>
                  {currentReply?.content}
               </div>
               <div className="absolute bottom-4 left-4 [writing-mode:vertical-rl] text-[10px] text-[#8a776a] font-serif tracking-widest italic opacity-80">
                  {currentReply?.nickname || '名無し'} より
               </div>
            </div>
            {activeLayer === 1 && replies.length > 1 && (
              <div className="flex justify-center items-center gap-6 py-2 bg-white/30 rounded-md shrink-0 z-[46]">
                 <button onClick={(e) => { e.stopPropagation(); if(currentReplyIndex > 0) setCurrentReplyIndex(currentReplyIndex - 1); }} className={`text-[10px] font-bold ${currentReplyIndex > 0 ? 'text-orange-600' : 'text-gray-200'}`}>← 前へ</button>
                 <span className="text-[9px] font-serif text-gray-400">{currentReplyIndex + 1} / {replies.length}</span>
                 <button onClick={(e) => { e.stopPropagation(); if(currentReplyIndex < replies.length - 1) setCurrentReplyIndex(currentReplyIndex + 1); }} className={`text-[10px] font-bold ${currentReplyIndex < replies.length - 1 ? 'text-orange-600' : 'text-gray-200'}`}>次へ →</button>
              </div>
            )}
            {activeLayer === 1 && (
              <div className="h-28 flex flex-col items-center justify-center gap-3 shrink-0 z-[46]">
                 <p className="text-[8px] text-[#8a776a] font-serif opacity-70 tracking-widest">
                    {isMyPost ? 'あなただけに届いた特別な言葉です' : '返事の手紙はあなたにだけ表示されています'}
                 </p>
                 <button onClick={handleClose} className="bg-stone-600 text-white px-14 py-2 rounded-full text-[10px] font-bold shadow-md active:scale-95 tracking-widest">閉じる</button>
                 {!isMyPost && (
                    <button onClick={handleDeleteReply} className="text-[9px] text-red-400 hover:text-red-500 underline underline-offset-4 opacity-70">削除する</button>
                 )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{` 
        .animate-pageTurn { animation: pageTurn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; } 
        @keyframes pageTurn { 0% { transform: translateX(30px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } } 
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
        @keyframes bounceSoft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-bounce-soft { animation: bounceSoft 2s infinite ease-in-out; }
        .perspective-1000 { perspective: 1000px; }
        .modal-html-content a { color: #2563eb !important; text-decoration: underline !important; pointer-events: auto !important; }
        .rainy-overlay { background: radial-gradient(circle at 25% 30%, rgba(180, 200, 255, 0.08) 0%, transparent 45%), radial-gradient(circle at 75% 65%, rgba(180, 200, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 45% 85%, rgba(180, 200, 255, 0.07) 0%, transparent 35%); backdrop-filter: grayscale(0.1) brightness(0.98); }
        .rainy-text-container { mask-image: radial-gradient(circle at 35% 45%, black 0%, rgba(0,0,0,0.6) 40%, black 90%); filter: blur(0.45px) contrast(0.95); }
      `}</style>
    </div>
  );
}

export default function LetterModal(props: Props) {
  return (
    <Suspense fallback={null}>
      <LetterModalContent {...props} />
    </Suspense>
  );
}