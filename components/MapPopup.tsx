'use client';

import { Popup } from 'react-map-gl';

type MapPopupProps = {
  popupInfo: any;
  userLocation: { lat: number, lng: number } | null;
  UNLOCK_DISTANCE: number;
  ADMIN_EMAILS: string[];
  currentUser: any;
  calculateDistance: (lat: number, lng: number) => number | null;
  onClose: () => void;
  onOpenDetail: (item: any) => Promise<void>;
};

export default function MapPopup({
  popupInfo,
  userLocation,
  UNLOCK_DISTANCE,
  ADMIN_EMAILS,
  currentUser,
  calculateDistance,
  onClose,
  onOpenDetail
}: MapPopupProps) {
  if (!popupInfo) return null;

  const lat = Number(popupInfo.lat);
  const lng = Number(popupInfo.lng);
  const dist = calculateDistance(lat, lng);
  const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
  const isMyPost = currentUser && currentUser.id === popupInfo.user_id;
  
  // 到達可能判定（30m以内、または自分の投稿、または管理者）
  const isReachable = (dist !== null && dist <= UNLOCK_DISTANCE) || isAdmin || isMyPost;

  return (
    <Popup 
      latitude={lat} 
      longitude={lng} 
      anchor="bottom" 
      offset={[0, -40]} 
      onClose={onClose} 
      closeOnClick={false} 
      className="z-50"
    >
      <div className="p-2 min-w-[160px] text-center pt-4 font-sans">
        
        {/* ★ここから分岐を修正 */}
        {popupInfo.name ? (
          /* --- C. 本屋（Bookstore）用の表示 --- */
          <>
            <h3 className="font-bold text-sm mb-1 text-rose-900 font-serif">{popupInfo.name}</h3>
            <p className="text-[10px] text-gray-400 mb-2 font-sans">📍 {popupInfo.address || '本屋スポット'}</p>
            
            {dist === null ? (
              <p className="text-[10px] text-gray-400 font-sans">位置情報を取得中...</p>
            ) : isReachable ? (
              <button 
                onClick={() => onOpenDetail(popupInfo)} 
                className="mt-1 w-full bg-rose-700 text-white text-[10px] py-1.5 rounded-full font-bold shadow-sm active:scale-95 transition-transform"
              >
                お店に入る
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 text-[10px] py-2 px-3 rounded-full border border-gray-200 font-sans w-full text-center">
                🔒 あと {dist}m
              </div>
            )}
          </>
        ) : popupInfo.area_key ? (
          /* --- A. 本棚（Bookshelf）用の表示 --- */
          <>
            <h3 className="font-bold text-sm mb-1 text-[#5d4037] font-serif">{popupInfo.display_name}の図書館</h3>
            {/* ...既存のBookshelfコード... */}
            <p className="text-[10px] text-gray-400 mb-2 font-sans">📍 {popupInfo.landmark_name}</p>
            {isReachable ? (
              <button onClick={() => onOpenDetail(popupInfo)} className="mt-1 w-full bg-orange-700 text-white text-[10px] py-1.5 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                図書館に入る
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 text-[10px] py-2 px-3 rounded-full border border-gray-200 font-sans w-full text-center">🔒 あと {dist}m</div>
            )}
          </>
        ) : (
          /* --- B. 手紙（Letter）用の表示 --- */
          <>
            <h3 className="font-bold text-sm mb-1 text-bunko-ink font-serif">{popupInfo.title}</h3>
            {/* ...既存のLetterコード... */}
            {isReachable ? (
              <button 
                onClick={() => onOpenDetail(popupInfo)} 
                className={`w-full text-white text-xs py-2 px-4 rounded-full transition-colors shadow-sm font-bold font-sans ${
                  popupInfo.is_post ? 'bg-red-600' : 'bg-green-700'
                }`}
              >
                {popupInfo.is_post ? 'ポストを開く' : '手紙を読む'}
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 text-xs py-2 px-2 rounded-full border border-gray-200 font-sans">🔒 あと {dist}m</div>
            )}
          </>
        )}
      </div>
    </Popup>
  );
}