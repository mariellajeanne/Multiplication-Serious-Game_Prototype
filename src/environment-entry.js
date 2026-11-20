/* Download independent resources together. Classic scripts execute in their
 * declared order (async=false); their shared lexical bindings remain intact. */
async function enterBakeryView() {
  const view = new URLSearchParams(window.location.search).get('view');
  const screen = document.getElementById('bakeryLoading');
  if (view === 'environment') {
    document.body.dataset.view = 'environment';
    const host = document.getElementById('bakeryEnvironment');
    host.replaceChildren(document.getElementById('environmentSceneTemplate').content.cloneNode(true));
    host.hidden = false;
    screen.hidden = true;
    return;
  }

  const sources = [...document.querySelectorAll('script[data-gameplay]')];
  const hub = view !== 'legacy';
  const assets = typeof BAKERY_ASSETS === 'undefined' ? null : BAKERY_ASSETS;
  const required = hub && assets ? [...new Set([...Object.values(assets), 'assets/bakery-ui/boost-prism.svg', 'assets/bakery-ui/popup-frame.svg', 'assets/bakery-ui/control-close.svg'])] : [];
  // Future worksheet/legacy decoration can warm after the complete playable hub.
  const optional = hub ? ['assets/illustrated/foods.webp', 'assets/illustrated/coins.webp', 'assets/illustrated/action-control.svg', 'assets/illustrated/action-control-primary.svg', 'assets/bakery-ui/button-cream.svg', 'assets/bakery-ui/button-teal.svg'] : [];
  const state = window.bakeryLoading = {phase:'required', completed:0, total:sources.length + required.length + optional.length + 3, requiredReady:false, optionalRemaining:optional.length, errors:[], started:performance.now(), readyAt:null, dismissedAt:null};
  const bar = document.getElementById('loadingProgress');
  const status = document.getElementById('loadingStatus');
  const skip = document.getElementById('loadingSkip');
  const roots = ['app', 'modals', 'notificationDock'].map(id => document.getElementById(id));
  const completed = () => {state.completed++; bar.max = state.total; bar.value = state.completed; bar.setAttribute('aria-valuetext', `${state.completed} of ${state.total} resources ready`);};
  const dismiss = () => {
    if (!state.requiredReady || state.dismissedAt !== null) return;
    screen.hidden = true;
    screen.setAttribute('aria-busy', 'false');
    for (const root of roots) root.inert = false;
    state.dismissedAt = performance.now();
    if (document.activeElement === skip) document.querySelector('[data-world-nav="menu"]')?.focus({preventScroll:true});
    performance.mark('bakery-playable');
  };
  skip.addEventListener('click', dismiss);
  const warm = new Map();
  const imageReady = url => {
    if (!warm.has(url)) warm.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = /background-floor|menu-frame|register|counter-gifts/.test(url) ? 'high' : 'auto';
      img.onload = async () => {
        try {await img.decode(); resolve(img);} catch {reject(new Error(`Unable to decode ${url}`));}
      };
      img.onerror = () => reject(new Error(`Unable to load ${url}`));
      img.src = url;
    }));
    return warm.get(url);
  };
  let startupError = null;
  const catchStartupError = event => {startupError ??= event.error || new Error(event.message || 'Bakery initialization failed');};
  window.addEventListener('error', catchStartupError);
  try {
    if (hub && !assets) throw new Error('Unable to load the bakery asset manifest');
    document.body.dataset.view = hub ? 'hub' : 'legacy';
    document.getElementById('bakeryEnvironment').hidden = true;
    for (const root of roots) {root.hidden = false; root.inert = true;}
    status.textContent = 'Preparing the counters and recipes';
    // Start high-priority Menu resources before queuing the rest of the world.
    required.sort((a,b) => Number(/background-floor|menu-frame|register|counter-gifts/.test(b)) - Number(/background-floor|menu-frame|register|counter-gifts/.test(a)));
    const artwork = required.map(url => imageReady(url).then(completed));
    const scripts = sources.map(source => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source.src;
      script.async = false;
      script.onload = () => {completed(); resolve();};
      script.onerror = () => reject(new Error(`Unable to load ${source.getAttribute('src')}`));
      document.body.appendChild(script);
    }));
    const fonts = ['700 22px "Panaderya Rounded"', '900 22px "Panaderya Rounded"'].map(font => document.fonts.load(font).then(faces => {
      if (!faces.length) throw new Error('Unable to load bakery lettering');
      completed();
    }));
    await Promise.all([...artwork, ...scripts, ...fonts]);
    if (startupError) throw startupError;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => !link.sheet)) throw new Error('Unable to load bakery styles');
    if (typeof render !== 'function' || !document.getElementById('app').firstElementChild) throw new Error('Bakery initialization did not finish');
    // Includes saved receipt / restored worksheet shell images outside the world.
    const rendered = [...document.querySelectorAll('#app img,#modals img')];
    const extra = [...new Set(rendered.map(img => img.getAttribute('src')).filter(url => url && !warm.has(url)))];
    state.total += extra.length;
    await Promise.all(extra.map(url => imageReady(url).then(completed)));
    await Promise.all(rendered.map(img => img.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    completed();
    state.requiredReady = true;
    state.readyAt = performance.now();
    state.phase = optional.length ? 'optional' : 'complete';
    performance.mark('bakery-required-ready');
    skip.disabled = false;
    status.textContent = 'Ready to play · finishing extra artwork';
    window.removeEventListener('error', catchStartupError);
    if (!optional.length) {dismiss(); return;}
    await Promise.all(optional.map(async url => {
      try {await imageReady(url);} catch {state.errors.push({optional:url});}
      finally {state.optionalRemaining--; completed();}
    }));
    state.phase = 'complete';
    dismiss();
  } catch (error) {
    window.removeEventListener('error', catchStartupError);
    state.phase = 'error';
    state.errors.push({required:error.message});
    state.requiredReady = false;
    screen.hidden = false;
    screen.setAttribute('aria-busy', 'false');
    document.getElementById('loadingLabel').textContent = 'Let’s try again';
    status.textContent = 'The bakery could not finish loading. Check your connection, then retry.';
    status.setAttribute('role', 'alert');
    skip.disabled = false;
    skip.textContent = 'Retry';
    skip.onclick = () => window.location.reload();
    for (const root of roots) root.inert = true;
  }
}

enterBakeryView();
