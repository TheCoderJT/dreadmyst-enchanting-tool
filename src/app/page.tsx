'use client';

import { useState, useMemo } from 'react';
import styles from './page.module.css';
import StrategyComparison from '@/components/StrategyComparison';
import {
  ItemQuality,
  OrbQuality,
  ITEM_QUALITY_NAMES,
  ORB_QUALITY_NAMES,
  ITEM_QUALITY_COLORS,
  ORB_QUALITY_COLORS,
  MAX_ENCHANT,
  enchantSuccessRate,
  totalExpectedOrbsToMax,
  getRiskLevel,
  getRecommendedOrb,
  analyzeEnchantPath,
} from '@/lib/enchant-engine';

export default function Home() {
  const [itemQuality, setItemQuality] = useState<ItemQuality>(ItemQuality.Godly);
  const [orbQuality, setOrbQuality] = useState<OrbQuality>(OrbQuality.Divine);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  const maxEnchant = MAX_ENCHANT[itemQuality];

  const calculations = useMemo(() => {
    const successRate = enchantSuccessRate(currentLevel, itemQuality, orbQuality);
    const expectedOrbs = totalExpectedOrbsToMax(currentLevel, itemQuality, orbQuality);
    const riskLevel = getRiskLevel(successRate);
    const recommendedOrb = getRecommendedOrb(currentLevel, itemQuality);
    const steps = analyzeEnchantPath(currentLevel, itemQuality, orbQuality);

    return {
      successRate,
      expectedOrbs,
      riskLevel,
      recommendedOrb,
      steps,
    };
  }, [itemQuality, orbQuality, currentLevel]);

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case 'safe':
        return styles.riskSafe;
      case 'moderate':
        return styles.riskModerate;
      case 'risky':
        return styles.riskRisky;
      case 'dangerous':
        return styles.riskDangerous;
      default:
        return '';
    }
  };

  const formatNumber = (num: number) => {
    if (!isFinite(num)) return '∞';
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + 'T';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 10_000) return (num / 1_000).toFixed(1) + 'K';
    if (num >= 1000) return num.toFixed(0);
    if (num >= 100) return num.toFixed(1);
    return num.toFixed(2);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dreadmyst Enchanting Calculator</h1>
          <p className={styles.subtitle}>
            Calculate success rates and optimal orb strategies
          </p>
        </header>

        <div className={styles.grid}>
          {/* Input Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Item Configuration</h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Item Quality</label>
              <select
                className={styles.select}
                value={itemQuality}
                onChange={(e) => {
                  const newQuality = Number(e.target.value) as ItemQuality;
                  setItemQuality(newQuality);
                  if (currentLevel > MAX_ENCHANT[newQuality]) {
                    setCurrentLevel(0);
                  }
                }}
                style={{ color: ITEM_QUALITY_COLORS[itemQuality] }}
              >
                {Object.entries(ITEM_QUALITY_NAMES).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Orb Quality</label>
              <select
                className={styles.select}
                value={orbQuality}
                onChange={(e) => setOrbQuality(Number(e.target.value) as OrbQuality)}
                style={{ color: ORB_QUALITY_COLORS[orbQuality] }}
              >
                {Object.entries(ORB_QUALITY_NAMES).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Current Enchant Level (Max: +{maxEnchant})
              </label>
              <select
                className={styles.select}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
              >
                {Array.from({ length: maxEnchant + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? 'Unenchanted' : `+${i}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Next Enchant Analysis</h2>

            {currentLevel >= maxEnchant ? (
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Status</span>
                <span className={styles.maxEnchantBadge}>MAX ENCHANT REACHED</span>
              </div>
            ) : (
              <div className={styles.resultsGrid}>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>
                    +{currentLevel} → +{currentLevel + 1} Success Rate
                  </span>
                  <span
                    className={`${styles.resultValue} ${getRiskClass(calculations.riskLevel)}`}
                  >
                    {calculations.successRate.toFixed(1)}%
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Risk Level</span>
                  <span
                    className={`${styles.resultValue} ${getRiskClass(calculations.riskLevel)}`}
                  >
                    {calculations.riskLevel.charAt(0).toUpperCase() +
                      calculations.riskLevel.slice(1)}
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>
                    Expected Orbs to Max
                    <span className={styles.tooltip} title="This is an average estimate. Due to RNG, actual orbs needed may be higher or lower. Plan for ~20% extra orbs to be safe.">
                      ⓘ
                    </span>
                  </span>
                  <span className={styles.resultValue}>
                    {formatNumber(calculations.expectedOrbs)}
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Recommended Orb</span>
                  <span className={styles.resultValue}>
                    <span className={styles.orbIndicator}>
                      <span
                        className={styles.orbDot}
                        style={{
                          backgroundColor: ORB_QUALITY_COLORS[calculations.recommendedOrb],
                        }}
                      />
                      {ORB_QUALITY_NAMES[calculations.recommendedOrb]}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Strategy Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Quick Stats</h2>
            <div className={styles.resultsGrid}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Item Quality</span>
                <span
                  className={styles.resultValue}
                  style={{ color: ITEM_QUALITY_COLORS[itemQuality] }}
                >
                  {ITEM_QUALITY_NAMES[itemQuality]}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Max Enchant</span>
                <span className={styles.resultValue}>+{maxEnchant}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Current Level</span>
                <span className={styles.resultValue}>
                  {currentLevel === 0 ? 'None' : `+${currentLevel}`}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Remaining Steps</span>
                <span className={styles.resultValue}>{maxEnchant - currentLevel}</span>
              </div>
            </div>
          </div>

          {/* Enchant Path Table */}
          <div className={`${styles.card} ${styles.fullWidth}`}>
            <h2 className={styles.cardTitle}>Full Enchant Path</h2>
            {calculations.steps.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                Item is already at maximum enchant level.
              </p>
            ) : (
              <table className={styles.stepsTable}>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Success Rate</th>
                    <th>Expected Orbs</th>
                    <th>Risk</th>
                    <th>Recommended Orb</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.steps.map((step) => (
                    <tr key={step.fromLevel}>
                      <td>
                        +{step.fromLevel} → +{step.toLevel}
                      </td>
                      <td className={getRiskClass(step.riskLevel)}>
                        {step.successRate.toFixed(1)}%
                      </td>
                      <td>{formatNumber(step.expectedOrbs)}</td>
                      <td className={getRiskClass(step.riskLevel)}>
                        {step.riskLevel.charAt(0).toUpperCase() + step.riskLevel.slice(1)}
                      </td>
                      <td>
                        <span className={styles.orbIndicator}>
                          <span
                            className={styles.orbDot}
                            style={{
                              backgroundColor: ORB_QUALITY_COLORS[step.recommendedOrb],
                            }}
                          />
                          {ORB_QUALITY_NAMES[step.recommendedOrb]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Strategy Comparison */}
          <div className={`${styles.card} ${styles.fullWidth}`}>
            <StrategyComparison
              itemQuality={itemQuality}
              currentLevel={currentLevel}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerSection}>
            <p className={styles.footerText}>
              A tool by{' '}
              <a
                href="https://isitp2w.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                IsItP2W.com
              </a>
            </p>
            <p className={styles.footerSubtext}>
              <a
                href="https://isitp2w.com/games/dreadmyst"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                View Dreadmyst on IsItP2W →
              </a>
            </p>
          </div>

          <div className={styles.footerDivider}></div>

          <div className={styles.footerSection}>
            <p className={styles.footerAttribution}>
              Enchanting data by <strong>Sith</strong>
            </p>
            <p className={styles.footerSubtext}>
              <a
                href="https://docs.google.com/spreadsheets/d/1GxuInbx8yLYp4mnmaHgCMmRkSamrE_cBCYlzvg1pCqM/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                View the Dreadmyst Info Spreadsheet →
              </a>
            </p>
            <p className={styles.footerNote}>
              Check the spreadsheet for more game info!
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
