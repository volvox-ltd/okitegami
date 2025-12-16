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
  password?: string | null;
  attached_stamp_id?: number | null;
};

type Stamp = {
  id: number;
  name: string;
  image_url: string;
  description: string;
  has_obtained: boolean;
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // タブは3つ構成に変更
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites' | 'stamps'>('posts');
  
  const [myPosts, setMyPosts] = useState<Letter[]>([]);
  const [favorites, setFavorites] = useState<Letter[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  
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
      fetchStamps(user.id);
    };
    init();
  }, []);

  const fetchMyPosts = async (userId: string) => {
    const { data } = await supabase
      .from('letters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setMyPosts(data as Letter[]);
  };

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('letter_id, letters(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((item: any) => item.letters).filter(Boolean);
      setFavorites(formatted as Letter[]);
    }
  };

  // ★追加：切手データの取得
  const fetchStamps = async (userId: string) => {
    // 1. 全切手を取得
    const { data: allStamps } = await supabase.from('stamps').select('*').order('id');
    // 2. 自分が持っている切手IDを取得
    const { data: myStamps } = await supabase.from('user_stamps').select('stamp_id').eq('user_id', userId);
    
    if (allStamps && myStamps) {
      const myStampIds = new Set(myStamps.map((s: any) => s.stamp_id));
      const formattedStamps = allStamps.map((s: any) => ({
        ...s,
        has_obtained: myStampIds.has(s.id)
      }));
      setStamps(formattedStamps);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isExpired = (createdAt: string) => {
    const diffHours = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return diffHours > EXPIRATION_HOURS;
  };

  return (
    <div className="min-h-screen bg-[#f7f4ea] pb-24 font-sans text-gray-800">
      {/* ヘッダー */}
      <div className="bg-white/90 backdrop-blur-sm px-6 py-4 shadow-sm text-center relative sticky top-0 z-10">
        <Link href="/" className="absolute top-1/2 -translate-y-1/2 left-6 text-gray-400 text-xs font-bold hover:text-green-700">← 地図に戻る</Link>
        <h1 className="text-lg font-bold font-serif text-bunko-ink tracking-widest">マイページ</h1>
        {user && <p className="text-[10px] text-gray-400 mt-1">{user.email}</p>}
      </div>

      {/* 3つのタブ */}
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold transition-colors relative ${activeTab === 'posts' ? 'text-green-700' : 'text-gray-400'}`}
        >
          自分の手紙
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-700"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold transition-colors relative ${activeTab === 'favorites' ? 'text-pink-500' : 'text-gray-400'}`}
        >
          お気に入り
          {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('stamps')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold transition-colors relative ${activeTab === 'stamps' ? 'text-orange-600' : 'text-gray-400'}`}
        >
          切手帳
          {activeTab === 'stamps' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600"></div>}
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="p-4 space-y-3 min-h-[300px]">
        
        {/* === 切手帳タブ === */}
        {activeTab === 'stamps' && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-3 gap-4 px-2">
              {stamps.map(stamp => (
                <div key={stamp.id} className="flex flex-col items-center">
                  <div 
                    className={`
                      aspect-[3/4] w-full rounded border-4 shadow-sm relative overflow-hidden mb-2 transition-all duration-500
                      ${stamp.has_obtained ? 'border-white bg-white rotate-1 scale-100' : 'border-gray-200 bg-gray-100 grayscale opacity-40 scale-95'}
                    `}
                    style={{
                      boxShadow: stamp.has_obtained ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    <img 
                      src={stamp.image_url} 
                      alt={stamp.name} 
                      className="w-full h-full object-cover p-1" 
                    />
                  </div>
                  <p className={`text-[10px] font-bold text-center ${stamp.has_obtained ? 'text-bunko-ink' : 'text-gray-300'}`}>
                    {stamp.has_obtained ? stamp.name : '???'}
                  </p>
                </div>
              ))}
            </div>
            {stamps.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-xs">切手データがありません</div>
            )}
            {stamps.length > 0 && stamps.every(s => !s.has_obtained) && (
              <p className="text-center text-xs text-gray-400 mt-8">
                まだ切手を持っていません。<br/>
                特別な手紙を見つけて開封すると...？
              </p>
            )}
          </div>
        )}

        {/* === 手紙リスト（自分の投稿 or お気に入り） === */}
        {activeTab !== 'stamps' && (
          <div className="animate-fadeIn space-y-3">
            {(activeTab === 'posts' ? myPosts : favorites).length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs">
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
        )}
      </div>

      {/* ログアウトボタン */}
      <div className="p-6 mt-4 text-center">
        <button onClick={handleLogout} className="text-xs text-red-400 underline hover:text-red-600 bg-white px-4 py-2 rounded-full border border-red-100">
          ログアウトする
        </button>
      </div>

      {/* モーダル */}
      {selectedLetter && (
        <LetterModal 
          letter={selectedLetter}
          currentUser={user}
          onClose={() => setSelectedLetter(null)}
          onDeleted={() => {
            setSelectedLetter(null);
            if (user) {
              fetchMyPosts(user.id);
              fetchFavorites(user.id);
            }
          }}
        />
      )}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}