import { supabase } from './supabase';

/**
 * どんぐりを増やすロジック（重複付与のガード機能付き）
 * @param userId 
 * @param amount 増やす量
 * @param reason 'letter_written', 'reply_sent', 'thank_received', 'first_library_open' など
 * @param meta parent_id や area_key などの判定用データ
 */
export async function addAcorns(
  userId: string, 
  amount: number, 
  reason: string, 
  meta?: { parent_id?: string, area_key?: string }
) {
  try {
    // --- 【特殊条件判定1】図書館の初回訪問 ---
    if (reason === 'first_library_open' && meta?.area_key) {
      const { data } = await supabase
        .from('user_opened_libraries')
        .select('id')
        .eq('user_id', userId)
        .eq('area_key', meta.area_key)
        .maybeSingle();
      
      // すでに訪問済みの履歴があれば、どんぐりを与えずに終了
      if (data) return;

      // 未訪問なら履歴を作成して続行
      await supabase.from('user_opened_libraries').insert({ 
        user_id: userId, 
        area_key: meta.area_key 
      });
    }

    // --- 【特殊条件判定2】「ありがとう」によるどんぐり（1手紙につき1回制限） ---
    if (reason === 'thank_received' && meta?.parent_id) {
      const { count } = await supabase
        .from('acorn_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId) // 自分がその手紙ですでに貰っているか
        .eq('reason', 'thank_received')
        .eq('parent_id_check', meta.parent_id);
      
      // すでにこの手紙（親ID）でどんぐり付与済みなら終了
      if (count && count > 0) return;
    }

    // ★ 修正：直接Updateするのではなく、SQL関数（RPC）を呼び出す
    const { error: rpcError } = await supabase.rpc('increment_acorn_count', {
      target_user_id: userId,
      amount: amount
    });
    if (rpcError) throw rpcError;

    // --- 3. ログの保存（重複判定用の parent_id_check を含む） ---
    await supabase.from('acorn_logs').insert({
      user_id: userId,
      amount: amount,
      reason: reason,
      parent_id_check: meta?.parent_id || null // ★重要
    });

  } catch (err) {
    console.error('Acorn update error:', err);
  }
}