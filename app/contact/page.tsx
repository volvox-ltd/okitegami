'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ContactPage() {
  // ★ここに、さっき作ったGoogleフォームのURLを貼り付けてください
  const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc6eAsUgpkivUMrS1xFh-ydAIBz4Q6wNLo1ID6Gn_zZHKKRyg/viewform?usp=dialog";

  return (
    <div className="min-h-screen bg-[#f7f4ea] p-6 font-sans text-gray-800 flex flex-col items-center">
      
      {/* ヘッダーエリア */}
      <div className="max-w-md w-full mt-8 mb-8 text-center">
        <Link href="/" className="inline-block hover:opacity-70 transition-opacity">
          <Logo className="w-16 h-16 text-bunko-ink mx-auto mb-3" />
        </Link>
        <h1 className="text-xl font-bold font-serif text-bunko-ink tracking-widest">
          お問い合わせ
        </h1>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          「おきてがみ」をご利用いただきありがとうございます。<br /><br />
          不具合の報告、サービスへのご意見、または<span className="font-bold text-red-400">不適切な投稿のご報告</span>などは、以下のフォームよりお送りください。
        </p>
        
        <p className="text-xs text-gray-400 mb-8">
          ※ 個人運営のため、返信にお時間をいただく場合がございます。あらかじめご了承ください。
        </p>

        <a 
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 bg-green-700 text-white font-bold text-center rounded-full shadow-lg hover:bg-green-800 hover:scale-[1.02] transition-all"
        >
          お問い合わせフォームを開く
          <span className="text-xs font-normal ml-2 opacity-80">
            (Google Form)
          </span>
        </a>

        {/* 戻るリンク */}
        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-green-700 transition-colors">
            地図に戻る
          </Link>
        </div>
      </div>

      {/* フッター的な装飾 */}
      <div className="mt-12 text-[10px] text-gray-400 font-serif">
        &copy; 木林文庫
      </div>
    </div>
  );
}