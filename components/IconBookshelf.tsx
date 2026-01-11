'use client';
import Image from 'next/image';

type Props = {
  thankCount: number;
  className?: string;
};

export default function IconBookshelf({ thankCount, className = "w-14 h-14" }: Props) {
  // 想いの量に応じた成長段階の判定
  const getStage = () => {
    // 101以上：図書館
    if (thankCount >= 101) return { 
      src: '/library.png', 
      label: '街の図書館', 
      scale: 'scale-125' 
    };
    // 51〜100：大きな本棚（複数の本棚）
    if (thankCount >= 51) return { 
      src: '/shelves.png', 
      label: '重厚な書架', 
      scale: 'scale-115' 
    };
    // 6〜50：本棚
    if (thankCount >= 6) return { 
      src: '/shelf.png', 
      label: '立派な本棚', 
      scale: 'scale-105' 
    };
    // 1〜5：本（または小さな木箱）
    return { 
      src: '/books.png', 
      label: '小さな本', 
      scale: 'scale-100' 
    };
  };

  const stage = getStage();

  return (
    <div className={`relative ${className} flex items-center justify-center transition-all duration-500 ${stage.scale}`}>
      
      {/* 成長段階に応じたPNG画像 */}
      <div className="relative w-full h-full filter drop-shadow-md hover:brightness-110 active:scale-95 transition-all">
        <Image
          src={stage.src}
          alt={stage.label}
          fill
          sizes="64px"
          className="object-contain"
          priority
        />
      </div>

      {/* 想いの数バッジ */}
      {thankCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-pulse z-10">
          {thankCount}
        </div>
      )}
      
      {/* 土台の演出（地層のような影） */}
      <div className="absolute -bottom-1 w-8 h-1 bg-black/10 rounded-full blur-[2px]"></div>
    </div>
  );
}