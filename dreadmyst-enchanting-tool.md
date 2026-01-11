# Dreadmyst Game Overlay - Engineering Action Plan

Below is a structured, engineering-grade action plan for building an Electron-based game overlay that uses live image scanning to detect items and orbs in Dreadmyst, computes enchant outcomes, and recommends optimal strategies.

This is written as a practical roadmap you could hand to yourself (or a small dev team) and implement incrementally.

---

## Phase 1 — Manual Calculator MVP

### 1.1 Purpose

Before any OCR or overlay work, build a **fully functional manual calculator** that:
- Validates the math engine independently
- Provides immediate usable value
- Serves as fallback when OCR fails

### 1.2 Core Features

**Inputs (Dropdowns/Selectors):**
- Item Quality: White / Radiant / Blessed / Holy / Godly
- Orb Quality: Minor / Lesser / Greater / Major / Divine
- Current Enchant Level: 0 to max for selected item quality

**Outputs:**
- Success rate for next enchant attempt
- Expected orbs to reach max enchant (accounting for failure recovery)
- Risk assessment (color-coded: green/yellow/red)
- Recommended orb tier for current step

### 1.3 Orb Visualization

Use **color-coded text** matching in-game colors:
- **Minor** — White text with white dot
- **Lesser** — Green text with green dot
- **Greater** — Purple text with purple dot
- **Major** — Yellow text with yellow dot
- **Divine** — Magenta text with magenta dot

*Note: Image-based orb icons may be added later once screenshots are gathered.*

---

## Phase 2 — Define Scope and Constraints

### 2.1 Core Objectives

Your overlay must be able to:

**Detect Item Quality and Current Enchant Level**

**Detect Orb Type / Quality**

**Calculate:**
- Success rate per enchant
- Expected number of orbs to reach max (including failure recovery cost)
- Risk thresholds (where odds collapse)

**Recommend:**
- Best orb tier per enchant step
- Lowest-cost path to max enchant
- "Stop here" warnings

### 2.2 Failure Penalty

**On enchant failure:** Item enchant level resets to 0 (or -1 from current level).

This has major implications for expected cost calculations:
- Failure at +7 means re-enchanting from 0 back to +7
- High-level enchants carry exponentially higher true costs
- Strategy engine must factor in recovery cost, not just attempt cost

### 2.3 Non-Goals (Important)

- No memory reading (avoids anti-cheat risk)
- No automation (clicking / injecting)
- Overlay is read-only advisory

---

## Phase 3 — High-Level Architecture

### 3.1 Tech Stack

**Frontend (Overlay UI)**
- Electron
- React or Vue (React recommended for state-heavy UI)
- Tailwind or CSS modules for quick iteration

**Backend (Local Logic)**
- Node.js (bundled with Electron)
- WebWorker or separate Node process for OCR

**Computer Vision**
- Tesseract.js (text OCR)
- OpenCV.js (image preprocessing)
- Optional: Python + OpenCV via IPC if JS OCR proves weak

---

## Phase 4 — Screen Capture & Image Scanning

### 4.1 Screen Capture Strategy

**Option A: Full Window Capture**
- Capture entire game window at ~5–10 FPS
- Crop relevant regions

**Option B: Region-Based Capture (Preferred)**
- User defines:
  - Item tooltip area
  - Orb tooltip area
- Store coordinates in config
- **Why:** Less OCR noise, better performance.

### 4.2 Calibration Wizard

To handle different resolutions, DPI settings, and window sizes:

1. **Game Window Detection** — Auto-detect game window bounds
2. **Region Selection** — User clicks/drags to define tooltip regions
3. **Percentage-Based Storage** — Store coordinates as percentages relative to game window (not absolute pixels)
4. **Resolution Independence** — Regions scale correctly when window size changes
5. **Recalibration Hotkey** — Quick re-calibration if UI changes

