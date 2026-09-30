/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "vardit.co.il" },
      { protocol: "https", hostname: "www.vardit.co.il" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
    unoptimized: true,
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
