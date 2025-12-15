// 画像を圧縮する便利関数
export const compressImage = async (file: File): Promise<File> => {
  // 設定：最大幅 1200px, 画質 70% (JPEG)
  const MAX_WIDTH = 1200;
  const QUALITY = 0.7;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      let width = image.width;
      let height = image.height;

      // 指定サイズより大きければ縮小比率を計算
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context error'));
        return;
      }

      // キャンバスに描画（ここでリサイズされる）
      ctx.drawImage(image, 0, 0, width, height);

      // JPEGとして書き出し（ここで圧縮される）
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image compression failed'));
          return;
        }
        // 元のファイル名を引き継いで新しいFileオブジェクトを作る
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