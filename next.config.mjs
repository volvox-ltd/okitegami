/** @type {import('next').NextConfig} */
const nextConfig = {
  // 地図アプリを強制的に読み込む設定
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  // Turbopack対策：React厳格モードを一旦オフにする手もありますが、まずはオンで
  reactStrictMode: true,
};

export default nextConfig;
