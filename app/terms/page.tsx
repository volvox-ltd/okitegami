'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLinks from '@/components/FooterLinks';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ea] relative font-sans text-gray-800 pb-10">
      
      {/* ★変更：左上の戻るボタン（< アイコン） */}
      <Link 
        href="/" 
        className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-black transition-colors"
      >
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
           <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
         </svg>
      </Link>

      <div className="max-w-2xl mx-auto pt-20 px-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm mb-12">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Logo className="w-12 h-12 text-bunko-ink mx-auto mb-2" />
            </Link>
            <h1 className="text-l font-serif text-bunko-ink tracking-widest">利用規約</h1>
          </div>
          
          <div className="space-y-6 text-sm leading-loose text-gray-600 font-serif">
            <p>この利用規約（以下，「本規約」といいます。）は，木林文庫（以下，「運営」といいます。）がこのウェブサイト上で提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。</p>
            
            <section>
              <h2 className="text-base font-bold text-gray-800 border-b pb-1 mb-2">第1条（適用）</h2>
              <p>本規約は，ユーザーと運営との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
            </section>
            
            <section>
              <h2 className="text-base font-bold text-gray-800 border-b pb-1 mb-2">第2条（禁止事項）</h2>
              <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
              <ul className="list-disc list-outside ml-4 mt-2 space-y-1">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>不正アクセスをし，またはこれを試みる行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>運営のサービスに関連して，反社会的勢力に対して直接または間接に利益を供与する行為</li>
                <li>その他，運営が不適切と判断する行為</li>
              </ul>
            </section>
            
            {/* 白いボード内の「トップへ戻る」は削除し、左上のボタンとフッターに任せます */}
          </div>
        </div>
      </div>

      {/* ★追加：共通フッター */}
      <FooterLinks />
    </div>
  );
}