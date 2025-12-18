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

// 区切り文字
const PAGE_DELIMITER = '<<<PAGE>>>';
// 1ページあたりの最大文字数
const MAX_CHARS_PER_PAGE = 180;
// 最大ページ数
const MAX_PAGES = 10;

export default function PostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [isExpanded, setIsExpanded] = useState(true);

  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  
  const [pages, setPages] = useState<string[]>(['']); 

  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 16 });
  const [pinLocation, setPinLocation] = useState({ lat: 35.6288, lng: 139.6842 });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        // 現在地を取得したら、地図の中心とピンの位置をそこに合わせる
        setViewState((prev) => ({ ...prev, latitude, longitude }));
        setPinLocation({ lat: latitude, lng: longitude });
      }, (error) => {
        console.error("位置情報の取得に失敗しました", error);
        alert("位置情報をオンにしてください。現在地に手紙を置くために必要です。");
      });
    }
  }, []);

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

  const handleSubmit = async () => {
    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('手紙の名前と内容を入力してください');
    
    if (isPrivate && !password) return alert('合言葉を入力してください');

    setIsLoading(true);

    const foundNgWord = NG_WORDS.find(word => 
      title.includes(word) || fullContent.includes(word) || spotName.includes(word)
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

    const contentToSave = pages.join(PAGE_DELIMITER);

    const { error: insertError } = await supabase
      .from('letters')
      .insert({
        title: title,
        content: contentToSave,
        spot_name: spotName || '名もなき場所', 
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
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      
      {/* 1. 地図エリア */}
      <div className="absolute inset-0 z-0">
        {mapToken && (
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapToken}
            // ★修正：onClickイベントを削除（地図タップでピン移動させない）
          >
            <NavigationControl position="top-right" style={{ marginTop: '80px' }} />
            
            {/* 現在地ボタンを押したときは、ビューだけでなくピンの位置も更新するロジックを入れても良いですが、
                基本はuseEffectで取得済みなので、ビュー移動のみの標準動作でOKとします */}
            <GeolocateControl position="top-right" />
            
            <Marker
              latitude={pinLocation.lat} longitude={pinLocation.lng} anchor="bottom" 
              // ★修正：draggable={true} と onDragEnd を削除（ピンを動かせないようにする）
            >
              <div className="animate-bounce drop-shadow-lg">
                <IconUserLetter className="w-12 h-12" />
              </div>
            </Marker>
          </Map>
        )}
      </div>

      <Link href="/" className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 px-4 rounded-full shadow-md text-gray-600 font-bold text-xs hover:bg-white transition-colors">
        ✕ キャンセル
      </Link>

      {!isExpanded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full text-center px-4">
           {/* ★修正：メッセージを変更 */}
           <span className="bg-white/80 backdrop-blur text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-200">
             現在地に手紙を置きます
           </span>
        </div>
      )}

      {/* 2. フォームエリア */}
      <div 
        className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out flex flex-col ${
          isExpanded ? 'h-[85%] md:h-[80%]' : 'h-40'
        }`}
      >
        <div 
          className="w-full flex items-center justify-center pt-3 pb-2 cursor-pointer shrink-0 hover:bg-gray-50 rounded-t-3xl transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        <div className="px-6 pb-2 shrink-0 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <IconUserLetter className="w-6 h-6" /> 
            {isExpanded ? '手紙を書く' : '現在地に置く（タップで開く）'}
          </h2>
          <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="space-y-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">手紙の名前</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="手紙の名前" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">場所の名前 <span className="text-gray-400 font-normal ml-1">(任意)</span></label>
              <input type="text" value={spotName} onChange={(e) => setSpotName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="例：大きな桜の木の下" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">手紙の内容</label>
              
              <div className="space-y-6">
                {pages.map((pageContent, index) => (
                  <div key={index} className="relative">
                    {/* 枚数表示 */}
                    <div className="absolute -top-2.5 left-2 bg-white px-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full">
                       {index + 1} / {MAX_PAGES}枚目
                    </div>
                    
                    <textarea 
                      value={pageContent} 
                      onChange={(e) => handlePageChange(index, e.target.value)} 
                      maxLength={MAX_CHARS_PER_PAGE} 
                      className="w-full h-36 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none leading-relaxed font-serif" 
                      placeholder="ここに手紙を書いてください..."
                    ></textarea>

                    {/* 文字数カウンター */}
                    <div className={`text-[10px] text-right mt-1 font-bold ${pageContent.length >= MAX_CHARS_PER_PAGE ? 'text-red-500' : 'text-gray-400'}`}>
                      {pageContent.length} / {MAX_CHARS_PER_PAGE} 文字
                    </div>

                    {/* 削除ボタン */}
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

              {/* ページ追加ボタン */}
              {pages.length < MAX_PAGES ? (
                <button 
                  onClick={addPage}
                  className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-bold hover:bg-gray-50 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
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