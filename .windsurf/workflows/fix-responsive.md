---
name: fix-responsive
description: Debug and fix responsive design issues on mobile or tablet
---

# Fix Responsive Design Issues

Workflow for debugging and fixing responsive design problems.

## Steps

### 1. Identify the Problem
- Which component has the issue?
- Which viewport size is affected? (mobile/tablet/desktop)
- What is the expected vs actual behavior?

### 2. Locate the CSS Module
Find the corresponding `.module.css` file for the component.

### 3. Check Mobile-First Structure
Ensure CSS follows mobile-first pattern:
```css
/* Base styles (mobile) */
.element {
  /* mobile styles */
}

/* Tablet */
@media (min-width: 768px) {
  .element {
    /* tablet overrides */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .element {
    /* desktop overrides */
  }
}
```

### 4. Common Issues to Check

#### Hidden Elements
```css
/* Wrong - hiding on mobile with max-width */
@media (max-width: 767px) {
  .element { display: none; }
}

/* Correct - show on larger screens */
.element { display: none; }
@media (min-width: 768px) {
  .element { display: flex; }
}
```

#### Touch Targets Too Small
```css
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1rem;
}
```

#### Overflow Issues
```css
.container {
  overflow-x: hidden; /* Prevent horizontal scroll */
  max-width: 100vw;
}
```

#### Grid Column Alignment
```css
.grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: single column */
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr); /* Tablet: 3 columns */
  }
}
```

### 5. Test All Breakpoints
- 320px (small mobile)
- 375px (iPhone)
- 768px (tablet)
- 1024px (laptop)
- 1280px (desktop)

### 6. Verify Theme Variables
Ensure using CSS variables, not hardcoded values:
```css
/* Wrong */
background: #1a1a2e;

/* Correct */
background: var(--bg-primary);
```

## Breakpoint Reference

| Name | Min-Width | Typical Devices |
|------|-----------|-----------------|
| Mobile | default | Phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large monitors |
