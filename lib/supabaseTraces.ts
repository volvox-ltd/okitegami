import { supabase } from './supabaseClient'; // 既存のクライアント
import { FeatureCollection } from 'geojson';

export const fetchMemoryTraces = async (): Promise<FeatureCollection> => {
  // RLS（ポリシー）により、ログインユーザーに関係のある跡と、
  // 公共の「やり取りの跡」だけが自動的にフィルタリングされて取得されます
  const { data, error } = await supabase
    .from('memory_traces')
    .select('user_id, lat, lng, is_thread');

  if (error) {
    console.error('Error fetching traces:', error);
    return { type: 'FeatureCollection', features: [] };
  }

  // Mapbox用のGeoJSON形式に変換
  return {
    type: 'FeatureCollection',
    features: data.map((trace) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [trace.lng, trace.lat],
      },
      properties: {
        user_id: trace.user_id,
        is_thread: trace.is_thread,
      },
    })),
  };
};