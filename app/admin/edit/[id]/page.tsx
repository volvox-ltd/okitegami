'use client';
import { compressImage } from '@/utils/compressImage';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';

import IconAdminLetter from '@/components/IconAdminLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [content, setContent] = useState('');
  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const [currentStamp, setCurrentStamp] = useState<{id: number, name: string, image_url: string} | null>(null);
  const [isStampDeleted, setIsStampDeleted] = useState(false);
  const [isCreatingNewStamp, setIsCreatingNewStamp] = useState(false);
  const [newStampName, setNewStampName] = useState('');
  const [newStampFile, setNewStampFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const fetchLetter = async () => {
      if(!id) return;
      
      const { data: letter, error } = await supabase
        .from('letters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        alert('読み込みエラー');
        router.push('/admin');
        return;
      }

      if (letter) {
        setTitle(letter.title);
        setSpotName(letter.spot_name);
        setContent(letter.content || '');
        setLat(letter.lat);
        setLng(letter.lng);
        setCurrentImageUrl(letter.image_url);
        
        if (letter.password) {
          setIsPrivate(true);
          setPassword(letter.password);
        }

        if (letter.attached_stamp_id) {
          const { data: stampData } = await supabase
            .from('stamps')
            .select('*')
            .eq('id', letter.attached_stamp_id)
            .single();
          if (stampData) {
            setCurrentStamp(stampData);
          }
        }
        
        setViewState(prev => ({ ...prev, latitude: letter.lat, longitude: letter.lng }));
        setIsLoading(false);
      }
    };
    fetchLetter();
  }, [id, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPrivate && !password) return alert('合言葉を入力してください');
    if (isCreatingNewStamp && (!newStampName || !newStampFile)) return alert('新しい切手の名前と画像を指定してください');

    setIsSubmitting(true);

    try {
      // 1. 手紙のメイン画像（写真なので圧縮OK）
      let finalImageUrl = currentImageUrl;

      if (isImageDeleted) {
        if (currentImageUrl) {
          const oldName = currentImageUrl.split('/').pop();
          if (oldName) await supabase.storage.from('letter-images').remove([oldName]);
        }
        finalImageUrl = null;
      }

      if (newImageFile) {
        if (currentImageUrl && !isImageDeleted) {
           const oldName = currentImageUrl.split('/').pop();
           if (oldName) await supabase.storage.from('letter-images').remove([oldName]);
        }

        const compressed = await compressImage(newImageFile);
        const fileName = `letter_${Date.now()}.jpg`;
        
        const { error: upErr } = await supabase.storage.from('letter-images').upload(fileName, compressed, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }

      // 2. 切手の処理
      let finalStampId = currentStamp ? currentStamp.id : null;

      if (isStampDeleted) {
        finalStampId = null;
      }

      if (isCreatingNewStamp && newStampName && newStampFile) {
        // ★ここを修正：PNGならそのままアップロード
        let fileToUpload = newStampFile;
        let fileExt = 'jpg';
        let mimeType = 'image/jpeg';

        if (newStampFile.type === 'image/png') {
          fileToUpload = newStampFile;
          fileExt = 'png';
          mimeType = 'image/png';
        } else {
          fileToUpload = await compressImage(newStampFile);
          fileExt = 'jpg';
          mimeType = 'image/jpeg';
        }

        const stampFileName = `stamp_${Date.now()}.${fileExt}`;

        const { error: sUpErr } = await supabase.storage.from('stamp-images').upload(stampFileName, fileToUpload, { contentType: mimeType });
        if (sUpErr) throw sUpErr;

        const { data: sUrlData } = supabase.storage.from('stamp-images').getPublicUrl(stampFileName);
        
        const { data: newStamp, error: sDbErr } = await supabase
          .from('stamps')
          .insert({
            name: newStampName,
            image_url: sUrlData.publicUrl,
            description: `${spotName}の記念切手`
          })
          .select()
          .single();
        
        if (sDbErr) throw sDbErr;
        
        finalStampId = newStamp.id;
      }

      // 3. データベース更新
      const { error } = await supabase
        .from('letters')
        .update({
          title, 
          spot_name: spotName, 
          content,
          lat,
          lng,
          image_url: finalImageUrl,
          password: isPrivate ? password : null,
          attached_stamp_id: finalStampId
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
  if (isLoading) return <div className="p-10 text-center">データを読み込んでいます...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* 左側：編集フォーム */}
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto border-r border-orange-200 h-screen">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-xl font-bold text-bunko-ink flex items-center gap-2">
            <IconAdminLetter className="w-6 h-6" /> 編集
          </h1>
          <button type="button" onClick={() => router.back()} className="text-xs text-gray-500 hover:underline">キャンセル</button>
        </div>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">タイトル</label>
              <input 
                type="text" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                value={title} onChange={(e) => setTitle(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">場所の名前</label>
              <input 
                type="text" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                value={spotName} onChange={(e) => setSpotName(e.target.value)} required
              />
            </div>
          </div>

          <div className="border p-4 rounded bg-gray-50 relative">
            <label className="block text-xs font-bold text-gray-500 mb-2">手紙の写真</label>
            
            {currentImageUrl && !isImageDeleted && !newImageFile && (
              <div className="mb-3 relative inline-block">
                <img src={currentImageUrl} alt="Current" className="h-24 w-auto object-cover rounded border" />
                <button
                  type="button"
                  onClick={() => setIsImageDeleted(true)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  title="削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {isImageDeleted && currentImageUrl && !newImageFile &&(
              <div className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded flex justify-between">
                <span>画像を削除します</span>
                <button type="button" onClick={() => setIsImageDeleted(false)} className="underline text-gray-600">元に戻す</button>
              </div>
            )}

            <input 
              type="file" accept="image/*"
              className="w-full text-xs text-gray-500"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setNewImageFile(e.target.files[0]);
                  setIsImageDeleted(false);
                }
              }}
            />
            {newImageFile && <p className="text-[10px] text-green-600 mt-1">新しい画像を選択中</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">手紙の内容</label>
            <textarea 
              className="w-full p-2 border rounded h-32 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              value={content} onChange={(e) => setContent(e.target.value)} required
            />
          </div>

          {/* 切手管理エリア */}
          <div className="border border-yellow-200 p-4 rounded bg-yellow-50 relative">
            <label className="block text-xs font-bold text-yellow-800 mb-2">🎁 切手の設定</label>

            {currentStamp && !isStampDeleted && (
              <div className="flex items-center gap-3 mb-2 bg-white p-2 rounded border border-yellow-100">
                <img src={currentStamp.image_url} alt="stamp" className="w-10 h-auto border" />
                <div className="flex-1">
                  <p className="text-xs font-bold">{currentStamp.name}</p>
                  <p className="text-[10px] text-gray-400">現在設定中</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsStampDeleted(true)}
                  className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded hover:bg-red-200"
                >
                  外す
                </button>
              </div>
            )}

            {isStampDeleted && (
              <div className="text-xs text-red-600 mb-3 bg-white p-2 rounded border border-red-100 flex justify-between">
                 <span>この切手を外します</span>
                 <button type="button" onClick={() => setIsStampDeleted(false)} className="underline">元に戻す</button>
              </div>
            )}

            {(!currentStamp || isStampDeleted) && (
              <div className="mt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                   <input 
                     type="checkbox" 
                     checked={isCreatingNewStamp} 
                     onChange={() => setIsCreatingNewStamp(!isCreatingNewStamp)} 
                     className="accent-orange-600"
                   />
                   <span className="text-xs font-bold">新しい切手を作成して付ける</span>
                </label>

                {isCreatingNewStamp && (
                  <div className="pl-4 border-l-2 border-yellow-300 space-y-2">
                    <input 
                       type="text" placeholder="切手の名前" 
                       className="w-full p-2 border rounded text-xs"
                       value={newStampName} onChange={e => setNewStampName(e.target.value)}
                     />
                     <input 
                       type="file" accept="image/*"
                       className="w-full text-xs text-gray-500"
                       onChange={(e) => e.target.files?.[0] && setNewStampFile(e.target.files[0])}
                     />
                     <p className="text-[10px] text-gray-400">※PNG画像なら背景透過が維持されます</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-orange-50 p-3 rounded border border-orange-200">
             <label className="block text-xs font-bold text-gray-600 mb-2">公開設定</label>
             <div className="flex gap-4 mb-2">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-orange-600"/>
                 <span className="text-xs">誰でもOK</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-orange-600"/>
                 <span className="text-xs">合言葉</span>
               </label>
             </div>
             {isPrivate && (
               <input 
                 type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-white border border-gray-300 rounded p-2 text-xs"
                 placeholder="合言葉を入力"
               />
             )}
          </div>

          <div className="bg-gray-100 p-2 rounded text-xs text-gray-500">
            <p className="font-bold mb-1">📍 場所の変更</p>
            <p>地図上のマーカーをドラッグするか、地図をクリックして変更できます。</p>
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 shadow-md"
          >
            {isSubmitting ? '保存中...' : '変更を保存する'}
          </button>
        </form>
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
               <IconAdminLetter className="w-10 h-10 drop-shadow-lg" />
            </div>
          </Marker>
          
          {currentImageUrl && (
             <Marker latitude={lat} longitude={lng} anchor="top" offset={[0, 10]}>
               <div className="bg-white p-1 shadow rounded border border-gray-200">
                  <img src={currentImageUrl} className="w-12 h-auto rounded" alt="mini preview" />
               </div>
             </Marker>
          )}
        </Map>
      </div>
    </main>
  );
}