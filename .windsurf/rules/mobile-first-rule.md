---
name: mobile-first-responsive
trigger: glob
globs: **/*.module.css
---

# Mobile-First Responsive Design Rule

## Core Principle
Always write base styles for mobile, then add media queries for larger screens using `min-width`.

## Breakpoints
```css
/* Mobile (default) - no media query needed */

/* Small devices */
@media (min-width: 640px) { }

/* Tablets */
@media (min-width: 768px) { }

/* Laptops */
@media (min-width: 1024px) { }

/* Desktops */
@media (min-width: 1280px) { }
```

## Never Use
- `max-width` media queries
- Desktop-first approaches
- Hardcoded pixel values for colors

## Touch Targets
All interactive elements must have minimum 44x44px touch targets:
```css
.button {
  min-height: 44px;
  min-width: 44px;
}
```

## Test At
- 320px (small mobile)
- 768px (tablet)
- 1024px (laptop)
- 1280px (desktop)
