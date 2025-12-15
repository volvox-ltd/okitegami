'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

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
};

export default function LetterPage() {
  const { id } = useParams();
  const [letter, setLetter] = useState<Letter | null>(null);

  useEffect(() => {
    const fetchLetter = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setLetter(data);
    };
    fetchLetter();
  }, [id]);

  if (!letter) return <div className="p-10 text-center font-serif text-bunko-gray">頁をめくっています...</div>;

  return (
    // 全体を横スクロール可能にするコンテナ（縦書きは横に伸びるため）
    <main className="h-screen w-full bg-bunko-paper overflow-x-auto overflow-y-hidden flex flex-row-reverse items-center p-4 md:p-10">
      
      {/* 閉じるボタン（右上に固定） */}
      <Link 
        href="/" 
        className="fixed top-6 right-6 z-50 text-bunko-gray hover:text-bunko-red transition-colors writing-horizontal font-serif text-sm tracking-widest bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm"
      >
        地図へ戻る
      </Link>

      {/* 手紙の本文エリア（ここから縦書き） */}
      <div 
        className="h-[80vh] py-10 px-16 bg-white shadow-sm border border-bunko-gray/10 mx-auto max-w-none flex flex-col items-start gap-8"
        style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
      >
        
        {/* タイトルと場所（一番右にくる） */}
        <div className="flex flex-col items-center gap-4 ml-8 pt-4">
          <h1 className="text-2xl font-bold tracking-widest text-bunko-ink border-l border-bunko-red pl-4">
            {letter.title}
          </h1>
          <p className="text-xs text-bunko-gray tracking-wider mt-2">
            {letter.spot_name} にて
          </p>
        </div>

        {/* 写真があれば表示（縦書きの中に入れ込む） */}
        {letter.image_url && (
          <div className="my-4 pl-4">
            <img 
              src={letter.image_url} 
              alt={letter.spot_name} 
              className="max-h-[60vh] max-w-[300px] object-cover rounded shadow-inner filter sepia-[.2] contrast-[.9]"
            />
          </div>
        )}

        {/* 本文 */}
        <div className="text-base leading-loose tracking-widest text-bunko-ink whitespace-pre-wrap font-medium h-full pt-4">
          {letter.content || "（本文がまだありません）"}
        </div>

        {/* 署名（一番左にくる） */}
        <div className="mt-auto pt-20 pl-4 text-sm text-bunko-gray self-end">
          木林より
        </div>

      </div>

      {/* 余白調整用のダミー要素（スクロールの端をきれいにするため） */}
      <div className="w-10 flex-shrink-0"></div>

    </main>
  );
}