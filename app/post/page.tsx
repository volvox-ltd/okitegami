'use client';
import { compressImage, processPostcardImage } from '@/utils/imageControl';
import { useState, useEffect, Suspense, useCallback } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import IconUserLetter from '@/components/IconUserLetter';
import IconPostcard from '@/components/IconPostcard';
import { NG_WORDS } from '@/utils/ngWords';
import { getDistance } from 'geolib';
import AddToHomeScreen from '@/components/AddToHomeScreen';
// ★ 共通クライアントを使用
import { supabase } from '@/utils/supabase';
// ★ 有効期限の設定と写真スイッチをインポート
import { LETTER_EXPIRATION_HOURS, ENABLE_PHOTO_UPLOAD } from '@/utils/constants';
import { addAcorns } from '@/utils/acorn';

const PAGE_DELIMITER = '<<<PAGE>>>';
const MAX_CHARS_LETTER = 140; // 通常の便箋の制限
const MAX_CHARS_POSTCARD = 70; // 絵葉書の制限
const MAX_PAGES = 10;
const MIN_DISTANCE = 30; 

// ★ 絵葉書機能の公開フラグ
const IS_POSTCARD_RELEASED = true; 

function PostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ★ 投稿タイプを管理するステート (letter = 便箋, postcard = 絵葉書)
  const [postType, setPostType] = useState<'letter' | 'postcard'>('letter');
  const [acornCount, setAcornCount] = useState<number>(0);

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const [title, setTitle] = useState('');
  const [spotName, setSpotName] = useState('');
  const [pages, setPages] = useState<string[]>(['']); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  // ★ 追加：手紙の返信を許可するステート（初期値は許可）
  const [allowReply, setAllowReply] = useState(true);

  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 16 });
  const [pinLocation, setPinLocation] = useState({ lat: 35.6288, lng: 139.6842 });

  const [isRainy, setIsRainy] = useState(false);

  // 認証状態の取得
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        
        // ★ 追加：ログインユーザーのどんぐり数を取得
        supabase.from('profiles')
          .select('acorn_count')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setAcornCount(profile.acorn_count || 0);
          });
      }
    });

    // ★ 追加：雨判定の取得
    const fetchRain = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'force_rain').maybeSingle();
      if (data?.value === 'true') setIsRainy(true);
    };
    fetchRain();

  }, []);

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      setViewState((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      setPinLocation({ lat, lng });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setViewState((prev) => ({ ...prev, latitude, longitude }));
        setPinLocation({ lat: latitude, lng: longitude });
      });
    }
  }, [searchParams]);

  const handlePageChange = (index: number, value: string) => {
    const charLimit = postType === 'postcard' ? MAX_CHARS_POSTCARD : MAX_CHARS_LETTER;
    if (value.length > charLimit) return;
    
    const newPages = [...pages];
    newPages[index] = value;
    setPages(newPages);
  };

  const addPage = () => { 
    if (postType === 'letter' && pages.length < MAX_PAGES) {
      setPages([...pages, '']); 
    }
  };
  
  const removePage = (index: number) => setPages(pages.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    const fullContent = pages.join('');
    if (!title || !fullContent.trim()) return alert('手紙の名前と内容を入力してください');
    
    // 絵葉書の場合は写真が必須
    if (postType === 'postcard' && !imageFile) {
      return alert('絵葉書には写真の添付が必要です。');
    }

    if (isPrivate && !password) return alert('合言葉を入力してください');

    setIsLoading(true);

    // 最新のユーザー情報を再取得
    const { data: { user: latestUser } } = await supabase.auth.getUser();
    if (!latestUser) {
      alert('セッションが切れました。再読み込みしてください。');
      setIsLoading(false);
      return;
    }

    // 15分以内の連投制限チェック
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentLetters, error: rateLimitError } = await supabase
      .from('letters')
      .select('created_at')
      .eq('user_id', latestUser.id)
      .gt('created_at', fifteenMinutesAgo)
      .limit(1);

    if (rateLimitError) throw rateLimitError;

    if (recentLetters && recentLetters.length > 0) {
      alert('手紙は15分に一回しか置けません。少し時間をおいてから投稿してください。');
      setIsLoading(false);
      return;
    }

    // NGワードチェック
    const foundNgWord = NG_WORDS.find(word => title.includes(word) || fullContent.includes(word) || spotName.includes(word));
    if (foundNgWord) {
      alert(`不適切な表現が含まれています: 「${foundNgWord}」`);
      setIsLoading(false);
      return;
    }

    try {
      // --- 画像アップロード処理 ---
      let publicUrl = null;
      if ((postType === 'postcard' || ENABLE_PHOTO_UPLOAD) && imageFile) {
        if (imageFile.size > 20 * 1024 * 1024) {
          alert('画像サイズが大きすぎます。20MB以下の画像を選択してください。');
          setIsLoading(false);
          return;
        }

        let fileToUpload: File;
        const mimeType = 'image/webp';

        if (postType === 'postcard') {
          fileToUpload = await processPostcardImage(imageFile, spotName);
        } else {
          fileToUpload = await compressImage(imageFile);
        }

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
        
        const { error: uploadError } = await supabase.storage
          .from('letter-images')
          .upload(fileName, fileToUpload, { 
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false 
          });

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('letter-images').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      // --- DB保存 ---
      const { error: insertError } = await supabase.from('letters').insert({
        title,
        content: pages.join(PAGE_DELIMITER),
        spot_name: spotName || '名もなき場所', 
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        image_url: publicUrl,
        user_id: latestUser.id,
        is_official: false,
        password: isPrivate ? password : null,
        is_postcard: postType === 'postcard',
        allow_reply: allowReply
      });

      if (insertError) throw insertError;

      // ★ どんぐり加算：雨の日なら2、晴れなら1
      const acornAmount = isRainy ? 2 : 1;
      await addAcorns(latestUser.id, acornAmount, 'letter_written');

      setShareUrl(`${window.location.origin}/?lat=${pinLocation.lat}&lng=${pinLocation.lng}`);
      setIsCompleted(true);
      setTimeout(() => setShowPwaPrompt(true), 2000);
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました。認証設定または通信環境を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineShare = () => {
    const shareText = `「${spotName || 'ある場所'}」に手紙を置きました。${isPrivate ? `\n🔑 合言葉：${password}` : ''}\n\n#おきてがみ`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
  };

  const handleCopyLink = () => {
    const shareText = `「${spotName || 'ある場所'}」に手紙を置きました。${isPrivate ? `合言葉は「${password}」です。` : ''} #おきてがみ ${shareUrl}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000); 
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 font-sans">
      <div className="absolute inset-0 z-0">
        <Map {...viewState} onMove={evt => setViewState(evt.viewState)} style={{ width: '100%', height: '100%' }} mapStyle="mapbox://styles/mapbox/streets-v12" mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN} onClick={() => router.push('/')}>
          <NavigationControl position="top-right" style={{ marginTop: '80px' }} />
          <GeolocateControl position="top-right" />
          <Marker latitude={pinLocation.lat} longitude={pinLocation.lng} anchor="bottom">
            <div className="animate-bounce drop-shadow-lg">
               {postType === 'postcard' ? <IconPostcard className="w-12 h-12" /> : <IconUserLetter className="w-10 h-10" />}
            </div>
          </Marker>
        </Map>
      </div>

      <Link href="/" className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 px-4 rounded-full shadow-md text-gray-600 font-bold text-xs">✕ キャンセル</Link>

      {!isCompleted && (
        <div className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl z-20 shadow-2xl transition-all duration-300 flex flex-col ${isExpanded ? 'h-[85%] md:h-[80%]' : 'h-40'}`}>
          <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          <div className="px-6 flex gap-4 border-b border-gray-100 pb-2 shrink-0">
            <button 
              onClick={() => { setPostType('letter'); setPages(['']); }} 
              className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${postType === 'letter' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'}`}
            >
              便箋
            </button>
            {/* ★ 修正：葉書ボタンのロック判定 */}
            {(() => {
              const isUnlocked = acornCount >= 100;
              return (
                <button 
                  onClick={() => { 
                    if(isUnlocked) { setPostType('postcard'); setPages(['']); } 
                    else { alert('どんぐりが100個貯まると、ハガキが解放されます。'); }
                  }} 
                  className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 
                    ${postType === 'postcard' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-300'} 
                    ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}
                >
                  葉書 
                  {!isUnlocked && (
                    <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      🌰 100
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 pb-8">
            <div className="space-y-5 pt-4">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">手紙の名前</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-300 outline-none" placeholder="手紙の名前" /></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">場所</label><input type="text" value={spotName} onChange={(e) => setSpotName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-300 outline-none" placeholder="例：大きな桜の木の下" /></div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">手紙の内容</label>
                <div className="space-y-6">
                  {pages.map((pageContent, index) => (
                    <div key={index} className="relative">
                      {postType === 'letter' && (
                        <div className="absolute -top-2.5 left-2 bg-white px-2 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full">{index + 1} / {MAX_PAGES}枚目</div>
                      )}
                      <textarea 
                        value={pageContent} 
                        onChange={(e) => handlePageChange(index, e.target.value)} 
                        className="w-full h-36 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-4 text-sm focus:ring-2 focus:ring-green-300 resize-none font-serif" 
                        placeholder={postType === 'postcard' ? "思い出を綴ってください（70文字以内）" : "ここに手紙を書いてください..."}
                      ></textarea>
                      <div className={`text-[10px] text-right mt-1 font-bold ${pageContent.length >= (postType === 'postcard' ? MAX_CHARS_POSTCARD : MAX_CHARS_LETTER) ? 'text-red-500' : 'text-gray-400'}`}>
                        {pageContent.length} / {postType === 'postcard' ? MAX_CHARS_POSTCARD : MAX_CHARS_LETTER} 文字
                      </div>
                      {postType === 'letter' && pages.length > 1 && (
                        <button onClick={() => removePage(index)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {postType === 'letter' && pages.length < MAX_PAGES && (
                  <button onClick={addPage} className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-bold flex items-center justify-center gap-2">＋ 便箋を追加する</button>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 mb-3">公開設定</label>
                <div className="flex gap-6 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="w-4 h-4 accent-green-600"/><span className="text-sm font-bold">誰でもOK</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} className="w-4 h-4 accent-green-600"/><span className="text-sm font-bold">合言葉をつける</span></label>
                </div>
                {isPrivate && <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm outline-none" placeholder="合言葉を入力" />}
                
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={allowReply} 
                      onChange={(e) => setAllowReply(e.target.checked)} 
                      className="w-4 h-4 accent-green-600 rounded"
                    />
                    <span className="text-sm font-bold text-gray-700">手紙の返信を許可する</span>
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1 ml-6">許可すると、他の人がこの手紙に返事を書けるようになります。</p>
                </div>
              </div>

              {(ENABLE_PHOTO_UPLOAD || postType === 'postcard') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    写真 {postType === 'postcard' ? <span className="text-red-500">（その場で撮影）</span> : '（任意）'}
                  </label>
                  <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture={postType === 'postcard' ? "environment" : undefined} 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])} 
                    />
                    {imageFile ? (
                      <span className="text-green-600 text-sm font-bold">{imageFile.name}</span>
                    ) : (
                      <div className="text-gray-400 text-sm flex flex-col items-center gap-1">
                        <span>＋ {postType === 'postcard' ? 'カメラを起動して撮影する' : '写真を追加する'}</span>
                        <span className="text-[10px] opacity-70">※葉書は「今、ここ」の風景のみが使えます</span>
                      </div>
                    )}
                  </label>
                </div>
              )}

              <button onClick={handleSubmit} disabled={isLoading} className={`w-full py-4 rounded-full text-white font-bold text-sm shadow-md active:scale-95 transition-all mt-4 ${isLoading ? 'bg-gray-400' : (postType === 'postcard' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700')}`}>
                {isLoading ? '手紙を置いています...' : (postType === 'postcard' ? 'この場所に葉書を置く' : 'この場所に手紙を置く')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="bg-[#fdfcf5] rounded-xl p-6 shadow-2xl relative border-4 border-white mb-6 text-center">
              <h3 className="font-serif text-lg font-bold text-bunko-ink mb-2">
                {postType === 'postcard' ? '葉書を置きました' : 'お手紙を置きました'}
              </h3>
              <p className="text-sm text-gray-700">場所：{spotName || '名もなき場所'}</p>
              {isPrivate && <p className="mt-2 text-orange-600 font-bold bg-orange-50 inline-block px-3 py-1 rounded-full text-xs">合言葉：{password}</p>}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleLineShare} className="w-full py-3.5 bg-[#06C755] text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2">LINEで招待状を送る</button>
              <button onClick={handleCopyLink} className={`w-full py-3.5 rounded-full font-bold shadow-md flex items-center justify-center gap-2 border ${isCopied ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>{isCopied ? 'コピーしました！' : 'URLをコピー'}</button>
              <button onClick={() => router.push('/')} className="mt-2 text-sm font-bold text-gray-400 text-center w-full">閉じて地図に戻る</button>
            </div>
          </div>
        </div>
      )}
      <AddToHomeScreen isOpen={showPwaPrompt} onClose={() => setShowPwaPrompt(false)} message="ホーム画面に追加しておきませんか？" />
      <style jsx global>{` @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; } `}</style>
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#f7f4ea]"><p className="text-sm text-green-800 font-serif">読み込み中...</p></div>}>
      <PostForm />
    </Suspense>
  );
}