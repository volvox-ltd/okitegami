'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function AcornBalance({ userId }: { userId: string }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data } = await supabase.from('profiles').select('acorn_count').eq('id', userId).single();
      setBalance(data?.acorn_count || 0);
    };
    fetchBalance();

    // リアルタイム更新の購読
    const channel = supabase
      .channel('acorn-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
      (payload) => {
        setBalance(payload.new.acorn_count);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shadow-sm">
      <span className="text-lg">🌰</span>
      <span className="text-sm font-bold text-amber-900 font-mono">{balance}</span>
      <span className="text-[9px] text-amber-700 font-serif ml-1">どんぐり</span>
    </div>
  );
}