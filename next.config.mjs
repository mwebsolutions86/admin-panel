/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // 👇 C'est l'adresse de ton projet Supabase (celle qui est dans l'erreur)
        hostname: 'kdoodpxjgczqajykcqcd.supabase.co', 
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // On ajoute aussi unsplash pour les images de démo qu'on a mises dans le script SQL
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
};

export default nextConfig;