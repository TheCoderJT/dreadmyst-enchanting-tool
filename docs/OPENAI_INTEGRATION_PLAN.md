# OpenAI Integration Plan - Content Moderation & Screenshot Verification

## Overview

Integrate OpenAI APIs to:
1. **Moderate item names** - Block slurs, profanity, and creative bypass attempts
2. **Moderate display names** - Same as above, but allow @ symbols for Discord usernames
3. **Verify screenshots** - Confirm users actually enchanted the items they claim

---

## ✅ IMPLEMENTATION STATUS

### Completed Features

| Feature | Status | Location |
|---------|--------|----------|
| Display Name Moderation | ✅ Done | `convex/moderation.ts` |
| Item Name Validation (Affix DB) | ✅ Done | `convex/validation.ts` + `convex/sessions.ts` |
| Affix Database (4,677 affixes) | ✅ Done | `validAffixes` table in Convex |
| Item Autocomplete Dropdown | ✅ Done | `EnchantTracker.tsx` |
| Rarity Auto-Detection | ✅ Done | `EnchantTracker.tsx` |
| Server-Side Validation | ✅ Done | `convex/sessions.ts` |
| +Level Rejection | ✅ Done | Client + Server |
| Rarity Mismatch Prevention | ✅ Done | Client + Server |
| Screenshot Verification | ✅ Done | `convex/verification.ts` + `ScreenshotVerification` component |
| Rate Limiting | ✅ Done | `convex/verification.ts` (rateLimits table) |
| EXIF Metadata Detection | ✅ Done | `ScreenshotVerification.tsx` (detects editing software) |
| UploadThing File Cleanup | ✅ Done | `api/uploadthing/delete/route.ts` + `EnchantTracker.tsx` |
| Leaderboard Pagination | ✅ Done | `Leaderboard.tsx` (Load More button) |
| Unluckiest Filter | ✅ Done | `convex/leaderboard.ts` + `Leaderboard.tsx` |
| Website Logo | ✅ Done | `src/components/Logo/Logo.tsx` |
| Mobile Responsive Design | ✅ Done | CSS Modules with clamp(), mobile-first |
| Hamburger Menu (Mobile/Tablet) | ✅ Done | `page.tsx` + `page.module.css` |

### Server-Side Protection (Cannot Bypass with Dev Tools)

| Protection | How It Works |
|------------|-------------|
| Display Name | OpenAI moderation runs in Convex action before saving |
| Item Name (+level) | Server rejects any name with `+\d+` pattern |
| Item Name (rarity) | Server checks rarity in name matches `itemQuality` param |
| Item Name (affix) | Server checks affix exists in `validAffixes` table (4,677 entries) |
| Authentication | All mutations require valid user session |

---

## Phase 1: Text Moderation

### Item Name Validation (Affix System - No AI)

**Note:** Item names are validated using the **Affix Database System**, not OpenAI moderation. This is more reliable and cost-effective since item names must match valid game affixes.

**How it works:**
- Server checks item name against `validAffixes` table (4,677 entries)
- Rejects names with `+level` patterns
- Validates rarity in name matches selected quality
- No API calls needed - instant validation

### Display Name Moderation (OpenAI)

**Model Selection:**
- **Model**: `gpt-4o-mini` (cost-effective, fast, good at text analysis)
- **Max Tokens**: 50 (only need a simple yes/no + reason)
- **Temperature**: 0 (deterministic responses)

**Implementation:**
```
When: Before creating/updating user profile (getOrCreateProfile mutation)
Input: Display name string
Output: { allowed: boolean, reason?: string }
Allowed Characters: Letters, numbers, spaces, underscores, hyphens, @ symbol (for Discord names)
```

### Moderation Prompt Strategy
The prompt will instruct the model to detect:
- Direct slurs and profanity
- Leetspeak variations (N1gg3r, f4gg0t, etc.)
- Symbol substitutions (a$$, sh!t, etc.)
- Unicode lookalikes (using Cyrillic or other scripts)
- Creative spacing/formatting bypasses
- Hate speech, discriminatory terms
- Racist words and slurs
- Homophobic/transphobic slurs
- Sexual/explicit content
- Violent threats

### Allowed in Display Names
- @ symbol (e.g., @MyDiscordName)
- Numbers
- Underscores and hyphens
- Standard letters and spaces

