'use client';

import { useMemo } from 'react';
import styles from './StrategyComparison.module.css';
import {
  ItemQuality,
  OrbQuality,
  ORB_QUALITY_NAMES,
  ORB_QUALITY_COLORS,
  MAX_ENCHANT,
  enchantSuccessRate,
  expectedOrbsToLevel,
  getRecommendedOrb,
} from '@/lib/enchant-engine';

interface StrategyComparisonProps {
  itemQuality: ItemQuality;
  currentLevel: number;
}

interface StrategyStep {
  fromLevel: number;
  toLevel: number;
  orbQuality: OrbQuality;
  successRate: number;
  expectedOrbs: number;
}

interface Strategy {
  name: string;
  description: string;
  steps: StrategyStep[];
  totalExpectedOrbs: number;
  riskProfile: 'low' | 'medium' | 'high';
}

function calculateStrategyPath(
  currentLevel: number,
  maxLevel: number,
  itemQuality: ItemQuality,
  getOrbForLevel: (level: number) => OrbQuality
): StrategyStep[] {
  const steps: StrategyStep[] = [];

  for (let level = currentLevel; level < maxLevel; level++) {
    const orbQuality = getOrbForLevel(level);
    const successRate = enchantSuccessRate(level, itemQuality, orbQuality);

    const memo = new Map<number, number>();
    let expectedOrbs: number;

    if (successRate <= 0) {
      expectedOrbs = Infinity;
    } else {
      const p = successRate / 100;
      const failureRate = 1 - p;

      // Calculate cost to recover to this level if we fail
      for (let l = 1; l <= level; l++) {
        const orbForRecovery = getOrbForLevel(l - 1);
        const recoverRate = enchantSuccessRate(l - 1, itemQuality, orbForRecovery) / 100;
        if (recoverRate <= 0) {
          memo.set(l, Infinity);
        } else {
          const prevCost = memo.get(l - 1) || 0;
          memo.set(l, (1 + (1 - recoverRate) * prevCost) / recoverRate);
        }
      }

      const costToRecover = level > 0 ? (memo.get(level) || 0) : 0;
      expectedOrbs = (1 + failureRate * costToRecover) / p;
    }

    steps.push({
      fromLevel: level,
      toLevel: level + 1,
      orbQuality,
      successRate,
      expectedOrbs,
    });
  }

  return steps;
}

export default function StrategyComparison({
  itemQuality,
  currentLevel,
}: StrategyComparisonProps) {
  const maxLevel = MAX_ENCHANT[itemQuality];

  const strategies = useMemo<Strategy[]>(() => {
    if (currentLevel >= maxLevel) return [];

    // Strategy A: Safe Path - Always use matching tier orbs
    const safeSteps = calculateStrategyPath(
      currentLevel,
      maxLevel,
      itemQuality,
      () => itemQuality as unknown as OrbQuality
    );

    // Strategy B: Hybrid - Start one tier below item, upgrade to match at higher levels
    const hybridSteps = calculateStrategyPath(
      currentLevel,
      maxLevel,
      itemQuality,
      (level) => {
        const matchingOrb = itemQuality as unknown as OrbQuality;
        const oneTierBelow = Math.max(1, matchingOrb - 1) as OrbQuality;
        
        // Use one tier below for early levels, switch to matching tier for later levels
        // Switch point: when we're past halfway to max
        const halfwayPoint = Math.floor(maxLevel / 2);
        if (level < halfwayPoint) {
          return oneTierBelow;
        }
        return matchingOrb;
      }
    );

    // Strategy C: Aggressive - Always use Minor orbs regardless of success rate
    const aggressiveSteps = calculateStrategyPath(
      currentLevel,
      maxLevel,
      itemQuality,
      () => OrbQuality.Minor
    );

    return [
      {
        name: 'Safe Path',
        description: 'Match orb tier to item quality. Highest success, most expensive.',
        steps: safeSteps,
        totalExpectedOrbs: safeSteps.reduce((sum, s) => sum + s.expectedOrbs, 0),
        riskProfile: 'low' as const,
      },
      {
        name: 'Hybrid Path',
        description: 'One tier below early, match tier for higher levels. Balanced approach.',
        steps: hybridSteps,
        totalExpectedOrbs: hybridSteps.reduce((sum, s) => sum + s.expectedOrbs, 0),
        riskProfile: 'medium' as const,
      },
      {
        name: 'Aggressive Path',
        description: 'Always Minor orbs. Maximum gambling, lowest orb cost.',
        steps: aggressiveSteps,
        totalExpectedOrbs: aggressiveSteps.reduce((sum, s) => sum + s.expectedOrbs, 0),
        riskProfile: 'high' as const,
      },
    ];
  }, [itemQuality, currentLevel, maxLevel]);

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

  if (currentLevel >= maxLevel) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Strategy Comparison</h2>
      <p className={styles.subtitle}>
        Compare different orb strategies from +{currentLevel} to +{maxLevel}
      </p>
      <p className={styles.disclaimer}>
        ⚠️ All costs are <strong>averages</strong>. Due to RNG, actual orbs needed may vary significantly. Plan for extra orbs.
      </p>

      <div className={styles.strategiesGrid}>
        {strategies.map((strategy) => (
          <div
            key={strategy.name}
            className={`${styles.strategyCard} ${styles[strategy.riskProfile]}`}
          >
            <div className={styles.strategyHeader}>
              <h3 className={styles.strategyName}>{strategy.name}</h3>
              <span className={styles.riskBadge}>{strategy.riskProfile} risk</span>
            </div>

            <p className={styles.strategyDescription}>{strategy.description}</p>

            <div className={styles.totalCost}>
              <span className={styles.totalLabel}>Total Expected Orbs</span>
              <span className={styles.totalValue}>
                {formatNumber(strategy.totalExpectedOrbs)}
              </span>
            </div>

            <div className={styles.stepsContainer}>
              <table className={styles.stepsTable}>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Orb</th>
                    <th>Rate</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {strategy.steps.map((step) => (
                    <tr key={step.fromLevel}>
                      <td>
                        +{step.fromLevel}→+{step.toLevel}
                      </td>
                      <td>
                        <span className={styles.orbIndicator}>
                          <span
                            className={styles.orbDot}
                            style={{
                              backgroundColor: ORB_QUALITY_COLORS[step.orbQuality],
                            }}
                          />
                          {ORB_QUALITY_NAMES[step.orbQuality]}
                        </span>
                      </td>
                      <td>{step.successRate.toFixed(0)}%</td>
                      <td>{formatNumber(step.expectedOrbs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
