'use client';
import Image from 'next/image';

type Props = {
  name: string;
  iconPath?: string;
  className?: string;
};

// ★ 修正箇所：引数に iconPath を追加し、デフォルト値を設定します
export default function IconBookstore({ 
  name, 
  iconPath = '/bookstore/bookstore__001.svg', 
  className = "w-14 h-14" 
}: Props) {
  return (
    <div className={`relative ${className} flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer`}>

      {/* 本屋アイコン本体 */}
      <div className="relative w-full h-full filter drop-shadow-lg">
        <Image
          src={iconPath} // これでエラーが消えます
          alt={name}
          fill
          sizes="64px"
          className="object-contain"
          priority
        />
      </div>

      {/* 足元の影 */}
      <div className="absolute -bottom-1 w-8 h-1 bg-black/10 rounded-full blur-[2px]"></div>
    </div>
  );
}