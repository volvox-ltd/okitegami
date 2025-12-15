'use client';
import { compressImage } from '@/utils/compressImage';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

import IconAdminLetter from '@/components/IconAdminLetter';
import IconUserLetter from '@/components/IconUserLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  image_url?: string;
  is_official?: boolean;
  password?: string | null; // ★追加
};

export default function AdminPage() {
  const router = useRouter();
  
  // フォーム用
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // ★追加：公開設定
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

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
    const { data } = await supabase.from('letters').select('*').order('created_at', { ascending: false });
    if (data) setLetters(data);
  };

  const handleDelete = async (id: string, imageUrl?: string) => {
    if (!window.confirm('本当にこの手紙を削除しますか？')) return;

    try {
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('letter-images').remove([fileName]);
        }
      }
      const { error } = await supabase.from('letters').delete().eq('id', id);
      if (error) throw error;

      alert('削除しました');
      fetchLetters();
    } catch (error) {
      console.error(error);
      alert('削除に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ★追加：合言葉チェック
    if (isPrivate && !password) {
      return alert('合言葉を入力してください');
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        
        // ★修正：拡張子を jpg に統一（ユーザー側と同じ仕様に）
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, compressedFile, {
             contentType: 'image/jpeg'
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('letter-images')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('letters')
        .insert([{ 
          title, 
          spot_name: spotName, 
          content, 
          lat, 
          lng,
          image_url: imageUrl,
          is_official: true, // 運営フラグ
          password: isPrivate ? password : null // ★合言葉を保存
        }]);

      if (dbError) throw dbError;

      alert('【運営】として手紙を置きました！');
      
      // フォームリセット
      setTitle('');
      setSpotName('');
      setContent('');
      setImageFile(null);
      setIsPrivate(false); // リセット
      setPassword('');     // リセット
      fetchLetters();

    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto flex flex-col gap-8 h-screen border-r border-gray-200">
        <div>
          <h1 className="text-xl font-bold mb-4 text-bunko-ink border-b pb-2 flex items-center gap-2">
             <IconAdminLetter className="w-8 h-8" />
             運営用投稿フォーム
          </h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input 
              type="text" className="w-full p-2 border rounded text-sm" 
              placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required 
            />
            <input 
              type="text" className="w-full p-2 border rounded text-sm" 
              placeholder="場所の名前" value={spotName} onChange={e => setSpotName(e.target.value)} required 
            />
            
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

            {/* ★追加：公開範囲の設定（運営用デザイン） */}
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <label className="block text-xs font-bold text-gray-600 mb-2">公開設定</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={!isPrivate} 
                    onChange={() => setIsPrivate(false)} 
                    className="accent-orange-600"
                  />
                  <span className="text-sm">誰でもOK</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={isPrivate} 
                    onChange={() => setIsPrivate(true)} 
                    className="accent-orange-600"
                  />
                  <span className="text-sm">合言葉をつける</span>
                </label>
              </div>

              {/* 合言葉入力欄 */}
              {isPrivate && (
                <input 
                  type="text" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="合言葉を入力 (例: kirin)"
                />
              )}
            </div>

            <div className="bg-gray-100 p-2 rounded text-xs text-gray-500 mb-2">
               地図上のピンをドラッグして位置調整できます。
            </div>

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
              className="w-full bg-orange-600 text-white font-bold py-3 rounded hover:bg-orange-700 disabled:bg-gray-300 shadow-md transition-colors"
            >
              {isSubmitting ? '送信中...' : 'この場所に運営として置く'}
            </button>
          </form>
        </div>

        {/* 既存リスト */}
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">📂 設置済みの手紙リスト</h2>
          <div className="space-y-2">
            {letters.map((letter) => (
              <div key={letter.id} className={`p-3 rounded border flex justify-between items-center transition-colors ${letter.is_official ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div 
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => {
                    setViewState(prev => ({...prev, latitude: letter.lat, longitude: letter.lng, zoom: 16}))
                  }}
                >
                  {letter.is_official ? (
                    <span title="運営の投稿">👑</span> 
                  ) : (
                    <span title="ユーザーの投稿">👤</span>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-700">{letter.title}</p>
                      {/* ★鍵マークを表示 */}
                      {letter.password && <span className="text-xs bg-gray-600 text-white px-1 rounded">🔒</span>}
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400">
                       <span>{letter.image_url ? '📷 写真あり' : '文字のみ'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${letter.id}`} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">編集</Link>
                  <button onClick={() => handleDelete(letter.id, letter.image_url)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">削除</button>
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
            <div className="animate-bounce">
              <IconAdminLetter className="w-12 h-12 drop-shadow-lg" />
            </div>
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
              <div className="hover:scale-125 transition-transform cursor-pointer drop-shadow-md relative">
                {l.is_official ? (
                  <IconAdminLetter className="w-10 h-10" />
                ) : (
                  <IconUserLetter className="w-8 h-8 opacity-70" />
                )}
                {/* 地図上でも鍵付きがわかるようにする */}
                {l.password && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow">
                    <span className="text-[8px]">🔒</span>
                  </div>
                )}
              </div>
            </Marker>
          ))}
        </Map>
        
        <div className="absolute top-4 left-4 bg-white/90 p-2 rounded shadow text-xs font-bold text-gray-600">
           ピンをドラッグして設置場所を決めてください
        </div>
      </div>
    </main>
  );
}