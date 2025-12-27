'use client';
import { useState, useEffect } from 'react';
// 共通クライアントを使用してセッション不整合を解消
import { supabase } from '@/utils/supabase'; 
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
// Next.jsの画像最適化コンポーネント
import Image from 'next/image';

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

export default function PostcardModal({ letter, currentUser, onClose, onDeleted, onRead }: Props) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(!!letter.password); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const isMyPost = currentUser && currentUser.id === letter.user_id;

  // 認証状態と既読情報の初期化
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

  // 既読記録ロジック
  const recordRead = async () => {
    if (currentUser && currentUser.id === letter.user_id) return;
    
    const { error } = await supabase.from('letter_reads').insert({
      letter_id: letter.id,
      user_id: currentUser?.id || null,
    });

    if (!error && onRead) onRead(letter.id);
  };

  // パスワード解除
  const handleUnlock = () => {
    if (inputPassword === letter.password) {
      setIsLocked(false);
      setUnlockError(false);
      recordRead(); 
    } else {
      setUnlockError(true);
    }
  };

  // お気に入りチェック
  const checkFavorite = async () => {
    if (!currentUser || !letter.id) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', currentUser.id).eq('letter_id', letter.id).maybeSingle();
    if (data) setIsFavorited(true);
  };

  // お気に入り切り替え
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

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (!error) { handleClose(); if (onDeleted) onDeleted(); }
  };

  if (isCheckingAuth) return null;

  // 消印用日付・時刻取得
  const postDate = new Date(letter.created_at || Date.now());
  const yy = postDate.getFullYear().toString().slice(-2);
  const mm = (postDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = postDate.getDate().toString().padStart(2, '0');
  const hh = postDate.getHours().toString().padStart(2, '0');
  const min = postDate.getMinutes().toString().padStart(2, '0');

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      <div 
        className={`relative w-full max-w-[380px] aspect-[1/1.48] transition-all duration-700 font-sans preserve-3d ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        style={{ perspective: '1500px' }}
      >
        
        {/* --- 表面 (文字面) --- */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden bg-white shadow-2xl flex flex-col px-6 py-4 rounded-sm cursor-pointer z-20"
          onClick={() => !isLocked && letter.image_url && setIsFlipped(!isFlipped)}
        >
          
          {/* ★ 切手・消印エリア（修正後：ReferenceError回避のためisPostcardチェックを削除） */}
          {!isLocked && (
            <div 
              className="absolute pointer-events-none z-30" 
              style={{ left: 'calc(var(--spacing) * 3)', top: 'calc(var(--spacing) * 3)', width: '72px', height: '90px' }}
            >
               <div className="relative w-full h-full">
                 <Image src="/postcard__stamp.png" fill className="object-contain" alt="stamp" priority />
                 {/* 消印：おきてがみ 日付 時間 3段構成 */}
                 <div className="absolute left-6 top-10 w-16 h-16 border-2 border-black/20 rounded-full flex items-center justify-center flex-col rotate-12 mix-blend-multiply">
                    <span className="text-[8px] text-black/20 font-bold uppercase tracking-[0.15em] leading-tight font-sans">おきてがみ</span>
                    <div className="w-full border-t border-black/20 my-0.5" />
                    <span className="text-[10px] text-black/20 font-bold tracking-[0.1em] leading-tight font-sans">{yy}.{mm}.{dd}</span>
                    <div className="w-full border-t border-black/20 my-0.5" />
                    <span className="text-[6px] text-black/20 font-bold tracking-[0.2em] leading-tight font-sans">{hh}:{min}</span>
                 </div>
               </div>
            </div>
          )}

          <div className="flex justify-center items-center shrink-0 relative h-10 mb-2">
            <span className="text-sm font-bold tracking-[0.4em] ml-[0.4em] text-[#8a776a] font-sans">POST CARD</span>
            <button onClick={e => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 本文エリア */}
          <div className="flex-1 relative flex flex-row-reverse items-start overflow-hidden mt-2">
            {isLocked ? (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-4" onClick={e => e.stopPropagation()}>
                <div className="text-4xl">🔒</div>
                <input type="text" value={inputPassword} onChange={e => setInputPassword(e.target.value)} className="w-full border border-gray-200 rounded p-2 text-center font-serif text-sm outline-none" placeholder="合言葉" />
                <button onClick={handleUnlock} className="w-full bg-[#8a776a] text-white font-bold py-2 rounded shadow text-sm transition-all active:scale-95">開ける</button>
                {unlockError && <p className="text-red-400 text-[10px]">合言葉が違います</p>}
              </div>
            ) : (
              <>
                <div className="w-12 shrink-0 flex items-start justify-center pt-12 pb-4">
                   <h3 className="font-bold text-[#8a776a] font-serif [writing-mode:vertical-rl] tracking-widest text-base leading-none">{letter.title}</h3>
                </div>
                <div className="flex-1 h-full flex flex-col justify-start pt-12 pb-4">
                   <p className="text-sm md:text-base leading-[2.2] font-serif tracking-[0.15em] [writing-mode:vertical-rl] whitespace-pre-wrap text-[#5d4037] h-full overflow-hidden">
                     {letter.content}
                   </p>
                </div>
              </>
            )}
          </div>

          <div className="h-16 flex items-center justify-between shrink-0 mt-auto">
            {!isLocked && (
              <>
                <div className="w-24">
                  {/* 左下のボタンは削除して右下へ移動 */}
                </div>
                <div className="flex-1 flex justify-center items-center">
                  <span className="text-[10px] text-gray-400 tracking-widest font-bold animate-pulse">タップで裏返す</span>
                </div>
                <div className="w-24 flex justify-end">
                   {/* ★ 修正：自分の投稿なら削除ボタンを表示、他人の投稿ならお気に入りボタンを表示 */}
                   {isMyPost ? (
                     <button 
                       onClick={e => { e.stopPropagation(); handleDelete(); }} 
                       className="bg-pink-50 text-pink-500 text-[10px] px-4 py-2 rounded-full font-bold border border-pink-100 shadow-sm transition-all hover:bg-pink-100 active:scale-95"
                     >
                       削除
                     </button>
                   ) : (
                     <button 
                       onClick={e => { e.stopPropagation(); toggleFavorite(); }} 
                       className={`flex items-center gap-1 text-[10px] font-bold py-1.5 px-3 rounded-full border shadow-sm transition-all active:scale-95 ${isFavorited ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-pink-300'}`}
                     >
                       {isFavorited ? '♥' : '♡'} お気に入り
                     </button>
                   )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- 裏面 (ハガキ写真面：全面表示) --- */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-black shadow-2xl flex flex-col rounded-sm overflow-hidden cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {letter.image_url ? (
            <>
              <Image src={letter.image_url} fill className="object-cover" alt="photo" priority />
              {/* 明るい写真対策：上下のシャドウグラデーション */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />
              
              <div className="absolute top-4 inset-x-6 flex justify-center items-center z-20 h-10">
                <span className="text-white text-sm font-bold tracking-[0.4em] ml-[0.4em] drop-shadow-md">POST CARD</span>
                <button onClick={e => { e.stopPropagation(); handleClose(); }} className="absolute right-0 p-1 text-white hover:text-white/80">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* 中央にガイドを表示 */}
              <div className="absolute bottom-6 inset-x-6 flex flex-col items-center justify-center z-20">
                <p className="text-white text-[11px] font-bold tracking-[0.5em] ml-[0.5em] mb-3 uppercase drop-shadow-md">
                  {letter.spot_name}
                </p>
                <span className="text-white/90 text-[10px] font-bold tracking-widest drop-shadow-md">
                  タップで裏返す
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-sm">写真がありません</div>
          )}
        </div>
      </div>
      <style jsx global>{` 
        .preserve-3d { transform-style: preserve-3d; } 
        .backface-hidden { 
          backface-visibility: hidden; 
          -webkit-backface-visibility: hidden; 
        } 
      `}</style>
    </div>
  );
}