### Token Budget (Display Name Only)
- System prompt: ~200 tokens
- Text input: ~30 tokens max
- Response: ~50 tokens
- **Total per request**: ~280 tokens
- **Cost**: ~$0.00004 per moderation (at $0.15/1M input, $0.60/1M output)

---

## Phase 2: Screenshot Verification

### Model Selection
- **Model**: `gpt-4o-mini` (supports vision, cost-effective)
- **Detail Level**: `low` (fixed 2833 base tokens - sufficient for UI verification)
- **Max Tokens**: 200 (need structured response with extracted data)
- **Temperature**: 0

### Rate Limits (Tier 3)
- Same as above, but image tokens count toward TPM
- With `detail: low`, each image = 2833 tokens
- At 4M TPM, can process ~1,400 images/minute (more than enough)

### When to Verify
- **Optional**: User can upload screenshot when item is completed
- **Incentive**: Verified items get a "✓ Verified" badge on leaderboard
- **Not Required**: Users can still submit without verification

### Verification Process
```
1. User completes item (hits max enchant)
2. Optional: User uploads screenshot of their inventory/item
3. System sends screenshot to GPT-4o-mini vision
4. Model extracts:
   - Item name visible in screenshot
   - Enchant level visible (+X)
   - Item quality/color if visible
5. Compare extracted data with session data
6. Mark as verified if match, flag if mismatch
```

### Vision Prompt Strategy
The model will be instructed to:
- Look for Dreadmyst game UI elements
- Find item name text
- Find enchant level indicator (+1, +2, etc.)
- Identify item quality by color/border
- Return structured JSON response

### Token Budget (detail: low)
- System prompt: ~300 tokens
- Image: 2833 tokens (fixed for low detail)
- Response: ~200 tokens
- **Total per request**: ~3,333 tokens
- **Cost**: ~$0.0005 per verification

---

## Phase 3: Rate Limiting Implementation

### Application-Level Rate Limits
Even with generous Tier 3 limits, implement app-level limits to:
- Prevent abuse
- Control costs
- Ensure fair usage

### Proposed Limits

| Action | Limit | Window |
|--------|-------|--------|
| Item name moderation | 10 per user | per minute |
| Display name moderation | 5 per user | per minute |
| Screenshot verification | 5 per user | per hour |
| Global text moderation | 1000 | per minute |
| Global verification | 500 | per hour |

### Implementation
- Use Convex's built-in rate limiting with `authRateLimits` table
- Track per-user and global usage
- Return friendly error messages when limits exceeded

---

## Phase 4: Database Schema Updates

### New Fields

**enchantSessions table**
```typescript
screenshotUrl: v.optional(v.string()),        // Uploaded screenshot URL
verificationStatus: v.optional(v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("failed"),
  v.literal("skipped")
)),
verificationDetails: v.optional(v.string()),  // AI response details
```

**completedItems table**
```typescript
isVerified: v.boolean(),                      // Whether screenshot verified
verifiedAt: v.optional(v.number()),           // Timestamp of verification
```

### New Table: moderationLogs
```typescript
moderationLogs: defineTable({
  userId: v.id("users"),
  itemName: v.string(),
  allowed: v.boolean(),
  reason: v.optional(v.string()),
  timestamp: v.number(),
})
```

---

## Phase 5: Environment Variables

### Required
```env
OPENAI_API_KEY=sk-...
```

### Optional Configuration
```env
OPENAI_MODERATION_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS_MODERATION=50
OPENAI_MAX_TOKENS_VISION=200
```

---

## Phase 6: Convex Actions

### New Files

**convex/openai.ts** - OpenAI client setup and helpers
```typescript
- initOpenAI(): OpenAI client
- moderateItemName(name: string): Promise<ModerationResult>
- verifyScreenshot(imageUrl: string, expectedData: SessionData): Promise<VerificationResult>
```

**convex/moderation.ts** - Moderation action
```typescript
- moderateItemName: action
  - Input: { itemName: string }
  - Output: { allowed: boolean, reason?: string }
```

**convex/verification.ts** - Screenshot verification action
```typescript
- verifyCompletion: action
  - Input: { sessionId: Id<"enchantSessions">, screenshotUrl: string }
  - Output: { verified: boolean, extractedData: object, reason?: string }
```

