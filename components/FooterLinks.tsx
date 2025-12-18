import Link from 'next/link';

export default function FooterLinks() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-xs font-serif text-gray-400 tracking-widest border-t border-gray-200 w-full mt-16 bg-inherit">
      <Link href="/" className="hover:text-bunko-ink transition-colors">
        TOP
      </Link>
      <Link href="/terms" className="hover:text-bunko-ink transition-colors">
        利用規約
      </Link>
      <Link href="/privacy" className="hover:text-bunko-ink transition-colors">
        プライバシーポリシー
      </Link>
      <Link href="/contact" className="hover:text-bunko-ink transition-colors">
        お問い合わせ
      </Link>
      <p className="mt-4 text-[10px] text-gray-300">© 2025 Kirin Bunko</p>
    </div>
  );
}