# React Components Guidelines

All React components for the Dreadmyst Enchanting Tool live in this directory.

## Directory Structure

```
components/
├── Admin/              # Admin panel and moderation tools
├── Auth/               # Login, signup, user menu
├── Calculator/         # Enchant success rate calculator
├── EnchantTracker/     # Main item tracking functionality
├── Leaderboard/        # Community leaderboard display
├── Logo/               # Website logo component
├── PrivacyPolicy/      # Legal pages
├── ScreenshotVerification/  # OpenAI Vision verification
├── Simulator/          # Enchant simulation
└── TermsOfService/     # Legal pages
```

## Component Creation Rules

### File Naming
- Component: `ComponentName.tsx`
- Styles: `ComponentName.module.css`
- Both files in same directory

### Component Template
```tsx
"use client";

import { useState } from "react";
import styles from "./ComponentName.module.css";

interface ComponentNameProps {
  // Define props with types
}

export default function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // Hooks at top
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = () => {};
  
  // Render
  return (
    <div className={styles.container}>
      {/* Content */}
    </div>
  );
}
```

## CSS Module Rules (CRITICAL)

### Never Use Inline Tailwind
```tsx
// ❌ WRONG - Never do this
<div className="flex gap-4 p-6 bg-gray-900">

// ✅ CORRECT - Always use CSS modules
<div className={styles.container}>
```

### Mobile-First CSS
```css
/* Base styles for mobile */
.container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
  }
}
```

### Use Theme Variables
```css
/* ❌ WRONG - Hardcoded colors */
.button {
  background: #3b82f6;
  color: white;
}

/* ✅ CORRECT - Theme variables */
.button {
  background: var(--brand-primary);
  color: var(--text-primary);
}
```

## Convex Integration

### Queries
```tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const data = useQuery(api.sessions.getActiveSession);
```

### Mutations
```tsx
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const startSession = useMutation(api.sessions.startSession);
await startSession({ itemName, itemQuality, orbInventory });
```

### Actions (for OpenAI calls)
```tsx
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

const verifyScreenshot = useAction(api.verification.verifyScreenshot);
```

## Common Patterns

### Loading States
```tsx
if (data === undefined) {
  return <div className={styles.loading}>Loading...</div>;
}
```

### Authentication Check
```tsx
import { useConvexAuth } from "convex/react";

const { isAuthenticated, isLoading } = useConvexAuth();

if (!isAuthenticated) {
  return <AuthForm />;
}
```

### Error Handling
```tsx
try {
  await mutation(args);
} catch (error: any) {
  setError(error.message);
}
```
