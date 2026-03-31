# Design System Specification: High-Energy Editorial HR

## 1. Overview & Creative North Star: "The Kinetic Playground"
This design system rejects the sterile, bureaucratic aesthetic of traditional HR software. Instead, it adopts **The Kinetic Playground** as its Creative North Star. We treat the workspace as a living, breathing ecosystem where "human resources" are celebrated, not managed.

By combining an editorial-grade typographic scale with asymmetrical, organic layouts, we create an experience that feels like a premium lifestyle magazine rather than a database. We break the "template" look through overlapping elements, exaggerated corner radii, and a total rejection of traditional containment lines.

---

## 2. Colors & Tonal Depth
Our palette is high-octane but grounded by a sophisticated "Off-White" surface strategy. We use color not just for branding, but as a functional tool to guide the eye through complex HR workflows.

### The Palette
- **Primary (Electric Purple):** `#8b2ce3`. Use for high-impact actions and brand moments.
- **Secondary (Teal):** `#007070`. Used for "Stable" actions like saving or submitting.
- **Tertiary (Coral/Sun):** `#ac4218`. Used for high-interest highlights and notification badges.
- **Surface (The Canvas):** `#fffbff`. A crisp, energized base.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts.
*   Instead of a bordered card, place a `surface_container_lowest` card on a `surface_container_low` background. 
*   Use `outline_variant` (#bcbb97) only at 10-20% opacity if a visual anchor is absolutely required for accessibility.

### The "Glass & Gradient" Rule
To move beyond a flat UI, major CTAs and "Hero" cards should utilize a **Signature Texture**:
*   **Linear Gradient:** Transition from `primary` (#8b2ce3) to `primary_container` (#c185ff) at a 135° angle.
*   **Glassmorphism:** For floating modals or navigation overlays, use `surface` at 80% opacity with a `24px` backdrop-blur.

---

## 3. Typography: Playful Authority
We pair two distinct typefaces to balance the "fun" and "functional" aspects of HR.

*   **Display & Headlines (Plus Jakarta Sans):** A modern, geometric sans-serif with a friendly, open aperture. 
    *   *Role:* Conveying personality. Use `display-lg` (3.5rem) for welcome screens and `headline-md` (1.75rem) for section titles.
*   **Titles & Body (Be Vietnam Pro):** A highly legible, slightly more professional sans-serif.
    *   *Role:* Efficiency. Use `body-lg` (1rem) for all employee data and `title-md` (1.125rem) for card headings.

**Editorial Tip:** Use "Negative Tracking" (-2%) on Display styles to give them a high-end, tight editorial feel.

---

## 4. Elevation & Depth: The Layering Principle
We convey hierarchy through **Tonal Layering** rather than structural shadows.

*   **The Stacking Order:** 
    1.  **Base:** `surface` (#fffbff)
    2.  **Sectioning:** `surface_container_low` (#fdfcd1)
    3.  **Interaction Cards:** `surface_container_lowest` (#ffffff)
*   **Ambient Shadows:** When an element must "float" (like a Draggable Employee Card), use an extra-diffused shadow: `0px 20px 40px rgba(57, 57, 31, 0.06)`. Note the tint is derived from `on_surface` (#39391f), not pure black.
*   **Organic Shapes:** Utilize the `Roundedness Scale`. While standard buttons use `DEFAULT` (1rem), "Profile Blobs" and "Benefit Highlights" should use `xl` (3rem) or even `full` to create asymmetrical, pill-like organic containers.

---

## 5. Components

### Buttons & Interaction
*   **Primary Button:** Background: `primary` gradient; Type: `on_primary`; Radius: `full`. High-energy and "squishy" feel.
*   **Secondary/Tertiary:** No background. Use `primary` text with a `surface_variant` hover state.
*   **Chips:** Use `secondary_container` (#8dedec) for status indicators. Shape: `full` pill.

### Input Fields
*   **Style:** No bottom line. Instead, use a `surface_container_high` fill with a `md` (1.5rem) corner radius.
*   **States:** On focus, the background shifts to `surface_container_lowest` with a 2px `primary` ghost-border (20% opacity).

### Cards & Lists
*   **The Divider Ban:** Strictly forbid 1px dividers between list items. Use `3` (1rem) spacing from the scale to let the typography create its own rhythm.
*   **Asymmetry:** For employee dashboards, alternate card widths (e.g., 60% / 40% split) to break the grid and maintain the "quirky" HR feel.

### Unique HR Components
*   **The "Mood Blob":** A large, `xl` rounded container using a `tertiary_container` (#ff946e) background to highlight employee pulse surveys.
*   **Whimsical Progress:** Use `secondary` (#007070) for progress bars, but make the container `surface_dim` and the thickness `12` (4rem) for a chunky, friendly feel.

---

## 6. Do’s and Don’ts

### Do
*   **Do** lean into the "Quirky" vibe by overlapping a user’s avatar over the edge of a card.
*   **Do** use the `16` (5.5rem) and `20` (7rem) spacing tokens to create "Editorial Breathing Room."
*   **Do** use `primary_fixed` (#c185ff) for subtle background accents behind text to emphasize keywords.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#39391f) to maintain the "Soft Coral/Teal" warmth.
*   **Don't** use right angles. If it can be rounded, round it. The minimum radius should be `sm` (0.5rem).
*   **Don't** use standard "Success Green." Use our `secondary` (Teal) to keep the palette bespoke and non-traditional.