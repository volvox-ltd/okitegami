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
import IconPost from '@/components/IconPost'; // 必須
import LetterModal from '@/components/LetterModal';
import PostModal from '@/components/PostModal';
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
  is_post?: boolean;
  parent_id?: string | null;
};

// 距離設定（メートル）
const UNLOCK_DISTANCE = 30;      
const NOTIFICATION_DISTANCE = 100; 

export default function Home() {
  const ADMIN_EMAILS = [
    "marei.suyama@gmail.com", 
    "contact@volvox-ltd.com"
  ];

  const router = useRouter();
  
  const [letters, setLetters] = useState<Letter[]>([]);
  const [allLetters, setAllLetters] = useState<Letter[]>([]); // ポストの中身判定用
  
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

  // ★地図読み込み時の設定（日本語化 ＋ 不要なアイコン削除）
  const handleMapLoad = (evt: any) => {
    // ★ここで map を定義しています。これがないとエラーになります。
    const map = evt.target;
    
    // 1. 日本語化処理
    map.getStyle().layers.forEach((layer: any) => {
      if (layer.layout && layer.layout['text-field']) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ja'],
            ['get', 'name']
          ]);
        } catch (e) {}
      }
    });

    // 2. 不要なアイコン（バス停、お店、道路番号など）を非表示にする
    const layersToHide = [
      'road-number-shield', // 青い道路標識（国道番号など）
      'road-exit-shield'    // 高速道路の出口番号など
    ];

    layersToHide.forEach(id => {
      // そのレイヤーが存在する場合のみ非表示にする
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  };

  // ユーザーチェック & 既読ロード
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
        
        if (profile) setMyNickname(profile.nickname);
        else setShowNicknameModal(true);
      }
    };

    checkUser();

    const storedReads = localStorage.getItem('read_letter_ids');
    if (storedReads) {
      setReadLetterIds(JSON.parse(storedReads));
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUser();
        router.refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const markAsRead = (id: string) => {
    if (!readLetterIds.includes(id)) {
      const newIds = [...readLetterIds, id];
      setReadLetterIds(newIds);
      localStorage.setItem('read_letter_ids', JSON.stringify(newIds));
    }
  };

  // 手紙データの取得
  const fetchLetters = async () => {
    try {
      const { data: lettersData, error } = await supabase.from('letters').select('*');
      
      if (error) {
        console.error("Error fetching letters:", error);
        return;
      }
      if (!lettersData) return;

      setAllLetters(lettersData as Letter[]);

      const rootLetters = lettersData.filter((l: any) => l.parent_id === null || l.parent_id === undefined);
      const userIds = Array.from(new Set(rootLetters.map(l => l.user_id).filter(Boolean)));

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

      const mergedLetters = rootLetters.map((l: any) => ({
        ...l,
        nickname: nicknameMap[l.user_id] || null
      }));

      setLetters(mergedLetters as Letter[]);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
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

  const nearestNotificationLetter = useMemo<Letter | null>(() => {
    if (!userLocation) return null;
    
    let nearest: Letter | null = null;
    let minDist = Infinity;

    letters.forEach(letter => {
      if (!letter.is_official && !showUserPosts) return;
      
      if (!letter.is_official && !letter.is_post && letter.created_at) {
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

  useEffect(() => {
    const handleOpenPostParam = async () => {
      const params = new URLSearchParams(window.location.search);
      const openPostId = params.get('open_post');

      if (openPostId) {
        const { data: targetPost, error } = await supabase
          .from('letters')
          .select('*')
          .eq('id', openPostId)
          .single();

        if (targetPost && !error) {
          setTimeout(() => {
            if (targetPost.is_post) {
                setReadingPost(targetPost);
            } else {
                setReadingLetter(targetPost);
            }
            markAsRead(targetPost.id); // 自動で開いた場合も既読に
            
            setViewState(prev => ({
              ...prev,
              latitude: targetPost.lat,
              longitude: targetPost.lng,
              zoom: 16
            }));
            
            window.history.replaceState(null, '', '/');
          }, 500);
        }
      }
    };

    handleOpenPostParam();
  }, []);

  useEffect(() => {
    const checkVisitCount = () => {
      const visitedCount = localStorage.getItem('visit_count');
      const currentCount = visitedCount ? parseInt(visitedCount) : 0;
      const nextCount = currentCount + 1;
      
      localStorage.setItem('visit_count', nextCount.toString());

      if (nextCount === 4) {
        setTimeout(() => setShowPwaPrompt(true), 3000);
      }
    };
    checkVisitCount();
  }, []);

  // 投稿URL生成関数
  const getPostUrl = () => {
    if (!currentUser) return '/login?next=/post';
    if (userLocation) {
      return `/post?lat=${userLocation.lat}&lng=${userLocation.lng}`;
    }
    return '/post';
  };

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
        style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }}
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

      {nearestNotificationLetter && !popupInfo && (
        <div 
          className="fixed right-4 top-32 z-40 animate-slideInRight"
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
           <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-white transition-colors">
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
          if (!letter.is_official && !letter.is_post && letter.created_at) {
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
          
          const isRead = readLetterIds.includes(letter.id);

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
              <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-80' : ''}`}>
                <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center
                  ${isReachable ? 'border-orange-500 text-orange-600' : isNear ? 'border-gray-400 text-gray-600' : 'border-bunko-gray/10 text-bunko-ink'}`}>
                   
                   <span className="font-bold">
                     {letter.is_post ? '常設ポスト' : (letter.is_official ? '木林文庫の手紙' : (letter.nickname ? `${letter.nickname}さんの手紙` : ''))}
                   </span>

                   {letter.spot_name && letter.spot_name !== '名もなき場所' && (
                     <span className="text-[8px] text-gray-400 mt-0.5 font-sans">
                       📍 {letter.spot_name}
                     </span>
                   )}

                   {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1">
                     {letter.is_post ? '投函できます！' : '読めます！'}
                   </span>}
                </div>

                <div className={`transition-transform duration-300 drop-shadow-md relative ${isReachable ? 'animate-bounce' : isNear ? 'animate-pulse scale-110' : 'hover:scale-110'}`}>
                   
                   {letter.is_post ? (
                     <div className={isReachable ? "text-red-600" : isNear ? "text-red-500" : "text-red-700"}>
                        <IconPost 
                          className="w-12 h-12" 
                          hasLetters={allLetters.some(l => l.parent_id === letter.id)} 
                        />
                     </div>
                   ) : letter.is_official ? (
                     <div className={isReachable ? "text-yellow-500" : isNear ? "text-yellow-300" : "text-bunko-ink"}>
                        <IconAdminLetter className="w-8 h-8" />
                     </div>
                   ) : (
                     <div className={isReachable ? "text-orange-500" : isNear ? "text-cyan-500" : "text-bunko-ink"}>
                        <IconUserLetter className="w-8 h-8" />
                     </div>
                   )}
                   
                   {!letter.is_post && !isReachable && letter.password && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow">
                        <span className="text-[8px]">🔒</span>
                      </div>
                   )}
                   
                   {isReachable && !letter.is_post && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow w-4 h-4 flex items-center justify-center animate-pulse">
                        <span className="text-[8px] font-bold">!</span>
                      </div>
                   )}

                   {isRead && !isReachable && (
                      <div className="absolute bottom-0 -right-1 bg-white/80 rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
                        <span className="text-[8px] text-bunko-ink font-bold">✔︎</span>
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
            offset={[0, -40]}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="z-50 font-serif"
          >
            <div className="p-2 min-w-[160px] text-center pt-4">
              <h3 className="font-bold text-sm mb-1 text-bunko-ink">{popupInfo.title}</h3>
              <p className="text-[10px] text-gray-500 mb-1">
                {popupInfo.is_post ? '常設ポスト' : (popupInfo.is_official ? '木林文庫の手紙' : (popupInfo.nickname ? `${popupInfo.nickname}さんの置き手紙` : '置き手紙'))}
              </p>
              {popupInfo.spot_name !== '名もなき場所' && (
                <p className="text-xs text-bunko-gray mb-3">{popupInfo.spot_name}</p>
              )}
              
              {(() => {
                const distance = calculateDistance(popupInfo.lat, popupInfo.lng);
                const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
                const isMyPost = currentUser && currentUser.id === popupInfo.user_id;

                const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isAdmin || isMyPost;

                if (distance === null) return <p className="text-xs text-gray-400">現在地を確認中...</p>;

                if (isReachable) {
                  if (popupInfo.is_post) {
                    return (
                      <button 
                        onClick={() => {
                          setReadingPost(popupInfo);
                          markAsRead(popupInfo.id);
                        }}
                        className="w-full text-white text-xs py-2 px-4 rounded-full transition-colors shadow-sm font-bold bg-green-700 hover:bg-green-800"
                      >
                        ポストを開く
                      </button>
                    );
                  }

                  return (
                    <button 
                      onClick={() => {
                        setReadingLetter(popupInfo);
                        markAsRead(popupInfo.id);
                      }}
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

      {readingPost && (
        <PostModal 
          post={readingPost}
          currentUser={currentUser}
          onClose={() => setReadingPost(null)}
          isReachable={(() => {
             const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
             if (isAdmin) return true;
             
             const dist = calculateDistance(readingPost.lat, readingPost.lng);
             return dist !== null && dist <= UNLOCK_DISTANCE;
          })()}
        />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2">
        <div 
          className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative"
          onClick={() => router.push(getPostUrl())}
        >
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        
        <Link href={getPostUrl()}>
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