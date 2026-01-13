'use client';

// パスを ../ に修正（一つ上の階層の components/ 直下を見に行くように）
import IconUserLetter from '../IconUserLetter';
import IconAdminLetter from '../IconAdminLetter';
import IconAdminPostcard from '../IconAdminPostcard'; 
import IconPost from '../IconPost'; 
import IconPostcard from '../IconPostcard'; 
import { LETTER_EXPIRATION_HOURS } from '@/utils/constants';

type Letter = {
  id: string; title: string; spot_name: string; content: string;
  lat: number; lng: number; image_url?: string; is_official?: boolean;
  user_id?: string; created_at: string; password?: string | null;
  attached_stamp_id?: number | null; read_count?: number;
  is_post?: boolean; parent_id?: string | null;
  is_postcard?: boolean;
};

type MypageLetterListProps = {
  letters: Letter[];
  activeTab: string;
  postFilter: string;
  onItemClick: (item: Letter) => void;
};

export default function MypageLetterList({
  letters,
  activeTab,
  postFilter,
  onItemClick
}: MypageLetterListProps) {
  
  const isExpired = (createdAt: string) => {
    return (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60) > LETTER_EXPIRATION_HOURS;
  };

  if (letters.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-xs font-sans">データがありません。</div>;
  }

  return (
    <div className="animate-fadeIn space-y-3 max-w-3xl mx-auto">
      {letters.map((letter) => {
        const expired = !letter.is_official && !letter.is_post && isExpired(letter.created_at);
        const isSubmittedToPost = !!letter.parent_id && letter.is_post === true;
        const isReply = !!letter.parent_id && !letter.is_post;
        const displayTitle = isSubmittedToPost ? `${letter.spot_name}への手紙` : letter.title;
        
        return (
          <div 
            key={letter.id} 
            onClick={() => onItemClick(letter)}
            className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] ${
              expired && !isSubmittedToPost && !isReply ? 'opacity-70 saturate-[0.3] bg-gray-50' : ''
            }`}
          >
            <div className="shrink-0 relative">
              {isSubmittedToPost ? (
                <div className="text-red-600"><IconPost className="w-10 h-10" /></div>
              ) : letter.is_postcard ? (
                <div className={`${(expired && (postFilter === 'written' || activeTab === 'favorites')) ? 'opacity-30 grayscale' : ''}`}>
                   {letter.is_official ? <IconAdminPostcard className="w-10 h-10" /> : <IconPostcard className="w-10 h-10" />}
                </div>
              ) : letter.is_official ? (
                <IconAdminLetter className="w-10 h-10" />
              ) : (
                <IconUserLetter className="w-10 h-10" />
              )}
              {isReply && <div className="absolute -bottom-1 -right-1 text-[10px]">💬</div>}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm truncate font-serif">{displayTitle}</h3>
                {expired && !isSubmittedToPost && !isReply && (
                  <span className="text-[9px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 font-sans">消印済</span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-1 italic font-sans">📍 {letter.spot_name}</p>
              <div className="flex justify-between items-end mt-1">
                <p className="text-[10px] text-gray-300 font-sans">{new Date(letter.created_at).toLocaleDateString()}</p>
                {activeTab === 'posts' && !expired && !isSubmittedToPost && !isReply && letter.read_count !== undefined && letter.read_count > 0 && (
                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    <span className="text-[9px] font-bold text-orange-600 font-sans">開封されました</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}