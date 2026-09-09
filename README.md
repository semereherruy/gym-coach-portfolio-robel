# Robel Tadele — Scientific and Elite Personal Coaching

A static, scroll-driven trainer portfolio. No build step, no framework, no backend:
open `index.html` (over HTTP) and it runs.

---

## Design thesis

> A site about **coached strength**, shown through the visual language of a
> **training logbook** — set notation, load in kg, week markers and session codes.

- **Palette** — one near-black ground and one acid lime, sampled from the
  reference: page `#0D0D0D`, surfaces `#151715` / `#1D201D`, text `#F1F3EF`,
  muted `#8E948C`, accent `#8BE35A` (`--accent-ink` `#0D0D0D` is the type placed
  *on* the lime). There is no light mode and no second colour: photography is
  graded to near-greyscale so the lime is the only colour on the page.
- **Type**: `Archivo` variable — its **width axis carries emphasis** instead of an
  italic serif — with `IBM Plex Mono` for every instrument label, and `Inter` for body.
- **Signature device**: the **telemetry rail** fixed to the bottom edge. It is the
  scroll progress, the chapter state and the standing CTA in one element — which is
  why there is no separate top progress bar and no floating bubble. It carries a
  single progress representation (the hairline), never two.
- **Motion**: hard-edged. Clip reveals, rules extending from zero, one-axis translation,
  variable-font width changes. No blur transitions, no particles, no trailing cursor.

## Structure

```
index.html              all markup
assets/css/style.css    design tokens + every component (19 numbered sections)
assets/js/main.js       motion engine, no dependencies
scripts/extract_frames.py   video -> WebP frame sequence (needs ffmpeg)
assets/media/           empty; drop showreel.mp4 / frames here
```

The page: hero → ticker → about + animated stats → expertise (interactive panels,
meters, circular indicator) → programs (pinned horizontal scroll) → transformations
(draggable before/after) → method (scroll-animated 5-step loop) → **scroll sequence**
(canvas) → contact sheet → why → testimonials → CTA → contact → footer.

## Motion engine

One `requestAnimationFrame` loop drives every scroll effect (`frame()` in `main.js`).
Reveals use `IntersectionObserver`. Notable pieces:

- **Dwell-remapped canvas sequence** — scroll position is remapped through a
  Gaussian dwell LUT so playback slows around each chapter centre, then LERP-smoothed.
  Nearest-loaded-frame fallback means the canvas never flashes blank. DPR capped at 2,
  loop paused when the tab is hidden.
- **Pinned horizontal programs** — a tall track with a sticky stage; below 860px it
  degrades to a native snap-scroller.
- **Before/after sliders** — pointer drag *and* a real `<input type="range">`, so they
  work with a keyboard and a screen reader.

> One caveat worth knowing: never put `clip-path` on an element you also observe with
> `IntersectionObserver` — Chrome then reports a zero intersection and the reveal never
> fires. That is why the mask clip lives on the inner `<img>`, not on `.mask`.

## Swapping in real footage

The showreel section is a real frame-sequence player running on five placeholder
stills. To feed it actual video:

```bash
brew install ffmpeg                       # the extractor needs ffmpeg + ffprobe
python3 scripts/extract_frames.py \
  --input /path/to/showreel.mp4 \
  --output assets/media/frames \
  --frames 120
```

Then point the section at the manifest in `index.html`:

```html
<section class="seq" id="reel" data-frames="assets/media/frames/manifest.json">
```

The engine picks up the frame count, the mobile crop set and the recommended scroll
height automatically, loads chapter-centre frames first, and takes over from the stills.

## Customising

| What | Where |
|---|---|
| Name, phone, WhatsApp, Instagram, email, address | search `index.html` for `251900000000`, `kanemercer.com`, `Bole Road` |
| Colours, type scale, spacing, radii | `:root` tokens at the top of `style.css` — change `--accent` alone to reflavour the whole page |
| Photos | every `images.unsplash.com` URL in `index.html` |
| Photo grading | the `filter:` rules in section 20 of `style.css` (drop them for full colour) |
| Sequence chapters | the four `.seq__ch` blocks (`data-center` / `data-window`) |
| Programs, expertise, testimonials | plain markup — duplicate a block to add one |

## Placeholder content — read before publishing

- **All imagery is Unsplash stock.** The before/after sliders are *not* real clients;
  they are labelled as placeholders on the page. Replace them with your own photos and
  written consent before publishing.
- The stats (8 years, 500 clients, 94% retention, 12k sessions), certifications,
  testimonials and the studio address are invented. Make them true or remove them.
- WhatsApp/phone numbers are `+251 900 000 000` dummies.

## Accessibility & performance

- `prefers-reduced-motion` is honoured throughout: the sequence renders one stable
  frame, the pin releases, every reveal resolves to its final state.
- Skip link, visible focus rings, semantic headings (no level skips), labelled icon
  controls, 44px minimum touch targets, AA-or-better text contrast.
- Images are lazy-loaded with explicit `width`/`height` (no layout shift); fonts load
  with `display=swap`; the hero image is preloaded with `fetchpriority="high"`.

## Running locally

```bash
cd /Users/owner/Desktop/trainer-portfolio && python3 -m http.server 8080
```

Then open <http://localhost:8080>. Serve over HTTP rather than opening the file
directly — `file://` blocks the manifest fetch.

## Real content, and what is still missing

Everything on the page now comes from `port/Robel .pdf` and `img/`. The earlier
build was a placeholder persona; every invented figure has been removed — there
are no client counts, no kg-lost numbers, no retention percentages and no named
testimonial quotes, because none of those exist in the source.

What is on the page and where it came from:

| Content | Source |
|---|---|
| Name, title, "Scientific and elite" | portfolio p1 |
| Philosophy quote, "body-tuning", "my lab" | portfolio p2 (verbatim) |
| Seven skills | portfolio p3 |
| Client before/after photos | portfolio p4–p5 (faces redacted in source) |
| Five years, private & online, bio | portfolio p6 |
| YOBI Rooms certification, July 2024 | portfolio p6 |
| "Stop training for next month…" | portfolio p7 |
| Phone, Instagram | portfolio p7 |
| Coach photography | `img/IMG_8297–8299` |

Still to supply:

- **TikTok handle** — the portfolio shows a QR code only, so the link was left out
  rather than guessed.
- **Client consent** for the before/after photos before this goes public.
- **Testimonial quotes**, if you want words next to the transformation photos.
- **Training location**, if private sessions run from a fixed address.
- **Email**, if you want one listed. `yobirooms780@gmail.com` on the certificate
  belongs to the certifying gym, not to Robel, so it was not used.

Image files live in `assets/img/` (resized and compressed from `img/` and the
PDF). The originals in `img/` and `port/` are left untouched.
