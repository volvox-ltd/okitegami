'use client';

import React from 'react';
import { Source, Layer, LayerProps } from 'react-map-gl';

type MemoryTracesLayerProps = {
  traces: any;
  mode: 'default' | 'text' | 'bleed'; // テスト用のモード切替
};

const TRACE_LAYER_STYLES = {
  // モード1: 記憶の重ね書き (Text Palimpsest)
  text: {
    id: 'trace-text',
    type: 'symbol',
    minzoom: 12,
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8, 18, 14],
      'text-rotate': ['get', 'rotation'], // データ取得時にランダム付与
      'text-padding': 2,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#8a776a',
      'text-opacity': [
        'interpolate', ['linear'], ['zoom'],
        12, 0.05,
        15, 0.15,
        18, 0.3
      ],
    }
  } as LayerProps,

  // モード2: 水彩の滲み (Watercolor Patina)
  bleed: {
    id: 'trace-bleed',
    type: 'heatmap',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(255, 255, 255, 0)',
        0.2, 'rgba(173, 216, 230, 0.1)', // 淡い水色
        0.5, 'rgba(255, 165, 0, 0.15)', // 滲んだオレンジ
        1, 'rgba(255, 140, 0, 0.25)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 40],
      'heatmap-opacity': 0.6
    }
  } as LayerProps,

  // 既存のスタイル (Default)
  defaultHeatmap: {
    id: 'trace-heatmap-default',
    type: 'heatmap',
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'is_thread'], 0, 1, 1, 3],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(224, 247, 250, 0)', 
        0.2, 'rgba(0, 188, 212, 0.15)',
        0.8, 'rgba(255, 171, 64, 0.3)',
        1, 'rgba(255, 215, 0, 0.5)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 1, 15, 0],
    }
  } as LayerProps,
  defaultCircles: {
    id: 'trace-circles-default',
    type: 'circle',
    minzoom: 14,
    paint: {
      'circle-color': ['case', ['!=', ['get', 'user_id'], null], '#FFAB40', '#E0F7FA'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 1.5, 18, 6],
      'circle-blur': 1.8,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['case', ['!=', ['get', 'user_id'], null], 0.6, 0.2]],
    }
  } as LayerProps
};

const MemoryTracesLayer: React.FC<MemoryTracesLayerProps> = ({ traces, mode }) => {
  return (
    <Source id="memory-traces" type="geojson" data={traces}>
      {mode === 'text' && <Layer {...TRACE_LAYER_STYLES.text} />}
      {mode === 'bleed' && <Layer {...TRACE_LAYER_STYLES.bleed} />}
      {mode === 'default' && (
        <>
          <Layer {...TRACE_LAYER_STYLES.defaultHeatmap} />
          <Layer {...TRACE_LAYER_STYLES.defaultCircles} />
        </>
      )}
    </Source>
  );
};

export default MemoryTracesLayer;