---

## Phase 7: UI Updates

### Item Name Input
- Show real-time moderation status
- Display error message if name rejected
- Suggest alternatives if possible

### Completion Screen
- Add "Upload Screenshot for Verification" button
- Show upload progress
- Display verification result (✓ Verified / ⚠ Could not verify)

### Leaderboard
- Add "✓" badge next to verified items
- Optional filter: "Show only verified"

---

## Implementation Order

1. **Set up OpenAI client in Convex** (convex/openai.ts)
2. **Implement item name moderation** (convex/moderation.ts)
3. **Integrate moderation into startSession**
4. **Update schema for verification fields**
5. **Implement screenshot verification** (convex/verification.ts)
6. **Add screenshot upload to completion UI**
7. **Update leaderboard with verification badges**
8. **Add rate limiting**
9. **Testing & edge cases**

---

## Cost Estimates

### Per-User Session (typical)
- 1 item name moderation: ~$0.00004
- 1 screenshot verification: ~$0.0005
- **Total**: ~$0.00054 per completed item

### Monthly Estimates (1000 active users, 10 items each)
- Moderations: 10,000 × $0.00004 = $0.40
- Verifications: 10,000 × $0.0005 = $5.00
- **Total**: ~$5.40/month

### Abuse Prevention Savings
- Rate limits prevent runaway costs
- Moderation prevents re-submissions
- Verification is optional (user-initiated)

---

## Security Considerations

1. **API Key Storage**: Store in Convex environment variables (never client-side)
2. **Input Sanitization**: Limit item name length (max 50 chars)
3. **Image Size Limits**: Max 5MB per screenshot
4. **Rate Limiting**: Prevent API abuse
5. **Logging**: Track all moderation decisions for review

---

## Fallback Behavior

### If OpenAI API is down
- Item name moderation: Allow submission with warning, queue for later review
- Screenshot verification: Skip verification, mark as "unverified"

### If rate limited
- Show friendly message: "Too many requests, please try again in X minutes"
- Queue request for retry (for moderation only)

---

## Leaderboard UI Design Concepts

### Design Requirements
- **Full width** - No boxed/card layout, spans entire page width
- **Tablet-style** - Data presented in clean table/row format
- **Filters** - Sort and filter by quality, date, success rate, verified status
- **User attribution** - Display name shown on every completed item
- **Screenshot gallery** - Verified items can show their proof screenshots

---

### Concept 1: "The Enchanter's Chronicle" (Medieval Scroll Style)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ⚔️ THE ENCHANTER'S CHRONICLE                                          [Filters ▼]     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  COMMUNITY STATS BAR (horizontal, full width)                                           │
│  👥 1,247 Enchanters  │  ⚔️ 8,432 Items Maxed  │  🎯 47.2% Global Rate  │  💎 2.1M Orbs │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─ FILTER BAR ─────────────────────────────────────────────────────────────────────┐  │
│  │ Quality: [All ▼]  Sort: [Recent ▼]  Verified: [All ▼]  Search: [_____________]  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  RANK │ ITEM                    │ PLAYER          │ LEVEL │ RATE  │ ATTEMPTS │ STATUS  │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│   1   │ Godly Blade of Shadows  │ @ShadowMaster   │  +10  │ 62.3% │    47    │ ✓ [📷]  │
│  ───────────────────────────────────────────────────────────────────────────────────   │
│   2   │ Holy Amulet of Light    │ @LightBringer   │  +8   │ 58.1% │    31    │ ✓ [📷]  │
│  ───────────────────────────────────────────────────────────────────────────────────   │
│   3   │ Blessed Ring of Fortune │ EnchantKing2024 │  +6   │ 51.2% │    22    │    ○    │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
│  [📷] = Click to view verification screenshot in modal                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Horizontal stats bar at top (full width)
- Clean table rows with alternating subtle backgrounds
- Rank column with special styling for top 3 (gold/silver/bronze)
- Camera icon [📷] opens screenshot modal for verified items
- Elegant divider lines between rows

---

