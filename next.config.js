/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/dreadmyst-enchanting-tool',
  assetPrefix: '/dreadmyst-enchanting-tool/',
}

module.exports = nextConfig
