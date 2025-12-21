'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient, User } from '@supabase/supabase-js';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// コンポーネントのインポート
import Header from '@/components/Header';
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import IconPost from '@/components/IconPost';
import LetterModal from '@/components/LetterModal';
import PostModal from '@/components/PostModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import TutorialModal from '@/components/TutorialModal'; 
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

// react-map-gl はブラウザ専用の window オブジェクトを使用するため dynamic import で SSR を無効化
const Map = dynamic(() => import('react-map-gl').then(mod => mod.Map), { ssr: false });
const Marker = dynamic(() => import('react-map-gl').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-map-gl').then(mod => mod.Popup), { ssr: false });
const NavigationControl = dynamic(() => import('react-map-gl').then(mod => mod.NavigationControl), { ssr: false });
const GeolocateControl = dynamic(() => import('react-map-gl').then(mod => mod.GeolocateControl), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; created_at: string; nickname?: string;
  password?: string | null; attached_stamp_id?: number | null;
  is_post?: boolean; parent_id?: string | null;
};

const UNLOCK_DISTANCE = 30;      
const NOTIFICATION_DISTANCE = 100; 

function HomeContent() {
  const ADMIN_EMAILS = ["marei.suyama@gmail.com", "contact@volvox-ltd.com"];
  const router = useRouter();
  
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

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  const handleMapLoad = (evt: any) => {
    const map = evt.target;
    map.getStyle().layers.forEach((layer: any) => {
      if (layer.layout && layer.layout['text-field']) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce', ['get', 'name_ja'], ['get', 'name']
          ]);
        } catch (e) {}
      }
    });
    const layersToHide = ['road-number-shield', 'road-exit-shield'];
    layersToHide.forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
        if (profile) setMyNickname(profile.nickname);
        else setShowNicknameModal(true);
      }
    };
    checkUser();
    const storedReads = localStorage.getItem('read_letter_ids');
    if (storedReads) setReadLetterIds(JSON.parse(storedReads));

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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

  const fetchLetters = async () => {
    try {
      const { data: lettersData, error } = await supabase.from('letters').select('*');
      if (error || !lettersData) return;
      setAllLetters(lettersData as Letter[]);
      const rootLetters = lettersData.filter((l: any) => l.parent_id === null || l.parent_id === undefined);
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
  };

  useEffect(() => {
    if (!localStorage.getItem('hasSeenTutorial')) setShowTutorial(true);
    fetchLetters();
  }, []);

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

  const handleCloseTutorial = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setShowTutorial(false);
  };

  const calculateDistance = (targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance(
      { latitude: userLocation.lat, longitude: userLocation.lng },
      { latitude: targetLat, longitude: targetLng }
    );
  };

  const nearestNotificationLetter = useMemo<Letter | null>(() => {
    if (!userLocation) return null;
    let nearest: Letter | null = null;
    let minDist = Infinity;
    letters.forEach(letter => {
      if (!letter.is_official && !showUserPosts) return;
      if (!letter.is_official && !letter.is_post && letter.created_at) {
         if ((new Date().getTime() - new Date(letter.created_at).getTime()) / 3600000 > LETTER_EXPIRATION_HOURS) return;
      }
      const isMyPost = currentUser && currentUser.id === letter.user_id;
      const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
      if (isMyPost || isAdmin) return; 
      const dist = getDistance({ latitude: userLocation.lat, longitude: userLocation.lng }, { latitude: letter.lat, longitude: letter.lng });
      if (dist <= NOTIFICATION_DISTANCE && dist > UNLOCK_DISTANCE && dist < minDist) {
        minDist = dist; nearest = letter;
      }
    });
    return nearest;
  }, [userLocation, letters, showUserPosts, currentUser]);

  useEffect(() => {
    const handleOpenPostParam = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const openPostId = params.get('open_post');
      if (openPostId) {
        const { data: targetPost } = await supabase.from('letters').select('*').eq('id', openPostId).single();
        if (targetPost) {
          setTimeout(() => {
            if (targetPost.is_post) setReadingPost(targetPost);
            else setReadingLetter(targetPost);
            markAsRead(targetPost.id);
            setViewState(prev => ({ ...prev, latitude: targetPost.lat, longitude: targetPost.lng, zoom: 16 }));
            window.history.replaceState(null, '', '/');
          }, 500);
        }
      }
    };
    handleOpenPostParam();
  }, []);

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

      <Header 
        currentUser={currentUser} 
        nickname={myNickname} 
        onAboutClick={() => setShowAbout(true)} 
        isHidden={false} 
      />

      <div className="absolute left-4 z-20 transition-all" style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }}>
        <div className="flex items-center bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-md border border-gray-100">
          <span className="text-[10px] font-bold text-gray-600 mr-2">みんなの手紙</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={showUserPosts} onChange={() => setShowUserPosts(!showUserPosts)} />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {nearestNotificationLetter && !popupInfo && (
        <div className="fixed right-4 top-32 z-30 animate-slideInRight" onClick={() => {
          setPopupInfo(nearestNotificationLetter);
          setViewState(prev => ({ ...prev, latitude: nearestNotificationLetter.lat, longitude: nearestNotificationLetter.lng, zoom: 16 }));
        }}>
           <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-white">
              <span className="text-sm animate-bounce">✨</span>
              <span className="text-[10px] font-bold text-gray-600">近くに手紙があります</span>
           </div>
        </div>
      )}

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12" 
        mapboxAccessToken={mapToken}
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="bottom-right" style={{ marginBottom: '100px', marginRight: '16px' }} />
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '100px', marginRight: '16px' }} />

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
              <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
            </div>
          </Marker>
        )}

        {letters.map((letter) => {
          if (!letter.is_official && !letter.is_post && letter.created_at) {
            if ((new Date().getTime() - new Date(letter.created_at).getTime()) / 3600000 > LETTER_EXPIRATION_HOURS) return null;
          }
          if (!letter.is_official && !showUserPosts) return null;
          
          const distance = calculateDistance(letter.lat, letter.lng);
          const isMyPost = currentUser && currentUser.id === letter.user_id;
          const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
          const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isMyPost || isAdmin;
          const isNear = distance !== null && distance <= NOTIFICATION_DISTANCE && !isReachable;
          
          const isRead = readLetterIds.includes(letter.id);

          // ★修正：全データ(allLetters)の中から、このポスト(letter.id)を親に持つ手紙があるか判定
          const postHasLetters = allLetters.some(l => l.parent_id === letter.id);

          return (
            <Marker key={letter.id} latitude={letter.lat} longitude={letter.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(letter); }} style={{ zIndex: isReachable ? 10 : isNear ? 5 : 1 }}>
              <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-70' : ''}`}>
                <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center ${isReachable ? 'border-orange-500 text-orange-600' : isNear ? 'border-gray-400 text-gray-600' : 'border-bunko-gray/10 text-bunko-ink'}`}>
                   <span className="font-bold">{letter.is_post ? '常設ポスト' : (letter.is_official ? '木林文庫の手紙' : (letter.nickname ? `${letter.nickname}さんの手紙` : ''))}</span>
                   {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1">{letter.is_post ? '投函できます！' : '読めます！'}</span>}
                </div>
                
                <div className={`transition-transform duration-300 drop-shadow-md relative ${isReachable ? 'animate-bounce' : isNear ? 'animate-pulse scale-110' : 'hover:scale-110'}`}>
                   {letter.is_post ? (
                     <div className={isReachable ? "text-red-600" : isNear ? "text-red-500" : "text-red-700"}>
                        <IconPost className="w-12 h-12" hasLetters={postHasLetters} />
                     </div>
                   ) : (
                     <div className={isReachable ? (letter.is_official ? "text-yellow-500" : "text-orange-500") : "text-bunko-ink"}>
                        {letter.is_official ? <IconAdminLetter className="w-8 h-8" /> : <IconUserLetter className="w-8 h-8" />}
                     </div>
                   )}
                   
                   {/* ★修正: !isReachable の条件を削除し、読んだら常に ✔︎ を出す */}
                   {isRead && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-md border border-gray-100 z-30">
                        <span className="text-[10px] text-green-600 font-bold">✔︎</span>
                      </div>
                   )}
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup latitude={popupInfo.lat} longitude={popupInfo.lng} anchor="bottom" offset={[0, -40]} onClose={() => setPopupInfo(null)} closeOnClick={false} className="z-50">
            {/* ポップアップ全体に font-sans を適用し、タイトルのみ font-serif に */}
            <div className="p-2 min-w-[160px] text-center pt-4 font-sans"> 
              <h3 className="font-bold text-sm mb-1 text-bunko-ink font-serif">{popupInfo.title}</h3>
              <p className="text-[10px] text-gray-500 mb-1">{popupInfo.is_post ? '常設ポスト' : (popupInfo.is_official ? '木林文庫の手紙' : (popupInfo.nickname ? `${popupInfo.nickname}さんの置き手紙` : '置き手紙'))}</p>
              
              {(() => {
                const dist = calculateDistance(popupInfo.lat, popupInfo.lng);
                const isReachable = (dist !== null && dist <= UNLOCK_DISTANCE) || (currentUser?.email && ADMIN_EMAILS.includes(currentUser.email)) || (currentUser && currentUser.id === popupInfo.user_id);
                
                if (dist === null) return <p className="text-xs text-gray-400">確認中...</p>;
                if (isReachable) {
                  return (
                    <button 
                      onClick={() => { if (popupInfo.is_post) setReadingPost(popupInfo); else setReadingLetter(popupInfo); markAsRead(popupInfo.id); }} 
                      className="w-full text-white text-xs py-2 px-4 rounded-full transition-colors shadow-sm font-bold bg-green-700 hover:bg-green-800 font-sans"
                    >
                      {popupInfo.is_post ? 'ポストを開く' : '手紙を開く'}
                    </button>
                  );
                }
                return <div className="bg-gray-100 text-gray-500 text-xs py-2 px-2 rounded-full border border-gray-200 font-sans">🔒 あと {dist}m</div>;
              })()}
            </div>
          </Popup>
        )}
      </Map>

      {readingLetter && <LetterModal letter={readingLetter} currentUser={currentUser} onClose={() => setReadingLetter(null)} onDeleted={() => { setReadingLetter(null); fetchLetters(); }} />}
      {readingPost && <PostModal post={readingPost} currentUser={currentUser} onClose={() => setReadingPost(null)} isReachable={true} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2">
        <div className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative" onClick={() => router.push(getPostUrl())}>
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        <Link href={getPostUrl()}>
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-400 hover:bg-gray-500 text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
        </Link>
      </div>

      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}
      <AddToHomeScreen isOpen={showPwaPrompt} onClose={() => setShowPwaPrompt(false)} message="また来てくれてありがとうございます。ホーム画面に追加すると、すぐに地図を開けます。" />

      <style jsx global>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </main>
  );
}

// 最終的なエクスポート：Suspense境界でビルド時の CSR bailout を防ぐ
export default function Home() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#f7f4ea] flex items-center justify-center">読み込み中...</div>}>
      <HomeContent />
    </Suspense>
  );
}