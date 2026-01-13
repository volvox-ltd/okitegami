'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase'; 
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSupercluster from 'use-supercluster';
import Header from '@/components/Header';
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import IconAdminPostcard from '@/components/IconAdminPostcard';
import IconPost from '@/components/IconPost';
import IconPostcard from '@/components/IconPostcard'; 
import IconBookshelf from '@/components/IconBookshelf';
import BookshelfModal from '@/components/BookshelfModal';
import LetterModal from '@/components/LetterModal';
import PostcardModal from '@/components/PostcardModal'; 
import PostModal from '@/components/PostModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import TutorialModal from '@/components/TutorialModal'; 
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';
import MapMarkers from '@/components/MapMarkers';
import MapOverlayUI from '@/components/MapOverlayUI';
import ClusterListModal from '@/components/ClusterListModal';
import MapPopup from '@/components/MapPopup';
import MapCustomButtons from '@/components/MapCustomButtons';

// 天候判定・劣化ロジックのインポート
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

type Bookshelf = {
  id: string; area_key: string; display_name: string;
  lat: number; lng: number; landmark_name: string; thank_count: number;
};

const UNLOCK_DISTANCE = 30;      
const NOTIFICATION_DISTANCE = 100; 

function HomeContent() {
  const ADMIN_EMAILS = ["marei.suyama@gmail.com", "contact@volvox-ltd.com"];
  const router = useRouter();
  const mapRef = useRef<any>(null); 
  
  const [letters, setLetters] = useState<Letter[]>([]);
  const [allLetters, setAllLetters] = useState<Letter[]>([]);
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]); 
  const [popupInfo, setPopupInfo] = useState<any>(null); 
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  const [readingPost, setReadingLetterPost] = useState<Letter | null>(null);
  const [viewingBookshelf, setViewingBookshelf] = useState<Bookshelf | null>(null);
  const [isFromLibrary, setIsFromLibrary] = useState(false); 
  const [readLetterIds, setReadLetterIds] = useState<string[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserPosts, setShowUserPosts] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('last_user_location');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [hasCentered, setHasCentered] = useState(false);
  const hasCenteredRef = useRef(false); 
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const isFollowingUserRef = useRef(true);
  useEffect(() => { isFollowingUserRef.current = isFollowingUser; }, [isFollowingUser]);

  const [showCounts, setShowCounts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRainy, setIsRainy] = useState(false);
  const [showRainNotice, setShowRainNotice] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [isMounted, setIsMounted] = useState(false); 
  const [showNotification, setShowNotification] = useState(false); 
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null); 

  // ★ 新規追加：クラスター制御用
  const [bounds, setBounds] = useState<any>(null);
  const [selectedClusterLetters, setSelectedClusterLetters] = useState<any[]>([]);
  const [showClusterList, setShowClusterList] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: userLocation?.lat || 35.6288,
    longitude: userLocation?.lng || 139.6842,
    zoom: 15
  });

  const mapStyle = useMemo(() => isRainy ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/streets-v12", [isRainy]);

  const applyLocalization = useCallback((map: any) => {
    if (!map) return;
    const style = map.getStyle();
    if (!style || !style.layers) return;
    style.layers.forEach((layer: any) => {
      if (layer.layout && layer.layout['text-field']) {
        try { map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_ja'], ['get', 'name']]); } catch (e) {}
      }
    });
    const layersToHide = ['road-number-shield', 'road-exit-shield', 'motorway-junction'];
    layersToHide.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
  }, []);

  const [modalInitialLayer, setModalInitialLayer] = useState(0);

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
    // 初回の境界線を取得
    setBounds(evt.target.getBounds().toArray().flat());
  };

  useEffect(() => {
    const checkWeather = async () => {
      const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'force_rain').maybeSingle();
      if (settings?.value === 'true') { setIsRainy(true); setShowRainNotice(true); } 
      else if (userLocation) {
        const rainy = await fetchIsRainy(userLocation.lat, userLocation.lng);
        if (rainy) { setIsRainy(true); setShowRainNotice(true); }
      }
    };
    checkWeather();
  }, [userLocation]);

  useEffect(() => {
    if (showRainNotice) {
      const timer = setTimeout(() => setShowRainNotice(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showRainNotice]);

  useEffect(() => {
    setIsMounted(true); 
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
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') { checkUser(); router.refresh(); }
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

  const fetchLettersAndShelves = useCallback(async () => {
    try {
      const [lettersRes, shelvesRes] = await Promise.all([
        supabase
        .from('letters')
        .select('id, title, spot_name, lat, lng, is_official, user_id, created_at, attached_stamp_id, is_post, parent_id, password, is_postcard')
        .eq('is_deleted_from_map', false),
        supabase.from('bookshelves').select('*')
      ]);
      
      if (lettersRes.data) {
        const lettersData = lettersRes.data;
        setAllLetters(lettersData as Letter[]);
        const rootLetters = lettersData.filter((l: any) => !l.parent_id);
        const userIds = Array.from(new Set(rootLetters.map(l => l.user_id).filter(Boolean)));
        let nicknameMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
          profilesData?.forEach((p: any) => { nicknameMap[p.id] = p.nickname; });
        }
        const mergedLetters = rootLetters.map((l: any) => ({ ...l, nickname: nicknameMap[l.user_id] || null }));
        setLetters(mergedLetters as Letter[]);
      }
      if (shelvesRes.data) { setBookshelves(shelvesRes.data as Bookshelf[]); }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    const channel = supabase.channel('realtime-bookshelves').on('postgres_changes', { event: '*', schema: 'public', table: 'bookshelves' }, () => fetchLettersAndShelves()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLettersAndShelves]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc = { lat: latitude, lng: longitude };
        setUserLocation(newLoc);
        sessionStorage.setItem('last_user_location', JSON.stringify(newLoc));
        if (isFollowingUserRef.current && mapRef.current) { 
          mapRef.current.getMap().easeTo({ center: [longitude, latitude], duration: 1000 }); 
        }
        if (!hasCenteredRef.current) { setViewState(prev => ({ ...prev, latitude, longitude })); hasCenteredRef.current = true; setHasCentered(true); }
      },
      (error) => { if (error.code === 1) setLocationError(true); },
      { enableHighAccuracy: true }
    );
    return watchId;
  }, []);

  useEffect(() => {
    let watchId: any;
    if (!localStorage.getItem('hasSeenTutorial')) { setShowTutorial(true); } 
    else { watchId = startTracking(); }
    fetchLettersAndShelves();
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [fetchLettersAndShelves, startTracking]);

  const fetchLetterDetail = async (id: string) => {
    const { data, error } = await supabase.from('letters').select('*').eq('id', id).single();
    return error ? null : data as Letter;
  };

  const calculateDistance = useCallback((targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance({ latitude: userLocation.lat, longitude: userLocation.lng }, { latitude: targetLat, longitude: targetLng });
  }, [userLocation]);

  const handleGeolocateClick = () => {
    if (!userLocation) { startTracking(); return; }
    setIsFollowingUser(true);
    isFollowingUserRef.current = true;
    mapRef.current?.getMap().flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 1500 });
    const count = letters.reduce((acc, letter) => {
      if (letter.is_post || (currentUser && letter.user_id === currentUser.id)) return acc;
      const dist = getDistance({ latitude: userLocation.lat, longitude: userLocation.lng }, { latitude: letter.lat, longitude: letter.lng });
      if (dist <= 3000 && !readLetterIds.includes(letter.id)) acc++;
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
      const dist = calculateDistance(letter.lat, letter.lng);
      if (dist !== null && dist <= NOTIFICATION_DISTANCE && dist > UNLOCK_DISTANCE && dist < minDist) { minDist = dist; nearest = letter; }
    });
    return nearest;
  }, [userLocation, letters, showUserPosts, calculateDistance]);

  useEffect(() => {
    const nid = nearestNotificationLetter?.id;
    if (nid && nid !== lastNotifiedId) { setLastNotifiedId(nid); setShowNotification(true); } 
    else if (!nid) { setLastNotifiedId(null); }
  }, [nearestNotificationLetter?.id, lastNotifiedId]);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const getPostUrl = () => {
    const nextPath = encodeURIComponent('/post');
    if (!currentUser) return `/login?next=${nextPath}`;
    return userLocation ? `/post?lat=${userLocation.lat}&lng=${userLocation.lng}` : '/post';
  };

  useEffect(() => {
    const handleOpenPostParam = async () => {
      const params = new URLSearchParams(window.location.search);
      const openPostId = params.get('open_post');
      if (openPostId) {
        const targetPost = await fetchLetterDetail(openPostId);
        if (targetPost) {
          setTimeout(() => {
            if (targetPost.is_post) setReadingLetterPost(targetPost);
            else setReadingLetter(targetPost);
            mapRef.current?.flyTo({ center: [targetPost.lng, targetPost.lat], zoom: 16 });
            window.history.replaceState(null, '', '/');
          }, 500);
        }
      }
    };
    handleOpenPostParam();
  }, [currentUser]); 

  // ★ 有効な一般手紙だけを抽出 (48時間以内)
  const validLetters = useMemo(() => {
    const expirationHours = LETTER_EXPIRATION_HOURS || 48;
    return letters.filter(letter => {
      if (letter.is_official || letter.is_post) return false; // ここでは除外
      if (letter.created_at) {
        return calculateEffectiveHours(letter.created_at, isRainy) <= expirationHours;
      }
      return true;
    });
  }, [letters, isRainy]);

  const landmarkLetters = useMemo(() => letters.filter(l => l.is_official || l.is_post), [letters]);

  const points = useMemo(() => validLetters.map(letter => ({
    type: "Feature" as const,
    properties: { cluster: false, letterId: letter.id, ...letter },
    geometry: { type: "Point" as const, coordinates: [letter.lng, letter.lat] }
  })), [validLetters]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: Math.floor(viewState.zoom),
    options: { radius: 70, maxZoom: 17 }
  });

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapToken) return null;

  return (
    <main className="w-full h-screen relative overflow-hidden bg-[#f7f4ea]">
      {showNicknameModal && currentUser && (
        <NicknameModal user={currentUser} onRegistered={(name) => { setMyNickname(name); setShowNicknameModal(false); }} />
      )}
      <Header currentUser={currentUser} nickname={myNickname} onAboutClick={() => setShowAbout(true)} isHidden={false} />

      <MapOverlayUI 
        isRainy={isRainy}
        showRainNotice={showRainNotice}
        showCounts={showCounts}
        unreadCount={unreadCount}
        showUserPosts={showUserPosts}
        onToggleUserPosts={setShowUserPosts}
      />

      {showNotification && nearestNotificationLetter && !popupInfo && (
        <div className="fixed right-4 top-32 z-30 animate-slideInRight" onClick={() => { setPopupInfo(nearestNotificationLetter); mapRef.current?.getMap().flyTo({ center: [nearestNotificationLetter.lng, nearestNotificationLetter.lat], zoom: 16 }); setShowNotification(false); }}>
           <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-white"><span className="text-[10px] font-bold text-gray-600 font-sans">近くに手紙があります</span></div>
        </div>
      )}

      <div className="w-full h-full relative" style={{ filter: isRainy ? 'saturate(0.5) brightness(0.85) contrast(1.1)' : 'none', transition: 'filter 2s ease-in-out' }}>
        {isRainy && <div className="absolute inset-0 z-10 pointer-events-none bg-[#1a3a5a]/25 mix-blend-multiply animate-pulse-slow"></div>}
        <Map
          {...viewState}
          ref={mapRef} 
          onMove={evt => {
            setViewState(evt.viewState);
            if (mapRef.current) setBounds(mapRef.current.getMap().getBounds().toArray().flat());
          }} 
          onMoveStart={() => { isFollowingUserRef.current = false; setIsFollowingUser(false); }}
          onLoad={handleMapLoad}
          onStyleData={(evt: any) => applyLocalization(evt.target)} 
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          mapboxAccessToken={mapToken}
          onClick={() => setPopupInfo(null)}
          fog={isRainy ? { "range": [0.2, 5], "color": "#94a3b8", "high-color": "#475569", "space-color": "#1e293b", "horizon-blend": 0.7 } : undefined}
        >

          <NavigationControl position="bottom-right" showCompass={true} style={{ marginBottom: 'var(--nav-margin, 280px)', marginRight: '16px' }} />

          {/* オリジナルの現在地青ドットアイコン（波紋付き） */}
          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
              </div>
            </Marker>
          )}
          
          <MapMarkers 
            clusters={clusters}
            supercluster={supercluster}
            letters={letters}
            landmarkLetters={landmarkLetters}
            allLetters={allLetters}
            bookshelves={bookshelves}
            showUserPosts={showUserPosts}
            calculateDistance={calculateDistance}
            readLetterIds={readLetterIds}
            currentUser={currentUser}
            isRainy={isRainy}
            onMarkerClick={(item) => setPopupInfo(item)}
            onClusterClick={(leaves) => {
              setSelectedClusterLetters(leaves);
              setShowClusterList(true);
            }}
          />

          <MapPopup 
            popupInfo={popupInfo}
            userLocation={userLocation}
            UNLOCK_DISTANCE={UNLOCK_DISTANCE}
            ADMIN_EMAILS={ADMIN_EMAILS}
            currentUser={currentUser}
            calculateDistance={calculateDistance}
            onClose={() => setPopupInfo(null)}
            onOpenDetail={async (item) => {
              const detail = await fetchLetterDetail(item.id);
              if (item.area_key) {
                setViewingBookshelf(item);
              } else if (item.is_post) {
                setReadingLetterPost(detail);
              } else {
                setReadingLetter(detail);
              }
              setPopupInfo(null);
            }}
          />

          {/* ★ 独自ボタン類を呼び出し */}
          <MapCustomButtons 
            onGeolocate={handleGeolocateClick}
            postUrl={getPostUrl()}
            currentUser={currentUser}
            isMounted={isMounted}
          />
        </Map>
      </div>

      {/* 手紙を書く吹き出し ＆ ボタン（完全保持） */}
      {isMounted && (
        <>
          {!userLocation && !showTutorial && (
            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md py-4 px-6 z-[60] flex flex-col items-center justify-center gap-3 border-t border-gray-100 animate-slideUp shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              {locationError ? (<><div className="flex items-center gap-2"><div className="text-red-500 text-lg">⚠️</div><span className="text-xs font-bold text-gray-600 font-sans tracking-widest leading-relaxed text-center">位置情報が取得できません。<br/>ブラウザの設定を確認してください。</span></div><button onClick={() => window.location.reload()} className="bg-gray-800 text-white text-[10px] font-bold px-6 py-2 rounded-full shadow-md active:scale-95 transition-transform tracking-widest">再読み込みする</button></>) : (<div className="flex items-center justify-center gap-4"><div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></div><span className="text-xs font-bold text-gray-600 font-sans tracking-widest">現在地を特定しています...</span></div>)}
            </div>
          )}
          <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2 font-sans">
            <div className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative" onClick={() => router.push(getPostUrl())}>{currentUser ? '手紙を書く' : 'ログインして手紙を書く'}<div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div></div>
            <Link href={getPostUrl()}><button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 text-white' : 'bg-gray-400 text-white'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button></Link>
          </div>
        </>
      )}

      {/* 密集リスト表示 */}
      <ClusterListModal 
        isOpen={showClusterList}
        onClose={() => setShowClusterList(false)}
        selectedLetters={selectedClusterLetters}
        onSelectLetter={async (id) => {
          const d = await fetchLetterDetail(id);
          if (!d) return;
          setShowClusterList(false); // リストを閉じる
          setReadingLetter(d);       // 手紙を開く
        }}
      />

      {viewingBookshelf && (<BookshelfModal areaKey={viewingBookshelf.area_key} displayName={viewingBookshelf.display_name} onClose={() => setViewingBookshelf(null)} currentUser={currentUser} onSelectMemory={async (id) => { const d = await fetchLetterDetail(id); if(d) setReadingLetter(d); }} />)}
      {readingLetter && (readingLetter.is_postcard ? (<PostcardModal letter={readingLetter} currentUser={currentUser} isRainy={isRainy} onClose={() => { setReadingLetter(null); setPopupInfo(null); setModalInitialLayer(0); }} onRead={markAsRead} isMyPage={false} initialLayer={modalInitialLayer} />) : (<LetterModal letter={readingLetter} currentUser={currentUser} isRainy={isRainy} onClose={() => { setReadingLetter(null); setPopupInfo(null); setModalInitialLayer(0); }} onRead={markAsRead} isMyPage={false} initialLayer={modalInitialLayer} />))}   
      {readingPost && (<PostModal post={readingPost} currentUser={currentUser} isRainy={isRainy} onClose={() => { setReadingLetterPost(null); setPopupInfo(null); }} isReachable={true} />)}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showTutorial && <TutorialModal onClose={() => { localStorage.setItem('hasSeenTutorial', 'true'); setShowTutorial(false); startTracking(); }} />}
      <AddToHomeScreen isOpen={showPwaPrompt} onClose={() => setShowPwaPrompt(false)} message="ホーム画面に追加しておきませんか？" />

      <style jsx global>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInDown { animation: fadeInDown 0.4s ease-out forwards; }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        .animate-pulse-slow { animation: pulse-slow 5s infinite ease-in-out; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
        .mapboxgl-ctrl-geolocate { display: none !important; }
        :root { --nav-margin: 280px; }
        @media (orientation: landscape) { :root { --nav-margin: 140px; } .mapboxgl-ctrl-bottom-right { bottom: 20px !important; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
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