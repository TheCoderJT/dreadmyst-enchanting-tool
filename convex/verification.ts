import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

const VERIFICATION_PROMPT = `You are verifying a screenshot from the game Dreadmyst. 
The user claims to have enchanted an item to a specific level.

Analyze the screenshot and extract:
1. The item name visible in the screenshot
2. The enchant level (shown as +X, e.g., +10, +7, etc.)
3. The item quality/rarity if visible (White, Radiant, Blessed, Holy, Godly)

Look for:
- Item tooltip or inventory display
- The +X enchant indicator
- Item name text
- Quality color indicators (white, blue, purple, orange, red/pink for Godly)

Respond with ONLY a JSON object (no markdown):
{
  "found": true/false,
  "itemName": "extracted item name or null",
  "enchantLevel": number or null,
  "quality": "White|Radiant|Blessed|Holy|Godly" or null,
  "confidence": "high|medium|low",
  "notes": "any relevant observations"
}

If you cannot find the required information, set found to false and explain in notes.`;

// Rate limit configuration
const RATE_LIMITS = {
  screenshot_verification: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  display_name_moderation: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
  session_creation: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  display_name_change: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  leaderboard_query: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
};

// Check rate limit
export const checkRateLimit = mutation({
  args: {
    action: v.string(),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; remaining: number; resetIn: number }> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const config = RATE_LIMITS[args.action as keyof typeof RATE_LIMITS];
    if (!config) {
      return { allowed: true, remaining: 999, resetIn: 0 };
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", args.action))
      .first();

    if (!existing) {
      // First request - create entry
      await ctx.db.insert("rateLimits", {
        userId,
        action: args.action,
        count: 1,
        windowStart: now,
      });
      return { allowed: true, remaining: config.limit - 1, resetIn: config.windowMs };
    }

    // Check if window has expired
    if (now - existing.windowStart > config.windowMs) {
      // Reset window
      await ctx.db.patch(existing._id, {
        count: 1,
        windowStart: now,
      });
      return { allowed: true, remaining: config.limit - 1, resetIn: config.windowMs };
    }

    // Check if under limit
    if (existing.count < config.limit) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
      });
      return {
        allowed: true,
        remaining: config.limit - existing.count - 1,
        resetIn: config.windowMs - (now - existing.windowStart),
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetIn: config.windowMs - (now - existing.windowStart),
    };
  },
});

