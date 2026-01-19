'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import AdminLetterCard from './AdminLetterCard';
import LetterModal from '@/components/LetterModal';
import PostcardModal from '@/components/PostcardModal';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Bookshelf = {
  id: string;
  area_key: string;
  display_name: string;
  lat: number;
  lng: number;
  thank_count: number;
};

type AdminBookshelfManagerProps = {
  bookshelves: Bookshelf[];
  onUpdate: () => void;
};

export default function AdminBookshelfManager({ bookshelves, onUpdate }: AdminBookshelfManagerProps) {
  const [editingShelf, setEditingShelf] = useState<any>(null);
  const [shelfLetters, setShelfLetters] = useState<any[]>([]);
  const [selectedShelfKey, setSelectedShelfKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<any>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (editingShelf && mapContainer.current) {
      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [editingShelf.lng, editingShelf.lat],
          zoom: 15
        });
        const marker = new mapboxgl.Marker({ draggable: true, color: '#ef4444' })
          .setLngLat([editingShelf.lng, editingShelf.lat])
          .addTo(mapRef.current);
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setEditingShelf((prev: any) => ({ ...prev, lat: lngLat.lat, lng: lngLat.lng }));
        });
        markerRef.current = marker;
      } else {
        mapRef.current.setCenter([editingShelf.lng, editingShelf.lat]);
        markerRef.current?.setLngLat([editingShelf.lng, editingShelf.lat]);
      }
    }
    return () => {
      if (!editingShelf && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [editingShelf]);

  // 地層（ハガキ）の取得
  const fetchShelfLetters = async (areaKey: string) => {
    setSelectedShelfKey(areaKey);
    setLoading(true);
    try {
      const { data: replies } = await supabase
        .from('letters').select('parent_id').eq('area_key', areaKey).eq('is_thanked', true);

      if (replies && replies.length > 0) {
        const parentIds = Array.from(new Set(replies.map(r => r.parent_id).filter(Boolean)));
        const { data: parents } = await supabase.from('letters').select('*').in('id', parentIds);
        
        if (parents) {
          const userIds = Array.from(new Set(parents.map(p => p.user_id).filter(Boolean)));
          const { data: profilesData } = await supabase.from('profiles').select('id, nickname').in('id', userIds);
          const nicknameMap = new Map(profilesData?.map(p => [p.id, p.nickname]) || []);
          const merged = parents.map(p => ({
            ...p,
            profiles: { nickname: nicknameMap.get(p.user_id) || '不明' }
          }));
          setShelfLetters(merged);
        }
      } else {
        setShelfLetters([]);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // カウントの同期
  const handleSyncCount = async (shelf: Bookshelf) => {
    if (!confirm(`${shelf.display_name}の「地層の厚さ」を、実際の枚数に同期させますか？`)) return;
    setIsSyncing(true);
    try {
      const { data: replies } = await supabase
        .from('letters').select('parent_id').eq('area_key', shelf.area_key).eq('is_thanked', true);
      const realCount = replies ? new Set(replies.map(r => r.parent_id)).size : 0;
      await supabase.from('bookshelves').update({ thank_count: realCount }).eq('id', shelf.id);
      onUpdate();
      alert('同期が完了しました');
    } catch (e) { alert('同期に失敗しました'); } finally { setIsSyncing(false); }
  };

  // 書架情報の更新
  const handleUpdateShelf = async () => {
    if (!editingShelf) return;
    const { error } = await supabase.from('bookshelves').update({
        display_name: editingShelf.display_name,
        lat: parseFloat(editingShelf.lat),
        lng: parseFloat(editingShelf.lng)
      }).eq('id', editingShelf.id);
    if (!error) { alert('更新しました'); setEditingShelf(null); onUpdate(); }
    else { alert('更新失敗: ' + error.message); }
  };

  // 地層の手紙を削除
  const handleDeleteShelfLetter = async (letter: any) => {
    if (!confirm('地層からこの手紙を削除しますか？')) return;
    try {
      if (letter.image_url) {
        const fileName = letter.image_url.split('/').pop();
        if (fileName) await supabase.storage.from('letter-images').remove([fileName]);
      }
      await supabase.from('letters').delete().eq('id', letter.id);
      if (selectedShelfKey) {
        const shelf = bookshelves.find(s => s.area_key === selectedShelfKey);
        if (shelf) {
          const newCount = Math.max(0, shelf.thank_count - 1);
          await supabase.from('bookshelves').update({ thank_count: newCount }).eq('id', shelf.id);
        }
        fetchShelfLetters(selectedShelfKey);
      }
      onUpdate();
    } catch (e: any) { alert('エラー: ' + e.message); }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b font-bold text-sm flex justify-between items-center text-gray-700">
          <span>📚 街の書架（本棚）一覧</span>
          <span className="text-[10px] text-gray-400 font-normal">※位置を微調整するには編集ボタンを押してください</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">エリアキー</th>
                <th className="p-4">表示名</th>
                <th className="p-4 text-center">地層の厚さ</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {bookshelves.map((shelf) => (
                <tr key={shelf.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-xs">{shelf.area_key}</td>
                  <td className="p-4 font-bold">{shelf.display_name}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">{shelf.thank_count} 通</span>
                      <button onClick={() => handleSyncCount(shelf)} disabled={isSyncing} className="text-[9px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-100">同期</button>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setEditingShelf(shelf)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-100">編集</button>
                      <button onClick={() => fetchShelfLetters(shelf.area_key)} className="text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-100">地層を管理</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingShelf && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-inner">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">📍 {editingShelf.area_key} の場所を微調整</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div ref={mapContainer} className="w-full h-[300px] rounded-lg border-2 border-blue-200 shadow-sm" />
            <div className="space-y-4">
              <input type="text" value={editingShelf.display_name} onChange={e => setEditingShelf({...editingShelf, display_name: e.target.value})} className="w-full p-2 rounded border border-blue-200 text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.000001" value={editingShelf.lat} onChange={e => setEditingShelf({...editingShelf, lat: parseFloat(e.target.value)})} className="w-full p-2 rounded border border-blue-200 text-sm" />
                <input type="number" step="0.000001" value={editingShelf.lng} onChange={e => setEditingShelf({...editingShelf, lng: parseFloat(e.target.value)})} className="w-full p-2 rounded border border-blue-200 text-sm" />
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={handleUpdateShelf} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-xs">設定を保存</button>
                <button onClick={() => setEditingShelf(null)} className="bg-white text-gray-500 px-6 py-3 rounded-lg font-bold text-xs border border-gray-200">キャンセル</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedShelfKey && (
        <div className="bg-white rounded-xl shadow border border-orange-200 overflow-hidden animate-fadeIn">
          <div className="p-4 bg-orange-50 border-b font-bold text-sm flex justify-between items-center text-orange-800">
            <span>📖 「{selectedShelfKey}」に積もった記憶の地層 ({shelfLetters.length}枚)</span>
            <button onClick={() => setSelectedShelfKey(null)} className="text-orange-400 px-2 text-lg font-bold">✕</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-50/50">
            {loading ? (
              <div className="p-10 text-center text-gray-400 animate-pulse font-bold">地層を紐解いています...</div>
            ) : shelfLetters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shelfLetters.map((letter) => (
                  <div key={letter.id} onClick={() => setViewingLetter(letter)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                    <AdminLetterCard 
                      letter={letter} 
                      onDelete={(e: any) => { e.stopPropagation(); handleDeleteShelfLetter(letter); }} 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-10 text-center text-gray-400 italic">この街にはまだ感謝の記録がありません。</p>
            )}
          </div>
        </div>
      )}

      {viewingLetter && (
        viewingLetter.is_postcard ? (
          <PostcardModal letter={viewingLetter} currentUser={null} onClose={() => setViewingLetter(null)} />
        ) : (
          <LetterModal letter={viewingLetter} currentUser={null} onClose={() => setViewingLetter(null)} />
        )
      )}
    </div>
  );
}