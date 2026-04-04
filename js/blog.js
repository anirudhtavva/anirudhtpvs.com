/**
 * blog.js — Blog functionality
 * Loads posts from JSON, renders cards, handles search,
 * tag filtering, pagination, full post rendering with
 * markdown parsing, and TOC generation.
 */

'use strict';

// ============================================================
// Constants
// ============================================================

const POSTS_PER_PAGE = 6;
const DATA_URL = 'data/posts.json';

const CATEGORY_ICONS = {
  'Development': '💻',
  'Design': '🎨',
  'Performance': '⚡',
  'Tools': '🔧',
  'default': '📝'
};

// ============================================================
// Markdown Parser
// ============================================================

const MarkdownParser = (() => {

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseInline(text) {
    // Inline code (before bold/italic to avoid conflicts)
    text = text.replace(/`([^`]+)`/g, (_, code) =>
      `<code>${escapeHtml(code)}</code>`
    );
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">'
    );
    return text;
  }

  function slugify(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function parse(markdown) {
    const lines = markdown.split('\n');
    const html = [];
    const headings = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // --- Fenced Code Block ---
      const fenceMatch = line.match(/^```(\w*)/);
      if (fenceMatch) {
        const lang = fenceMatch[1] || 'text';
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(escapeHtml(lines[i]));
          i++;
        }
        const codeContent = codeLines.join('\n');
        const blockId = 'code-' + Math.random().toString(36).slice(2, 8);
        html.push(`
<pre>
  <div class="code-block-header">
    <span class="code-block-lang">${lang}</span>
    <button class="code-copy-btn" data-target="${blockId}" onclick="copyCode(this)">Copy</button>
  </div>
  <code id="${blockId}">${codeContent}</code>
</pre>`);
        i++;
        continue;
      }

      // --- Horizontal Rule ---
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        html.push('<hr>');
        i++;
        continue;
      }

      // --- Headings ---
      const h4Match = line.match(/^####\s+(.+)/);
      if (h4Match) {
        const text = h4Match[1];
        const id = slugify(text);
        headings.push({ level: 4, text, id });
        html.push(`<h4 id="${id}">${parseInline(text)}</h4>`);
        i++; continue;
      }

      const h3Match = line.match(/^###\s+(.+)/);
      if (h3Match) {
        const text = h3Match[1];
        const id = slugify(text);
        headings.push({ level: 3, text, id });
        html.push(`<h3 id="${id}">${parseInline(text)}</h3>`);
        i++; continue;
      }

      const h2Match = line.match(/^##\s+(.+)/);
      if (h2Match) {
        const text = h2Match[1];
        const id = slugify(text);
        headings.push({ level: 2, text, id });
        html.push(`<h2 id="${id}">${parseInline(text)}</h2>`);
        i++; continue;
      }

      const h1Match = line.match(/^#\s+(.+)/);
      if (h1Match) {
        const text = h1Match[1];
        const id = slugify(text);
        headings.push({ level: 1, text, id });
        html.push(`<h1 id="${id}">${parseInline(text)}</h1>`);
        i++; continue;
      }

      // --- Blockquote ---
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        html.push(`<blockquote><p>${parseInline(quoteLines.join(' '))}</p></blockquote>`);
        continue;
      }

      // --- Unordered List ---
      if (/^[-*+]\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
          items.push(`<li>${parseInline(lines[i].replace(/^[-*+]\s/, ''))}</li>`);
          i++;
        }
        html.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // --- Ordered List ---
      if (/^\d+\.\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          items.push(`<li>${parseInline(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
          i++;
        }
        html.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      // --- Empty line (paragraph separator) ---
      if (line.trim() === '') {
        i++;
        continue;
      }

      // --- Paragraph ---
      const paraLines = [];
      while (i < lines.length &&
             lines[i].trim() !== '' &&
             !/^(#{1,6}\s|```|>|[-*+]\s|\d+\.\s|(-{3,}|\*{3,}|_{3,})\s*$)/.test(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        html.push(`<p>${parseInline(paraLines.join(' '))}</p>`);
      }
    }

    return { html: html.join('\n'), headings };
  }

  return { parse, escapeHtml };
})();

// ============================================================
// Code Copy Function (global for onclick handler)
// ============================================================

