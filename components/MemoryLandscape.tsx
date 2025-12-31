import React, { useMemo } from 'react';
import Map, { Source, Layer, LayerProps } from 'react-map-gl';

const traceLayerStyles = {
  // 広域：街全体の「賑わいの気配」をヒートマップで雲のように見せる
  heatmap: {
    id: 'trace-heatmap',
    type: 'heatmap',
    maxzoom: 14,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'is_thread'], 0, 1, 1, 3],
      'heatmap-intensity': ['zoom', 0, 1, 14, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(224, 247, 250, 0)', 
        0.2, 'rgba(224, 247, 250, 0.2)', // 他人の淡い光
        0.8, 'rgba(255, 171, 64, 0.4)', // 自分の温かい光の集積
        1, 'rgba(255, 215, 0, 0.6)'
      ],
      'heatmap-radius': ['zoom', 0, 2, 14, 20],
      'heatmap-opacity': ['zoom', 13, 1, 14, 0],
    }
  } as LayerProps,

  // 詳細：自分の関わった場所が「灯火」として浮かび上がる
  circles: {
    id: 'trace-circles',
    type: 'circle',
    minzoom: 13,
    paint: {
      'circle-color': [
        'case',
        ['!=', ['get', 'user_id'], null], '#FFAB40', // 自分の跡（暖色）
        '#E0F7FA' // 他人の文脈跡（月明かり色）
      ],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2, 18, 10],
      'circle-blur': 1.2, // ぼかして「気配」にする
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        13, 0,
        14, ['case', ['!=', ['get', 'user_id'], null], 0.7, 0.3] // 自分の跡をより鮮明に
      ],
    }
  } as LayerProps,
};

// 夜間モード判定付きのマップコンポーネント
export const MemoryLandscape = ({ traceGeoJson }: { traceGeoJson: any }) => {
  const isNight = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }, []);

  return (
    <Map
      initialViewState={{ latitude: 35.626, longitude: 139.684, zoom: 14 }}
      style={{ width: '100%', height: '100vh' }}
      mapStyle={isNight ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
    >
      <Source id="memory-traces" type="geojson" data={traceGeoJson}>
        <Layer {...traceLayerStyles.heatmap} />
        <Layer {...traceLayerStyles.circles} />
      </Source>
    </Map>
  );
};