### Concept 2: "Live Feed" (Social Media Timeline Style)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  🏆 COMMUNITY LEADERBOARD                                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─ STATS RIBBON ───────────────────────────────────────────────────────────────────┐  │
│  │ 👥 1,247    ⚔️ 8,432    🎯 47.2%    💎 2.1M    🔥 @LuckyOne (68.2%)             │  │
│  │ Players    Maxed       Rate        Orbs       Luckiest                           │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─ FILTERS ────────────────────────────────────────────────────────────────────────┐  │
│  │ [Recent] [Luckiest] [Most Attempts] [Verified Only]  │  Quality: [All ▼]        │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ✓ VERIFIED                                                           2 min ago  │  │
│  │ ─────────────────────────────────────────────────────────────────────────────── │  │
│  │ @ShadowMaster maxed Godly Blade of Shadows to +10                               │  │
│  │                                                                                  │  │
│  │ ┌─────────────────────────────────────────────────────────────────────────────┐ │  │
│  │ │  [SCREENSHOT PREVIEW - 200px height, full row width, click to expand]      │ │  │
│  │ └─────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │ 📊 47 attempts  │  🎯 62.3% success  │  🔥 Best streak: 5  │  💎 47 orbs used   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ UNVERIFIED                                                         15 min ago │  │
│  │ ─────────────────────────────────────────────────────────────────────────────── │  │
│  │ EnchantKing2024 maxed Holy Amulet of Light to +8                                │  │
│  │                                                                                  │  │
│  │ 📊 31 attempts  │  🎯 58.1% success  │  🔥 Best streak: 4  │  💎 31 orbs used   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Each completion is a full-width "post" in a timeline
- Verified items show inline screenshot preview (expandable)
- Timestamp in top-right corner
- Stats displayed as horizontal pill badges
- Clear visual distinction between verified/unverified

---

### Concept 3: "Data Dashboard" (Analytics Style)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  📊 ENCHANTING ANALYTICS                                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─ GLOBAL METRICS ─────────────────────────────────────────────────────────────────┐  │
│  │                                                                                   │  │
│  │   1,247          8,432           47.2%          2.1M           @LuckyOne         │  │
│  │   ━━━━━          ━━━━━           ━━━━━          ━━━━           ━━━━━━━━          │  │
│  │   Players        Items           Success        Orbs           Top Player        │  │
│  │                  Maxed           Rate           Used           (68.2%)           │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─ QUALITY BREAKDOWN ──────────────────────────────────────────────────────────────┐  │
│  │  White: 52.1%  │  Radiant: 48.3%  │  Blessed: 44.7%  │  Holy: 41.2%  │  Godly: 38.9% │
│  │  ████████████     ██████████        ████████          ███████         ██████     │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─ FILTER CONTROLS ────────────────────────────────────────────────────────────────┐  │
│  │ View: [Table ▼]  Quality: [All ▼]  Sort: [Recent ▼]  [✓ Verified Only]  🔍 [...] │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  PLAYER            ITEM                      QUALITY   +LVL   RATE    DATE      PROOF  │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  @ShadowMaster     Godly Blade of Shadows    ● Godly    +10   62.3%   2m ago    [👁️]   │
│  @LightBringer     Holy Amulet of Light      ● Holy     +8    58.1%   15m ago   [👁️]   │
│  EnchantKing2024   Blessed Ring of Fortune   ● Blessed  +6    51.2%   1h ago     —     │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
│  [👁️] = View screenshot proof                                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Large metric numbers at top with labels below
- Visual progress bars for quality breakdown
- Compact table with quality color indicators (● dots)
- Eye icon for viewing proof screenshots
- Toggle for "Verified Only" filter

---

