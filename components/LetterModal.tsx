import { useEffect, useState } from 'react';
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
  password?: string | null; // ★追加：パスワード
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
  
  // ★ロック機能用の状態
  const [isLocked, setIsLocked] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  const [currentPage, setCurrentPage] = useState(0); 
  const [pages, setPages] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);

  // 自分の投稿かどうか
  const isMyPost = currentUser && currentUser.id === letter.user_id;

  useEffect(() => {
    setIsVisible(true);
    
    // ★ロック判定
    // パスワードがあり、かつ自分の投稿ではない場合、ロックする
    if (letter.password && !isMyPost) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }

    checkFavorite();
  }, [letter, currentUser]); // currentUserが変わった時も再判定

  // ロック解除を試みる
  const handleUnlock = () => {
    if (inputPassword === letter.password) {
      setIsLocked(false); // 解除！
      setUnlockError(false);
    } else {
      setUnlockError(true); // ブブー！
    }
  };

  // ... (お気に入りなどの既存ロジックはそのまま) ...
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

  useEffect(() => {
    const newPages = [];
    if (letter.image_url) newPages.push({ type: 'image', content: letter.image_url });
    if (!letter.content) newPages.push({ type: 'text', content: '' });
    else {
      for (let i = 0; i < letter.content.length; i += CHARS_PER_PAGE) {
        newPages.push({ type: 'text', content: letter.content.slice(i, i + CHARS_PER_PAGE) });
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

        {/* 自分の投稿なら編集削除 / 他人の投稿ならお気に入り (ロック中は非表示) */}
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
          
          {/* ★ロック中の表示 */}
          {isLocked ? (
            <div className="flex flex-col items-center justify-center w-full h-full animate-fadeIn space-y-4">
              <div className="text-4xl">🔒</div>
              <p className="font-serif text-gray-600 text-sm">この手紙には合言葉が必要です</p>
              
              <div className="w-full max-w-[200px]">
                <input 
                  type="text" 
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-center mb-2"
                  placeholder="合言葉"
                />
                <button 
                  onClick={handleUnlock}
                  className="w-full bg-green-600 text-white font-bold py-2 rounded shadow hover:bg-green-700"
                >
                  開ける
                </button>
                {unlockError && <p className="text-red-500 text-xs text-center mt-2">合言葉が違います</p>}
              </div>
            </div>
          ) : (
            // ロック解除済み（通常表示）
            <>
              {pageData && pageData.type === 'image' && (
                 <div className="w-full h-full flex items-center justify-center animate-fadeIn p-2">
                   <img src={pageData.content} alt="Photo" className="max-w-full max-h-full object-contain rounded shadow-md border-4 border-white transform rotate-1" />
                 </div>
              )}
              {pageData && pageData.type === 'text' && (
                <div className={`w-full h-full text-base md:text-lg leading-loose font-serif tracking-widest [writing-mode:vertical-rl] flex flex-col flex-wrap content-start items-center ${textColor} animate-fadeIn overflow-hidden`}>
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
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}