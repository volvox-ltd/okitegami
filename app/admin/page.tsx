'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  image_url?: string; // 画像URLがあるかもしれない
};

export default function AdminPage() {
  const router = useRouter();
  
  // フォーム用
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); // 画像ファイル用
  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // リスト用
  const [letters, setLetters] = useState<Letter[]>([]);

  // 地図用
  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    const { data } = await supabase.from('letters').select('*');
    if (data) setLetters(data);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('本当にこの手紙を削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', id);
    if (!error) {
      alert('削除しました');
      fetchLetters();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // 1. 画像が選択されていたら、先にアップロードする
      if (imageFile) {
        // ファイルの拡張子（.jpgとか）だけ取り出す
        const fileExt = imageFile.name.split('.').pop();
        // 「日付_ランダムな英数字.拡張子」という名前にする
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // 'letter-images' というバケットにアップロード
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        // アップロードした画像の公開URLを取得
        const { data: urlData } = supabase.storage
          .from('letter-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      // 2. データベースに手紙の情報を保存（画像のURLも一緒に）
      const { error: dbError } = await supabase
        .from('letters')
        .insert([{ 
          title, 
          spot_name: spotName, 
          content, 
          lat, 
          lng,
          image_url: imageUrl // ここに追加！
        }]);

      if (dbError) throw dbError;

      alert('写真付きの手紙を置きました！');
      
      // フォームリセット
      setTitle('');
      setSpotName('');
      setContent('');
      setImageFile(null); // 画像もリセット
      fetchLetters();

    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 座標入力用
  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLat(val);
    setViewState(prev => ({ ...prev, latitude: val }));
  };
  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLng(val);
    setViewState(prev => ({ ...prev, longitude: val }));
  };

  if (!mapToken) return <div>Map Token Error</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* 左側：入力フォーム */}
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto flex flex-col gap-8 h-screen">
        <div>
          <h1 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">📷 写真付きの手紙を置く</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input 
              type="text" className="w-full p-2 border rounded text-sm" 
              placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required 
            />
            <input 
              type="text" className="w-full p-2 border rounded text-sm" 
              placeholder="場所の名前" value={spotName} onChange={e => setSpotName(e.target.value)} required 
            />
            
            {/* ↓画像アップロード欄を追加↓ */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">写真 (任意)</label>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <textarea 
              className="w-full p-2 border rounded h-20 text-sm" 
              placeholder="手紙の内容" value={content} onChange={e => setContent(e.target.value)} required 
            />

            <div className="flex gap-2 bg-gray-100 p-2 rounded">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Lat</label>
                <input type="number" step="any" className="w-full p-1 text-xs border rounded" value={lat} onChange={handleLatChange} />
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Lng</label>
                <input type="number" step="any" className="w-full p-1 text-xs border rounded" value={lng} onChange={handleLngChange} />
              </div>
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-orange-500 text-white font-bold py-2 rounded hover:bg-orange-600 disabled:bg-gray-300"
            >
              {isSubmitting ? '送信中...' : '手紙を置く'}
            </button>
          </form>
        </div>

        {/* 既存リスト */}
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">📂 設置済みの手紙リスト</h2>
          <div className="space-y-2">
            {letters.map((letter) => (
              <div key={letter.id} className="bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors">
                <div 
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => {
                    setViewState(prev => ({...prev, latitude: letter.lat, longitude: letter.lng, zoom: 16}))
                  }}
                >
                  {/* 画像がある場合はアイコンを表示 */}
                  {letter.image_url && <span title="写真あり">📷</span>}
                  <div>
                    <p className="font-bold text-sm text-gray-700">{letter.title}</p>
                    <p className="text-xs text-gray-400">ID: {letter.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${letter.id}`} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">編集</Link>
                  <button onClick={() => handleDelete(letter.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右側：地図 */}
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
          <Marker latitude={lat} longitude={lng} anchor="bottom">
            <div className="text-4xl drop-shadow-lg animate-bounce">📍</div>
          </Marker>
          {letters.map(l => (
            <Marker 
              key={l.id} 
              latitude={l.lat} 
              longitude={l.lng} 
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                router.push(`/admin/edit/${l.id}`);
              }}
            >
              <div className="text-2xl opacity-70 hover:opacity-100 hover:scale-125 transition-all cursor-pointer">
                {l.image_url ? '📷' : '✉️'}
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </main>
  );
}