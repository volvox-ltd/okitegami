'use client';
import { useState, useEffect } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import Link from 'next/link';
import IconUserLetter from '@/components/IconUserLetter'; // ★アイコンをインポート

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string;
  title: string;
  spot_name: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  nickname?: string; 
};

type Props = {
  post: any; 
  currentUser: User | null;
  onClose: () => void;
  isReachable: boolean; 
};

export default function PostModal({ post, currentUser, onClose, isReachable }: Props) {
  const [activeTab, setActiveTab] = useState<'read' | 'write'>('read');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPostedToday, setHasPostedToday] = useState(false);

  // 獲得した切手のデータ表示用
  const [obtainedStamp, setObtainedStamp] = useState<{name: string, image_url: string} | null>(null);

  useEffect(() => {
    fetchPostData();
  }, [post, currentUser]);

  const fetchPostData = async () => {
    setIsLoading(true);
    const { data: recentLetters } = await supabase
      .from('letters')
      .select('*')
      .eq('parent_id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    let lettersWithNames: Letter[] = [];
    if (recentLetters && recentLetters.length > 0) {
      const userIds = Array.from(new Set(recentLetters.map(l => l.user_id)));
      const { data: profiles } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => nameMap[p.id] = p.nickname);
      
      lettersWithNames = recentLetters.map((l: any) => ({
        ...l,
        nickname: nameMap[l.user_id] || '誰か'
      }));
    }
    setLetters(lettersWithNames);

    const { count } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', post.id);
    setTotalCount(count || 0);

    if (currentUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: myTodayPost } = await supabase
        .from('letters')
        .select('id')
        .eq('parent_id', post.id)
        .eq('user_id', currentUser.id)
        .gte('created_at', today.toISOString())
        .maybeSingle();
      
      if (myTodayPost) setHasPostedToday(true);
      else setHasPostedToday(false);
    }

    setIsLoading(false);
  };

  const handlePost = async () => {
    if (!content.trim()) return alert('メッセージを入力してください');
    if (content.length > 140) return alert('140文字以内で入力してください');
    if (!currentUser) return alert('ログインが必要です');
    
    setIsSubmitting(true);

    try {
      // 1. 手紙を保存
      const { error: letterError } = await supabase.from('letters').insert({
        title: 'ポストへの手紙', 
        content: content,
        spot_name: post.spot_name,
        lat: post.lat,
        lng: post.lng,
        user_id: currentUser.id,
        parent_id: post.id,
        is_official: false,
      });

      if (letterError) throw letterError;

      // 2. 切手付与ロジック
      if (post.attached_stamp_id) {
        const { data: existingEntry } = await supabase
          .from('user_stamps')
          .select('count')
          .eq('user_id', currentUser.id)
          .eq('stamp_id', post.attached_stamp_id)
          .maybeSingle();

        const newCount = (existingEntry?.count || 0) + 1;

        const { error: stampError } = await supabase
          .from('user_stamps')
          .upsert({
            user_id: currentUser.id,
            stamp_id: post.attached_stamp_id,
            count: newCount,
            last_obtained_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id, stamp_id' 
          });
          
        if (stampError) {
          console.error('切手DB更新エラー:', stampError);
        } else {
          const { data: stampData } = await supabase
            .from('stamps')
            .select('name, image_url')
            .eq('id', post.attached_stamp_id)
            .single();
            
          if (stampData) {
            // ★体感速度向上のため、リセットとセットを極力早く行う
            setObtainedStamp(null);
            setObtainedStamp(stampData);
          }
        }
      } else {
        alert('手紙を投函しました！');
      }

      setContent('');
      setActiveTab('read');
      setHasPostedToday(true);
      fetchPostData(); 

    } catch (e: any) {
      console.error('投函プロセスエラー:', e);
      alert('投稿に失敗しました: ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 切手獲得モーダル（最前面） */}
      {obtainedStamp && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-[#fdfcf5] p-8 rounded-sm shadow-2xl flex flex-col items-center animate-bounce-in pointer-events-auto border-4 border-double border-[#5d4037]/20 max-w-xs relative font-sans text-center">
            <h3 className="font-bold text-[#5d4037] mb-4 font-serif text-lg tracking-widest leading-relaxed">
              切手を受け取りました
            </h3>
            
            <div className="w-24 h-32 border-4 border-white shadow-lg rotate-3 mb-5 bg-white p-1">
              <div className="w-full h-full border border-gray-100 flex items-center justify-center bg-gray-50">
                <img src={obtainedStamp.image_url} className="w-full h-full object-contain" alt="stamp" />
              </div>
            </div>
            
            <p className="font-bold text-sm text-[#5d4037] mb-1 font-serif">{obtainedStamp.name}</p>
            <p className="text-[10px] text-gray-400 mb-6 font-serif">切手帳に記録されました</p>
            
            <button 
              onClick={() => setObtainedStamp(null)}
              className="bg-[#5d4037] text-white text-xs font-bold px-8 py-2.5 rounded-full shadow hover:bg-[#4a332d] transition-colors tracking-wider"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ポスト本体：★枠線を border-red-600 に変更 */}
      <div className="relative w-full max-w-md h-[85vh] md:h-[600px] bg-[#fdfcf5] rounded-xl shadow-2xl flex flex-col overflow-hidden border-4 border-red-600 font-sans">
        
        {/* ヘッダー：★背景色を bg-red-600 に変更 */}
        <div className="bg-red-600 text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ★アイコンを地図と同じ IconUserLetter に変更 */}
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
               <IconUserLetter className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold font-serif text-lg tracking-widest">{post.title}</h2>
              <p className="text-[10px] opacity-80">これまでに {totalCount} 通の手紙が届いています</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-sans">✕</button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 shrink-0 bg-white">
          <button 
            onClick={() => setActiveTab('read')} 
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'read' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400'}`}
          >
            手紙を見る
          </button>
          <button 
            onClick={() => setActiveTab('write')} 
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'write' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}
          >
            投函する
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#fdfcf5]">
          
          {activeTab === 'read' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded border border-red-100 shadow-sm relative font-serif">
                <div className="absolute -top-3 left-4 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                  {post.spot_name || post.title}の手紙
                </div>
                
                {post.image_url && (
                  <div className="mt-2 mb-4 rounded overflow-hidden border border-gray-100">
                    <img src={post.image_url} alt="Main" className="w-full h-auto object-cover" />
                  </div>
                )}

                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-loose mt-2">
                  {post.content?.replace(/<<<PAGE>>>/g, "\n\n")}
                </p>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-4">
                <h3 className="text-xs font-bold text-gray-500 mb-3 text-center font-sans">最近届いた手紙</h3>
                
                {isLoading ? (
                  <p className="text-center text-xs text-gray-400">読み込み中...</p>
                ) : letters.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">まだ手紙はありません。一番乗りで書きませんか？</p>
                ) : (
                  <div className="space-y-3">
                    {letters.map(l => (
                      <div key={l.id} className="bg-white p-3 rounded shadow-sm border border-gray-100">
                        <div className="flex justify-between items-end mb-2 border-b border-gray-100 pb-1 font-sans">
                          <span className="text-xs font-bold text-gray-600">{l.nickname || '名無し'}さん</span>
                          <span className="text-[10px] text-gray-400">{new Date(l.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-serif text-bunko-ink leading-relaxed whitespace-pre-wrap">
                          {l.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-center pt-2">
                <button className="text-xs text-gray-400 underline hover:text-red-600 font-sans font-bold">
                  すべてのアーカイブを読む（{totalCount}通）
                </button>
              </div>
            </div>
          )}

          {activeTab === 'write' && (
            <div className="h-full flex flex-col items-center justify-start pt-4 font-sans">
              {!currentUser ? (
                <div className="text-center mt-10">
                  <p className="text-sm text-gray-600 mb-4 font-bold">手紙を投函するにはログインが必要です。</p>
                  <Link href={`/login?next=${encodeURIComponent('/?open_post=' + post.id)}`} className="bg-red-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-md">
                  ログインする
                  </Link>
                </div>
              ) : !isReachable ? (
                <div className="text-center mt-10 p-6 bg-gray-100 rounded-lg">
                  <span className="text-2xl block mb-2">🏃‍♂️</span>
                  <p className="text-sm font-bold text-gray-700 mb-2">距離が遠すぎます</p>
                  <p className="text-xs text-gray-500">ポストに手紙を投函するには、<br/>現地に近づく必要があります。</p>
                </div>
              ) : hasPostedToday ? (
                <div className="text-center mt-10 p-6 bg-orange-50 rounded-lg border border-orange-100 font-sans">
                  <span className="text-2xl block mb-2 font-bold">☕️</span>
                  <p className="text-sm font-bold text-orange-800 mb-2">本日の投函は完了しています</p>
                  <p className="text-xs text-orange-600">このポストへの投函は1日1回までです。<br/>また明日お越しください。</p>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col font-sans">
                  <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mb-4 border border-yellow-100">
                    <p className="font-bold mb-1">🎁 投函特典</p>
                    <p>このポストに手紙を入れると、限定の「記念切手」がもらえます。</p>
                  </div>

                  <textarea
                    className="w-full flex-1 p-4 border border-gray-300 rounded-lg resize-none font-serif text-sm leading-loose focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none mb-2"
                    placeholder="ここに手紙を書いてください（140文字以内）"
                    maxLength={140}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="text-right text-[10px] text-gray-400 mb-4 font-bold">
                    {content.length} / 140文字
                  </div>

                  <button
                    onClick={handlePost}
                    disabled={isSubmitting || !content.trim()}
                    className="w-full bg-orange-600 text-white font-bold py-3 rounded-full shadow-md hover:bg-orange-700 disabled:bg-gray-300 transition-colors font-sans"
                  >
                    {isSubmitting ? '投函中...' : 'ポストに投函する'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
}