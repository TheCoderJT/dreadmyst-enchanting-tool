# Theme Variables Reference

All CSS custom properties (variables) used in the Dreadmyst Enchanting Tool.

These are defined in `src/app/globals.css` and should be used throughout all CSS modules.

## Color Variables

### Backgrounds
```css
var(--bg-primary)      /* Main page background - darkest */
var(--bg-secondary)    /* Card/section backgrounds */
var(--bg-tertiary)     /* Elevated surfaces, modals */
```

### Text Colors
```css
var(--text-primary)    /* Main text - highest contrast */
var(--text-secondary)  /* Muted text, descriptions */
var(--text-tertiary)   /* Disabled, placeholder text */
```

### Brand Colors
```css
var(--brand-primary)   /* Primary accent color (blue) */
var(--brand-gradient)  /* Gradient for highlights */
```

### Border Colors
```css
var(--border-primary)  /* Default borders */
var(--border-hover)    /* Hover state borders */
```

### Status Colors
```css
var(--success)         /* Green - success states */
var(--warning)         /* Yellow/amber - warnings */
var(--error)           /* Red - errors, failures */
var(--info)            /* Blue - informational */
```

## Spacing & Sizing

### Border Radius
```css
var(--radius-sm)       /* 4px - small elements, badges */
var(--radius-md)       /* 8px - buttons, inputs */
var(--radius-lg)       /* 12px - cards, modals */
var(--radius-xl)       /* 16px - large containers */
```

## Animation

### Transitions
```css
var(--transition-fast)    /* 150ms - hover states */
var(--transition-normal)  /* 250ms - general transitions */
var(--transition-slow)    /* 350ms - complex animations */
```

## Shadows

```css
var(--shadow-sm)   /* Subtle elevation */
var(--shadow-md)   /* Cards, dropdowns */
var(--shadow-lg)   /* Modals, popovers */
```

## Usage Examples

### Button
```css
.button {
  background: var(--brand-primary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  transition: opacity var(--transition-fast);
}

.button:hover {
  opacity: 0.9;
}
```

### Card
```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.card:hover {
  border-color: var(--border-hover);
}
```

### Input
```css
.input {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:focus {
  border-color: var(--brand-primary);
}
```

## Item Quality Colors

For Dreadmyst item rarities:
```css
/* White (Common) */
color: #ffffff;

/* Radiant (Uncommon) */
color: #60a5fa;

/* Blessed (Rare) */
color: #a855f7;

/* Holy (Epic) */
color: #f97316;

/* Godly (Legendary) */
color: #ef4444;
```

## Responsive Breakpoints

Use these min-width values for media queries:
```css
/* Small devices */
@media (min-width: 640px) { }

/* Tablets */
@media (min-width: 768px) { }

/* Laptops */
@media (min-width: 1024px) { }

/* Desktops */
@media (min-width: 1280px) { }

/* Large Desktops */
@media (min-width: 1536px) { }
```

## Important Rules

1. **Never hardcode colors** - Always use CSS variables
2. **Mobile-first** - Base styles for mobile, enhance with media queries
3. **Touch targets** - Minimum 44x44px for interactive elements
4. **No inline Tailwind** - All styles in CSS modules
