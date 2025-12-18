'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLinks from '@/components/FooterLinks';

export default function PrivacyPage() {
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
            <h1 className="text-l font-serif text-bunko-ink tracking-widest">プライバシーポリシー</h1>
          </div>
          
          <div className="space-y-6 text-sm leading-loose text-gray-600 font-serif">
            <p>木林文庫（以下，「運営」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。</p>
            
            <section>
              <h2 className="text-base font-bold text-gray-800 border-b pb-1 mb-2">第1条（個人情報）</h2>
              <p>「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報及び容貌，指紋，声紋にかかるデータ，及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。</p>
            </section>
            
            <section>
              <h2 className="text-base font-bold text-gray-800 border-b pb-1 mb-2">第2条（個人情報の収集方法）</h2>
              <p>運営は，ユーザーが利用登録をする際にメールアドレスなどの個人情報をお尋ねすることがあります。また，ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を,当社の提携先（情報提供元，広告主，広告配信先などを含みます。以下，｢提携先｣といいます。）などから収集することがあります。</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 border-b pb-1 mb-2">第3条（お問い合わせ窓口）</h2>
              <p>本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。</p>
              <div className="mt-2 bg-gray-50 p-4 rounded text-xs border border-gray-100">
                運営：木林文庫<br />
                Eメールアドレス：kirinbunko@gmail.com
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ★追加：共通フッター */}
      <FooterLinks />
    </div>
  );
}