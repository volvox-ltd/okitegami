'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { compressImage } from '@/utils/imageControl';
import IconUserLetter from '@/components/IconUserLetter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_DELIMITER = '<<<PAGE>>>';
// ★変更：140文字に制限
const MAX_CHARS_PER_PAGE = 140;
const MAX_PAGES = 10;

export default function UserEditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<string[]>(['']);

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isImageDeleted, setIsImageDeleted] = useState(false);
  
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

      if (data.user_id !== user.id) {
        alert('編集権限がありません');
        router.push('/');
        return;
      }

      setTitle(data.title);
      
      const content = data.content || '';
      if (content.includes(PAGE_DELIMITER)) {
         setPages(content.split(PAGE_DELIMITER));
      } else {
         const newPages = [];
         if (content.length === 0) {
           newPages.push('');
         } else {
           for (let i = 0; i < content.length; i += MAX_CHARS_PER_PAGE) {
             newPages.push(content.slice(i, i + MAX_CHARS_PER_PAGE));
           }
         }
         setPages(newPages);
      }

      setLat(data.lat);
      setLng(data.lng);
      setCurrentImageUrl(data.image_url);
      setViewState({ latitude: data.lat, longitude: data.lng, zoom: 16 });
      setIsLoading(false);
    };
    fetchLetter();
  }, [id, router]);

  const handlePageChange = (index: number, value: string) => {
    if (value.length > MAX_CHARS_PER_PAGE) return;
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
  };

  const addPage = () => {
    if (pages.length >= MAX_PAGES) return;
    setPages([...pages, '']);
  };

  const removePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
  };

  const handleUpdate = async () => {
    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('タイトルと内容を入力してください');
    
    setIsSubmitting(true);

    try {
      let finalImageUrl = currentImageUrl;

      if (isImageDeleted && currentImageUrl) {
         const oldFileName = currentImageUrl.split('/').pop();
         if (oldFileName) await supabase.storage.from('letter-images').remove([oldFileName]);
         finalImageUrl = null;
      }

      if (newImageFile) {
        if (currentImageUrl && !isImageDeleted) {
           const oldFileName = currentImageUrl.split('/').pop();
           if (oldFileName) await supabase.storage.from('letter-images').remove([oldFileName]);
        }
        
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

      const contentToSave = pages.join(PAGE_DELIMITER);

      const { error } = await supabase
        .from('letters')
        .update({
          title,
          content: contentToSave,
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
        >
          <NavigationControl position="bottom-right" />
          <Marker
             latitude={lat} longitude={lng} anchor="bottom" 
          >
             <div className="animate-bounce drop-shadow-lg">
               <IconUserLetter className="w-12 h-12" />
             </div>
          </Marker>
        </Map>
        <div className="absolute bottom-2 w-full text-center z-10 pointer-events-none">
          <span className="bg-white/80 backdrop-blur text-gray-400 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-200">
            ※場所は変更できません
          </span>
        </div>
      </div>

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

          <div className="border border-dashed border-gray-300 rounded-lg p-3">
             <p className="text-xs font-bold text-gray-500 mb-2">写真</p>
             {currentImageUrl && !isImageDeleted && !newImageFile ? (
               <div className="flex items-center gap-3">
                 <img src={currentImageUrl} className="h-16 w-16 object-cover rounded" alt="current" />
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
            <label className="block text-xs font-bold text-gray-500 mb-2">内容</label>
            <div className="space-y-6">
                {pages.map((pageContent, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -top-2.5 left-2 bg-white px-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full">
                       {index + 1} / {MAX_PAGES}枚目
                    </div>
                    
                    <textarea 
                      value={pageContent} 
                      onChange={(e) => handlePageChange(index, e.target.value)} 
                      maxLength={MAX_CHARS_PER_PAGE} 
                      className="w-full h-36 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none leading-relaxed font-serif" 
                      placeholder="内容を編集..."
                    ></textarea>

                    <div className={`text-[10px] text-right mt-1 font-bold ${pageContent.length >= MAX_CHARS_PER_PAGE ? 'text-red-500' : 'text-gray-400'}`}>
                      {pageContent.length} / {MAX_CHARS_PER_PAGE} 文字
                    </div>

                    {pages.length > 1 && (
                      <button 
                        onClick={() => removePage(index)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {pages.length < MAX_PAGES ? (
                <button 
                  onClick={addPage}
                  className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-bold hover:bg-gray-50 hover:border-green-400 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  便箋を追加する （あと{MAX_PAGES - pages.length}枚）
                </button>
            ) : (
                <div className="w-full mt-4 py-3 bg-gray-100 rounded-lg text-gray-400 text-xs font-bold text-center border border-gray-200">
                  便箋は{MAX_PAGES}枚までです
                </div>
            )}
          </div>

          <button onClick={handleUpdate} disabled={isSubmitting} className={`w-full py-4 rounded-full text-white font-bold text-sm shadow-md transition-transform active:scale-95 mt-4 ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
            {isSubmitting ? '保存中...' : '変更を保存する'}
          </button>
          
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
}