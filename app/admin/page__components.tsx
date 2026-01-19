'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression'; 
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';
// 作成したコンポーネントのインポートを追加
import AdminLetterCard from '@/components/admin/AdminLetterCard';
import AdminTabButton from '@/components/admin/AdminTabButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminBookshelfManager from '@/components/admin/AdminBookshelfManager';
import AdminMemberTable from '@/components/admin/AdminMemberTable';
import AdminStampManager from '@/components/admin/AdminStampManager';
import AdminWeatherSection from '@/components/admin/AdminWeatherSection';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'official' | 'posts' | 'users' | 'members' | 'stats' | 'create' | 'stamps' | 'weather' | 'bookshelves'>('posts');
  const [userSubTab, setUserSubTab] = useState<'active' | 'archive'>('active');

  const [stats, setStats] = useState({ userCount: 0, letterCount: 0, reportCount: 0 });
  const [letters, setLetters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allStamps, setAllStamps] = useState<any[]>([]);
  
  const [bookshelves, setBookshelves] = useState<any[]>([]);
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string>('');
  const [forceRain, setForceRain] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchData();
      await fetchStamps();
      await fetchBookshelves();
      setLoading(false);
    };
    init();
  }, []);

  const fetchBookshelves = async () => {
    const { data } = await supabase.from('bookshelves').select('*').order('thank_count', { ascending: false });
    if (data) setBookshelves(data);
  };

  const fetchData = async () => {
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: letterCount } = await supabase.from('letters').select('*', { count: 'exact', head: true });
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
            const current = userCurrentPostCountMap.get(l.user_id) || 0;
            userCurrentPostCountMap.set(l.user_id, current + 1);
          }
        });

        reportsData?.forEach((r: any) => {
          const current = reportCountMap.get(r.letter_id) || 0;
          reportCountMap.set(r.letter_id, current + 1);
        });

        const mergedLetters = lettersData.map((letter: any) => ({
          ...letter,
          profiles: profileMap.get(letter.user_id) || { nickname: '不明', email: null },
          report_count: reportCountMap.get(letter.id) || 0
        }));
        
        mergedLetters.sort((a, b) => (b.report_count - a.report_count) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLetters(mergedLetters);

        if (profilesData) {
          const profilesWithCounts = profilesData.map((p: any) => ({
            ...p,
            current_post_count: userCurrentPostCountMap.get(p.id) || 0
          })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setProfiles(profilesWithCounts);
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

  const officialLetters = letters.filter(l => l.is_official && !l.is_post);
  const postLetters = letters.filter(l => l.is_post);
  const allUserLetters = letters.filter(l => !l.is_official && !l.parent_id);

  const activeUserLetters = allUserLetters.filter(l => {
    const hours = (new Date().getTime() - new Date(l.created_at).getTime()) / 3600000;
    return hours <= LETTER_EXPIRATION_HOURS;
  });
  const archivedUserLetters = allUserLetters.filter(l => {
    const hours = (new Date().getTime() - new Date(l.created_at).getTime()) / 3600000;
    return hours > LETTER_EXPIRATION_HOURS;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h1 className="text-xl font-bold text-bunko-ink flex items-center gap-2">👮‍♂️ 管理局ダッシュボード</h1>
          <Link href="/" className="text-sm font-bold text-green-700 hover:underline">アプリに戻る</Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300 pb-2">
          <AdminTabButton label="常設ポスト" isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon="📮" count={postLetters.length} color="bg-red-700 text-white" />
          <AdminTabButton label="運営の投稿" isActive={activeTab === 'official'} onClick={() => setActiveTab('official')} icon="👑" count={officialLetters.length} />
          <AdminTabButton label="みんなの投稿" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👤" count={allUserLetters.length} badgeColor={stats.reportCount > 0 ? "bg-red-500 text-white" : undefined} />
          <AdminTabButton label="ユーザー管理" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} icon="👥" count={stats.userCount} />
          <AdminTabButton label="書架管理" isActive={activeTab === 'bookshelves'} onClick={() => setActiveTab('bookshelves')} icon="📚" count={bookshelves.length} />
          <AdminTabButton label="切手管理" isActive={activeTab === 'stamps'} onClick={() => setActiveTab('stamps')} icon="🏷️" count={allStamps.length} />
          <AdminTabButton label="統計" isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon="📊" />
          <AdminTabButton label="天候設定" isActive={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon="☁️" />
          <AdminTabButton label="新規作成" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} icon="✏️" color="bg-green-700 text-white" />
        </div>

        {activeTab === 'bookshelves' && (
          <AdminBookshelfManager bookshelves={bookshelves} onUpdate={fetchData} />
        )}

        {/* 2. weatherタブの中身を置き換え */}
        {activeTab === 'weather' && (
          <div className="animate-fadeIn">
            <AdminWeatherSection />
          </div>
        )}

        {activeTab === 'stamps' && (
          <AdminStampManager stamps={allStamps} onUpdate={fetchStamps} />
        )}

        {activeTab === 'members' && (
          <AdminMemberTable profiles={profiles} onUpdate={fetchData} />
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-4 border-b border-gray-200">
              <button onClick={() => setUserSubTab('active')} className={`pb-2 px-2 text-sm font-bold transition-all ${userSubTab === 'active' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'}`}>掲載中 ({activeUserLetters.length})</button>
              <button onClick={() => setUserSubTab('archive')} className={`pb-2 px-2 text-sm font-bold transition-all ${userSubTab === 'archive' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-400'}`}>アーカイブ ({archivedUserLetters.length})</button>
            </div>

            {userSubTab === 'active' ? (
              <>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-orange-800 text-sm">🧹 画像アーカイブ軽量化</h3>
                    <p className="text-xs text-orange-600 mt-1">48時間経過した画像の画質を落とし、容量を節約します。</p>
                  </div>
                  <button onClick={handleImageCleanup} disabled={isCleaning} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-orange-700 disabled:bg-gray-400">
                    {isCleaning ? 'お掃除中...' : 'お掃除実行'}
                  </button>
                </div>
                {cleanLog && <pre className="bg-black text-green-400 p-3 rounded text-[10px] h-24 overflow-y-scroll border border-gray-700">{cleanLog}</pre>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeUserLetters.map(letter => <AdminLetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b text-[10px] font-bold uppercase">
                      <tr>
                        <th className="p-4">投稿日</th>
                        <th className="p-4">タイトル</th>
                        <th className="p-4">冒頭内容</th>
                        <th className="p-4">投稿者</th>
                        <th className="p-4">通報</th>
                        <th className="p-4 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedUserLetters.map(letter => (
                        <tr key={letter.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(letter.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-bold text-gray-800 max-w-[150px] truncate">{letter.title}</td>
                          <td className="p-4 text-xs text-gray-500 max-w-[300px] truncate font-serif">{letter.content?.substring(0, 40)}...</td>
                          <td className="p-4 text-xs">{letter.profiles?.nickname}</td>
                          <td className="p-4">
                            {letter.report_count > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{letter.report_count}件</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              <Link href={`/admin/edit/${letter.id}`} className="text-blue-600 hover:underline text-xs font-bold">編集</Link>
                              <button onClick={() => handleDeletePost(letter.id, letter.image_url)} className="text-red-500 hover:underline text-xs font-bold">削除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {postLetters.map(letter => <AdminLetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
          </div>
        )}

        {activeTab === 'official' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {officialLetters.map(letter => <AdminLetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <AdminStatCard label="総ユーザー数" value={stats.userCount} color="text-blue-600" />
            <AdminStatCard label="総投稿数" value={stats.letterCount} color="text-orange-500" />
            <AdminStatCard label="未対応の通報" value={stats.reportCount} color="text-red-600" />
            <AdminStatCard label="一般ユーザー投稿" value={allUserLetters.length} color="text-green-600" />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 font-serif">新規作成</h2>
            <Link href="/admin/create" className="inline-block bg-green-700 text-white px-8 py-3 rounded-full font-bold hover:bg-green-800 shadow-lg transition-transform hover:scale-105 active:scale-95">投稿画面を開く 🚀</Link>
          </div>
        )}
      </div>
    </div>
  );
}