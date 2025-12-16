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
        // layout.tsxで定義した変数(--font-gothic)を、Tailwindの'font-sans'として使う
        sans: ['var(--font-gothic)', 'sans-serif'],
        // layout.tsxで定義した変数(--font-mincho)を、Tailwindの'font-serif'として使う
        serif: ['var(--font-mincho)', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;