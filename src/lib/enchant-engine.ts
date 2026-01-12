/**
 * Dreadmyst Enchanting Math Engine
 * Core calculations for enchant success rates and expected costs
 */

export enum ItemQuality {
  White = 1,
  Radiant = 2,
  Blessed = 3,
  Holy = 4,
  Godly = 5,
}

export enum OrbQuality {
  Minor = 1,
  Lesser = 2,
  Greater = 3,
  Major = 4,
  Divine = 5,
}

export const ITEM_QUALITY_NAMES: Record<ItemQuality, string> = {
  [ItemQuality.White]: 'White',
  [ItemQuality.Radiant]: 'Radiant',
  [ItemQuality.Blessed]: 'Blessed',
  [ItemQuality.Holy]: 'Holy',
  [ItemQuality.Godly]: 'Godly',
};

export const ORB_QUALITY_NAMES: Record<OrbQuality, string> = {
  [OrbQuality.Minor]: 'Minor',
  [OrbQuality.Lesser]: 'Lesser',
  [OrbQuality.Greater]: 'Greater',
  [OrbQuality.Major]: 'Major',
  [OrbQuality.Divine]: 'Divine',
};

export const ITEM_QUALITY_COLORS: Record<ItemQuality, string> = {
  [ItemQuality.White]: '#ffffff',
  [ItemQuality.Radiant]: '#00ff00',
  [ItemQuality.Blessed]: '#00bfff',
  [ItemQuality.Holy]: '#ff69b4',
  [ItemQuality.Godly]: '#a855f7',
};

export const ORB_QUALITY_COLORS: Record<OrbQuality, string> = {
  [OrbQuality.Minor]: '#ffffff',
  [OrbQuality.Lesser]: '#00ff00',
  [OrbQuality.Greater]: '#00bfff',
  [OrbQuality.Major]: '#ff69b4',
  [OrbQuality.Divine]: '#a855f7',
};

export const ITEM_DIVISOR: Record<ItemQuality, number> = {
  [ItemQuality.White]: 1.0,
  [ItemQuality.Radiant]: 1.5,
  [ItemQuality.Blessed]: 3.0,
  [ItemQuality.Holy]: 6.0,
  [ItemQuality.Godly]: 8.0,
};

export const ORB_MULTIPLIER: Record<OrbQuality, number> = {
  [OrbQuality.Minor]: 1.0,
  [OrbQuality.Lesser]: 1.5,
  [OrbQuality.Greater]: 3.0,
  [OrbQuality.Major]: 6.0,
  [OrbQuality.Divine]: 8.0,
};

export const MAX_ENCHANT: Record<ItemQuality, number> = {
  [ItemQuality.White]: 1,
  [ItemQuality.Radiant]: 3,
  [ItemQuality.Blessed]: 4,
  [ItemQuality.Holy]: 7,
  [ItemQuality.Godly]: 10,
};

/**
 * Calculate success rate for a single enchant attempt
 * @param currentLevel - Current enchant level (0 = unenchanted)
 * @param itemQuality - Quality tier of the item
 * @param orbQuality - Quality tier of the orb being used
 * @returns Success rate as percentage (0-100)
 */
export function enchantSuccessRate(
  currentLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): number {
  const penalty = currentLevel * 7;
  const base = Math.max(0, 100 - penalty);
  const rate = (base / ITEM_DIVISOR[itemQuality]) * ORB_MULTIPLIER[orbQuality];
  return Math.min(100, Math.max(0, rate));
}

/**
 * Calculate expected orbs to reach a target level from 0
 * Uses recursive model accounting for failure reset to 0
 * @param targetLevel - Target enchant level
 * @param itemQuality - Quality tier of the item
 * @param orbQuality - Quality tier of the orb being used
 * @param memo - Memoization map for performance
 * @returns Expected number of orbs needed
 */
export function expectedOrbsToLevel(
  targetLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality,
  memo: Map<number, number> = new Map()
): number {
  if (targetLevel <= 0) return 0;
  if (memo.has(targetLevel)) return memo.get(targetLevel)!;

  const successRate = enchantSuccessRate(targetLevel - 1, itemQuality, orbQuality) / 100;
  
  if (successRate <= 0) {
    memo.set(targetLevel, Infinity);
    return Infinity;
  }

  const failureRate = 1 - successRate;
  const attemptCost = 1;
  
  // Cost to get from 0 to targetLevel-1 (needed if we fail)
  const costFromZero = expectedOrbsToLevel(targetLevel - 1, itemQuality, orbQuality, memo);
  
  // E[n] = (1 + (1-p) × E[n-1]) / p
  const expected = (attemptCost + failureRate * costFromZero) / successRate;
  
  memo.set(targetLevel, expected);
  return expected;
}

/**
 * Build a memoized map of expected orbs (delta) for each step
 * Uses random walk model with reflecting boundary at 0:
 * - Success: move from i to i+1
 * - Failure: move from i to i-1 (or stay at 0 if already at 0)
 * 
 * Formula: Δ_i = (1 + q_i * Δ_{i-1}) / p_i
 * Where p_i = success rate at level i, q_i = 1 - p_i
 */