**Config Example:**
```json
{
  "itemTooltipRegion": {
    "x": 0.65,
    "y": 0.20,
    "width": 0.25,
    "height": 0.15
  },
  "orbTooltipRegion": {
    "x": 0.65,
    "y": 0.40,
    "width": 0.25,
    "height": 0.10
  }
}
```

### 4.3 Image Preprocessing Pipeline

Before OCR, always:
1. Convert to grayscale
2. Increase contrast
3. Apply adaptive thresholding
4. Slight blur → sharpen

This dramatically improves OCR accuracy for fantasy fonts.

### 4.4 OCR Targets

**Item Tooltip**

Extract:
- Item name (optional)
- Quality keyword:
  - White / Radiant / Blessed / Holy / Godly
- Current enchant level (+X)

**Orb Tooltip**

Extract:
- Orb name
- Orb tier keyword:
  - Minor / Lesser / Greater / Major / Divine

**Fallback:**
- Color detection (purple, blue, green, etc.) if text fails

---

## Phase 5 — Canonical Data Model

Define strict enums so math never breaks.

```javascript
enum ItemQuality {
  White = 1,
  Radiant = 2,
  Blessed = 3,
  Holy = 4,
  Godly = 5
}

enum OrbQuality {
  Minor = 1,
  Lesser = 2,
  Greater = 3,
  Major = 4,
  Divine = 5
}
```

### Quality Modifiers

```javascript
const ITEM_DIVISOR = {
  1: 1.0,
  2: 1.5,
  3: 3.0,
  4: 6.0,
  5: 8.0
};

const ORB_MULTIPLIER = {
  1: 1.0,
  2: 1.5,
  3: 3.0,
  4: 6.0,
  5: 8.0
};

const MAX_ENCHANT = {
  1: 1,
  2: 3,
  3: 4,
  4: 7,
  5: 10
};
```

---

## Phase 6 — Enchant Math Engine

### 6.1 Success Rate Function

```javascript
function enchantSuccessRate(
  enchantLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): number {
  const penalty = enchantLevel * 7;
  const base = Math.max(0, 100 - penalty);
  const rate = (base / ITEM_DIVISOR[itemQuality]) * ORB_MULTIPLIER[orbQuality];
  return Math.min(100, Math.max(0, rate)); // Clamp 0-100
}
```

### 6.2 Expected Orbs Calculation (Simple)

For a single enchant step (ignoring failure recovery):

```
Expected Orbs = 1 / (SuccessRate / 100)
```

### 6.3 Expected Orbs with Failure Recovery (Recursive Model)

**Critical:** Since failure resets enchant level to 0 (or -1), the true expected cost must include recovery.

```javascript
// Memoized recursive calculation
function expectedOrbsToLevel(
  targetLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality,
  memo: Map<number, number> = new Map()
): number {
  if (targetLevel <= 0) return 0;
  if (memo.has(targetLevel)) return memo.get(targetLevel);

  const successRate = enchantSuccessRate(targetLevel - 1, itemQuality, orbQuality) / 100;
  const failureRate = 1 - successRate;
  
  // Cost to attempt this level
  const attemptCost = 1;
  
  // If we fail, we go back to 0 and must re-climb
  const costFromZero = expectedOrbsToLevel(targetLevel - 1, itemQuality, orbQuality, memo);
  const recoveryCost = failureRate * costFromZero;
  
  // Expected cost = attempt + (probability of failure × cost to get back here)
  // This creates: E[n] = 1 + (1-p) × E[n-1] + (1-p) × E[n]
  // Solving: E[n] = (1 + (1-p) × E[n-1]) / p
  const expected = (attemptCost + failureRate * costFromZero) / successRate;
  
  memo.set(targetLevel, expected);
  return expected;
}

// Total cost from current level to max
function totalExpectedOrbs(
  currentLevel: number,
  maxLevel: number,
  itemQuality: ItemQuality,
  orbQuality: OrbQuality
): number {
  const memo = new Map<number, number>();
  let total = 0;
  for (let level = currentLevel + 1; level <= maxLevel; level++) {
    total += expectedOrbsToLevel(level, itemQuality, orbQuality, memo);
  }
  return total;
}
```

