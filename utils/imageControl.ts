/**
 * 画像のリサイズ・圧縮・WebP変換を行うユーティリティ
 * 全てのロジックを保持した完成版です。
 */

// --- 1. 汎用的な画像を圧縮する関数 (WebP変換版) ---
export const compressImage = async (file: File): Promise<File> => {
  const MAX_WIDTH = 1200; // スマホ閲覧に最適なサイズ
  const QUALITY = 0.7;    // 画質と軽さのバランスが良い数値

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;

    image.onload = () => {
      URL.revokeObjectURL(objectUrl); // メモリ解放
      const canvas = document.createElement('canvas');
      let width = image.width;
      let height = image.height;

      // アスペクト比を維持してリサイズ
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context error'));

      ctx.drawImage(image, 0, 0, width, height);

      // WebP形式で書き出し
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Image compression failed'));
        
        // 拡張子を.webpに変換した新しいファイルオブジェクトを作成
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        const compressedFile = new File([blob], newFileName, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/webp', QUALITY);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
  });
};

// --- 2. 切手（スタンプ）専用圧縮 (維持) ---
export const compressStamp = async (file: File): Promise<File> => {
  const MAX_WIDTH = 400; // 切手は小さく保持
  const QUALITY = 0.6;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = image.width;
      let height = image.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context error'));

      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/webp', QUALITY);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
  });
};

// --- 3. 絵葉書専用のレトロ加工＆WebP変換 (刻印なし版・維持) ---
export const processPostcardImage = async (file: File, spotName: string): Promise<File> => {
  const MAX_WIDTH = 1200;
  const QUALITY = 0.8; // ハガキは少し高画質に維持

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = image.width;
      let height = image.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context error'));

      // 1. 基本の描画
      ctx.drawImage(image, 0, 0, width, height);

      // 2. レトロ加工（セピアオーバーレイ）
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(112, 66, 20, 0.15)'; 
      ctx.fillRect(0, 0, width, height);

      // 3. ざらっとしたノイズ加工
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const opacity = Math.random() * 0.05;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalCompositeOperation = 'source-over';

      // 5. WebPとして書き出し
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Postcard processing failed'));
        const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(processedFile);
      }, 'image/webp', QUALITY);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
  });
};