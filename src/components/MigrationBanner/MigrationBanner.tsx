'use client';

import { useEffect, useState } from 'react';
import styles from './MigrationBanner.module.css';

const NEW_URL = 'https://isitp2w.com/games/dreadmyst/orb-enchanting-tool';
const REDIRECT_DELAY = 10; // seconds

export default function MigrationBanner() {
  const [isGitHubPages, setIsGitHubPages] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  useEffect(() => {
    // Only show on GitHub Pages (thecoderjt.github.io)
    const isGH = window.location.hostname.includes('github.io');
    setIsGitHubPages(isGH);

    if (isGH) {
      // Add noindex meta tag to tell Google to de-index this page
      const metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      metaRobots.content = 'noindex, nofollow';
      document.head.appendChild(metaRobots);
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = NEW_URL;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  // Don't render anything on Vercel/isitp2w.com
  if (!isGitHubPages) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.icon}>🚀</div>
        <h1 className={styles.title}>We&apos;ve Moved!</h1>
        <p className={styles.message}>
          The Dreadmyst Orb Enchanting Tool has a new home at IsItP2W.com
        </p>
        <a href={NEW_URL} className={styles.newUrl}>
          {NEW_URL.replace('https://', '')}
        </a>
        <p className={styles.countdown}>
          Redirecting in <span className={styles.countdownNumber}>{countdown}</span> seconds...
        </p>
        <a href={NEW_URL} className={styles.button}>
          Go Now →
        </a>
        <p className={styles.note}>
          Please update your bookmarks!
        </p>
      </div>
    </div>
  );
}
