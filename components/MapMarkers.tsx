'use client';

import { Marker } from 'react-map-gl';
import IconUserLetter from './IconUserLetter';
import IconAdminLetter from './IconAdminLetter';
import IconAdminPostcard from './IconAdminPostcard';
import IconPost from './IconPost';
import IconPostcard from './IconPostcard'; 
import IconBookshelf from './IconBookshelf';
import { calculateEffectiveHours } from '@/utils/weather';
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

type MapMarkersProps = {
  clusters: any[];
  supercluster: any;
  letters: any[];
  landmarkLetters: any[];
  allLetters: any[];
  bookshelves: any[];
  showUserPosts: boolean;
  calculateDistance: (lat: number, lng: number) => number | null;
  readLetterIds: string[];
  currentUser: any;
  isRainy: boolean;
  onMarkerClick: (letter: any) => void;
  onClusterClick: (leaves: any[]) => void;
};

const UNLOCK_DISTANCE = 30;
const ADMIN_EMAILS = ["marei.suyama@gmail.com", "contact@volvox-ltd.com"];

export default function MapMarkers({
  clusters,
  supercluster,
  letters,
  landmarkLetters,
  allLetters,
  bookshelves,
  showUserPosts,
  calculateDistance,
  readLetterIds,
  currentUser,
  isRainy,
  onMarkerClick,
  onClusterClick,
}: MapMarkersProps) {
  return (
    <>
      {/* 1. クラスター & 一般手紙 */}
        {showUserPosts && clusters.map((item: any) => {
        const [longitude, latitude] = item.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount, letterId } = item.properties;

        if (isCluster) {
          const iconSrc = pointCount > 5 ? "/many-letters.svg" : "/letters.svg";
          return (
            <Marker key={`cluster-${item.id}`} latitude={latitude} longitude={longitude}>
              <div 
                className="flex flex-col items-center cursor-pointer group" 
                onClick={() => {
                  if (supercluster) {
                    const leaves = supercluster.getLeaves(item.id);
                    onClusterClick(leaves.map((l: any) => l.properties));
                  }
                }}
              >
                <div className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg font-bold mb-1 z-20">{pointCount}通</div>
                <img src={iconSrc} className="w-12 h-12 drop-shadow-md transition-transform hover:scale-110" alt="cluster" />
              </div>
            </Marker>
          );
        }

        const letter = letters.find(l => l.id === letterId);
        if (!letter) return null;
        
        const distance = calculateDistance(letter.lat, letter.lng);
        const isMyPost = currentUser && currentUser.id === letter.user_id;
        const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isMyPost;
        const isRead = readLetterIds.includes(letter.id);
        const shouldBounce = isReachable && !isRead && !isMyPost;

        return (
          <Marker key={letter.id} latitude={letter.lat} longitude={letter.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); onMarkerClick(letter); }} style={{ zIndex: isReachable ? 10 : 1 }}>
            <div className={`flex flex-col items-center group cursor-pointer ${isRead ? 'opacity-70' : ''}`}>
              <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center ${isReachable ? 'border-orange-500 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
                 <span className="font-bold">{letter.nickname ? `${letter.nickname}さんの手紙` : '誰かの手紙'}</span>
                 {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1 font-sans">読めます！</span>}
              </div>
              <div className={`transition-transform duration-300 drop-shadow-md relative ${shouldBounce ? 'animate-bounce' : 'hover:scale-110'}`} style={{ filter: (isRainy && !letter.is_official) ? 'grayscale(0.7) blur(0.9px) brightness(0.85)' : 'none' }}>
                 {letter.is_postcard ? <IconPostcard className="w-12 h-12" /> : <IconUserLetter className="w-10 h-10" />}
                 {isRead && !isMyPost && <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-md border border-gray-100 z-30"><span className="text-[10px] text-green-600 font-bold">✔︎</span></div>}
              </div>
            </div>
          </Marker>
        );
      })}

      {/* 2. ランドマーク（ポスト・公式手紙） */}
      {landmarkLetters.map((letter) => {
        const distance = calculateDistance(letter.lat, letter.lng);
        const isAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);
        const isReachable = (distance !== null && distance <= UNLOCK_DISTANCE) || isAdmin;
        const postHasLetters = allLetters.some(l => l.parent_id === letter.id);

        return (
          <Marker key={letter.id} latitude={letter.lat} longitude={letter.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); onMarkerClick(letter); }} style={{ zIndex: 40 }}>
            <div className="flex flex-col items-center group cursor-pointer">
              <div className={`bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif whitespace-nowrap border flex flex-col items-center ${isReachable ? 'border-orange-500 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
                 <span className="font-bold">{letter.is_post ? (letter.spot_name ? `${letter.spot_name}のポスト` : 'ポスト') : (letter.spot_name ? `${letter.spot_name}の手紙` : '名も無き手紙')}</span>
                 {isReachable && <span className="block text-[8px] font-bold text-orange-500 text-center mt-1 font-sans">{letter.is_post ? '投函できます！' : '読めます！'}</span>}
              </div>
              <div className="transition-transform duration-300 drop-shadow-md hover:scale-110">
                 {letter.is_post ? <IconPost className="w-14 h-14" hasLetters={postHasLetters} /> : letter.is_postcard ? <IconAdminPostcard className="w-12 h-12" /> : <IconAdminLetter className="w-10 h-10" />}
              </div>
            </div>
          </Marker>
        );
      })}

      {/* 3. 本棚マーカー */}
      {bookshelves.map((shelf) => (
        <Marker key={shelf.id} latitude={shelf.lat} longitude={shelf.lng} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); onMarkerClick(shelf); }} style={{ zIndex: 5 }}>
          <div className="flex flex-col items-center group cursor-pointer">
            <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif border border-[#8a776a] text-[#5d4037] whitespace-nowrap">
               <span className="font-bold">{shelf.display_name}の図書館</span>
            </div>
            <IconBookshelf thankCount={shelf.thank_count} />
          </div>
        </Marker>
      ))}
    </>
  );
}