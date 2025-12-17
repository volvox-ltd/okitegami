'use client';
import { compressImage } from '@/utils/compressImage';
import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import IconUserLetter from '@/components/IconUserLetter';
import { NG_WORDS } from '@/utils/ngWords';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // ★追加：フォームが開いているかどうかの状態（初期値は true = 開いている）
  const [isExpanded, setIsExpanded] = useState(true);

  const [title, setTitle] = useState('');
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
    if (!title || !spotName || !content) return alert('タイトル・場所・内容を入力してください');
    if (isPrivate && !password) return alert('合言葉を入力してください');

    setIsLoading(true);

    const foundNgWord = NG_WORDS.find(word => 
      title.includes(word) || content.includes(word) || spotName.includes(word)
    );

    if (foundNgWord) {
      alert(`不適切な表現が含まれているため投稿できません。\n該当箇所: 「${foundNgWord}」`);
      setIsLoading(false); 
      return;
    }

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
        spot_name: spotName,
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
    // ★修正：全体を相対配置のコンテナにする
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      
      {/* 1. 地図エリア（全画面表示） */}
      <div className="absolute inset-0 z-0">
        {mapToken && (
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapToken}
            onClick={(e) => setPinLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          >
            <NavigationControl position="top-right" style={{ marginTop: '80px' }} />
            <GeolocateControl position="top-right" />
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
      </div>

      {/* キャンセルボタン（地図の上に浮くように配置） */}
      <Link href="/" className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 px-4 rounded-full shadow-md text-gray-600 font-bold text-xs hover:bg-white transition-colors">
        ✕ キャンセル
      </Link>

      {/* ピン調整のヒント（フォームが開いている時は隠す） */}
      {!isExpanded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full text-center px-4">
           <span className="bg-white/80 backdrop-blur text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-200">
             ピンを動かして場所を決めてください
           </span>
        </div>
      )}

      {/* 2. フォームエリア（ボトムシート） */}
      {/* isExpandedの状態によって高さを変える */}
      <div 
        className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out flex flex-col ${
          isExpanded ? 'h-[85%] md:h-[80%]' : 'h-24'
        }`}
      >
        {/* ★ここがハンドル（クリックで開閉） */}
        <div 
          className="w-full flex items-center justify-center pt-3 pb-2 cursor-pointer shrink-0 hover:bg-gray-50 rounded-t-3xl transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* ヘッダー部分（常に表示） */}
        <div className="px-6 pb-2 shrink-0 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <IconUserLetter className="w-6 h-6" /> 
            {isExpanded ? '手紙を書く' : '場所を決める（タップで開く）'}
          </h2>
          {/* 開閉状態を示す矢印アイコン */}
          <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
        </div>
        
        {/* 入力フォーム本体（スクロール可能エリア） */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="space-y-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">タイトル</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="タイトル" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">場所の名前</label>
              <input type="text" value={spotName} onChange={(e) => setSpotName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="例：大きな桜の木の下" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">手紙の内容</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none leading-relaxed" placeholder="ここにメッセージを書いてください..."></textarea>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-500 mb-3">公開設定</label>
              <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!isPrivate ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'}`}>
                     {!isPrivate && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="hidden" />
                  <span className="text-sm font-bold text-gray-700">誰でもOK</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isPrivate ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'}`}>
                     {isPrivate && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="hidden" />
                  <span className="text-sm font-bold text-gray-700">合言葉をつける</span>
                </label>
              </div>
              {isPrivate && (
                <div className="animate-fadeIn">
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" placeholder="合言葉を入力してください" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">写真（任意）</label>
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors group">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])} />
                {imageFile ? (
                  <span className="text-green-600 text-sm font-bold flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {imageFile.name}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm group-hover:text-gray-600 transition-colors">＋ 写真を追加する</span>
                )}
              </label>
            </div>

            <button onClick={handleSubmit} disabled={isLoading} className={`w-full py-4 rounded-full text-white font-bold text-sm shadow-md transition-transform active:scale-95 mt-4 ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
              {isLoading ? '手紙を置いています...' : 'この場所に手紙を置く'}
            </button>
            <div className="h-8"></div> {/* 下部の余白 */}
          </div>
        </div>
      </div>
    </div>
  );
}