'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type MapCustomButtonsProps = {
  onGeolocate: () => void;
  postUrl: string;
  currentUser: any;
  isMounted: boolean;
};

export default function MapCustomButtons({
  onGeolocate,
  postUrl,
  currentUser,
  isMounted
}: MapCustomButtonsProps) {
  const router = useRouter();

  // マウント前はハイドレーションエラー防止のため表示しない
  if (!isMounted) return null;

  return (
    <>
      {/* 1. 現在地に戻るボタン (Mapの上に重なるように配置) */}
      <div className="absolute bottom-[425px] right-[16px] z-10 landscape:bottom-[275px] transition-all duration-300">
        <div className="mapboxgl-ctrl mapboxgl-ctrl-group" style={{ margin: 0, background: '#fff', borderRadius: '4px', boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}>
          <button 
            className="flex items-center justify-center transition-colors hover:bg-gray-50" 
            style={{ width: '29px', height: '29px', border: 0, padding: 0, cursor: 'pointer', background: 'transparent', outline: 'none' }}
            type="button" 
            onClick={onGeolocate}
            title="Find my location"
          >
            <svg className="w-7 h-5" viewBox="0 0 427.17 709.4" xmlns="http://www.w3.org/2000/svg">
              <path fill="#2196f3" d="M427.17,213.59c0,175.06-213.59,397.25-213.59,397.25,0,0-213.59-222.19-213.59-397.25C0,95.62,95.62,0,213.59,0s213.59,95.62,213.59,213.59Z"/>
              <circle fill="#fff" cx="213.59" cy="213.59" r="102.43"/>
              <path fill="#2196f3" d="M358.72,635.71c0,40.7-64.98,73.69-145.13,73.69s-145.13-32.99-145.13-73.69c0-29.53,34.21-55,83.61-66.75,28.47,34.97,49.36,56.8,50.74,58.23l10.79,11.22,10.79-11.22c1.38-1.44,22.27-23.27,50.74-58.23,49.4,11.75,83.61,37.23,83.61,66.75Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. 右下：手紙を書くボタン ＆ 吹き出し */}
      <div className="fixed bottom-8 right-4 z-40 flex flex-col items-end gap-2 font-sans">
        <div 
          className="bg-white/90 p-2 rounded-lg shadow-sm text-[10px] text-gray-600 font-bold animate-bounce cursor-pointer relative" 
          onClick={() => router.push(postUrl)}
        >
           {currentUser ? '手紙を書く' : 'ログインして手紙を書く'}
           <div className="absolute right-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90"></div>
        </div>
        <Link href={postUrl}>
          <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white ${currentUser ? 'bg-green-700 text-white' : 'bg-gray-400 text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </Link>
      </div>
    </>
  );
}