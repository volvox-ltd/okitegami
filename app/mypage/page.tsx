'use client';
import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LetterModal from '@/components/LetterModal';
import PostModal from '@/components/PostModal'; 
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import IconPost from '@/components/IconPost'; 
import FooterLinks from '@/components/FooterLinks';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';
import SkeletonLetter from '@/components/SkeletonLetter';

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
  read_count?: number;
  is_post?: boolean;
  parent_id?: string | null; 
};

type Stamp = {
  id: number;
  name: string;
  image_url: string;
  description: string;
  has_obtained: boolean;
  count?: number; 
};

export default function MyPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ★修正：'settings' タブを追加
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites' | 'stamps' | 'settings'>('posts');
  const [postFilter, setPostFilter] = useState<'active' | 'archive'>('active');
  
  const [myPosts, setMyPosts] = useState<Letter[]>([]);
  const [favorites, setFavorites] = useState<Letter[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [selectedPost, setSelectedPost] = useState<Letter | null>(null);

  // ★追加：設定用ステート
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      setNewEmail(user.email || '');

      await Promise.all([
        fetchMyPosts(user.id),
        fetchFavorites(user.id),
        fetchStamps(user.id)
      ]);
      
      setIsLoading(false);
    };
    init();
  }, [supabase]);

  const fetchMyPosts = async (userId: string) => {
    const { data } = await supabase
      .from('letters')
      .select('*, letter_reads(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) {
      const formattedData = data.map((item: any) => ({
        ...item,
        read_count: item.letter_reads?.[0]?.count || 0
      }));
      setMyPosts(formattedData as Letter[]);
    }
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

  const fetchStamps = async (userId: string) => {
    const { data: allStamps } = await supabase.from('stamps').select('*').order('id');
    const { data: myStamps } = await supabase.from('user_stamps').select('stamp_id, count').eq('user_id', userId);
    
    if (allStamps && myStamps) {
      const myStampMap = new Map(myStamps.map((s: any) => [s.stamp_id, s.count]));
      const formattedStamps = allStamps.map((s: any) => ({
        ...s,
        has_obtained: myStampMap.has(s.id),
        count: myStampMap.get(s.id) || 0 
      }));
      setStamps(formattedStamps);
    }
  };

  // ★追加：メールアドレス変更処理
  const handleUpdateEmail = async () => {
    setIsUpdating(true);
    setSettingsMessage(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setSettingsMessage({ type: 'error', text: error.message });
    } else {
      setSettingsMessage({ type: 'success', text: '確認メールを送信しました。新しいアドレスで承認してください。' });
    }
    setIsUpdating(false);
  };

  // ★追加：パスワード変更処理
  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setSettingsMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' });
      return;
    }
    setIsUpdating(true);
    setSettingsMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSettingsMessage({ type: 'error', text: error.message });
    } else {
      setSettingsMessage({ type: 'success', text: 'パスワードを更新しました。' });
      setNewPassword('');
    }
    setIsUpdating(false);
  };

  const filteredMyPosts = useMemo(() => {
    return myPosts.filter(letter => {
      const expired = !letter.is_official && !letter.is_post && (new Date().getTime() - new Date(letter.created_at).getTime()) / (1000 * 60 * 60) > LETTER_EXPIRATION_HOURS;
      return postFilter === 'active' ? !expired : expired;
    });
  }, [myPosts, postFilter]);

  const handleStampClick = async (stampId: number) => {
    setIsLoading(true);
    try {
      const { data: lettersWithStamp } = await supabase.from('letters').select('*').eq('attached_stamp_id', stampId);
      if (!lettersWithStamp || lettersWithStamp.length === 0) {
        alert('この切手が付いている手紙は現在ありません');
        setIsLoading(false);
        return;
      }
      const target = lettersWithStamp[0]; 
      if (target.is_post) setSelectedPost(target as Letter);
      else setSelectedLetter(target as Letter);
    } catch (e) {
      alert('手紙の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // 1. Supabaseからサインアウト（ブラウザのメモリを消去）
    await supabase.auth.signOut();
    // 2. トップページへ強制遷移（Cookieを破棄し、Middlewareを再走らせる）
    window.location.href = '/';
  };

  const isExpired = (createdAt: string) => {
    return (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60) > LETTER_EXPIRATION_HOURS;
  };

  const obtainedStamps = stamps.filter(s => s.has_obtained);

  return (
    <div className="min-h-screen bg-[#fdfcf5] pb-10 font-sans text-gray-800 relative">
      
      <div className="bg-white/90 backdrop-blur-sm px-6 py-4 shadow-sm text-center relative sticky top-0 z-10">
        <Link href="/" className="absolute top-1/2 -translate-y-1/2 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-black transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="text-lg font-bold font-serif text-bunko-ink tracking-widest">マイページ</h1>
        {user && <p className="text-[10px] text-gray-400 mt-1 font-sans">{user.email}</p>}
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'posts' ? 'text-green-700' : 'text-gray-400'}`}>手紙の記録 {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-700"></div>}</button>
        <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'favorites' ? 'text-pink-500' : 'text-gray-400'}`}>お気に入り {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></div>}</button>
        <button onClick={() => setActiveTab('stamps')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'stamps' ? 'text-orange-600' : 'text-gray-400'}`}>切手帳 {activeTab === 'stamps' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600"></div>}</button>
        {/* ★修正：設定タブボタンを追加 */}
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'settings' ? 'text-gray-800' : 'text-gray-400'}`}>設定 {activeTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-800"></div>}</button>
      </div>

      {activeTab === 'posts' && (
        <div className="flex justify-center gap-4 py-3 bg-[#fdfcf5]">
          <button onClick={() => setPostFilter('active')} className={`px-5 py-1.5 text-[10px] rounded-full font-bold border transition-all font-sans ${postFilter === 'active' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>掲載中</button>
          <button onClick={() => setPostFilter('archive')} className={`px-5 py-1.5 text-[10px] rounded-full font-bold border transition-all font-sans ${postFilter === 'archive' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>思い出（アーカイブ）</button>
        </div>
      )}

      <div className="p-4 space-y-3 min-h-[50vh]">
        {isLoading && activeTab !== 'stamps' && activeTab !== 'settings' && (
          <div className="space-y-3 max-w-3xl mx-auto"><SkeletonLetter /><SkeletonLetter /><SkeletonLetter /></div>
        )}

        {!isLoading && (
          <>
            {/* === 設定タブ === */}
            {activeTab === 'settings' && (
              <div className="animate-fadeIn max-w-md mx-auto space-y-8 pt-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <h2 className="font-bold text-sm font-serif border-b pb-2">アカウント設定</h2>
                  
                  {settingsMessage && (
                    <div className={`p-3 rounded-lg text-[10px] font-bold ${settingsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {settingsMessage.text}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">メールアドレスの変更</label>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-700"
                        />
                        <button 
                          onClick={handleUpdateEmail}
                          disabled={isUpdating || newEmail === user?.email}
                          className="bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold disabled:bg-gray-200 transition-colors"
                        >
                          更新
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">パスワードの変更</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          placeholder="新しいパスワード"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-700"
                        />
                        <button 
                          onClick={handleUpdatePassword}
                          disabled={isUpdating || !newPassword}
                          className="bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold disabled:bg-gray-200 transition-colors"
                        >
                          更新
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                   <button onClick={handleLogout} className="text-xs text-red-400 underline hover:text-red-600 font-sans">ログアウト</button>
                </div>
              </div>
            )}

            {/* === 切手帳タブ === */}
            {activeTab === 'stamps' && (
              <div className="animate-fadeIn">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-6 px-2 max-w-5xl mx-auto pt-4">
                  {obtainedStamps.map(stamp => (
                  <div key={stamp.id} className="flex flex-col items-center group cursor-pointer" onClick={() => handleStampClick(stamp.id)}>
                    <div className="relative w-full aspect-[3/4]">
                      {stamp.count && stamp.count >= 3 && (
                        <div className="absolute inset-0 bg-white border border-gray-200 rounded shadow-sm transform rotate-6 translate-x-1.5 translate-y-1 scale-100 origin-bottom-right opacity-60 z-0" />
                      )}
                      {stamp.count && stamp.count >= 2 && (
                        <div className="absolute inset-0 bg-white border border-gray-200 rounded shadow-sm transform rotate-3 translate-x-0.5 translate-y-0.5 scale-100 origin-bottom-right z-0" />
                      )}
                      <div className="absolute inset-0 w-full h-full rounded border border-gray-200 bg-white shadow-sm p-1 flex items-center justify-center transition-transform group-hover:scale-105 z-10">
                        <img src={stamp.image_url} alt={stamp.name} className="w-full h-full object-contain" />
                      </div>
                      {stamp.count && stamp.count > 1 && (
                        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white z-20 font-sans">
                          {stamp.count}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-center text-bunko-ink truncate w-full mt-2 font-sans">{stamp.name}</p>
                  </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== 'stamps' && activeTab !== 'settings' && (
              <div className="animate-fadeIn space-y-3 max-w-3xl mx-auto">
                {(activeTab === 'posts' ? filteredMyPosts : favorites).length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-xs font-sans">
                    {activeTab === 'posts' ? (postFilter === 'active' ? '掲載中の手紙はありません' : 'アーカイブはありません') : 'お気に入りはありません'}
                  </div>
                )}

                {(activeTab === 'posts' ? filteredMyPosts : favorites).map((letter) => {
                  const expired = !letter.is_official && !letter.is_post && isExpired(letter.created_at);
                  const isSubmittedToPost = !!letter.parent_id;
                  const displayTitle = isSubmittedToPost ? `${letter.spot_name}への手紙` : letter.title;
                  
                  return (
                    <div key={letter.id} onClick={() => letter.is_post ? setSelectedPost(letter) : setSelectedLetter(letter)}
                      className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] ${expired ? 'opacity-70 saturate-[0.3] bg-gray-50' : ''}`}
                    >
                      <div className="shrink-0 relative">
                        {isSubmittedToPost ? (
                          <div className="text-red-600"><IconPost className="w-10 h-10" /></div>
                        ) : letter.is_official ? (
                          <IconAdminLetter className="w-10 h-10" />
                        ) : (
                          <IconUserLetter className="w-10 h-10" />
                        )}
                        {letter.is_post && <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[8px] shadow">📮</div>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-800 text-sm truncate font-serif">{displayTitle}</h3>
                          {expired && <span className="text-[9px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 font-sans">消印済</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-1 italic font-sans">📍 {letter.spot_name}</p>
                        <div className="flex justify-between items-end mt-1">
                          <p className="text-[10px] text-gray-300 font-sans">{new Date(letter.created_at).toLocaleDateString()}</p>
                          {activeTab === 'posts' && !expired && letter.read_count !== undefined && letter.read_count > 0 && (
                            <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                              <span className="text-[9px] font-bold text-orange-600 font-sans">開封されました</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 設定タブ以外の場合のみ、下にログアウトを表示 */}
      {activeTab !== 'settings' && (
        <div className="text-center py-6 border-t border-gray-100 mt-6">
          <button onClick={handleLogout} className="text-xs text-gray-400 underline hover:text-red-500 font-sans">ログアウト</button>
        </div>
      )}
      <FooterLinks />

      {selectedLetter && <LetterModal letter={selectedLetter} currentUser={user} onClose={() => setSelectedLetter(null)} onDeleted={() => { setSelectedLetter(null); if (user) { fetchMyPosts(user.id); fetchFavorites(user.id); } }} />}
      {selectedPost && <PostModal post={selectedPost} currentUser={user} onClose={() => setSelectedPost(null)} isReachable={true} />}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}