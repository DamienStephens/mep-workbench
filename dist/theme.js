// Blocking head script: resolve the theme before styles and page content paint.
(() => {
  const key = 'mep-workbench-theme';
  const root = document.documentElement;
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* Storage can be unavailable in private/restricted browsers. */ }

  function apply(theme) {
    root.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) button.setAttribute('aria-pressed', String(theme === 'dark'));
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.setAttribute('content', theme === 'dark' ? '#161616' : '#ffffff');
  }
  const systemTheme = () => media?.matches ? 'dark' : 'light';
  apply(preference || systemTheme());

  function setup() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    apply(root.dataset.theme);
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(preference);
      try { localStorage.setItem(key, preference); } catch { /* Keep this tab usable. */ }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();

  const systemChanged = () => { if (!preference) apply(systemTheme()); };
  if (media?.addEventListener) media.addEventListener('change', systemChanged);
  else if (media?.addListener) media.addListener(systemChanged);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
    apply(preference || systemTheme());
  });
})();
