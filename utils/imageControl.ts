// --- 既存の画像を圧縮する便利関数 (維持) ---
export const compressImage = async (file: File): Promise<File> => {
  const MAX_WIDTH = 1200;
  const QUALITY = 0.7;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
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
        if (!blob) return reject(new Error('Image compression failed'));
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/jpeg', QUALITY);
    };
    image.onerror = (error) => reject(error);
  });
};

// --- 既存の切手（スタンプ）専用圧縮 (維持) ---
export const compressStamp = async (file: File): Promise<File> => {
  const MAX_WIDTH = 400;
  const QUALITY = 0.6;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
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
    image.onerror = (error) => reject(error);
  });
};

// --- ★新規追加：絵葉書専用のレトロ加工＆刻印＆WebP変換 ---
export const processPostcardImage = async (file: File, spotName: string): Promise<File> => {
  const MAX_WIDTH = 1200;
  const QUALITY = 0.8;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
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
      ctx.fillStyle = 'rgba(112, 66, 20, 0.2)'; // ほんのり茶色
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

      // 4. 刻印（日付・場所名）
      const now = new Date();
      const timestamp = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const stampText = `${timestamp}  |  ${spotName || 'Somewhere'}`;
      
      const fontSize = Math.max(14, width / 45);
      ctx.font = `bold ${fontSize}px serif`;
      ctx.textAlign = 'right';
      
      // 文字の影（エンボス効果風）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(stampText, width - 20 + 1, height - 20 + 1);
      // 文字本体
      ctx.fillStyle = 'rgba(255, 255, 250, 0.8)';
      ctx.fillText(stampText, width - 20, height - 20);

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
    image.onerror = (error) => reject(error);
  });
};