'use client';
import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import imageCompression from 'browser-image-compression'; 
import IconAdminLetter from '@/components/IconAdminLetter';
import IconUserLetter from '@/components/IconUserLetter';
import IconPost from '@/components/IconPost';
import { compressStamp } from '@/utils/imageControl';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'official' | 'posts' | 'users' | 'members' | 'stats' | 'create' | 'stamps'>('posts');
  // ★追加：ユーザー投稿内のサブタブ
  const [userSubTab, setUserSubTab] = useState<'active' | 'archive'>('active');

  const [stats, setStats] = useState({ userCount: 0, letterCount: 0, reportCount: 0 });
  const [letters, setLetters] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allStamps, setAllStamps] = useState<any[]>([]);
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      await fetchData();
      await fetchStamps();
      setLoading(false);
    };
    init();
  }, []);

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

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const stampName = prompt("切手の名前を入力してください");
    if (!stampName) return;
    try {
      setCleanLog("切手を圧縮中...\n");
      const compressedFile = await compressStamp(file);
      const fileName = `stamps/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from('letter-images').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('letter-images').getPublicUrl(fileName).data.publicUrl;
      const { error: dbError } = await supabase.from('stamps').insert({ name: stampName, image_url: publicUrl, description: `${stampName}の公式切手` });
      if (dbError) throw dbError;
      alert("切手を追加しました");
      fetchStamps();
    } catch (e: any) { alert("エラー: " + e.message); }
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

  const handleResetStamps = async (userId: string, nickname: string) => {
    if (!confirm(`${nickname}さんの獲得済み切手をすべてリセットしますか？`)) return;
    try {
      const { error } = await supabase.from('user_stamps').delete().eq('user_id', userId);
      if (error) throw error;
      alert(`${nickname}さんの切手帳を空にしました。`);
      fetchData();
    } catch (e: any) { alert('リセットに失敗しました: ' + e.message); }
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

  // 手紙の仕分け
  const officialLetters = letters.filter(l => l.is_official && !l.is_post);
  const postLetters = letters.filter(l => l.is_post);
  const allUserLetters = letters.filter(l => !l.is_official && !l.parent_id);

  // ★ サブタブ用の仕分け
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
          <TabButton label="常設ポスト" isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon="📮" count={postLetters.length} color="bg-red-700 text-white" />
          <TabButton label="運営の投稿" isActive={activeTab === 'official'} onClick={() => setActiveTab('official')} icon="👑" count={officialLetters.length} />
          <TabButton label="みんなの投稿" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👤" count={allUserLetters.length} badgeColor={stats.reportCount > 0 ? "bg-red-500 text-white" : undefined} />
          <TabButton label="ユーザー管理" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} icon="👥" count={stats.userCount} />
          <TabButton label="切手管理" isActive={activeTab === 'stamps'} onClick={() => setActiveTab('stamps')} icon="🏷️" count={allStamps.length} />
          <TabButton label="統計" isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon="📊" />
          <TabButton label="新規作成" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} icon="✏️" color="bg-green-700 text-white" />
        </div>

        {/* --- 切手管理タブ --- */}
        {activeTab === 'stamps' && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">切手（スタンプ）一覧</h2>
              <label className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer hover:bg-orange-700 transition-colors">
                新しく切手を追加
                <input type="file" className="hidden" accept="image/*" onChange={handleStampUpload} />
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allStamps.map(stamp => (
                <div key={stamp.id} className="border border-gray-100 p-3 rounded-xl flex flex-col items-center gap-2 bg-gray-50">
                  <div className="w-16 h-20 bg-white border border-gray-200 rounded p-1 shadow-sm">
                    <img src={stamp.image_url} alt={stamp.name} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 truncate w-full text-center">{stamp.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ユーザー管理タブ --- */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-xl shadow overflow-hidden animate-fadeIn border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 border-b uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-4 whitespace-nowrap">登録日</th>
                    <th className="p-4">ニックネーム</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">掲載中</th>
                    <th className="p-4">累計</th>
                    <th className="p-4">ユーザーID</th>
                    <th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(profile.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-bold text-gray-800">{profile.nickname}</td>
                      <td className="p-4 text-xs text-gray-600">{profile.email || <span className="text-gray-300 italic">未取得</span>}</td>
                      <td className="p-4"><span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${profile.current_post_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{profile.current_post_count || 0}</span></td>
                      <td className="p-4"><span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${profile.total_post_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{profile.total_post_count || 0}</span></td>
                      <td className="p-4 text-[10px] text-gray-400 font-mono">{profile.id}</td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleResetStamps(profile.id, profile.nickname)} className="text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-orange-100">切手リセット</button>
                          <button onClick={() => alert('機能制限の実装待ち')} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-red-100">BAN</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- みんなの投稿（メイン修正箇所） --- */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fadeIn">
            {/* サブタブ切り替え */}
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
                  {activeUserLetters.map(letter => <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
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
                  {archivedUserLetters.length === 0 && <div className="p-10 text-center text-gray-400 text-sm italic">アーカイブはありません。</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {postLetters.map(letter => <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
          </div>
        )}

        {activeTab === 'official' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {officialLetters.map(letter => <LetterCard key={letter.id} letter={letter} onDelete={handleDeletePost} />)}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <StatCard label="総ユーザー数" value={stats.userCount} color="text-blue-600" />
            <StatCard label="総投稿数" value={stats.letterCount} color="text-orange-500" />
            <StatCard label="未対応の通報" value={stats.reportCount} color="text-red-600" />
            <StatCard label="一般ユーザー投稿" value={allUserLetters.length} color="text-green-600" />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 font-serif">新規作成</h2>
            <Link href="/admin/create" className="inline-block bg-green-700 text-white px-8 py-3 rounded-full font-bold hover:bg-green-800 shadow-lg">投稿画面を開く 🚀</Link>
          </div>
        )}
      </div>
    </div>
  );
}

const TabButton = ({ label, isActive, onClick, icon, count, color, badgeColor }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 font-sans ${isActive ? (color || 'bg-gray-800 text-white shadow-md') : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
    <span>{icon}</span>{label}{count !== undefined && <span className={`ml-1 text-xs px-1.5 rounded-full ${badgeColor || 'bg-black/10 opacity-70'}`}>{count}</span>}
  </button>
);

const StatCard = ({ label, value, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100 font-sans">
    <h3 className="text-xs font-bold text-gray-400 mb-1">{label}</h3>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const LetterCard = ({ letter, onDelete }: any) => {
  const isExpired = !letter.is_official && !letter.is_post && (new Date().getTime() - new Date(letter.created_at).getTime()) / 3600000 > LETTER_EXPIRATION_HOURS;
  const isReported = letter.report_count > 0;
  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden ${isReported ? 'bg-red-50 border-red-400' : letter.is_post ? 'bg-red-50 border-red-200' : letter.is_official ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
      {isReported && <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 absolute top-0 right-0 rounded-bl-lg z-10 font-sans">⚠️ {letter.report_count}件の通報</div>}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {letter.is_post ? <div className="text-red-600"><IconPost className="w-8 h-8" /></div> : letter.is_official ? <IconAdminLetter className="w-8 h-8" /> : <IconUserLetter className="w-8 h-8 text-gray-400" />}
          <div>
            <h3 className="font-bold text-sm text-gray-800 line-clamp-1 font-serif">{letter.title}</h3>
            <p className="text-[10px] text-gray-400 font-sans">{new Date(letter.created_at).toLocaleDateString()} {new Date(letter.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </div>
        </div>
        <div className="text-[10px] font-bold font-sans">
          {letter.is_post ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">ポスト</span> : letter.is_official ? <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">公式</span> : isExpired ? <span className="bg-gray-200 text-gray-500 px-2 py-1 rounded">期限切れ</span> : <span className="bg-green-100 text-green-700 px-2 py-1 rounded">掲載中</span>}
        </div>
      </div>
      <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border border-gray-100 h-16 overflow-hidden leading-relaxed font-serif">{letter.content}</div>
      {letter.image_url && <div className="text-[10px] text-blue-500 font-sans">📷 画像あり {letter.image_url.includes('archive') && <span className="text-orange-500">(軽量化済)</span>}</div>}
      {!letter.is_official && <div className="text-[10px] text-gray-400 border-t pt-2 mt-auto font-sans">User: {letter.profiles?.nickname || '不明'} {letter.profiles?.email && <span className="ml-1">({letter.profiles.email})</span>}</div>}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 font-sans">
        <Link href={`/admin/edit/${letter.id}`} className="flex-1 text-center text-xs bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100 font-bold">編集</Link>
        <button onClick={() => onDelete(letter.id, letter.image_url)} className="flex-1 text-center text-xs bg-red-50 text-red-600 py-2 rounded hover:bg-red-100 font-bold">削除</button>
      </div>
    </div>
  );
};