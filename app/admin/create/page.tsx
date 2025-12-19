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

const PAGE_DELIMITER = '<<<PAGE>>>';
const MAX_CHARS_PER_PAGE = 180;
const MAX_PAGES_ADMIN = 20;

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

export default function AdminCreatePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [pages, setPages] = useState<string[]>(['']);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const [hasStamp, setHasStamp] = useState(false);
  const [stampName, setStampName] = useState('');
  const [stampFile, setStampFile] = useState<File | null>(null);

  // 数値入力フォーム用ですが、空入力を許容するため number型として扱い、NaNを許容します
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

  const handlePageChange = (index: number, value: string) => {
    if (value.length > MAX_CHARS_PER_PAGE) return;
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
  };

  const addPage = () => {
    if (pages.length >= MAX_PAGES_ADMIN) return;
    setPages([...pages, '']);
  };

  const removePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
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

    // 緯度経度のバリデーション
    if (isNaN(lat) || isNaN(lng)) return alert('緯度経度を正しく入力してください');

    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('タイトルと内容を入力してください');

    if (isPrivate && !password) return alert('合言葉を入力してください');
    if (hasStamp && (!stampName || !stampFile)) return alert('切手の名前と画像を指定してください');

    setIsSubmitting(true);

    try {
      // 1. 画像アップロード
      let letterImageUrl = null;
      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        const fileName = `letter_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('letter-images').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        letterImageUrl = data.publicUrl;
      }

      // 2. 切手アップロード
      let newStampId = null;
      if (hasStamp && stampFile) {
        let fileToUpload = stampFile;
        let fileExt = 'jpg';
        let mimeType = 'image/jpeg';

        if (stampFile.type === 'image/png') {
          fileToUpload = stampFile;
          fileExt = 'png';
          mimeType = 'image/png';
        } else {
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
      const contentToSave = pages.join(PAGE_DELIMITER);

      const { error: dbError } = await supabase
        .from('letters')
        .insert([{ 
          title, 
          spot_name: spotName || '名もなき場所', 
          content: contentToSave,
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
      setTitle(''); setSpotName(''); setPages(['']); setImageFile(null);
      setIsPrivate(false); setPassword('');
      setHasStamp(false); setStampName(''); setStampFile(null);
      fetchLetters();

    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ★修正：入力変更ハンドラ（NaNになっても地図を壊さないようにする）
  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLat(val); // 入力欄のためにNaNもセットする
    if (!isNaN(val) && val >= -90 && val <= 90) {
      setViewState(prev => ({ ...prev, latitude: val }));
    }
  };
  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLng(val); // 入力欄のためにNaNもセットする
    if (!isNaN(val) && val >= -180 && val <= 180) {
      setViewState(prev => ({ ...prev, longitude: val }));
    }
  };

  if (!mapToken) return <div>Map Token Error</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* 左側：入力フォーム */}
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto flex flex-col gap-8 h-screen border-r border-gray-200">
        <div>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h1 className="text-xl font-bold text-bunko-ink flex items-center gap-2">
               <IconAdminLetter className="w-8 h-8" />
               運営用投稿フォーム
            </h1>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-green-700">← ダッシュボードへ</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500">基本情報</label>
              <input 
                type="text" className="w-full p-2 border rounded text-sm" 
                placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required 
              />
              <input 
                type="text" className="w-full p-2 border rounded text-sm" 
                placeholder="場所の名前 (任意)" value={spotName} onChange={e => setSpotName(e.target.value)} 
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

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">手紙の内容</label>
              <div className="space-y-4">
                {pages.map((pageContent, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -top-2.5 left-2 bg-white px-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full">
                       {index + 1} / {MAX_PAGES_ADMIN}枚目
                    </div>
                    <textarea 
                      className="w-full p-3 pt-4 border rounded h-32 text-sm resize-none font-serif leading-relaxed"
                      placeholder="手紙の内容" 
                      value={pageContent} 
                      onChange={e => handlePageChange(index, e.target.value)} 
                      maxLength={MAX_CHARS_PER_PAGE}
                    />
                    <div className={`text-[10px] text-right mt-1 font-bold ${pageContent.length >= MAX_CHARS_PER_PAGE ? 'text-red-500' : 'text-gray-400'}`}>
                      {pageContent.length} / {MAX_CHARS_PER_PAGE} 文字
                    </div>
                    {pages.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removePage(index)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {pages.length < MAX_PAGES_ADMIN ? (
                <button 
                  type="button"
                  onClick={addPage}
                  className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 text-xs font-bold hover:bg-gray-50 hover:border-green-400 transition-colors"
                >
                  ＋ 便箋を追加する（あと{MAX_PAGES_ADMIN - pages.length}枚）
                </button>
              ) : (
                <p className="text-xs text-red-500 text-center mt-2">※これ以上追加できません</p>
              )}
            </div>

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

        {/* リスト（簡易表示） */}
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">📂 最近の投稿</h2>
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
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${letter.id}`} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 font-bold">
                    編集
                  </Link>
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
            // ★修正：NaNの時はviewState（地図の中心）を代わりに使ってクラッシュを防ぐ
            latitude={!isNaN(lat) ? lat : viewState.latitude} 
            longitude={!isNaN(lng) ? lng : viewState.longitude} 
            anchor="bottom" 
            draggable
            onDragEnd={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}
          >
            {/* NaNのときは半透明にして「場所未定」感を出す */}
            <div className={`animate-bounce ${isNaN(lat) ? 'opacity-50' : ''}`}>
              <IconAdminLetter className="w-10 h-10 drop-shadow-lg" />
            </div>
          </Marker>
          
          {letters.map(l => (
            <Marker key={l.id} latitude={l.lat} longitude={l.lng} anchor="bottom" onClick={(e) => {e.originalEvent.stopPropagation(); router.push(`/admin/edit/${l.id}`)}}>
              <div className="hover:scale-125 transition-transform cursor-pointer drop-shadow-md relative">
                {l.is_official ? <IconAdminLetter className="w-10 h-10" /> : <IconUserLetter className="w-10 h-10 opacity-70" />}
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </main>
  );
}