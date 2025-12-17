import Link from 'next/link';
import Logo from '@/components/Logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ea] p-6 font-sans text-gray-800">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo className="w-12 h-12 text-bunko-ink mx-auto mb-2" />
          </Link>
          <h1 className="text-l font-serif text-bunko-ink">利用規約</h1>
        </div>
        
        <div className="space-y-4 text-sm leading-relaxed text-gray-600">
          <p>この利用規約（以下，「本規約」といいます。）は，木林文庫（以下，「運営」といいます。）がこのウェブサイト上で提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。</p>
          
          <h2 className="text-base font-bold text-gray-800 mt-6 border-b pb-1">第1条（適用）</h2>
          <p>本規約は，ユーザーと運営との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
          
          <h2 className="text-base font-bold text-gray-800 mt-6 border-b pb-1">第2条（禁止事項）</h2>
          <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>不正アクセスをし，またはこれを試みる行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>運営のサービスに関連して，反社会的勢力に対して直接または間接に利益を供与する行為</li>
            <li>その他，運営が不適切と判断する行為</li>
          </ul>

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