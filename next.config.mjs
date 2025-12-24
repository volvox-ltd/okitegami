/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 許可するドメインをリストアップします
    domains: [
      'lh3.googleusercontent.com', 
      'fevsactrqsfxazatyzqu.supabase.co'
    ],
  },
};

export default nextConfig;