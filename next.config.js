/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? '/dreadmyst-enchanting-tool' : '',
  assetPrefix: isProd ? '/dreadmyst-enchanting-tool/' : '',
}

module.exports = nextConfig
