'use client';

type Props = {
  thankCount: number;
  className?: string;
};

export default function IconBookshelf({ thankCount, className = "w-14 h-14" }: Props) {
  // 想いの量に応じた成長段階の判定
  const getStage = () => {
    if (thankCount >= 51) return { label: '重厚な書架', icon: '🏛️', scale: 'scale-125' };
    if (thankCount >= 21) return { label: '立派な本棚', icon: '📚', scale: 'scale-115' };
    if (thankCount >= 6)  return { label: '小さな棚',   icon: '📖', scale: 'scale-105' };
    return { label: '小さな木箱', icon: '📦', scale: 'scale-100' };
  };

  const stage = getStage();

  return (
    <div className={`relative ${className} flex items-center justify-center transition-all duration-500 ${stage.scale}`}>
      {/* 成長段階に応じたアイコン */}
      <div className="text-4xl filter drop-shadow-md hover:brightness-110 active:scale-95 transition-all">
        {stage.icon}
      </div>

      {/* 想いの数バッジ */}
      {thankCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-pulse">
          {thankCount}
        </div>
      )}
      
      {/* 土台の演出（地層のような影） */}
      <div className="absolute -bottom-1 w-8 h-1 bg-black/10 rounded-full blur-[2px]"></div>
    </div>
  );
}