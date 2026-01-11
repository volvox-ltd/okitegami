// components/BrandLogo.tsx
import Image from 'next/image';

type Props = {
  className?: string;
};

export default function BrandLogo({ className = "w-auto h-20" }: Props) {
  return (
    <Image
      src="/brand-logo.png"   // ★ 新しいロゴファイル名（ロゴ+ロゴタイプのもの）
      alt="木林文庫"
      /* ここを 120x120 ではなく 512x660 にすることで、
         Next.js が「この画像は縦長である」と正しく認識します 
      */
      width={512}
      height={660}
      className={`${className} object-contain`}
      priority
    />
  );
}