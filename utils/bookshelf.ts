import { supabase } from './supabase';
import { getDistance } from 'geolib'; // 距離計算ライブラリを使用

/**
 * 本棚の集積ロジック
 * @param delta 増減させる値 (+1 または -1)
 */
export async function updateBookshelf(lat: number, lng: number, delta: number = 1) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,district&language=ja&country=jp`;

  try {
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    
    const cityFeature = geoData.features.find((f: any) => f.place_type.includes('place'));
    const districtFeature = geoData.features.find((f: any) => f.place_type.includes('district'));
    const targetFeature = districtFeature || cityFeature;

    if (!targetFeature) return null;

    const cityName = cityFeature?.text || '';
    const districtName = districtFeature?.text || '';
    const areaCenter = { lat: targetFeature.center[1], lng: targetFeature.center[0] };

    const { data: urbanSetting } = await supabase.from('area_settings').select('split_by_ward').eq('city_name', cityName).maybeSingle();

    let areaKey: string;
    let displayName: string; 

    if (urbanSetting?.split_by_ward && districtName) {
      areaKey = districtName;
      displayName = `${cityName} ${districtName}`;
    } else {
      areaKey = cityName || '街';
      displayName = cityName || '街';
    }

    const { data: shelf } = await supabase.from('bookshelves').select('*').eq('area_key', areaKey).maybeSingle();
    
    if (shelf) {
      // ★ 既存の数に delta (+1 または -1) を加算し、0未満にならないようガード
      const newCount = Math.max(0, shelf.thank_count + delta);
      await supabase.from('bookshelves').update({ thank_count: newCount }).eq('id', shelf.id);
      return areaKey;
    }

    // カウントを減らす操作（-1）の時に棚が存在しない場合は、新規作成せずにエリア名だけ返す
    if (delta <= 0) return areaKey;

    // --- ここから新規作成ロジック ---
    let finalLat = areaCenter.lat;
    let finalLng = areaCenter.lng;
    const searchArea = areaKey; // エラー回避のため変数を固定
    let landmarkName = `${searchArea}の中心地`;

    try {
      const osmSearchName = searchArea.match(/[市区町村]$/) ? searchArea : (cityName.includes(searchArea) ? cityName : searchArea);

      const osmQuery = `
        [out:json][timeout:15];
        area["name"="${osmSearchName}"]->.searchArea;
        (
          node["amenity"="library"](area.searchArea);
          way["amenity"="library"](area.searchArea);
          relation["amenity"="library"](area.searchArea);
        );
        out center;
      `;
      const osmUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(osmQuery)}`;
      const osmRes = await fetch(osmUrl);
      const osmData = await osmRes.json();

      if (osmData.elements && osmData.elements.length > 0) {
        const sorted = osmData.elements.sort((a: any, b: any) => {
          const nameA = a.tags?.name || "";
          const nameB = b.tags?.name || "";
          const posA = { latitude: a.lat || a.center.lat, longitude: a.lon || a.center.lon };
          const posB = { latitude: b.lat || b.center.lat, longitude: b.lon || b.center.lon };
          
          let scoreA = 0;
          let scoreB = 0;

          if (nameA.match(/[市区町村]立/)) scoreA -= 50;
          if (nameB.match(/[市区町村]立/)) scoreB -= 50;
          if (nameA.includes("中央") || nameA.includes("本館")) scoreA -= 100;
          if (nameB.includes("中央") || nameB.includes("本館")) scoreB -= 100;
          if (nameA.match(/分[館室]|コーナー|こども/)) scoreA += 100;
          if (nameB.match(/分[館室]|コーナー|こども/)) scoreB += 100;

          const distA = getDistance({ latitude: areaCenter.lat, longitude: areaCenter.lng }, posA) / 1000;
          const distB = getDistance({ latitude: areaCenter.lat, longitude: areaCenter.lng }, posB) / 1000;
          scoreA += distA;
          scoreB += distB;

          return scoreA - scoreB;
        });

        const bestLibrary = sorted[0];
        finalLat = bestLibrary.lat || bestLibrary.center.lat;
        finalLng = bestLibrary.lon || bestLibrary.center.lon;
        landmarkName = bestLibrary.tags?.name || `${searchArea}の主要図書館`;
      } else {
        const officeQuery = `[out:json];area["name"="${osmSearchName}"];(node["amenity"="townhall"](area);way["amenity"="townhall"](area););out center;`;
        const officeRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(officeQuery)}`);
        const officeData = await officeRes.json();
        if (officeData.elements?.[0]) {
          const off = officeData.elements[0];
          finalLat = off.lat || off.center.lat;
          finalLng = off.lon || off.center.lon;
          landmarkName = off.tags?.name || `${searchArea}役所`;
        }
      }
    } catch (osmErr) {
      console.warn("OSM Search failed.");
    }

    await supabase.from('bookshelves').insert({
      area_key: areaKey,
      display_name: displayName,
      lat: finalLat,
      lng: finalLng,
      landmark_name: landmarkName,
      thank_count: 1 // 新規作成時は1通から開始
    });

    return areaKey;

  } catch (err) {
    console.error('Bookshelf update error:', err);
    return null;
  }
}