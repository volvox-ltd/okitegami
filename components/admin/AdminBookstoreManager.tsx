'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ICON_OPTIONS = [
  '/bookstore/bookstore__001.svg',
  '/bookstore/bookstore__002.svg',
  '/bookstore/bookstore__003.svg',
  '/bookstore/bookstore__004.svg',
  '/bookstore/bookstore__005.svg',
];

type Bookstore = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  image_url: string;
  icon_path: string;
};

type AdminBookstoreManagerProps = {
  bookstores: Bookstore[];
  onUpdate: () => void;
};

export default function AdminBookstoreManager({ bookstores, onUpdate }: AdminBookstoreManagerProps) {
  const [editingStore, setEditingStore] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (editingStore && mapContainer.current) {
      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [editingStore.lng || 139.257, editingStore.lat || 36.054],
          zoom: 15
        });

        const marker = new mapboxgl.Marker({ draggable: true, color: '#be123c' })
          .setLngLat([editingStore.lng || 139.257, editingStore.lat || 36.054])
          .addTo(mapRef.current);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setEditingStore((prev: any) => ({ ...prev, lat: lngLat.lat, lng: lngLat.lng }));
        });

        mapRef.current.on('click', (e) => {
          marker.setLngLat(e.lngLat);
          setEditingStore((prev: any) => ({ ...prev, lat: e.lngLat.lat, lng: e.lngLat.lng }));
        });

        markerRef.current = marker;
      }
    }
    return () => {
      if (!editingStore && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [editingStore]);

  const handleSave = async () => {
    if (!editingStore.name) return alert('店名を入力してください');
    setLoading(true);

    const storeData = {
      name: editingStore.name,
      description: editingStore.description,
      address: editingStore.address,
      lat: editingStore.lat,
      lng: editingStore.lng,
      image_url: editingStore.image_url, // ★修正: カンマを追加
      icon_path: editingStore.icon_path || ICON_OPTIONS[0]
    };

    let error;
    if (editingStore.id) {
      const { error: err } = await supabase.from('bookstores').update(storeData).eq('id', editingStore.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('bookstores').insert([storeData]);
      error = err;
    }

    if (!error) {
      alert('本屋スポットを保存しました');
      setEditingStore(null);
      onUpdate();
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この本屋スポットを削除しますか？')) return;
    const { error } = await supabase.from('bookstores').delete().eq('id', id);
    if (!error) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
        <div>
          <h2 className="font-bold text-rose-900">📖 本屋スポット管理</h2>
          <p className="text-xs text-rose-700">取引のある本屋さんの拠点を地図上に配置します</p>
        </div>
        <button 
          onClick={() => setEditingStore({ 
            name: '', 
            description: '', 
            address: '', 
            lat: 36.054, 
            lng: 139.257, 
            image_url: '', 
            icon_path: ICON_OPTIONS[0] 
          })}
          className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-rose-700 transition-colors"
        >
          ＋ 新規本屋を登録
        </button>
      </div>

      {!editingStore && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">店名</th>
                <th className="p-4">住所</th>
                <th className="p-4">座標</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {bookstores.length > 0 ? bookstores.map((store) => (
                <tr key={store.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{store.name}</td>
                  <td className="p-4 text-gray-500">{store.address || '未設定'}</td>
                  <td className="p-4 text-xs font-mono text-gray-400">{store.lat.toFixed(4)}, {store.lng.toFixed(4)}</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setEditingStore(store)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-100">編集</button>
                      <button onClick={() => handleDelete(store.id)} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold text-xs border border-red-100">削除</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">登録された本屋はありません。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingStore && (
        <div className="bg-white p-6 rounded-xl border-2 border-rose-200 shadow-xl animate-fadeIn">
          <h3 className="font-bold text-gray-800 mb-4">{editingStore.id ? '📍 本屋情報の編集' : '✨ 新規本屋の登録'}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div ref={mapContainer} className="w-full h-[350px] rounded-lg border-2 border-rose-100 shadow-inner" />
              <p className="text-[10px] text-rose-500 font-bold">※ 地図をクリックするか、ピンをドラッグして場所を指定してください</p>
              
              <div className="pt-4">
                <label className="block text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider">マップアイコンを選択</label>
                <div className="flex flex-wrap gap-3">
                  {ICON_OPTIONS.map((path) => (
                    <label key={path} className={`relative cursor-pointer p-2 rounded-lg border-2 transition-all ${editingStore.icon_path === path ? 'border-rose-500 bg-rose-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                      <input 
                        type="radio" 
                        name="icon_path" 
                        className="sr-only" 
                        value={path} 
                        checked={editingStore.icon_path === path}
                        onChange={(e) => setEditingStore({...editingStore, icon_path: e.target.value})} 
                      />
                      <div className="w-10 h-10 relative">
                        <img src={path} alt="icon preview" className="w-full h-full object-contain" />
                      </div>
                      {editingStore.icon_path === path && (
                        <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">本屋の名前</label>
                <input type="text" value={editingStore.name} onChange={e => setEditingStore({...editingStore, name: e.target.value})} className="w-full p-2 rounded border border-gray-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="例: 木林書店" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">住所 / 場所の簡単な説明</label>
                <input type="text" value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="w-full p-2 rounded border border-gray-200 text-sm" placeholder="例: 埼玉県小川町大字..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">紹介文</label>
                <textarea value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="w-full p-2 rounded border border-gray-200 text-sm h-24" placeholder="お店の雰囲気や特徴を記入してください"></textarea>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">外観画像のURL (任意)</label>
                <input type="text" value={editingStore.image_url} onChange={e => setEditingStore({...editingStore, image_url: e.target.value})} className="w-full p-2 rounded border border-gray-200 text-sm" placeholder="https://..." />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button onClick={handleSave} disabled={loading} className="flex-1 bg-rose-600 text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-rose-700 transition-colors disabled:bg-gray-300">
                  {loading ? '保存中...' : '情報を保存する'}
                </button>
                <button onClick={() => setEditingStore(null)} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}