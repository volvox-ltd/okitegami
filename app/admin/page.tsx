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
  password?: string | null;
  attached_stamp_id?: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const [hasStamp, setHasStamp] = useState(false);
  const [stampName, setStampName] = useState('');
  const [stampFile, setStampFile] = useState<File | null>(null);

  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [letters, setLetters] = useState<Letter[]>([]);

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
        if (fileName) await supabase.storage.from('letter-images').remove([fileName]);
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

    if (isPrivate && !password) return alert('合言葉を入力してください');
    if (hasStamp && (!stampName || !stampFile)) return alert('切手の名前と画像を指定してください');

    setIsSubmitting(true);

    try {
      // 1. 手紙の画像をアップロード（ここは写真なので圧縮・JPG変換でOK）
      let letterImageUrl = null;
      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        const fileName = `letter_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('letter-images').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        letterImageUrl = data.publicUrl;
      }

      // 2. 切手画像をアップロード
      let newStampId = null;
      if (hasStamp && stampFile) {
        // ★ここを修正：PNGならそのままアップロードして透過を維持する
        let fileToUpload = stampFile;
        let fileExt = 'jpg';
        let mimeType = 'image/jpeg';

        if (stampFile.type === 'image/png') {
          // PNGの場合：圧縮せずそのまま使う（透過維持のため）
          fileToUpload = stampFile;
          fileExt = 'png';
          mimeType = 'image/png';
        } else {
          // それ以外（JPEGなど）：圧縮する
          fileToUpload = await compressImage(stampFile);
          fileExt = 'jpg';
          mimeType = 'image/jpeg';
        }
        
        const stampFileName = `stamp_${Date.now()}.${fileExt}`;
        const { error: stampUpErr } = await supabase.storage
          .from('stamp-images')
          .upload(stampFileName, fileToUpload, { contentType: mimeType });
          
        if (stampUpErr) throw stampUpErr;
        
        const { data: stampUrlData } = supabase.storage.from('stamp-images').getPublicUrl(stampFileName);

        // DB登録
        const { data: stampData, error: stampDbErr } = await supabase
          .from('stamps')
          .insert({
            name: stampName,
            image_url: stampUrlData.publicUrl,
            description: `${spotName}の記念切手`
          })
          .select()
          .single();
        
        if (stampDbErr) throw stampDbErr;
        newStampId = stampData.id;
      }

      // 3. 手紙を登録
      const { error: dbError } = await supabase
        .from('letters')
        .insert([{ 
          title, 
          spot_name: spotName, 
          content, 
          lat, 
          lng,
          image_url: letterImageUrl,
          is_official: true,
          password: isPrivate ? password : null,
          attached_stamp_id: newStampId
        }]);

      if (dbError) throw dbError;

      alert('【運営】として手紙を置きました！');
      
      // リセット
      setTitle(''); setSpotName(''); setContent(''); setImageFile(null);
      setIsPrivate(false); setPassword('');
      setHasStamp(false); setStampName(''); setStampFile(null);
      fetchLetters();

    } catch (error: any) {
      alert('エラー: ' + error.message);
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
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* 左側：入力フォーム */}
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto flex flex-col gap-8 h-screen border-r border-gray-200">
        <div>
          <h1 className="text-xl font-bold mb-4 text-bunko-ink border-b pb-2 flex items-center gap-2">
             <IconAdminLetter className="w-8 h-8" />
             運営用投稿フォーム
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500">基本情報</label>
              <input 
                type="text" className="w-full p-2 border rounded text-sm" 
                placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required 
              />
              <input 
                type="text" className="w-full p-2 border rounded text-sm" 
                placeholder="場所の名前" value={spotName} onChange={e => setSpotName(e.target.value)} required 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">手紙の写真 (任意)</label>
              <input 
                type="file" accept="image/*"
                className="w-full text-sm text-gray-500"
                onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])}
              />
            </div>

            <textarea 
              className="w-full p-2 border rounded h-24 text-sm" 
              placeholder="手紙の内容" value={content} onChange={e => setContent(e.target.value)} required 
            />

            {/* 切手作成フォーム */}
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
               <label className="flex items-center gap-2 cursor-pointer mb-2">
                 <input 
                   type="checkbox" 
                   checked={hasStamp} 
                   onChange={() => setHasStamp(!hasStamp)}
                   className="w-4 h-4 accent-orange-600"
                 />
                 <span className="text-sm font-bold text-yellow-900">🎁 この手紙専用の切手を作る</span>
               </label>

               {hasStamp && (
                 <div className="pl-4 border-l-2 border-yellow-300 space-y-3 mt-2">
                   <div>
                     <input 
                       type="text" 
                       placeholder="切手の名前 (例: 古井戸の切手)" 
                       className="w-full p-2 border rounded text-sm"
                       value={stampName}
                       onChange={e => setStampName(e.target.value)}
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] text-gray-500 mb-1">
                       画像 (PNGなら背景透過されます)
                     </label>
                     <input 
                       type="file" accept="image/*"
                       className="w-full text-xs text-gray-600"
                       onChange={(e) => e.target.files?.[0] && setStampFile(e.target.files[0])}
                     />
                   </div>
                 </div>
               )}
            </div>

            {/* 公開設定 */}
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <label className="block text-xs font-bold text-gray-600 mb-2">公開設定</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-orange-600"/>
                  <span className="text-sm">誰でもOK</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-orange-600"/>
                  <span className="text-sm">合言葉</span>
                </label>
              </div>
              {isPrivate && (
                <input 
                  type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-2 text-sm"
                  placeholder="合言葉を入力"
                />
              )}
            </div>

            <div className="bg-gray-100 p-2 rounded text-xs text-gray-500">
               地図ピンをドラッグして位置調整
               <div className="flex gap-2 mt-1">
                 <input type="number" step="any" className="w-1/2 p-1 border rounded" value={lat} onChange={handleLatChange} />
                 <input type="number" step="any" className="w-1/2 p-1 border rounded" value={lng} onChange={handleLngChange} />
               </div>
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded hover:bg-orange-700 disabled:bg-gray-300 shadow-md transition-colors"
            >
              {isSubmitting ? 'アップロード中...' : '投稿する'}
            </button>
          </form>
        </div>

        {/* リスト */}
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">📂 設置済みリスト</h2>
          <div className="space-y-2">
            {letters.map((letter) => (
              <div key={letter.id} className={`p-3 rounded border flex justify-between items-center ${letter.is_official ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                <div 
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => setViewState(prev => ({...prev, latitude: letter.lat, longitude: letter.lng, zoom: 16}))}
                >
                  <span title={letter.is_official ? "運営" : "ユーザー"}>{letter.is_official ? '👑' : '👤'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-700">{letter.title}</p>
                      {letter.password && <span className="text-xs bg-gray-600 text-white px-1 rounded">🔒</span>}
                      {letter.attached_stamp_id && <span className="text-xs bg-yellow-500 text-white px-1 rounded ml-1">🏵️切手</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${letter.id}`} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 font-bold">
                    編集
                  </Link>
                  <button onClick={() => handleDelete(letter.id, letter.image_url)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 font-bold">
                    削除
                  </button>
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
          onClick={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}
        >
          <NavigationControl position="top-right" />
          <Marker 
            latitude={lat} longitude={lng} anchor="bottom" draggable
            onDragEnd={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}
          >
            <div className="animate-bounce"><IconAdminLetter className="w-10 h-10 drop-shadow-lg" /></div>
          </Marker>
          {letters.map(l => (
            <Marker key={l.id} latitude={l.lat} longitude={l.lng} anchor="bottom" onClick={(e) => {e.originalEvent.stopPropagation(); router.push(`/admin/edit/${l.id}`)}}>
              <div className="hover:scale-125 transition-transform cursor-pointer drop-shadow-md relative">
                {l.is_official ? <IconAdminLetter className="w-10 h-10" /> : <IconUserLetter className="w-10 h-10 opacity-70" />}
                {l.password && <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow"><span className="text-[8px]">🔒</span></div>}
                {l.attached_stamp_id && !l.password && <div className="absolute -top-1 -left-1 bg-white rounded-full p-0.5 shadow"><span className="text-[8px]">🏵️</span></div>}
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </main>
  );
}