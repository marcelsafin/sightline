export const DEMO_NAME = 'stride-for-life.html'

export const DEMO_HTML = `
<div class="stride-page" data-demo-document>
  <div class="stride-page-head" data-page-head data-sightline-key="page-head" hidden>
    <span data-page-html data-sightline-key="page-html"></span>
  </div>
  <nav class="stride-nav" aria-label="Campaign navigation">
    <a class="stride-brand" href="#stride-main">
      <span aria-hidden="true"></span>
      <strong>Stride for Life</strong>
    </a>
    <a href="#about">About the race</a>
    <a href="#teams">Teams</a>
    <a href="#donate">Donate</a>
    <a
      href="https://example.org/results"
      target="_blank"
      data-sightline-key="results-link"
    >Results</a>
    <div
      class="stride-share"
      role="buton"
      tabindex="5"
      data-sightline-key="aria-share"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"></path>
        <path d="M12 16V3"></path>
        <path d="m7 8 5-5 5 5"></path>
      </svg>
    </div>
  </nav>

  <main id="stride-main">
    <section class="stride-hero" id="about">
      <div>
        <p class="stride-date">3 · 6 · 12 km — September 14</p>
        <h1>Every step counts</h1>
        <p
          class="stride-lede stride-low-contrast"
          data-sightline-key="contrast-lede"
        >Walk, jog or run for someone you love. Every kilometre becomes research funding — and every entry makes the starting field a little bigger.</p>
        <a
          class="stride-primary"
          href="#donate"
          tabindex="3"
          data-sightline-key="focus-signup"
        >Sign up · $25</a>
      </div>
      <figure class="stride-hero-art">
        <img
          src="/stride-placeholder.svg"
          data-sightline-key="image-hero"
        >
      </figure>
    </section>

    <section class="stride-donation" id="donate">
      <h1 class="stride-tagline" data-sightline-key="second-h1">Give what you can</h1>
      <h4
        class="stride-section-title"
        data-sightline-key="heading-donation"
      >Make a donation</h4>
      <div class="stride-amounts">
        <button type="button">$20</button>
        <button type="button">$50</button>
        <button type="button">$100</button>
        <span class="stride-distance">
          <span data-visual-label>Distance</span>
          <input
            type="text"
            readonly
            data-sightline-key="label-distance"
          >
        </span>
      </div>
      <div class="stride-meter">
        <div>
          <strong>$1,284,730</strong>
          <span
            class="stride-low-contrast"
            data-sightline-key="contrast-goal"
          >68% of our demo goal</span>
        </div>
        <div class="stride-meter-track"><span></span></div>
      </div>
    </section>

    <section class="stride-community" id="teams">
      <h2 class="stride-context-heading">Teams and newsletter</h2>
      <div class="stride-community-grid">
        <div>
          <h4
            class="stride-section-title"
            data-sightline-key="heading-teams"
          >Top teams</h4>
          <ul class="stride-teams">
            <li><span>Team Meridian</span><strong>$84,200</strong></li>
            <li><span>Northside Runners</span><strong>$71,940</strong></li>
            <li><span>The Office Crew</span><strong>$63,110</strong></li>
          </ul>
          <p class="stride-teams-more">
            Every team gets a page with its route, photos and total.
            <a href="#teams-all" data-sightline-key="teams-link">Read more</a>
          </p>
        </div>
        <form class="stride-newsletter" onsubmit="return false">
          <span
            class="stride-section-title stride-low-contrast"
            data-sightline-key="contrast-newsletter"
          >Newsletter</span>
          <span class="stride-input-wrap">
            <span data-visual-label>name@example.com</span>
            <input
              id="stride-email"
              type="email"
              data-sightline-key="label-email"
            >
          </span>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </section>
  </main>

  <footer class="stride-footer">
    <p
      class="stride-low-contrast"
      data-sightline-key="contrast-footer"
    >© 2026 Stride for Life · Synthetic demo data</p>
    <div>
      <a href="#facebook" aria-label="Facebook">
        <img
          src="/stride-facebook.svg"
          data-sightline-key="image-facebook"
        >
      </a>
      <a href="#instagram" aria-label="Instagram">
        <img
          src="/stride-instagram.svg"
          data-sightline-key="image-instagram"
        >
      </a>
    </div>
  </footer>
</div>
`.trim()

export const DEMO_PROMPT =
  'Audit this page with Sightline. Show me each barrier in context and wait for my approval before changing anything.'
