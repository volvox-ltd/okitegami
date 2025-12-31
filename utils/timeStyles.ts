/**
 * 時刻に応じたMapboxのスタイルURLを返します
 * 5:00 - 8:00   早朝: 爽やかで明るい (light)
 * 8:00 - 16:00  日中: 標準 (streets)
 * 16:00 - 19:00 夕方: ノスタルジック (outdoors)
 * 19:00 - 5:00  夜間: 静寂な夜 (navigation-night ※視認性重視)
 */
export const getMapStyleByTime = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 8) {
    return "mapbox://styles/mapbox/light-v11";
  } else if (hour >= 8 && hour < 16) {
    return "mapbox://styles/mapbox/streets-v12";
  } else if (hour >= 16 && hour < 19) {
    return "mapbox://styles/mapbox/outdoors-v12";
  } else {
    // 19:00 - 4:59
    return "mapbox://styles/mapbox/navigation-night-v1";
  }
};

/**
 * 現在が「夜間」かどうかを判定します（UIのコントラスト調整用フラグ）
 */
export const checkIsNight = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 5;
};