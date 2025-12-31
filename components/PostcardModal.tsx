'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
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

// 返信用データの型
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
  onDeleted?: () => void;
  onRead?: (id: string) => void;
  initialLayer?: number;
  isRainy?: boolean;
  hideReply?: boolean;    // マイページ用：返信ボタンを隠す
  hideFavorite?: boolean; // マイページ用：お気に入りボタンを隠す
};

function PostcardModalContent({ 
  letter, currentUser, onClose, onDeleted, onRead, initialLayer = 0, isRainy = false,
  hideReply = false, hideFavorite = false 
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(!!letter.password); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);

  // 返信・地層管理
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [activeLayer, setActiveLayer] = useState(initialLayer); 
  const [replies, setReplies] = useState<ReplyLetter[]>([]); 
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0); 
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMyPost = currentUser && currentUser.id === letter.user_id;

  // ログイン後の復帰処理
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
      
      if (letter.user_id && !letter.is_official) {
        const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', letter.user_id).maybeSingle();
        if (profile) setNickname(profile.nickname);
      }
      if (currentUser) {
        const { data: myProfile } = await supabase.from('profiles').select('nickname').eq('id', currentUser.id).maybeSingle();
        if (myProfile) setMyNickname(myProfile.nickname);
      }

      if (isMyPost) {
        setIsLocked(false);
      } else if (currentUser && letter.password) {
        const { data } = await supabase.from('letter_reads').select('id').eq('letter_id', letter.id).eq('user_id', currentUser.id).limit(1);
        setIsLocked(!(data && data.length > 0));
      } else if (!currentUser && letter.password) {
        const storedReads = localStorage.getItem('read_letter_ids');
        setIsLocked(!storedReads || !JSON.parse(storedReads).includes(letter.id));
      } else if (!letter.password) {
        setIsLocked(false);
        recordRead(); 
      }
      
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

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };
  
  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (confirm('返信を書くにはログインが必要です。ログイン画面へ移動しますか？')) {
        const nextUrl = `/?open_post=${letter.id}&trigger_reply=true`;
        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
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
        is_official: false,
        is_postcard: true
      }).select('id, content, created_at, user_id').single();

      if (error) throw error;
      const newReply = { ...data, nickname: myNickname };
      setReplies([newReply as any, ...replies]);
      setMode('read');
      setActiveLayer(0); 
    } catch (e) {
      alert('送信に失敗しました');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteReply = async () => {
    const currentReply = replies[currentReplyIndex];
    if (!currentReply || !confirm('この返事を削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', currentReply.id);
    if (!error) {
      const newReplies = replies.filter((_, i) => i !== currentReplyIndex);
      setReplies(newReplies);
      setCurrentReplyIndex(0);
      // 返信タブで最後の返信を消した場合、一覧に戻すための連動
      if (newReplies.length === 0) {
        onDeleted?.();
        handleClose();
      }
    }
  };

  const handleDeleteParent = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (!error) { handleClose(); onDeleted?.(); }
  };

  if (isCheckingAuth) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      yy: d.getFullYear().toString().slice(-2),
      mm: (d.getMonth() + 1).toString().padStart(2, '0'),
      dd: d.getDate().toString().padStart(2, '0')
    };
  };

  const origDate = formatDate(letter.created_at || new Date().toISOString());
  const currentReply = replies[currentReplyIndex];
  const rDate = currentReply ? formatDate(currentReply.created_at) : null;
  const hasReply = replies.length > 0;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      <div className="relative w-full max-w-[380px] aspect-[1/1.48] perspective-1000 overflow-visible" onClick={e => e.stopPropagation()}>
        
        {/* レイヤー0：元のハガキ */}
        <div 
          className={`absolute inset-0 w-full h-full transition-all duration-500 ease-out preserve-3d shadow-2xl ${isFlipped ? '[transform:rotateY(180deg)]' : ''} ${activeLayer === 1 ? 'z-10 translate-x-12 -translate-y-10 rotate-[4deg] scale-[0.96] opacity-60 blur-[1px] cursor-pointer' : 'z-30 translate-x-0 translate-y-0 rotate-0 scale-100 pointer-events-auto'}`}
          onClick={() => { if(activeLayer === 1) setActiveLayer(0); }}
        >
          {/* --- 表面 (文字面) --- */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white flex flex-col px-6 py-4 rounded-sm" onClick={() => { if(activeLayer === 0 && !isLocked && letter.image_url) setIsFlipped(!isFlipped) }}>
            
            {/* ★ 雨の日の濡れシミ */}
            {isRainy && <div className="absolute inset-0 z-[35] pointer-events-none rainy-overlay"></div>}

            {!isLocked && (
              <div className="absolute pointer-events-none z-30" style={{ left: '12px', top: '12px', width: '72px', height: '90px' }}>
                 <div className="relative w-full h-full">
                   <Image src={letter.is_official ? "/Postcard_Admin.png" : "/PostcardStamp.png"} fill sizes="72px" className="object-contain" alt="stamp" priority />
                   <div className="absolute left-6 top-14 w-16 h-16 border-2 border-[#5d4037]/10 rounded-full flex items-center justify-center flex-col rotate-12 mix-blend-multiply opacity-60">
                      <span className="text-[8px] text-black/20 font-bold uppercase tracking-[0.15em] font-sans">おきてがみ</span>
                      <div className="w-full border-t border-black/20 my-0.5" />
                      <span className="text-[10px] text-black/20 font-bold font-sans">{origDate.yy}.{origDate.mm}.{origDate.dd}</span>
                   </div>
                 </div>
              </div>
            )}

            <div className="flex justify-center items-center shrink-0 relative h-10 mb-2">
              <span className="text-sm font-bold tracking-[0.4em] ml-[0.4em] text-[#8a776a] font-sans uppercase">POST CARD</span>
              {activeLayer === 0 && (
                <button onClick={e => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600 z-[45]"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              )}
            </div>

            <div className={`flex-1 relative flex flex-row-reverse items-start overflow-hidden mt-2 ${isRainy ? 'rainy-text-container' : ''}`}>
              {isLocked ? (
                <div className="flex flex-col items-center justify-center w-full h-full space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="text-4xl">🔒</div>
                  <input type="text" value={inputPassword} onChange={e => setInputPassword(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-center font-serif text-sm outline-none" placeholder="合言葉" />
                  <button onClick={handleUnlock} className="w-full bg-[#8a776a] text-white font-bold py-2 rounded shadow text-sm active:scale-95">開ける</button>
                </div>
              ) : (
                <>
                  <div className="w-12 shrink-0 flex items-start justify-center pt-12 pb-4">
                     <h3 className={`font-bold text-[#8a776a] font-serif [writing-mode:vertical-rl] tracking-widest text-base leading-none ${isRainy ? 'blur-[0.3px]' : ''}`}>{letter.title}</h3>
                  </div>
                  <div className="flex-1 h-full flex flex-col justify-start pt-12 pb-4">
                     <div className="text-sm md:text-base leading-[2.2] font-serif tracking-[0.15em] [writing-mode:vertical-rl] [text-orientation:mixed] whitespace-pre-wrap text-[#5d4037] h-full overflow-hidden modal-html-content" style={{ fontFeatureSettings: '"vpal" 1' }} dangerouslySetInnerHTML={{ __html: letter.content }} />
                  </div>
                  <div className="w-10 h-full flex flex-col justify-end items-center pb-4 shrink-0">
                     <span className="text-[10px] text-[#8a776a] font-serif [writing-mode:vertical-rl] tracking-widest opacity-80 whitespace-nowrap">
                       {letter.is_official ? '木林文庫 より' : (nickname ? `${nickname} より` : '')}
                     </span>
                  </div>
                </>
              )}
            </div>

            <div className="h-10 flex items-center justify-between shrink-0 mt-auto z-[45]">
              {!isLocked && activeLayer === 0 && (
                <>
                  {/* ★ 左側：固定幅28にして右側のボタン幅とバランスをとる */}
                  <div className="w-28 flex items-center gap-2">
                     {letter.allow_reply && !isMyPost && !hasReply && !hideReply && (
                       <button onClick={handleReplyClick} className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-md active:scale-95 tracking-widest whitespace-nowrap">返事を書く</button>
                     )}
                     {isMyPost && (
                       <button onClick={e => { e.stopPropagation(); handleDeleteParent(); }} className="bg-pink-50 text-pink-500 text-[10px] px-4 py-1.5 rounded-full font-bold border border-pink-100 shadow-sm active:scale-95">削除</button>
                     )}
                  </div>
                  
                  {/* ★ 中央：flex-1にしてテキストを完全に中央へ */}
                  <div className="flex-1 flex justify-center items-center">
                    <span className="text-[10px] text-gray-300 tracking-widest font-bold animate-pulse whitespace-nowrap">タップで裏返す</span>
                  </div>
                  
                  {/* ★ 右側：固定幅28にして左側とバランスをとる */}
                  <div className="w-28 flex justify-end">
                     {!isMyPost && !hideFavorite && (
                       <button onClick={e => { e.stopPropagation(); toggleFavorite(); }} className={`flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-full border shadow-sm transition-all active:scale-95 ${isFavorited ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-pink-300'}`}>
                         {isFavorited ? '♥' : '♡'} お気に入り
                       </button>
                     )}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* --- 裏面 (写真面) --- */}
          <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-black flex flex-col rounded-sm overflow-hidden" onClick={() => { if(activeLayer === 0) setIsFlipped(!isFlipped); }}>
            {/* ★ 雨の日の彩度低下（写真面） */}
            {isRainy && <div className="absolute inset-0 z-[15] pointer-events-none bg-[#1a3a5a]/10 backdrop-grayscale-[0.2]"></div>}
            {letter.image_url ? (
              <><Image src={letter.image_url} fill sizes="380px" className={`object-cover ${isRainy ? 'saturate-[0.7] brightness-[0.9]' : ''}`} alt="photo" priority /><div className="absolute top-4 inset-x-6 flex justify-center items-center z-20 h-10"><span className="text-white text-sm font-bold tracking-[0.4em] ml-[0.4em] drop-shadow-md">POST CARD</span></div><div className="absolute bottom-6 inset-x-6 flex flex-col items-center justify-center z-20"><p className="text-white text-[11px] font-bold tracking-[0.5em] mb-3 uppercase drop-shadow-md">{letter.spot_name}</p></div></>
            ) : (<div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-sm">写真がありません</div>)}
          </div>
        </div>

        {/* 返信入力 */}
        {mode === 'write' && (
          <div className="absolute inset-0 bg-[#fefdfa] shadow-2xl flex flex-col px-6 py-4 rounded-sm z-50 border-t-4 border-orange-200 animate-slideUp">
             {isRainy && <div className="absolute inset-0 z-[55] pointer-events-none rainy-overlay"></div>}
            <div className="flex justify-between items-center h-10 mb-4 shrink-0 z-[60]"><span className="text-[10px] font-bold text-orange-600 tracking-widest font-serif uppercase">Write Reply</span><button onClick={() => setMode('read')} className="text-[10px] text-gray-400 font-bold hover:text-gray-600">✕ 戻る</button></div>
            <textarea autoFocus value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="思い出に言葉を添えてください..." className={`flex-1 w-full bg-transparent border-none focus:ring-0 text-[12px] font-serif leading-relaxed text-[#5d4037] resize-none z-[60] ${isRainy ? 'blur-[0.4px]' : ''}`} />
            <div className="h-16 flex items-center justify-end z-[60]"><button onClick={submitReply} disabled={isSubmitting} className="bg-orange-600 text-white px-8 py-2 rounded-full text-[10px] font-bold shadow-lg active:scale-95 disabled:bg-gray-300">お返事を出す</button></div>
          </div>
        )}

        {/* レイヤー1：返信ハガキ */}
        {hasReply && mode === 'read' && (
          <div 
            className={`absolute inset-0 bg-[#fefdfa] flex flex-col px-6 py-4 rounded-sm transition-all duration-500 ease-out border border-[#5d4037]/10 ${activeLayer === 1 ? 'z-40 translate-x-0 translate-y-0 rotate-0 scale-100 pointer-events-auto shadow-2xl' : 'z-20 translate-x-14 -translate-y-12 rotate-[5deg] scale-[0.96] opacity-100 cursor-pointer hover:translate-x-16'}`}
            onClick={() => { if(activeLayer === 0) setActiveLayer(1); else setActiveLayer(0); }}
          >
            {isRainy && <div className="absolute inset-0 z-[41] pointer-events-none rainy-overlay"></div>}

            {isMyPost && replies.length > 1 && activeLayer === 0 && (
              <><div className="absolute inset-0 bg-[#fefdfa] border border-[#5d4037]/10 rounded-sm translate-x-2 -translate-y-2 -rotate-[2deg] -z-10 opacity-80" /><div className="absolute inset-0 bg-[#fefdfa] border border-[#5d4037]/10 rounded-sm translate-x-4 -translate-y-4 -rotate-[4deg] -z-20 opacity-60" /></>
            )}

            <div className="absolute pointer-events-none z-30" style={{ left: '12px', top: '12px', width: '72px', height: '90px' }}>
               <div className="relative w-full h-full">
                 <Image src="/postcard__stamp__replay.png" fill sizes="72px" className="object-contain" alt="stamp" priority />
                 <div className="absolute left-6 top-14 w-16 h-16 border-2 border-orange-600/10 rounded-full flex items-center justify-center flex-col rotate-12 mix-blend-multiply opacity-40">
                    <span className="text-[7px] font-bold font-sans text-orange-900 tracking-widest uppercase">Reply</span>
                    <div className="w-full border-t border-orange-600/20 my-0.5" />
                    <span className="text-[9px] font-bold font-sans text-orange-900">{rDate?.yy}.{rDate?.mm}.{rDate?.dd}</span>
                 </div>
               </div>
            </div>

            <div className="flex justify-center items-center shrink-0 relative h-10 mb-4 z-[45]">
              <span className="text-sm font-bold tracking-[0.4em] ml-[0.4em] text-orange-600/60 font-sans uppercase">Post Card</span>
              {activeLayer === 1 && (
                <button onClick={e => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600 z-[45]"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              )}
            </div>

            <div className={`flex-1 relative flex flex-row-reverse items-start overflow-hidden mt-2 ${isRainy ? 'rainy-text-container' : ''}`}>
               <div className="w-12 shrink-0 flex items-start justify-center pt-12 pb-4">
                  <h3 className={`font-bold text-orange-800/40 font-serif [writing-mode:vertical-rl] tracking-widest text-sm leading-none opacity-60 italic ${isRainy ? 'blur-[0.3px]' : ''}`}>Re: {letter.title}</h3>
               </div>
               <div className="flex-1 h-full flex flex-col justify-start pt-12 pb-4">
                  <div className="text-[14px] font-serif tracking-[0.2em] [writing-mode:vertical-rl] [text-orientation:mixed] whitespace-pre-wrap text-[#5d4037] h-full overflow-hidden" style={{ fontFeatureSettings: '"vpal" 1' }}>
                     {currentReply?.content}
                  </div>
               </div>
               <div className="w-10 h-full flex flex-col justify-end items-center pb-4 shrink-0">
                  <span className="text-[10px] text-[#8a776a] font-serif [writing-mode:vertical-rl] tracking-widest italic opacity-80 whitespace-nowrap">
                     {currentReply?.nickname || '名無し'} より
                  </span>
               </div>
            </div>

            {activeLayer === 1 && replies.length > 1 && (
              <div className="flex justify-center items-center gap-6 py-2 border-t border-orange-50 bg-white/50 z-[45]">
                 <button onClick={(e) => { e.stopPropagation(); if(currentReplyIndex > 0) setCurrentReplyIndex(currentReplyIndex - 1); }} className={`text-[10px] font-bold ${currentReplyIndex > 0 ? 'text-orange-600' : 'text-gray-200'}`}>← 前へ</button>
                 <span className="text-[9px] font-serif text-gray-400">{currentReplyIndex + 1} / {replies.length}</span>
                 <button onClick={(e) => { e.stopPropagation(); if(currentReplyIndex < replies.length - 1) setCurrentReplyIndex(currentReplyIndex + 1); }} className={`text-[10px] font-bold ${currentReplyIndex < replies.length - 1 ? 'text-orange-600' : 'text-gray-200'}`}>次へ →</button>
              </div>
            )}

            {activeLayer === 0 && (
              <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 bg-orange-500 px-4 py-1 rounded-t-md shadow-sm animate-pulse">
                <span className="text-[8px] text-white font-bold tracking-widest uppercase">
                  {isMyPost ? `${replies.length}通の返事` : 'My Reply'}
                </span>
              </div>
            )}

            {activeLayer === 1 && (
              <div className="h-28 flex flex-col items-center justify-center gap-3 shrink-0 z-[45]">
                 <p className="text-[8px] text-[#8a776a] font-serif opacity-70 tracking-widest">
                   {isMyPost ? 'あなただけに届いた特別な言葉です' : '返事の葉書はあなたにだけ表示されています'}
                 </p>
                 <div className="flex flex-col items-center gap-2">
                    <button onClick={handleClose} className="bg-stone-600 text-white px-10 py-2 rounded-full text-[10px] font-bold shadow-md active:scale-95 tracking-widest">閉じる</button>
                    {!isMyPost && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteReply(); }} className="text-[9px] text-red-400 underline opacity-70 hover:opacity-100">この返事を削除する</button>
                    )}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{` 
        .preserve-3d { transform-style: preserve-3d; } 
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; } 
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
        .modal-html-content a { color: #2563eb !important; text-decoration: underline !important; }
        
        /* 雨の日のマイルドな濡れシミ表現 */
        .rainy-overlay {
          background: 
            radial-gradient(circle at 25% 30%, rgba(180, 200, 255, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 75% 65%, rgba(180, 200, 255, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 45% 85%, rgba(180, 200, 255, 0.07) 0%, transparent 35%);
          backdrop-filter: grayscale(0.1) brightness(0.98);
        }
        .rainy-text-container {
          mask-image: radial-gradient(circle at 35% 45%, black 0%, rgba(0,0,0,0.6) 40%, black 90%);
          -webkit-mask-image: radial-gradient(circle at 35% 45%, black 0%, rgba(0,0,0,0.6) 40%, black 90%);
          filter: blur(0.45px) contrast(0.95);
        }
      `}</style>
    </div>
  );
}

export default function PostcardModal(props: Props) {
  return (
    <Suspense fallback={null}>
      <PostcardModalContent {...props} />
    </Suspense>
  );
}