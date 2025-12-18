'use client';
import { useState, useEffect } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import Link from 'next/link';
import IconUserLetter from './IconUserLetter';
import IconAdminLetter from './IconAdminLetter';

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
};

type Props = {
  letter: Letter;
  currentUser: User | null;
  onClose: () => void;
  onDeleted?: () => void;
};

const CHARS_PER_PAGE = 180; 

export default function LetterModal({ letter, currentUser, onClose, onDeleted }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  
  const [isLocked, setIsLocked] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  const [currentPage, setCurrentPage] = useState(0); 
  const [pages, setPages] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);

  // 切手演出用のState
  const [gotStamp, setGotStamp] = useState<any>(null);

  const isMyPost = currentUser && currentUser.id === letter.user_id;

  // 初期化 & ロック判定
  useEffect(() => {
    setIsVisible(true);
    
    // ロック判定
    if (letter.password && !isMyPost) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
      // ロックがない場合はすぐに切手チェック & 既読記録
      checkStamp();
      recordRead(); // ★ここで既読をつける
    }

    checkFavorite();
  }, [letter, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★既読をつける関数（ロック解除時にも呼ぶため関数化）
  const recordRead = async () => {
    // 自分の手紙を開いた場合はカウントしない
    if (currentUser && currentUser.id === letter.user_id) return;

    // 記録を追加
    await supabase.from('letter_reads').insert({
      letter_id: letter.id,
      user_id: currentUser?.id || null,
    });
  };

  // 切手取得ロジック
  const checkStamp = async () => {
    if (currentUser && letter.attached_stamp_id && !isMyPost) {
      try {
        const { error } = await supabase.from('user_stamps').insert({
          user_id: currentUser.id,
          stamp_id: letter.attached_stamp_id
        });

        if (!error) {
          const { data: stampData } = await supabase
            .from('stamps')
            .select('*')
            .eq('id', letter.attached_stamp_id)
            .single();
          
          if (stampData) {
            setGotStamp(stampData);
          }
        }
      } catch (e) {
        // 重複エラーは無視
      }
    }
  };

  const handleUnlock = () => {
    if (inputPassword === letter.password) {
      setIsLocked(false);
      setUnlockError(false);
      // ロック解除成功時に切手チェック & 既読記録
      checkStamp();
      recordRead(); // ★ロック解除成功で既読をつける
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

  // 区切り文字の定義（投稿画面と同じにする）
  const PAGE_DELIMITER = '<<<PAGE>>>';

  useEffect(() => {
    const newPages = [];
    
    // 1ページ目：画像があれば画像
    if (letter.image_url) {
      newPages.push({ type: 'image', content: letter.image_url });
    }

    if (!letter.content) {
      newPages.push({ type: 'text', content: '' });
    } else {
      // ★修正：区切り文字が含まれているかチェック
      if (letter.content.includes(PAGE_DELIMITER)) {
        // 区切り文字がある場合（新しい投稿）：そのまま分割してページにする
        const splitPages = letter.content.split(PAGE_DELIMITER);
        splitPages.forEach(p => {
          newPages.push({ type: 'text', content: p });
        });
      } else {
        // 区切り文字がない場合（古い投稿）：文字数で自動分割する
        for (let i = 0; i < letter.content.length; i += CHARS_PER_PAGE) {
          newPages.push({ type: 'text', content: letter.content.slice(i, i + CHARS_PER_PAGE) });
        }
      }
    }
    setPages(newPages);
  }, [letter]);

  const handleClose = () => { setIsVisible(false); setTimeout(onClose, 300); };
  const handleNext = () => { if (currentPage < pages.length - 1) setCurrentPage(currentPage + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(currentPage - 1); };

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', letter.id);
    if (error) alert('削除失敗');
    else { alert('削除しました'); handleClose(); if (onDeleted) onDeleted(); }
  };

  const isOfficial = letter.is_official;
  const borderColor = isOfficial ? 'border-yellow-600' : 'border-green-700';
  const bgColor = isOfficial ? 'bg-[#fdfcf5]' : 'bg-white';
  const textColor = isOfficial ? 'text-[#5d4037]' : 'text-gray-800';
  const Icon = isOfficial ? IconAdminLetter : IconUserLetter;
  const pageData = pages[currentPage];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>

      {/* 切手ゲット時の演出オーバーレイ */}
      {gotStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 p-6 rounded-lg shadow-2xl flex flex-col items-center animate-bounce-in pointer-events-auto border-4 border-yellow-400 max-w-xs">
            <h3 className="font-bold text-orange-600 mb-2 font-serif text-lg tracking-widest">切手を拾いました！</h3>
            <div className="w-24 h-32 border-4 border-white shadow-md rotate-3 mb-4 bg-white">
              <img src={gotStamp.image_url} className="w-full h-full object-cover" alt="stamp" />
            </div>
            <p className="font-bold text-sm text-gray-800 mb-4">{gotStamp.name}</p>
            <button 
              onClick={() => setGotStamp(null)}
              className="bg-green-700 text-white text-xs font-bold px-6 py-2 rounded-full shadow hover:bg-green-800 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div className={`relative w-full max-w-md h-[600px] shadow-2xl rounded-2xl transform transition-all duration-300 border-4 ${borderColor} ${bgColor} flex flex-col ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        {/* ヘッダー */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100/50 relative shrink-0">
          <div className="flex items-center gap-3">
             <div className="shrink-0 drop-shadow-sm"><Icon className="w-10 h-10" /></div>
             <div className="overflow-hidden">
               <h2 className={`font-bold font-serif text-lg leading-tight truncate ${textColor}`}>
                 {isLocked ? '秘密の手紙' : letter.title}
               </h2>
               <p className="text-xs text-gray-400 font-serif mt-1 truncate">📍 {letter.spot_name}</p>
             </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2">✕</button>
        </div>

        {/* 編集/お気に入りボタン (ロック中は非表示) */}
        {!isLocked && (
          <div className="absolute top-20 right-4 z-10 flex gap-2">
            {isMyPost ? (
              <>
                <Link href={`/post/edit/${letter.id}`}>
                  <button className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full shadow hover:bg-gray-200">編集</button>
                </Link>
                <button onClick={handleDelete} className="bg-red-50 text-red-500 text-xs px-3 py-1 rounded-full shadow hover:bg-red-100">削除</button>
              </>
            ) : (
              currentUser && (
                <button onClick={toggleFavorite} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full shadow transition-colors ${isFavorited ? 'bg-pink-50 text-pink-500 border border-pink-200' : 'bg-white text-gray-400 border border-gray-200 hover:text-pink-400'}`}>
                  {isFavorited ? '♥ お気に入り' : '♡ お気に入り'}
                </button>
              )
            )}
          </div>
        )}

        {/* コンテンツエリア */}
        <div className="flex-1 relative overflow-hidden p-6 md:p-8 flex items-center justify-center">
          
          {isLocked ? (
            <div className="flex flex-col items-center justify-center w-full h-full animate-fadeIn space-y-4">
              <div className="text-4xl">🔒</div>
              <p className="font-serif text-gray-600 text-sm tracking-widest">合言葉が必要です</p>
              
              <div className="w-full max-w-[200px]">
                <input 
                  type="text" 
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-center mb-2 font-serif placeholder:text-gray-300"
                  placeholder="合言葉"
                />
                <button 
                  onClick={handleUnlock}
                  className="w-full bg-green-700 text-white font-bold py-2 rounded shadow hover:bg-green-800 text-sm"
                >
                  開ける
                </button>
                {unlockError && <p className="text-red-500 text-xs text-center mt-2">合言葉が違います</p>}
              </div>
            </div>
          ) : (
            <>
              {pageData && pageData.type === 'image' && (
                 <div className="w-full h-full flex items-center justify-center animate-fadeIn p-2">
                   <img src={pageData.content} alt="Photo" className="max-w-full max-h-full object-contain rounded shadow-md border-4 border-white transform rotate-1" />
                 </div>
              )}
              {pageData && pageData.type === 'text' && (
                <div className={`w-full h-full text-base md:text-lg leading-loose font-serif tracking-widest [writing-mode:vertical-rl] whitespace-pre-wrap flex flex-col flex-wrap content-start items-center ${textColor} animate-fadeIn overflow-hidden`}>
                  {pageData.content}
                </div>
              )}
            </>
          )}

        </div>

        {/* フッター (ロック中は非表示) */}
        {!isLocked && (
          <div className="h-16 border-t border-gray-100/50 flex items-center justify-between px-6 shrink-0 bg-white/30 backdrop-blur-sm rounded-b-xl">
            <div className="flex items-center">
              {currentPage < pages.length - 1 ? (
                <button onClick={handleNext} className="text-sm font-bold flex items-center gap-1 text-gray-600 hover:text-orange-600 transition-colors pl-2 py-2">
                  <span className="text-lg">←</span> 次へ
                </button>
              ) : (
                <button onClick={handleClose} className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow-sm transition-transform active:scale-95 ${isOfficial ? 'bg-[#826d36]' : 'bg-green-700'}`}>
                  読み終わる
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 font-serif tracking-widest absolute left-1/2 -translate-x-1/2">- {currentPage + 1} -</span>
            <div className="flex items-center">
              <button onClick={handlePrev} disabled={currentPage === 0} className={`text-sm font-bold flex items-center gap-1 transition-colors pr-2 py-2 ${currentPage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-orange-500'}`}>
                前へ <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}