### Concept 4: "Enchanter's Hall of Fame" (Trophy Room Style)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  🏛️ HALL OF FAME                                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                           🥇 TOP ENCHANTERS THIS WEEK 🥇                                │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                   │
│  │      🥇 #1          │      🥈 #2          │      🥉 #3          │                   │
│  │   @ShadowMaster     │   @LightBringer     │   @OrbWhisperer     │                   │
│  │   12 items maxed    │   9 items maxed     │   7 items maxed     │                   │
│  │   62.3% avg rate    │   58.1% avg rate    │   55.4% avg rate    │                   │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                   │
│                                                                                         │
│  ┌─ COMMUNITY PULSE ────────────────────────────────────────────────────────────────┐  │
│  │ 👥 1,247 Enchanters  ⚔️ 8,432 Maxed  🎯 47.2% Rate  💎 2.1M Orbs  ✓ 3,201 Verified│  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌─ FILTERS ────────────────────────────────────────────────────────────────────────┐  │
│  │ [All] [Godly Only] [Verified ✓] [This Week] [This Month]  │  Search: [________]  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  #  │ ENCHANTER        │ ITEM                    │ +LVL │ SUCCESS │ PROOF             │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│  1  │ @ShadowMaster    │ Godly Blade of Shadows  │ +10  │ 62.3%   │ ✓ [View]          │
│     │                  │ ┌─────────────────────────────────────────────────────────┐  │
│     │                  │ │ [INLINE SCREENSHOT THUMBNAIL - expands on hover/click] │  │
│     │                  │ └─────────────────────────────────────────────────────────┘  │
│  ───────────────────────────────────────────────────────────────────────────────────   │
│  2  │ @LightBringer    │ Holy Amulet of Light    │ +8   │ 58.1%   │ ✓ [View]          │
│  ───────────────────────────────────────────────────────────────────────────────────   │
│  3  │ EnchantKing2024  │ Blessed Ring            │ +6   │ 51.2%   │ ○ Unverified      │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Top 3 players highlighted in podium-style section
- Inline screenshot thumbnails that expand on interaction
- Time-based filters (This Week, This Month)
- Verified count shown in community stats
- Player name is the primary column (enchanter-focused)

---

### Concept 5: "The Forge Log" (Minimalist Dark Terminal Style)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  > FORGE_LOG v2.0                                                    [LIVE] ● ● ●      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─ SYSTEM STATUS ──────────────────────────────────────────────────────────────────┐  │
│  │ USERS: 1247 | ITEMS_MAXED: 8432 | GLOBAL_RATE: 47.2% | ORBS_CONSUMED: 2.1M       │  │
│  │ LUCKIEST: @LuckyOne (68.2%) | MOST_DEDICATED: @GrindMaster (847 attempts)        │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  > FILTER: [quality:all] [sort:recent] [verified:all] [search:___________] [APPLY]     │
│                                                                                         │
│  ════════════════════════════════════════════════════════════════════════════════════  │
│  TIMESTAMP    USER              ITEM                      +LVL  RATE   STATUS   IMG    │
│  ════════════════════════════════════════════════════════════════════════════════════  │
│  00:02:14     @ShadowMaster     Godly_Blade_of_Shadows    +10   62.3%  [VRFD]   [>>]   │
│  00:15:47     @LightBringer     Holy_Amulet_of_Light      +8    58.1%  [VRFD]   [>>]   │
│  01:23:09     EnchantKing2024   Blessed_Ring_of_Fortune   +6    51.2%  [----]    --    │
│  02:45:33     @OrbWhisperer     Radiant_Staff_of_Power    +4    49.8%  [VRFD]   [>>]   │
│  ════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                         │
│  > [>>] = EXPAND_IMAGE                                                                  │
│  > [VRFD] = VERIFIED | [----] = PENDING_VERIFICATION                                   │
│                                                                                         │
│  ┌─ IMAGE_VIEWER ───────────────────────────────────────────────────────────────────┐  │
│  │                                                                                   │  │
│  │  [FULL WIDTH SCREENSHOT DISPLAY AREA - appears when [>>] is clicked]             │  │
│  │  [Shows verification screenshot with item details overlay]                        │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  > END_OF_LOG                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Terminal/console aesthetic with monospace feel
- Timestamps shown prominently
- Underscores in item names for terminal authenticity
- [VRFD] status codes
- [>>] expands to show full-width screenshot below the row
- "LIVE" indicator suggests real-time updates

---

## Design Comparison Matrix

| Feature                    | Chronicle | Live Feed | Dashboard | Hall of Fame | Forge Log |
|----------------------------|-----------|-----------|-----------|--------------|-----------|
| Full Width Layout          | ✓         | ✓         | ✓         | ✓            | ✓         |
| Table/Row Style            | ✓         | Posts     | ✓         | ✓            | ✓         |
| Inline Screenshots         | Modal     | Inline    | Modal     | Thumbnail    | Expandable|
| Player Name Prominent      | ✓         | ✓         | ✓         | ✓✓           | ✓         |
| Filters                    | Dropdown  | Tabs      | Controls  | Tabs         | Terminal  |
| Community Stats            | Bar       | Ribbon    | Metrics   | Pulse        | Status    |
| Top Players Section        | ○         | ○         | ○         | ✓ (Podium)   | ○         |
| Verified Badge             | ✓ [📷]    | ✓ VERIFIED| [👁️]      | ✓ [View]     | [VRFD]    |
| Visual Style               | Medieval  | Social    | Analytics | Trophy Room  | Terminal  |
| Mobile Friendly            | Good      | Excellent | Good      | Good         | Fair      |

