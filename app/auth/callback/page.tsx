'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // ブラウザのURLから認証コード(code)を取得する
    const code = new URL(window.location.href).searchParams.get('code');

    if (code) {
      // コードを使って認証を完了させる
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          // 成功したらトップページへ
          router.push('/');
        } else {
          console.error(error);
          alert('認証に失敗しました。もう一度お試しください。');
          router.push('/login');
        }
      });
    } else {
      // コードがない場合はトップへ戻す
      router.push('/');
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#f7f4ea]">
      <div className="text-center">
        <p className="text-xl mb-2">💌</p>
        <p className="text-gray-500 font-serif text-sm animate-pulse">
          認証しています...
        </p>
      </div>
    </div>
  );
}