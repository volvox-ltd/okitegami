'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import DeleteAccountModal from '@/components/DeleteAccountModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FooterLinks() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, []);

  return (
    <>
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
        
        {/* ログインしている時だけ表示される、目立たない退会リンク */}
        {isLoggedIn && (
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="mt-4 text-[10px] text-gray-300 hover:text-red-400 transition-colors border-b border-transparent hover:border-red-200"
          >
            アカウント削除（退会）
          </button>
        )}

        <p className="mt-4 text-[10px] text-gray-300">© 2025 Kirin Bunko</p>
      </div>

      {/* 退会モーダル */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </>
  );
}