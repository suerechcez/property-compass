## Goal
Style the "One Higala Properties" brand wordmark in the top nav with a signature-style script font (Brittany Signature look-alike).

## Font
Use **Allura** from Google Fonts — closest free look-alike to Brittany Signature (flowing, elegant signature script).

## Changes
1. **`src/routes/__root.tsx`** — add `<link>` tags in the root `head()` to preconnect and load Allura (`https://fonts.googleapis.com/css2?family=Allura&display=swap`). Remote fonts must go via `<link>`, not CSS `@import`.
2. **`src/styles.css`** — add `--font-signature: "Allura", cursive;` inside the existing `@theme` block so `font-signature` becomes a usable utility.
3. **`src/components/Nav.tsx`** — apply `font-signature` to the brand wordmark only, with a size bump (script fonts read smaller than sans). Nav links, buttons, and page headings are unchanged.

Frontend/presentation only — no backend or logic changes.
