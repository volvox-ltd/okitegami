'use client';
import { useState, useEffect } from 'react'; // useRef, useCallback を削除
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression'; 

// コンポーネント群のインポート
import AdminTabButton from '@/components/admin/AdminTabButton';
import AdminBookshelfManager from '@/components/admin/AdminBookshelfManager';
import AdminMemberTable from '@/components/admin/AdminMemberTable';
import AdminStampManager from '@/components/admin/AdminStampManager';
import AdminWeatherSection from '@/components/admin/AdminWeatherSection';
import AdminStatsSection from '@/components/admin/AdminStatsSection';
import AdminPostListSection from '@/components/admin/AdminPostListSection';
import AdminBookstoreManager from '@/components/admin/AdminBookstoreManager';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'official' | 'posts' | 'users' | 'members' | 'stats' | 'create' | 'stamps' | 'weather' | 'bookshelves' | 'bookstores'>('posts');

  const [stats, setStats] = useState({ userCount: 0, letterCount: 0, reportCount: 0 });
  const [letters, setLetters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allStamps, setAllStamps] = useState<any[]>([]);
  const [bookshelves, setBookshelves] = useState<any[]>([]);
  const [bookstores, setBookstores] = useState<any[]>([]);
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      await fetchData();
      await fetchStamps();
      await fetchBookshelves();
      await fetchBookstores();
      setLoading(false);
    };
    init();
  }, []);

  const fetchBookshelves = async () => {
    const { data } = await supabase.from('bookshelves').select('*').order('thank_count', { ascending: false });
    if (data) setBookshelves(data);
  };

  const fetchBookstores = async () => {
    const { data } = await supabase.from('bookstores').select('*').order('created_at', { ascending: false });
    if (data) setBookstores(data);
  };

  const fetchData = async () => {
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: letterCount } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .is('parent_id', null); // parent_id が空のもの（＝大元の投稿）だけを数える
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true });
      
      setStats({ userCount: userCount || 0, letterCount: letterCount || 0, reportCount: reportCount || 0 });

      const { data: lettersData } = await supabase.from('letters').select('*').order('created_at', { ascending: false });
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const { data: reportsData } = await supabase.from('reports').select('letter_id');

      if (lettersData) {
        const profileMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
        const reportCountMap = new Map();
        const userCurrentPostCountMap = new Map();

        lettersData.forEach((l: any) => {
          if (l.user_id) {
            userCurrentPostCountMap.set(l.user_id, (userCurrentPostCountMap.get(l.user_id) || 0) + 1);
          }
        });

        reportsData?.forEach((r: any) => {
          reportCountMap.set(r.letter_id, (reportCountMap.get(r.letter_id) || 0) + 1);
        });

        const mergedLetters = lettersData.map((letter: any) => ({
          ...letter,
          profiles: profileMap.get(letter.user_id) || { nickname: '不明', email: null },
          report_count: reportCountMap.get(letter.id) || 0
        }));
        
        mergedLetters.sort((a, b) => (b.report_count - a.report_count) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLetters(mergedLetters);

        if (profilesData) {
          setProfiles(profilesData.map((p: any) => ({
            ...p,
            current_post_count: userCurrentPostCountMap.get(p.id) || 0
          })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      }
    } catch (e: any) { console.error(e); }
  };

  const fetchStamps = async () => {
    const { data } = await supabase.from('stamps').select('*').order('id', { ascending: true });
    if (data) setAllStamps(data);
  };

  const handleDeletePost = async (id: string, imageUrl?: string) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) await supabase.storage.from('letter-images').remove([fileName]);
      }
      await supabase.from('letters').delete().eq('id', id);
      fetchData();
    } catch (e: any) { alert('エラー: ' + e.message); }
  };

  const handleImageCleanup = async () => {
    if (!confirm('48時間以上経過した画像の画質を落として軽量化しますか？')) return;
    setIsCleaning(true);
    setCleanLog('開始します...\n');
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      const targets = letters.filter(l => !l.is_official && l.image_url && new Date(l.created_at) < twoDaysAgo && !l.image_url.includes('archive'));
      setCleanLog(prev => prev + `対象件数: ${targets.length}件\n`);
      for (const letter of targets) {
        try {
          const response = await fetch(letter.image_url);
          const blob = await response.blob();
          const options = { maxSizeMB: 0.03, maxWidthOrHeight: 400, useWebWorker: true, fileType: 'image/webp' };
          const compressedFile = await imageCompression(new File([blob], "temp.jpg", { type: "image/jpeg" }), options);
          const fileName = `archive/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
          await supabase.storage.from('letter-images').upload(fileName, compressedFile);
          const publicUrl = supabase.storage.from('letter-images').getPublicUrl(fileName).data.publicUrl;
          const oldName = letter.image_url.split('/').pop();
          if (oldName) await supabase.storage.from('letter-images').remove([oldName]);
          await supabase.from('letters').update({ image_url: publicUrl }).eq('id', letter.id);
        } catch (err) {}
      }
      setCleanLog(prev => prev + '完了しました\n');
      fetchData();
    } catch (e: any) { alert('エラー: ' + e.message); } finally { setIsCleaning(false); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-green-800 font-sans">管理情報を照合中...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto text-left">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h1 className="text-xl font-bold flex items-center gap-2">👮‍♂️ 管理局ダッシュボード</h1>
          <Link href="/" className="text-sm font-bold text-green-700 hover:underline">アプリに戻る</Link>
        </div>

        {/* タブ一覧 */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300 pb-2">
          <AdminTabButton label="常設ポスト" isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon="📮" count={letters.filter(l => l.is_post && !l.parent_id).length} color="bg-red-700 text-white" />
          <AdminTabButton label="運営の投稿" isActive={activeTab === 'official'} onClick={() => setActiveTab('official')} icon="👑" count={letters.filter(l => l.is_official && !l.is_post).length} />
          <AdminTabButton label="みんなの投稿" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👤" count={letters.filter(l => !l.is_official && !l.parent_id).length} badgeColor={stats.reportCount > 0 ? "bg-red-500 text-white" : undefined} />
          <AdminTabButton label="ユーザー管理" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} icon="👥" count={stats.userCount} />
          <AdminTabButton label="書架管理" isActive={activeTab === 'bookshelves'} onClick={() => setActiveTab('bookshelves')} icon="📚" count={bookshelves.length} />
          <AdminTabButton 
            label="本屋管理" 
            isActive={activeTab === 'bookstores'} 
            onClick={() => setActiveTab('bookstores')} 
            icon="📖" 
            count={bookstores.length} 
            color="bg-rose-700 text-white" 
          />
          <AdminTabButton label="切手管理" isActive={activeTab === 'stamps'} onClick={() => setActiveTab('stamps')} icon="🏷️" count={allStamps.length} />
          <AdminTabButton label="統計" isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon="📊" />
          <AdminTabButton label="天候設定" isActive={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon="☁️" />
          <AdminTabButton label="新規作成" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} icon="✏️" color="bg-green-700 text-white" />
        </div>

        {/* コンテンツエリア：ここを整理しました */}
        <div className="mt-6">
          {(activeTab === 'posts' || activeTab === 'official' || activeTab === 'users') && (
            <AdminPostListSection 
              activeTab={activeTab} 
              letters={letters} 
              onDelete={handleDeletePost} 
              handleImageCleanup={handleImageCleanup} 
              isCleaning={isCleaning} 
              cleanLog={cleanLog} 
            />
          )}

          {activeTab === 'stats' && (
            <AdminStatsSection 
              stats={stats} 
              allUserLettersCount={letters.filter(l => !l.is_official && !l.parent_id).length} 
            />
          )}

          {activeTab === 'members' && <AdminMemberTable profiles={profiles} onUpdate={fetchData} />}
          {activeTab === 'bookshelves' && <AdminBookshelfManager bookshelves={bookshelves} onUpdate={fetchData} />}
          {activeTab === 'bookstores' && <AdminBookstoreManager bookstores={bookstores} onUpdate={fetchBookstores} />}
          {activeTab === 'stamps' && <AdminStampManager stamps={allStamps} onUpdate={fetchStamps} />}
          {activeTab === 'weather' && <AdminWeatherSection />}
          
          {activeTab === 'create' && (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center animate-fadeIn">
              <h2 className="text-lg font-bold mb-4 font-serif">新規作成</h2>
              <Link href="/admin/create" className="inline-block bg-green-700 text-white px-8 py-3 rounded-full font-bold hover:bg-green-800 shadow-lg transition-transform hover:scale-105 active:scale-95">投稿画面を開く 🚀</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}