'use client';
import { useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import FooterLinks from '@/components/FooterLinks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ★修正：URLから戻り先を取得（なければトップへ）
  const nextUrl = searchParams.get('next') || '/';

  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [emailOrNickname, setEmailOrNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isValidNickname = (name: string) => {
    return /^[a-zA-Z0-9]{1,20}$/.test(name);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let loginEmail = emailOrNickname;

      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('nickname', loginEmail)
          .single();
        
        if (error || !data) {
          throw new Error('そのニックネームは見つかりませんでした');
        }
        loginEmail = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;
      
      // ★修正：指定されたページへ戻る
      router.push(nextUrl);
      router.refresh();

    } catch (error: any) {
      setMessage(error.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!isValidNickname(nickname)) {
      setMessage('ニックネームは半角英数字20文字以内で入力してください');
      setLoading(false);
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname)
        .maybeSingle();

      if (existingUser) {
        throw new Error('そのニックネームは既に使用されています');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}`, // ★修正：OAuth戻り先にもnextを渡す
        },
      });

      if (error) throw error;

      // ★ここを修正：Confirm Email がオフなら、即座にログイン成功として扱う
      if (data.user && data.session) {
        setMessage('登録が完了しました！移動します...');
        router.push(nextUrl);
        router.refresh();
      } else {
        // 万が一セッションがない場合（基本はないはず）
        setMessage('登録ありがとうございます。ログインしてください。');
        setIsLoginMode(true);
      }

    } catch (error: any) {
      setMessage(error.message || '登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ★修正：Googleログイン後も元のページに戻れるようパラメータを付与
        redirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ea] font-sans text-gray-800 relative">
      
      <Link 
        href={nextUrl === '/' ? '/' : nextUrl} // ★修正：キャンセル時も元の場所に戻る
        className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-black transition-colors shadow-sm border border-gray-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 flex flex-col items-center">
          <Link href="/">
            <Logo className="w-16 h-16 text-bunko-ink mb-2 hover:opacity-80 transition-opacity" />
          </Link>
          <h1 className="text-m font-serif tracking-widest text-bunko-ink">おきてがみ</h1>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          
          <div className="flex mb-6 bg-gray-100 p-1 rounded-full">
            <button
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${isLoginMode ? 'bg-white shadow text-green-800' : 'text-gray-500'}`}
              onClick={() => { setIsLoginMode(true); setMessage(null); }}
            >
              ログイン
            </button>
            <button
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${!isLoginMode ? 'bg-white shadow text-green-800' : 'text-gray-500'}`}
              onClick={() => { setIsLoginMode(false); setMessage(null); }}
            >
              新規登録
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${message.includes('送信しました') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          {isLoginMode ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">メールアドレス または ニックネーム</label>
                <input
                  type="text"
                  required
                  value={emailOrNickname}
                  onChange={(e) => setEmailOrNickname(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="user1234"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-500">パスワード</label>
                  <Link href="/forgot-password" className="text-xs text-green-600 hover:underline">
                    忘れた場合
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-700/30 hover:bg-green-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:shadow-none"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
               <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ニックネーム (半角英数20文字以内)</label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9]{1,20}$"
                  title="半角英数字20文字以内で入力してください"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="okitegami01"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">パスワード</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  placeholder="6文字以上"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-700/30 hover:bg-green-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:shadow-none"
              >
                {loading ? '登録処理中...' : 'メールアドレスで登録'}
              </button>
            </form>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">または</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            <span className="text-sm font-bold text-gray-600">Googleで{isLoginMode ? 'ログイン' : '登録'}</span>
          </button>

        </div>
      </div>

      <FooterLinks />

    </div>
  );
}

// ★修正：ビルドエラーを防ぐため、useSearchParamsを使うコンポーネントをSuspenseで包む
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f7f4ea]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}