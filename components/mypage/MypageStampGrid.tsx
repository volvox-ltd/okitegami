'use client';

type UserStampRecord = {
  id: string;
  count: number;
  last_obtained_at: string;
  stamp: {
    id: number;
    name: string;
    image_url: string;
    description: string;
  };
  post?: any; 
};

type MypageStampGridProps = {
  records: UserStampRecord[];
  onItemClick: (post: any) => void;
  onLogout: () => void;
};

export default function MypageStampGrid({
  records,
  onItemClick,
  onLogout
}: MypageStampGridProps) {
  return (
    <div className="animate-fadeIn">
      {records.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-xs font-sans">
          まだ切手はありません。
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 px-2 max-w-5xl mx-auto pt-4">
          {records.map(record => (
            <div 
              key={record.id} 
              className="flex flex-col items-center group cursor-pointer" 
              onClick={() => record.post && onItemClick(record.post)}
            >
              <div className="relative w-full aspect-[3/4]">
                {/* 重なり演出：3枚以上 */}
                {record.count >= 3 && (
                  <div className="absolute inset-0 bg-white border border-gray-200 rounded shadow-sm transform rotate-6 translate-x-1.5 translate-y-1 scale-100 origin-bottom-right opacity-60 z-0" />
                )}
                {/* 重なり演出：2枚以上 */}
                {record.count >= 2 && (
                  <div className="absolute inset-0 bg-white border border-gray-200 rounded shadow-sm transform rotate-3 translate-x-0.5 translate-y-0.5 scale-100 origin-bottom-right z-0" />
                )}
                
                {/* メインの切手 */}
                <div className="absolute inset-0 w-full h-full rounded border border-gray-200 bg-white shadow-sm p-1 flex items-center justify-center transition-transform group-hover:scale-105 z-10">
                  <img src={record.stamp.image_url} alt={record.stamp.name} className="w-full h-full object-contain" />
                </div>

                {/* 枚数バッジ */}
                {record.count > 1 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white z-20 font-sans">
                    {record.count}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-center text-bunko-ink truncate w-full mt-2 font-sans">
                {record.stamp.name}
              </p>
            </div>
          ))}
        </div>
      )}
      
      {/* 切手帳タブ内のログアウトボタン */}
      <div className="text-center mt-12 mb-8">
        <button onClick={onLogout} className="text-xs text-red-400 underline hover:text-red-600 font-sans">
          ログアウト
        </button>
      </div>
    </div>
  );
}