'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, Popup, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import { getDistance } from 'geolib';

// アイコン類
import BookIcon from '@/components/BookIcon';
import LetterModal from '@/components/LetterModal';
import AboutModal from '@/components/AboutModal'; // ← 追加！
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
};

const UNLOCK_DISTANCE = 100;

export default function Home() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [popupInfo, setPopupInfo] = useState<Letter | null>(null);
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);
  
  // Aboutモーダルの表示状態
  const [showAbout, setShowAbout] = useState(false); // ← 追加！

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 35.6288,
    longitude: 139.6842,
    zoom: 15
  });

  useEffect(() => {
    const fetchLetters = async () => {
      const { data } = await supabase.from('letters').select('*');
      if (data) setLetters(data);
    };
    fetchLetters();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 z-10 w-full p-3 bg-white/90 backdrop-blur-sm shadow-sm">
        <h1 className="text-center font-serif text-lg tracking-widest text-bunko-ink">
          木林のおきてがみ
        </h1>
      </div>

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

        {letters.map((letter) => (
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
                {letter.spot_name}
              </div>
              <div className="hover:scale-110 transition-transform duration-300 drop-shadow-md">
                 {/* サイズ調整が必要であれば w-12 h-12 などに変更してください */}
                 <BookIcon className="w-10 h-10" />
              </div>
            </div>
          </Marker>
        ))}

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
              <p className="text-xs text-bunko-gray mb-3">{popupInfo.spot_name}</p>
              
              {(() => {
                const distance = calculateDistance(popupInfo.lat, popupInfo.lng);
                
                if (distance === null) return <p className="text-xs text-gray-400">現在地を確認中...</p>;

                if (distance <= UNLOCK_DISTANCE) {
                  return (
                    <button 
                      onClick={() => setReadingLetter(popupInfo)}
                      className="w-full bg-orange-500 text-white text-xs py-2 px-4 rounded-full hover:bg-red-600 transition-colors shadow-sm font-bold"
                    >
                      手紙を開く
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

      {/* 手紙を読むモーダル */}
      {readingLetter && (
        <LetterModal 
          letter={readingLetter} 
          onClose={() => setReadingLetter(null)} 
        />
      )}

      {/* Aboutモーダル (追加) */}
      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      {/* 下部固定メニュー */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-2xl h-16 flex justify-around items-center z-40 px-2">
        
        {/* 手紙を探す */}
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

        {/* 本棚 (グレーアウト・無効化) */}
        <button 
          onClick={() => alert("この機能は現在準備中です。")}
          className="flex flex-col items-center justify-center w-full h-full cursor-not-allowed opacity-40"
        >
          <IconShelf className="w-6 h-6 mb-1 text-gray-400" />
          <span className="text-[10px] font-sans font-bold text-gray-400">本棚</span>
        </button>

        {/* 木林のおきてがみとは (クリックでモーダル表示) */}
        <button 
          onClick={() => setShowAbout(true)}
          className="flex flex-col items-center justify-center w-full h-full text-bunko-ink group"
        >
          <IconAbout className="w-6 h-6 mb-1 text-bunko-gray group-hover:text-orange-500 transition-colors" />
          <span className="text-[10px] font-sans font-bold text-gray-600 group-hover:text-orange-500">木林のおきてがみとは</span>
        </button>

      </div>

    </main>
  );
}