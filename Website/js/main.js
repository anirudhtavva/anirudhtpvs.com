/**
 * main.js — Core site functionality
 * Dark mode, typing animation, scroll animations,
 * mobile menu, active nav, navbar hide/show
 */

'use strict';

// ============================================================
// Theme Management
// ============================================================

const ThemeManager = (() => {
  const STORAGE_KEY = 'theme';
  const DEFAULT_THEME = 'dark';
  let currentTheme = DEFAULT_THEME;

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return DEFAULT_THEME;
  }

  function apply(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcons(theme);
  }

  function toggle() {
    apply(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function updateToggleIcons(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      btn.innerHTML = theme === 'dark'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    });
  }

  function init() {
    apply(getPreferred());
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', toggle);
    });
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        apply(e.matches ? 'dark' : 'light');
      }
    });
  }

  return { init, toggle, apply };
})();

// ============================================================
// Typing Animation
// ============================================================

const TypingAnimation = (() => {
  const roles = [
    'Business-savvy',
    'Tech Enthusiast',
    'Storyteller',
    'Content Creator',
    'Influencer'
  ];

  let currentIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  let isPaused = false;
  let timeoutId = null;
  let element = null;

  const TYPING_SPEED = 80;
  const DELETING_SPEED = 45;
  const PAUSE_AFTER_TYPE = 1800;
  const PAUSE_AFTER_DELETE = 400;

  function type() {
    if (isPaused || !element) return;

    const currentRole = roles[currentIndex];

    if (isDeleting) {
      element.textContent = currentRole.slice(0, currentCharIndex - 1);
      currentCharIndex--;

      if (currentCharIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % roles.length;
        timeoutId = setTimeout(type, PAUSE_AFTER_DELETE);
        return;
      }
      timeoutId = setTimeout(type, DELETING_SPEED);
    } else {
      element.textContent = currentRole.slice(0, currentCharIndex + 1);
      currentCharIndex++;

      if (currentCharIndex === currentRole.length) {
        isDeleting = true;
        timeoutId = setTimeout(type, PAUSE_AFTER_TYPE);
        return;
      }
      timeoutId = setTimeout(type, TYPING_SPEED);
    }
  }

  function init(selector) {
    element = document.querySelector(selector);
    if (!element) return;
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = roles[0];
      return;
    }
    timeoutId = setTimeout(type, 600);
  }

  function pause() { isPaused = true; }
  function resume() { isPaused = false; type(); }
  function destroy() {
    clearTimeout(timeoutId);
    isPaused = true;
  }

  return { init, pause, resume, destroy };
})();

// ============================================================
// Scroll Animations (IntersectionObserver)
// ============================================================

const ScrollAnimations = (() => {
  let observer = null;
  let skillObserver = null;

  function createObserver() {
    const options = {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all reveal elements
    const revealEls = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children'
    );
    revealEls.forEach(el => observer.observe(el));
  }

  function createSkillObserver() {
    skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animate skill bars
          entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
            const target = bar.getAttribute('data-width');
            bar.style.width = target + '%';
          });
          skillObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach(el => skillObserver.observe(el));
  }

  function init() {
    if ('IntersectionObserver' in window) {
      createObserver();
      createSkillObserver();
    } else {
      // Fallback: show everything
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        el.classList.add('visible');
      });
      document.querySelectorAll('.skill-bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });
    }
  }

  return { init };
})();

// ============================================================
// Smooth Scroll
// ============================================================

const SmoothScroll = (() => {
  function scrollTo(target, offset = 0) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function init() {
    const navHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height')) || 70;

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          scrollTo(target, navHeight);
        }
      });
    });
  }

  return { init, scrollTo };
})();

// ============================================================
// Navbar — Scroll Hide/Show & Active Links
// ============================================================

const Navbar = (() => {
  let navbar = null;
  let ticking = false;

  function handleScroll() {
    if (!navbar) return;
    const scrollY = window.scrollY;

    // Add "scrolled" class for styling
    if (scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

  }

  function updateActiveLinks() {
    const sections = document.querySelectorAll('section[id], div[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const navHeight = 80;

    let currentSection = '';
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= navHeight + 50 && rect.bottom >= navHeight) {
        currentSection = section.id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const sectionId = href.startsWith('#') ? href.slice(1) : link.dataset.section;
      if (sectionId && sectionId === currentSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        handleScroll();
        updateActiveLinks();
        ticking = false;
      });
      ticking = true;
    }
  }

  function init() {
    navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  return { init };
})();

// ============================================================
// Mobile Menu
// ============================================================

const MobileMenu = (() => {
  let hamburger = null;
  let menu = null;
  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    hamburger.classList.toggle('active', isOpen);
    menu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    hamburger.setAttribute('aria-expanded', isOpen);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    hamburger.classList.remove('active');
    menu.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', false);
  }

  function init() {
    hamburger = document.getElementById('hamburger');
    menu = document.getElementById('mobile-menu');
    if (!hamburger || !menu) return;

    hamburger.addEventListener('click', toggle);

    // Close when a link is clicked
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', close);
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (isOpen && !hamburger.contains(e.target) && !menu.contains(e.target)) {
        close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });

    // Close on resize (if becoming desktop)
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && isOpen) close();
    });
  }

  return { init, close };
})();

