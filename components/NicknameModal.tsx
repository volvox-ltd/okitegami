'use client';
import { useState } from 'react';
// ★ 修正：共通クライアントを使用してMultiple GoTrueClient警告を解消
import { supabase } from '@/utils/supabase'; 
import { User } from '@supabase/supabase-js';

type Props = {
  user: User;
  onRegistered: (nickname: string) => void;
};

export default function NicknameModal({ user, onRegistered }: Props) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. 半角英数字チェック
    if (!/^[a-zA-Z0-9]+$/.test(nickname)) {
      setError('ニックネームは半角英数字のみ使えます');
      setLoading(false);
      return;
    }

    try {
      // 2. 保存を試みる
      const { error: dbError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          nickname: nickname
        });

      if (dbError) {
        // ユニーク制約エラー（コード 23505）の場合
        if (dbError.code === '23505') {
          throw new Error('そのニックネームは既に使用されています');
        }
        throw dbError;
      }

      // 成功したら親コンポーネントに通知
      alert(`ようこそ、${nickname}さん！`);
      onRegistered(nickname);

    } catch (err: any) {
      console.error(err);
      setError(err.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2 font-serif">はじめまして</h2>
        <p className="text-sm text-gray-500 mb-6">
          木林のおきてがみへようこそ。<br/>
          まずはあなたのニックネームを教えてください。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ニックネーム (半角英数)"
              className="w-full border-2 border-gray-200 rounded-lg p-3 text-lg text-center focus:border-green-500 focus:outline-none transition-colors font-mono"
              required
              minLength={3}
              maxLength={15}
            />
            <p className="text-[10px] text-gray-400 mt-1">※後から変更できません / 半角英数のみ</p>
          </div>

          {error && <p className="text-xs text-red-500 font-bold animate-pulse">{error}</p>}

          <button 
            type="submit" 
            disabled={loading || !nickname}
            className={`w-full py-3 rounded-full font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800 hover:scale-105 shadow-lg'}`}
          >
            {loading ? '確認中...' : 'これで始める'}
          </button>
        </form>
      </div>
    </div>
  );
}