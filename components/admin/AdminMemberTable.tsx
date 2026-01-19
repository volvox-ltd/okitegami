'use client';

import { createBrowserClient } from '@supabase/ssr';

// Supabaseクライアントの初期化（コンポーネント内で完結させるため）
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Profile = {
  id: string;
  created_at: string;
  nickname: string;
  email: string | null;
  current_post_count: number;
  total_post_count: number;
};

type AdminMemberTableProps = {
  profiles: Profile[];
  onUpdate: () => void; // データを再取得するためのコールバック
};

export default function AdminMemberTable({ profiles, onUpdate }: AdminMemberTableProps) {
  
  // 切手リセット処理をコンポーネント内にカプセル化
  const handleResetStamps = async (userId: string, nickname: string) => {
    if (!confirm(`${nickname}さんの獲得済み切手をすべてリセットしますか？`)) return;
    try {
      const { error } = await supabase.from('user_stamps').delete().eq('user_id', userId);
      if (error) throw error;
      alert(`${nickname}さんの切手帳を空にしました。`);
      onUpdate(); // 親コンポーネントのデータを更新
    } catch (e: any) {
      alert('リセットに失敗しました: ' + e.message);
    }
  };

  return (
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
                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 font-bold text-gray-800">{profile.nickname}</td>
                <td className="p-4 text-xs text-gray-600">
                  {profile.email || <span className="text-gray-300 italic">未取得</span>}
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                    profile.current_post_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {profile.current_post_count || 0}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                    profile.total_post_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {profile.total_post_count || 0}
                  </span>
                </td>
                <td className="p-4 text-[10px] text-gray-400 font-mono">{profile.id}</td>
                <td className="p-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => handleResetStamps(profile.id, profile.nickname)} 
                      className="text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-orange-100"
                    >
                      切手リセット
                    </button>
                    <button 
                      onClick={() => alert('機能制限の実装待ち')} 
                      className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-red-100"
                    >
                      BAN
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}