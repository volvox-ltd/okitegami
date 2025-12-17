import Link from 'next/link';
import Logo from '@/components/Logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ea] p-6 font-sans text-gray-800">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo className="w-12 h-12 text-bunko-ink mx-auto mb-2" />
          </Link>
          <h1 className="text-l font-serif text-bunko-ink">プライバシーポリシー</h1>
        </div>
        
        <div className="space-y-4 text-sm leading-relaxed text-gray-600">
          <p>木林文庫（以下，「運営」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。</p>
          
          <h2 className="text-base font-bold text-gray-800 mt-6 border-b pb-1">第1条（個人情報）</h2>
          <p>「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報及び容貌，指紋，声紋にかかるデータ，及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。</p>
          
          <h2 className="text-base font-bold text-gray-800 mt-6 border-b pb-1">第2条（個人情報の収集方法）</h2>
          <p>運営は，ユーザーが利用登録をする際にメールアドレスなどの個人情報をお尋ねすることがあります。また，ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を,当社の提携先（情報提供元，広告主，広告配信先などを含みます。以下，｢提携先｣といいます。）などから収集することがあります。</p>

          <h2 className="text-base font-bold text-gray-800 mt-6 border-b pb-1">第3条（お問い合わせ窓口）</h2>
          <p>本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。</p>
          <p className="mt-2 bg-gray-50 p-2 rounded">
            運営：木林文庫<br />
            Eメールアドレス：kirinbunko@gmail.com
          </p>

          {/* 必要に応じて条文を追加してください */}
          
          <div className="mt-8 pt-8 border-t text-center">
            <Link href="/" className="text-green-700 font-bold hover:underline">
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}