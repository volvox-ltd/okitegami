import { supabase } from './supabase';
import { getDistance } from 'geolib';

export async function updateBookshelf(lat: number, lng: number, delta: number = 1) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  // place(市町村), locality(町丁), district(区・郡) を広めに取得
  const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,district,locality,region&language=ja&country=jp`;

  try {
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    
    // 1. 各階層の地名を抽出
    // Mapboxでは町名が place ではなく locality に入ることがあるため両方チェック
    const place = geoData.features.find((f: any) => f.place_type.includes('place'));
    const locality = geoData.features.find((f: any) => f.place_type.includes('locality'));
    const district = geoData.features.find((f: any) => f.place_type.includes('district'));

    // 2. 【最重要】市町村名（小川町など）を特定するロジック
    // 「郡」ではない、自治体としての名前を最優先で取得
    let municipality = '';
    
    // place か locality の中から「市・町・村」で終わるものを探す
    const findMunicipality = (f: any) => f?.text?.match(/[市町村]$/) && !f?.text?.endsWith('郡');
    
    if (findMunicipality(place)) {
      municipality = place.text;
    } else if (findMunicipality(locality)) {
      municipality = locality.text;
    } else if (place?.text && !place.text.endsWith('郡')) {
      municipality = place.text;
    }

    const subName = district?.text || ''; // 比企郡、または さいたま市大宮区

    // 3. 行政設定の確認（政令指定都市の区割り用）
    const { data: urbanSetting } = await supabase.from('area_settings').select('split_by_ward').eq('city_name', municipality).maybeSingle();

    // 4. areaKey の最終決定
    let areaKey: string;
    let displayName: string;

    if (urbanSetting?.split_by_ward && subName && !subName.endsWith('郡')) {
      // 23区や政令指定都市の「区」の場合
      areaKey = subName;
      displayName = `${municipality} ${subName}`;
    } else {
      // 通常の市町村（小川町など）の場合。「郡」は無視して municipality を優先
      areaKey = municipality || subName || '街';
      displayName = areaKey;
    }

    // 既存の本棚をチェック
    const { data: shelf } = await supabase.from('bookshelves').select('*').eq('area_key', areaKey).maybeSingle();
    
    if (shelf) {
      const newCount = Math.max(0, shelf.thank_count + delta);
      await supabase.from('bookshelves').update({ thank_count: newCount }).eq('id', shelf.id);
      return areaKey;
    }

    if (delta <= 0) return areaKey;

    // --- 図書館特定ロジック：成功している座標計算を維持 ---
    // 予備の座標を「その地域の中心地」に設定
    const targetFeature = place || locality || district;
    let finalLat = targetFeature?.center[1] || lat;
    let finalLng = targetFeature?.center[0] || lng;
    let landmarkName = `${areaKey}の中心地`;

    try {
      // タイムアウトを避け、正確な自治体の図書館を特定するためのクエリ
      const osmQuery = `[out:json][timeout:15];(node["amenity"="library"](around:5000,${lat},${lng});way["amenity"="library"](around:5000,${lat},${lng}););out center;`;
      const osmRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(osmQuery)}`);
      
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (osmData.elements && osmData.elements.length > 0) {
          const sorted = osmData.elements.sort((a: any, b: any) => {
            const nameA = a.tags?.name || ""; const nameB = b.tags?.name || "";
            const score = (name: string, p: any) => {
              let s = 0;
              if (name.includes(areaKey)) s -= 1000; 
              if (name.match(/中央|本館/)) s -= 500;
              s += getDistance({ latitude: lat, longitude: lng }, { latitude: p.lat || p.center.lat, longitude: p.lon || p.center.lon }) / 1000;
              return s;
            };
            return score(nameA, a) - score(nameB, b);
          });
          const best = sorted[0];
          finalLat = best.lat || best.center.lat;
          finalLng = best.lon || best.center.lon;
          landmarkName = best.tags?.name || `${areaKey}の主要図書館`;
        }
      }
    } catch (e) {
      console.warn("Library search timed out.");
    }

    // データベースに保存
    await supabase.from('bookshelves').insert({
      area_key: areaKey, display_name: displayName,
      lat: finalLat, lng: finalLng, landmark_name: landmarkName, thank_count: 1
    });

    return areaKey;
  } catch (err) {
    console.error('Bookshelf update error:', err);
    return null;
  }
}