/** @type {import('next').NextConfig} */
const nextConfig = {
  // Quick tunnels (trycloudflare.com) hit /_next from a different origin than
  // localhost; without this, Next 15 can block or mis-serve CSS/HMR assets.
  allowedDevOrigins: ['*.trycloudflare.com'],
  async rewrites() {
    // Em Netlify/prod: defina API_INTERNAL_URL (ou use NEXT_PUBLIC_API_URL direto no client).
    const api =
      process.env.API_INTERNAL_URL ||
      process.env.API_URL ||
      'http://127.0.0.1:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${api.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