// Get user profile for ban check
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Generate upload URL for screenshot
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Verify screenshot using OpenAI Vision
export const verifyScreenshot = action({
  args: {
    completedItemId: v.id("completedItems"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
    details?: {
      extractedName: string | null;
      extractedLevel: number | null;
      extractedQuality: string | null;
      confidence: string;
      notes: string;
    };
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        verified: false,
        error: "Screenshot verification is not configured",
      };
    }

    // Get the completed item details
    const completedItem = await ctx.runQuery(api.verification.getCompletedItemForVerification, {
      completedItemId: args.completedItemId,
    });

    if (!completedItem) {
      return {
        success: false,
        verified: false,
        error: "Completed item not found",
      };
    }

    // Check if user is banned
    const userProfile = await ctx.runQuery(api.verification.getUserProfile, {
      userId: completedItem.userId,
    });

    if (userProfile?.isBanned) {
      if (!userProfile.bannedUntil || userProfile.bannedUntil >= Date.now()) {
        return {
          success: false,
          verified: false,
          error: "You are banned and cannot verify screenshots.",
        };
      }
    }

    // Check rate limit
    const rateCheck = await ctx.runMutation(api.verification.checkRateLimit, {
      action: "screenshot_verification",
    });

    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.resetIn / 60000);
      return {
        success: false,
        verified: false,
        error: `Rate limited. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      };
    }

    // Get the image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      return {
        success: false,
        verified: false,
        error: "Could not retrieve uploaded image",
      };
    }

    try {
      // Call OpenAI Vision API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: VERIFICATION_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Verify this screenshot. The user claims to have: "${completedItem.itemName}" at +${completedItem.finalLevel} (${completedItem.qualityName} quality).`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "low",
                  },
                },
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        console.error("OpenAI Vision API error:", response.status);
        return {
          success: false,
          verified: false,
          error: "Verification service unavailable",
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse the response
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          return {
            success: false,
            verified: false,
            error: "Could not parse verification response",
          };
        }
      }

      if (!result.found) {
        // Update the completed item with failed verification
        await ctx.runMutation(api.verification.updateVerificationStatus, {
          completedItemId: args.completedItemId,
          storageId: args.storageId,
          verified: false,
          details: result.notes || "Could not find item information in screenshot",
        });

        return {
          success: true,
          verified: false,
          details: {
            extractedName: null,
            extractedLevel: null,
            extractedQuality: null,
            confidence: "low",
            notes: result.notes || "Could not find item information in screenshot",
          },
        };
      }

      // Compare extracted data with claimed data
      const nameMatch = result.itemName && 
        completedItem.itemName.toLowerCase().includes(result.itemName.toLowerCase().split(" ").slice(-2).join(" "));
      const levelMatch = result.enchantLevel === completedItem.finalLevel;
      const qualityMatch = !result.quality || 
        result.quality.toLowerCase() === completedItem.qualityName.toLowerCase();

      const verified = levelMatch && (nameMatch || result.confidence === "high");

      // Update the completed item
      await ctx.runMutation(api.verification.updateVerificationStatus, {
        completedItemId: args.completedItemId,
        storageId: args.storageId,
        verified,
        details: JSON.stringify({
          extractedName: result.itemName,
          extractedLevel: result.enchantLevel,
          extractedQuality: result.quality,
          confidence: result.confidence,
          notes: result.notes,
          nameMatch,
          levelMatch,
          qualityMatch,
        }),
      });

      return {
        success: true,
        verified,
        details: {
          extractedName: result.itemName,
          extractedLevel: result.enchantLevel,
          extractedQuality: result.quality,
          confidence: result.confidence,
          notes: verified
            ? "Screenshot verified successfully!"
            : `Verification failed: ${!levelMatch ? "Level mismatch. " : ""}${!nameMatch ? "Item name mismatch." : ""}`,
        },
      };
    } catch (error) {
      console.error("Verification error:", error);
      return {
        success: false,
        verified: false,
        error: "Verification service error",
      };
    }
  },
});

