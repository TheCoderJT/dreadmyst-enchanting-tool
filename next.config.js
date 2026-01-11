/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Uncomment and set basePath if deploying to a subdirectory (e.g., /dreadmyst-enchanting-tool)
  // basePath: '/dreadmyst-enchanting-tool',
}

module.exports = nextConfig
