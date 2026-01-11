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
 * Build a memoized map of expected orbs to reach each level from 0
 * Uses proper recursive model: E[n] = (1 + (1-p) * E[n-1]) / p
 */
function buildExpectedOrbsMemo(
  maxLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): Map<number, number> {
  const memo = new Map<number, number>();
  memo.set(0, 0);
  
  for (let level = 1; level <= maxLevel; level++) {
    const successRate = enchantSuccessRate(level - 1, itemQuality, orbQuality) / 100;
    
    if (successRate <= 0) {
      memo.set(level, Infinity);
      continue;
    }
    
    const failureRate = 1 - successRate;
    const prevCost = memo.get(level - 1) || 0;
    
    // E[n] = (1 + (1-p) * E[n-1]) / p
    // This accounts for: 1 attempt + if fail, pay cost to recover to previous level
    const expected = (1 + failureRate * prevCost) / successRate;
    memo.set(level, expected);
  }
  
  return memo;
}

/**
 * Calculate expected orbs for a single enchant step
 * Uses proper recursive model accounting for compounding recovery costs
 * @param fromLevel - Current enchant level
 * @param itemQuality - Quality tier of the item
 * @param orbQuality - Quality tier of the orb being used
 * @param memo - Optional pre-computed memo map
 * @returns Expected orbs for this single step
 */
export function expectedOrbsForStep(
  fromLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality,
  memo?: Map<number, number>
): number {
  const successRate = enchantSuccessRate(fromLevel, itemQuality, orbQuality) / 100;
  
  if (successRate <= 0) return Infinity;
  if (successRate >= 1) return 1;
  
  // Build memo if not provided
  if (!memo) {
    const maxLevel = MAX_ENCHANT[itemQuality];
    memo = buildExpectedOrbsMemo(maxLevel, itemQuality, orbQuality);
  }
  
  const failureRate = 1 - successRate;
  const costToRecover = memo.get(fromLevel) || 0;
  
  // E = (1 + failureRate * costToRecover) / successRate
  return (1 + failureRate * costToRecover) / successRate;
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
