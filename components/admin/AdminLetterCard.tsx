'use client';

import Link from 'next/link';
import IconAdminLetter from '@/components/IconAdminLetter';
import IconUserLetter from '@/components/IconUserLetter';
import IconPost from '@/components/IconPost';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

type LetterCardProps = {
  letter: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_official?: boolean;
    is_post?: boolean;
    image_url?: string;
    report_count: number;
    profiles?: {
      nickname: string;
      email?: string | null;
    };
  };
  onDelete: (id: string, imageUrl?: string) => void;
};

export default function AdminLetterCard({ letter, onDelete }: LetterCardProps) {
  // 期限切れ判定（公式とポスト以外）
  const isExpired = 
    !letter.is_official && 
    !letter.is_post && 
    (new Date().getTime() - new Date(letter.created_at).getTime()) / 3600000 > LETTER_EXPIRATION_HOURS;

  // 通報あり判定
  const isReported = letter.report_count > 0;

  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden 
      ${isReported 
        ? 'bg-red-50 border-red-400' 
        : letter.is_post 
          ? 'bg-red-50 border-red-200' 
          : letter.is_official 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-white border-gray-200'
      }`}
    >
      {/* 通報バッジ */}
      {isReported && (
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 absolute top-0 right-0 rounded-bl-lg z-10 font-sans">
          ⚠️ {letter.report_count}件の通報
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {/* アイコンの出し分け */}
          {letter.is_post ? (
            <div className="text-red-600"><IconPost className="w-8 h-8" /></div>
          ) : letter.is_official ? (
            <IconAdminLetter className="w-8 h-8" />
          ) : (
            <IconUserLetter className="w-8 h-8 text-gray-400" />
          )}
          
          <div>
            <h3 className="font-bold text-sm text-gray-800 line-clamp-1 font-serif">{letter.title}</h3>
            <p className="text-[10px] text-gray-400 font-sans">
              {new Date(letter.created_at).toLocaleDateString()} {new Date(letter.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>

        {/* 状態ラベル */}
        <div className="text-[10px] font-bold font-sans">
          {letter.is_post ? (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">ポスト</span>
          ) : letter.is_official ? (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200">公式</span>
          ) : isExpired ? (
            <span className="bg-gray-200 text-gray-500 px-2 py-1 rounded">期限切れ</span>
          ) : (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">掲載中</span>
          )}
        </div>
      </div>

      {/* コンテンツ本文 */}
      <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border border-gray-100 h-16 overflow-hidden leading-relaxed font-serif">
        {letter.content}
      </div>

      {/* 画像有無の表示 */}
      {letter.image_url && (
        <div className="text-[10px] text-blue-500 font-sans">
          📷 画像あり {letter.image_url.includes('archive') && <span className="text-orange-500">(軽量化済)</span>}
        </div>
      )}

      {/* 投稿者情報（公式以外） */}
      {!letter.is_official && (
        <div className="text-[10px] text-gray-400 border-t pt-2 mt-auto font-sans">
          User: {letter.profiles?.nickname || '不明'} 
          {letter.profiles?.email && <span className="ml-1">({letter.profiles.email})</span>}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 font-sans">
        <Link 
          href={`/admin/edit/${letter.id}`} 
          className="flex-1 text-center text-xs bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100 font-bold"
        >
          編集
        </Link>
        <button 
          onClick={() => onDelete(letter.id, letter.image_url)} 
          className="flex-1 text-center text-xs bg-red-50 text-red-600 py-2 rounded hover:bg-red-100 font-bold"
        >
          削除
        </button>
      </div>
    </div>
  );
}