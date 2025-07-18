import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
    NEXT_PUBLIC_WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
    NEXT_PUBLIC_WHATSAPP_SENDER_MOBILE: process.env.WHATSAPP_SENDER_MOBILE,
  }
};

export default nextConfig;
