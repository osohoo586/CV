# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal CV for Өсөхбаяр Батмөнх (Usukhbayar Batmunkh), built as a **single self-contained static page**: `index.html` (~1850 lines) with no build step, no package manager, no tests, and no dependencies beyond CDN-loaded Tailwind and Google Fonts. Everything — markup, CSS, and JS — lives in that one file.

The page is **bilingual (Mongolian / English)** and the **printed PDF is a first-class output**, not an afterthought. Both facts constrain nearly every edit.

## Running / deploying

```bash
open index.html          # macOS; no server or build needed
```

Deployment is `git push origin main` (github.com/osohoo586/CV) → Vercel auto-deploys to https://cv-three-eta-28.vercel.app/. There is no CI, lint, or test to run.

`*.pdf` is gitignored — the PDFs in the working directory are local exports, not sources. `cv.pdf` / `Resume Өсөхбаяр Батмөнх.pdf` are generated via the page's "PDF татах / Download PDF" button (`window.print()` → Save as PDF).

## Structure of `index.html`

| Lines | Content |
| --- | --- |
| 6–16 | Pre-paint script: reads `localStorage` and sets `html.dark` / `html[lang]` before first paint (prevents FOUC). Must run before the stylesheet. |
| 22–34 | Inline `tailwind.config` (font families only). |
| 35–540 | All custom CSS: theme variables, dark-mode overrides, component classes, and the `@media print` block (469–540). |
| 542–1802 | Body: sticky toolbar → `<article class="page">` (hero → 8 numbered sections → footer). |
| 1804–1853 | `setLang()`, `setTheme()`/`toggleTheme()`, `beforeprint`/`afterprint` handlers, and boot-time restore. |

## The three rules that matter

### 1. Every visible string exists twice

Bilingual text is not a translation table — it is duplicated DOM. Each string appears as a `.lang-mn` element and a sibling `.lang-en` element; visibility is pure CSS driven by the root `lang` attribute:

```css
html[lang="mn"] .lang-en { display: none !important; }
html[lang="en"] .lang-mn { display: none !important; }
```

**Any content change must be applied to both the MN and EN copy.** For prose blocks this often means two whole `<p>`/`<ul>` elements (see the About section, lines ~885–896), not two inline spans. `setLang()` also swaps `document.title` — new page-level strings may need to be added there too.

### 2. Dark mode partially fights Tailwind

Colors come from CSS variables on `:root` (light) overridden by `html.dark` (lines ~52–68). But the markup also uses hard-coded Tailwind utilities (`text-neutral-500`, `border-neutral-200`, `bg-white`, …), so lines ~71–90 contain an explicit override table:

```css
html.dark .text-neutral-500,
html.dark .text-neutral-600 { color: var(--sub) !important; }
```

When adding markup, prefer `var(--ink)` / `var(--sub)` / `var(--accent)` etc. If you do reach for a Tailwind neutral class, **check it has an entry in that override block** — otherwise it will look correct in light mode and wrong in dark. Dark is the default theme for new visitors.

### 3. Print is a separate layout, and it must be verified

The `@media print` block (469–540) does real layout work, not just cosmetics:

- Forces A4, hides `.no-print` (toolbar, hints), removes the grid background and card chrome.
- `beforeprint` strips the `dark` class (stashing `--was-dark`) so PDFs don't print dark backgrounds; `afterprint` restores it.
- Collapses the two-column `md:grid` body back to single-column, hides `.soft-sidebar`, and reveals the `.soft-mobile` duplicate of the soft-skills list — **so soft-skills content also exists twice** (sidebar + mobile/print copy).
- Forces every `<details>` open and hides its `<summary>`, so collapsed project detail is still in the PDF.
- `a.print-show-url` appends `attr(href)` after the link text, since URLs aren't clickable on paper.
- `.entry, .project, .award, h2, h3` get `break-inside: avoid`.

After any structural edit, print-preview (Ctrl/Cmd+P) in **both languages** before considering it done.

## Markup conventions

Sections are numbered `01`–`08` and open with a fixed header pattern:

```html
<section id="education" class="section-block">
  <div class="flex items-center gap-4 mb-6">
    <span class="section-num">01</span>
    <h2 class="section-title"><span class="lang-mn">Боловсрол</span><span class="lang-en">Education</span></h2>
    <span class="section-rule"></span>
  </div>
  ...
```

Anchor IDs `#education #experience #projects #research #skills` are linked from the toolbar nav — keep them stable. Renumbering sections means editing the `section-num` spans and the `<!-- ===== NN NAME ===== -->` comments.

Component classes (all defined in the style block): `.entry` / `.entry-meta` (education, experience), `.project` / `.project-name` / `.project-details` (a `<details>` with `[ + ]` / `[ − ]` summary markers), `.skill-cat` / `.skill-list` / `.skill-key` / `.skill-val`, `.cap-block`, `.stack-row` (Daily Stack), `.glance-row` (hero AT A GLANCE), `.tag` / `.tag-ghost`, `.featured-badge`.

Persisted state keys: `cv-lang` (`mn` | `en`) and `cv-theme` (`dark` | `light`, defaults to `dark`).

The page deliberately carries **no "available from" / "last updated" / "current role" dates** — they were removed because they go stale. Don't reintroduce them. The `.status-pill` / `.status-dot` CSS survives unused for that reason; the only remaining date is the `NOV 2025 — JUN 2026` range in the Experience `.entry-meta`, which is employment history.

## `finish_en.js`

Unrelated to the CV page: a one-off Playwright script that logs into zangia.mn (a Mongolian job board) and fills out the English CV form there by driving the DOM. There is no `package.json` — it expects `playwright` to be available ad hoc. It contains the site login credentials in plaintext at the top; don't run or echo it casually, and don't treat it as part of the site.

`certificate-anthropic-claude-code.png` is committed but not referenced by `index.html` — the Achievements entry links to the Skilljar verification URL instead.

## Language

Commit messages and code comments are English; all user-facing content is Mongolian first, English second. Mongolian Cyrillic must be preserved exactly (е/ё, ү/у, ө/о are distinct) — never "fix" it by transliteration.
