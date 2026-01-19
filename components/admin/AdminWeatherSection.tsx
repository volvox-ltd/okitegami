'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminWeatherSection() {
  const [forceRain, setForceRain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchWeatherSetting = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'force_rain')
          .maybeSingle();
        
        setForceRain(data?.value === 'true');
      } catch (error) {
        console.error('天気設定の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeatherSetting();
  }, []);

  const toggleWeather = async () => {
    setUpdating(true);
    const newValue = !forceRain;
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'force_rain', 
          value: newValue.toString(),
          updated_at: new Date().toISOString()
        });

      if (!error) {
        setForceRain(newValue);
      } else {
        throw error;
      }
    } catch (error) {
      alert('設定の保存に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl shadow border border-gray-200 flex justify-center items-center gap-2 text-gray-400">
        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow border border-gray-200 animate-fadeIn max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className={`text-2xl p-2 rounded-lg ${forceRain ? 'bg-blue-100' : 'bg-orange-100'}`}>
          {forceRain ? '🌧️' : '☀️'}
        </div>
        <h2 className="font-bold text-lg text-gray-800">天候システムの管理</h2>
      </div>

      <div className="space-y-6 text-left">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-0.5">💡</span>
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-bold mb-1 text-gray-700">強制雨モードの効果:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>全てのユーザーの地図が「雨の日の演出」に切り替わります。</li>
                <li>手紙の劣化速度が **3倍**（雨天時倍率）に加速します。</li>
                <li>実際の天候APIよりも、この設定が優先されます。</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div>
            <span className="block font-bold text-gray-700">強制雨モード</span>
            <span className={`text-xs font-bold ${forceRain ? 'text-blue-600' : 'text-gray-400'}`}>
              {forceRain ? '現在：全エリアが強制的に「雨」' : '現在：自動取得（晴れベース）'}
            </span>
          </div>

          <button 
            onClick={toggleWeather}
            disabled={updating}
            className={`w-14 h-8 rounded-full relative transition-all duration-300 ${
              forceRain ? 'bg-blue-600' : 'bg-gray-300'
            } ${updating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 flex items-center justify-center ${
              forceRain ? 'left-7' : 'left-1'
            }`}>
              {updating && (
                <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[10px] text-gray-400">
          ※ この設定は `system_settings` テーブルの `force_rain` キーに保存されます。
        </p>
      </div>
    </div>
  );
}