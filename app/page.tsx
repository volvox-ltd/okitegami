'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
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
import IconPost from '@/components/IconPost';
import IconPostcard from '@/components/IconPostcard'; // ★ 追加
import LetterModal from '@/components/LetterModal';
import PostModal from '@/components/PostModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import TutorialModal from '@/components/TutorialModal'; 
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

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
  is_postcard?: boolean; // ★ 追加
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
    const layersToHide = ['road-number-shield', 'road-exit-shield', 'motorway-junction'];
    layersToHide.forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
  };

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
        .select('id, title, spot_name, lat, lng, is_official, user_id, created_at, attached_stamp_id, is_post, parent_id, password, is_postcard'); // ★ is_postcardを追加
      
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
        const diffMs = new Date().getTime() - new Date(letter.created_at).getTime();
        const diffHours = diffMs / 3600000;
        if (diffHours > expirationHours) return null; 
      }
      if (!letter.is_official && !showUserPosts) return null;
      
      const distance = calculateDistance(letter.lat, letter.lng);
      const isMyPost = currentUser && currentUser.id === letter.user_id;
      const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
      const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isMyPost || isAdmin;
      const isRead = readLetterIds.includes(letter.id);
      const postHasLetters = allLetters.some(l => l.parent_id === letter.id);

      // 跳ねるアニメーションの条件
      const shouldBounce = isReachable && !letter.is_post && !isRead;

      return (
        <Marker key={letter.id} latitude={letter.lat} longitude={letter.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(letter); }} style={{ zIndex: isReachable ? 10 : 1 }}>
          <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-70' : ''}`}>
            
            {/* --- ホバー時のツールチップ（文言修正） --- */}
            <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center ${isReachable ? 'border-orange-500 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
               <span className="font-bold">
                 {letter.is_post 
                   ? (letter.spot_name ? `${letter.spot_name}のポスト` : 'ポスト') 
                   : letter.is_postcard 
                     ? (letter.spot_name ? `${letter.spot_name}の絵葉書` : '名も無き絵葉書') // ★ 追加
                     : (letter.is_official 
                         ? (letter.spot_name ? `${letter.spot_name}の手紙` : '名も無き手紙') 
                         : (letter.nickname ? `${letter.nickname}さんの手紙` : '誰かの手紙'))
                 }
               </span>
               {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1 font-sans">{letter.is_post ? '投函できます！' : '読めます！'}</span>}
            </div>

            {/* --- アイコン本体 --- */}
            <div className={`transition-transform duration-300 drop-shadow-md relative ${shouldBounce ? 'animate-bounce' : 'hover:scale-110'}`}>
               {letter.is_post ? (
                 <div className={isReachable ? "text-red-600" : "text-red-700"}>
                   <IconPost className="w-14 h-14" hasLetters={postHasLetters} />
                 </div>
               ) : letter.is_postcard ? (
                 /* ★ 追加：絵葉書アイコンの表示 */
                 <div className={isReachable ? "text-orange-500" : "text-bunko-ink"}>
                   <IconPostcard className="w-14 h-14" />
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
  }, [letters, allLetters, showUserPosts, userLocation, readLetterIds, currentUser]);

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

      <div className="absolute left-4 z-20 transition-all top-[calc(env(safe-area-inset-top)+64px)] md:top-[calc(env(safe-area-inset-top)+70px)]">
        <div className="flex items-center bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-md border border-gray-100">
          <span className="text-[10px] font-bold text-gray-600 mr-2 font-sans">みんなの手紙</span>
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
              <span className="text-sm animate-bounce"></span>
              <span className="text-[10px] font-bold text-gray-600 font-sans">近くに手紙があります</span>
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
        <NavigationControl position="bottom-right" style={{ marginBottom: '150px', marginRight: '16px' }} />
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '150px', marginRight: '16px' }} />

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

      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2 font-sans">
        <div className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative" onClick={() => router.push(getPostUrl())}>
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        <Link href={getPostUrl()}>
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 text-white' : 'bg-gray-400 text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
        </Link>
      </div>

      {readingLetter && (
        <LetterModal 
          letter={readingLetter} 
          currentUser={currentUser} 
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
      )}   
      {readingPost && (
        <PostModal 
          post={readingPost} 
          currentUser={currentUser} 
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
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
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