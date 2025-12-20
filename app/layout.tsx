import './globals.css';
import type { Metadata, Viewport } from 'next'; // ★修正：Viewport型を追加
// Google Fontsからフォントを読み込む
import { Zen_Maru_Gothic, Shippori_Mincho } from 'next/font/google';

// 1. ゴシック体（基本の文字 / UI / ボタン用）
const gothic = Zen_Maru_Gothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-gothic',
  display: 'swap',
});

// 2. 明朝体（タイトル / 手紙の本文用）
const mincho = Shippori_Mincho({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mincho',
  display: 'swap',
});

// SNSシェア用の設定 (OGP)
export const metadata: Metadata = {
  title: 'おきてがみ',
  description: '48時間だけ読める、場所と記憶のタイムカプセル',
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
};

// ★修正：ビューポート設定を追加（これが入力時のズームを防ぎます）
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ユーザーによるピンチズームを禁止（ネイティブアプリ風の挙動にする）
  // キーボードが出た時のレイアウト崩れを防ぐ設定（iOS/Android両対応）
  interactiveWidget: 'resizes-visual', 
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