'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase'; 
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import LetterModal from '@/components/LetterModal';
import PostcardModal from '@/components/PostcardModal'; 
import PostModal from '@/components/PostModal'; 
import FooterLinks from '@/components/FooterLinks';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';
import SkeletonLetter from '@/components/SkeletonLetter';
import AcornModal from '@/components/mypage/AcornModal'

// ★ 全てのコンポーネントをインポート
import MypageHeader from '@/components/mypage/MypageHeader';
import MypageLetterList from '@/components/mypage/MypageLetterList';
import MypageStampGrid from '@/components/mypage/MypageStampGrid';
import MypageSettings from '@/components/mypage/MypageSettings';

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; created_at: string; password?: string | null;
  attached_stamp_id?: number | null; read_count?: number;
  is_post?: boolean; parent_id?: string | null;
  is_postcard?: boolean;
};

type UserStampRecord = {
  id: string;
  count: number;
  last_obtained_at: string;
  stamp: {
    id: number;
    name: string;
    image_url: string;
    description: string;
  };
  post?: Letter; 
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'favorites' | 'stamps' | 'settings'>('posts');
  const [postFilter, setPostFilter] = useState<'written' | 'submitted' | 'replies'>('written');
  
  const [myPosts, setMyPosts] = useState<Letter[]>([]);
  const [favorites, setFavorites] = useState<Letter[]>([]);
  const [userStampRecords, setUserStampRecords] = useState<UserStampRecord[]>([]);
  
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [selectedPost, setSelectedPost] = useState<Letter | null>(null);
  
  const [initialLayer, setInitialLayer] = useState(0);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isRainy, setIsRainy] = useState(false);

  const isExpired = (createdAt: string) => {
    return (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60) > LETTER_EXPIRATION_HOURS;
  };
  const [acornCount, setAcornCount] = useState<number>(0);

  useEffect(() => {
    let channel: any; // クリーンアップ用に変数を用意

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setNewEmail(user.email || '');

      const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'force_rain').maybeSingle();
      if (settings?.value === 'true') setIsRainy(true);

      // 1. プロフィールのどんぐり数を初期取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('acorn_count')
        .eq('id', user.id)
        .maybeSingle();
  
      if (profile) setAcornCount(profile.acorn_count || 0);

      // 2. リアルタイム購読の設定
      channel = supabase
        .channel('acorn-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            // DBが更新されたら即座に反映
            setAcornCount(payload.new.acorn_count);
          }
        )
        .subscribe();

      await Promise.all([
        fetchMyPosts(user.id),
        fetchFavorites(user.id),
        fetchUserStamps(user.id)
      ]);
      
      setIsLoading(false);
    };

    init();

    // 3. クリーンアップ：コンポーネントが閉じられる時に購読を解除する
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  const fetchMyPosts = async (userId: string) => {
    const { data } = await supabase
      .from('letters')
      .select('*, letter_reads(count)')
      .eq('user_id', userId)
      .eq('is_deleted_from_map', false)
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

  const fetchUserStamps = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_stamps')
      .select(`
        id, count, last_obtained_at,
        stamp:stamps(id, name, image_url, description),
        post:letters(*)
      `)
      .eq('user_id', userId)
      .order('last_obtained_at', { ascending: false });
    
    if (!error && data) {
      setUserStampRecords(data as any);
    }
  };

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

  // ★ フィルタリングロジックの修正
  const filteredMyPosts = useMemo(() => {
    return myPosts.filter(letter => {
      // 赤いポストへの返事、または赤いポスト自体の作成
      const isSubmittedToPost = !!letter.parent_id && letter.is_post === true; 
      // ユーザーが書いた通常の手紙への返事
      const isReplyToUser = !!letter.parent_id && letter.is_post !== true; 
      
      if (postFilter === 'replies') return isReplyToUser;
      if (postFilter === 'submitted') return isSubmittedToPost;
      if (postFilter === 'written') return !letter.parent_id;

      return false;
    }).sort((a, b) => {
      if (postFilter === 'written') {
        const aExpired = isExpired(a.created_at);
        const bExpired = isExpired(b.created_at);
        if (aExpired !== bExpired) {
          return aExpired ? 1 : -1; 
        }
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [myPosts, postFilter]);

  // ★ アイテムクリック時の挙動：ポスト関連ならPostModalを開く
  const handleItemClick = async (item: Letter) => {
    // 赤いポストへの投函の場合、その親であるポストを取得
    if (item.is_post && item.parent_id) {
      const { data: parentPost } = await supabase
        .from('letters')
        .select('*')
        .eq('id', item.parent_id)
        .single();
      
      if (parentPost) {
        setSelectedPost(parentPost as Letter);
      } else {
        alert('ポストが見つかりませんでした。');
      }
      return;
    }

    // ユーザー間のお返事の場合
    if (!!item.parent_id && !item.is_post) {
      const { data: parentLetter } = await supabase
        .from('letters')
        .select('*')
        .eq('id', item.parent_id)
        .single();
      
      if (parentLetter) {
        setInitialLayer(1); 
        setSelectedLetter(parentLetter as Letter);
      } else {
        alert('元の手紙が見つかりませんでした。');
      }
      return;
    }

    setInitialLayer(0); 
    if (item.is_post) {
      setSelectedPost(item);
    } else {
      setSelectedLetter(item);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const [showAcornModal, setShowAcornModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#fdfcf5] pb-10 font-sans text-gray-800 relative">

      {/* 1. ヘッダー */}
      <MypageHeader 
        email={user?.email} 
        acornCount={acornCount} 
        onAcornClick={() => setShowAcornModal(true)} 
      />
      
      {/* 2. タブバー */}
      <div className="flex border-b border-gray-200 bg-white">
        <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'posts' ? 'text-green-700' : 'text-gray-400'}`}>
          手紙の記録 {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-700"></div>}
        </button>
        <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'favorites' ? 'text-pink-500' : 'text-gray-400'}`}>
          お気に入り {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></div>}
        </button>
        <button onClick={() => setActiveTab('stamps')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'stamps' ? 'text-orange-600' : 'text-gray-400'}`}>
          切手帳 {activeTab === 'stamps' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600"></div>}
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-[10px] md:text-sm font-bold transition-colors relative font-sans ${activeTab === 'settings' ? 'text-gray-800' : 'text-gray-400'}`}>
          設定 {activeTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-800"></div>}
        </button>
      </div>

      {/* 3. フィルタボタン（手紙タブの時のみ） */}
      {activeTab === 'posts' && (
        <div className="flex justify-center gap-1.5 py-3 bg-[#fdfcf5] px-2 overflow-x-auto">
          {(['written', 'submitted', 'replies'] as const).map((f) => (
            <button 
              key={f}
              onClick={() => setPostFilter(f)} 
              className={`shrink-0 px-6 py-1.5 text-[10px] rounded-full font-bold border transition-all font-sans ${
                postFilter === f ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-400 border border-gray-200'
              }`}
            >
              {f === 'written' ? '書いた手紙' : f === 'submitted' ? '投函した手紙' : '手紙の返事'}
            </button>
          ))}
        </div>
      )}

      {/* 4. メインコンテンツエリア */}
      <div className="p-4 space-y-3 min-h-[50vh]">
        {isLoading && activeTab !== 'stamps' && activeTab !== 'settings' ? (
          <div className="space-y-3 max-w-3xl mx-auto"><SkeletonLetter /><SkeletonLetter /><SkeletonLetter /></div>
        ) : (
          <>
            {activeTab === 'settings' && (
              <MypageSettings 
                newEmail={newEmail} setNewEmail={setNewEmail}
                newPassword={newPassword} setNewPassword={setNewPassword}
                settingsMessage={settingsMessage} isUpdating={isUpdating}
                userEmail={user?.email} onUpdateEmail={handleUpdateEmail}
                onUpdatePassword={handleUpdatePassword} onLogout={handleLogout}
              />
            )}

            {activeTab === 'stamps' && (
              <MypageStampGrid records={userStampRecords} onItemClick={handleItemClick} onLogout={handleLogout} />
            )}

            {(activeTab === 'posts' || activeTab === 'favorites') && (
              <div className="max-w-3xl mx-auto">
                <MypageLetterList 
                  letters={activeTab === 'posts' ? filteredMyPosts : favorites} 
                  activeTab={activeTab} postFilter={postFilter} onItemClick={handleItemClick}
                />
                <div className="text-center py-10 border-t border-gray-100 mt-6">
                  <button onClick={handleLogout} className="text-xs text-red-400 underline hover:text-red-600 font-sans tracking-widest">ログアウト</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ★ return文の最後の方（ FooterLinks の上あたりなど）に追加 */}
      <AcornModal 
        isOpen={showAcornModal} 
        onClose={() => setShowAcornModal(false)} 
      />

      <FooterLinks />

      {selectedLetter && (
        selectedLetter.is_postcard ? (
          <PostcardModal
            letter={selectedLetter}
            currentUser={user}
            isRainy={isRainy}
            onClose={() => { setSelectedLetter(null); setInitialLayer(0); }}
            onRead={() => {}}
            onDeleted={(deletedId) => {
              setMyPosts(prev => prev.filter(l => l.id !== deletedId && l.id !== selectedLetter.id));
              setSelectedLetter(null);
            }}
            hideReply={activeTab === 'favorites' || activeTab === 'stamps' || (activeTab === 'posts' && postFilter === 'replies')}
            hideFavorite={activeTab === 'stamps' || (activeTab === 'posts' && postFilter === 'replies')}
            initialLayer={initialLayer}
            isMyPage={true}
          />
        ) : (
          <LetterModal 
            letter={selectedLetter} 
            currentUser={user} 
            isRainy={isRainy}
            onClose={() => { setSelectedLetter(null); setInitialLayer(0); }} 
            onRead={() => {}} 
            onDeleted={(deletedId) => {
              setMyPosts(prev => prev.filter(l => l.id !== deletedId && l.id !== selectedLetter.id));
              setSelectedLetter(null);
            }} 
            hideReply={activeTab === 'favorites' || activeTab === 'stamps' || (activeTab === 'posts' && postFilter === 'replies')}
            hideFavorite={activeTab === 'stamps' || (activeTab === 'posts' && postFilter === 'replies')}
            initialLayer={initialLayer}
            isMyPage={true}
          />
        )
      )}
      
      {selectedPost && (
        <PostModal 
          post={selectedPost} 
          currentUser={user} 
          isRainy={isRainy}
          onClose={() => setSelectedPost(null)} 
          isReachable={false}
          isMyPage={true} // ★ マイページモード：投函タブ非表示
        />
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}