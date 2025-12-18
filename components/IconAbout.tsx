import Image from 'next/image';

type Props = {
  className?: string;
};

export default function IconAbout({ className = "w-6 h-6" }: Props) {
  return (
    // 画像を親のサイズ(className)に合わせて埋め込むためのラッパー
    <div className={`relative ${className}`}>
      <Image
        src="/logo.png"
        alt="おきてがみとは"
        fill
        className="object-contain" // アスペクト比を維持して収める
        sizes="32px" // 小さいアイコンなのでサイズ指定を最適化
      />
    </div>
  );
}