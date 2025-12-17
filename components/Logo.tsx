import Image from 'next/image';

type Props = {
  className?: string;
};

export default function Logo({ className = "w-10 h-10" }: Props) {
  return (
    <Image
      src="/logo.png"       // ★ publicフォルダに入れたファイル名
      alt="Logo"
      width={120}           // ★ 画像の元サイズ（縦横比用）を入力
      height={120}          // ★ ここは適当な数値でも、classNameで上書きされますが、縦横比を合わせると綺麗です
      className={`${className} object-contain`} // サイズは親から受け取り、比率を崩さないようにする
      priority              // ロゴなので優先的に読み込む設定
    />
  );
}