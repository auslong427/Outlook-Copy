/* Outlook Copy Sender — v1.7.0
 * Fixes vs 1.6.1:
 * - Manifest now loads root files (no src/ paths)
 * - Safer DOM membership check (document.body.contains)
 * - More tolerant reading-pane/header detection
 * - Extra guards; stable with SPA navigation & DOM churn
 * - Map for safe iteration and pruning
 */
(() => {
  'use strict';

  const DEBUG = location.hash.includes('ocsdebug');
  const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  const bars = new Map();          // header -> bar element (iterable)
  const cachedEmails = new Map();  // header -> last resolved email (iterable)
  let scheduled = false, toastTimer = null, sweepTimer = null;

  const log = (...a) => { if (DEBUG) try { console.debug('[OCB]', ...a); } catch(_){} };
  const $ = (s, r=document)=> { try { return r.querySelector(s); } catch { return null; } };
  const $all = (s, r=document)=> { try { return Array.from(r.querySelectorAll(s)); } catch { return []; } };
  const visible = el => !!el && (()=>{ try{ const b=el.getBoundingClientRect(); return b.width>0 && b.height>0; }catch{ return false; } })();
  const text = el => ((el && el.textContent) || '').trim();
  const inDOM = el => { try { return !!el && !!document.body && document.body.contains(el); } catch { return false; } };

  // Reading pane root (tolerant to UI variants)
  function readingPaneRoot(){
    let el =
      document.getElementById('ReadingPaneContainerId') ||
      $('[data-automationid="ReadingPaneContainer"]') ||
      $('[role="region"][aria-label*="Reading" i]') ||
      $('[data-automationid="ConversationViewerContainer"]');
    if (el && visible(el)) return el;

    // Fallback: subject + reply controls visible anywhere => use body
    const subj = $('[data-automationid="MessageSubject"]') || $('h1[role="heading"]') || $('h2[role="heading"]');
    const actions = $('[data-automationid="MessageActions"]') || $('[aria-label*="Reply" i]') || $('[data-automationid*="Reply"]');
    if (subj && actions && visible(subj)) return document.body;
    return null;
  }

  const paneHasSend  = s => !!($('[aria-label*="Send" i]', s)  || $('[title*="Send" i]', s)  || $('[data-automationid*="Send"]', s));
  const paneHasReply = s => !!($('[aria-label*="Reply" i]', s) || $('[data-automationid*="Reply"]', s) || $('[aria-label*="Forward" i]', s) || $('[data-automationid*="Forward"]', s));

  function headerScopes(){
    const root = readingPaneRoot();
    if (!root) return [];

    const candidates = $all(
      [
        '[data-automationid="MessageHeader"]',
        '[data-automationid="ReadingPaneHeader"]',
        '[data-automationid="DetailsHeader"]',
        '[data-automationid="ItemSummary"]'
      ].join(','),
      root
    ).filter(visible);

    // Read mode only; exclude list & compose
    return candidates.filter(h => {
      const pane =
        h.closest('[data-automationid="ReadingPaneContainer"]') ||
        h.closest('#ReadingPaneContainerId') ||
        root;

      const hasSubject = !!(
        $('[data-automationid="MessageSubject"]', pane) ||
        $('h1[role="heading"]', pane) ||
        $('h2[role="heading"]', pane)
      );

      const looksRead = hasSubject && paneHasReply(pane);
      const isCompose = paneHasSend(pane);
      const inList = !!h.closest('[data-automationid="MessageList"]');
      return looksRead && !isCompose && !inList;
    });
  }

  const explicitFrom = s =>
    $('[data-automationid="From"]', s) ||
    $('[aria-label="From"]', s) ||
    $('span[aria-label^="From" i]', s);

  function findEmailInHeader(scope){
    // 1) mailto
    const a = $('a[href^="mailto:"]', scope);
    if (a && visible(a)) {
      try { return a.href.slice(7).split('?')[0]; } catch {}
    }

    // 2) attributes with an email
    const node = $('[data-email]', scope) || $('[title*="@"]', scope) || $('[aria-label*="@"]', scope);
    if (node){
      try {
        const v = node.getAttribute('data-email') || node.getAttribute('title') || node.getAttribute('aria-label') || '';
        const m = v.match(EMAIL_RE); if (m) return m[0];
      } catch {}
    }

    // 3) regex in header text
    try {
      const m = text(scope).match(EMAIL_RE);
      return m ? m[0] : null;
    } catch {
      return null;
    }
  }

  async function personaHoverExtract(scope){
    const chip = explicitFrom(scope);
    if (!chip) return null;

    // Trigger persona pop (Outlook often reveals email there)
    try{
      chip.dispatchEvent(new MouseEvent('mouseenter', {bubbles:true, cancelable:true, view:window}));
      chip.dispatchEvent(new MouseEvent('mouseover',  {bubbles:true, cancelable:true, view:window}));
      chip.focus && chip.focus();
    }catch{}

    const deadline = Date.now() + 2000;
    while (Date.now() < deadline){
      const pop = document.querySelector(
        '[role="dialog"], [role="tooltip"], .ms-PersonaCard, .livePersonaCard, [data-automationid*="Contact"], [data-automationid*="PersonaCard"]'
      );

      if (pop && visible(pop)){
        // mailto inside card
        const a = pop.querySelector('a[href^="mailto:"]');
        if (a){
          try { return a.href.slice(7).split('?')[0]; } catch {}
        }

        // attribute hints
        const node = pop.querySelector('[data-email], [title*="@"], [aria-label*="@"]');
        if (node){
          try {
            const v = node.getAttribute('data-email') || node.getAttribute('title') || node.getAttribute('aria-label') || '';
            const m = v.match(EMAIL_RE); if (m) return m[0];
          } catch {}
        }

        // plain text in card
        try {
          const m = (pop.textContent||'').match(EMAIL_RE); if (m) return m[0];
        } catch {}
      }
      await new Promise(r=>setTimeout(r,140));
    }

    // Dismiss
    try{
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', keyCode:27, which:27, bubbles:true}));
    }catch{}
    return null;
  }

  function showToast(msg){
    let t = document.querySelector('.ocb-toast');
    if (!t){
      t = document.createElement('div');
      t.className = 'ocb-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.setAttribute('aria-atomic', 'true');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove('show'), 1600);
  }

  function ensureBar(header){
    if (!inDOM(header)) return;

    let bar = bars.get(header);
    if (!bar){
      header.classList.add('ocb-host');

      bar = document.createElement('div');
      bar.className = 'ocb-bar';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Outlook Copy Sender');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ocb-btn';
      btn.setAttribute('aria-label', 'Copy sender email');
      btn.setAttribute('title', 'Copy sender email');
      btn.textContent = 'Copy sender';

      btn.addEventListener('click', async (e)=>{
        try{
          e.stopPropagation();
          // cache first
          let email = cachedEmails.get(header) || findEmailInHeader(header);

          if (!email){
            showToast('Looking up sender…');
            email = await personaHoverExtract(header);
          }

          if (!email){
            showToast('Could not find sender email');
            return;
          }

          cachedEmails.set(header, email);

          // Copy modern API
          try{
            await navigator.clipboard.writeText(email);
            showToast('Sender email copied');
          }catch{
            // Fallback execCommand
            const ta = document.createElement('textarea');
            ta.value = email;
            ta.style.position='fixed';
            ta.style.left='-9999px';
            document.body.appendChild(ta);
            ta.select();
            let ok=false;
            try{ ok=document.execCommand('copy'); } finally { ta.remove(); }
            showToast(ok ? 'Sender email copied' : 'Copy failed');
          }
        }catch(err){
          log('click handler error:', err);
          showToast('Error copying email');
        }
      }, {capture:true});

      bar.appendChild(btn);
      header.appendChild(bar);
      bars.set(header, bar);
    }
  }

  function pruneAndInject(){
    // prune orphans — safe with Map
    for (const [hdr, bar] of bars){
      if (!inDOM(hdr)){
        try { bar?.remove(); } catch {}
        bars.delete(hdr);
        cachedEmails.delete(hdr);
      }
    }
    // process new headers
    const headers = headerScopes();
    headers.forEach(ensureBar);
    log('sweep headers:', headers.length, 'active bars:', bars.size);
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(()=>{ scheduled=false; pruneAndInject(); }, 80);
  }

  function hookSpa(){
    try{
      const push = history.pushState, rep = history.replaceState;
      history.pushState = function(){ push.apply(this, arguments); kick(); };
      history.replaceState = function(){ rep.apply(this, arguments); kick(); };
      addEventListener('popstate', kick);

      let href = location.href;
      setInterval(()=>{ if (location.href !== href){ href = location.href; kick(); } }, 500);

      function kick(){ pruneAndInject(); setTimeout(pruneAndInject, 250); setTimeout(pruneAndInject, 1200); }
    }catch(e){ log('hookSpa error', e); }
  }

  function observe(){
    try{
      const obs = new MutationObserver(schedule);
      obs.observe(document.documentElement, {
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['title','aria-label','href','class','style','data-automationid']
      });
      const id = setInterval(pruneAndInject, 1800);
      addEventListener('pagehide', ()=> clearInterval(id));
    }catch(e){ log('observe error', e); }
    hookSpa();
  }

  function start(){
    try{
      pruneAndInject();
      observe();
    }catch(e){ log('start error', e); }
  }

  if (document.readyState === 'loading'){
    addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();