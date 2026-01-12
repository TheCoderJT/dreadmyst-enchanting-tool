'use client';

import { useState, useCallback } from 'react';
import styles from './SimulationResults.module.css';
import ColorDropdown from '@/components/ColorDropdown';
import {
  ItemQuality,
  OrbQuality,
  SimulationStats,
  runSimulation,
  isSimulationPractical,
  enchantSuccessRate,
  ITEM_QUALITY_NAMES,
  ORB_QUALITY_NAMES,
  ITEM_QUALITY_COLORS,
  ORB_QUALITY_COLORS,
  MAX_ENCHANT,
} from '@/lib/enchant-engine';

interface SimulationResultsProps {
  itemQuality: ItemQuality;
  orbQuality: OrbQuality;
  currentLevel: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(1) + 'T';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num).toString();
}

export default function SimulationResults({
  itemQuality: initialItemQuality,
  orbQuality: initialOrbQuality,
  currentLevel: initialCurrentLevel,
}: SimulationResultsProps) {
  const [simItemQuality, setSimItemQuality] = useState<ItemQuality>(initialItemQuality);
  const [simOrbQuality, setSimOrbQuality] = useState<OrbQuality>(initialOrbQuality);
  const [simStartLevel, setSimStartLevel] = useState<number>(initialCurrentLevel);
  const [orbsAvailable, setOrbsAvailable] = useState<string>('');
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const maxLevel = MAX_ENCHANT[simItemQuality];
  const isMaxed = simStartLevel >= maxLevel;
  const orbLimit = orbsAvailable ? parseInt(orbsAvailable, 10) : null;

  // Check if simulation is practical
  const practicalityCheck = isSimulationPractical(
    simStartLevel,
    maxLevel,
    simItemQuality,
    simOrbQuality
  );

  const handleRunSimulation = useCallback(() => {
    if (isMaxed || !practicalityCheck.practical || isRunning || cooldown) return;
    
    setIsRunning(true);
    setCooldown(true);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const result = runSimulation(
        simStartLevel,
        maxLevel,
        simItemQuality,
        simOrbQuality,
        10000
      );
      setStats(result);
      setIsRunning(false);
      
      // 3 second cooldown before next run
      setTimeout(() => setCooldown(false), 3000);
    }, 50);
  }, [simStartLevel, maxLevel, simItemQuality, simOrbQuality, isMaxed, practicalityCheck.practical]);

  const maxHistogramCount = stats ? Math.max(...stats.histogram.map(h => h.count)) : 0;

  // Build level options based on selected item quality
  const levelOptions = Array.from({ length: maxLevel }, (_, i) => ({
    value: i,
    label: i === 0 ? 'Unenchanted' : `+${i}`,
    color: 'var(--text-primary)',
  }));

  // Build success rates for each level
  const successRates = Array.from({ length: maxLevel - simStartLevel }, (_, i) => {
    const level = simStartLevel + i;
    const rate = enchantSuccessRate(level, simItemQuality, simOrbQuality);
    return {
      from: level,
      to: level + 1,
      successRate: rate,
      failureRate: 100 - rate,
    };
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Monte Carlo Simulation</h2>
      <p className={styles.subtitle}>
        Simulate 10,000 enchanting runs to see probability distribution
      </p>

      <div className={styles.simControls}>
        <ColorDropdown
          label="Item Quality"
          value={simItemQuality}
          onChange={(value) => {
            const newQuality = value as ItemQuality;
            setSimItemQuality(newQuality);
            if (simStartLevel >= MAX_ENCHANT[newQuality]) {
              setSimStartLevel(0);
            }
            setStats(null);
          }}
          options={Object.entries(ITEM_QUALITY_NAMES).map(([value, name]) => ({
            value: Number(value),
            label: name,
            color: ITEM_QUALITY_COLORS[Number(value) as ItemQuality],
          }))}
        />

        <ColorDropdown
          label="Orb Quality"
          value={simOrbQuality}
          onChange={(value) => {
            setSimOrbQuality(value as OrbQuality);
            setStats(null);
          }}
          options={Object.entries(ORB_QUALITY_NAMES).map(([value, name]) => ({
            value: Number(value),
            label: name,
            color: ORB_QUALITY_COLORS[Number(value) as OrbQuality],
          }))}
        />

        <ColorDropdown
          label={`Start Level (Max: +${maxLevel})`}
          value={simStartLevel}
          onChange={(value) => {
            setSimStartLevel(value);
            setStats(null);
          }}
          options={levelOptions}
        />

        <div className={styles.orbsInputGroup}>
          <label className={styles.orbsInputLabel}>Orbs Available (optional)</label>
          <input
            type="number"
            className={styles.orbsInput}
            value={orbsAvailable}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow positive integers, max 10 million
              if (value === '' || (/^\d+$/.test(value) && parseInt(value, 10) <= 10000000)) {
                setOrbsAvailable(value);
                setStats(null);
              }
            }}
            placeholder="e.g., 50"
            min="1"
            max="10000000"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <span className={styles.inputNote}>Max: 10M (larger values may crash your browser)</span>
        </div>
      </div>

      {isMaxed ? (
        <p className={styles.maxedMessage}>Item is already at max enchant level</p>
      ) : !practicalityCheck.practical ? (
        <div className={styles.warningBox}>
          <p className={styles.warningTitle}>⚠️ Impractical Combination</p>
          <p className={styles.warningText}>{practicalityCheck.warning}</p>
          <p className={styles.warningEstimate}>
            Estimated average: <strong>{formatNumber(practicalityCheck.estimatedOrbs)}</strong> orbs
          </p>
        </div>
      ) : (
        <>
          {practicalityCheck.warning && (
            <div className={styles.cautionBox}>
              <p>⚠️ {practicalityCheck.warning}</p>
            </div>
          )}

          <div className={styles.simInfo}>
            <span>
              Simulating: <strong>{ITEM_QUALITY_NAMES[simItemQuality]}</strong> +{simStartLevel} → +{maxLevel}
            </span>
            <span>
              Using: <strong>{ORB_QUALITY_NAMES[simOrbQuality]}</strong> orbs
            </span>
          </div>

          <div className={styles.ratesTable}>
            <h4 className={styles.ratesTitle}>Success Rates per Level</h4>
            <div className={styles.ratesGrid}>
              {successRates.map((rate) => (
                <div key={rate.from} className={styles.rateRow}>
                  <span className={styles.rateLevel}>+{rate.from} → +{rate.to}</span>
                  <div className={styles.rateBarContainer}>
                    <div 
                      className={styles.rateBarSuccess} 
                      style={{ width: `${rate.successRate}%` }}
                    />
                    <div 
                      className={styles.rateBarFail} 
                      style={{ width: `${rate.failureRate}%` }}
                    />
                  </div>
                  <span className={styles.ratePercent}>
                    {rate.successRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            className={styles.runButton}
            onClick={handleRunSimulation}
            disabled={isRunning || cooldown}
          >
            {isRunning ? 'Running Simulation...' : cooldown ? 'Please wait...' : 'Run Simulation (10,000 trials)'}
          </button>

          {stats && (
            <div className={styles.results}>
              {orbLimit && orbLimit > 0 && (
                <div className={styles.orbLimitResult}>
                  <h4 className={styles.orbLimitTitle}>With Your {orbLimit.toLocaleString()} Orbs</h4>
                  {(() => {
                    // Count how many runs succeeded within the orb limit
                    // We need to check against the histogram buckets
                    const runsWithinLimit = stats.histogram.reduce((acc, bucket, index) => {
                      const nextBucket = stats.histogram[index + 1]?.bucket;
                      if (bucket.bucket <= orbLimit) {
                        // If the bucket start is within limit, count all runs in this bucket
                        // But if the next bucket exceeds limit, we're at the edge
                        if (!nextBucket || nextBucket <= orbLimit) {
                          return acc + bucket.count;
                        } else {
                          // Partial bucket - estimate
                          return acc + bucket.count;
                        }
                      }
                      return acc;
                    }, 0);
                    const successChance = (runsWithinLimit / stats.runs * 100);
                    const isGoodChance = successChance >= 50;
                    const isDecentChance = successChance >= 25;
                    
                    return (
                      <>
                        <p className={styles.orbLimitChance}>
                          <span className={`${styles.chanceValue} ${isGoodChance ? styles.chanceGood : isDecentChance ? styles.chanceDecent : styles.chanceBad}`}>
                            {successChance.toFixed(1)}%
                          </span>
                          <span className={styles.chanceLabel}>chance to reach +{maxLevel}</span>
                        </p>
                        {successChance < 50 && (
                          <p className={styles.orbLimitAdvice}>
                            You may need more orbs. Median is {formatNumber(stats.median)} orbs.
                          </p>
                        )}
                        {successChance >= 80 && (
                          <p className={styles.orbLimitAdvice}>
                            You have a good chance of success!
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Lucky (10%)</span>
                  <span className={styles.statValue}>{formatNumber(stats.p10)} orbs</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Median (50%)</span>
                  <span className={styles.statValue}>{formatNumber(stats.median)} orbs</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Average</span>
                  <span className={styles.statValue}>{formatNumber(stats.mean)} orbs</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Unlucky (80%)</span>
                  <span className={styles.statValue}>{formatNumber(stats.p80)} orbs</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Very Unlucky (95%)</span>
                  <span className={styles.statValue}>{formatNumber(stats.p95)} orbs</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Worst Case</span>
                  <span className={styles.statValue}>{formatNumber(stats.max)} orbs</span>
                </div>
              </div>

              <div className={styles.probabilityBand}>
                <span className={styles.bandLabel}>80% Confidence Range:</span>
                <span className={styles.bandValue}>
                  {formatNumber(stats.p10)} – {formatNumber(stats.p90)} orbs
                </span>
              </div>

              <div className={styles.histogram}>
                <h4 className={styles.histogramTitle}>How Many Runs Needed X Orbs?</h4>
                <p className={styles.histogramDesc}>
                  Each bar shows how many of the {stats.runs.toLocaleString()} simulation runs 
                  finished within that orb range.
                </p>
                <div className={styles.histogramBars}>
                  {stats.histogram.map((bar, index) => {
                    const nextBucket = stats.histogram[index + 1]?.bucket || (bar.bucket + (stats.histogram[1]?.bucket - stats.histogram[0]?.bucket || 1));
                    const percentage = ((bar.count / stats.runs) * 100).toFixed(1);
                    return (
                      <div key={index} className={styles.barContainer}>
                        <span className={styles.barCount}>{bar.count > 0 ? `${percentage}%` : ''}</span>
                        <div
                          className={styles.bar}
                          style={{
                            height: `${(bar.count / maxHistogramCount) * 100}%`,
                          }}
                          title={`${bar.count.toLocaleString()} runs needed ${formatNumber(bar.bucket)}-${formatNumber(nextBucket)} orbs`}
                        />
                        <span className={styles.barLabel}>{formatNumber(bar.bucket)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.histogramAxis}>
                  <span>Orbs needed to reach max →</span>
                </div>
              </div>

              <div className={styles.simLevelStats}>
                <h4 className={styles.simLevelStatsTitle}>Simulation Results by Level</h4>
                <div className={styles.simLevelStatsGrid}>
                  <div className={styles.simLevelStatsHeader}>
                    <span>Level</span>
                    <span>Attempts</span>
                    <span>Successes</span>
                    <span>Failures</span>
                    <span>Actual Rate</span>
                  </div>
                  {stats.levelStats.map((levelStat) => {
                    const actualRate = levelStat.attempts > 0 
                      ? (levelStat.successes / levelStat.attempts * 100).toFixed(1) 
                      : '0.0';
                    return (
                      <div key={levelStat.level} className={styles.simLevelStatsRow}>
                        <span className={styles.simLevelLabel}>+{levelStat.level} → +{levelStat.level + 1}</span>
                        <span>{formatNumber(levelStat.attempts)}</span>
                        <span className={styles.successCount}>{formatNumber(levelStat.successes)}</span>
                        <span className={styles.failCount}>{formatNumber(levelStat.failures)}</span>
                        <span>{actualRate}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className={styles.disclaimer}>
                Based on {stats.runs.toLocaleString()} simulated enchanting runs
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
