## 2024-05-24 - Keyboard Navigation Accessibility
**Learning:** Many interactive elements lacked clear focus indicators, which made keyboard navigation difficult. Implementing a global `:focus-visible` outline using the primary brand color drastically improves the experience for keyboard users without affecting mouse users.
**Action:** Always include a global `:focus-visible` rule in the base stylesheet for new projects.

## 2024-08-25 - Redundant ARIA Labels on Decorative Elements
**Learning:** Adding `aria-label` to decorative `<div>` elements that immediately precede their visible text labels creates redundant, noisy announcements for screen reader users (e.g., hearing "steps icon, STEPS"). Furthermore, using `aria-label` on non-interactive generic elements without a specific `role` is generally unsupported by screen readers.
**Action:** Always add `aria-hidden="true"` to purely decorative icons (SVGs, emojis, images) and remove their `aria-label` attributes to ensure a clean and concise screen reader experience.
