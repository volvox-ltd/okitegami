'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  // フォームの状態
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [content, setContent] = useState('');
  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  
  // 画像関連の状態
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // 現在の画像URL
  const [newImageFile, setNewImageFile] = useState<File | null>(null);         // 新しい画像ファイル
  const [isImageDeleted, setIsImageDeleted] = useState(false);                 // 画像削除フラグ

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 地図の表示位置
  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  // 既存データの読み込み
  useEffect(() => {
    const fetchLetter = async () => {
      if(!id) return;
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        alert('読み込みエラー');
        router.push('/admin');
      } else if (data) {
        setTitle(data.title);
        setSpotName(data.spot_name);
        setContent(data.content || '');
        setLat(data.lat);
        setLng(data.lng);
        setCurrentImageUrl(data.image_url); // 現在の画像URLをセット
        
        setViewState(prev => ({ ...prev, latitude: data.lat, longitude: data.lng }));
        setIsLoading(false);
      }
    };
    fetchLetter();
  }, [id, router]);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // 上書き保存の処理（ここが複雑です！）
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 最終的にデータベースに保存する画像URL（初期値は現在のもの）
      let finalImageUrl = currentImageUrl;

      // --- 画像処理のロジック ---

      // パターンA: 「画像を削除」ボタンが押されていた場合
      if (isImageDeleted && currentImageUrl) {
        // Storageから古い画像を削除する
        const oldFileName = currentImageUrl.split('/').pop(); // URLの末尾からファイル名を取得
        if (oldFileName) {
          await supabase.storage.from('letter-images').remove([oldFileName]);
        }
        finalImageUrl = null; // DBにはnullを保存する
      }

      // パターンB: 新しい画像が選択された場合（差し替え または 新規追加）
      if (newImageFile) {
        // もし古い画像があって、まだ削除フラグが立っていなければ、容量節約のために古いものを消す
        if (currentImageUrl && !isImageDeleted) {
           const oldFileName = currentImageUrl.split('/').pop();
           if (oldFileName) {
             await supabase.storage.from('letter-images').remove([oldFileName]);
           }
        }

        // 新しい画像をアップロード
        const fileExt = newImageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, newImageFile);
        
        if (uploadError) throw uploadError;

        // 新しいURLを取得
        const { data: urlData } = supabase.storage
          .from('letter-images')
          .getPublicUrl(fileName);
        
        finalImageUrl = urlData.publicUrl;
      }

      // --- データベース更新 ---
      const { error } = await supabase
        .from('letters')
        .update({
          title, 
          spot_name: spotName, 
          content,
          lat,
          lng,
          image_url: finalImageUrl // 決定した画像URLを保存
        })
        .eq('id', id);

      if (error) throw error;

      alert('手紙を更新しました！');
      router.push('/admin');

    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mapToken) return <div>Map Token Error</div>;
  if (isLoading) return <div className="p-10">データを読み込んでいます...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* 左側：編集フォーム */}
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto border-r border-orange-200 h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">📝 手紙の編集</h1>
          <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:underline">キャンセル</button>
        </div>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">タイトル</label>
            <input 
              type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-300 outline-none"
              value={title} onChange={(e) => setTitle(e.target.value)} required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">場所の名前</label>
            <input 
              type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-300 outline-none"
              value={spotName} onChange={(e) => setSpotName(e.target.value)} required
            />
          </div>

          {/* ↓↓ 画像編集エリア ↓↓ */}
          <div className="border p-3 rounded bg-gray-50 relative">
            <label className="block text-sm font-bold text-gray-700 mb-2">写真の管理</label>
            
            {/* 現在の画像のプレビュー（削除フラグが立っていない時だけ表示） */}
            {currentImageUrl && !isImageDeleted && !newImageFile && (
              <div className="mb-3 relative inline-block">
                <img src={currentImageUrl} alt="Current" className="h-32 w-auto object-cover rounded border" />
                <button
                  type="button" // これが重要！submitを防ぐ
                  onClick={() => setIsImageDeleted(true)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  title="この画像を削除する"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-gray-500 mt-1">現在設定中の画像</p>
              </div>
            )}

            {/* 削除予定のメッセージ */}
            {isImageDeleted && currentImageUrl && !newImageFile &&(
              <div className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded">
                ※ 保存すると、現在の画像は削除されます。
                <button type="button" onClick={() => setIsImageDeleted(false)} className="ml-2 underline text-gray-600 text-xs">元に戻す</button>
              </div>
            )}

            {/* 新しい画像の選択 */}
            <input 
              type="file" 
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setNewImageFile(e.target.files[0]);
                  setIsImageDeleted(false); // 新しいファイルが選ばれたら削除フラグはリセット
                }
              }}
            />
            {newImageFile && <p className="text-xs text-green-600 mt-1">新しい画像が選択されています: {newImageFile.name}</p>}
            <p className="text-xs text-gray-400 mt-2">※新しいファイルを選択すると、古い画像と差し替わります。</p>
          </div>
          {/* ↑↑ 画像編集エリアここまで ↑↑ */}


          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">手紙の内容</label>
            <textarea 
              className="w-full p-2 border rounded h-32 focus:ring-2 focus:ring-orange-300 outline-none"
              value={content} onChange={(e) => setContent(e.target.value)} required
            />
          </div>

          <div className="bg-yellow-50 p-3 rounded text-xs text-gray-600 border border-yellow-200">
            <p className="font-bold mb-1">📍 場所の変更</p>
            <p>地図をクリックすると、マーカーの位置（設置場所）も変更されます。</p>
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {isSubmitting ? '保存中...' : '変更を保存する'}
          </button>
        </form>
      </div>

      {/* 右側：地図（変更なし） */}
      <div className="w-full md:w-2/3 h-[50vh] md:h-screen relative">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapToken}
          cursor="crosshair"
          onClick={(e) => {
            setLat(e.lngLat.lat);
            setLng(e.lngLat.lng);
          }}
        >
          <NavigationControl position="top-right" />
          <Marker 
            latitude={lat} 
            longitude={lng} 
            anchor="bottom"
            draggable
            onDragEnd={(e) => {
              setLat(e.lngLat.lat);
              setLng(e.lngLat.lng);
            }}
          >
            <div className="text-4xl drop-shadow-lg animate-bounce">
              📍
            </div>
          </Marker>
          {currentImageUrl && (
             <Marker latitude={lat} longitude={lng} anchor="top" offset={[0, 10]}>
               <div className="bg-white p-1 shadow rounded">
                  <img src={currentImageUrl} className="w-16 h-auto rounded" alt="mini preview" />
               </div>
             </Marker>
          )}
        </Map>
      </div>
    </main>
  );
}