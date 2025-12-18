'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLinks from '@/components/FooterLinks';

export default function ContactPage() {
  const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc6eAsUgpkivUMrS1xFh-ydAIBz4Q6wNLo1ID6Gn_zZHKKRyg/viewform?usp=dialog";

  return (
    <div className="min-h-screen bg-[#f7f4ea] relative font-sans text-gray-800 pb-10 flex flex-col items-center">
      
      {/* ★変更：左上の戻るボタン（< アイコン） */}
      <Link 
        href="/" 
        className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-black transition-colors"
      >
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
         </svg>
      </Link>

      {/* メインコンテンツエリア */}
      <div className="max-w-md w-full px-6 pt-20">
        
        {/* ヘッダーエリア */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block hover:opacity-70 transition-opacity">
            <Logo className="w-16 h-16 text-bunko-ink mx-auto mb-3" />
          </Link>
          <h1 className="text-xl font-bold font-serif text-bunko-ink tracking-widest">
            お問い合わせ
          </h1>
        </div>

        {/* 白いボード */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 font-serif">
            「おきてがみ」をご利用いただきありがとうございます。<br /><br />
            不具合の報告、サービスへのご意見、または<span className="font-bold text-red-400 border-b border-red-200">不適切な投稿のご報告</span>などは、以下のフォームよりお送りください。
          </p>
          
          <p className="text-xs text-gray-400 mb-8 font-serif">
            ※ 返信にお時間をいただく場合がございます。あらかじめご了承ください。
          </p>

          <a 
            href={GOOGLE_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            // ★修正：ボタン内の要素を縦並びも許容して崩れ防止
            className="w-full py-4 px-2 bg-green-700 text-white font-bold text-center rounded-full shadow-lg hover:bg-green-800 hover:scale-[1.02] transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
          >
            <span>お問い合わせフォームを開く</span>
            <span className="text-xs font-normal opacity-80 whitespace-nowrap">
              (Google Form)
            </span>
          </a>

          {/* ボード内の戻るリンクは削除 */}
        </div>
      </div>

      {/* ★追加：共通フッター */}
      <FooterLinks />
    </div>
  );
}