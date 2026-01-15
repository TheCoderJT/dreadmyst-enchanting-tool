import { query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    // Example query - returns a simple message
    // Replace this with actual database queries when ready
    return { message: "Convex is connected!" };
  },
});
