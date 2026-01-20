'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { getDistance } from 'geolib';

type Recommendation = {
  id: string;
  title: string;
  author: string;
  comment: string;
  sort_order: number;
};

type Bookmark = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  nickname?: string;
};

type Props = {
  bookstore: any;
  onClose: () => void;
  currentUser: User | null;
  userLocation?: { lat: number; lng: number } | null; // 現在地判定用に追加
  isMyPage?: boolean;
};

export default function BookstoreModal({ bookstore, onClose, currentUser, userLocation, isMyPage = false}: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'bookmarks'>('info');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 投稿用ステート
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPostedToday, setHasPostedToday] = useState(false);

  // 距離判定（30m以内）
  const isReachable = userLocation ? getDistance(
    { latitude: userLocation.lat, longitude: userLocation.lng },
    { latitude: bookstore.lat, longitude: bookstore.lng }
  ) <= 30 : false;

  // 1. おすすめ本と投稿制限の初期取得
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // おすすめ本の取得
      const { data: recs } = await supabase
        .from('bookstore_recommendations')
        .select('*')
        .eq('bookstore_id', bookstore.id)
        .order('sort_order', { ascending: true });
      if (recs) setRecommendations(recs);

      // 今日の投稿チェック
      if (currentUser) {
        const { data: recentLog } = await supabase
          .from('bookstore_post_logs')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('bookstore_id', bookstore.id)
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();
        setHasPostedToday(!!recentLog);
      }
      setIsLoading(false);
    };
    init();
  }, [bookstore.id, currentUser]);

  // 2. 栞（数珠繋ぎ）の取得
  const fetchBookmarks = useCallback(async () => {
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .eq('parent_id', bookstore.id)
      .eq('is_bookmark', true)
      .order('created_at', { ascending: true }); // 古い順に並べて「繋がり」を出す

    if (data) {
      const userIds = Array.from(new Set(data.map(l => l.user_id)));
      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => nameMap[p.id] = p.nickname);
      
      setBookmarks(data.map(l => ({
        ...l,
        nickname: nameMap[l.user_id] || '誰か'
      })));
    }
  }, [bookstore.id]);

  useEffect(() => {
    if (activeTab === 'bookmarks') fetchBookmarks();
  }, [activeTab, fetchBookmarks]);

  // 3. 栞を挟む（投稿）処理
  const handlePostBookmark = async () => {
    if (!content.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const { error: letterError } = await supabase.from('letters').insert({
        title: '栞のメモ',
        content: content,
        spot_name: bookstore.name,
        lat: bookstore.lat,
        lng: bookstore.lng,
        user_id: currentUser.id,
        parent_id: bookstore.id,
        is_bookmark: true, // 栞フラグ
        is_official: false
      });
      if (letterError) throw letterError;

      await supabase.from('bookstore_post_logs').insert({
        user_id: currentUser.id,
        bookstore_id: bookstore.id
      });

      setContent('');
      setHasPostedToday(true);
      fetchBookmarks();
    } catch (e) {
      alert('栞を残せませんでした');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md h-[85vh] md:h-[600px] bg-[#fdfcf5] rounded-xl shadow-2xl flex flex-col overflow-hidden border-4 border-[#2d4139] font-sans">
        
        {/* ヘッダー */}
        <div className="bg-[#2d4139] text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
              <span className="text-xl">📖</span>
            </div>
            <div className="text-left">
              <h2 className="font-bold font-serif text-lg tracking-widest">{bookstore.name}</h2>
              <p className="text-[10px] opacity-80">
                {activeTab === 'info' ? `おすすめの本が ${recommendations.length} 冊あります` : `繋がった栞が ${bookmarks.length} 枚あります`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>

        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200 shrink-0 bg-white">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'info' ? 'text-[#2d4139] border-b-2 border-[#2d4139]' : 'text-gray-400'}`}
          >
            店主の手紙
          </button>
          <button 
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'bookmarks' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}
          >
            栞にメモする
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#fdfcf5] custom-scrollbar">
          {activeTab === 'info' ? (
            /* --- 店主の手紙 & おすすめ本 --- */
            <div className="space-y-6">
              <div className="bg-white p-4 rounded border border-green-100 shadow-sm relative font-serif text-left">
                <div className="absolute -top-3 left-4 bg-green-50 text-[#2d4139] text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                  {bookstore.name}さんの手紙
                </div>
                {bookstore.image_url && (
                  <div className="mt-2 mb-4 flex justify-center">
                    <Image src={bookstore.image_url} alt="store" width={400} height={300} className="rounded shadow-sm border-4 border-white object-cover" />
                  </div>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-loose mt-2 italic">{bookstore.description}</p>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-4 text-left">
                <h3 className="text-xs font-bold text-gray-500 mb-4 text-center font-sans tracking-widest uppercase">店主がお薦めする本</h3>
                <div className="space-y-4">
                  {recommendations.map((book) => (
                    <div key={book.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex gap-4 animate-fadeIn">
                      <div className="w-16 h-24 bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center text-[10px] text-gray-300 font-serif shadow-inner">Cover</div>
                      <div className="flex flex-col justify-start">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 rounded">#{book.sort_order}</span>
                          <span className="text-xs font-bold text-gray-800">{book.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">{book.author}</p>
                        <p className="text-xs font-serif text-gray-600 leading-relaxed bg-gray-50 p-2 rounded">{book.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* --- 栞の数珠繋ぎ --- */
            <div className="flex flex-col items-center">
              <div className="w-full space-y-0 relative pl-4">
                {/* 数珠繋ぎの紐を表現する縦線 */}
                <div className="absolute left-[31px] top-0 bottom-0 w-0.5 bg-orange-200 border-l border-dashed border-orange-300"></div>
                
                {bookmarks.map((bm, i) => (
                  <div key={bm.id} className="relative mb-6 animate-fadeIn">
                    {/* 栞の頭部分 */}
                    <div className="absolute -left-6 top-2 w-4 h-4 rounded-full bg-orange-400 border-2 border-white shadow-sm z-10"></div>
                    
                    <div className="bg-white p-4 rounded-r-lg rounded-bl-lg shadow-sm border-l-4 border-orange-400 ml-4 font-serif text-left">
                      <p className="text-xs text-gray-700 leading-relaxed">{bm.content}</p>
                      <div className="mt-2 flex justify-between items-center border-t border-orange-50 pt-1">
                        <span className="text-[9px] text-orange-700 font-bold">{bm.nickname} さん</span>
                        <span className="text-[8px] text-gray-300">{new Date(bm.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 入力フォーム（現地にいる時のみ） */}
                {!isMyPage && isReachable && !hasPostedToday && currentUser && (
                  <div className="mt-8 ml-4 p-4 bg-orange-50 rounded-lg border-2 border-dashed border-orange-200 animate-pulse-subtle">
                    <textarea 
                      className="w-full p-3 bg-white border border-orange-100 rounded text-xs font-serif leading-relaxed focus:ring-1 focus:ring-orange-400 outline-none resize-none"
                      placeholder="前の人の栞を読んで、あなたも一言残しませんか？"
                      maxLength={140}
                      rows={3}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                    <button 
                      onClick={handlePostBookmark}
                      disabled={isSubmitting || !content.trim()}
                      className="mt-3 w-full bg-orange-600 text-white text-[10px] font-bold py-2 rounded-full shadow hover:bg-orange-700 disabled:bg-gray-300"
                    >
                      栞を挟む
                    </button>
                  </div>
                )}

                {/* 制限や未ログインの表示 */}
                {(!isReachable || hasPostedToday || !currentUser) && (
                  <div className="mt-4 ml-4 p-4 text-center bg-gray-50 rounded border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-serif leading-relaxed">
                      {!currentUser ? 'ログインすると栞を挟めます' : 
                       !isReachable ? '本屋さんに近づくと栞を挟めます' : 
                       '今日の栞はもう挟みました。また明日。'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-gray-100 text-[10px] text-gray-400 text-center font-sans">
          📍 {bookstore.address}
        </div>
      </div>
    </div>
  );
}