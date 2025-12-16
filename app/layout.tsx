import './globals.css';
import type { Metadata } from 'next';
// Google Fontsからフォントを読み込む
import { Zen_Maru_Gothic, Shippori_Mincho } from 'next/font/google';

// 1. ゴシック体（基本の文字 / UI / ボタン用）
const gothic = Zen_Maru_Gothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-gothic', // 後でCSS変数として使えるようにする
  display: 'swap',
});

// 2. 明朝体（タイトル / 手紙の本文用）
const mincho = Shippori_Mincho({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mincho',
  display: 'swap',
});

// ★修正：SNSシェア用の設定 (OGP)
export const metadata: Metadata = {
  title: 'おきてがみ',
  description: '地図に手紙を置くアプリ',
  openGraph: {
    title: 'おきてがみ',
    description: '散歩のついでに、言葉の宝探しをしてみませんか。',
    siteName: 'おきてがみ',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'おきてがみ',
    description: '散歩のついでに、言葉の宝探しをしてみませんか。',
  },
  // アイコン設定はNext.jsが自動検出しますが、念のため明記も可能
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${gothic.variable} ${mincho.variable} font-sans text-gray-800`}>
        {children}
      </body>
    </html>
  );
}