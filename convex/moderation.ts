import { v } from "convex/values";
import { action, internalMutation, mutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { auth } from "./auth";

const MODERATION_PROMPT = `You are a content moderator for a gaming leaderboard. 
Analyze the following display name and determine if it's appropriate.

Rules:
- Allow gaming-related names, numbers, and common characters
- Allow @ symbols (users like to include their Discord handle like @username)
- Allow underscores, dashes, and periods
- REJECT profanity, slurs, hate speech, sexual content, or offensive terms
- REJECT names that are clearly trolling or inappropriate
- Be lenient with creative/funny gaming names that aren't offensive

Respond with ONLY a JSON object (no markdown):
{"approved": true/false, "reason": "brief reason if rejected"}`;

// Moderate a display name using OpenAI
export const moderateDisplayName = action({
  args: { displayName: v.string() },
  handler: async (ctx, args): Promise<{ approved: boolean; reason: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn("OPENAI_API_KEY not set, skipping moderation");
      return { approved: true, reason: "Moderation skipped - no API key" };
    }
    
    // Quick local checks first (save API calls)
    const name = args.displayName.trim();
    
    if (name.length === 0) {
      return { approved: false, reason: "Display name cannot be empty" };
    }
    
    if (name.length > 30) {
      return { approved: false, reason: "Display name too long (max 30 characters)" };
    }
    
    // Basic profanity filter (obvious cases - save API calls)
    const obviousBadWords = [
      'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 
      'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore'
    ];
    
    const nameLower = name.toLowerCase().replace(/[^a-z]/g, '');
    for (const word of obviousBadWords) {
      if (nameLower.includes(word)) {
        return { approved: false, reason: "Display name contains inappropriate language" };
      }
    }
    
    // Call OpenAI for more nuanced moderation
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: MODERATION_PROMPT },
            { role: "user", content: `Display name to check: "${args.displayName}"` }
          ],
          max_tokens: 50,
          temperature: 0,
        }),
      });
      
      if (!response.ok) {
        console.error("OpenAI API error:", response.status);
        // On API error, allow the name (fail open for UX)
        return { approved: true, reason: "Moderation service unavailable" };
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Parse the JSON response
      try {
        const result = JSON.parse(content);
        return {
          approved: result.approved === true,
          reason: result.reason || (result.approved ? "Approved" : "Rejected by moderation"),
        };
      } catch {
        // If we can't parse, check for simple approved/rejected
        if (content.toLowerCase().includes('"approved": true') || 
            content.toLowerCase().includes('"approved":true')) {
          return { approved: true, reason: "Approved" };
        }
        return { approved: true, reason: "Could not parse moderation response" };
      }
    } catch (error) {
      console.error("Moderation error:", error);
      // On error, allow the name (fail open for UX)
      return { approved: true, reason: "Moderation service error" };
    }
  },
});

// Log moderation results (for analytics/review)
export const logModerationResult = internalMutation({
  args: {
    displayName: v.string(),
    approved: v.boolean(),
    reason: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Could store in a moderationLogs table if needed
    console.log(`Moderation: "${args.displayName}" - ${args.approved ? "APPROVED" : "REJECTED"} - ${args.reason}`);
  },
});

// Helper function for moderation logic (reusable)
async function checkDisplayName(displayName: string): Promise<{ approved: boolean; reason: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set, skipping moderation");
    return { approved: true, reason: "Moderation skipped - no API key" };
  }
  
  const name = displayName.trim();
  
  if (name.length === 0) {
    return { approved: false, reason: "Display name cannot be empty" };
  }
  
  if (name.length > 30) {
    return { approved: false, reason: "Display name too long (max 30 characters)" };
  }
  
  // Basic profanity filter
  const obviousBadWords = [
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 
    'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore'
  ];
  
  const nameLower = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const word of obviousBadWords) {
    if (nameLower.includes(word)) {
      return { approved: false, reason: "Display name contains inappropriate language" };
    }
  }
  
  // Call OpenAI for nuanced moderation
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MODERATION_PROMPT },
          { role: "user", content: `Display name to check: "${displayName}"` }
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });
    
    if (!response.ok) {
      console.error("OpenAI API error:", response.status);
      return { approved: true, reason: "Moderation service unavailable" };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      const result = JSON.parse(content);
      return {
        approved: result.approved === true,
        reason: result.reason || (result.approved ? "Approved" : "Rejected by moderation"),
      };
    } catch {
      if (content.toLowerCase().includes('"approved": true') || 
          content.toLowerCase().includes('"approved":true')) {
        return { approved: true, reason: "Approved" };
      }
      return { approved: true, reason: "Could not parse moderation response" };
    }
  } catch (error) {
    console.error("Moderation error:", error);
    return { approved: true, reason: "Moderation service error" };
  }
}

// Action to update display name with moderation
export const updateDisplayNameWithModeration = action({
  args: { displayName: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // First, moderate the display name
    const moderationResult = await checkDisplayName(args.displayName);
    
    if (!moderationResult.approved) {
      return { 
        success: false, 
        error: moderationResult.reason || "Display name not allowed" 
      };
    }
    
    // If approved, update the profile
    await ctx.runMutation(api.sessions.getOrCreateProfile, {
      displayName: args.displayName,
    });
    
    return { success: true };
  },
});
