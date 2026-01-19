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

// app/layout.tsx

export const metadata: Metadata = {
  // ブラウザのタブに表示されるタイトル
  title: {
    default: 'おきてがみ | 街に手紙を置くアプリ',
    template: '%s | おきてがみ'
  },
  description: '48時間だけ読める、場所と記憶のタイムカプセル。今いる場所に、そっと手紙を置いてみませんか？',
  
  // Open Graph (Facebook, LINE, Discord用)
  openGraph: {
    title: 'おきてがみ',
    description: '散歩のついでに、誰かが残した言葉の宝探し。48時間で消える、一期一会のメッセージ。',
    url: 'https://okitegami.online',
    siteName: 'おきてがみ',
    images: [
      {
        url: '/ogp-image.png', // ★publicフォルダに1200x630の画像を配置
        width: 1200,
        height: 630,
        alt: 'おきてがみ - 街に手紙を置くアプリ',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },

  // Twitter (X) 用
  twitter: {
    card: 'summary_large_image',
    title: 'おきてがみ | 街に手紙を置くアプリ',
    description: '48時間で消える、場所と記憶のタイムカプセル。散歩のついでに、言葉の宝探しをしてみませんか？',
    images: ['/ogp-image.png'], // OGPと同じ画像でOK
    // creator: '@your_twitter_handle', // もし公式Xアカウントがあれば追加
  },

  // その他の基本設定
  alternates: {
    canonical: 'https://okitegami.online',
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