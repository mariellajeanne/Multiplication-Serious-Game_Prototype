/* The hub is playable by default; the Phase 1 archive remains isolated from
 * migrations, lifecycle saves and economy timers at ?view=environment. */
async function enterBakeryView() {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'environment') {
    document.body.dataset.view = 'environment';
    const host = document.getElementById('bakeryEnvironment');
    host.replaceChildren(document.getElementById('environmentSceneTemplate').content.cloneNode(true));
    host.hidden = false;
    return;
  }

  document.body.dataset.view = view === 'legacy' ? 'legacy' : 'hub';
  document.getElementById('bakeryEnvironment').hidden = true;
  for (const id of ['app', 'modals', 'notificationDock']) {
    const root = document.getElementById(id);
    root.hidden = false;
    root.inert = false;
  }

  // Dynamically inserted classic scripts still share global lexical bindings.
  // Await each load so state, UI, bridge and bootstrap retain their dependencies.
  for (const source of document.querySelectorAll('script[data-gameplay]')) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source.src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${source.getAttribute('src')}`));
      document.body.appendChild(script);
    });
  }
}

enterBakeryView().catch(error => {
  console.error(error);
  const message = document.createElement('p');
  message.role = 'alert';
  message.textContent = 'The bakery could not load. Reload this page to try again.';
  document.getElementById('app').replaceChildren(message);
});
