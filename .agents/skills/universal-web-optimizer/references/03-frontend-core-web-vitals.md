# Frontend Core Web Vitals & Rendering Performance

This reference guide provides implementation patterns to pass Google Core Web Vitals: Largest Contentful Paint (LCP $\le 2.5s$), Interaction to Next Paint (INP $\le 200ms$), and Cumulative Layout Shift (CLS $\le 0.1$).

---

## 1. Largest Contentful Paint (LCP) Optimization

### The Hero Image Pattern
Hero images are the most frequent cause of slow LCP. Apply modern formats (AVIF/WebP), responsive art direction, and browser priority hints:

```html
<picture>
  <!-- Mobile: Portrait crop, lightweight WebP/AVIF -->
  <source
    media="(max-width: 640px)"
    srcset="/images/hero-mobile.avif 1x, /images/hero-mobile@2x.avif 2x"
    type="image/avif"
  />
  <source
    media="(max-width: 640px)"
    srcset="/images/hero-mobile.webp 1x, /images/hero-mobile@2x.webp 2x"
    type="image/webp"
  />
  <!-- Desktop: Landscape crop -->
  <source
    srcset="/images/hero-desktop.avif 1x, /images/hero-desktop@2x.avif 2x"
    type="image/avif"
  />
  <img
    src="/images/hero-desktop.webp"
    alt="Hero Illustration"
    width="1200"
    height="675"
    fetchpriority="high"
    loading="eager"
    decoding="async"
    class="w-full h-auto object-cover"
  />
</picture>
```

### Self-Hosting Fonts
External fonts (e.g. `fonts.googleapis.com`) block the render tree while waiting for cross-origin DNS, TCP, and TLS handshakes.
- Host `.woff2` files locally in your public directory.
- Preload the primary font in `<head>`:
```html
<link
  rel="preload"
  href="/fonts/inter-latin-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous"
/>
```

---

## 2. Cumulative Layout Shift (CLS) Optimization

CLS occurs when elements change position without user interaction as assets (images, ads, dynamic embeds) load.

### Explicit Dimension Rules
Always reserve layout space before assets finish downloading:
```css
/* Modern aspect-ratio CSS */
.media-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #f3f4f6; /* Placeholder skeleton */
}
```

---

## 3. Interaction to Next Paint (INP) Optimization

INP measures the delay between a user interaction (click, keypress) and the visual browser paint.

### Breaking Up Long Tasks (> 50ms)
Never execute heavy synchronous data transformations directly in the event handler:

```javascript
// BAD: Blocks browser UI thread during 200ms processing
function handleFilterClick() {
  const filtered = computeExpensiveMetrics(largeDataset);
  updateUI(filtered);
}

// GOOD: Yield to main thread using scheduler.yield() or requestAnimationFrame
async function handleFilterClick() {
  setLoadingState(true);
  
  // Yield execution back to the browser to paint loading spinner
  await (window.scheduler?.yield ? window.scheduler.yield() : new Promise(r => setTimeout(r, 0)));
  
  const filtered = computeExpensiveMetrics(largeDataset);
  updateUI(filtered);
  setLoadingState(false);
}
```
