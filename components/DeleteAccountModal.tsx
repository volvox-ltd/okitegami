'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Props = {
  onClose: () => void;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DeleteAccountModal({ onClose }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // SQLで作った関数を呼び出す
      const { error } = await supabase.rpc('delete_own_user');
      if (error) throw error;

      // ログアウト処理
      await supabase.auth.signOut();
      
      alert('退会手続きが完了しました。ご利用ありがとうございました。');
      router.push('/');
      router.refresh(); // 状態リセット
    } catch (e: any) {
      console.error(e);
      alert('削除に失敗しました: ' + e.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
        <h3 className="font-bold text-red-600 text-lg mb-2">退会の確認</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed text-left bg-gray-50 p-4 rounded-lg">
          アカウントを削除すると、以下のデータが<span className="font-bold">すべて完全に消去</span>され、復元することはできません。
          <br/><br/>
          ・これまでの投稿した手紙<br/>
          ・集めた切手や履歴<br/>
          ・お気に入りリスト
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-3 bg-red-600 text-white rounded-full font-bold shadow hover:bg-red-700 transition-colors disabled:bg-gray-400"
          >
            {isDeleting ? '処理中...' : '全て削除して退会する'}
          </button>
          
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}