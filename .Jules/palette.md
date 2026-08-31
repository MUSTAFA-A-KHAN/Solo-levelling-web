## 2024-05-24 - Keyboard Navigation Accessibility
**Learning:** Many interactive elements lacked clear focus indicators, which made keyboard navigation difficult. Implementing a global `:focus-visible` outline using the primary brand color drastically improves the experience for keyboard users without affecting mouse users.
**Action:** Always include a global `:focus-visible` rule in the base stylesheet for new projects.

## 2024-08-25 - Redundant ARIA Labels on Decorative Elements
**Learning:** Adding `aria-label` to decorative `<div>` elements that immediately precede their visible text labels creates redundant, noisy announcements for screen reader users (e.g., hearing "steps icon, STEPS"). Furthermore, using `aria-label` on non-interactive generic elements without a specific `role` is generally unsupported by screen readers.
**Action:** Always add `aria-hidden="true"` to purely decorative icons (SVGs, emojis, images) and remove their `aria-label` attributes to ensure a clean and concise screen reader experience.

## 2025-02-25 - Form Accessibility
**Learning:** Placeholders are often used as visual labels in compact designs, but they are insufficient for screen readers and disappear when typing.
**Action:** Added aria-labels to all form inputs to ensure screen readers always have context, and added visual asterisks to placeholders to denote required fields.

## 2024-08-28 - ARIA Live Regions for Dynamic Status Updates
**Learning:** The application extensively uses dynamic DOM manipulation to present status messages (like form submission successes or media harvesting states) to the user. Without ARIA live regions, these updates go completely unnoticed by screen readers, degrading accessibility.
**Action:** Always wrap dynamic status messages and feedback containers with `role="status"` and `aria-live="polite"` (or `aria-live="assertive"` for critical errors) to ensure assistive technologies announce state changes as they happen.
## 2024-11-20 - Async Form Submission Accessibility
**Learning:** During asynchronous form submissions, screen reader users might not receive feedback if the success or error message is simply appended to the DOM. Using `role="status"` and `aria-live="polite"` ensures that dynamically injected feedback is announced automatically without interrupting the user. Additionally, setting `aria-disabled="true"` on the submit button during the wait provides explicit confirmation of the loading state for assistive technologies.
**Action:** Always wrap dynamic form feedback in an element with `role="status"` and `aria-live="polite"`, and update the button's disabled state appropriately.
