(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-button');
  const themeLabel = document.getElementById('theme-label');
  const menuButton = document.getElementById('menu-button');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebar-scrim');
  const search = document.getElementById('doc-search');
  const toast = document.getElementById('toast');

  const updateThemeLabel = () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    themeLabel.textContent = next;
    themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  };

  updateThemeLabel();

  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('llm-contract-theme', root.dataset.theme);
    } catch (_) {}
    updateThemeLabel();
  });

  const setMenu = (open) => {
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close documentation menu' : 'Open documentation menu');
  };

  menuButton.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
  scrim.addEventListener('click', () => setMenu(false));
  sidebar.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (window.innerWidth <= 768) setMenu(true);
      search.focus();
    }
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const groups = sidebar.querySelectorAll('.nav-group-label');

    sidebar.querySelectorAll('.side-nav a').forEach((link) => {
      const haystack = `${link.textContent} ${link.dataset.search || ''}`.toLowerCase();
      link.classList.toggle('search-hidden', Boolean(query) && !haystack.includes(query));
    });

    groups.forEach((group) => {
      let sibling = group.nextElementSibling;
      let hasVisibleLink = false;
      while (sibling && !sibling.classList.contains('nav-group-label')) {
        if (sibling.matches('a') && !sibling.classList.contains('search-hidden')) hasVisibleLink = true;
        sibling = sibling.nextElementSibling;
      }
      group.classList.toggle('search-hidden', !hasVisibleLink);
    });
  });

  let toastTimer;
  const showToast = (message = 'Copied to clipboard') => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    showToast();
  };

  document.querySelectorAll('.copy-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.copyTarget;
      const text = targetId ? document.getElementById(targetId)?.innerText : button.dataset.copy;
      if (text) copyText(text.trim());
    });
  });

  const sectionLinks = new Map();
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    if (!sectionLinks.has(id)) sectionLinks.set(id, []);
    sectionLinks.get(id).push(link);
  });

  const sections = [...document.querySelectorAll('.doc-section[id]')];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (!visible.length) return;

      const activeId = visible[0].target.id;
      document.querySelectorAll('.side-nav a.active, .toc a.active').forEach((link) => link.classList.remove('active'));
      (sectionLinks.get(activeId) || []).forEach((link) => {
        if (link.closest('.side-nav') || link.closest('.toc')) link.classList.add('active');
      });
    },
    { rootMargin: '-18% 0px -68% 0px', threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));

  const starsElement = document.getElementById('github-stars');
  const formatCount = (count) => (count >= 1000 ? `${(count / 1000).toFixed(1).replace('.0', '')}k` : String(count));

  const loadStars = async () => {
    const cacheKey = 'llm-contract-repo-stats';
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.time < 60 * 60 * 1000) {
        starsElement.textContent = formatCount(cached.stars);
        return;
      }

      const response = await fetch('https://api.github.com/repos/alivirgo/LLM-Contract', {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) throw new Error('GitHub request failed');
      const repo = await response.json();
      const stars = Number(repo.stargazers_count || 0);
      starsElement.textContent = formatCount(stars);
      localStorage.setItem(cacheKey, JSON.stringify({ stars, time: Date.now() }));
    } catch (_) {
      starsElement.textContent = '★';
    }
  };

  loadStars();
  document.getElementById('year').textContent = String(new Date().getFullYear());
})();
