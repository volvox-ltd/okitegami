'use client';
import { compressImage } from '@/utils/compressImage';
import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import IconUserLetter from '@/components/IconUserLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  // ★追加：場所の名前入力用
  const [spotName, setSpotName] = useState(''); 
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 16 });
  const [pinLocation, setPinLocation] = useState({ lat: 35.6288, lng: 139.6842 });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setViewState((prev) => ({ ...prev, latitude, longitude }));
        setPinLocation({ lat: latitude, lng: longitude });
      });
    }
  }, []);

  const handleSubmit = async () => {
    // バリデーションに spotName を追加
    if (!title || !spotName || !content) return alert('タイトル・場所・内容を入力してください');
    if (isPrivate && !password) return alert('合言葉を入力してください');

    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('ログインが必要です');
      setIsLoading(false);
      return;
    }

    let publicUrl = null;

    if (imageFile) {
      try {
        const compressedFile = await compressImage(imageFile);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, compressedFile, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } catch (error) {
        console.error(error);
        alert('画像の処理に失敗しました');
        setIsLoading(false);
        return;
      }
    }

    const { error: insertError } = await supabase
      .from('letters')
      .insert({
        title: title,
        content: content,
        spot_name: spotName, // ★修正：入力された場所名を保存
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        image_url: publicUrl,
        user_id: user.id,
        is_official: false,
        password: isPrivate ? password : null
      });

    if (insertError) {
      console.error(insertError);
      alert('保存に失敗しました');
    } else {
      alert(isPrivate ? '合言葉付きの手紙を置きました！' : '手紙を置きました！');
      router.push('/');
    }
    
    setIsLoading(false);
  };

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="relative w-full h-[40%] bg-gray-200">
        <Link href="/" className="absolute top-4 left-4 z-50 bg-white/80 p-2 rounded-full shadow-sm text-gray-600 font-bold text-xs">✕ キャンセル</Link>
        {mapToken && (
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapToken}
            onClick={(e) => setPinLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          >
            <NavigationControl position="bottom-right" />
            <GeolocateControl position="bottom-right" />
            <Marker
              latitude={pinLocation.lat} longitude={pinLocation.lng} anchor="bottom" draggable
              onDragEnd={(e) => setPinLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
            >
              <div className="animate-bounce cursor-grab active:cursor-grabbing drop-shadow-lg">
                <IconUserLetter className="w-12 h-12" />
              </div>
            </Marker>
          </Map>
        )}
        <div className="absolute bottom-2 w-full text-center z-10 pointer-events-none">
          <span className="bg-white/80 backdrop-blur text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-200">ピンをドラッグして場所を決めてください</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl -mt-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4 font-serif flex items-center gap-2">
          <IconUserLetter className="w-6 h-6" /> 手紙をしたためる
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">タイトル</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="タイトル" />
          </div>

          {/* ★追加：場所の名前入力欄 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">場所の名前</label>
            <input type="text" value={spotName} onChange={(e) => setSpotName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="例：大きな桜の木の下" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">手紙の内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" placeholder="ここにメッセージを書いてください..."></textarea>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="block text-xs font-bold text-gray-500 mb-2">公開設定</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-green-600" />
                <span className="text-sm">誰でもOK</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-green-600" />
                <span className="text-sm">合言葉をつける</span>
              </label>
            </div>
            {isPrivate && (
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" placeholder="合言葉を入力" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">写真（任意）</label>
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])} />
              {imageFile ? <span className="text-green-600 text-sm font-bold">✓ {imageFile.name}</span> : <span className="text-gray-400 text-sm">＋ 写真を追加</span>}
            </label>
          </div>

          <button onClick={handleSubmit} disabled={isLoading} className={`w-full py-4 rounded-full text-white font-bold text-sm shadow-md transition-transform active:scale-95 ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
            {isLoading ? '手紙を置いています...' : 'この場所に手紙を置く'}
          </button>
        </div>
      </div>
    </div>
  );
}