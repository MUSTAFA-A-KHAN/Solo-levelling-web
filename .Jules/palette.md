## 2024-05-24 - Keyboard Navigation Accessibility
**Learning:** Many interactive elements lacked clear focus indicators, which made keyboard navigation difficult. Implementing a global `:focus-visible` outline using the primary brand color drastically improves the experience for keyboard users without affecting mouse users.
**Action:** Always include a global `:focus-visible` rule in the base stylesheet for new projects.

## 2024-08-25 - Redundant ARIA Labels on Decorative Elements
**Learning:** Adding `aria-label` to decorative `<div>` elements that immediately precede their visible text labels creates redundant, noisy announcements for screen reader users (e.g., hearing "steps icon, STEPS"). Furthermore, using `aria-label` on non-interactive generic elements without a specific `role` is generally unsupported by screen readers.
**Action:** Always add `aria-hidden="true"` to purely decorative icons (SVGs, emojis, images) and remove their `aria-label` attributes to ensure a clean and concise screen reader experience.

## 2025-02-25 - Form Accessibility
**Learning:** Placeholders are often used as visual labels in compact designs, but they are insufficient for screen readers and disappear when typing.
**Action:** Added aria-labels to all form inputs to ensure screen readers always have context, and added visual asterisks to placeholders to denote required fields.

## 2026-08-26 - Redundant Screen Reader Announcements in Labelled Links
**Learning:** When a link (or button) has an `aria-label` (e.g., "SYS:LEVEL — home"), screen readers will announce that label. If the elements inside the link (like an image with alt text and a span with text) are not hidden, the screen reader may announce them as well, causing redundant and confusing output.
**Action:** Add `aria-hidden="true"` to decorative visual elements (like logos or text spans) inside an `aria-label`ed parent to ensure screen readers only announce the intended label.
