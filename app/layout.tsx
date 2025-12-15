import type { Metadata } from "next";
// Google Fonts から「しっぽり明朝」を読み込む
import { Shippori_Mincho } from "next/font/google";
import "./globals.css";

// フォントの設定
const shippori = Shippori_Mincho({ 
  weight: ['400', '500', '700'], // 必要な太さを指定
  subsets: ['latin'],
  variable: '--font-shippori',   // これが tailwind.config.ts で使う変数名になります
  display: 'swap',
});

export const metadata: Metadata = {
  title: "木林のおきてがみ",
  description: "街に隠された手紙を探す、小さな冒険。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* bodyタグにフォント変数をセット */}
      <body className={`${shippori.variable} font-serif antialiased`}>
        {children}
      </body>
    </html>
  );
}