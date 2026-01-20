/** @type {import('next').NextConfig} */

// Detect deployment platform
// GitHub Pages: GITHUB_PAGES=true (set in GitHub Actions)
// Vercel: VERCEL=1 (auto-set by Vercel)
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const isVercel = process.env.VERCEL === '1';

const nextConfig = {
  // Only use static export for GitHub Pages (Vercel handles SSR natively)
  ...(isGitHubPages && { output: 'export' }),
  images: {
    unoptimized: true,
  },
  // basePath for GitHub Pages
  ...(isGitHubPages && { 
    basePath: '/dreadmyst-enchanting-tool',
    assetPrefix: '/dreadmyst-enchanting-tool/',
  }),
  // For Vercel rewrite: use assetPrefix to load assets from the tool's domain
  ...(isVercel && {
    assetPrefix: 'https://dreadmyst-enchanting-tool.vercel.app',
  }),
}

module.exports = nextConfig
