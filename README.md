# Dreadmyst Enchanting Calculator

A web-based tool for calculating enchant success rates and optimal orb strategies in Dreadmyst.

![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)

## Features

- **Success Rate Calculator** — Calculate exact success percentages for any item/orb combination
- **Expected Orbs to Max** — See how many orbs you'll need on average to reach max enchant
- **Strategy Comparison** — Compare Safe, Hybrid, and Aggressive enchanting paths
- **Full Enchant Path** — View step-by-step breakdown from current level to max
- **Risk Assessment** — Color-coded risk levels (Safe, Moderate, Risky, Dangerous)
- **Mobile Responsive** — Works on desktop, tablet, and mobile devices

## How It Works

The calculator uses the official enchanting formula:

```
Success Rate = (100 - EnchantLevel × 7) / ItemDivisor × OrbMultiplier
```

Expected orb calculations account for failure penalties (reset to +0) using a recursive cost model.

## Tech Stack

- **Next.js 14** — React framework with App Router
- **TypeScript** — Type-safe code
- **CSS Modules** — Scoped styling with mobile-first responsive design

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

This project is configured for GitHub Pages deployment. Push to `main` branch to trigger automatic deployment.

## Credits

- **Enchanting data by Sith** — [Dreadmyst Info Spreadsheet](https://docs.google.com/spreadsheets/d/1GxuInbx8yLYp4mnmaHgCMmRkSamrE_cBCYlzvg1pCqM/edit?usp=sharing)
  - Check the spreadsheet for more game info!
- Built for the Dreadmyst community

## About the Author

**Jordan** — Web Developer & Gamer

Jordan is a web developer and lifelong gamer based in Alberta, Canada. Through [IsItP2W.com](https://isitp2w.com), he combines his passion for gaming with technical expertise to help players make informed decisions about game monetization and pay-to-win mechanics. When he's not analyzing game economies, he's building web applications and exploring the latest in AI technology.

- 🌐 Website: [IsItP2W.com](https://isitp2w.com)
- 🎮 Dreadmyst: [isitp2w.com/games/dreadmyst](https://isitp2w.com/games/dreadmyst)

## License

**All Rights Reserved** © 2026 IsItP2W.com — Jordan D Turner (JT Digital Systems), Alberta, Canada.

This code is provided for viewing and educational purposes only. You may not copy, modify, distribute, or use this code in your own projects without explicit written permission from the author.
