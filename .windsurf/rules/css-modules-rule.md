---
name: css-modules-only
trigger: always_on
---

# CSS Modules Only Rule

## Rule
NEVER use inline Tailwind classes in this project. All styling must be done through CSS Modules.

## Requirements
1. Every component must have a corresponding `.module.css` file
2. Use `className={styles.className}` syntax
3. Use CSS variables from `globals.css` for colors
4. Write mobile-first CSS with `min-width` media queries
5. Ensure 44px minimum touch targets on mobile

## Examples

### Wrong
```tsx
<div className="flex gap-4 p-6 bg-gray-900">
```

### Correct
```tsx
<div className={styles.container}>
```

## Theme Variables
- Backgrounds: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`
- Text: `var(--text-primary)`, `var(--text-secondary)`
- Brand: `var(--brand-primary)`
- Borders: `var(--border-primary)`, `var(--border-hover)`
