'use client';
import { compressImage } from '@/utils/imageControl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

// アイコンのインポート
import IconAdminLetter from '@/components/IconAdminLetter';
import IconAdminPostcard from '@/components/IconAdminPostcard'; // ★ 追加
import IconUserLetter from '@/components/IconUserLetter';
import IconPostcard from '@/components/IconPostcard'; // ★ 追加
import IconPost from '@/components/IconPost'; // ★ 追加
import { ENABLE_PHOTO_UPLOAD } from '@/utils/constants';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_DELIMITER = '<<<PAGE>>>';
const MAX_CHARS_PER_PAGE = 140;
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
  is_post?: boolean;
  is_postcard?: boolean; // ★ 追加
  user_id?: string;
  parent_id?: string | null; // ★ 重なり防止判定用に追加
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

  const [isPost, setIsPost] = useState(false);
  // ★ 運営用：通常投稿時の「便箋」か「ハガキ」かの選択ステート
  const [postType, setPostType] = useState<'letter' | 'postcard'>('letter');

  const [lat, setLat] = useState(35.6288);
  const [lng, setLng] = useState(139.6842);
  // ★ 管理者の現在地保持用
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [letters, setLetters] = useState<Letter[]>([]);

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // ★ 修正：初期化時に現在地を取得し、マップの中心を移動させる
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLat(latitude);
          setLng(longitude);
          setUserLoc({ lat: latitude, lng: longitude });
          setViewState(prev => ({
            ...prev,
            latitude,
            longitude,
            zoom: 15
          }));
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    const { data } = await supabase.from('letters').select('*').order('created_at', { ascending: false });
    if (data) setLetters(data);
  };

  const getVisibleLength = (text: string) => {
    return text.replace(/<[^>]+>/g, '').length;
  };

  const handlePageChange = (index: number, value: string) => {
    if (getVisibleLength(value) > MAX_CHARS_PER_PAGE) return;
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

    if (isNaN(lat) || isNaN(lng)) return alert('緯度経度を正しく入力してください');

    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('タイトルと内容を入力してください');

    if (isPrivate && !password) return alert('合言葉を入力してください');
    if (hasStamp && (!stampName || !stampFile)) return alert('切手の名前と画像を指定してください');

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('セッションが切れました。ログインし直してください。');
        setIsSubmitting(false);
        return;
      }

      let letterImageUrl = null;
      if ((postType === 'postcard' || ENABLE_PHOTO_UPLOAD) && imageFile) {
        const compressedFile = await compressImage(imageFile);
        const fileName = `letter_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('letter-images').upload(fileName, compressedFile, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        letterImageUrl = supabase.storage.from('letter-images').getPublicUrl(fileName).data.publicUrl;
      }

      let newStampId = null;
      if (hasStamp && stampFile) {
        let fileToUpload = stampFile;
        let fileExt = stampFile.type === 'image/png' ? 'png' : 'jpg';
        let mimeType = stampFile.type === 'image/png' ? 'image/png' : 'image/jpeg';

        if (fileExt === 'jpg') {
          fileToUpload = await compressImage(stampFile);
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
          attached_stamp_id: newStampId,
          is_post: isPost,
          is_postcard: !isPost && postType === 'postcard',
          user_id: user.id 
        }]);

      if (dbError) throw dbError;

      alert(isPost ? '【運営】常設ポストを設置しました！' : (postType === 'postcard' ? '【運営】として絵葉書を置きました！' : '【運営】として手紙を置きました！'));
      
      setTitle(''); setSpotName(''); setPages(['']); setImageFile(null);
      setIsPrivate(false); setPassword('');
      setHasStamp(false); setStampName(''); setStampFile(null);
      setIsPost(false); setPostType('letter');
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
    if (!isNaN(val) && val >= -90 && val <= 90) {
      setViewState(prev => ({ ...prev, latitude: val }));
    }
  };
  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLng(val); 
    if (!isNaN(val) && val >= -180 && val <= 180) {
      setViewState(prev => ({ ...prev, longitude: val }));
    }
  };

  if (!mapToken) return <div>Map Token Error</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
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

            {!isPost && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <label className="block text-xs font-bold text-blue-700 mb-2">投稿タイプ</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={postType === 'letter'} onChange={() => setPostType('letter')} className="accent-blue-600"/>
                    <span className="text-sm font-bold">便箋</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={postType === 'postcard'} onChange={() => setPostType('postcard')} className="accent-blue-600"/>
                    <span className="text-sm font-bold">ハガキ</span>
                  </label>
                </div>
              </div>
            )}

            {(postType === 'postcard' || ENABLE_PHOTO_UPLOAD) && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {postType === 'postcard' ? 'ハガキの写真' : '手紙の写真 (任意)'}
              </label>
              <input 
                type="file" accept="image/*"
                className="w-full text-sm text-gray-500"
                onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])}
                required={postType === 'postcard'} 
              />
            </div>
            )}

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
                    />
                    <div className={`text-[10px] text-right mt-1 font-bold ${getVisibleLength(pageContent) >= MAX_CHARS_PER_PAGE ? 'text-red-500' : 'text-gray-400'}`}>
                      {getVisibleLength(pageContent)} / {MAX_CHARS_PER_PAGE} 文字
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

            <div className="bg-green-50 p-4 rounded border border-green-200">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={isPost} 
                   onChange={() => {
                     setIsPost(!isPost);
                     if (!isPost) setPostType('letter');
                   }}
                   className="w-4 h-4 accent-green-600"
                 />
                 <span className="text-sm font-bold text-green-900">📮 『常設ポスト』として開放する</span>
               </label>
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
               緯度：<input type="number" step="any" className="w-full p-1 border rounded" value={lat} onChange={handleLatChange} />
               経度：<input type="number" step="any" className="w-full p-1 border rounded" value={lng} onChange={handleLngChange} />
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-orange-600 text-white font-bold py-3 rounded hover:bg-orange-700 disabled:bg-gray-300 shadow-md transition-colors"
            >
              {isSubmitting ? 'アップロード中...' : '投稿する'}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">📂 最近の投稿</h2>
          <div className="space-y-2">
            {letters.map((letter) => (
              <div key={letter.id} className={`p-3 rounded border flex justify-between items-center ${letter.is_official ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                <div className="cursor-pointer flex items-center gap-2" onClick={() => setViewState(prev => ({...prev, latitude: letter.lat, longitude: letter.lng, zoom: 16}))}>
                    <span className="text-lg">
                      {letter.is_post ? '📮' : (letter.is_postcard ? '🖼️' : '✉️')}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-gray-700 truncate w-32">{letter.title}</p>
                      <p className="text-[9px] text-gray-400">{letter.is_official ? '運営' : 'ユーザー'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${letter.id}`} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 font-bold">編集</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

          {/* ★ 現在地アイコン */}
          {userLoc && (
            <Marker longitude={userLoc.lng} latitude={userLoc.lat} anchor="center">
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
              </div>
            </Marker>
          )}

          <Marker 
            latitude={lat} longitude={lng} anchor="bottom" draggable
            onDragEnd={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}
          >
            {isPost ? (
              <IconPost className="w-10 h-10 drop-shadow-lg" />
            ) : postType === 'postcard' ? (
              <IconAdminPostcard className="w-10 h-10 drop-shadow-lg" />
            ) : (
              <IconAdminLetter className="w-10 h-10 drop-shadow-lg" />
            )}
          </Marker>
          
          {/* ★ 修正：parent_id がない（ルートの）投稿のみ表示し、ポスト重なりを防止 */}
          {letters.filter(l => !l.parent_id).map(l => {
            // ポスト内に手紙があるか判定
            const hasChildren = letters.some(child => child.parent_id === l.id);
            return (
              <Marker key={l.id} latitude={l.lat} longitude={l.lng} anchor="bottom" onClick={(e) => {e.originalEvent.stopPropagation(); router.push(`/admin/edit/${l.id}`)}}>
                <div className="relative cursor-pointer">
                  {l.is_post ? (
                    <IconPost className="w-10 h-10" hasLetters={hasChildren} />
                  ) : l.is_official ? (
                    l.is_postcard ? <IconAdminPostcard className="w-10 h-10" /> : <IconAdminLetter className="w-10 h-10" />
                  ) : (
                    l.is_postcard ? <IconPostcard className="w-10 h-10 opacity-70" /> : <IconUserLetter className="w-10 h-10 opacity-70" />
                  )}
                </div>
              </Marker>
            );
          })}
        </Map>
      </div>
    </main>
  );
}