window.copyCode = function(btn) {
  const targetId = btn.getAttribute('data-target');
  const codeEl = document.getElementById(targetId);
  if (!codeEl) return;

  const text = codeEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
};

// ============================================================
// Date & Utility Helpers
// ============================================================

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getPostIcon(post) {
  return CATEGORY_ICONS[post.category] || CATEGORY_ICONS.default;
}

// ============================================================
// Blog List Page
// ============================================================

const BlogPage = (() => {
  let allPosts = [];
  let filteredPosts = [];
  let currentPage = 1;
  let activeTag = 'all';
  let searchQuery = '';

  // DOM references
  let gridEl, paginationEl, resultsInfoEl, searchInput, searchClear, filterTagsEl;

  function renderPostCard(post) {
    const icon = getPostIcon(post);
    const tagsHtml = (post.tags || []).slice(0, 3).map(t =>
      `<span class="post-card-tag">${t}</span>`
    ).join('');

    return `
      <article class="post-card" onclick="window.location='post.html?id=${post.id}'" role="link" tabindex="0" aria-label="Read: ${post.title}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.location='post.html?id=${post.id}'}">
        <div class="post-card-cover">
          <div class="post-card-cover-bg"></div>
          <span class="post-card-cover-icon">${icon}</span>
          <span class="post-card-category">${post.category}</span>
        </div>
        <div class="post-card-body">
          <div class="post-card-meta">
            <span class="post-card-date">${formatDateShort(post.date)}</span>
            <span class="post-card-dot"></span>
            <span class="post-card-read-time">${post.readTime} min read</span>
          </div>
          <h2 class="post-card-title">${highlightText(post.title, searchQuery)}</h2>
          <p class="post-card-excerpt">${highlightText(post.excerpt, searchQuery)}</p>
          <div class="post-card-footer">
            <div class="post-card-tags">${tagsHtml}</div>
            <span class="post-card-read-link">Read →</span>
          </div>
        </div>
      </article>`;
  }

  function highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark style="background:var(--accent-light);color:var(--accent);border-radius:2px;">$1</mark>');
  }

  function getFilteredPosts() {
    return allPosts.filter(post => {
      const matchesTag = activeTag === 'all' ||
        post.category === activeTag ||
        (post.tags || []).includes(activeTag);

      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        (post.tags || []).some(t => t.toLowerCase().includes(q)) ||
        post.category.toLowerCase().includes(q);

      return matchesTag && matchesSearch;
    });
  }

  function renderGrid() {
    filteredPosts = getFilteredPosts();
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const pagePosts = filteredPosts.slice(start, start + POSTS_PER_PAGE);

    if (filteredPosts.length === 0) {
      gridEl.innerHTML = `
        <div class="blog-empty">
          <span class="blog-empty-icon">🔍</span>
          <h3 class="blog-empty-title">No posts found</h3>
          <p class="blog-empty-text">Try adjusting your search or filter.</p>
        </div>`;
    } else {
      gridEl.innerHTML = pagePosts.map(renderPostCard).join('');
      // Animate cards in
      gridEl.querySelectorAll('.post-card').forEach((card, idx) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, idx * 60);
      });
    }

    updateResultsInfo();
    renderPagination();
  }

  function updateResultsInfo() {
    if (!resultsInfoEl) return;
    const total = filteredPosts.length;
    const start = (currentPage - 1) * POSTS_PER_PAGE + 1;
    const end = Math.min(currentPage * POSTS_PER_PAGE, total);

    if (total === 0) {
      resultsInfoEl.querySelector('.results-count').innerHTML = '<strong>0</strong> posts found';
    } else {
      resultsInfoEl.querySelector('.results-count').innerHTML =
        `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> posts`;
    }
  }

  function renderPagination() {
    if (!paginationEl) return;
    const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = '';

    // Prev button
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}" aria-label="Previous page">←</button>`;

    // Page numbers
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
        html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      } else if (p === currentPage - 2 || p === currentPage + 2) {
        html += '<span class="pagination-ellipsis">…</span>';
      }
    }

    // Next button
    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" aria-label="Next page">→</button>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'));
        if (!isNaN(page) && page !== currentPage) {
          currentPage = page;
          renderGrid();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  function buildFilterTags() {
    if (!filterTagsEl) return;

    // Collect all unique tags and categories
    const tags = new Set();
    allPosts.forEach(p => {
      tags.add(p.category);
      (p.tags || []).forEach(t => tags.add(t));
    });

    const tagArray = ['all', ...Array.from(tags)];
    filterTagsEl.innerHTML = tagArray.map(tag => `
      <button class="filter-tag ${tag === activeTag ? 'active' : ''}" data-tag="${tag}">
        ${tag === 'all' ? 'All Posts' : tag}
      </button>`
    ).join('');

    filterTagsEl.querySelectorAll('.filter-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTag = btn.getAttribute('data-tag');
        currentPage = 1;
        filterTagsEl.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGrid();
      });
    });
  }

  function setupSearch() {
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        searchClear && searchClear.classList.toggle('visible', searchQuery.length > 0);
        renderGrid();
      }, 250);
    });

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.remove('visible');
        currentPage = 1;
        renderGrid();
        searchInput.focus();
      });
    }
  }

  async function init() {
    gridEl = document.getElementById('blog-grid');
    paginationEl = document.getElementById('pagination');
    resultsInfoEl = document.getElementById('results-info');
    searchInput = document.getElementById('search-input');
    searchClear = document.getElementById('search-clear');
    filterTagsEl = document.getElementById('filter-tags');

    if (!gridEl) return; // Not on blog page

    // Show loading state
    gridEl.innerHTML = `
      <div class="blog-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading posts…</p>
      </div>`;

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allPosts = await res.json();

      // Sort by date desc
      allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

      buildFilterTags();
      setupSearch();
      renderGrid();
    } catch (err) {
      console.error('Failed to load posts:', err);
      gridEl.innerHTML = `
        <div class="blog-empty">
          <span class="blog-empty-icon">⚠️</span>
          <h3 class="blog-empty-title">Failed to load posts</h3>
          <p class="blog-empty-text">Please try refreshing the page.</p>
        </div>`;
    }
  }

  return { init };
})();

