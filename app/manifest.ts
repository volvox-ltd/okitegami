import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'おきてがみ',
    short_name: 'おきてがみ',
    description: '地図に手紙を置くアプリ',
    start_url: '/',
    display: 'standalone', // これでブラウザのバーが消えます
    background_color: '#fdfcf5',
    theme_color: '#fdfcf5',
    icons: [
      {
        src: '/icon', // Next.jsが自動生成するアイコンを参照
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}