function buildExpectedOrbsMemo(
  maxLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): Map<number, number> {
  const memo = new Map<number, number>();
  
  for (let level = 0; level < maxLevel; level++) {
    const successRate = enchantSuccessRate(level, itemQuality, orbQuality) / 100;
    
    if (successRate <= 0) {
      memo.set(level, Infinity);
      continue;
    }
    
    const failureRate = 1 - successRate;
    
    if (level === 0) {
      // Base case: at level 0, fail stays at 0, so Δ_0 = 1/p_0
      memo.set(level, 1 / successRate);
    } else {
      // Recursive case: Δ_i = (1 + q_i * Δ_{i-1}) / p_i
      const prevDelta = memo.get(level - 1) || 0;
      memo.set(level, (1 + failureRate * prevDelta) / successRate);
    }
  }
  
  return memo;
}

/**
 * Calculate expected orbs for a single enchant step (from level i to i+1)
 * Uses random walk model: failure goes back 1 level (or stays at 0)
 * 
 * @param fromLevel - Current enchant level
 * @param itemQuality - Quality tier of the item
 * @param orbQuality - Quality tier of the orb being used
 * @param memo - Optional pre-computed memo map of deltas
 * @returns Expected orbs for this single step (Δ_i)
 */
export function expectedOrbsForStep(
  fromLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality,
  memo?: Map<number, number>
): number {
  // Build memo if not provided
  if (!memo) {
    const maxLevel = MAX_ENCHANT[itemQuality];
    memo = buildExpectedOrbsMemo(maxLevel, itemQuality, orbQuality);
  }
  
  return memo.get(fromLevel) || Infinity;
}

/**
 * Calculate total expected orbs from current level to max
 * Sums the expected orbs for each individual step using recursive model
 * @param currentLevel - Current enchant level
 * @param itemQuality - Quality tier of the item
 * @param orbQuality - Quality tier of the orb being used
 * @returns Total expected orbs to reach max enchant
 */
export function totalExpectedOrbsToMax(
  currentLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): number {
  const maxLevel = MAX_ENCHANT[itemQuality];
  if (currentLevel >= maxLevel) return 0;

  // Build memo once for all steps
  const memo = buildExpectedOrbsMemo(maxLevel, itemQuality, orbQuality);
  
  let total = 0;
  for (let level = currentLevel; level < maxLevel; level++) {
    total += expectedOrbsForStep(level, itemQuality, orbQuality, memo);
  }

  return total;
}

/**
 * Get risk level based on success rate
 */
export function getRiskLevel(successRate: number): 'safe' | 'moderate' | 'risky' | 'dangerous' {
  if (successRate >= 70) return 'safe';
  if (successRate >= 40) return 'moderate';
  if (successRate >= 20) return 'risky';
  return 'dangerous';
}

/**
 * Get recommended orb for a given item quality and enchant level
 * Strategy: Find the cheapest orb that achieves "safe" (70%+) success rate.
 * If no orb can reach 70%, recommend matching the item tier as baseline.
 * If even that fails, recommend the best available (Divine).
 */
export function getRecommendedOrb(
  currentLevel: number,
  itemQuality: ItemQuality,
  minSuccessRate: number = 70
): OrbQuality {
  const orbQualities = [
    OrbQuality.Minor,
    OrbQuality.Lesser,
    OrbQuality.Greater,
    OrbQuality.Major,
    OrbQuality.Divine,
  ];

  // First pass: find cheapest orb that achieves target success rate
  for (const orbQuality of orbQualities) {
    const rate = enchantSuccessRate(currentLevel, itemQuality, orbQuality);
    if (rate >= minSuccessRate) {
      return orbQuality;
    }
  }

  // Second pass: if no orb reaches target, recommend matching item tier
  // (e.g., Radiant item → Lesser orb, Blessed → Greater, etc.)
  const matchingOrb = itemQuality as unknown as OrbQuality;
  if (matchingOrb >= OrbQuality.Minor && matchingOrb <= OrbQuality.Divine) {
    return matchingOrb;
  }

  // Fallback: return Divine as best option
  return OrbQuality.Divine;
}

export interface EnchantStep {
  fromLevel: number;
  toLevel: number;
  successRate: number;
  expectedOrbs: number;
  riskLevel: 'safe' | 'moderate' | 'risky' | 'dangerous';
  recommendedOrb: OrbQuality;
}

/**
 * Generate full enchant path analysis
 */
export function analyzeEnchantPath(
  currentLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): EnchantStep[] {
  const maxLevel = MAX_ENCHANT[itemQuality];
  const steps: EnchantStep[] = [];

  for (let level = currentLevel; level < maxLevel; level++) {
    const successRate = enchantSuccessRate(level, itemQuality, orbQuality);
    const expectedOrbs = expectedOrbsForStep(level, itemQuality, orbQuality);

    steps.push({
      fromLevel: level,
      toLevel: level + 1,
      successRate,
      expectedOrbs,
      riskLevel: getRiskLevel(successRate),
      recommendedOrb: getRecommendedOrb(level, itemQuality),
    });
  }

  return steps;
}

