---
name: add-component
description: Creates a new React component with CSS module following project conventions
---

# Add Component Skill

Creates a new React component with proper CSS module styling for the Dreadmyst Enchanting Tool.

## Steps

1. **Create Component File** (`ComponentName.tsx`)
   - Add "use client" directive at top
   - Import React hooks as needed
   - Import CSS module: `import styles from './ComponentName.module.css'`
   - Define TypeScript interface for props
   - Export default functional component
   - Use `className={styles.xxx}` for all styling

2. **Create CSS Module** (`ComponentName.module.css`)
   - Write mobile-first CSS (base styles for mobile)
   - Use CSS variables from globals.css for colors
   - Add responsive breakpoints with `min-width` media queries
   - Ensure 44px minimum touch targets for interactive elements

3. **Follow Theme Variables**
   - Backgrounds: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`
   - Text: `var(--text-primary)`, `var(--text-secondary)`
   - Brand: `var(--brand-primary)`, `var(--brand-gradient)`
   - Borders: `var(--border-primary)`, `var(--border-hover)`
   - Radius: `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`
   - Transitions: `var(--transition-fast)`, `var(--transition-normal)`

## Component Template

```tsx
"use client";

import { useState } from "react";
import styles from "./ComponentName.module.css";

interface ComponentNameProps {
  title: string;
  onAction?: () => void;
}

export default function ComponentName({ title, onAction }: ComponentNameProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <button 
        className={styles.button}
        onClick={onAction}
      >
        Click Me
      </button>
    </div>
  );
}
```

## CSS Module Template

```css
.container {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
}

.title {
  color: var(--text-primary);
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.button {
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.button:hover {
  opacity: 0.9;
}

@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
}
```

## Rules

- **NEVER use inline Tailwind classes**
- Always create both `.tsx` and `.module.css` files
- Use CSS variables for all colors
- Write mobile-first responsive CSS
- Ensure touch targets are at least 44x44px
