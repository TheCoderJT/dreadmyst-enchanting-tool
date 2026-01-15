"use client";

import { OrbQuality, ORB_QUALITY_COLORS, ORB_QUALITY_NAMES } from "@/lib/enchant-engine";
import styles from "./OrbBreakdownModal.module.css";

interface OrbBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  finalLevel: number;
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  successRate: number;
  orbsUsedByType: {
    minor: number;
    lesser: number;
    greater: number;
    major: number;
    divine: number;
  };
}

const ORB_TYPES = ["minor", "lesser", "greater", "major", "divine"] as const;

export default function OrbBreakdownModal({
  isOpen,
  onClose,
  itemName,
  finalLevel,
  totalAttempts,
  totalSuccesses,
  totalFailures,
  successRate,
  orbsUsedByType,
}: OrbBreakdownModalProps) {
  if (!isOpen) return null;

  const totalOrbs = Object.values(orbsUsedByType).reduce((sum, count) => sum + count, 0);
  const successPercent = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
  const failurePercent = totalAttempts > 0 ? (totalFailures / totalAttempts) * 100 : 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        
        <div className={styles.header}>
          <h3 className={styles.title}>Orb Usage Breakdown</h3>
          <p className={styles.itemInfo}>
            {itemName} <span className={styles.level}>+{finalLevel}</span>
          </p>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{totalOrbs}</span>
            <span className={styles.summaryLabel}>Total Orbs</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue} style={{ color: "#22c55e" }}>{totalSuccesses}</span>
            <span className={styles.summaryLabel}>Successes</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue} style={{ color: "#ef4444" }}>{totalFailures}</span>
            <span className={styles.summaryLabel}>Failures</span>
          </div>
          <div className={styles.summaryItem}>
            <span 
              className={styles.summaryValue}
              style={{ color: successRate >= 50 ? "#22c55e" : "#ef4444" }}
            >
              {successRate.toFixed(1)}%
            </span>
            <span className={styles.summaryLabel}>Success Rate</span>
          </div>
        </div>

        <div className={styles.resultsBar}>
          <div 
            className={styles.successBar}
            style={{ width: `${successPercent}%` }}
            title={`${totalSuccesses} successes`}
          />
          <div 
            className={styles.failureBar}
            style={{ width: `${failurePercent}%` }}
            title={`${totalFailures} failures`}
          />
        </div>
        <div className={styles.resultsLabels}>
          <span style={{ color: "#22c55e" }}>{totalSuccesses} ✓</span>
          <span style={{ color: "#ef4444" }}>{totalFailures} ✗</span>
        </div>

        <div className={styles.breakdown}>
          {ORB_TYPES.map((orbType, index) => {
            const count = orbsUsedByType[orbType];
            const orbQuality = (index + 1) as OrbQuality;
            const orbColor = ORB_QUALITY_COLORS[orbQuality];
            const percentage = totalOrbs > 0 ? (count / totalOrbs) * 100 : 0;

            return (
              <div key={orbType} className={styles.orbRow}>
                <div className={styles.orbInfo}>
                  <span 
                    className={styles.orbName}
                    style={{ color: orbColor }}
                  >
                    {ORB_QUALITY_NAMES[orbQuality]}
                  </span>
                  <span className={styles.orbCount}>{count}</span>
                </div>
                <div className={styles.orbBar}>
                  <div 
                    className={styles.orbBarFill}
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: orbColor,
                    }}
                  />
                </div>
                <span className={styles.orbPercent}>
                  {percentage > 0 ? `${percentage.toFixed(0)}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
