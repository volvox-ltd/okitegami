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
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // ★エラー専用のステートを追加

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/update-password`,
    });

    if (error) {
      // ★エラーメッセージを日本語に翻訳
      if (error.message.includes('8 seconds')) {
        setErrorMsg('セキュリティのため、連続での送信はできません。少し待ってから再度お試しください。');
      } else {
        setErrorMsg('エラーが発生しました: ' + error.message);
      }
    } else {
      setMessage('パスワード再設定用のメールを送信しました。メール内のリンクをクリックして手続きを進めてください。');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4ea] px-4 font-sans text-left">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-xl font-bold text-center mb-6 text-bunko-ink font-serif tracking-widest">パスワードの再設定</h2>
        
        {message ? (
          <div className="text-sm text-green-700 bg-green-50 p-6 rounded-xl border border-green-100 leading-relaxed">
            {message}
            <div className="mt-6 text-center">
              <Link href="/login" className="bg-green-700 text-white px-6 py-2 rounded-full text-xs font-bold shadow-sm">ログイン画面に戻る</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            {/* ★エラー表示エリア */}
            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 font-bold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">登録メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none text-sm font-sans"
                placeholder="example@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-700 text-white rounded-full font-bold shadow-md hover:bg-green-800 transition-all active:scale-[0.98] disabled:bg-gray-300 text-sm tracking-widest"
            >
              {loading ? '送信中...' : '再設定メールを送る'}
            </button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-green-700 transition-colors">キャンセルして戻る</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}