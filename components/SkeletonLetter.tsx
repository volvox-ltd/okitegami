export default function SkeletonLetter() {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 animate-pulse">
      {/* アイコン部分のグレー丸 */}
      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
      
      {/* テキスト部分のグレー線 */}
      <div className="flex-1 space-y-2">
        {/* タイトル用の太い線 */}
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        {/* 場所・日付用の細い線 */}
        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
  );
}