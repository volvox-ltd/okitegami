'use client';
import { useState, useEffect, useMemo } from 'react';
import Map, { Marker, NavigationControl, Popup, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient, User } from '@supabase/supabase-js';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// コンポーネントのインポート
import Header from '@/components/Header';
import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import LetterModal from '@/components/LetterModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import TutorialModal from '@/components/TutorialModal'; 
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Letter = {
  id: string;
  title: string;
  spot_name: string;
  content: string;
  lat: number;
  lng: number;
  image_url?: string;
  is_official?: boolean;
  user_id?: string;
  created_at: string;
  nickname?: string;
  password?: string | null;
  attached_stamp_id?: number | null;
};

// 距離設定（メートル）
const UNLOCK_DISTANCE = 50;      
const RELIEF_DISTANCE = 100;     
const NOTIFICATION_DISTANCE = 300; 

export default function Home() {
  const ADMIN_EMAILS = [
    "marei.suyama@gmail.com", 
    "contact@volvox-ltd.com"
  ];

  const router = useRouter();
  
  const [letters, setLetters] = useState<Letter[]>([]);
  const [popupInfo, setPopupInfo] = useState<Letter | null>(null);
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserPosts, setShowUserPosts] = useState(true);

  const [showTutorial, setShowTutorial] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  
  const [isRetryingGPS, setIsRetryingGPS] = useState(false);

  // PWA案内用のState定義
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  // ユーザーチェック
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setMyNickname(profile.nickname);
        } else {
          setShowNicknameModal(true);
        }
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      checkUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchLetters = async () => {
    const { data: lettersData } = await supabase.from('letters').select('*');
    if (!lettersData) return;

    const userIds = Array.from(new Set(lettersData.map(l => l.user_id).filter(Boolean)));

    let nicknameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);
      
      profilesData?.forEach((p: any) => {
        nicknameMap[p.id] = p.nickname;
      });
    }

    const mergedLetters = lettersData.map((l: any) => ({
      ...l,
      nickname: nicknameMap[l.user_id] || null
    }));

    setLetters(mergedLetters as Letter[]);
  };

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
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

  const handleRetryGPS = () => {
    if (!navigator.geolocation || !popupInfo) return;
    setIsRetryingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        const dist = getDistance(
          { latitude, longitude },
          { latitude: popupInfo.lat, longitude: popupInfo.lng }
        );
        if (dist <= RELIEF_DISTANCE) {
          setReadingLetter(popupInfo);
        } else {
          alert(`位置情報を更新しましたが、まだ距離があります。\n現在: 約${dist}m\n（残り${dist - UNLOCK_DISTANCE}m）`);
        }
        setIsRetryingGPS(false);
      },
      (error) => {
        console.error(error);
        alert("位置情報の取得に失敗しました。");
        setIsRetryingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 一番近くにある通知対象の手紙を特定
  const nearestNotificationLetter = useMemo<Letter | null>(() => {
    if (!userLocation) return null;
    
    let nearest: Letter | null = null;
    let minDist = Infinity;

    letters.forEach(letter => {
      if (!letter.is_official && !showUserPosts) return;
      if (!letter.is_official && letter.created_at) {
         const diff = (new Date().getTime() - new Date(letter.created_at).getTime()) / (1000 * 60 * 60);
         if (diff > LETTER_EXPIRATION_HOURS) return;
      }
      
      const isMyPost = currentUser && currentUser.id === letter.user_id;
      const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
      if (isMyPost || isAdmin) return; 

      const dist = getDistance(
        { latitude: userLocation.lat, longitude: userLocation.lng },
        { latitude: letter.lat, longitude: letter.lng }
      );
      
      const isReachable = dist <= UNLOCK_DISTANCE;
      const isNear = dist <= NOTIFICATION_DISTANCE && !isReachable;

      if (isNear && dist < minDist) {
        minDist = dist;
        nearest = letter;
      }
    });

    return nearest;
  }, [userLocation, letters, showUserPosts, currentUser]);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapToken) return <div>Map Token Error</div>;

  // 訪問回数チェックとPWAプロンプト表示ロジック
  useEffect(() => {
    const checkVisitCount = () => {
      const visitedCount = localStorage.getItem('visit_count');
      const currentCount = visitedCount ? parseInt(visitedCount) : 0;
      const nextCount = currentCount + 1;
      
      localStorage.setItem('visit_count', nextCount.toString());

      if (nextCount === 2) {
        setTimeout(() => setShowPwaPrompt(true), 3000);
      }
    };
    
    checkVisitCount();
  }, []);

  return (
    <main className="w-full h-screen relative bg-[#f7f4ea]">
      
      {showNicknameModal && currentUser && (
        <NicknameModal 
          user={currentUser} 
          onRegistered={(name) => {
            setMyNickname(name);
            setShowNicknameModal(false);
          }} 
        />
      )}

      <Header currentUser={currentUser} nickname={myNickname} onAboutClick={() => setShowAbout(true)} />
      <div 
        className="absolute left-4 z-10 transition-all"
        style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }} // ヘッダーの高さ(約60px) + 余白(20px)
      >
        <div className="flex items-center bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-md border border-gray-100">
          <span className="text-[10px] font-bold text-gray-600 mr-2">みんなの手紙</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={showUserPosts}
              onChange={() => setShowUserPosts(!showUserPosts)}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {/* 気配通知ポップ */}
      {nearestNotificationLetter && !popupInfo && (
        <div 
          className="fixed right-0 top-32 z-40 animate-slideInRight"
          onClick={() => {
            const targetLetter = nearestNotificationLetter;
            if (!targetLetter) return;

            setPopupInfo(targetLetter);
            setViewState(prev => ({
              ...prev, 
              latitude: targetLetter.lat, 
              longitude: targetLetter.lng, 
              zoom: 16
            }));
          }}
        >
           <div className="bg-white/90 backdrop-blur-md p-3 pl-4 rounded-l-2xl shadow-lg border-y border-l border-gray-300 flex items-center gap-3 max-w-[180px] cursor-pointer hover:bg-white transition-colors">
              <span className="text-xl animate-pulse">✨</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400"></span>
                <span className="text-xs font-bold text-gray-700 leading-tight">
                  近くに手紙が<br/>あります...
                </span>
              </div>
           </div>
        </div>
      )}

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12" 
        mapboxAccessToken={mapToken}
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="bottom-right" style={{ marginBottom: '90px', marginRight: '16px' }} />
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '90px', marginRight: '16px' }} />

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
              <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
            </div>
          </Marker>
        )}

        {letters.map((letter) => {
          if (!letter.is_official && letter.created_at) {
            const createdAt = new Date(letter.created_at);
            const now = new Date();
            const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            if (diffHours > LETTER_EXPIRATION_HOURS) return null;
          }

          const isUserPost = !letter.is_official;
          if (isUserPost && !showUserPosts) return null;

          const distance = calculateDistance(letter.lat, letter.lng);
          const isMyPost = currentUser && currentUser.id === letter.user_id;
          const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);

          const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isMyPost || isAdmin;
          const isNear = distance !== null && distance <= NOTIFICATION_DISTANCE && !isReachable;

          return (
            <Marker 
              key={letter.id} 
              latitude={letter.lat} 
              longitude={letter.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(letter);
              }}
              style={{ zIndex: isReachable ? 10 : isNear ? 5 : 1 }}
            >
              <div className="flex flex-col items-center group cursor-pointer">
                {/* マーカー上の吹き出し（ホバーで表示） */}
                <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center
                  ${isReachable ? 'border-orange-500 text-orange-600' : isNear ? 'border-gray-400 text-gray-600' : 'border-bunko-gray/10 text-bunko-ink'}`}>
                   
                   {/* ユーザー名/公式名 */}
                   <span className="font-bold">
                     {letter.is_official ? '木林文庫の手紙' : (letter.nickname ? `${letter.nickname}さんの手紙` : '')}
                   </span>

                   {/* ★追加：場所名（入力がある場合のみ表示） */}
                   {letter.spot_name && letter.spot_name !== '名もなき場所' && (
                     <span className="text-[8px] text-gray-400 mt-0.5 font-sans">
                       📍 {letter.spot_name}
                     </span>
                   )}

                   {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1">読めます！</span>}
                </div>

                <div className={`transition-transform duration-300 drop-shadow-md relative ${isReachable ? 'animate-bounce' : isNear ? 'animate-pulse scale-110' : 'hover:scale-110'}`}>
                   {letter.is_official ? (
                     <div className={isReachable ? "text-yellow-500" : isNear ? "text-yellow-300" : "text-bunko-ink"}>
                        <IconAdminLetter className="w-10 h-10" />
                     </div>
                   ) : (
                     <div className={isReachable ? "text-orange-500" : isNear ? "text-cyan-500" : "text-bunko-ink"}>
                        <IconUserLetter className="w-10 h-10" />
                     </div>
                   )}
                   
                   {!isReachable && letter.password && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow">
                        <span className="text-[8px]">🔒</span>
                      </div>
                   )}
                   
                   {isReachable && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow w-4 h-4 flex items-center justify-center animate-pulse">
                        <span className="text-[8px] font-bold">!</span>
                      </div>
                   )}
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            latitude={popupInfo.lat}
            longitude={popupInfo.lng}
            anchor="bottom"
            offset={[0, -50]}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="z-50 font-serif"
          >
            <div className="p-2 min-w-[160px] text-center pt-4">
              <h3 className="font-bold text-sm mb-1 text-bunko-ink">{popupInfo.title}</h3>
              <p className="text-[10px] text-gray-500 mb-1">
                {popupInfo.is_official ? '木林文庫の手紙' : (popupInfo.nickname ? `${popupInfo.nickname}さんの置き手紙` : '置き手紙')}
              </p>
              {popupInfo.spot_name !== '名もなき場所' && (
                <p className="text-xs text-bunko-gray mb-3">{popupInfo.spot_name}</p>
              )}
              
              {(() => {
                const distance = calculateDistance(popupInfo.lat, popupInfo.lng);
                const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
                const isMyPost = currentUser && currentUser.id === popupInfo.user_id;

                const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isAdmin || isMyPost;
                const isReliefArea = distance !== null && distance > UNLOCK_DISTANCE && distance <= RELIEF_DISTANCE;

                if (distance === null) return <p className="text-xs text-gray-400">現在地を確認中...</p>;

                if (isReachable) {
                  return (
                    <button 
                      onClick={() => setReadingLetter(popupInfo)}
                      className={`w-full text-white text-xs py-2 px-4 rounded-full transition-colors shadow-sm font-bold ${
                        isAdmin ? "bg-yellow-600 hover:bg-yellow-700" : "bg-orange-500 hover:bg-red-600"
                      }`}
                    >
                      {isAdmin ? "管理者権限で開く" : isMyPost ? "自分の手紙を確認" : "手紙を開く"}
                    </button>
                  );
                }

                return (
                  <div className="flex flex-col gap-2">
                    <div className="bg-gray-100 text-gray-500 text-xs py-2 px-2 rounded-full border border-gray-200">
                      🔒 あと {distance}m
                    </div>
                    
                    {isReliefArea && (
                      <button
                        onClick={handleRetryGPS}
                        disabled={isRetryingGPS}
                        className="text-[10px] text-blue-600 font-bold underline hover:text-blue-800 disabled:text-gray-400"
                      >
                        {isRetryingGPS ? '位置情報を確認中...' : '目の前にいます！(GPS補正)'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </Popup>
        )}
      </Map>

      {readingLetter && (
        <LetterModal 
          letter={readingLetter}
          currentUser={currentUser}
          onClose={() => setReadingLetter(null)}
          onDeleted={() => {
             setReadingLetter(null);
             fetchLetters();
          }}
        />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      {/* 投稿ボタン（右下） */}
      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2">
        <div 
          className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative"
          onClick={() => router.push(currentUser ? '/post' : '/login')}
        >
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        
        <Link href={currentUser ? "/post" : "/login"}>
          <button
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-400 hover:bg-gray-500 text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </Link>
      </div>

      {showTutorial && (
        <TutorialModal onClose={handleCloseTutorial} />
      )}

      {/* PWAインストール案内（2回目訪問時） */}
      <AddToHomeScreen 
        isOpen={showPwaPrompt} 
        onClose={() => setShowPwaPrompt(false)}
        message="また来てくれてありがとうございます。ホーム画面に追加すると、すぐに地図を開けます。"
      />

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideInRight {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </main>
  );
}