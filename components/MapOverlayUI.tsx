'use client';

type MapOverlayUIProps = {
  isRainy: boolean;
  showRainNotice: boolean;
  showCounts: boolean;
  unreadCount: number;
  showUserPosts: boolean;
  onToggleUserPosts: (val: boolean) => void;
};

export default function MapOverlayUI({
  isRainy,
  showRainNotice,
  showCounts,
  unreadCount,
  showUserPosts,
  onToggleUserPosts
}: MapOverlayUIProps) {
  return (
    <>
      {/* 右上：雨告知バー ＆ 未読通知 */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+64px)] right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {showRainNotice && (
          <div className="bg-blue-600/85 backdrop-blur-md text-white px-3 py-1 rounded-lg shadow-xl border border-white/10 text-right leading-relaxed animate-fadeInDown pointer-events-auto">
            <p className="text-[10px] font-serif tracking-widest opacity-90">現在、雨が降っています</p>
            <p className="text-[10px] font-serif tracking-wider whitespace-nowrap">手紙が痛みやすくなっています</p>
          </div>
        )}
        
        {showCounts && (
          <div className="bg-stone-500/85 backdrop-blur-md text-white px-3 py-1 rounded-lg shadow-xl border border-white/10 text-right leading-relaxed animate-fadeInDown pointer-events-auto">
            <p className="text-[10px] font-serif tracking-widest opacity-90">半径3kmに未読の手紙が</p>
            <p className="text-[10px] font-serif tracking-wider whitespace-nowrap">
              <span className="text-sm">{unreadCount}通</span>あります
            </p>
          </div>
        )}
      </div>

      {/* 左上：みんなの手紙スイッチ */}
      <div className="absolute left-4 z-20 transition-all top-[calc(env(safe-area-inset-top)+64px)] md:top-[calc(env(safe-area-inset-top)+70px)]">
        <div className="flex items-center bg-white/90 backdrop-blur px-3 py-2 rounded-full shadow-md border border-gray-100">
          <span className="text-[10px] font-bold text-gray-600 mr-2 font-sans">みんなの手紙</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={showUserPosts} 
              onChange={() => onToggleUserPosts(!showUserPosts)} 
            />
            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
      </div>
    </>
  );
}