---

## Recommended: Concept 2 "Live Feed" or Concept 4 "Hall of Fame"

**Live Feed** is best if you want:
- Social/community feel
- Large inline screenshot previews
- Mobile-first design
- Engagement-focused

**Hall of Fame** is best if you want:
- Gamification (top 3 podium)
- Player recognition
- Competitive feel
- Screenshot thumbnails with expand

---

## Ready to Implement?

~~Once this plan is approved, implementation will proceed in the order listed above.~~
~~Estimated implementation time: 2-3 hours.~~

**UPDATE: Core features implemented!**

---

## Implementation Details

### Display Name Moderation (`convex/moderation.ts`)

**Flow:**
1. User enters display name in EnchantTracker
2. Client calls `updateDisplayNameWithModeration` action
3. Server performs local checks (empty, length, obvious profanity)
4. Server calls OpenAI `gpt-4o-mini` for nuanced moderation
5. If rejected, returns error to client
6. If approved, updates user profile

**Prompt Strategy:**
- Allows gaming names, numbers, @ symbols (Discord)
- Rejects profanity, slurs, hate speech, sexual content
- Fails open (allows name if API unavailable)

### Item Name Validation (`convex/validation.ts` + `convex/sessions.ts`)

**Client-Side (UX feedback):**
- `validateItemName` query shows real-time validation status
- `suggestItemNames` query powers autocomplete dropdown
- Auto-detects rarity and syncs dropdown
- Shows ✓ Valid / ⚠ Partial / ✗ Invalid indicators

**Server-Side (security):**
- Rejects +level in item name
- Validates rarity matches selected quality
- Checks affix exists in database (exact or partial match)
- All checks in `startSession` mutation

### Affix Database

**Source:** Scraped from dreadmystdb.com/database/affixes
**Count:** 4,677 unique affixes
**Table:** `validAffixes` with `by_name` index
**Seeding:** `scripts/seed_via_convex.js`

### Files Created/Modified

```
convex/
├── moderation.ts      # NEW - OpenAI display name moderation
├── validation.ts      # NEW - Item name validation + autocomplete
├── sessions.ts        # MODIFIED - Server-side validation added
└── schema.ts          # MODIFIED - Added validAffixes table

src/components/EnchantTracker/
├── EnchantTracker.tsx        # MODIFIED - Autocomplete, validation UI
└── EnchantTracker.module.css # MODIFIED - Dropdown styles

scripts/
├── scrape_affixes.py         # NEW - Playwright scraper
├── seed_via_convex.js        # NEW - Database seeder
├── affixes.json              # NEW - Raw scraped data
└── affixes_array.json        # NEW - Clean affix list
```

---

## ✅ ALL FEATURES IMPLEMENTED

### Screenshot Verification (Phase 2) - COMPLETE
- User uploads screenshot when item completed
- OpenAI Vision (`gpt-4o-mini` with `detail: low`) extracts item name and +level
- Compares extracted data with session data
- "✓ Verified" badge shown on leaderboard and completed items
- Files: `convex/verification.ts`, `src/components/ScreenshotVerification/`

### Rate Limiting (Phase 3) - COMPLETE
- `rateLimits` table tracks per-user API usage
- Screenshot verification: 5 per hour per user
- Display name moderation: 5 per minute per user
- Friendly error messages when rate limited

### New Schema Fields Added

**enchantSessions table:**
- `screenshotUrl` - URL of uploaded verification screenshot
- `verificationStatus` - "pending" | "verified" | "failed" | "skipped"
- `verificationDetails` - JSON string with AI response details

**completedItems table:**
- `isVerified` - Boolean indicating verification status
- `verifiedAt` - Timestamp of successful verification
- `screenshotUrl` - URL of verification screenshot

