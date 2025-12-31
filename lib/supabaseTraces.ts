import { supabase } from '@/utils/supabase'; // '@/utils/supabase' に修正
import { FeatureCollection } from 'geojson';

export const fetchMemoryTraces = async (): Promise<FeatureCollection> => {
  const { data, error } = await supabase.from('letters').select('lat, lng');
  if (error) throw error;

  return {
    type: 'FeatureCollection',
    features: (data || []).map((l: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] },
      properties: {}
    }))
  } as FeatureCollection;
};