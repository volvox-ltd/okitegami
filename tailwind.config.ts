import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ここで CSS変数 を紐付けます
        bunko: {
          paper: 'var(--color-bunko-paper)',
          ink: 'var(--color-bunko-ink)',
          red: 'var(--color-bunko-red)',
          gray: 'var(--color-bunko-gray)',
          orange: 'var(--color-bunko-orange)',
        }
      },
      fontFamily: {
        // フォントも変数で管理（layout.tsxで定義したものを使います）
        serif: ['var(--font-shippori)', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;