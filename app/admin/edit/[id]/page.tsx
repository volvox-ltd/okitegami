'use client';
import { compressImage, compressStamp } from '@/utils/imageControl';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// ★修正1: Map を MapGL という名前に変更してインポート（名前衝突回避）
import MapGL, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/utils/supabase';

import IconAdminLetter from '@/components/IconAdminLetter';
import IconPost from '@/components/IconPost';

const PAGE_DELIMITER = '<<<PAGE>>>';
const MAX_CHARS_PER_PAGE = 140;
const MAX_PAGES_ADMIN = 20;

export default function EditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [pages, setPages] = useState<string[]>(['']);
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
  const [isPost, setIsPost] = useState(false);
  
  const [childLetters, setChildLetters] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 15 });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleMapLoad = (evt: any) => {
    const map = evt.target;
    map.getStyle().layers.forEach((layer: any) => {
      if (layer.layout && layer.layout['text-field']) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ja'],
            ['get', 'name']
          ]);
        } catch (e) {}
      }
    });
  };

  useEffect(() => {
    const fetchLetter = async () => {
      if(!id) return;
      
      const { data: letter, error } = await supabase.from('letters').select('*').eq('id', id).single();

      if (error) {
        alert('読み込みエラー');
        router.push('/admin');
        return;
      }

      if (letter) {
        setTitle(letter.title);
        setSpotName(letter.spot_name || '');
        const content = letter.content || '';
        if (content.includes(PAGE_DELIMITER)) setPages(content.split(PAGE_DELIMITER));
        else {
           const newPages = [];
           if (content.length === 0) newPages.push('');
           else {
             for (let i = 0; i < content.length; i += MAX_CHARS_PER_PAGE) newPages.push(content.slice(i, i + MAX_CHARS_PER_PAGE));
           }
           setPages(newPages);
        }
        setLat(letter.lat);
        setLng(letter.lng);
        setCurrentImageUrl(letter.image_url);
        setIsPost(letter.is_post || false);
        if (letter.password) { setIsPrivate(true); setPassword(letter.password); }
        if (letter.attached_stamp_id) {
          const { data: stampData } = await supabase.from('stamps').select('*').eq('id', letter.attached_stamp_id).single();
          if (stampData) { setCurrentStamp(stampData); setNewStampName(stampData.name); }
        }
        setViewState(prev => ({ ...prev, latitude: letter.lat, longitude: letter.lng }));
        
        if (letter.is_post) {
            fetchChildLetters(letter.id);
        }
        
        setIsLoading(false);
      }
    };
    fetchLetter();
  }, [id, router]);

  const fetchChildLetters = async (parentId: string) => {
    try {
      setLoadingChildren(true);
      
      const { data: lettersData, error } = await supabase
        .from('letters')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      if (lettersData && lettersData.length > 0) {
        const userIds = Array.from(new Set(lettersData.map(l => l.user_id)));
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);
        
        // ★ここでの new Map() が正常に動くようになります
        const profileMap = new Map(profilesData?.map((p: any) => [p.id, p.nickname]) || []);

        const mergedData = lettersData.map(l => ({
          ...l,
          nickname: profileMap.get(l.user_id) || '不明なユーザー',
          profiles: { nickname: profileMap.get(l.user_id) || '不明なユーザー' }
        }));
        
        setChildLetters(mergedData);
      } else {
        setChildLetters([]);
      }
    } catch (e) {
      console.error("Critical error in fetchChildLetters:", e);
      setChildLetters([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm('削除しますか？')) return;
    const { error } = await supabase.from('letters').delete().eq('id', childId);
    if (error) alert('削除に失敗しました');
    else setChildLetters(prev => prev.filter(l => l.id !== childId));
  };

  const getVisibleLength = (text: string) => text.replace(/<[^>]+>/g, '').length;
  const handlePageChange = (index: number, value: string) => {
    if (getVisibleLength(value) > MAX_CHARS_PER_PAGE) return;
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
  };
  const addPage = () => { if (pages.length < MAX_PAGES_ADMIN) setPages([...pages, '']); };
  const removePage = (index: number) => setPages(pages.filter((_, i) => i !== index));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('タイトルと内容を入力してください');
    if (isPrivate && !password) return alert('合言葉を入力してください');
    if ((isCreatingNewStamp || (currentStamp && !isStampDeleted)) && !newStampName) return alert('切手の名前を指定してください');

    setIsSubmitting(true);
    try {
      let finalImageUrl = currentImageUrl;
      if (isImageDeleted) finalImageUrl = null;
      if (newImageFile) {
        const compressed = await compressImage(newImageFile);
        const fileName = `letter_${Date.now()}.jpg`;
        await supabase.storage.from('letter-images').upload(fileName, compressed, { contentType: 'image/jpeg' });
        const { data } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      let finalStampId = currentStamp ? currentStamp.id : null;
      if (isStampDeleted) {
        finalStampId = null;
      } else if (newStampFile) {
        // 画像の軽量圧縮（WebP）
        const compressedStampFile = await compressStamp(newStampFile);
        const sPath = `stamp_${Date.now()}.webp`;
        await supabase.storage.from('stamp-images').upload(sPath, compressedStampFile, { contentType: 'image/webp' });
        const sUrl = supabase.storage.from('stamp-images').getPublicUrl(sPath).data.publicUrl;

        if (isCreatingNewStamp) {
          // 新規切手として登録
          const { data: newStamp } = await supabase.from('stamps').insert({ 
            name: newStampName, 
            image_url: sUrl, 
            description: `${spotName}の記念切手` 
          }).select().single();
          if (newStamp) finalStampId = newStamp.id;
        } else if (currentStamp) {
          // 既存切手の画像と名前を更新
          await supabase.from('stamps').update({ 
            name: newStampName, 
            image_url: sUrl 
          }).eq('id', currentStamp.id);
        }
      } else if (currentStamp && newStampName !== currentStamp.name) {
        // 名前だけの更新
        await supabase.from('stamps').update({ name: newStampName }).eq('id', currentStamp.id);
      }

      const contentToSave = pages.join(PAGE_DELIMITER);
      const { error } = await supabase.from('letters').update({
          title, spot_name: spotName || '名もなき場所', content: contentToSave, lat, lng,
          image_url: finalImageUrl, password: isPrivate ? password : null, attached_stamp_id: finalStampId, is_post: isPost
        }).eq('id', id);

      if (error) throw error;
      alert('更新しました！');
      router.push('/admin');
    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mapToken) return <div>Map Token Error</div>;
  if (isLoading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      <div className="w-full md:w-1/3 p-6 bg-white shadow-lg z-10 overflow-y-auto border-r border-orange-200 h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
          <h1 className="text-xl font-bold text-bunko-ink flex items-center gap-2"><IconAdminLetter className="w-6 h-6" /> 編集</h1>
          <button type="button" onClick={() => router.back()} className="text-xs text-gray-500 hover:underline">キャンセル</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <form id="edit-form" onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500">タイトル</label>
              <input type="text" className="w-full p-2 border rounded text-sm" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <label className="block text-xs font-bold text-gray-500">場所の名前</label>
              <input type="text" className="w-full p-2 border rounded text-sm" value={spotName} onChange={(e) => setSpotName(e.target.value)} />
            </div>
            
            <div className="border p-4 rounded bg-gray-50 relative">
              <label className="block text-xs font-bold text-gray-500 mb-2">手紙の写真</label>
              {currentImageUrl && !isImageDeleted && !newImageFile && (
                <div className="mb-3 relative inline-block">
                  <img src={currentImageUrl} alt="Current" className="h-24 w-auto object-cover rounded border" />
                  <button type="button" onClick={() => setIsImageDeleted(true)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600" title="削除"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )}
              {isImageDeleted && currentImageUrl && !newImageFile && (<div className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded flex justify-between"><span>画像を削除します</span><button type="button" onClick={() => setIsImageDeleted(false)} className="underline text-gray-600">元に戻す</button></div>)}
              <input type="file" accept="image/*" className="w-full text-xs text-gray-500" onChange={(e) => { if (e.target.files?.[0]) { setNewImageFile(e.target.files[0]); setIsImageDeleted(false); }}} />
              {newImageFile && <p className="text-[10px] text-green-600 mt-1">新しい画像を選択中</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">手紙の内容</label>
              <div className="space-y-4">
                  {pages.map((pageContent, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -top-2.5 left-2 bg-white px-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full">{index + 1} / {MAX_PAGES_ADMIN}枚目</div>
                      <textarea className="w-full p-3 pt-4 border rounded h-32 text-sm resize-none font-serif leading-relaxed" placeholder="手紙の内容" value={pageContent} onChange={e => handlePageChange(index, e.target.value)} />
                      <div className={`text-[10px] text-right mt-1 font-bold ${getVisibleLength(pageContent) >= MAX_CHARS_PER_PAGE ? 'text-red-500' : 'text-gray-400'}`}>{getVisibleLength(pageContent)} / {MAX_CHARS_PER_PAGE} 文字</div>
                      {pages.length > 1 && (<button type="button" onClick={() => removePage(index)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400">🗑️</button>)}
                    </div>
                  ))}
              </div>
              {pages.length < MAX_PAGES_ADMIN ? (<button type="button" onClick={addPage} className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 text-xs font-bold hover:bg-gray-50 hover:border-green-400 transition-colors">＋ 便箋を追加する（あと{MAX_PAGES_ADMIN - pages.length}枚）</button>) : (<p className="text-xs text-red-500 text-center mt-2">※これ以上追加できません</p>)}
            </div>

            <div className="border border-yellow-200 p-4 rounded bg-yellow-50 relative">
              <label className="block text-xs font-bold text-yellow-800 mb-2">🎁 切手の設定</label>
              {currentStamp && !isStampDeleted && !isCreatingNewStamp && (
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2 bg-white p-2 rounded border border-yellow-100">
                    <img src={currentStamp.image_url} alt="stamp" className="w-10 h-auto border" />
                    <div className="flex-1"><p className="text-xs font-bold">{currentStamp.name}</p><p className="text-[10px] text-gray-400">現在設定中</p></div>
                    <button type="button" onClick={() => setIsStampDeleted(true)} className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded hover:bg-red-200">外す</button>
                  </div>
                  <div className="pl-2 border-l-2 border-yellow-300 space-y-2 mt-2"><p className="text-[10px] font-bold text-gray-500">この切手の情報を更新する:</p><input type="text" placeholder="名前を変更" className="w-full p-2 border rounded text-xs" value={newStampName} onChange={e => setNewStampName(e.target.value)} /><input type="file" accept="image/*" className="w-full text-xs text-gray-500" onChange={(e) => e.target.files?.[0] && setNewStampFile(e.target.files[0])} />{newStampFile && <p className="text-[10px] text-green-600">※新しい画像で上書きされます</p>}</div>
                </div>
              )}
              {isStampDeleted && (<div className="text-xs text-red-600 mb-3 bg-white p-2 rounded border border-red-100 flex justify-between"><span>この切手を外します</span><button type="button" onClick={() => setIsStampDeleted(false)} className="underline">元に戻す</button></div>)}
              {(!currentStamp || isStampDeleted || isCreatingNewStamp) && (
                <div className="mt-2">
                  {!currentStamp && (<label className="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" checked={isCreatingNewStamp} onChange={() => setIsCreatingNewStamp(!isCreatingNewStamp)} className="accent-orange-600" /><span className="text-xs font-bold">新しい切手を作成して付ける</span></label>)}
                  {isCreatingNewStamp && (<div className="pl-4 border-l-2 border-yellow-300 space-y-2"><input type="text" placeholder="切手の名前" className="w-full p-2 border rounded text-xs" value={newStampName} onChange={e => setNewStampName(e.target.value)} /><input type="file" accept="image/*" className="w-full text-xs text-gray-500" onChange={(e) => e.target.files?.[0] && setNewStampFile(e.target.files[0])} /><p className="text-[10px] text-gray-400">※PNG画像なら背景透過が維持されます</p></div>)}
                </div>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded border border-green-200">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isPost} onChange={() => setIsPost(!isPost)} className="w-4 h-4 accent-green-600" /><span className="text-sm font-bold text-green-900">📮 『常設ポスト』として開放する</span></label>
              <p className="text-[10px] text-green-700 mt-1 pl-6">ONにすると、この手紙の詳細画面に「ここに手紙を書く」ボタンが表示されます。</p>
            </div>

            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <label className="block text-xs font-bold text-gray-600 mb-2">公開設定</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-orange-600"/><span className="text-xs">誰でもOK</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-orange-600"/><span className="text-xs">合言葉</span></label>
              </div>
              {isPrivate && (<input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-xs" placeholder="合言葉を入力" />)}
            </div>

            <div className="bg-gray-100 p-2 rounded text-xs text-gray-500">
              <p className="font-bold mb-1">📍 場所の変更</p>
              <p>地図上のマーカーをドラッグするか、地図をクリックして変更できます。</p>
            </div>
          </form>

          {/* ★子手紙リスト */}
          {isPost && (
            <div className="mt-8 border-t-2 border-dashed border-gray-300 pt-6 pb-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <span>📨</span> 投函された手紙
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {loadingChildren ? '読込中...' : `${childLetters.length}件`}
                  </span>
                </h3>
                <button onClick={() => id && fetchChildLetters(id as string)} className="text-xs text-blue-600 underline">更新</button>
              </div>

              {loadingChildren ? (
                <div className="text-center py-4 text-xs text-gray-400">読み込み中...</div>
              ) : childLetters.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 border border-gray-100 rounded bg-gray-50">まだ手紙はありません</div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 border border-gray-100 rounded p-2 bg-gray-50">
                  {childLetters.map(child => (
                    <div key={child.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px]">👤</div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">{child.nickname}</p>
                            <p className="text-[10px] text-gray-400">{new Date(child.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteChild(child.id)} className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100 hover:bg-red-100">削除</button>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{child.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 bg-white shrink-0">
          <button type="submit" form="edit-form" disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-3 rounded shadow-md">
            {isSubmitting ? '保存中...' : '変更を保存する'}
          </button>
        </div>
      </div>

      <div className="w-full md:w-2/3 h-[50vh] md:h-screen relative">
        {/* ★修正2: MapGL コンポーネントを使用 */}
        <MapGL
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onLoad={handleMapLoad}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={mapToken}
          cursor="crosshair"
          onClick={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}
        >
          <NavigationControl position="top-right" />
          <Marker latitude={lat} longitude={lng} anchor="bottom" draggable onDragEnd={(e) => { setLat(e.lngLat.lat); setLng(e.lngLat.lng); }}>
            <div className="animate-bounce">
               {isPost ? <IconPost className="w-12 h-12 text-red-600 drop-shadow-lg" /> : <IconAdminLetter className="w-10 h-10 drop-shadow-lg" />}
            </div>
          </Marker>
          {currentImageUrl && <Marker latitude={lat} longitude={lng} anchor="top" offset={[0, 10]}><div className="bg-white p-1 shadow rounded border border-gray-200"><img src={currentImageUrl} className="w-12 h-auto rounded" alt="mini preview" /></div></Marker>}
        </MapGL>
      </div>
    </main>
  );
}