// ============================================================
// Single Post Page
// ============================================================

const PostPage = (() => {
  let allPosts = [];
  let currentPost = null;

  // Reading progress bar
  function setupReadingProgress() {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.style.width = '0%';
    document.body.appendChild(bar);

    const postContent = document.querySelector('.post-body');
    if (!postContent) return;

    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const progress = docH > 0 ? (scrolled / docH) * 100 : 0;
      bar.style.width = Math.min(progress, 100) + '%';
    }, { passive: true });
  }

  // TOC generation and active tracking
  function buildTOC(headings) {
    const tocList = document.getElementById('toc-list');
    if (!tocList || headings.length === 0) {
      const tocCard = document.querySelector('.toc-card');
      if (tocCard) tocCard.style.display = 'none';
      return;
    }

    tocList.innerHTML = headings
      .filter(h => h.level >= 2 && h.level <= 3)
      .map(h => `
        <li class="toc-item">
          <a href="#${h.id}" class="toc-link ${h.level === 3 ? 'toc-h3' : ''}" data-id="${h.id}">
            ${h.text}
          </a>
        </li>`
      ).join('');

    // Smooth scroll for TOC links
    tocList.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('href').slice(1);
        const el = document.getElementById(targetId);
        if (el) {
          const navHeight = 80;
          const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });

    // Highlight active TOC item on scroll
    const headingEls = headings
      .filter(h => h.level >= 2 && h.level <= 3)
      .map(h => document.getElementById(h.id))
      .filter(Boolean);

    const tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocList.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
          const activeLink = tocList.querySelector(`[data-id="${entry.target.id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      });
    }, {
      rootMargin: '-70px 0px -60% 0px',
      threshold: 0
    });

    headingEls.forEach(el => tocObserver.observe(el));
  }

  function renderPostNavigation(posts, currentId) {
    const navEl = document.getElementById('post-navigation');
    if (!navEl) return;

    const idx = posts.findIndex(p => p.id === currentId);
    const prevPost = idx < posts.length - 1 ? posts[idx + 1] : null; // older
    const nextPost = idx > 0 ? posts[idx - 1] : null; // newer

    let navHtml = '';

    if (prevPost) {
      navHtml += `
        <a href="post.html?id=${prevPost.id}" class="post-nav-link prev">
          <span class="post-nav-label">← Previous</span>
          <span class="post-nav-title">${prevPost.title}</span>
        </a>`;
    } else {
      navHtml += '<div></div>';
    }

    if (nextPost) {
      navHtml += `
        <a href="post.html?id=${nextPost.id}" class="post-nav-link next">
          <span class="post-nav-label">Next →</span>
          <span class="post-nav-title">${nextPost.title}</span>
        </a>`;
    } else {
      navHtml += '<div></div>';
    }

    navEl.innerHTML = navHtml;
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function renderPost(post) {
    // Page title
    document.title = `${post.title} — Alex Morgan`;

    // Breadcrumb
    const breadcrumb = document.getElementById('post-breadcrumb-title');
    if (breadcrumb) breadcrumb.textContent = post.title.length > 50
      ? post.title.slice(0, 50) + '…'
      : post.title;

    // Category badge
    const categoryEl = document.getElementById('post-category');
    if (categoryEl) categoryEl.textContent = post.category;

    // Title
    const titleEl = document.getElementById('post-title');
    if (titleEl) titleEl.textContent = post.title;

    // Author info
    const avatarEl = document.getElementById('post-author-avatar');
    if (avatarEl) avatarEl.textContent = getInitials(post.author);

    const authorEl = document.getElementById('post-author-name');
    if (authorEl) authorEl.textContent = post.author;

    const metaEl = document.getElementById('post-meta-details');
    if (metaEl) metaEl.textContent = `${formatDate(post.date)} · ${post.readTime} min read`;

    // Tags
    const tagsEl = document.getElementById('post-tags');
    if (tagsEl) {
      tagsEl.innerHTML = (post.tags || []).map(tag =>
        `<a href="blog.html" class="post-tag">#${tag}</a>`
      ).join('');
    }

    // Parse and render content
    const bodyEl = document.getElementById('post-body');
    if (bodyEl && post.content) {
      const { html, headings } = MarkdownParser.parse(post.content);
      bodyEl.innerHTML = html;
      buildTOC(headings);
    }
  }

  async function init() {
    const bodyEl = document.getElementById('post-body');
    if (!bodyEl) return; // Not on post page

    setupReadingProgress();

    // Get post ID from URL
    const params = new URLSearchParams(window.location.search);
    const postId = parseInt(params.get('id'), 10);

    if (!postId) {
      showError('No post ID specified.');
      return;
    }

    // Show loading
    const container = document.querySelector('.post-page-content');
    if (container) {
      container.innerHTML = `
        <div class="post-loading">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading post…</p>
        </div>`;
    }

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allPosts = await res.json();
      // Sort by date desc
      allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

      currentPost = allPosts.find(p => p.id === postId);

      if (!currentPost) {
        showError('Post not found.');
        return;
      }

      // Restore the page structure
      if (container) {
        container.innerHTML = getPostPageHTML();
      }

      renderPost(currentPost);
      renderPostNavigation(allPosts, currentPost.id);

    } catch (err) {
      console.error('Post load error:', err);
      showError('Failed to load the post. Please try again.');
    }
  }

  function showError(msg) {
    const container = document.querySelector('.post-page-content') || document.querySelector('.post-page');
    if (container) {
      container.innerHTML = `
        <div class="container">
          <div class="post-error">
            <span class="post-error-icon">😕</span>
            <h2 class="post-error-title">Oops!</h2>
            <p class="post-error-text">${msg}</p>
            <a href="blog.html" class="btn btn-primary">← Back to Blog</a>
          </div>
        </div>`;
    }
  }

  function getPostPageHTML() {
    return `
      <div class="post-hero">
        <div class="container">
          <div class="post-hero-inner">
            <nav class="post-breadcrumb" aria-label="Breadcrumb">
              <a href="index.html">Home</a>
              <span class="post-breadcrumb-sep">/</span>
              <a href="blog.html">Blog</a>
              <span class="post-breadcrumb-sep">/</span>
              <span id="post-breadcrumb-title">Post</span>
            </nav>
            <span class="post-category-badge" id="post-category">Category</span>
            <h1 class="post-title" id="post-title">Loading…</h1>
            <div class="post-meta">
              <div class="post-author-avatar" id="post-author-avatar">AM</div>
              <div class="post-meta-info">
                <span class="post-author-name" id="post-author-name">Author</span>
                <span class="post-meta-details" id="post-meta-details">Date · Read time</span>
              </div>
            </div>
            <div class="post-tags" id="post-tags"></div>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="post-layout">
          <article class="post-content">
            <div class="post-body" id="post-body"></div>
            <nav class="post-navigation" id="post-navigation" aria-label="Post navigation"></nav>
          </article>
          <aside class="post-sidebar" aria-label="Sidebar">
            <div class="toc-card">
              <p class="toc-title">Table of Contents</p>
              <ul class="toc-list" id="toc-list"></ul>
            </div>
            <div class="sidebar-card">
              <p class="sidebar-card-title">Share this post</p>
              <div class="post-share-links">
                <button class="share-link" onclick="sharePost('twitter')">
                  <span>𝕏</span> Share on X
                </button>
                <button class="share-link" onclick="sharePost('linkedin')">
                  <span>in</span> Share on LinkedIn
                </button>
                <button class="share-link" onclick="copyPostLink()">
                  <span>🔗</span> Copy link
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>`;
  }

  return { init };
})();

