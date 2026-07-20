import { randomBytes } from 'node:crypto';

import { airportList } from './airport-catalog.js';

interface LandingPageOptions {
  appStoreUrl: string | null;
}

const fallbackAppStoreUrl = 'https://apps.apple.com/us/search?term=SkyShake';

export function createLandingPage(options: LandingPageOptions) {
  const nonce = randomBytes(18).toString('base64url');
  return {
    html: renderLandingPage(options, nonce),
    contentSecurityPolicy: [
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      "script-src-attr 'none'",
      `style-src 'nonce-${nonce}' https://fonts.googleapis.com`,
      "style-src-attr 'none'",
      'font-src https://fonts.gstatic.com',
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join('; '),
  };
}

const styles = String.raw`
  :root {
    --background: #07111e;
    --surface: rgba(11, 27, 48, 0.94);
    --surface-alt: rgba(19, 40, 68, 0.92);
    --surface-soft: rgba(255, 255, 255, 0.04);
    --line: rgba(119, 216, 255, 0.16);
    --line-strong: rgba(119, 216, 255, 0.26);
    --sky: #77d8ff;
    --signal: #f6a347;
    --signal-soft: #f6c66b;
    --ink: #07111e;
    --smooth: #63d6ab;
    --moderate: #f7ba5d;
    --severe: #ff7b67;
    --text: #f5f8fc;
    --muted: rgba(245, 248, 252, 0.72);
    --shadow: 0 24px 64px rgba(0, 0, 0, 0.32);
    --radius-xl: 36px;
    --radius-lg: 28px;
    --radius-md: 22px;
    --radius-sm: 18px;
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family:
      'Space Grotesk',
      'Avenir Next',
      'Segoe UI',
      sans-serif;
    color: var(--text);
    background:
      radial-gradient(circle at 0% 0%, rgba(246, 163, 71, 0.16), transparent 34%),
      radial-gradient(circle at 100% 0%, rgba(119, 216, 255, 0.15), transparent 32%),
      radial-gradient(circle at 28% 100%, rgba(23, 62, 104, 0.26), transparent 36%),
      linear-gradient(135deg, #07111e 0%, #0a1d33 38%, #14385c 70%, #07111e 100%);
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .page {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 24px 0 56px;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 12px;
    padding: 12px 18px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--signal-soft), var(--signal));
    color: var(--ink);
    box-shadow: 0 14px 28px rgba(246, 163, 71, 0.24);
    font-weight: 700;
  }

  .brand-dot {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    position: relative;
    background:
      radial-gradient(circle at 30% 30%, rgba(7, 17, 30, 0.08), transparent 42%),
      linear-gradient(135deg, rgba(7, 17, 30, 0.96), rgba(18, 40, 63, 0.78));
  }

  .brand-dot::before,
  .brand-dot::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    border: 2px solid rgba(119, 216, 255, 0.5);
  }

  .brand-dot::before {
    inset: 5px;
  }

  .brand-dot::after {
    inset: 9px 5px 5px 9px;
    border-color: rgba(246, 163, 71, 0.82);
  }

  .ghost-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 18px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(7, 17, 30, 0.16);
    color: rgba(245, 248, 252, 0.86);
  }

  .card {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, rgba(19, 40, 68, 0.92), rgba(11, 27, 48, 0.96));
    box-shadow: var(--shadow);
    backdrop-filter: blur(12px);
  }

  .hero {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.06fr) minmax(280px, 0.94fr);
    gap: 26px;
    padding: 32px;
  }

  .hero::before,
  .hero::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  .hero::before {
    width: 280px;
    height: 280px;
    left: -70px;
    top: -118px;
    background: radial-gradient(circle, rgba(246, 163, 71, 0.18), transparent 68%);
  }

  .hero::after {
    width: 320px;
    height: 320px;
    right: -116px;
    bottom: -152px;
    background: radial-gradient(circle, rgba(119, 216, 255, 0.16), transparent 64%);
  }

  .hero-copy,
  .hero-preview {
    position: relative;
    z-index: 1;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(245, 248, 252, 0.84);
    font-size: 0.95rem;
  }

  .pill::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--signal-soft), var(--signal));
  }

  h1 {
    margin: 18px 0 14px;
    font-size: clamp(3rem, 7vw, 4.3rem);
    line-height: 0.96;
    letter-spacing: -0.08em;
  }

  p {
    color: var(--muted);
    line-height: 1.6;
  }

  .hero-copy p {
    max-width: 58ch;
  }

  .tags,
  .hero-actions,
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tags {
    margin: 24px 0;
  }

  .tag,
  .meta-pill {
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .hero-actions {
    gap: 12px;
    margin-top: 8px;
  }

  .btn,
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 999px;
    padding: 16px 22px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 180ms ease, opacity 180ms ease, border-color 180ms ease;
  }

  .btn:hover,
  button:hover {
    transform: translateY(-1px);
  }

  .btn-primary,
  .submit {
    background: linear-gradient(135deg, var(--signal-soft), var(--signal));
    color: var(--ink);
    box-shadow: 0 20px 32px rgba(246, 163, 71, 0.18);
  }

  .btn-secondary {
    color: var(--text);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .hero-note {
    margin-top: 14px;
    font-size: 0.98rem;
    color: rgba(245, 248, 252, 0.64);
  }

  .phone-shell {
    width: min(100%, 360px);
    margin: 0 auto;
    padding: 12px;
    border-radius: 38px;
    background: #03070f;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 18px 30px rgba(0, 0, 0, 0.28);
  }

  .phone-screen {
    position: relative;
    overflow: hidden;
    padding: 18px 20px 20px;
    border-radius: 28px;
    background: linear-gradient(135deg, #11160f, #0a2137 52%, #163b62);
    min-height: 560px;
  }

  .phone-screen::before {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    top: -60px;
    left: -20px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(246, 163, 71, 0.24), transparent 72%);
    pointer-events: none;
  }

  .phone-screen > * {
    position: relative;
    z-index: 1;
  }

  .phone-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    font-weight: 700;
  }

  .phone-signal {
    display: flex;
    gap: 8px;
    color: rgba(245, 248, 252, 0.88);
    font-size: 0.9rem;
  }

  .phone-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--signal-soft), var(--signal));
    color: var(--ink);
    font-weight: 700;
  }

  .phone-badge .brand-dot {
    width: 16px;
    height: 16px;
  }

  .phone-badge .brand-dot::before {
    inset: 3px;
    border-width: 1.5px;
  }

  .phone-badge .brand-dot::after {
    inset: 6px 3px 3px 6px;
    border-width: 1.5px;
  }

  .phone-route {
    margin: 18px 0 8px;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  .phone-copy {
    margin: 0 0 16px;
    color: rgba(245, 248, 252, 0.76);
  }

  .phone-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .phone-card,
  .phone-segment {
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.07);
    padding: 16px;
  }

  .phone-card strong,
  .phone-segment strong {
    display: block;
    margin-top: 8px;
    font-size: 1.1rem;
  }

  .phone-card span,
  .phone-segment span {
    color: rgba(245, 248, 252, 0.6);
    font-size: 0.88rem;
  }

  .phone-download {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: 24px;
    background: linear-gradient(135deg, var(--signal-soft), var(--signal));
    color: var(--ink);
    font-weight: 700;
  }

  .section {
    margin-top: 24px;
    padding: 24px;
  }

  .section-head,
  .split-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;
  }

  .section-head h2,
  .result-title {
    margin: 0 0 8px;
    font-size: 1.45rem;
    letter-spacing: -0.04em;
  }

  .section-copy {
    max-width: 48ch;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    gap: 12px;
    align-items: end;
  }

  label {
    display: grid;
    gap: 8px;
    color: rgba(245, 248, 252, 0.78);
    font-size: 0.96rem;
  }

  input {
    width: 100%;
    padding: 16px 18px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(119, 216, 255, 0.2);
    background: rgba(19, 40, 68, 0.95);
    color: var(--text);
    font: inherit;
    outline: none;
    transition: border-color 180ms ease;
  }

  input:focus {
    border-color: rgba(119, 216, 255, 0.54);
  }

  .submit-wrap {
    display: grid;
    gap: 8px;
  }

  .submit[disabled] {
    cursor: progress;
    opacity: 0.72;
    transform: none;
  }

  .submit-note {
    font-size: 0.9rem;
    color: rgba(245, 248, 252, 0.56);
  }

  .error {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 123, 103, 0.32);
    background: rgba(255, 123, 103, 0.08);
  }

  .error strong,
  .status,
  .download-cta strong {
    color: var(--text);
  }

  .results {
    margin-top: 24px;
    display: grid;
    gap: 16px;
  }

  .results[data-state='idle'] {
    display: none;
  }

  .result-card {
    padding: 24px;
  }

  .notice-card {
    border-color: rgba(246, 198, 107, 0.24);
    background: linear-gradient(180deg, rgba(37, 39, 32, 0.92), rgba(26, 28, 24, 0.96));
  }

  .progress {
    appearance: none;
    width: 100%;
    height: 12px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .progress::-webkit-progress-bar {
    background: rgba(255, 255, 255, 0.08);
  }

  .progress::-webkit-progress-value,
  .progress::-moz-progress-bar {
    border-radius: 999px;
    background: linear-gradient(90deg, var(--smooth), var(--moderate), var(--severe));
  }

  .route-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 12px;
    margin: 20px 0;
  }

  .airport:last-child {
    text-align: right;
  }

  .airport-code {
    display: block;
    font-size: clamp(1.6rem, 4vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.06em;
  }

  .airport-detail {
    margin-top: 6px;
  }

  .arrow {
    display: grid;
    place-items: center;
    color: rgba(245, 248, 252, 0.52);
    font-size: 1.4rem;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
  }

  .metric {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .metric-label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.82rem;
    color: rgba(245, 248, 252, 0.56);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .metric strong {
    display: block;
    color: var(--text);
    font-size: 1rem;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
  }

  .status::before,
  .dot {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: currentColor;
  }

  .smooth {
    color: var(--smooth);
  }

  .moderate {
    color: var(--moderate);
  }

  .severe {
    color: var(--severe);
  }

  .trace svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .grid-line {
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 1;
  }

  .trace-line {
    fill: none;
    stroke: url(#traceGradient);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .trace-point {
    stroke: rgba(255, 255, 255, 0.74);
    stroke-width: 2;
  }

  .trace-label {
    font-family:
      'Space Grotesk',
      'Avenir Next',
      'Segoe UI',
      sans-serif;
    fill: rgba(245, 248, 252, 0.92);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .trace-label.end {
    text-anchor: end;
  }

  .highlight-list {
    display: grid;
    gap: 14px;
  }

  .highlight {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr);
    gap: 12px;
  }

  .highlight .dot {
    margin-top: 6px;
    width: 12px;
    height: 12px;
  }

  .highlight-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }

  .highlight-title {
    font-weight: 700;
  }

  .download-cta {
    display: grid;
    gap: 14px;
    align-items: center;
    background: linear-gradient(135deg, rgba(9, 22, 38, 0.98), rgba(10, 33, 55, 0.96));
  }

  .download-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .reality {
    margin-top: 24px;
  }

  .reality-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .reality-card {
    padding: 22px;
  }

  .reality-card h3 {
    margin: 0 0 10px;
    font-size: 1.12rem;
    letter-spacing: -0.03em;
  }

  .reality-card ul {
    margin: 0;
    padding-left: 18px;
    color: var(--muted);
    line-height: 1.65;
  }

  .reality-card li + li {
    margin-top: 10px;
  }

  @media (max-width: 980px) {
    .hero,
    .form-grid,
    .metric-grid,
    .reality-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .page {
      width: min(100% - 24px, 100%);
      padding-top: 18px;
    }

    .topbar,
    .section-head,
    .split-head {
      flex-direction: column;
      align-items: stretch;
    }

    .hero,
    .section,
    .result-card,
    .reality-card {
      padding: 20px;
    }

    .route-row {
      grid-template-columns: 1fr;
    }

    .airport:last-child {
      text-align: left;
    }

    .btn,
    button,
    .ghost-link {
      width: 100%;
      text-align: center;
    }
  }
`;

function renderLandingPage(options: LandingPageOptions, nonce: string) {
  const appStoreUrl = options.appStoreUrl ?? fallbackAppStoreUrl;
  const airportOptions = airportList
    .map(
      (airport) =>
        `<option value="${escapeHtml(airport.code)}">${escapeHtml(
          `${airport.code} - ${airport.name}`,
        )}</option>`,
    )
    .join('\n');
  const clientScript = buildClientScript(appStoreUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>SkyShake | Turbulence intelligence for calmer flying</title>
    <meta
      name="description"
      content="Preview where a route may get rough with live weather context, route-level scoring, and an honest mobile route briefing."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <style nonce="${nonce}">${styles}</style>
  </head>
  <body>
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <span class="brand-dot" aria-hidden="true"></span>
          <span>SkyShake</span>
        </div>
      </header>

      <main>
        <section class="card hero">
          <div class="hero-copy">
            <div class="pill">SkyShake mobile app</div>
            <h1>Check a route before the cabin does.</h1>
            <p>
              SkyShake helps flyers preview where a route may get rough. Run a route,
              get a score, and see the roughest segments without digging through
              generic weather screens.
            </p>
            <div class="tags" aria-label="Feature highlights">
              <span class="tag">Live weather</span>
              <span class="tag">Route score</span>
              <span class="tag">Segment warnings</span>
            </div>
            <div class="hero-actions">
              <a
                class="btn btn-primary"
                href="${escapeHtml(appStoreUrl)}"
                target="_blank"
                rel="noreferrer"
              >
                Download on the App Store
              </a>
              <a class="btn btn-secondary" href="#route-check">
                Try the live route preview
              </a>
            </div>
            <p class="hero-note">
              The iOS app is the actual product. The live route preview below exists to
              prove the model, not to replace the app.
            </p>
          </div>

          <div class="hero-preview">
            <div class="phone-shell">
              <div class="phone-screen">
                <div class="phone-status">
                  <span>09:41</span>
                  <span class="phone-signal">Bars Wi-Fi</span>
                </div>
                <div class="phone-badge">
                  <span class="brand-dot" aria-hidden="true"></span>
                  <span>SkyShake</span>
                </div>
                <div class="phone-route">SFO to JFK</div>
                <p class="phone-copy">Moderate air ahead over the Rockies.</p>
                <div class="phone-metrics">
                  <div class="phone-card">
                    <span>Outlook</span>
                    <strong>Moderate</strong>
                  </div>
                  <div class="phone-card">
                    <span>Segments</span>
                    <strong>3 rough</strong>
                  </div>
                </div>
                <div class="phone-segment">
                  <span>Roughest segment</span>
                  <strong>Mid-route winds climb sharply near waypoint 6.</strong>
                </div>
                <a
                  class="phone-download"
                  href="${escapeHtml(appStoreUrl)}"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download the app
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="route-check" class="card section">
          <div class="section-head">
            <div>
              <h2>Try the live route preview</h2>
              <p class="section-copy">
                This is the secondary action. It lets people understand the
                weather-backed model before they decide whether the app is worth
                downloading.
              </p>
            </div>
            <span class="metric-label">${airportList.length} bundled airports supported</span>
          </div>

          <form data-route-form novalidate>
            <div class="form-grid">
              <label>
                <span>From</span>
                <input
                  name="departureCode"
                  list="airport-options"
                  placeholder="SFO"
                  value="SFO"
                  maxlength="4"
                  autocomplete="off"
                />
              </label>
              <label>
                <span>To</span>
                <input
                  name="arrivalCode"
                  list="airport-options"
                  placeholder="JFK"
                  value="JFK"
                  maxlength="4"
                  autocomplete="off"
                />
              </label>
              <label>
                <span>Aircraft</span>
                <input
                  name="aircraftType"
                  placeholder="Boeing 787-9"
                  value="Boeing 787-9"
                  autocomplete="off"
                />
              </label>
              <div class="submit-wrap">
                <button class="submit" type="submit" data-submit>
                  <span data-submit-label>Run turbulence check</span>
                </button>
                <span class="submit-note" data-submit-hint>
                  This web demo uses airport-to-airport weather, not a flown-track truth feed.
                </span>
              </div>
            </div>
            <datalist id="airport-options">
${airportOptions}
            </datalist>
          </form>

          <div class="error" data-error hidden>
            <strong>Route check failed.</strong>
            <div data-error-text></div>
          </div>
        </section>

        <section class="results" data-results data-state="idle" aria-live="polite"></section>

        <section class="reality">
          <h2 class="result-title">Reality Check</h2>
          <p>
            This page should stay honest. Explain the job, let people test the
            route model, and be explicit about where the product stops.
          </p>
          <div class="reality-grid">
            <article class="card reality-card">
              <h3>Live on this page</h3>
              <ul>
                <li>Airport-to-airport route analysis calls the backend and scores the route from live weather data at each waypoint.</li>
                <li>The landing page ships from the Node backend directly, so deployment no longer depends on Flutter web.</li>
              </ul>
            </article>
            <article class="card reality-card">
              <h3>Current boundaries</h3>
              <ul>
                <li>SkyShake models route turbulence from weather data. It does not guarantee what a specific cabin will feel like.</li>
                <li>Flight lookup remains a separate provider-backed feature. If that upstream path fails, SkyShake should fail honestly rather than fabricate fallback data.</li>
              </ul>
            </article>
          </div>
        </section>
      </main>
    </div>
    <script nonce="${nonce}">${clientScript}</script>
  </body>
</html>`;
}

function buildClientScript(appStoreUrl: string) {
  return String.raw`
    (() => {
      const appStoreUrl = ${JSON.stringify(appStoreUrl)};
      const form = document.querySelector('[data-route-form]');
      const results = document.querySelector('[data-results]');
      const errorBox = document.querySelector('[data-error]');
      const errorText = document.querySelector('[data-error-text]');
      const submitButton = document.querySelector('[data-submit]');
      const submitLabel = document.querySelector('[data-submit-label]');
      const submitHint = document.querySelector('[data-submit-hint]');
      let isSubmitting = false;

      if (!form || !results || !errorBox || !errorText || !submitButton || !submitLabel || !submitHint) {
        return;
      }

      const departureInput = form.elements.namedItem('departureCode');
      const arrivalInput = form.elements.namedItem('arrivalCode');
      const aircraftInput = form.elements.namedItem('aircraftType');

      if (!(departureInput instanceof HTMLInputElement) || !(arrivalInput instanceof HTMLInputElement) || !(aircraftInput instanceof HTMLInputElement)) {
        return;
      }

      function sanitizeCode(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      }

      function element(tagName, className, text) {
        const node = document.createElement(tagName);
        if (className) {
          node.className = className;
        }
        if (text !== undefined) {
          node.textContent = String(text);
        }
        return node;
      }

      function append(parent, ...children) {
        children.forEach((child) => {
          if (child == null) {
            return;
          }
          parent.appendChild(
            child instanceof Node ? child : document.createTextNode(String(child)),
          );
        });
        return parent;
      }

      function svgElement(tagName, attributes = {}) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        Object.entries(attributes).forEach(([name, value]) => {
          node.setAttribute(name, String(value));
        });
        return node;
      }

      function severityClass(label) {
        const normalized = String(label || '').toLowerCase();
        if (normalized === 'severe') {
          return 'severe';
        }
        if (normalized === 'moderate') {
          return 'moderate';
        }
        return 'smooth';
      }

      function formatPercent(score) {
        return Math.round((Number(score) || 0) * 100) + '%';
      }

      function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return 'Date unavailable';
        }
        return new Intl.DateTimeFormat(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(date);
      }

      function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return '--:--';
        }
        return new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
      }

      function formatDuration(startValue, endValue) {
        const start = new Date(startValue);
        const end = new Date(endValue);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return 'Duration unavailable';
        }
        const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return hours + 'h ' + remainder + 'm';
      }

      function renderMetric(label, value) {
        return append(
          element('div', 'metric'),
          element('span', 'metric-label', label),
          element('strong', '', value),
        );
      }

      function selectHighlights(waypoints) {
        if (!Array.isArray(waypoints) || waypoints.length === 0) {
          return [];
        }
        const selected = [];
        const seen = new Set();
        const candidates = [waypoints[0], ...waypoints.filter((waypoint) => Number(waypoint.turbulenceScore) >= 0.5).slice(0, 3), waypoints[Math.floor(waypoints.length / 2)], waypoints[waypoints.length - 1]];
        candidates.forEach((waypoint) => {
          const key = Number(waypoint.waypoint);
          if (!seen.has(key)) {
            seen.add(key);
            selected.push(waypoint);
          }
        });
        return selected.sort((left, right) => Number(left.waypoint) - Number(right.waypoint));
      }

      function unwrapWaypoints(waypoints) {
        if (!Array.isArray(waypoints) || waypoints.length === 0) {
          return [];
        }
        const points = waypoints.map((waypoint) => ({
          ...waypoint,
          latitude: Number(waypoint.latitude),
          longitude: Number(waypoint.longitude),
        }));
        for (let index = 1; index < points.length; index += 1) {
          let longitude = Number(points[index].longitude);
          const reference = Number(points[index - 1].longitude);
          while (longitude - reference > 180) {
            longitude -= 360;
          }
          while (longitude - reference < -180) {
            longitude += 360;
          }
          points[index] = { ...points[index], longitude };
        }
        return points;
      }

      function buildTrace(report, flightData) {
        const waypoints = unwrapWaypoints(report.waypoints || []);
        if (waypoints.length === 0) {
          return element('p', '', 'Route trace unavailable.');
        }

        const width = 980;
        const height = 320;
        const padX = 60;
        const padY = 42;
        const latitudes = waypoints.map((waypoint) => Number(waypoint.latitude));
        const longitudes = waypoints.map((waypoint) => Number(waypoint.longitude));
        const minLat = Math.min.apply(null, latitudes);
        const maxLat = Math.max.apply(null, latitudes);
        const minLon = Math.min.apply(null, longitudes);
        const maxLon = Math.max.apply(null, longitudes);
        const latSpan = Math.max(1, maxLat - minLat);
        const lonSpan = Math.max(1, maxLon - minLon);
        const points = waypoints.map((waypoint) => {
          const x = padX + ((Number(waypoint.longitude) - minLon) / lonSpan) * (width - padX * 2);
          const y = height - padY - ((Number(waypoint.latitude) - minLat) / latSpan) * (height - padY * 2);
          return { ...waypoint, x, y };
        });

        const path = points.map((point, index) => (index === 0 ? 'M' : 'L') + point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
        const start = points[0];
        const end = points[points.length - 1];
        const svg = svgElement('svg', {
          viewBox: '0 0 ' + width + ' ' + height,
          role: 'img',
          'aria-label': 'Route trace from ' + String(flightData.departure || '') + ' to ' + String(flightData.arrival || ''),
        });
        const definitions = svgElement('defs');
        const gradient = svgElement('linearGradient', {
          id: 'traceGradient',
          x1: '0%',
          y1: '0%',
          x2: '100%',
          y2: '0%',
        });
        append(
          gradient,
          svgElement('stop', { offset: '0%', 'stop-color': '#63d6ab' }),
          svgElement('stop', { offset: '55%', 'stop-color': '#f7ba5d' }),
          svgElement('stop', { offset: '100%', 'stop-color': '#ff7b67' }),
        );
        append(definitions, gradient);
        append(svg, definitions);
        [64, 160, 256].forEach((y) => {
          append(svg, svgElement('line', {
            class: 'grid-line',
            x1: 0,
            y1: y,
            x2: width,
            y2: y,
          }));
        });
        append(svg, svgElement('path', { class: 'trace-line', d: path }));
        points.forEach((point) => {
          append(svg, svgElement('circle', {
            class: 'trace-point ' + severityClass(point.label),
            cx: point.x.toFixed(1),
            cy: point.y.toFixed(1),
            r: 7,
          }));
        });
        const startLabel = svgElement('text', {
          class: 'trace-label',
          x: start.x.toFixed(1),
          y: (start.y - 18).toFixed(1),
        });
        startLabel.textContent = String(flightData.departure || '');
        const endLabel = svgElement('text', {
          class: 'trace-label end',
          x: end.x.toFixed(1),
          y: (end.y - 18).toFixed(1),
        });
        endLabel.textContent = String(flightData.arrival || '');
        append(svg, startLabel, endLabel);
        return svg;
      }

      function renderDownloadCard() {
        const copy = append(
          element('div'),
          element('span', 'metric-label', 'Next step'),
          element('strong', '', 'Want the mobile briefing instead of the web demo?'),
          element('p', '', 'Download the iOS app if the route preview looks useful. The app is the main product surface.'),
        );
        const link = element('a', 'btn btn-primary', 'Download on the App Store');
        link.href = appStoreUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        return append(
          element('article', 'card result-card download-cta'),
          copy,
          append(element('div', 'download-actions'), link),
        );
      }

      function renderResults(payload) {
        const report = payload.report;
        const flightData = payload.flightData;
        const waypoints = Array.isArray(report.waypoints) ? report.waypoints : [];
        const averageWind = waypoints.length ? waypoints.reduce((sum, waypoint) => sum + Number(waypoint.windSpeed || 0), 0) / waypoints.length : 0;
        const peakGust = waypoints.length ? Math.max.apply(null, waypoints.map((waypoint) => Number(waypoint.windGusts || 0))) : 0;
        const averageShear = waypoints.length ? waypoints.reduce((sum, waypoint) => sum + Number(waypoint.windShear || 0), 0) / waypoints.length : 0;
        const highlights = selectHighlights(waypoints);
        const highlightRows = highlights.map((waypoint) => {
          const title = Number(waypoint.waypoint) === 0 ? 'Departure segment' : 'Waypoint ' + String(waypoint.waypoint);
          const severity = severityClass(waypoint.label);
          const dot = element('span', 'dot ' + severity);
          dot.setAttribute('aria-hidden', 'true');
          const heading = append(
            element('div', 'highlight-head'),
            element('span', 'highlight-title', title),
            element('span', 'status ' + severity, String(waypoint.label || '') + ' / ' + formatPercent(waypoint.turbulenceScore)),
          );
          const details = append(
            element('div'),
            heading,
            element('p', '', 'Wind ' + Math.round(Number(waypoint.windSpeed || 0)) + ' km/h / Gusts ' + Math.round(Number(waypoint.windGusts || 0)) + ' km/h / Cruise-layer shear ' + Number(waypoint.windShear || 0).toFixed(1) + ' km/h'),
            element('p', '', 'Temp ' + Math.round(Number(waypoint.temperature || 0)) + ' deg C / CAPE ' + Math.round(Number(waypoint.cape || 0)) + ' J/kg'),
          );
          return append(element('div', 'highlight'), dot, details);
        });

        const noticeCard = append(
          element('article', 'card result-card notice-card'),
          element('div', 'result-title', 'Live route estimate'),
          element('p', '', payload.notice || ''),
        );

        const routeHeading = append(
          element('div'),
          element('span', 'metric-label', 'Route brief'),
          element('div', 'result-title', flightData.flightNumber || 'Unknown route'),
          element('p', '', flightData.airline || 'SkyShake'),
        );
        const routeHeader = append(
          element('div', 'split-head'),
          routeHeading,
          element('span', 'status', flightData.status || 'live estimate'),
        );
        const departure = append(
          element('div', 'airport'),
          element('span', 'metric-label', 'Departure'),
          element('span', 'airport-code', flightData.departure || '--'),
          element('p', 'airport-detail', (flightData.departureAirport || flightData.departure || '--') + ' / ' + formatTime(flightData.departureTime)),
        );
        const arrival = append(
          element('div', 'airport'),
          element('span', 'metric-label', 'Arrival'),
          element('span', 'airport-code', flightData.arrival || '--'),
          element('p', 'airport-detail', (flightData.arrivalAirport || flightData.arrival || '--') + ' / ' + formatTime(flightData.arrivalTime)),
        );
        const routeMetrics = append(
          element('div', 'metric-grid'),
          renderMetric('Departure date', formatDate(flightData.departureTime)),
          renderMetric('Estimated duration', formatDuration(flightData.departureTime, flightData.arrivalTime)),
          renderMetric('Aircraft', flightData.aircraft || 'Aircraft unavailable'),
          renderMetric('Cruise altitude', flightData.altitude ? Math.round(Number(flightData.altitude)).toLocaleString() + ' ft' : 'Altitude unavailable'),
        );
        const routeCard = append(
          element('article', 'card result-card'),
          routeHeader,
          append(element('div', 'route-row'), departure, element('div', 'arrow', '->'), arrival),
          routeMetrics,
        );

        const scoreHeader = append(
          element('div', 'split-head'),
          append(
            element('div'),
            element('span', 'metric-label', 'Overall turbulence outlook'),
            element('div', 'result-title', report.overallLabel || 'Unknown'),
          ),
          element('strong', '', formatPercent(report.overallScore)),
        );
        const progress = element('progress', 'progress');
        progress.max = 100;
        progress.value = Math.max(0, Math.min(100, Math.round(Number(report.overallScore || 0) * 100)));
        progress.setAttribute('aria-label', 'Overall route score');
        const scoreMetrics = append(
          element('div', 'metric-grid'),
          renderMetric('Average wind', averageWind.toFixed(1) + ' km/h'),
          renderMetric('Peak gusts', peakGust.toFixed(1) + ' km/h'),
          renderMetric('Average shear', averageShear.toFixed(1) + ' km/h'),
          renderMetric('Average score', formatPercent(report.averageScore)),
        );
        const scoreCard = append(
          element('article', 'card result-card'),
          scoreHeader,
          progress,
          scoreMetrics,
        );

        const traceHeader = append(
          element('div', 'section-head'),
          append(
            element('div'),
            element('div', 'result-title', 'Route trace'),
            element('p', '', 'This keeps the directional story of the flight without turning the landing page into a second product shell.'),
          ),
          element('span', 'metric-label', String(report.totalWaypoints || 0) + ' waypoints analysed'),
        );
        const traceCard = append(
          element('article', 'card result-card trace'),
          traceHeader,
          buildTrace(report, flightData),
        );

        const highlightList = element('div', 'highlight-list');
        if (highlightRows.length === 0) {
          append(highlightList, element('p', '', 'No waypoint detail was returned for this run.'));
        } else {
          highlightRows.forEach((row) => append(highlightList, row));
        }
        const analysisCard = append(
          element('article', 'card result-card'),
          append(
            element('div', 'section-head'),
            append(
              element('div'),
              element('div', 'result-title', 'Route analysis'),
              element('p', '', 'These are the most meaningful segments from the live weather run, not every sample point.'),
            ),
          ),
          highlightList,
        );

        return [noticeCard, routeCard, scoreCard, traceCard, analysisCard, renderDownloadCard()];
      }

      function clearResults() {
        results.replaceChildren();
        results.setAttribute('data-state', 'idle');
      }

      function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitLabel.textContent = isLoading ? 'Running check...' : 'Run turbulence check';
        submitHint.textContent = isLoading ? 'Calling the Node backend for live weather snapshots.' : 'This web demo uses airport-to-airport weather, not a flown-track truth feed.';
      }

      function showError(message) {
        errorText.textContent = message;
        errorBox.hidden = false;
      }

      function clearError() {
        errorText.textContent = '';
        errorBox.hidden = true;
      }

      function normalizeInputs() {
        departureInput.value = sanitizeCode(departureInput.value);
        arrivalInput.value = sanitizeCode(arrivalInput.value);
      }

      departureInput.addEventListener('input', normalizeInputs);
      arrivalInput.addEventListener('input', normalizeInputs);
      clearResults();

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSubmitting) {
          return;
        }

        normalizeInputs();
        clearError();

        const departureCode = sanitizeCode(departureInput.value);
        const arrivalCode = sanitizeCode(arrivalInput.value);
        const aircraftType = aircraftInput.value.trim() || 'Boeing 737 MAX 8';

        if (departureCode.length < 3 || arrivalCode.length < 3) {
          clearResults();
          showError('Enter two supported airport codes before running the route check.');
          return;
        }

        if (departureCode === arrivalCode) {
          clearResults();
          showError('Departure and arrival airports must be different.');
          return;
        }

        isSubmitting = true;
        setLoading(true);

        try {
          const response = await fetch('/v1/public/route-analysis/airports', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ departureCode, arrivalCode, aircraftType }),
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload && payload.error ? payload.error : 'The route check failed before it returned usable data.');
          }

          results.replaceChildren(...renderResults(payload));
          results.setAttribute('data-state', 'loaded');
          results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
          clearResults();
          showError(error instanceof Error ? error.message : 'The route check failed unexpectedly.');
        } finally {
          isSubmitting = false;
          setLoading(false);
        }
      });
    })();
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}
