import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

serve(async (req) => {
  try {
    // Webhookからのデータ受け取り
    const { record } = await req.json()
    const email = record.email
    const nickname = record.nickname || '旅人'

    // ロリポップのSMTP設定
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOSTNAME") || "smtp.lolipop.jp",
      port: 465,
      secure: true, // 465番ポートの場合は true
      auth: {
        user: Deno.env.get("SMTP_USERNAME") || "info@okitegami.online",
        pass: Deno.env.get("SMTP_PASSWORD") || "Arancebionde1235",
      },
    });

    await transporter.sendMail({
      from: `"おきてがみ" <${Deno.env.get("SMTP_USERNAME") || "info@okitegami.online"}>`,
      to: email,
      subject: "【おきてがみ】ご登録ありがとうございます",
      html: `
        <html>
          <body style="font-family: 'Hiragino Mincho ProN', 'MS PMincho', serif; color: #333; background-color: #f7f4ea; padding: 20px; line-height: 1.8;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24px; color: #1a4731; letter-spacing: 0.3em; margin: 0;">おきてがみ</h1>
              </div>

              <p style="font-size: 15px;">
                ${nickname} 様
              </p>

              <p style="font-size: 15px;">
                ご登録ありがとうございます。<br>
                今、あなたの街のどこかに、誰かの手紙が置いてあります。
              </p>

              <p style="font-size: 15px;">
                地図を広げて、その場所を訪れてみてください。<br>
                近づくことで、その手紙が開きます。
              </p>

              <p style="font-size: 15px;">
                そして好きな場所に、<br>
                まだ見ぬ誰かに手紙を残してみましょう。
              </p>

              <div style="margin: 40px 0; border-top: 1px solid #eee; padding-top: 20px;">
                <p style="font-size: 13px; color: #666; margin-bottom: 5px;">
                  おきてがみ運営一同
                </p>
                <p style="font-size: 13px; color: #666; margin-top: 0;">
                  <a href="https://okitegami.online" style="color: #1a4731; text-decoration: none;">https://okitegami.online</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ message: "Welcome email sent successfully" }), { status: 200 })
  } catch (error) {
    console.error("Email Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})