// ============================================================
// Share Functions (global for onclick handlers)
// ============================================================

window.sharePost = function(platform) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  let shareUrl;

  if (platform === 'twitter') {
    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
  } else if (platform === 'linkedin') {
    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }

  if (shareUrl) window.open(shareUrl, '_blank', 'noopener,width=600,height=400');
};

window.copyPostLink = function() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.querySelector('[onclick="copyPostLink()"]');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>✓</span> Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
};

// ============================================================
// Initialize
// ============================================================

function initBlog() {
  // Theme toggle (shared with main.js)
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(btn, next);
    });
    updateThemeIcon(btn, saved);
  });

  function updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // Navbar scroll behavior
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 20) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
      if (y > 200) {
        if (y > lastY + 10) navbar.classList.add('hidden');
        else if (y < lastY - 10) navbar.classList.remove('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
      lastY = y;
    }, { passive: true });
  }

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Floating characters animation in blog hero
  (function initHeroCanvas() {
    const canvas = document.querySelector('.blog-hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}#@$%&';
    const COLORS = [
      'rgba(99,102,241,', // indigo
      'rgba(139,92,246,', // violet
      'rgba(59,130,246,', // blue
      'rgba(168,85,247,', // purple
    ];

    let particles = [];
    let rafId = null;
    let W = 0, H = 0;

    function resize() {
      const hero = canvas.parentElement;
      W = canvas.width  = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function createParticle(startAtBottom) {
      const size = rand(11, 38);
      return {
        x:     rand(0, W),
        y:     startAtBottom ? rand(H * 0.4, H + 20) : rand(-20, H),
        size,
        char:  CHARS[Math.floor(Math.random() * CHARS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: rand(0.04, 0.14),
        vy:    rand(0.25, 0.7),      // float upward
        vx:    rand(-0.15, 0.15),    // slight horizontal drift
        rot:   rand(0, Math.PI * 2),
        vrot:  rand(-0.003, 0.003),
      };
    }

    function initParticles() {
      const count = Math.max(30, Math.floor((W * H) / 18000));
      particles = Array.from({ length: count }, () => createParticle(false));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `${p.size}px 'Fira Code', monospace`;
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fillText(p.char, 0, 0);
        ctx.restore();

        p.y  -= p.vy;
        p.x  += p.vx;
        p.rot += p.vrot;

        // Reset when floated above the top
        if (p.y < -p.size * 1.5) {
          Object.assign(p, createParticle(true));
          p.y = H + p.size;
        }
      }
      rafId = requestAnimationFrame(draw);
    }

    // Pause when not visible
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible && !rafId) {
        rafId = requestAnimationFrame(draw);
      } else if (!visible && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }, { threshold: 0.05 });
    observer.observe(canvas.parentElement);

    resize();
    initParticles();
    window.addEventListener('resize', () => { resize(); initParticles(); }, { passive: true });
  })();

  // Initialize appropriate page
  BlogPage.init();
  PostPage.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlog);
} else {
  initBlog();
}