/**
 * Monte Carlo Simulation Types
 */
export interface SimulationResult {
  orbsUsed: number;
  attempts: number;
}

export interface LevelStats {
  level: number;
  attempts: number;
  successes: number;
  failures: number;
}

export interface SimulationStats {
  runs: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p75: number;
  p80: number;
  p90: number;
  p95: number;
  histogram: { bucket: number; count: number }[];
  levelStats: LevelStats[];
}

/**
 * Simulate a single enchanting run from startLevel to targetLevel
 * Uses random walk model: success +1, failure -1 (min 0)
 */
export function simulateSingleRun(
  startLevel: number,
  targetLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): SimulationResult {
  let currentLevel = startLevel;
  let orbsUsed = 0;
  let attempts = 0;
  const maxAttempts = 10000000; // Safety limit (10M)

  while (currentLevel < targetLevel && attempts < maxAttempts) {
    attempts++;
    orbsUsed++;
    
    const successRate = enchantSuccessRate(currentLevel, itemQuality, orbQuality) / 100;
    
    if (Math.random() < successRate) {
      currentLevel++;
    } else if (currentLevel > 0) {
      currentLevel--;
    }
  }

  return { orbsUsed, attempts };
}

/**
 * Check if a simulation is practical (won't take forever)
 * Returns estimated average orbs - if too high, simulation is impractical
 */
export function isSimulationPractical(
  startLevel: number,
  targetLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): { practical: boolean; estimatedOrbs: number; warning?: string } {
  const estimatedOrbs = totalExpectedOrbsToMax(startLevel, itemQuality, orbQuality);
  
  if (estimatedOrbs > 1000000) {
    return {
      practical: false,
      estimatedOrbs,
      warning: 'This combination would require millions of orbs on average. Consider using higher quality orbs.',
    };
  }
  
  if (estimatedOrbs > 10000) {
    return {
      practical: true,
      estimatedOrbs,
      warning: 'This combination requires many orbs. Simulation may take a moment.',
    };
  }
  
  return { practical: true, estimatedOrbs };
}

/**
 * Run Monte Carlo simulation with specified number of runs
 * Tracks successes/failures at each enchant level
 */
export function runSimulation(
  startLevel: number,
  targetLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality,
  numRuns: number = 10000
): SimulationStats {
  const results: number[] = [];
  
  // Track successes and failures at each level
  const levelStatsMap = new Map<number, { attempts: number; successes: number; failures: number }>();
  for (let level = 0; level < targetLevel; level++) {
    levelStatsMap.set(level, { attempts: 0, successes: 0, failures: 0 });
  }

  for (let i = 0; i < numRuns; i++) {
    let currentLevel = startLevel;
    let orbsUsed = 0;
    let attempts = 0;
    const maxAttempts = 10000000;

    while (currentLevel < targetLevel && attempts < maxAttempts) {
      attempts++;
      orbsUsed++;
      
      const levelData = levelStatsMap.get(currentLevel);
      if (levelData) {
        levelData.attempts++;
      }
      
      const successRate = enchantSuccessRate(currentLevel, itemQuality, orbQuality) / 100;
      
      if (Math.random() < successRate) {
        if (levelData) levelData.successes++;
        currentLevel++;
      } else {
        if (levelData) levelData.failures++;
        if (currentLevel > 0) {
          currentLevel--;
        }
      }
    }
    
    results.push(orbsUsed);
  }

  // Sort for percentile calculations
  results.sort((a, b) => a - b);

  const sum = results.reduce((acc, val) => acc + val, 0);
  const mean = sum / numRuns;
  const median = results[Math.floor(numRuns / 2)];
  const min = results[0];
  const max = results[numRuns - 1];

  // Percentiles
  const p10 = results[Math.floor(numRuns * 0.1)];
  const p25 = results[Math.floor(numRuns * 0.25)];
  const p75 = results[Math.floor(numRuns * 0.75)];
  const p80 = results[Math.floor(numRuns * 0.8)];
  const p90 = results[Math.floor(numRuns * 0.9)];
  const p95 = results[Math.floor(numRuns * 0.95)];

  // Build histogram (10 buckets)
  const bucketCount = 10;
  const bucketSize = Math.ceil((max - min + 1) / bucketCount);
  const histogram: { bucket: number; count: number }[] = [];
  
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = min + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const count = results.filter(v => v >= bucketStart && v < bucketEnd).length;
    histogram.push({ bucket: bucketStart, count });
  }

  // Convert level stats map to array
  const levelStats: LevelStats[] = [];
  for (let level = startLevel; level < targetLevel; level++) {
    const data = levelStatsMap.get(level);
    if (data) {
      levelStats.push({
        level,
        attempts: data.attempts,
        successes: data.successes,
        failures: data.failures,
      });
    }
  }

  return {
    runs: numRuns,
    mean,
    median,
    min,
    max,
    p10,
    p25,
    p75,
    p80,
    p90,
    p95,
    histogram,
    levelStats,
  };
}