// ============================================================
// Blog Preview — Load from JSON
// ============================================================

const BlogPreview = (() => {
  const CATEGORY_ICONS = {
    'Development': '💻',
    'Design': '🎨',
    'Performance': '⚡',
    'Tools': '🔧',
    'default': '📝'
  };

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function renderCard(post) {
    const icon = CATEGORY_ICONS[post.category] || CATEGORY_ICONS.default;
    const tagsHtml = (post.tags || []).slice(0, 2).map(t =>
      `<span class="post-card-tag">${t}</span>`
    ).join('');

    return `
      <article class="post-card reveal" onclick="window.location='post.html?id=${post.id}'" role="link" tabindex="0" aria-label="Read: ${post.title}">
        <div class="post-card-cover">
          <div class="post-card-cover-bg"></div>
          <span class="post-card-cover-icon">${icon}</span>
          <span class="post-card-category">${post.category}</span>
        </div>
        <div class="post-card-body">
          <div class="post-card-meta">
            <span class="post-card-date">${formatDate(post.date)}</span>
            <span class="post-card-dot"></span>
            <span class="post-card-read-time">${post.readTime} min read</span>
          </div>
          <h3 class="post-card-title">${post.title}</h3>
          <p class="post-card-excerpt">${post.excerpt}</p>
          <div class="post-card-footer">
            <div class="post-card-tags">${tagsHtml}</div>
            <span class="post-card-read-link">Read more →</span>
          </div>
        </div>
      </article>`;
  }

  async function init() {
    const container = document.getElementById('blog-preview-container');
    if (!container) return;

    try {
      const res = await fetch('data/posts.json');
      if (!res.ok) throw new Error('Failed to load posts');
      const posts = await res.json();

      // Show latest 3
      const latest = posts.slice(0, 3);
      container.innerHTML = latest.map(renderCard).join('');

      // Re-run scroll animations for newly added cards
      document.querySelectorAll('.post-card.reveal').forEach(el => {
        if ('IntersectionObserver' in window) {
          // Will be picked up by the existing observer if we re-init,
          // but easier to just set a delay-based visibility for preview cards
          setTimeout(() => el.classList.add('visible'), 100);
        } else {
          el.classList.add('visible');
        }
      });

      // Add keyboard support for cards
      container.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
          }
        });
      });
    } catch (err) {
      console.error('BlogPreview error:', err);
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
          <p>Could not load blog posts. <a href="blog.html">View all posts →</a></p>
        </div>`;
    }
  }

  return { init };
})();

// ============================================================
// Counter Animation
// ============================================================

const CounterAnimation = (() => {
  function animateCount(el, from, to, duration = 1500) {
    const start = performance.now();
    const suffix = el.getAttribute('data-suffix') || '';

    function update(timestamp) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10);
          if (!isNaN(target)) animateCount(el, 0, target);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));
  }

  return { init };
})();

// ============================================================
// Particle / Canvas Background (optional, lightweight)
// ============================================================

const HeroParticles = (() => {
  const PARTICLE_COUNT = 40;
  let canvas, ctx, particles, animFrame;
  let w, h;

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.r = Math.random() * 1.5 + 0.5;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.life = 0;
      this.maxLife = Math.random() * 200 + 100;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59, 130, 246, ${this.alpha})`;
      ctx.fill();
    }
  }

  function resize() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    w = canvas.width = hero.offsetWidth;
    h = canvas.height = hero.offsetHeight;
    if (particles) particles.forEach(p => { p.x = Math.random() * w; p.y = Math.random() * h; });
  }

  function loop() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    animFrame = requestAnimationFrame(loop);
  }

  function init() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.6;';
    hero.querySelector('.hero-bg').appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();

    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    loop();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    // Pause when not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrame);
      } else {
        loop();
      }
    });
  }

  return { init };
})();

// ============================================================
// Initialize Everything
// ============================================================