**Example Impact:**
- Without recovery cost: +7 → +8 on Godly with Divine = ~4 orbs
- With recovery cost: +7 → +8 on Godly with Divine = ~15+ orbs (must re-climb on failure)

---

## Phase 7 — Strategy Recommendation Engine

This is where your overlay becomes valuable.

### 7.1 Strategy Types

**Strategy A — Guaranteed Path**
- Always match orb quality to item quality
- Only push high levels with equal-tier orbs
- Safest, most expensive

**Strategy B — Hybrid Cost Optimization**
- Cheap orbs early
- Match-tier orbs only after risk threshold
- Balanced cost vs risk

**Strategy C — Risk-Seeking**
- Lower-tier orbs throughout
- Show expected losses explicitly
- For gambling players

### 7.2 Orb Recommendation Logic

For each enchant step:
1. Simulate all orb tiers
2. Reject success < X% (user configurable)
3. Compute:
   - Expected orbs
   - Expected failures
4. Select lowest expected cost

### 7.3 Warnings System

Trigger warnings if:
- Success rate < 20%
- Expected orbs > 10
- Attempt exceeds max enchant

**Example overlay message:**

> "+8 → +9 has a 24% success rate. Expected cost: 4.1 Divine Orbs."

---

## Phase 8 — Overlay UI Design

### 8.1 Core Panels

**Item Panel**
- Item name
- Quality
- Current enchant / max enchant

**Orb Panel**
- Detected orb (color-coded text)
- Suggested orb (highlighted with matching color)

**Probability Panel**
- Current success %
- Expected orbs remaining
- Failure risk meter

**Strategy Panel**
- Safe path
- Cheapest path
- Aggressive path

### 8.2 UX Principles

- No clutter during combat
- Hotkey toggle
- Color-coded risk (green / yellow / red)

---

## Phase 9 — Calibration & Training

### 9.1 OCR Confidence

- Display confidence score
- Allow manual override dropdowns

### 9.2 Screenshot Dataset

- Collect real in-game tooltips
- Train preprocessing filters

---

## Phase 10 — Safety & Compliance

- No memory scanning
- No automation
- No injection
- Overlay is read-only advisory

**This minimizes ban risk.**

---

## Phase 11 — Future Enhancements

- **OCR Success/Failure Detection** — Detect when item name changes from `Item +N` to `Item +N+1` (success) or loses the `+#` suffix (failure). Auto-log results.
- **Historical Success Tracking** — Log actual attempts vs expected outcomes to validate formula
- **Multi-Item Batch Planner** — Compare total expected cost across multiple items
- **Image-Based Orb Icons** — Replace color-coded text with actual orb images (pending screenshot collection)
- Orb extractor optimization (break-even analysis)
- Community-reported odds validation
- Export enchant plans as text

---

## Final Recommendation

Build this incrementally:

1. **Manual Calculator MVP** — Fully functional calculator with dropdowns, validates math engine
2. **Strategy Comparison View** — Show all three strategies side-by-side for manual input
3. **Electron Shell** — Transparent overlay, hotkey toggle, always-on-top
4. **Calibration Wizard** — User defines tooltip regions with percentage-based coordinates
5. **OCR Item Detection** — Detect item quality and enchant level
6. **OCR Orb Detection** — Detect orb tier
7. **Auto-Recommendation** — Connect OCR output to strategy engine
8. **History/Logging** — Track attempts over time

---

## Next Steps

Ready to begin implementation. Recommended starting point:

1. **Set up project structure** — Next.js or React + Electron scaffold
2. **Implement math engine** — Core success rate and recursive expected cost functions
3. **Build manual calculator UI** — Dropdowns, outputs, color-coded orb display
4. **Test against known scenarios** — Validate math before adding OCR complexity