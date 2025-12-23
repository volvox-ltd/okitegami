import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 戻り先がない場合はトップページ（/）へ
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // 認証コードをセッション（Cookie）に交換
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 成功したら next パラメータの場所（/admin や /mypage）へリダイレクト
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 失敗した場合はログイン画面へ（エラー情報を付与）
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}