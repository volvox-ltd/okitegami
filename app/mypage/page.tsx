'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LetterModal from '@/components/LetterModal';
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ★重要：page.tsxと同じ設定にする
const EXPIRATION_HOURS = 72; 

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
  created_at: string;
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites'>('posts');
  
  const [myPosts, setMyPosts] = useState<Letter[]>([]);
  const [favorites, setFavorites] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchMyPosts(user.id);
      fetchFavorites(user.id);
    };
    init();
  }, []);

  // 自分の投稿を取得
  const fetchMyPosts = async (userId: string) => {
    const { data } = await supabase
      .from('letters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setMyPosts(data as Letter[]);
  };

  // お気に入りを取得
  const fetchFavorites = async (userId: string) => {
    // favoritesテーブルを経由してlettersを取得
    const { data } = await supabase
      .from('favorites')
      .select('letter_id, letters(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      // データの形を整形
      const formatted = data.map((item: any) => item.letters).filter(Boolean);
      setFavorites(formatted as Letter[]);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // 期限切れ判定
  const isExpired = (createdAt: string) => {
    const diffHours = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return diffHours > EXPIRATION_HOURS;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white px-6 py-8 shadow-sm text-center relative">
        <Link href="/" className="absolute top-8 left-6 text-gray-400 text-xs font-bold">← 地図に戻る</Link>
        <h1 className="text-xl font-bold font-serif text-gray-800 tracking-widest mt-4">マイページ</h1>
        {user && <p className="text-xs text-gray-500 mt-2">{user.email}</p>}
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'posts' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'}`}
        >
          自分の手紙
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'favorites' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'}`}
        >
          お気に入り
        </button>
      </div>

      {/* リスト */}
      <div className="p-4 space-y-3">
        {(activeTab === 'posts' ? myPosts : favorites).length === 0 && (
          <div className="text-center py-10 text-gray-400 text-xs">
            {activeTab === 'posts' ? 'まだ手紙を置いていません' : 'お気に入りはまだありません'}
          </div>
        )}

        {(activeTab === 'posts' ? myPosts : favorites).map((letter) => {
          const expired = !letter.is_official && isExpired(letter.created_at);
          
          return (
            <div 
              key={letter.id}
              onClick={() => setSelectedLetter(letter)}
              className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] ${expired ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="shrink-0">
                {letter.is_official ? (
                  <IconAdminLetter className="w-10 h-10" />
                ) : (
                  <IconUserLetter className="w-10 h-10" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{letter.title}</h3>
                  {expired && activeTab === 'posts' && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">掲載終了</span>
                  )}
                  {activeTab === 'favorites' && expired && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">終了</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-1">📍 {letter.spot_name}</p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {new Date(letter.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ログアウトボタン */}
      <div className="p-6 mt-4 text-center">
        <button onClick={handleLogout} className="text-xs text-red-400 underline hover:text-red-600">
          ログアウトする
        </button>
      </div>

      {/* モーダル (詳細確認用) */}
      {selectedLetter && (
        <LetterModal 
          letter={selectedLetter}
          currentUser={user}
          onClose={() => setSelectedLetter(null)}
          onDeleted={() => {
            setSelectedLetter(null);
            // 削除されたらリストを更新
            if (user) {
              fetchMyPosts(user.id);
              fetchFavorites(user.id);
            }
          }}
        />
      )}
    </div>
  );
}