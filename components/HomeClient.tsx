'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { getDistance } from 'geolib';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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

// Map関連の動的インポート
const Map = dynamic(() => import('react-map-gl').then(mod => mod.Map), { ssr: false });
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
};

const UNLOCK_DISTANCE = 30;      
const NOTIFICATION_DISTANCE = 100; 

export default function HomeClient({ initialLetters }: { initialLetters: Letter[] }) {
  // 認証情報を Context から取得
  const { user: currentUser, profile, loading: authLoading, refreshProfile } = useAuth();
  const myNickname = profile?.nickname || null;
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const ADMIN_EMAILS = ["marei.suyama@gmail.com", "contact@volvox-ltd.com"];
  
  // サーバーから届いたデータを初期値にセット
  const [letters, setLetters] = useState<Letter[]>(initialLetters);
  const [readLetterIds, setReadLetterIds] = useState<string[]>([]);
  
  const [popupInfo, setPopupInfo] = useState<Letter | null>(null);
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  const [readingPost, setReadingPost] = useState<Letter | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserPosts, setShowUserPosts] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [viewState, setViewState] = useState({ latitude: 35.6288, longitude: 139.6842, zoom: 15 });

  // ★重要：認証状態の変化を監視し、画面を同期させる
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // サーバー側のデータを最新にするためにページをリフレッシュ
        router.refresh();
      }
    });

    const storedReads = localStorage.getItem('read_letter_ids');
    if (storedReads) setReadLetterIds(JSON.parse(storedReads));

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  // 位置情報の管理
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (!hasCentered) {
          setViewState(v => ({ ...v, latitude, longitude, zoom: 15 }));
          setHasCentered(true);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasCentered]);

  // モーダル表示の制御
  useEffect(() => {
    if (!localStorage.getItem('hasSeenTutorial')) setShowTutorial(true);
    if (!authLoading && currentUser && !myNickname) {
      setShowNicknameModal(true);
    }
  }, [authLoading, currentUser, myNickname]);

  const calculateDistance = (targetLat: number, targetLng: number) => {
    if (!userLocation) return null;
    return getDistance(
      { latitude: userLocation.lat, longitude: userLocation.lng },
      { latitude: targetLat, longitude: targetLng }
    );
  };

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapToken) return null;

  return (
    <main className="w-full h-screen relative overflow-hidden bg-[#f7f4ea]">
      {/* ニックネームモーダル */}
      {!authLoading && showNicknameModal && currentUser && (
        <NicknameModal 
          user={currentUser} 
          onRegistered={() => { refreshProfile(); setShowNicknameModal(false); }} 
        />
      )}

      {/* ヘッダー */}
      <Header 
        currentUser={currentUser} 
        nickname={myNickname} 
        onAboutClick={() => setShowAbout(true)} 
        isHidden={false} 
      />

      {/* 地図 */}
      <Map 
        {...viewState} 
        onMove={evt => setViewState(evt.viewState)} 
        mapboxAccessToken={mapToken} 
        style={{ width: '100%', height: '100%' }} 
        mapStyle="mapbox://styles/mapbox/streets-v12" 
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="bottom-right" style={{ marginBottom: '100px', marginRight: '16px' }} />
        <GeolocateControl position="bottom-right" trackUserLocation={true} style={{ marginBottom: '100px', marginRight: '16px' }} />

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative"></div>
              <div className="w-4 h-4 bg-blue-500 rounded-full absolute top-0 left-0 animate-ping opacity-50"></div>
            </div>
          </Marker>
        )}

        {letters.map((letter) => {
          if (!letter.is_official && !showUserPosts) return null;
          const dist = calculateDistance(letter.lat, letter.lng);
          const isMyPost = currentUser && currentUser.id === letter.user_id;
          const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
          const isReachable = (dist !== null && dist <= UNLOCK_DISTANCE) || isMyPost || isAdmin;
          const isRead = readLetterIds.includes(letter.id);
          const Icon = letter.is_post ? IconPost : (letter.is_official ? IconAdminLetter : IconUserLetter);

          return (
            <Marker 
              key={letter.id} 
              latitude={letter.lat} 
              longitude={letter.lng} 
              anchor="bottom" 
              onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(letter); }}
            >
              <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-70' : ''}`}>
                <div className={`transition-transform duration-300 drop-shadow-md ${isReachable ? 'animate-bounce' : 'hover:scale-110'}`}>
                  <Icon className={`w-8 h-8 ${isReachable ? (letter.is_official ? 'text-yellow-500' : 'text-orange-500') : 'text-bunko-ink'}`} />
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup latitude={popupInfo.lat} longitude={popupInfo.lng} anchor="bottom" offset={[0, -40]} onClose={() => setPopupInfo(null)} closeOnClick={false} className="z-50">
            <div className="p-2 min-w-[140px] text-center pt-2 font-serif">
              <h3 className="font-bold text-xs mb-1 text-bunko-ink">{popupInfo.title}</h3>
              {(() => {
                const dist = calculateDistance(popupInfo.lat, popupInfo.lng);
                const isMyPost = currentUser && currentUser.id === popupInfo.user_id;
                const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
                const isReachable = (dist !== null && dist <= UNLOCK_DISTANCE) || isAdmin || isMyPost;
                
                if (isReachable) {
                  return (
                    <button 
                      onClick={() => { popupInfo.is_post ? setReadingPost(popupInfo) : setReadingLetter(popupInfo); }} 
                      className="w-full text-white text-[10px] py-1.5 px-3 rounded-full bg-green-700 font-bold font-sans"
                    >
                      {popupInfo.is_post ? 'ポストを開く' : '手紙を開く'}
                    </button>
                  );
                }
                return <div className="text-[10px] text-gray-500 font-sans">🔒 あと {dist}m</div>;
              })()}
            </div>
          </Popup>
        )}
      </Map>

      {/* 投稿ボタン */}
      <div className="fixed bottom-8 right-4 z-40">
        <Link href={currentUser ? `/post?lat=${userLocation?.lat}&lng=${userLocation?.lng}` : '/login'}>
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors ${authLoading ? 'bg-gray-300' : 'bg-green-700 hover:bg-green-800'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
        </Link>
      </div>

      {readingLetter && <LetterModal letter={readingLetter} currentUser={currentUser} onClose={() => setReadingLetter(null)} />}
      {readingPost && <PostModal post={readingPost} currentUser={currentUser} onClose={() => setReadingPost(null)} isReachable={true} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showTutorial && <TutorialModal onClose={() => { localStorage.setItem('hasSeenTutorial', 'true'); setShowTutorial(false); }} />}
      
      {/* 認証確認インジケーター */}
      {authLoading && (
        <div className="fixed top-4 right-12 z-50 bg-white/90 px-2 py-1 rounded shadow-sm text-[8px] font-bold text-gray-400 animate-pulse">
          認証確認中...
        </div>
      )}
    </main>
  );
}