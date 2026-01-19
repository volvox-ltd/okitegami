'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import IconBookstore from './IconBookstore';

type Recommendation = {
  id: string;
  title: string;
  author: string;
  comment: string;
  sort_order: number;
};

type Props = {
  bookstore: any;
  onClose: () => void;
  currentUser: User | null;
};

export default function BookstoreModal({ bookstore, onClose, currentUser }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('bookstore_recommendations')
        .select('*')
        .eq('bookstore_id', bookstore.id)
        .order('sort_order', { ascending: true });
      if (data) setRecommendations(data);
      setIsLoading(false);
    };
    fetchRecs();
  }, [bookstore.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景のぼかし */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md h-[85vh] md:h-[600px] bg-[#fdfcf5] rounded-xl shadow-2xl flex flex-col overflow-hidden border-4 border-[#2d4139] font-sans">
        
        {/* ヘッダー部分（緑色） */}
        <div className="bg-[#2d4139] text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
              <span className="text-xl">📖</span>
            </div>
            <div className="text-left">
              <h2 className="font-bold font-serif text-lg tracking-widest">{bookstore.name}</h2>
              <p className="text-[10px] opacity-80">
                おすすめの本が {recommendations.length} 冊あります
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>

        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200 shrink-0 bg-white">
          <button className="flex-1 py-3 text-sm font-bold text-[#2d4139] border-b-2 border-[#2d4139]">
            {bookstore.name}さんの手紙を見る
          </button>
          <button 
            disabled 
            className="flex-1 py-3 text-sm font-bold text-gray-300 bg-gray-50 cursor-not-allowed"
          >
            栞にメモする
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#fdfcf5] custom-scrollbar">
          <div className="space-y-6">
            {/* 店舗からの紹介（手紙風） */}
            <div className="bg-white p-4 rounded border border-green-100 shadow-sm relative font-serif text-left">
              <div className="absolute -top-3 left-4 bg-green-50 text-[#2d4139] text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                {bookstore.name}さんの手紙
              </div>
              {bookstore.image_url && (
                <div className="mt-2 mb-4 flex justify-center">
                  <Image 
                    src={bookstore.image_url} 
                    alt="store" 
                    width={400} 
                    height={300} 
                    className="rounded shadow-sm border-4 border-white object-cover" 
                  />
                </div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-loose mt-2 italic">
                {bookstore.description}
              </p>
            </div>

            {/* おすすめ本リスト */}
            <div className="border-t border-dashed border-gray-300 pt-4 text-left">
              <h3 className="text-xs font-bold text-gray-500 mb-4 text-center font-sans tracking-widest uppercase">
                店主がお薦めする本
              </h3>
              
              {isLoading ? (
                <p className="text-center text-[10px] text-gray-400 py-8 animate-pulse">本を並べています...</p>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((book) => (
                    <div key={book.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex gap-4 animate-fadeIn">
                      <div className="w-16 h-24 bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center text-[10px] text-gray-300 font-serif shadow-inner">
                        Cover
                      </div>
                      <div className="flex flex-col justify-start">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 rounded">#{book.sort_order}</span>
                          <span className="text-xs font-bold text-gray-800">{book.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">{book.author}</p>
                        <p className="text-xs font-serif text-gray-600 leading-relaxed bg-gray-50 p-2 rounded relative">
                           {book.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター（住所など） */}
        <div className="p-3 bg-white border-t border-gray-100 text-[10px] text-gray-400 text-center font-sans">
          📍 {bookstore.address}
        </div>
      </div>
    </div>
  );
}