// Query to get completed item for verification
export const getCompletedItemForVerification = query({
  args: {
    completedItemId: v.id("completedItems"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const item = await ctx.db.get(args.completedItemId);
    if (!item || item.userId !== userId) {
      return null;
    }

    const qualityNames: Record<number, string> = {
      1: "White",
      2: "Radiant",
      3: "Blessed",
      4: "Holy",
      5: "Godly",
    };

    return {
      ...item,
      qualityName: qualityNames[item.itemQuality] || "Unknown",
    };
  },
});

// Mutation to update verification status
export const updateVerificationStatus = mutation({
  args: {
    completedItemId: v.id("completedItems"),
    storageId: v.id("_storage"),
    verified: v.boolean(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.completedItemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    // Get the URL for the screenshot
    const screenshotUrl = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.completedItemId, {
      isVerified: args.verified,
      verifiedAt: args.verified ? Date.now() : undefined,
      screenshotUrl: screenshotUrl || undefined,
      screenshotStorageId: args.storageId,
    });

    // Also update the session if it exists
    if (item.sessionId) {
      const session = await ctx.db.get(item.sessionId);
      if (session) {
        await ctx.db.patch(item.sessionId, {
          screenshotUrl: screenshotUrl || undefined,
          verificationStatus: args.verified ? "verified" : "failed",
          verificationDetails: args.details,
        });
      }
    }

    return { success: true };
  },
});

// Verify screenshot using OpenAI Vision with external URL (for UploadThing)
export const verifyScreenshotWithUrl = action({
  args: {
    completedItemId: v.id("completedItems"),
    imageUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
    details?: {
      extractedName: string | null;
      extractedLevel: number | null;
      extractedQuality: string | null;
      confidence: string;
      notes: string;
    };
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        verified: false,
        error: "Screenshot verification is not configured",
      };
    }

    // Get the completed item details
    const completedItem = await ctx.runQuery(api.verification.getCompletedItemForVerification, {
      completedItemId: args.completedItemId,
    });

    if (!completedItem) {
      return {
        success: false,
        verified: false,
        error: "Completed item not found",
      };
    }

    // Check rate limit
    const rateCheck = await ctx.runMutation(api.verification.checkRateLimit, {
      action: "screenshot_verification",
    });

    if (!rateCheck.allowed) {
      const minutes = Math.ceil(rateCheck.resetIn / 60000);
      return {
        success: false,
        verified: false,
        error: `Rate limited. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      };
    }

    try {
      // Call OpenAI Vision API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: VERIFICATION_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Verify this screenshot. The user claims to have: "${completedItem.itemName}" at +${completedItem.finalLevel} (${completedItem.qualityName} quality).`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: args.imageUrl,
                    detail: "low",
                  },
                },
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        console.error("OpenAI Vision API error:", response.status);
        return {
          success: false,
          verified: false,
          error: "Verification service unavailable",
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse the response
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          return {
            success: false,
            verified: false,
            error: "Could not parse verification response",
          };
        }
      }

      if (!result.found) {
        // Update the completed item with failed verification
        await ctx.runMutation(api.verification.updateVerificationStatusWithUrl, {
          completedItemId: args.completedItemId,
          imageUrl: args.imageUrl,
          verified: false,
          details: result.notes || "Could not find item information in screenshot",
        });

        return {
          success: true,
          verified: false,
          details: {
            extractedName: null,
            extractedLevel: null,
            extractedQuality: null,
            confidence: "low",
            notes: result.notes || "Could not find item information in screenshot",
          },
        };
      }

      // Compare extracted data with claimed data
      const nameMatch = result.itemName && 
        completedItem.itemName.toLowerCase().includes(result.itemName.toLowerCase().split(" ").slice(-2).join(" "));
      const levelMatch = result.enchantLevel === completedItem.finalLevel;
      const qualityMatch = !result.quality || 
        result.quality.toLowerCase() === completedItem.qualityName.toLowerCase();

      const verified = levelMatch && (nameMatch || result.confidence === "high");

      // Update the completed item
      await ctx.runMutation(api.verification.updateVerificationStatusWithUrl, {
        completedItemId: args.completedItemId,
        imageUrl: args.imageUrl,
        verified,
        details: JSON.stringify({
          extractedName: result.itemName,
          extractedLevel: result.enchantLevel,
          extractedQuality: result.quality,
          confidence: result.confidence,
          notes: result.notes,
          nameMatch,
          levelMatch,
          qualityMatch,
        }),
      });

      return {
        success: true,
        verified,
        details: {
          extractedName: result.itemName,
          extractedLevel: result.enchantLevel,
          extractedQuality: result.quality,
          confidence: result.confidence,
          notes: verified
            ? "Screenshot verified successfully!"
            : `Verification failed: ${!levelMatch ? "Level mismatch. " : ""}${!nameMatch ? "Item name mismatch." : ""}`,
        },
      };
    } catch (error) {
      console.error("Verification error:", error);
      return {
        success: false,
        verified: false,
        error: "Verification service error",
      };
    }
  },
});

// Mutation to update verification status with external URL (for UploadThing)
export const updateVerificationStatusWithUrl = mutation({
  args: {
    completedItemId: v.id("completedItems"),
    imageUrl: v.string(),
    verified: v.boolean(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.completedItemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    await ctx.db.patch(args.completedItemId, {
      isVerified: args.verified,
      verifiedAt: args.verified ? Date.now() : undefined,
      screenshotUrl: args.imageUrl,
    });

    // Also update the session if it exists
    if (item.sessionId) {
      const session = await ctx.db.get(item.sessionId);
      if (session) {
        await ctx.db.patch(item.sessionId, {
          screenshotUrl: args.imageUrl,
          verificationStatus: args.verified ? "verified" : "failed",
          verificationDetails: args.details,
        });
      }
    }

    return { success: true };
  },
});

// Query to get user's verification stats
export const getUserVerificationStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const completedItems = await ctx.db
      .query("completedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const total = completedItems.length;
    const verified = completedItems.filter((item) => item.isVerified).length;

    return {
      total,
      verified,
      unverified: total - verified,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
    };
  },
});
