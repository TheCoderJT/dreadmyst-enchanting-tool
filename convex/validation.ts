import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// Item rarities in the game
const ITEM_RARITIES = [
  "white", "radiant", "blessed", "holy", "godly"
];

// Known item types (weapons, armor, accessories)
const ITEM_TYPES = [
  // Weapons - Melee
  "sword", "axe", "hammer", "dagger", "mace", "cleaver", "reaper", 
  "shank", "slicer", "blade", "blades", "spear", "polearm", "halberd",
  // Weapons - Ranged
  "bow", "longbow", "greatbow", "crossbow", "shortbow",
  // Weapons - Magic
  "staff", "staves", "wand", "wands", "scepter", "orb",
  // Shields
  "shield", "defender", "barricade", "buckler", "bulwark",
  // Head
  "helm", "helmet", "cap", "crown", "hood", "mask", "coif", "circlet", "headpiece",
  // Chest
  "chainmail", "chestplate", "vest", "robe", "tunic", "jerkin", "hauberk", 
  "breastplate", "cuirass", "armor", "mail", "plate",
  // Hands
  "gauntlets", "gloves", "bracers", "vambraces", "handguards", "mitts",
  // Feet
  "greaves", "boots", "slippers", "sabatons", "shoes", "footwraps", "treads",
  // Legs
  "leggings", "pants", "tassets", "legguards", "cuisses",
  // Shoulders
  "pauldrons", "shoulders", "spaulders", "mantle",
  // Accessories
  "ring", "rings", "necklace", "amulet", "pendant", "choker",
  "belt", "sash", "girdle",
  "cloak", "cape", "mantle",
  // Generic
  "gear", "equipment", "item"
];

// Get all valid affixes from the database
export const getAllAffixes = query({
  args: {},
  handler: async (ctx) => {
    const affixes = await ctx.db.query("validAffixes").collect();
    return affixes.map(a => a.affixName);
  },
});

// Check if an affix exists
export const checkAffix = query({
  args: { affixName: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.affixName.toLowerCase().trim();
    const affix = await ctx.db
      .query("validAffixes")
      .withIndex("by_name", (q) => q.eq("affixName", normalized))
      .first();
    return affix !== null;
  },
});

// Validate an item name - returns validation result with details
export const validateItemName = query({
  args: { itemName: v.string() },
  handler: async (ctx, args) => {
    // Remove any +level suffix (e.g., "+3", "+10") - we only track from 0
    const cleanedName = args.itemName.replace(/\s*\+\d+\s*$/, '').trim();
    const itemName = cleanedName.toLowerCase();
    const words = itemName.split(/\s+/);
    
    // Check if user included enchantment level
    const hasEnchantLevel = /\+\d+/.test(args.itemName);
    if (hasEnchantLevel) {
      return {
        isValid: false,
        score: 0,
        foundRarity: null,
        foundType: null,
        hasAffixPattern: false,
        affixValid: false,
        potentialAffix: "",
        issues: ["Please enter the item name without the +level (e.g., 'Blessed Sword of the Abjurer' not 'Blessed Sword of the Abjurer +3'). We track items from +0 to max."],
        suggestion: "Remove the +level from your item name",
      };
    }
    
    // Check for rarity
    const foundRarity = ITEM_RARITIES.find(r => words.includes(r));
    
    // Check for item type
    const foundType = ITEM_TYPES.find(t => words.includes(t));
    
    // Check for "of the" or "of" pattern (indicates affix)
    const hasAffixPattern = itemName.includes(" of the ") || itemName.includes(" of ");
    
    // Extract potential affix name (everything after "of the" or "of")
    let potentialAffix = "";
    const ofTheMatch = itemName.match(/of the (.+?)(?:\s*\+\d+)?$/i);
    const ofMatch = itemName.match(/of (.+?)(?:\s*\+\d+)?$/i);
    
    if (ofTheMatch) {
      potentialAffix = ofTheMatch[1].trim();
    } else if (ofMatch) {
      potentialAffix = ofMatch[1].trim();
    }
    
    // Check if affix exists in database
    let affixValid = false;
    if (potentialAffix) {
      // Try exact match first
      const exactAffix = await ctx.db
        .query("validAffixes")
        .withIndex("by_name", (q) => q.eq("affixName", `of the ${potentialAffix}`))
        .first();
      
      if (exactAffix) {
        affixValid = true;
      } else {
        // Try partial match - check if any affix contains our words
        const allAffixes = await ctx.db.query("validAffixes").collect();
        const affixWords = potentialAffix.split(/\s+/);
        affixValid = allAffixes.some(a => {
          const dbWords = a.affixName.toLowerCase().split(/\s+/);
          return affixWords.every(w => dbWords.includes(w));
        });
      }
    }
    
    // Calculate validation score
    let score = 0;
    const issues: string[] = [];
    
    if (foundRarity) score += 20;
    else issues.push("No valid rarity found (White, Radiant, Blessed, Holy, Godly)");
    
    if (foundType) score += 20;
    else issues.push("No recognized item type found");
    
    if (hasAffixPattern) score += 20;
    else issues.push("Missing 'of' or 'of the' pattern");
    
    // Affix validation is now worth more - it's the key anti-troll measure
    if (affixValid) score += 40;
    else if (potentialAffix) issues.push(`Affix "${potentialAffix}" not found in database`);
    else issues.push("No valid affix found");
    
    // Determine if we should allow it
    // MUST have a valid affix (score >= 40 from affix alone) plus at least one other component
    const isValid = affixValid && score >= 60;
    
    return {
      isValid,
      score,
      foundRarity,
      foundType,
      hasAffixPattern,
      affixValid,
      potentialAffix,
      issues,
      suggestion: isValid ? null : "Item name should follow pattern: [Rarity] [Item Type] of [Affix Name]"
    };
  },
});

