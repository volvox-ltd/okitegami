'use client';
import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, Popup, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient, User } from '@supabase/supabase-js';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// コンポーネントのインポート
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import LetterModal from '@/components/LetterModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
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
};

const UNLOCK_DISTANCE = 100;
// const EXPIRATION_HOURS = 48; 

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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hasCentered, setHasCentered] = useState(false);

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

  const calculateDistance = (targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance(
      { latitude: userLocation.lat, longitude: userLocation.lng },
      { latitude: targetLat, longitude: targetLng }
    );
  };

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapToken) return <div>Map Token Error</div>;

  return (
    <main className="w-full h-screen relative bg-[#f7f4ea] pb-24">
      
      {showNicknameModal && currentUser && (
        <NicknameModal 
          user={currentUser} 
          onRegistered={(name) => {
            setMyNickname(name);
            setShowNicknameModal(false);
          }} 
        />
      )}

      {/* ★コンポーネント化：ヘッダー */}
      <Header currentUser={currentUser} nickname={myNickname} />

      {/* スイッチ */}
      <div className="absolute top-16 left-4 z-10">
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

      {/* マップ */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12" 
        mapboxAccessToken={mapToken}
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="bottom-right" style={{ marginBottom: '100px' }} />
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '100px' }} />

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
            >
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="bg-white/95 backdrop-blur px-2 py-1 rounded-sm shadow-sm text-[10px] mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap text-bunko-ink border border-bunko-gray/10">
                   {letter.is_official ? '木林文庫の手紙' : (letter.nickname ? `${letter.nickname}さんの手紙` : '')}
                   {letter.spot_name !== '誰かの置き手紙' && (
                     <span className="block text-[8px] text-gray-400 text-center">{letter.spot_name}</span>
                   )}
                </div>

                <div className="hover:scale-110 transition-transform duration-300 drop-shadow-md relative">
                   {letter.is_official ? (
                     <IconAdminLetter className="w-10 h-10" />
                   ) : (
                     <IconUserLetter className="w-10 h-10" />
                   )}
                   {letter.password && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow">
                        <span className="text-[8px]">🔒</span>
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
              {popupInfo.spot_name !== '誰かの置き手紙' && (
                <p className="text-xs text-bunko-gray mb-3">{popupInfo.spot_name}</p>
              )}
              
              {(() => {
                const distance = calculateDistance(popupInfo.lat, popupInfo.lng);
                const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
                const isMyPost = currentUser && currentUser.id === popupInfo.user_id;

                if (distance === null) return <p className="text-xs text-gray-400">現在地を確認中...</p>;

                if (distance <= UNLOCK_DISTANCE || isAdmin || isMyPost) {
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
                  <div className="bg-gray-100 text-gray-500 text-xs py-2 px-2 rounded-full border border-gray-200">
                    🔒 あと {distance}m
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

      {/* 投稿ボタンエリア (CTA) */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
        {!currentUser && (
          <div className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer" onClick={() => router.push('/login')}>
             ログインして手紙を書く
             <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
          </div>
        )}
        
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

      {/* ★コンポーネント化：フッター */}
      <Footer 
        currentUser={currentUser}
        onResetMap={() => {
          setPopupInfo(null);
          setShowAbout(false);
        }}
        onAboutClick={() => setShowAbout(true)}
      />

    </main>
  );
}