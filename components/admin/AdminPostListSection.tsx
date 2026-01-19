'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AdminLetterCard from '@/components/admin/AdminLetterCard';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';
import LetterModal from '@/components/LetterModal';
import PostcardModal from '@/components/PostcardModal';

interface AdminPostListSectionProps {
  activeTab: 'official' | 'posts' | 'users';
  letters: any[];
  onDelete: (id: string, imageUrl?: string) => Promise<void>;
  handleImageCleanup: () => Promise<void>;
  isCleaning: boolean;
  cleanLog: string;
}

export default function AdminPostListSection({
  activeTab,
  letters,
  onDelete,
  handleImageCleanup,
  isCleaning,
  cleanLog
}: AdminPostListSectionProps) {
  const [userSubTab, setUserSubTab] = useState<'active' | 'archive' | 'replies'>('active');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [viewingLetter, setViewingLetter] = useState<any>(null);

  const { officialLetters, postLetters, activeUserLetters, archivedUserLetters, replyLetters, currentFixedPostReplies } = useMemo(() => {
    const official = letters.filter(l => l.is_official && !l.is_post);
    const posts = letters.filter(l => l.is_post && !l.parent_id);
    const allUsers = letters.filter(l => !l.is_official && !l.is_post);

    const active = allUsers.filter(l => {
      const hours = (new Date().getTime() - new Date(l.created_at).getTime()) / 3600000;
      return !l.parent_id && hours <= LETTER_EXPIRATION_HOURS;
    });
    const archived = allUsers.filter(l => {
      const hours = (new Date().getTime() - new Date(l.created_at).getTime()) / 3600000;
      return !l.parent_id && hours > LETTER_EXPIRATION_HOURS;
    });
    
    // 全体の返信リスト（親のタイトルを付与）
    const replies = allUsers.filter(l => l.parent_id !== null).map(r => {
      const parent = letters.find(p => p.id === r.parent_id);
      return { ...r, parentTitle: parent?.title || '元の手紙' };
    });

    // 選択中の常設ポストへの返信を抽出
    const fixedReplies = selectedPostId ? letters.filter(l => l.parent_id === selectedPostId).map(r => {
      const parent = letters.find(p => p.id === r.parent_id);
      return { ...r, parentTitle: parent?.title || '常設ポスト' };
    }) : [];

    return { officialLetters: official, postLetters: posts, activeUserLetters: active, archivedUserLetters: archived, replyLetters: replies, currentFixedPostReplies: fixedReplies };
  }, [letters, selectedPostId]);

  const selectedPost = useMemo(() => letters.find(l => l.id === selectedPostId), [letters, selectedPostId]);

  // カード本体がクリックされた時の処理（削除ボタン等は除外）
  const handleCardClick = (letter: any, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 削除ボタンや編集リンク、またはそれらの子要素がクリックされた場合はモーダルを開かない
    if (target.closest('button') || target.closest('a')) return;
    setViewingLetter(letter);
  };

  return (
    <div className="animate-fadeIn">
      {/* --- 1. みんなの投稿タブ --- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button onClick={() => setUserSubTab('active')} className={`pb-2 px-2 text-sm font-bold transition-all ${userSubTab === 'active' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'}`}>掲載中 ({activeUserLetters.length})</button>
            <button onClick={() => setUserSubTab('archive')} className={`pb-2 px-2 text-sm font-bold transition-all ${userSubTab === 'archive' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-400'}`}>アーカイブ ({archivedUserLetters.length})</button>
            <button onClick={() => setUserSubTab('replies')} className={`pb-2 px-2 text-sm font-bold transition-all ${userSubTab === 'replies' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400'}`}>返信 ({replyLetters.length})</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userSubTab === 'active' && activeUserLetters.map(letter => (
              <div key={letter.id} onClick={(e) => handleCardClick(letter, e)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <AdminLetterCard letter={letter} onDelete={onDelete} />
              </div>
            ))}
            {userSubTab === 'replies' && replyLetters.map(letter => (
              <div key={letter.id} onClick={(e) => handleCardClick(letter, e)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <AdminLetterCard 
                  letter={{ ...letter, title: `RE: ${letter.parentTitle}` }} 
                  onDelete={onDelete} 
                />
              </div>
            ))}
          </div>
          
          {userSubTab === 'archive' && (
             <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto text-left">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b text-[10px] font-bold uppercase">
                      <tr>
                        <th className="p-4">投稿日</th>
                        <th className="p-4">タイトル</th>
                        <th className="p-4">投稿者</th>
                        <th className="p-4">通報</th>
                        <th className="p-4 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedUserLetters.map(letter => (
                        <tr key={letter.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(letter.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-bold text-gray-800 max-w-[150px] truncate cursor-pointer hover:underline" onClick={() => setViewingLetter(letter)}>{letter.title}</td>
                          <td className="p-4 text-xs">{letter.profiles?.nickname}</td>
                          <td className="p-4">
                            {letter.report_count > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{letter.report_count}件</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              <Link href={`/admin/edit/${letter.id}`} className="text-blue-600 hover:underline text-xs font-bold">編集</Link>
                              <button onClick={() => onDelete(letter.id, letter.image_url)} className="text-red-500 hover:underline text-xs font-bold">削除</button>
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

      {/* --- 2. 常設ポストタブ --- */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {!selectedPostId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {postLetters.map(letter => (
                <div key={letter.id} onClick={() => setSelectedPostId(letter.id)} className="cursor-pointer transition-transform hover:scale-[1.02] relative group">
                  <AdminLetterCard letter={letter} onDelete={onDelete} />
                  <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity font-bold">返信を表示</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-blue-50 p-5 rounded-xl border border-blue-200 mb-6 gap-4">
                <div className="text-left">
                  <h3 className="font-bold text-blue-900">📮 「{selectedPost?.title}」への返信管理 ({currentFixedPostReplies.length}通)</h3>
                  <p className="text-xs text-blue-700 mt-1 font-medium">返信カードをクリックすると、やり取りの内容を確認できます</p>
                </div>
                <button onClick={() => setSelectedPostId(null)} className="bg-white text-blue-600 px-6 py-2 rounded-full text-xs font-bold border border-blue-300 shadow-sm hover:shadow-md transition-all active:scale-95">← ポスト一覧へ戻る</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentFixedPostReplies.map(reply => (
                  <div key={reply.id} onClick={(e) => handleCardClick(reply, e)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                    <AdminLetterCard 
                      letter={{ ...reply, title: `RE: ${reply.parentTitle}` }} 
                      onDelete={onDelete} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 3. 運営の投稿タブ --- */}
      {activeTab === 'official' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
          {officialLetters.map(letter => (
            <div key={letter.id} onClick={(e) => handleCardClick(letter, e)} className="cursor-pointer transition-transform hover:scale-[1.02]">
              <AdminLetterCard letter={letter} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}

      {/* 詳細表示モーダル */}
      {viewingLetter && (
        viewingLetter.is_postcard ? (
          <PostcardModal letter={viewingLetter} currentUser={null} onClose={() => setViewingLetter(null)} />
        ) : (
          <LetterModal letter={viewingLetter} currentUser={null} onClose={() => setViewingLetter(null)} />
        )
      )}
    </div>
  );
}