// Seed affixes from JSON data (internal mutation for seeding)
export const seedAffixes = internalMutation({
  args: { affixes: v.array(v.string()) },
  handler: async (ctx, args) => {
    // Clear existing affixes
    const existing = await ctx.db.query("validAffixes").collect();
    for (const affix of existing) {
      await ctx.db.delete(affix._id);
    }
    
    // Insert new affixes (deduplicated)
    const uniqueAffixes = [...new Set(args.affixes.map(a => a.toLowerCase().trim()))];
    
    for (const affixName of uniqueAffixes) {
      if (affixName) {
        await ctx.db.insert("validAffixes", { affixName });
      }
    }
    
    return { inserted: uniqueAffixes.length };
  },
});

// Public mutation to seed affixes (for admin use) - appends to existing
export const seedAffixesPublic = mutation({
  args: { affixes: v.array(v.string()), clearFirst: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Optionally clear existing affixes
    if (args.clearFirst) {
      const existing = await ctx.db.query("validAffixes").collect();
      for (const affix of existing) {
        await ctx.db.delete(affix._id);
      }
    }
    
    // Get existing affix names to avoid duplicates
    const existingAffixes = await ctx.db.query("validAffixes").collect();
    const existingNames = new Set(existingAffixes.map(a => a.affixName));
    
    // Insert new affixes (deduplicated, skip existing)
    const uniqueAffixes = [...new Set(args.affixes.map(a => a.toLowerCase().trim()))];
    
    let inserted = 0;
    for (const affixName of uniqueAffixes) {
      if (affixName && !existingNames.has(affixName)) {
        await ctx.db.insert("validAffixes", { affixName });
        inserted++;
        existingNames.add(affixName); // Track to avoid duplicates within batch
      }
    }
    
    return { inserted, total: existingNames.size };
  },
});

// Export constants for client-side use
export const getValidationConstants = query({
  args: {},
  handler: async () => {
    return {
      rarities: ITEM_RARITIES,
      itemTypes: ITEM_TYPES,
    };
  },
});

// Search affixes for autocomplete
export const searchAffixes = query({
  args: { 
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const searchLower = args.searchTerm.toLowerCase().trim();
    
    if (searchLower.length < 2) {
      return [];
    }
    
    // Get all affixes and filter
    const allAffixes = await ctx.db.query("validAffixes").collect();
    
    // Filter affixes that contain the search term
    const matches = allAffixes
      .filter(a => a.affixName.toLowerCase().includes(searchLower))
      .slice(0, limit)
      .map(a => a.affixName);
    
    return matches;
  },
});

// Generate full item name suggestions based on partial input
export const suggestItemNames = query({
  args: { 
    partialName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8;
    const input = args.partialName.toLowerCase().trim();
    
    if (input.length < 2) {
      return [];
    }
    
    const words = input.split(/\s+/);
    
    // Detect rarity from input
    let detectedRarity = "";
    for (const rarity of ITEM_RARITIES) {
      if (words.includes(rarity)) {
        detectedRarity = rarity;
        break;
      }
    }
    
    // Detect item type from input - REQUIRED for suggestions
    let detectedType = "";
    for (const itemType of ITEM_TYPES) {
      if (words.includes(itemType)) {
        detectedType = itemType;
        break;
      }
    }
    
    // Only show suggestions if user has typed a valid item type
    // This prevents generic "Item" suggestions
    if (!detectedType) {
      return [];
    }
    
    // Get matching affixes
    const allAffixes = await ctx.db.query("validAffixes").collect();
    
    // Find affixes that match the remaining words
    const remainingWords = words.filter(w => 
      w !== detectedRarity && 
      w !== detectedType && 
      w !== "of" && 
      w !== "the"
    );
    
    let matchingAffixes: string[] = [];
    
    if (remainingWords.length > 0) {
      // Search for affixes containing any of the remaining words
      const searchPattern = remainingWords.join(" ");
      matchingAffixes = allAffixes
        .filter(a => {
          const affixLower = a.affixName.toLowerCase();
          return remainingWords.some(w => affixLower.includes(w)) ||
                 affixLower.includes(searchPattern);
        })
        .map(a => a.affixName)
        .slice(0, limit * 2);
    } else {
      // If only rarity/type entered, show some popular affixes
      matchingAffixes = allAffixes
        .slice(0, limit * 2)
        .map(a => a.affixName);
    }
    
    // Build full item name suggestions
    const suggestions: string[] = [];
    const rarity = detectedRarity || "blessed";
    
    for (const affix of matchingAffixes) {
      // Capitalize properly
      const rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
      const typeCapitalized = detectedType.charAt(0).toUpperCase() + detectedType.slice(1);
      const affixCapitalized = affix.split(" ").map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(" ");
      
      const fullName = `${rarityCapitalized} ${typeCapitalized} ${affixCapitalized}`;
      suggestions.push(fullName);
      
      if (suggestions.length >= limit) break;
    }
    
    return suggestions;
  },
});
