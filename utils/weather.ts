/**
 * 天候に応じた劣化倍率
 */
export const WEATHER_AGING_FACTOR = {
  clear: 1,
  rain: 3,
};

export const calculateEffectiveHours = (createdAt: string, isRainy: boolean): number => {
  const diffMs = new Date().getTime() - new Date(createdAt).getTime();
  const actualHours = diffMs / 3600000;
  return isRainy ? actualHours * WEATHER_AGING_FACTOR.rain : actualHours;
};

/**
 * Open-Meteo APIを使用して、日本の気象庁データに基づいた天気を取得
 * APIキー不要で利用可能です。
 */
export const fetchIsRainy = async (lat: number, lng: number): Promise<boolean> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    
    // WMO Weather interpretation codes (WW)
    // 51, 53, 55: 霧雨
    // 61, 63, 65: 雨
    // 80, 81, 82: 俄か雨
    // 95, 96, 99: 雷雨
    const code = data.current.weather_code;
    const rainyCodes = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    
    return rainyCodes.includes(code);
  } catch (e) {
    console.error("Weather API Error:", e);
    return false;
  }
};