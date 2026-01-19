'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { compressStamp } from '@/utils/imageControl';

// Supabaseクライアントの初期化
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Stamp = {
  id: number;
  name: string;
  image_url: string;
  description: string;
};

type AdminStampManagerProps = {
  stamps: Stamp[];
  onUpdate: () => void; // データを再取得するためのコールバック
};

export default function AdminStampManager({ stamps, onUpdate }: AdminStampManagerProps) {
  const [isUploading, setIsUploading] = useState(false);

  // 新しい切手のアップロード処理
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const stampName = prompt("切手の名前を入力してください");
    if (!stampName) return;

    setIsUploading(true);
    try {
      // 1. 画像の圧縮
      const compressedFile = await compressStamp(file);
      const fileName = `stamps/${Date.now()}.webp`;

      // 2. Storageへアップロード
      const { error: uploadError } = await supabase.storage
        .from('letter-images')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      // 3. 公開URLの取得
      const publicUrl = supabase.storage.from('letter-images').getPublicUrl(fileName).data.publicUrl;

      // 4. データベース（stampsテーブル）に登録
      const { error: dbError } = await supabase.from('stamps').insert({
        name: stampName,
        image_url: publicUrl,
        description: `${stampName}の公式切手`
      });

      if (dbError) throw dbError;

      alert("切手を追加しました");
      onUpdate(); // 親コンポーネントのデータを更新
    } catch (e: any) {
      alert("アップロードエラー: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-bold text-lg text-gray-800">切手（スタンプ）一覧</h2>
          <p className="text-[10px] text-gray-400 font-sans mt-1">
            ※追加された切手は全ユーザーが「切手帳」で確認・獲得できるようになります。
          </p>
        </div>
        
        <label className={`px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm
          ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
        >
          {isUploading ? '処理中...' : '新しく切手を追加'}
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleStampUpload} 
            disabled={isUploading}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stamps.map(stamp => (
          <div key={stamp.id} className="border border-gray-100 p-4 rounded-xl flex flex-col items-center gap-3 bg-gray-50 hover:shadow-sm transition-shadow">
            <div className="w-20 h-24 bg-white border border-gray-200 rounded p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
              <img 
                src={stamp.image_url} 
                alt={stamp.name} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold text-gray-700 truncate w-full px-1">{stamp.name}</p>
              <p className="text-[9px] text-gray-400 font-mono">ID: {stamp.id}</p>
            </div>
          </div>
        ))}
      </div>

      {stamps.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm italic font-serif">登録されている切手はありません。</p>
        </div>
      )}
    </div>
  );
}