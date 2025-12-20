'use client'; // エラーコンポーネントは必ずClient Componentである必要があります

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // コンソールにエラーログを出力
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfcf5] p-4 text-bunko-ink">
      <h2 className="mb-4 text-lg font-bold">予期せぬエラーが発生しました</h2>
      <p className="mb-6 text-sm text-gray-500">
        申し訳ありません。読み込み中に問題が発生しました。
      </p>
      <button
        onClick={
          // セグメントを再レンダリングして回復を試みる
          () => reset()
        }
        className="rounded-full bg-green-700 px-6 py-2 text-sm font-bold text-white shadow hover:bg-green-800 transition-colors"
      >
        もう一度試す
      </button>
    </div>
  );
}