**rateLimits table (NEW):**
- `userId` - User ID
- `action` - Action type ("screenshot_verification", "display_name_moderation")
- `count` - Number of requests in current window
- `windowStart` - Timestamp when window started

### Files Created

```
convex/
├── verification.ts              # NEW - Screenshot verification + rate limiting
└── schema.ts                    # MODIFIED - Added verification fields + rateLimits table

src/components/ScreenshotVerification/
├── ScreenshotVerification.tsx   # NEW - Upload & verify UI component
└── ScreenshotVerification.module.css  # NEW - Component styles

src/components/EnchantTracker/
├── EnchantTracker.tsx           # MODIFIED - Added verification UI to completed items
└── EnchantTracker.module.css    # MODIFIED - Added verification styles

convex/leaderboard.ts            # MODIFIED - Added verified filter + totalVerified stat
```

---

## Recent Updates (January 2026)

### Anti-Cheat: EXIF Metadata Detection

**Purpose:** Detect screenshots edited with image editing software before upload.

**Implementation:** `src/components/ScreenshotVerification/ScreenshotVerification.tsx`

**How it works:**
1. Before uploading, reads first 64KB of image file
2. Parses JPEG EXIF/APP markers for metadata
3. Searches for 25+ known editing software signatures
4. Rejects upload if editing software detected

**Detected Software:**
- Adobe (Photoshop, Lightroom, Capture One)
- Open Source (GIMP, Darktable, RawTherapee)
- Consumer (Paint.NET, Pixlr, Canva, Snapseed)
- Professional (Affinity, Corel, Luminar)
- Viewers with editing (IrfanView, XnView, FastStone, ACDSee)

**Limitations:**
- Users can strip EXIF metadata before uploading
- Software not in list won't be detected
- Taking screenshot of edited image bypasses detection

### UploadThing File Cleanup

**Purpose:** Delete screenshots from UploadThing storage when user deletes completed item.

**Files:**
- `src/app/api/uploadthing/delete/route.ts` - API endpoint for file deletion
- `src/components/EnchantTracker/EnchantTracker.tsx` - Calls delete API after DB deletion

**Flow:**
1. User clicks delete on completed item
2. `deleteCompletedItem` mutation removes DB record
3. If item had screenshot, extract file key from URL
4. POST to `/api/uploadthing/delete` with file key
5. UploadThing removes file from storage

### Leaderboard Enhancements

**Pagination (Load More):**
- Initial load: 50 items
- "Load More" button adds 50 more each click
- Uses `displayLimit` state that increases by `ITEMS_PER_PAGE`

**Unluckiest Filter:**
- New query: `convex/leaderboard.ts` → `getUnluckiest`
- Orders by `successRate` ascending (lowest first)
- Shows users with worst luck (lowest success rates)

**Filter Options:**
| Filter | Description |
|--------|-------------|
| Recent | Most recently completed items |
| Luckiest | Highest success rates |
| Unluckiest | Lowest success rates |
| ✓ Verified | Only screenshot-verified items |

### Website Logo Component

**Files:**
- `src/components/Logo/Logo.tsx` - SVG logo with animated sparkles
- `src/components/Logo/Logo.module.css` - Responsive styling

**Design:**
- Purple/indigo orb with radial gradient
- Blue-purple-pink glow ring
- Gold animated sparkles at 4 corners
- White "+" symbol in center
- Two-line text: "Dreadmyst" (brand) + "Enchanting Calculator" (subtitle)

**Props:**
- `size`: "small" | "medium" | "large"
- `showText`: boolean

### Mobile Responsive Design

**Approach:** Mobile-first CSS with `min-width` media queries

**Key Features:**
- Fluid typography using `clamp()`
- `rem`/`em` units instead of fixed `px`
- `overflow-x: hidden` on all containers to prevent horizontal scroll
- Touch-friendly targets (min 44x44px)

**Breakpoints:**
- Mobile (default): No media query
- Small: `@media (min-width: 640px)`
- Tablet: `@media (min-width: 768px)`
- Laptop: `@media (min-width: 1024px)`
- Desktop: `@media (min-width: 1280px)`

### Hamburger Menu (Mobile/Tablet)

**Implementation:** `src/app/page.tsx` + `src/app/page.module.css`

**Behavior:**
- Shows on screens < 1024px
- Animated hamburger icon (transforms to X when open)
- Full-screen overlay menu
- Contains all navigation tabs + user menu

