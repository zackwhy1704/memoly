'use client';

import { useState, useEffect, useRef } from 'react';

type Screen = 'home' | 'login';

const SPARK_COLORS = ['#00BBA4', '#FF6BAE', '#FFB81A', '#FF6660', '#2EC870', '#FFD100', '#2BA8F2'];

function sparkle(stage: HTMLElement) {
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div');
    s.className = 'mkt-spark';
    s.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
    s.style.left = '50%';
    s.style.top = '42%';
    stage.appendChild(s);
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 60 + Math.random() * 55;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 26;
    s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
        { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: '0' },
      ],
      { duration: 700 + Math.random() * 240, easing: 'cubic-bezier(.3,1,.5,1)' }
    ).onfinish = () => s.remove();
  }
}

function triggerReact(floatEl: HTMLElement, stageEl: HTMLElement, kind: 'ok' | 'err') {
  floatEl.classList.remove('jump', 'wobble');
  void floatEl.offsetWidth;
  if (kind === 'ok') {
    floatEl.classList.add('jump');
    sparkle(stageEl);
  } else {
    floatEl.classList.add('wobble');
  }
}

export default function MarketingPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwFocused, setPwFocused] = useState(false);

  const heroStageRef  = useRef<HTMLDivElement>(null);
  const heroFloatRef  = useRef<HTMLDivElement>(null);
  const heroImgRef    = useRef<HTMLImageElement>(null);
  const loginStageRef = useRef<HTMLDivElement>(null);
  const loginFloatRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // cursor-follow lean on hero
  useEffect(() => {
    if (reducedMotion.current) return;
    const img = heroImgRef.current;
    const stage = heroStageRef.current;
    if (!img || !stage) return;

    function onMove(e: MouseEvent) {
      if (screen !== 'home') return;
      const r = stage!.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 300));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 300));
      img!.style.transform = `rotate(${dx * 5}deg) translate(${dx * 7}px,${dy * 5}px)`;
    }

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [screen]);

  function handleHeroClick() {
    if (reducedMotion.current) return;
    const f = heroFloatRef.current;
    const s = heroStageRef.current;
    if (f && s) triggerReact(f, s, 'ok');
  }

  function handleSignIn() {
    const f = loginFloatRef.current;
    const s = loginStageRef.current;
    if (!f || !s) return;
    const ok = /.+@.+/.test(email) && password.length >= 4;
    triggerReact(f, s, ok ? 'ok' : 'err');
  }

  const iosUrl     = process.env.NEXT_PUBLIC_IOS_URL     ?? '#';
  const androidUrl = process.env.NEXT_PUBLIC_ANDROID_URL ?? '#';

  return (
    <div>
      {/* ── Nav ── */}
      <nav className="mkt-nav">
        <div className="mkt-wrap mkt-nav-in">
          <button className="mkt-brand" onClick={() => setScreen('home')}>
            <span className="mkt-brand-chip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mochi-base-transparent.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              </span>
            Apalchi
          </button>
          <div className="mkt-nav-links">
            <a href="#how">How it works</a>
            <a href="#centres">For institutes</a>
            <a href="#">Pricing</a>
          </div>
          <div className="mkt-nav-cta">
            <button className="mkt-ghost" onClick={() => setScreen('login')}>Log in</button>
            <button
              className="mkt-btn mkt-btn-primary"
              onClick={() => {
                if (!reducedMotion.current) {
                  const f = heroFloatRef.current;
                  const s = heroStageRef.current;
                  if (f && s) triggerReact(f, s, 'ok');
                }
              }}
            >
              Get the app
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════ HOME SCREEN ══════════════════ */}
      <div className={`mkt-screen ${screen === 'home' ? 'active' : ''}`}>
        {/* Hero */}
        <header className="mkt-hero">
          <div className="mkt-wrap">
            <span className="mkt-eyebrow">
              <span className="mkt-eyebrow-dot" />
              Studies from your own notes
            </span>
            <h1 className="mkt-hero-h">
              Meet Mochi, the study buddy that{' '}
              <span className="mkt-hl">knows your notes</span>.
            </h1>
            <p className="mkt-sub">
              Upload your notes, photos or worksheets. Mochi turns them into quizzes,
              flashcards and a tutor that asks the right questions — never just hands
              you answers.
            </p>

            {/* Hero Mochi */}
            <div
              className="mkt-hero-mochi"
              ref={heroStageRef}
              onClick={handleHeroClick}
            >
              <div className="mkt-blob" />
              <div className="mkt-float" ref={heroFloatRef}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="mkt-mochi-img"
                  ref={heroImgRef}
                  src="/mochi-base-transparent.png"
                  alt="Mochi mascot"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Steps */}
        <section className="mkt-band" id="how" style={{ paddingTop: 34 }}>
          <div className="mkt-wrap">
            <p className="mkt-kicker">Your friend, your notes, your learning</p>
            <h2 className="mkt-band-h">Three steps, your material</h2>
            <div className="mkt-steps">
              <div className="mkt-step">
                <div className="mkt-step-ic">📓</div>
                <span className="mkt-step-num">Step 1</span>
                <h3>Upload your notes</h3>
                <p>
                  Snap a photo or drop a PDF. Mochi reads your actual material —
                  not a generic question bank.
                </p>
              </div>
              <div className="mkt-step">
                <div className="mkt-step-ic">💬</div>
                <span className="mkt-step-num">Step 2</span>
                <h3>Study with Mochi</h3>
                <p>
                  Quizzes and flashcards built from your notes, plus a tutor that
                  guides you to the answer.
                </p>
              </div>
              <div className="mkt-step">
                <div className="mkt-step-ic">🎓</div>
                <span className="mkt-step-num">Step 3</span>
                <h3>Teach it back</h3>
                <p>
                  Explain it to Mochi to lock it in. The bit you can&apos;t explain
                  is the bit to revise.
                </p>
              </div>
            </div>

            {/* Store badges */}
            <div className="mkt-download-row">
              <a className="mkt-store" href={iosUrl}>
                <span className="mkt-store-icon">🍎</span>
                <span>
                  <small>Download on the</small>
                  <b>App Store</b>
                </span>
              </a>
              <a className="mkt-store" href={androidUrl}>
                <span className="mkt-store-icon">▶</span>
                <span>
                  <small>Get it on</small>
                  <b>Google Play</b>
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Centres */}
        <section className="mkt-band" id="centres">
          <div className="mkt-wrap">
            <div className="mkt-centre">
              <div>
                <h2>For education institutes</h2>
                <p>
                  Upload your institute&apos;s notes once. Every student gets a Mochi
                  trained on your curriculum — and before each class you get a brief on
                  exactly what to reteach, and who&apos;s falling behind.
                </p>
                <button className="mkt-btn">Book an institute demo</button>
              </div>
              <div className="mkt-dash">
                <div className="mkt-dash-head">
                  <b>Class analytics</b>
                  <span className="mkt-dash-tag">Sec 3 Math · Tue</span>
                </div>
                <div className="mkt-tiles">
                  <div className="mkt-tile good">
                    <div className="mkt-tile-v">72%</div>
                    <div className="mkt-tile-k">Mastery</div>
                  </div>
                  <div className="mkt-tile warn">
                    <div className="mkt-tile-v">2</div>
                    <div className="mkt-tile-k">Need help</div>
                  </div>
                  <div className="mkt-tile">
                    <div className="mkt-tile-v">10</div>
                    <div className="mkt-tile-k">On track</div>
                  </div>
                </div>
                <div className="mkt-chart">
                  <div className="mkt-bar low" style={{ height: '42%' }}><span>Quad</span></div>
                  <div className="mkt-bar mid" style={{ height: '66%' }}><span>Index</span></div>
                  <div className="mkt-bar"     style={{ height: '90%' }}><span>Factor</span></div>
                  <div className="mkt-bar mid" style={{ height: '74%' }}><span>Surds</span></div>
                  <div className="mkt-bar"     style={{ height: '84%' }}><span>Graphs</span></div>
                </div>
                <div className="mkt-brief-lines">
                  <div className="mkt-ln">
                    <span className="mkt-pill focus">FOCUS</span>
                    8 of 12 missed quadratic roots
                  </div>
                  <div className="mkt-ln">
                    <span className="mkt-pill call">CALL</span>
                    Jack, Aisyah need support
                  </div>
                  <div className="mkt-ln">
                    <span className="mkt-pill skip">SKIP</span>
                    Class has mastered factorising
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mkt-band">
          <div className="mkt-wrap">
            <p className="mkt-kicker">What people say</p>
            <h2 className="mkt-band-h">Students, parents &amp; tutors</h2>
            <div className="mkt-quotes">
              <div className="mkt-quote">
                <div className="mkt-stars">★★★★★</div>
                <p>
                  &ldquo;ok i was lowkey sceptical 😅 but it quizzes me on MY notes, not
                  random textbook stuff. somehow made bio bearable — jumped a grade band
                  before prelims!&rdquo;
                </p>
                <div className="mkt-who">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="mkt-av" src="https://randomuser.me/api/portraits/women/65.jpg" alt="Rachel L." />
                  <span>
                    <b>Rachel L.</b>
                    <small>Student</small>
                  </span>
                </div>
              </div>
              <div className="mkt-quote">
                <div className="mkt-stars">★★★★★</div>
                <p>
                  &ldquo;The pre-class brief is what sold me. I walk in already knowing
                  which topics flopped and who to pull aside — honestly cut my prep time
                  in half.&rdquo;
                </p>
                <div className="mkt-who">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="mkt-av" src="https://randomuser.me/api/portraits/men/52.jpg" alt="Mr Tan" />
                  <span>
                    <b>Issac T.</b>
                    <small>Tuition tutor</small>
                  </span>
                </div>
              </div>
              <div className="mkt-quote">
                <div className="mkt-stars">★★★★☆</div>
                <p>
                  &ldquo;My boy actually explains his geog notes out loud to Mochi at the
                  dinner table now 😂 never thought I&apos;d see him want to revise.
                  worth it just for that.&rdquo;
                </p>
                <div className="mkt-who">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="mkt-av" src="https://randomuser.me/api/portraits/women/44.jpg" alt="Priya S." />
                  <span>
                    <b>Jessie L.</b>
                    <small>Parent</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mkt-final">
          <div className="mkt-wrap">
            <h2>Ready to study smarter?</h2>
            <p>Free to start. Your notes, your pace, your Mochi.</p>
            <button
              className="mkt-btn mkt-btn-primary"
              style={{ padding: '15px 30px', fontSize: 17 }}
              onClick={() => setScreen('login')}
            >
              Get the app — it&apos;s free
            </button>
          </div>
        </section>

      </div>

      {/* ══════════════════ LOGIN SCREEN ══════════════════ */}
      <div className={`mkt-screen ${screen === 'login' ? 'active' : ''}`}>
        <div className="mkt-login-wrap">
          <div className="mkt-login-card">
            <button className="mkt-back" onClick={() => setScreen('home')}>← back</button>

            {/* Login Mochi with paw eye-cover */}
            <div
              className={`mkt-hero-mochi mkt-login-mochi ${pwFocused ? 'mkt-cover' : ''}`}
              ref={loginStageRef}
            >
              <div className="mkt-float" ref={loginFloatRef}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="mkt-mochi-img"
                  src="/mochi-base-transparent.png"
                  alt="Mochi"
                />
              </div>
              <span className="mkt-paw l" />
              <span className="mkt-paw r" />
            </div>

            <h2>Welcome back 👋</h2>
            <p className="mkt-login-sub">Mochi&apos;s been waiting to study with you.</p>

            <div className="mkt-field">
              <label htmlFor="mkt-em">Email</label>
              <input
                id="mkt-em"
                type="email"
                placeholder="you@example.com"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mkt-field">
              <label htmlFor="mkt-pw">Password</label>
              <input
                id="mkt-pw"
                type="password"
                placeholder="••••••••"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
              />
            </div>

            <button className="mkt-btn mkt-btn-primary" onClick={handleSignIn}>
              Log in
            </button>

            <p className="mkt-alt">
              New here?{' '}
              <a onClick={() => setScreen('home')}>Create an account</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
