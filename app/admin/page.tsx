'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression'; 
import IconAdminLetter from '@/components/IconAdminLetter';
import IconUserLetter from '@/components/IconUserLetter';
import IconPost from '@/components/IconPost'; // ★追加：ポスト用アイコン

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // ★変更：'posts' タブを追加
  const [activeTab, setActiveTab] = useState<'official' | 'posts' | 'users' | 'members' | 'stats' | 'create'>('official');

  const [stats, setStats] = useState({ userCount: 0, letterCount: 0, reportCount: 0 });
  const [letters, setLetters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string>('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.is_admin) {
        alert("管理者権限がありません");
        router.push('/');
        return;
      }

      fetchData();
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const fetchData = async () => {
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: letterCount } = await supabase.from('letters').select('*', { count: 'exact', head: true });
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true });
      
      setStats({ 
        userCount: userCount || 0, 
        letterCount: letterCount || 0,
        reportCount: reportCount || 0 
      });

      const { data: lettersData } = await supabase
        .from('letters')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*');

      const { data: reportsData } = await supabase
        .from('reports')
        .select('letter_id');

      if (lettersData) {
        const profileMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
        
        const reportCountMap = new Map();
        reportsData?.forEach((r: any) => {
          const current = reportCountMap.get(r.letter_id) || 0;
          reportCountMap.set(r.letter_id, current + 1);
        });

        const mergedLetters = lettersData.map((letter: any) => ({
          ...letter,
          profiles: profileMap.get(letter.user_id) || { nickname: '不明', email: null },
          report_count: reportCountMap.get(letter.id) || 0
        }));
        
        mergedLetters.sort((a: any, b: any) => {
          if (b.report_count !== a.report_count) {
            return b.report_count - a.report_count;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setLetters(mergedLetters);
      }
      
      if (profilesData) {
        const sortedProfiles = profilesData.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProfiles(sortedProfiles);
      }

    } catch (e: any) {
      console.error("Data Fetch Error:", e);
      alert("データの取得に失敗しました: " + e.message);
    }
  };

  const handleDeletePost = async (id: string, imageUrl?: string) => {
    if (!confirm('本当に削除しますか？\n※ポストを削除すると、中に入っている手紙も全て削除されます。')) return;
    try {
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) await supabase.storage.from('letter-images').remove([fileName]);
      }
      const { error } = await supabase.from('letters').delete().eq('id', id);
      if (error) throw error;
      alert('削除しました');
      fetchData();
    } catch (e: any) {
      alert('エラー: ' + e.message);
    }
  };

  const handleImageCleanup = async () => {
    if (!confirm('48時間以上経過した画像の画質を落として軽量化しますか？')) return;
    setIsCleaning(true);
    setCleanLog('開始します...\n');

    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

      const targets = letters.filter(l => 
        !l.is_official &&
        l.image_url && 
        new Date(l.created_at) < twoDaysAgo &&
        !l.image_url.includes('archive') 
      );

      setCleanLog(prev => prev + `対象件数: ${targets.length}件\n`);

      for (const letter of targets) {
        setCleanLog(prev => prev + `処理中: ${letter.title}...\n`);
        try {
          const response = await fetch(letter.image_url);
          const blob = await response.blob();
          const file = new File([blob], "temp.jpg", { type: "image/jpeg" });

          const options = {
            maxSizeMB: 0.03,
            maxWidthOrHeight: 400,
            useWebWorker: true,
            fileType: 'image/webp'
          };
          const compressedFile = await imageCompression(file, options);
          const fileName = `archive/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
          
          const { error: uploadError } = await supabase.storage
            .from('letter-images')
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;

          const publicUrl = supabase.storage.from('letter-images').getPublicUrl(fileName).data.publicUrl;
          const oldName = letter.image_url.split('/').pop();
          if (oldName) await supabase.storage.from('letter-images').remove([oldName]);

          await supabase.from('letters').update({ image_url: publicUrl }).eq('id', letter.id);
          setCleanLog(prev => prev + `完了\n`);
        } catch (err) {
          console.error(err);
          setCleanLog(prev => prev + `エラー\n`);
        }
      }
      setCleanLog(prev => prev + '完了しました\n');
      fetchData();
    } catch (e: any) {
      alert('エラー: ' + e.message);
    } finally {
      setIsCleaning(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Admin Checking...</div>;

  // フィルタリングロジックの修正
  // official: 公式フラグあり、かつポストではない
  const officialLetters = letters.filter(l => l.is_official && !l.is_post);
  // posts: ポストである
  const postLetters = letters.filter(l => l.is_post);
  // users: 公式ではなく、かつ「親IDがない（＝ポストへの投函ではない）」もの ★修正
  const userLetters = letters.filter(l => !l.is_official && !l.parent_id);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h1 className="text-xl font-bold text-bunko-ink flex items-center gap-2">
            <span className="text-2xl">👮‍♂️</span> 管理局ダッシュボード
          </h1>
          <Link href="/" className="text-sm font-bold text-green-700 hover:underline">
            アプリに戻る
          </Link>
        </div>

        {/* タブメニュー */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300 pb-2">
          <TabButton 
            label="常設ポスト" 
            isActive={activeTab === 'posts'} 
            onClick={() => setActiveTab('posts')} 
            icon="📮" 
            count={postLetters.length} 
            color="bg-red-700 text-white"
          />
          <TabButton 
            label="運営の投稿" 
            isActive={activeTab === 'official'} 
            onClick={() => setActiveTab('official')} 
            icon="👑" 
            count={officialLetters.length} 
          />
          
          <TabButton 
            label="みんなの投稿" 
            isActive={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon="👤" 
            count={userLetters.length}
            badgeColor={stats.reportCount > 0 ? "bg-red-500 text-white" : undefined}
          />
          
          <TabButton label="ユーザー管理" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} icon="list" count={stats.userCount} />
          <TabButton label="統計" isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon="📊" />
          <TabButton label="新規作成" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} icon="✏️" color="bg-green-700 text-white" />
        </div>

        {/* === 常設ポストタブ === */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="font-bold text-lg flex items-center gap-2">
              📮 常設ポスト一覧 
              <span className="text-xs font-normal text-gray-500">（ユーザーが投函できる場所）</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {postLetters.map(letter => (
                <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />
              ))}
            </div>
            {postLetters.length === 0 && <p className="text-gray-400 text-sm">現在設置されているポストはありません。</p>}
          </div>
        )}

        {/* === 運営の投稿タブ === */}
        {activeTab === 'official' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="font-bold text-lg">運営からの手紙一覧</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialLetters.map(letter => (
                <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />
              ))}
            </div>
          </div>
        )}

        {/* === みんなの投稿タブ === */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-orange-800 text-sm">🧹 画像アーカイブ軽量化（お掃除）</h3>
                <p className="text-xs text-orange-600 mt-1">48時間経過した画像の画質を落とし、容量を節約します。</p>
              </div>
              <button 
                onClick={handleImageCleanup}
                disabled={isCleaning}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-orange-700 disabled:bg-gray-400 shadow-sm whitespace-nowrap"
              >
                {isCleaning ? 'お掃除中...' : 'お掃除実行'}
              </button>
            </div>
            {cleanLog && (
              <pre className="bg-black text-green-400 p-3 rounded text-[10px] h-24 overflow-y-scroll border border-gray-700">
                {cleanLog}
              </pre>
            )}

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">ユーザーの投稿一覧</h2>
              {stats.reportCount > 0 && <span className="text-xs font-bold text-red-600">⚠️ {stats.reportCount}件の通報があります</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLetters.map(letter => (
                <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-xl shadow overflow-hidden animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 border-b">
                  <tr>
                    <th className="p-3 whitespace-nowrap">登録日</th>
                    <th className="p-3">ニックネーム</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(profile.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-bold">{profile.nickname}</td>
                      <td className="p-3 text-xs text-gray-500">{profile.email || '-'}</td>
                      <td className="p-3 text-[10px] text-gray-400 font-mono">{profile.id}</td>
                      <td className="p-3">
                        <button onClick={() => alert('実装待ち')} className="text-red-500 hover:underline text-xs bg-red-50 px-2 py-1 rounded">BAN</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 mb-1">総ユーザー数</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.userCount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 mb-1">総投稿数</h3>
              <p className="text-3xl font-bold text-orange-500">{stats.letterCount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 mb-1">未対応の通報</h3>
              <p className="text-3xl font-bold text-red-600">{stats.reportCount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 mb-1">ユーザー投稿</h3>
              <p className="text-3xl font-bold text-green-600">{userLetters.length}</p>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center animate-fadeIn">
            <h2 className="text-lg font-bold mb-4">新規作成</h2>
            <p className="text-sm text-gray-500 mb-6">
              地図上に新しい手紙、または常設ポストを設置します。
            </p>
            <Link 
              href="/admin/create" 
              className="inline-block bg-green-700 text-white px-8 py-3 rounded-full font-bold hover:bg-green-800 shadow-lg transition-transform hover:scale-105"
            >
              投稿画面を開く 🚀
            </Link>
          </div>
        )}

      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

// --- サブコンポーネント ---

const TabButton = ({ label, isActive, onClick, icon, count, color, badgeColor }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
      isActive 
      ? (color || 'bg-gray-800 text-white shadow-md') 
      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
    }`}
  >
    <span>{icon}</span>
    {label}
    {count !== undefined && (
      <span className={`ml-1 text-xs px-1.5 rounded-full ${badgeColor || 'bg-black/10 opacity-70'}`}>
        {count}
      </span>
    )}
  </button>
);

const LetterCard = ({ letter, onDelete }: any) => {
  const isExpired = !letter.is_official && (new Date().getTime() - new Date(letter.created_at).getTime()) / (1000 * 60 * 60) > 48;
  const isReported = letter.report_count > 0;

  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden ${
      isReported ? 'bg-red-50 border-red-400' : 
      letter.is_post ? 'bg-red-50 border-red-200' : // ★ポストは少し赤っぽく
      letter.is_official ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
    }`}>
      
      {isReported && (
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 absolute top-0 right-0 rounded-bl-lg z-10">
          ⚠️ {letter.report_count}件の通報
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {/* ★修正：ポストなら専用アイコンを表示 */}
          {letter.is_post ? (
            <div className="text-red-600"><IconPost className="w-8 h-8" /></div>
          ) : letter.is_official ? (
            <IconAdminLetter className="w-8 h-8" /> 
          ) : (
            <IconUserLetter className="w-8 h-8 text-gray-400" />
          )}
          
          <div>
            <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{letter.title}</h3>
            <p className="text-[10px] text-gray-400">
              {new Date(letter.created_at).toLocaleDateString()} 
              <span className="ml-2">{new Date(letter.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </p>
          </div>
        </div>
        
        {/* バッジ表示 */}
        <div className="mt-1">
          {letter.is_post ? (
             <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold border border-red-200">ポスト</span>
          ) : letter.is_official ? (
             <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold border border-yellow-200">公式</span>
          ) : (
             isExpired ? <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded font-bold">期限切れ</span> : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">掲載中</span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border border-gray-100 h-16 overflow-hidden">
        {letter.content}
      </div>

      {letter.image_url && (
        <div className="text-[10px] text-blue-500 flex items-center gap-1">
          📷 画像あり {letter.image_url.includes('archive') && <span className="text-orange-500">(圧縮済)</span>}
        </div>
      )}

      {!letter.is_official && (
        <div className="text-[10px] text-gray-400 border-t pt-2 mt-auto">
          User: {letter.profiles?.nickname || '不明'} 
          {letter.profiles?.email && <span className="ml-1">({letter.profiles.email})</span>}
        </div>
      )}

      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
        <Link 
          href={`/admin/edit/${letter.id}`} 
          className="flex-1 text-center text-xs bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100 font-bold"
        >
          編集
        </Link>
        <button 
          onClick={() => onDelete(letter.id, letter.image_url)} 
          className="flex-1 text-center text-xs bg-red-50 text-red-600 py-2 rounded hover:bg-red-100 font-bold"
        >
          削除
        </button>
      </div>
    </div>
  );
};