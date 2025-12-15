'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { compressImage } from '@/utils/compressImage';
import IconUserLetter from '@/components/IconUserLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserEditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  
  // 場所データ（ユーザー編集では場所の移動も許可します）
  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 16 });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLetter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ログインが必要です');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        alert('手紙が見つかりませんでした');
        router.push('/');
        return;
      }

      // ★重要：自分以外の投稿は編集させない
      if (data.user_id !== user.id) {
        alert('編集権限がありません');
        router.push('/');
        return;
      }

      setTitle(data.title);
      setContent(data.content);
      setLat(data.lat);
      setLng(data.lng);
      setCurrentImageUrl(data.image_url);
      setViewState({ latitude: data.lat, longitude: data.lng, zoom: 16 });
      setIsLoading(false);
    };
    fetchLetter();
  }, [id, router]);

  const handleUpdate = async () => {
    if (!title || !content) return alert('タイトルと内容を入力してください');
    setIsSubmitting(true);

    try {
      let finalImageUrl = currentImageUrl;

      // 画像削除
      if (isImageDeleted && currentImageUrl) {
         const oldFileName = currentImageUrl.split('/').pop();
         if (oldFileName) await supabase.storage.from('letter-images').remove([oldFileName]);
         finalImageUrl = null;
      }

      // 新しい画像
      if (newImageFile) {
        // 古いのがあれば消す
        if (currentImageUrl && !isImageDeleted) {
           const oldFileName = currentImageUrl.split('/').pop();
           if (oldFileName) await supabase.storage.from('letter-images').remove([oldFileName]);
        }
        
        // 圧縮 & アップロード
        const compressedFile = await compressImage(newImageFile);
        const fileName = `${Date.now()}_${compressedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('letter-images')
          .getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('letters')
        .update({
          title,
          content,
          lat,
          lng,
          image_url: finalImageUrl
        })
        .eq('id', id);

      if (error) throw error;

      alert('手紙を書き直しました！');
      router.push('/');
    } catch (e) {
      console.error(e);
      alert('更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (isLoading) return <div className="h-screen flex items-center justify-center">読み込み中...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      
      {/* マップエリア */}
      <div className="relative w-full h-[45%] bg-gray-200">
        <Link href="/" className="absolute top-4 left-4 z-50 bg-white/80 p-2 rounded-full shadow-sm text-gray-600 font-bold text-xs">
          ✕ キャンセル
        </Link>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapToken}
          onClick={(e) => {
             setLat(e.lngLat.lat);
             setLng(e.lngLat.lng);
          }}
        >
          <NavigationControl position="bottom-right" />
          <Marker
             latitude={lat} longitude={lng} anchor="bottom" draggable
             onDragEnd={(e) => {
               setLat(e.lngLat.lat);
               setLng(e.lngLat.lng);
             }}
          >
             <div className="animate-bounce cursor-grab active:cursor-grabbing drop-shadow-lg">
               <IconUserLetter className="w-12 h-12" />
             </div>
          </Marker>
        </Map>
        <div className="absolute bottom-2 w-full text-center z-10 pointer-events-none">
          <span className="bg-white/80 backdrop-blur text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-200">
            ピンを動かして場所を変更できます
          </span>
        </div>
      </div>

      {/* フォームエリア */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-6 font-serif flex items-center gap-2">
          <IconUserLetter className="w-6 h-6" />
          手紙を書き直す
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">タイトル</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          {/* 画像編集 */}
          <div className="border border-dashed border-gray-300 rounded-lg p-3">
             <p className="text-xs font-bold text-gray-500 mb-2">写真</p>
             {currentImageUrl && !isImageDeleted && !newImageFile ? (
               <div className="flex items-center gap-3">
                 <img src={currentImageUrl} className="h-16 w-16 object-cover rounded" />
                 <button onClick={() => setIsImageDeleted(true)} className="text-xs text-red-500 underline">この写真を削除</button>
               </div>
             ) : (
               <input type="file" accept="image/*" className="text-xs" onChange={(e) => {
                 if (e.target.files?.[0]) {
                   setNewImageFile(e.target.files[0]);
                   setIsImageDeleted(false);
                 }
               }} />
             )}
             {isImageDeleted && <p className="text-xs text-red-500 mt-1">※写真は削除されます</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"></textarea>
          </div>

          <button onClick={handleUpdate} disabled={isSubmitting} className={`w-full py-4 rounded-full text-white font-bold text-sm shadow-md transition-transform active:scale-95 ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
            {isSubmitting ? '保存中...' : '変更を保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}