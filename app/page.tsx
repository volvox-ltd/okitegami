'use client';
import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, Popup, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient, User } from '@supabase/supabase-js';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import IconUserLetter from '@/components/IconUserLetter';
import IconAdminLetter from '@/components/IconAdminLetter';
import LetterModal from '@/components/LetterModal';
import AboutModal from '@/components/AboutModal';
import NicknameModal from '@/components/NicknameModal';
import IconMap from '@/components/IconMap';
import IconShelf from '@/components/IconShelf';
import IconAbout from '@/components/IconAbout';

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
const EXPIRATION_HOURS = 72; 

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
  
  // ★追加：まだ現在地に移動していないかどうかのフラグ
  const [hasCentered, setHasCentered] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  // ユーザーチェック & プロフィール取得
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

  // 手紙データ取得
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

  // ★修正：現在地取得とオートフォーカス
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        setUserLocation({
          lat: latitude,
          lng: longitude
        });

        // まだ一度も中心に合わせていない場合のみ、地図を移動させる
        if (!hasCentered) {
          setViewState(prev => ({
            ...prev,
            latitude: latitude,
            longitude: longitude,
            zoom: 15 // ちょうどいいズーム率に
          }));
          setHasCentered(true); // 移動完了フラグを立てる
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasCentered]); // hasCenteredが変わるたびに再評価

  const calculateDistance = (targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance(
      { latitude: userLocation.lat, longitude: userLocation.lng },
      { latitude: targetLat, longitude: targetLng }
    );
  };

  const handleMyPageClick = () => {
    if (!currentUser) {
      router.push('/login');
    } else {
      router.push('/mypage'); 
    }
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

      {/* ヘッダー */}
      <div className="absolute top-0 left-0 z-10 w-full p-3 bg-white/90 backdrop-blur-sm shadow-sm flex justify-center items-center pointer-events-none">
        <h1 className="text-center font-serif text-lg tracking-widest text-bunko-ink pointer-events-auto">
          木林のおきてがみ
        </h1>
        {currentUser && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
            <span className="text-[10px] text-gray-500 font-serif border border-gray-300 rounded-full px-2 py-1 bg-white">
              {myNickname ? `${myNickname} さん` : '...'}
            </span>
          </div>
        )}
      </div>

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
        
        {/* GeolocateControlも残しておきます（ボタンでいつでも現在地に戻れるように） */}
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '100px' }} />

        {/* ★追加：現在地の青いドットを表示 */}
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

            if (diffHours > EXPIRATION_HOURS) {
              return null;
            }
          }

          const isUserPost = !letter.is_official;
          if (isUserPost && !showUserPosts) {
            return null;
          }

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
                {/* 吹き出し (ホバー時) */}
                <div className="bg-white/95 backdrop-blur px-2 py-1 rounded-sm shadow-sm text-[10px] mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap text-bunko-ink border border-bunko-gray/10">
                   {letter.is_official ? '運営のお便り' : (letter.nickname ? `${letter.nickname}さんの手紙` : '')}
                   {letter.spot_name !== '誰かの置き手紙' && (
                     <span className="block text-[8px] text-gray-400 text-center">{letter.spot_name}</span>
                   )}
                </div>

                <div className="hover:scale-110 transition-transform duration-300 drop-shadow-md relative">
                   {letter.is_official ? (
                     <IconAdminLetter className="w-12 h-12" />
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
              {/* ポップアップ内 (クリック時) */}
              <p className="text-[10px] text-gray-500 mb-1">
                {popupInfo.is_official ? '運営のお便り' : (popupInfo.nickname ? `${popupInfo.nickname}さんの置き手紙` : '置き手紙')}
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

      {currentUser && (
        <Link href="/post">
          <button
            className="fixed bottom-24 right-4 z-40 bg-green-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-green-800 transition-transform hover:scale-105 active:scale-95 border-2 border-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </Link>
      )}

      {/* フッターメニュー */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-2xl h-16 flex justify-around items-center z-40 px-2">
        <button 
          onClick={() => {
            setPopupInfo(null);
            setShowAbout(false);
          }}
          className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
        >
          <IconMap className="w-6 h-6 mb-1 text-bunko-gray group-hover:text-orange-500 transition-colors" />
          <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">手紙を探す</span>
        </button>

        <button 
          onClick={handleMyPageClick}
          className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
        >
          <IconShelf className={`w-6 h-6 mb-1 transition-colors ${currentUser ? 'text-bunko-gray group-hover:text-orange-500' : 'text-gray-300'}`} />
          <span className={`text-[10px] font-sans font-bold transition-colors ${currentUser ? 'text-gray-600 group-hover:text-orange-500' : 'text-gray-400'}`}>
            {currentUser ? 'マイページ' : 'ログイン'}
          </span>
        </button>

        <button 
          onClick={() => setShowAbout(true)}
          className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
        >
          <IconAbout className="w-6 h-6 mb-1 text-bunko-gray group-hover:text-orange-500 transition-colors" />
          <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">木林について</span>
        </button>
      </div>
    </main>
  );
}