/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 👈 Cette ligne magique autorise TOUS les sites (Unsplash, Supabase, Google, etc.)
      },
    ],
  },
};

export default nextConfig;