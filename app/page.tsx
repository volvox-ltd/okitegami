'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase'; // 共通クライアント
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// コンポーネントのインポート
import Header from '@/components/Header';
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import IconAdminPostcard from '@/components/IconAdminPostcard';
import IconPost from '@/components/IconPost';
import IconPostcard from '@/components/IconPostcard'; 
import LetterModal from '@/components/LetterModal';
import PostcardModal from '@/components/PostcardModal'; 
import PostModal from '@/components/PostModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import TutorialModal from '@/components/TutorialModal'; 
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

// ★ 天候判定・劣化ロジックのインポート
import { calculateEffectiveHours, fetchIsRainy } from '@/utils/weather';

// react-map-gl は SSR を無効化
const Map = dynamic(() => import('react-map-gl').then(mod => mod.Map), { 
  ssr: false,
  loading: () => <div className="w-full h-screen bg-[#f7f4ea] animate-pulse" /> 
});
const Marker = dynamic(() => import('react-map-gl').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-map-gl').then(mod => mod.Popup), { ssr: false });
const NavigationControl = dynamic(() => import('react-map-gl').then(mod => mod.NavigationControl), { ssr: false });
const GeolocateControl = dynamic(() => import('react-map-gl').then(mod => mod.GeolocateControl), { ssr: false });

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; created_at: string; nickname?: string;
  password?: string | null; attached_stamp_id?: number | null;
  is_post?: boolean; parent_id?: string | null;
  is_postcard?: boolean;
};

const UNLOCK_DISTANCE = 30;      
const NOTIFICATION_DISTANCE = 100; 

