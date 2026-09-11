/** @type {import('next').NextConfig} */
const nextConfig = {
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
