---
name: component-structure
trigger: glob
globs: src/components/**/*.tsx
---

# React Component Structure Rule

## File Organization
- Component: `ComponentName.tsx`
- Styles: `ComponentName.module.css` (same directory)
- Both files must be created together

## Component Template
```tsx
"use client";

import { useState } from "react";
import styles from "./ComponentName.module.css";

interface ComponentNameProps {
  // Define all props with types
}

export default function ComponentName({ prop1 }: ComponentNameProps) {
  // Hooks at top
  // Event handlers next
  // Return JSX
  return (
    <div className={styles.container}>
      {/* Content */}
    </div>
  );
}
```

## Convex Integration
```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const data = useQuery(api.sessions.getActiveSession);
const mutation = useMutation(api.sessions.startSession);
```

## Loading States
```tsx
if (data === undefined) {
  return <div className={styles.loading}>Loading...</div>;
}
```

## Never Do
- Inline Tailwind classes
- Default exports without function name
- Missing TypeScript interfaces for props