function HomeContent() {
  const ADMIN_EMAILS = ["marei.suyama@gmail.com", "contact@volvox-ltd.com"];
  const router = useRouter();
  const mapRef = useRef<any>(null); // ★ マップの参照を保持
  
  const [letters, setLetters] = useState<Letter[]>([]);
  const [allLetters, setAllLetters] = useState<Letter[]>([]);
  const [popupInfo, setPopupInfo] = useState<Letter | null>(null);
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  const [readingPost, setReadingPost] = useState<Letter | null>(null);
  const [readLetterIds, setReadLetterIds] = useState<string[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserPosts, setShowUserPosts] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  // ★ カウント通知用のステート
  const [showCounts, setShowCounts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ★ 雨モードのステート
  const [isRainy, setIsRainy] = useState(false);
  const [showRainNotice, setShowRainNotice] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  // ★ スタイル設定（雨の日は彩度の低い Light スタイル）
  const mapStyle = useMemo(() => {
    return isRainy ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/streets-v12";
  }, [isRainy]);

  // ★ 日本語化を強制適用する関数
  const applyLocalization = useCallback((map: any) => {
    if (!map) return;
    const style = map.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach((layer: any) => {
      if (layer.layout && layer.layout['text-field']) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce', ['get', 'name_ja'], ['get', 'name']
          ]);
        } catch (e) {}
      }
    });
    // 不要な情報を隠す
    const layersToHide = ['road-number-shield', 'road-exit-shield', 'motorway-junction'];
    layersToHide.forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
  }, []);

  // ★ スタイル切り替え時に日本語化を再実行するエフェクト
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleStyleLoad = () => applyLocalization(map);
    
    map.on('style.load', handleStyleLoad);
    if (map.isStyleLoaded()) applyLocalization(map);

    return () => map.off('style.load', handleStyleLoad);
  }, [mapStyle, applyLocalization]);

  const handleMapLoad = (evt: any) => {
    applyLocalization(evt.target);
  };

  // ★ 自動天気取得ロジック
  useEffect(() => {
    const checkWeather = async () => {
      // 1. 管理画面での「強制雨モード」設定があるか確認
      const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'force_rain').maybeSingle();
      
      if (settings?.value === 'true') {
        setIsRainy(true);
        setShowRainNotice(true);
      } else if (userLocation) {
        // 2. 設定がない場合は現在地からAPI取得
        const rainy = await fetchIsRainy(userLocation.lat, userLocation.lng);
        if (rainy) {
          setIsRainy(true);
          setShowRainNotice(true);
        }
      }
    };
    checkWeather();
  }, [userLocation]);

  // ★ 雨通知を10秒後に消す
  useEffect(() => {
    if (showRainNotice) {
      const timer = setTimeout(() => setShowRainNotice(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showRainNotice]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
        if (profile?.nickname) setMyNickname(profile.nickname);
        else setShowNicknameModal(true);
      } else setMyNickname(null);
    };
    checkUser();

    const storedReads = localStorage.getItem('read_letter_ids');
    if (storedReads) setReadLetterIds(JSON.parse(storedReads));

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUser();
        router.refresh();
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [router]);

  const markAsRead = (id: string) => {
    if (!readLetterIds.includes(id)) {
      const newIds = [...readLetterIds, id];
      setReadLetterIds(newIds);
      localStorage.setItem('read_letter_ids', JSON.stringify(newIds));
    }
  };

  const fetchLetters = useCallback(async () => {
    try {
      const { data: lettersData, error } = await supabase
        .from('letters')
        .select('id, title, spot_name, lat, lng, is_official, user_id, created_at, attached_stamp_id, is_post, parent_id, password, is_postcard');
      
      if (error || !lettersData) return;
      setAllLetters(lettersData as Letter[]);

      const rootLetters = lettersData.filter((l: any) => !l.parent_id);
      const userIds = Array.from(new Set(rootLetters.map(l => l.user_id).filter(Boolean)));
      
      let nicknameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
        profilesData?.forEach((p: any) => { nicknameMap[p.id] = p.nickname; });
      }

      const mergedLetters = rootLetters.map((l: any) => ({
        ...l, nickname: nicknameMap[l.user_id] || null
      }));
      setLetters(mergedLetters as Letter[]);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenTutorial')) setShowTutorial(true);
    fetchLetters();
  }, [fetchLetters]);

  const fetchLetterDetail = async (id: string) => {
    const { data, error } = await supabase.from('letters').select('*').eq('id', id).single();
    if (error) return null;
    return data as Letter;
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (!hasCentered) {
          setViewState(prev => ({ ...prev, latitude, longitude, zoom: 15 }));
          setHasCentered(true);
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasCentered]);

  const calculateDistance = (targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance({ latitude: userLocation.lat, longitude: userLocation.lng }, { latitude: targetLat, longitude: targetLng });
  };

  const handleGeolocateClick = () => {
    if (!userLocation) return;

    setViewState(prev => ({
      ...prev,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      zoom: 15,
      transitionDuration: 1000
    }));

    const count = letters.reduce((acc, letter) => {
      if (letter.is_post || (currentUser && letter.user_id === currentUser.id)) return acc;

      const dist = getDistance(
        { latitude: userLocation.lat, longitude: userLocation.lng },
        { latitude: letter.lat, longitude: letter.lng }
      );
      
      const isUnread = !readLetterIds.includes(letter.id);
      if (dist <= 3000 && isUnread) acc++;
      return acc;
    }, 0);

    setUnreadCount(count);
    setShowCounts(true);

    setTimeout(() => setShowCounts(false), 5000);
  };

  const nearestNotificationLetter = useMemo<Letter | null>(() => {
    if (!userLocation) return null;
    let nearest: Letter | null = null;
    let minDist = Infinity;
    letters.forEach(letter => {
      if (!letter.is_official && !showUserPosts) return;
      const dist = getDistance({ latitude: userLocation.lat, longitude: userLocation.lng }, { latitude: letter.lat, longitude: letter.lng });
      if (dist <= NOTIFICATION_DISTANCE && dist > UNLOCK_DISTANCE && dist < minDist) {
        minDist = dist; nearest = letter;
      }
    });
    return nearest;
  }, [userLocation, letters, showUserPosts]);

  useEffect(() => {
    const handleOpenPostParam = async () => {
      const params = new URLSearchParams(window.location.search);
      const openPostId = params.get('open_post');
      if (openPostId) {
        const targetPost = await fetchLetterDetail(openPostId);
        if (targetPost) {
          setTimeout(() => {
            if (targetPost.is_post) setReadingPost(targetPost);
            else setReadingLetter(targetPost);
            setViewState(prev => ({ ...prev, latitude: targetPost.lat, longitude: targetPost.lng, zoom: 16 }));
            window.history.replaceState(null, '', '/');
          }, 500);
        }
      }
    };
    handleOpenPostParam();
  }, [currentUser]); 

  const renderedMarkers = useMemo(() => {
    return letters.map((letter) => {
      if (!letter.is_official && !letter.is_post && !letter.parent_id && letter.created_at) {
        const expirationHours = LETTER_EXPIRATION_HOURS || 48;
        const effectiveHours = calculateEffectiveHours(letter.created_at, isRainy);
        if (effectiveHours > expirationHours) return null; 
      }
      if (!letter.is_official && !showUserPosts) return null;
      
      const distance = calculateDistance(letter.lat, letter.lng);
      const isMyPost = currentUser && currentUser.id === letter.user_id;
      const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
      const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isMyPost || isAdmin;
      const isRead = readLetterIds.includes(letter.id);
      const postHasLetters = allLetters.some(l => l.parent_id === letter.id);

      // ★ 自分のは跳ねないように修正済
      const shouldBounce = isReachable && !letter.is_post && !isRead && !isMyPost;

      return (
        <Marker key={letter.id} latitude={letter.lat} longitude={letter.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(letter); }} style={{ zIndex: isReachable ? 10 : 1 }}>
          <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-70' : ''}`}>
            
            <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center ${isReachable ? 'border-orange-500 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
               <span className="font-bold">
                 {letter.is_post 
                   ? (letter.spot_name ? `${letter.spot_name}のポスト` : 'ポスト') 
                   : letter.is_postcard 
                     ? (letter.is_official ? (letter.spot_name ? `${letter.spot_name}の絵葉書` : '運営の絵葉書') : (letter.spot_name ? `${letter.spot_name}の絵葉書` : '誰かの絵葉書'))
                     : (letter.is_official 
                         ? (letter.spot_name ? `${letter.spot_name}の手紙` : '名も無き手紙') 
                         : (letter.nickname ? `${letter.nickname}さんの手紙` : '誰かの手紙'))
                 }
               </span>
               {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1 font-sans">{letter.is_post ? '投函できます！' : '読めます！'}</span>}
            </div>

            <div className={`transition-transform duration-300 drop-shadow-md relative ${shouldBounce ? 'animate-bounce' : 'hover:scale-110'}`}
              style={{ filter: (isRainy && !letter.is_official) ? 'grayscale(0.7) blur(0.9px) brightness(0.85)' : 'none' }}
            >
               {letter.is_post ? (
                 <div className={isReachable ? "text-red-600" : "text-red-700"}>
                   <IconPost className="w-14 h-14" hasLetters={postHasLetters} />
                 </div>
               ) : letter.is_postcard ? (
                 <div className={isReachable ? (letter.is_official ? "text-yellow-500" : "text-orange-500") : "text-bunko-ink"}>
                   {letter.is_official ? <IconAdminPostcard className="w-12 h-12" /> : <IconPostcard className="w-12 h-12" />}
                 </div>
               ) : (
                 <div className={isReachable ? (letter.is_official ? "text-yellow-500" : "text-orange-500") : "text-bunko-ink"}>
                    {letter.is_official ? <IconAdminLetter className="w-10 h-10" /> : <IconUserLetter className="w-10 h-10" />}
                 </div>
               )}

               {isRead && !letter.is_post && !isMyPost && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-md border border-gray-100 z-30">
                    <span className="text-[10px] text-green-600 font-bold">✔︎</span>
                  </div>
               )}
            </div>
          </div>
        </Marker>
      );
    });
  }, [letters, allLetters, showUserPosts, userLocation, readLetterIds, currentUser, isRainy]);

  const getPostUrl = () => {
    if (!currentUser) return '/login?next=/post';
    return userLocation ? `/post?lat=${userLocation.lat}&lng=${userLocation.lng}` : '/post';
  };

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapToken) return null;

  return (
    <main className="w-full h-screen relative overflow-hidden bg-[#f7f4ea]">
      {showNicknameModal && currentUser && (
        <NicknameModal user={currentUser} onRegistered={(name) => { setMyNickname(name); setShowNicknameModal(false); }} />
      )}

      <Header currentUser={currentUser} nickname={myNickname} onAboutClick={() => setShowAbout(true)} isHidden={false} />

      {/* ★ 雨告知バー ＆ 未読通知（同じ右上にスタックし、雨通知は10秒で消える） */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+64px)] right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {showRainNotice && (
          <div className="bg-blue-600/85 backdrop-blur-md text-white px-3 py-1 rounded-lg shadow-xl border border-white/10 text-right leading-relaxed animate-fadeInDown pointer-events-auto">
            <p className="text-[10px] font-serif tracking-widest opacity-90">現在、雨が降っています</p>
            <p className="text-[10px] font-serif tracking-wider whitespace-nowrap">手紙が痛みやすくなっています</p>
          </div>
        )}
        
        {showCounts && (
          <div className="bg-stone-500/85 backdrop-blur-md text-white px-3 py-1 rounded-lg shadow-xl border border-white/10 text-right leading-relaxed animate-fadeInDown pointer-events-auto">
            <p className="text-[10px] font-serif tracking-widest opacity-90">半径3kmに未読の手紙が</p>
            <p className="text-[10px] font-serif tracking-wider whitespace-nowrap"><span className="text-sm">{unreadCount}通</span>あります</p>
          </div>
        )}
      </div>

      <div className="absolute left-4 z-20 transition-all top-[calc(env(safe-area-inset-top)+64px)] md:top-[calc(env(safe-area-inset-top)+70px)]">
        <div className="flex items-center bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-md border border-gray-100">
          <span className="text-[10px] font-bold text-gray-600 mr-2 font-sans">みんなの手紙</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={showUserPosts} onChange={() => setShowUserPosts(!showUserPosts)} />
            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
      </div>

      {nearestNotificationLetter && !popupInfo && (
        <div className="fixed right-4 top-32 z-30 animate-slideInRight" onClick={() => {
          setPopupInfo(nearestNotificationLetter);
          setViewState(prev => ({ ...prev, latitude: nearestNotificationLetter.lat, longitude: nearestNotificationLetter.lng, zoom: 16 }));
        }}>
           <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-white">
              <span className="text-[10px] font-bold text-gray-600 font-sans">近くに手紙があります</span>
           </div>
        </div>
      )}

      {/* 地図コンテナ */}
      <div className="w-full h-full relative" style={{ 
        filter: isRainy ? 'saturate(0.5) brightness(0.85) contrast(1.1)' : 'none', 
        transition: 'filter 2s ease-in-out' 
      }}>
        {isRainy && (
          <div className="absolute inset-0 z-10 pointer-events-none bg-[#1a3a5a]/25 mix-blend-multiply animate-pulse-slow"></div>
        )}
        
        <Map
          {...viewState}
          ref={mapRef} 
          onMove={evt => setViewState(evt.viewState)}
          onLoad={handleMapLoad}
          onStyleData={(evt: any) => applyLocalization(evt.target)} // ★ ビルドエラー修正： :any を追加
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          mapboxAccessToken={mapToken}
          onClick={() => setPopupInfo(null)}
          fog={isRainy ? {
            "range": [0.2, 5],
            "color": "#94a3b8",
            "high-color": "#475569",
            "space-color": "#1e293b",
            "horizon-blend": 0.7
          } : undefined}
        >
          <div className="absolute bottom-[350px] right-[16px] z-10">
            <div className="mapboxgl-ctrl mapboxgl-ctrl-group" style={{ margin: 0, background: '#fff', borderRadius: '4px', boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}>
              <button 
                className="flex items-center justify-center transition-colors hover:bg-gray-50" 
                style={{ width: '29px', height: '29px', border: 0, padding: 0, cursor: 'pointer', background: 'transparent', outline: 'none' }}
                type="button" 
                onClick={handleGeolocateClick}
                title="Find my location"
              >
                <svg className="w-7 h-5" viewBox="0 0 427.17 709.4" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#2196f3" d="M427.17,213.59c0,175.06-213.59,397.25-213.59,397.25,0,0-213.59-222.19-213.59-397.25C0,95.62,95.62,0,213.59,0s213.59,95.62,213.59,213.59Z"/>
                  <circle fill="#fff" cx="213.59" cy="213.59" r="102.43"/>
                  <path fill="#2196f3" d="M358.72,635.71c0,40.7-64.98,73.69-145.13,73.69s-145.13-32.99-145.13-73.69c0-29.53,34.21-55,83.61-66.75,28.47,34.97,49.36,56.8,50.74,58.23l10.79,11.22,10.79-11.22c1.38-1.44,22.27-23.27,50.74-58.23,49.4,11.75,83.61,37.23,83.61,66.75Z"/>
                </svg>
              </button>
            </div>
          </div>

          <NavigationControl position="bottom-right" style={{ marginBottom: '200px', marginRight: '16px' }} />

          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
              </div>
            </Marker>
          )}

          {renderedMarkers}

          {popupInfo && (
            <Popup latitude={popupInfo.lat} longitude={popupInfo.lng} anchor="bottom" offset={[0, -40]} onClose={() => setPopupInfo(null)} closeOnClick={false} className="z-50">
              <div className="p-2 min-w-[160px] text-center pt-4 font-sans"> 
                <h3 className="font-bold text-sm mb-1 text-bunko-ink font-serif">{popupInfo.title}</h3>
                <p className="text-[10px] text-gray-500 mb-1 font-sans">
                  {popupInfo.is_post ? (popupInfo.spot_name || 'ポスト') : (popupInfo.spot_name || '')}
                </p>
                {(() => {
                  const dist = calculateDistance(popupInfo.lat, popupInfo.lng);
                  const isMyPost = currentUser && currentUser.id === popupInfo.user_id;
                  const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
                  const isReachable = (dist !== null && dist <= UNLOCK_DISTANCE) || isAdmin || isMyPost;
                  if (dist === null) return <p className="text-xs text-gray-400 font-sans">確認中...</p>;
                  if (isReachable) {
                    return (
                      <button 
                        onClick={async () => { 
                          const detail = await fetchLetterDetail(popupInfo.id);
                          if (!detail) return;
                          if (popupInfo.is_post) setReadingPost(detail); 
                          else setReadingLetter(detail);
                        }} 
                        className={`w-full text-white text-xs py-2 px-4 rounded-full transition-colors shadow-sm font-bold font-sans ${
                          popupInfo.is_post 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : (popupInfo.is_official ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-700 hover:bg-green-800')
                        }`}
                      >
                        {popupInfo.is_post ? 'ポストを開く' : (popupInfo.is_postcard ? 'ハガキを読む' : '手紙を読む')}
                      </button>
                    );
                  }
                  return <div className="bg-gray-100 text-gray-500 text-xs py-2 px-2 rounded-full border border-gray-200 font-sans">🔒 あと {dist}m</div>;
                })()}
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2 font-sans">
        <div className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative" onClick={() => router.push(currentUser ? (userLocation ? `/post?lat=${userLocation.lat}&lng=${userLocation.lng}` : '/post') : '/login?next=/post')}>
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        <Link href={currentUser ? (userLocation ? `/post?lat=${userLocation.lat}&lng=${userLocation.lng}` : '/post') : '/login?next=/post'}>
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 text-white' : 'bg-gray-400 text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
        </Link>
      </div>

      {readingLetter && (
        readingLetter.is_postcard ? (
          <PostcardModal 
            letter={readingLetter} 
            currentUser={currentUser} 
            isRainy={isRainy}
            onClose={() => {
              setReadingLetter(null);
              setPopupInfo(null);
            }} 
            onRead={(id) => markAsRead(id)} 
            onDeleted={() => {
              const deletedId = readingLetter.id;
              setLetters(prev => prev.filter(l => l.id !== deletedId));
              setAllLetters(prev => prev.filter(l => l.id !== deletedId));
              setPopupInfo(null);
              setReadingLetter(null);
            }} 
          />
        ) : (
          <LetterModal 
            letter={readingLetter} 
            currentUser={currentUser} 
            isRainy={isRainy}
            onClose={() => {
              setReadingLetter(null);
              setPopupInfo(null);
            }} 
            onRead={(id) => markAsRead(id)} 
            onDeleted={() => {
              const deletedId = readingLetter.id;
              setLetters(prev => prev.filter(l => l.id !== deletedId));
              setAllLetters(prev => prev.filter(l => l.id !== deletedId));
              setPopupInfo(null);
              setReadingLetter(null);
            }} 
          />
        )
      )}   

      {readingPost && (
        <PostModal 
          post={readingPost} 
          currentUser={currentUser} 
          isRainy={isRainy}
          onClose={() => {
            setReadingPost(null);
            setPopupInfo(null);
          }} 
          isReachable={true} 
        />
      )}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showTutorial && <TutorialModal onClose={() => { localStorage.setItem('hasSeenTutorial', 'true'); setShowTutorial(false); }} />}
      <AddToHomeScreen isOpen={showPwaPrompt} onClose={() => setShowPwaPrompt(false)} message="ホーム画面に追加しておきませんか？" />

      <style jsx global>{`
        @keyframes fadeInDown { 
          from { opacity: 0; transform: translateY(-20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fadeInDown { animation: fadeInDown 0.4s ease-out forwards; }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bounce-slow { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 8px); } }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        .animate-pulse-slow { animation: pulse-slow 5s infinite ease-in-out; }
        .mapboxgl-ctrl-geolocate { display: none !important; }
      `}</style>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#f7f4ea] flex items-center justify-center">読み込み中...</div>}>
      <HomeContent />
    </Suspense>
  );
}