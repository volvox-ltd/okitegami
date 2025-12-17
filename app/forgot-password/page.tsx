'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setMessage('エラーが発生しました: ' + error.message);
    } else {
      setMessage('パスワード再設定用のメールを送信しました。メールをご確認ください。');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4ea] px-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-xl font-bold text-center mb-6 text-bunko-ink font-serif">パスワードの再設定</h2>
        
        {message ? (
          <div className="text-sm text-green-700 bg-green-50 p-4 rounded mb-4">
            {message}
            <div className="mt-4 text-center">
              <Link href="/login" className="text-blue-600 underline">ログイン画面に戻る</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">登録メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
                placeholder="example@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-700 text-white rounded-full font-bold shadow-md hover:bg-green-800 transition-colors disabled:bg-gray-400"
            >
              {loading ? '送信中...' : '再設定メールを送る'}
            </button>
            <div className="text-center mt-4">
              <Link href="/login" className="text-xs text-gray-500 hover:text-green-700">キャンセルして戻る</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}