'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordConfirm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // このページに到達した時点で、Supabaseがセッションを確立しているはずです
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setMessage('エラー: ' + error.message);
      setLoading(false);
    } else {
      alert('パスワードを変更しました！');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4ea] px-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-xl font-bold text-center mb-6 text-bunko-ink font-serif">新しいパスワードの設定</h2>
        
        {message && <p className="text-red-500 text-sm mb-4">{message}</p>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">新しいパスワード</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
              placeholder="6文字以上"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-700 text-white rounded-full font-bold shadow-md hover:bg-green-800 transition-colors disabled:bg-gray-400"
          >
            {loading ? '変更する' : 'パスワードを変更'}
          </button>
        </form>
      </div>
    </div>
  );
}