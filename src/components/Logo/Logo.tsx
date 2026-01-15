"use client";

import styles from "./Logo.module.css";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
}

export default function Logo({ size = "medium", showText = true }: LogoProps) {
  return (
    <div className={`${styles.logoContainer} ${styles[size]}`}>
      <svg
        className={styles.logoIcon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer glow ring */}
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="url(#glowGradient)"
          strokeWidth="2"
          opacity="0.6"
        />
        
        {/* Inner orb */}
        <circle
          cx="24"
          cy="24"
          r="16"
          fill="url(#orbGradient)"
        />
        
        {/* Enchant sparkles */}
        <path
          d="M24 8L25.5 14L24 12L22.5 14L24 8Z"
          fill="url(#sparkleGradient)"
          className={styles.sparkle}
        />
        <path
          d="M40 24L34 25.5L36 24L34 22.5L40 24Z"
          fill="url(#sparkleGradient)"
          className={styles.sparkle}
        />
        <path
          d="M24 40L22.5 34L24 36L25.5 34L24 40Z"
          fill="url(#sparkleGradient)"
          className={styles.sparkle}
        />
        <path
          d="M8 24L14 22.5L12 24L14 25.5L8 24Z"
          fill="url(#sparkleGradient)"
          className={styles.sparkle}
        />
        
        {/* Plus symbol in center */}
        <path
          d="M24 18V30M18 24H30"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="glowGradient" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <radialGradient id="orbGradient" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </radialGradient>
          <linearGradient id="sparkleGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div className={styles.logoTextWrapper}>
          <span className={styles.logoTextBrand}>Dreadmyst</span>
          <span className={styles.logoTextSub}>Enchanting Calculator</span>
        </div>
      )}
    </div>
  );
}
