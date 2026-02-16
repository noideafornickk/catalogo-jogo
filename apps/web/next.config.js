/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@gamebox/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.rawg.io",
        pathname: "/media/**"
      }
    ]
  }
};

module.exports = nextConfig;
