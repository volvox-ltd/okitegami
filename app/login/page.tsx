'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLoginMode) {
        // ログイン処理
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        // 新規登録処理
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('確認メールを送信しました。（または登録完了しました）');
      }
    } catch (error: any) {
      setMessage('エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f4ea] p-4 font-serif">
      <div className="bg-white p-8 rounded shadow-lg max-w-sm w-full border border-gray-200">
        <h1 className="text-xl text-center mb-6 text-bunko-ink font-bold tracking-widest">
          {isLoginMode ? 'ログイン' : '新規登録'}
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs text-bunko-gray mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:border-orange-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-bunko-gray mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:border-orange-500 outline-none"
              required
            />
          </div>

          {message && <p className="text-xs text-red-500 text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            // ↓↓ ここを修正：確実にオレンジになるよう bg-orange-500 を指定 ↓↓
            className="w-full bg-orange-500 text-white py-2 rounded-full hover:bg-orange-600 transition-colors font-bold shadow-sm"
          >
            {loading ? '処理中...' : (isLoginMode ? 'ログインする' : '登録する')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setMessage('');
            }}
            className="text-xs text-bunko-gray underline hover:text-bunko-ink"
          >
            {isLoginMode ? '初めての方はこちら（新規登録）' : 'アカウントをお持ちの方（ログイン）'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
             <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
                 地図に戻る
             </Link>
        </div>
      </div>
    </div>
  );
}