---

## 🚧 PLANNED FEATURES (Not Yet Implemented)

### Admin Dashboard & Moderation Tools

**Purpose:** Allow admins to moderate tracker submissions and manage users.

**Requirements:**
- Admin-only page accessible to users with `role: "admin"`
- View all submitted completions with filtering/search
- Ability to delete/hide suspicious submissions
- User management (view user profiles, submission history)

**Mod Tools:**
- **Ban System**: Ban users for abuse of submission guidelines
  - Temporary bans (1 day, 7 days, 30 days)
  - Permanent bans
  - Ban reason tracking
  - Banned users cannot submit new items or verify screenshots
- **Submission Review Queue**: Flag suspicious submissions for review
- **Audit Log**: Track all moderation actions

**Database Changes Needed:**
```typescript
// Add to users table or create userProfiles table
role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("moderator"))),
isBanned: v.optional(v.boolean()),
banReason: v.optional(v.string()),
bannedAt: v.optional(v.number()),
bannedUntil: v.optional(v.number()), // null = permanent

// New table: moderationActions
moderationActions: defineTable({
  moderatorId: v.id("users"),
  targetUserId: v.id("users"),
  action: v.union(v.literal("ban"), v.literal("unban"), v.literal("delete_submission"), v.literal("warn")),
  reason: v.string(),
  timestamp: v.number(),
  details: v.optional(v.string()),
})
```

### Submission Guidelines

**Purpose:** Clear rules for what constitutes valid submissions.

**Guidelines to Create:**
1. Screenshots must be unedited original game captures
2. Item must be visible with enchant level clearly shown
3. No duplicate submissions for same item
4. Display names must not contain offensive content
5. No impersonation of other players
6. No exploiting bugs or glitches

**Enforcement:**
- First offense: Warning
- Second offense: 7-day ban
- Third offense: Permanent ban

### Security Rate Limiting (DDoS/Spam/Brute Force Protection)

**Purpose:** Protect the application from abuse and attacks.

**Rate Limits to Implement:**

| Action | Limit | Window | Scope |
|--------|-------|--------|-------|
| Login attempts | 5 | per minute | per IP |
| Session creation | 10 | per minute | per user |
| Screenshot uploads | 5 | per hour | per user |
| Display name changes | 3 | per hour | per user |
| API requests (global) | 100 | per minute | per IP |
| Leaderboard queries | 30 | per minute | per IP |

**Implementation Approach:**
- Use Convex rate limiting with `rateLimits` table
- Track by user ID for authenticated actions
- Track by IP for unauthenticated actions (login, public queries)
- Return 429 Too Many Requests with retry-after header

**Brute Force Protection:**
- Lock account after 10 failed login attempts
- Require CAPTCHA after 3 failed attempts
- Exponential backoff on repeated failures

---

## ❌ FEATURES NOT PLANNED

The following features were considered but will **not** be implemented:

| Feature | Reason |
|---------|--------|
| AI Item Name Moderation | Affix database system handles this more reliably |
| Image Forensics API | Too expensive, EXIF detection is sufficient |
| Community Reporting | Adds complexity, admin review is sufficient |
| Video Verification | Overkill for this use case |

---

## Files Created/Modified (Recent)

```
src/app/api/uploadthing/delete/
└── route.ts                    # NEW - UploadThing file deletion endpoint

src/components/Logo/
├── Logo.tsx                    # NEW - Animated SVG logo component
└── Logo.module.css             # NEW - Logo responsive styles

src/components/ScreenshotVerification/
└── ScreenshotVerification.tsx  # MODIFIED - Added EXIF metadata detection

src/components/EnchantTracker/
└── EnchantTracker.tsx          # MODIFIED - UploadThing cleanup on delete

src/components/Leaderboard/
├── Leaderboard.tsx             # MODIFIED - Load More, Unluckiest filter
└── Leaderboard.module.css      # MODIFIED - Load More button styles

convex/
└── leaderboard.ts              # MODIFIED - Added getUnluckiest query

src/app/
├── page.tsx                    # MODIFIED - Logo component, hamburger menu
├── page.module.css             # MODIFIED - Mobile responsive, hamburger styles
└── globals.css                 # MODIFIED - overflow-x: hidden, fluid font-size
