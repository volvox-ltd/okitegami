'use client';

import { useState } from 'react';

type MypageSettingsProps = {
  newEmail: string;
  setNewEmail: (email: string) => void;
  newPassword: string;
  setNewPassword: (pw: string) => void;
  settingsMessage: { type: 'success' | 'error', text: string } | null;
  isUpdating: boolean;
  userEmail: string | undefined;
  onUpdateEmail: () => void;
  onUpdatePassword: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

export default function MypageSettings({
  newEmail, setNewEmail, newPassword, setNewPassword,
  settingsMessage, isUpdating, userEmail,
  onUpdateEmail, onUpdatePassword, onLogout,
  onDeleteAccount
}: MypageSettingsProps) {
  
  // コンポーネント内のみで必要な「確認用」のステート
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEmailClick = () => {
    if (window.confirm(`メールアドレスを ${newEmail} に変更しますか？\n変更後、新しいアドレスに確認メールが送信されます。`)) {
      onUpdateEmail();
    }
  };

  const handlePasswordClick = () => {
    if (newPassword !== confirmPassword) {
      alert('新しいパスワードと確認用パスワードが一致しません。');
      return;
    }
    if (window.confirm('パスワードを更新しますか？')) {
      onUpdatePassword();
      setConfirmPassword(''); // 成功・失敗に関わらずリセット
    }
  };

    // --- 修正後 ---
    const handleDeleteClick = () => {
    onDeleteAccount(); // 親（page.tsx）で定義されたモーダルを開く関数を呼び出す
    };

  return (
    <div className="animate-fadeIn max-w-md mx-auto space-y-8 pt-4 pb-12 text-left">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-8">
        <h2 className="font-bold text-sm font-serif border-b pb-2 text-gray-800">アカウント設定</h2>
        
        {settingsMessage && (
          <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed ${
            settingsMessage.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-100' 
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {settingsMessage.type === 'success' ? '✓ ' : '⚠️ '}{settingsMessage.text}
          </div>
        )}

        <div className="space-y-10">
          {/* メールアドレスの変更 */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">現在のメールアドレス</label>
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-100 font-mono">
                {userEmail}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">新しいメールアドレス</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-address@example.com"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition-all shadow-sm"
                />
                <p className="text-[10px] text-gray-400 leading-relaxed px-1">
                  ※ 更新ボタンを押すと確認メールが送信されます。メール内のリンクをクリックするまで変更は完了しません。
                </p>
                <button 
                  onClick={handleEmailClick}
                  disabled={isUpdating || !newEmail || newEmail === userEmail}
                  className="w-full bg-gray-800 text-white py-3 rounded-full text-xs font-bold disabled:bg-gray-200 shadow-md hover:bg-gray-700 transition-all active:scale-95"
                >
                  {isUpdating ? '処理中...' : 'メールアドレスを変更する'}
                </button>
              </div>
            </div>
          </section>

          <hr className="border-gray-50" />

          {/* パスワードの変更 */}
          <section className="space-y-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">パスワードの変更</label>
            <div className="flex flex-col gap-3">
              <input 
                type="password" 
                placeholder="新しいパスワード（6文字以上）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition-all shadow-sm"
              />
              <input 
                type="password" 
                placeholder="新しいパスワード（確認のため再入力）"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700 transition-all shadow-sm"
              />
              <button 
                onClick={handlePasswordClick}
                disabled={isUpdating || !newPassword || newPassword.length < 6}
                className="w-full bg-green-700 text-white py-3 rounded-full text-xs font-bold disabled:bg-gray-200 shadow-md hover:bg-green-800 transition-all active:scale-95"
              >
                {isUpdating ? '処理中...' : 'パスワードを更新する'}
              </button>
            </div>
          </section>
        </div>

        {/* ★ 退会セクションの追加 */}
        <div className="pt-6 border-t border-gray-100">
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest px-1">退会手続き</h3>
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
              <p className="text-[10px] text-red-700 leading-relaxed font-bold">
                アカウントを削除すると、すべてのデータが完全に失われます。
              </p>
              <button 
                onClick={handleDeleteClick}
                disabled={isUpdating}
                className="w-full bg-white text-red-600 border border-red-200 py-2.5 rounded-full text-[10px] font-bold shadow-sm hover:bg-red-50 transition-all active:scale-95"
              >
                アカウントを完全に削除する
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="text-center pt-4">
         <button onClick={onLogout} className="text-xs text-red-400 underline hover:text-red-600 font-sans tracking-widest opacity-70 hover:opacity-100 transition-opacity">ログアウト</button>
      </div>
    </div>
  );
}