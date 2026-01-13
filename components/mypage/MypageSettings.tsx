'use client';

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
};

export default function MypageSettings({
  newEmail, setNewEmail, newPassword, setNewPassword,
  settingsMessage, isUpdating, userEmail,
  onUpdateEmail, onUpdatePassword, onLogout
}: MypageSettingsProps) {
  return (
    <div className="animate-fadeIn max-w-md mx-auto space-y-8 pt-4">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="font-bold text-sm font-serif border-b pb-2">アカウント設定</h2>
        
        {settingsMessage && (
          <div className={`p-3 rounded-lg text-[10px] font-bold ${settingsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {settingsMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1">メールアドレスの変更</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-700"
              />
              <button 
                onClick={onUpdateEmail}
                disabled={isUpdating || newEmail === userEmail}
                className="bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold disabled:bg-gray-200 transition-colors"
              >
                更新
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1">パスワードの変更</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-700"
              />
              <button 
                onClick={onUpdatePassword}
                disabled={isUpdating || !newPassword}
                className="bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold disabled:bg-gray-200 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
         <button onClick={onLogout} className="text-xs text-red-400 underline hover:text-red-600 font-sans">ログアウト</button>
      </div>
    </div>
  );
}