function init() {
  // Theme must be applied first to prevent flash
  ThemeManager.init();

  // Core functionality
  SmoothScroll.init();
  Navbar.init();
  MobileMenu.init();

  // Animations (only if not on a blog sub-page)
  ScrollAnimations.init();
  CounterAnimation.init();

  // Hero-specific
  if (document.getElementById('hero')) {
    TypingAnimation.init('#typing-text');
    HeroParticles.init();
  }

  // Blog preview on homepage
  if (document.getElementById('blog-preview-container')) {
    BlogPreview.init();
  }
}

// ============================================================
// Cyber Particle Effect — About, Blog, Contact sections
// ============================================================
(function () {
  const configs = {
    about:   { color1: '#3b82f6', color2: '#8b5cf6', density: 10000, speed: 0.3, connectDist: 120, scanLine: true  },
    blog:    { color1: '#60a5fa', color2: '#a78bfa', density: 14000, speed: 0.25, connectDist: 100, scanLine: false },
    contact: { color1: '#8b5cf6', color2: '#3b82f6', density: 10000, speed: 0.35, connectDist: 120, scanLine: true  }
  };

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  function initCanvas(canvas) {
    const section = canvas.dataset.section;
    const cfg = configs[section];
    if (!cfg) return;

    const ctx = canvas.getContext('2d');
    let particles = [], animId, scanY = 0, active = false;
    const rgb1 = hexToRgb(cfg.color1);
    const rgb2 = hexToRgb(cfg.color2);

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function spawn() {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / cfg.density);
      for (let i = 0; i < count; i++) {
        const useColor2 = Math.random() > 0.5;
        particles.push({
          x:     Math.random() * canvas.width,
          y:     Math.random() * canvas.height,
          r:     Math.random() * 1.8 + 0.4,
          vx:    (Math.random() - 0.5) * cfg.speed,
          vy:    (Math.random() - 0.5) * cfg.speed,
          alpha: Math.random() * 0.55 + 0.2,
          rgb:   useColor2 ? rgb2 : rgb1,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    function draw() {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scan line (cyber horizontal sweep)
      if (cfg.scanLine) {
        scanY = (scanY + 0.8) % canvas.height;
        const grad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
        grad.addColorStop(0,   'rgba(59,130,246,0)');
        grad.addColorStop(0.5, 'rgba(99,160,255,0.06)');
        grad.addColorStop(1,   'rgba(59,130,246,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 40, canvas.width, 80);
      }

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < cfg.connectDist) {
            const opacity = 0.18 * (1 - d / cfg.connectDist);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${particles[i].rgb},${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Particles
      particles.forEach(p => {
        p.pulse += 0.02;
        const a = p.alpha * (0.75 + 0.25 * Math.sin(p.pulse));

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0, `rgba(${p.rgb},${a * 0.6})`);
        glow.addColorStop(1, `rgba(${p.rgb},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.rgb},${a})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !active) {
          active = true;
          resize();
          spawn();
          draw();
        } else if (!entry.isIntersecting && active) {
          active = false;
          cancelAnimationFrame(animId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(canvas.closest('section'));
    window.addEventListener('resize', () => { resize(); spawn(); });
  }

  document.querySelectorAll('.section-particles').forEach(initCanvas);
})();

// ============================================================
// Skills Section Particles
// ============================================================
(function () {
  const canvas = document.querySelector('.skills-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = ['#3b82f6', '#8b5cf6', '#a78bfa', '#60a5fa'];
  let particles = [];
  let animId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 12000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(99, 130, 246, ${0.12 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });

    animId = requestAnimationFrame(draw);
  }

  // Only run when section is visible
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        resize();
        createParticles();
        draw();
      } else {
        cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(canvas.closest('.skills-section'));
  window.addEventListener('resize', () => { resize(); createParticles(); });
})();

// ============================================================
// Grid Beam Animation — triggers once on hero visible
// ============================================================
const heroGrid = document.querySelector('.hero-grid');
if (heroGrid) {
  const beamObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        heroGrid.classList.add('beam-active');
        beamObserver.disconnect();
      }
    });
  }, { threshold: 0.2 });
  beamObserver.observe(heroGrid);
}

// ============================================================
// Contact Form — Google Sheets via Apps Script
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfwwiPRlRRfFm9-WUfn1mMMPQyGA942eArDxd5Agw5pqq9UAV37Te0KOOlr0mNaXQ/exec';

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = contactForm.querySelector('.form-submit');
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!name || !email || !message) return;

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      contactForm.reset();
      btn.textContent = 'Message Sent!';
      btn.style.background = '#22c55e';
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    } catch (err) {
      btn.textContent = 'Failed — Try Again';
      btn.style.background = '#ef4444';
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    }
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
