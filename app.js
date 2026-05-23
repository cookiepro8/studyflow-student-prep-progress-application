let data = [];
  let planTitle = '';
  let currentView = 'dashboard';
  let prevView = 'dashboard';
  let selectedType = 'yt';
  let ytMode = 'manual'; // 'manual' or 'link'
  let detailId = null;

  const CIRCUMFERENCE = 2 * Math.PI * 22; 

  const TYPE_META = {
    yt: { label: 'YouTube playlist', icon: '▶', iconClass: 'icon-yt', fillClass: 'fill-yt', color: 'var(--red)' },
    pdf: { label: 'PDF / Document', icon: '📄', iconClass: 'icon-pdf', fillClass: 'fill-pdf', color: 'var(--blue)' },
    custom: { label: 'Custom checklist', icon: '✓', iconClass: 'icon-custom', fillClass: 'fill-custom', color: 'var(--amber)' },
  };
  const HINTS = {
    yt: 'Paste the video titles from your playlist separated by commas.',
    pdf: 'Enter chapter names or section headings separated by commas.',
    custom: 'Enter any topics, tasks, or exercises separated by commas.',
  };
  const ITEM_LABELS = {
    yt: 'Video titles (comma-separated)',
    pdf: 'Chapters / sections (comma-separated)',
    custom: 'Tasks / topics (comma-separated)',
  };

  TYPE_META.text = { label: 'Text resource', icon: 'T', iconClass: 'icon-text', fillClass: 'fill-text', color: 'var(--green)' };
  HINTS.text = 'Paste your notes or article text. It will be saved as one plain text resource.';
  ITEM_LABELS.text = 'Plain text';

  function save() {
    try {
      localStorage.setItem('sf_data_v2', JSON.stringify(data));
      localStorage.setItem('sf_plan_title_v1', planTitle);
    } catch(e) {}
  }

  function load() {
    try {
      const d = localStorage.getItem('sf_data_v2');
      const savedTitle = localStorage.getItem('sf_plan_title_v1');
      if (d) data = JSON.parse(d);
      data.forEach(resource => {
        if (resource.type === 'text' && !resource.text) {
          resource.text = (resource.items || []).map(item => item.label).join('\n\n');
          resource.items = [];
        }
      });
      if (savedTitle) planTitle = savedTitle;
      if (!planTitle && data.length > 0) planTitle = 'My Study Plan';
    } catch(e) {}
  }

  function applyPlanState() {
    document.body.classList.toggle('has-plan', Boolean(planTitle));
    document.body.classList.toggle('show-app', Boolean(planTitle));
    document.getElementById('sidebarPlanTitle').textContent = planTitle || 'Progress Tracker';
    if (planTitle && currentView === 'dashboard') {
      document.getElementById('topbarTitle').textContent = planTitle;
    }
  }

  function showPlanModal() {
    document.getElementById('planModalOverlay').classList.add('open');
    const input = document.getElementById('inputPlanTitle');
    input.value = planTitle;
    setTimeout(() => input.focus(), 0);
  }

  function closePlanModal() {
    document.getElementById('planModalOverlay').classList.remove('open');
    document.getElementById('inputPlanTitle').value = '';
  }

  function handlePlanOverlayClick(e) {
    if (e.target === document.getElementById('planModalOverlay')) closePlanModal();
  }

  function createPlan() {
    const title = document.getElementById('inputPlanTitle').value.trim();
    if (!title) { showToast('Please enter a title for your plan.'); return; }
    planTitle = title;
    save();
    closePlanModal();
    applyPlanState();
    document.body.classList.add('show-app');
    navigate('dashboard', document.querySelector('[data-view=dashboard]'));
    showToast('Study plan created ✓');
  }

  function backToLanding(event) {
    if (event) event.preventDefault();
    document.body.classList.remove('show-app');
    window.location.hash = 'landing';
  }

  function handleInitialRoute() {
    if (window.location.hash === '#landing') {
      document.body.classList.remove('show-app');
    }
  }

  function selectType(type, el) {
    selectedType = type;
    document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    const ytToggle = document.getElementById('ytToggleField');
    if (type === 'yt') {
      ytToggle.style.display = 'flex';
      setYoutubeMode(ytMode);
    } else {
      ytToggle.style.display = 'none';
      document.getElementById('fieldLink').style.display = 'none';
      document.getElementById('fieldTitle').style.display = 'flex';
      document.getElementById('fieldItems').style.display = 'flex';
      document.getElementById('inputHint').style.display = 'block';
    }

    document.getElementById('itemsLabel').textContent = ITEM_LABELS[type];
    document.getElementById('inputHint').textContent = HINTS[type];
    document.getElementById('inputItems').rows = type === 'text' ? 7 : 4;
    document.getElementById('inputItems').placeholder = type === 'yt'
      ? 'Intro, JSX Basics, useState Hook, useEffect, Router v6…'
      : type === 'pdf'
      ? 'Chapter 1: Foundations, Chapter 2: Core Concepts, Chapter 3…'
      : 'Flashcards Set 1, Practice Problems, Summary Notes…';
    if (type === 'text') {
      document.getElementById('inputItems').placeholder = 'Paste your notes, article excerpt, or reading text here...';
    }
  }

  function setYoutubeMode(mode) {
    ytMode = mode;
    document.getElementById('btnModeManual').classList.toggle('active', mode === 'manual');
    document.getElementById('btnModeLink').classList.toggle('active', mode === 'link');

    if (mode === 'link') {
      document.getElementById('fieldLink').style.display = 'flex';
      document.getElementById('fieldTitle').style.display = 'none';
      document.getElementById('fieldItems').style.display = 'none';
      document.getElementById('inputHint').style.display = 'none';
    } else {
      document.getElementById('fieldLink').style.display = 'none';
      document.getElementById('fieldTitle').style.display = 'flex';
      document.getElementById('fieldItems').style.display = 'flex';
      document.getElementById('inputHint').style.display = 'block';
    }
  }

  function showModal() {
    document.getElementById('modalOverlay').classList.add('open');
    selectType(selectedType, document.querySelector(`[data-type="${selectedType}"]`));
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('inputTitle').value = '';
    document.getElementById('inputItems').value = '';
    document.getElementById('inputLink').value = '';
    document.getElementById('btnAddSubmit').disabled = false;
    document.getElementById('btnAddSubmit').textContent = "Add resource";
  }

  function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

  // New Link Fetching Logic
  async function addResource() {
    if (selectedType === 'yt' && ytMode === 'link') {
      const link = document.getElementById('inputLink').value.trim();
      if (!link) { showToast('Please enter a playlist URL.'); return; }
      
      const submitBtn = document.getElementById('btnAddSubmit');
      submitBtn.disabled = true;
      submitBtn.textContent = "Fetching...";

      try {
        // REPLACE THIS URL with your live custom backend link or API gateway endpoint
        const backendEndpoint = `http://localhost:3000/api/playlist?url=${encodeURIComponent(link)}`;
        const res = await fetch(backendEndpoint);
        if (!res.ok) throw new Error('Failed to fetch playlist data from API.');
        
        const json = await res.json();
        
        data.unshift({
          id: Date.now(),
          type: 'yt',
          title: json.title,
          duration: json.totalDuration, // Saved in object structure
          items: json.videos.map(vTitle => ({ label: vTitle, done: false }))
        });

        save();
        closeModal();
        renderAll();
        showToast('Playlist synced successfully! ✓');
      } catch (err) {
        showToast('Error fetching playlist. Ensure your server is running.');
        submitBtn.disabled = false;
        submitBtn.textContent = "Add resource";
      }
    } else {
      // Original manual logic
      const title = document.getElementById('inputTitle').value.trim();
      const raw = document.getElementById('inputItems').value.trim();
      if (!title) { showToast('Please enter a title.'); return; }
      if (!raw) { showToast(selectedType === 'text' ? 'Please paste some text.' : 'Please enter at least one item.'); return; }
      if (selectedType === 'text') {
        data.unshift({ id: Date.now(), type: selectedType, title, text: raw, items: [] });
        save();
        closeModal();
        renderAll();
        showToast('Resource added âœ“');
        return;
      }
      const items = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (items.length === 0) { showToast('No valid items found.'); return; }
      data.unshift({ id: Date.now(), type: selectedType, title, items: items.map(label => ({ label, done: false })) });
      save();
      closeModal();
      renderAll();
      showToast('Resource added ✓');
    }
  }

  function toggleItem(resId, idx) {
    const res = data.find(r => r.id === resId);
    if (!res) return;
    res.items[idx].done = !res.items[idx].done;
    save();
    renderAll();
    if (detailId === resId) renderDetail(resId);
  }

  function deleteResource(resId) {
    if (!confirm('Delete this resource?')) return;
    data = data.filter(r => r.id !== resId);
    save();
    renderAll();
    if (currentView === 'detail') navigate('dashboard', document.querySelector('[data-view=dashboard]'));
    showToast('Resource deleted');
  }

  function navigate(view, el) {
    if (view !== 'detail') prevView = view;
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');
    const titles = { dashboard: planTitle || 'Dashboard', all: 'All Resources', detail: 'Resource Detail' };
    document.getElementById('topbarTitle').textContent = titles[view] || view;
  }

  function openDetail(resId) {
    detailId = resId;
    navigate('detail', null);
    renderDetail(resId);
  }

  function goBack() { navigate(prevView, document.querySelector('[data-view=' + prevView + ']')); }

  function renderDetail(resId) {
    const res = data.find(r => r.id === resId);
    if (!res) return;
    const m = TYPE_META[res.type];
    const isText = res.type === 'text';
    const done = res.items.filter(i => i.done).length;
    const total = res.items.length;
    const pct = total ? Math.round(done / total * 100) : 0;

    // Output duration metadata string if present
    const durationStr = res.duration ? ` · ⏳ ${res.duration}` : '';

    document.getElementById('detailTitle').textContent = res.title;
    document.getElementById('detailMeta').textContent = m.label + ' · ' + total + ' items' + durationStr;
    if (isText) document.getElementById('detailMeta').textContent = m.label;
    document.getElementById('detailPct').textContent = pct + '%';
    document.getElementById('detailPct').style.color = m.color;
    document.getElementById('detailProgSub').textContent = done + ' of ' + total + ' items complete';
    const fill = document.getElementById('detailFill');
    fill.style.width = pct + '%';
    fill.className = 'detail-fill ' + m.fillClass;
    document.querySelector('.detail-progress').style.display = isText ? 'none' : '';
    document.getElementById('detailDelete').dataset.resourceId = resId;
    document.getElementById('topbarTitle').textContent = res.title;
    const list = document.getElementById('detailItems');
    list.innerHTML = '';
    if (isText) {
      const div = document.createElement('div');
      div.className = 'text-resource-body text-resource-body-detail';
      div.textContent = res.text || '';
      list.appendChild(div);
      return;
    }
    res.items.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'detail-item' + (item.done ? ' done' : '');
      div.addEventListener('click', () => toggleItem(resId, idx));
      div.innerHTML = `
        <div class="detail-check ${item.done ? 'done' : ''}">✓</div>
        <span class="detail-item-label ${item.done ? 'done' : ''}">${esc(item.label)}</span>
        <span class="detail-item-num">${idx + 1}</span>
      `;
      list.appendChild(div);
    });
  }

  function renderAll() {
    const allItems = data.reduce((a, r) => a + r.items.length, 0);
    const allDone = data.reduce((a, r) => a + r.items.filter(i => i.done).length, 0);
    const allFinished = data.filter(r => r.items.length > 0 && r.items.every(i => i.done)).length;
    const pct = allItems ? Math.round(allDone / allItems * 100) : 0;

    document.getElementById('sbTotal').textContent = data.length;
    document.getElementById('sbDone').textContent = allDone + ' / ' + allItems;
    document.getElementById('sbFinished').textContent = allFinished;
    document.getElementById('navBadge').textContent = data.length;
    document.getElementById('ringPct').textContent = pct + '%';
    const arc = document.getElementById('ringArc');
    arc.style.strokeDashoffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
    document.getElementById('dcTotal').textContent = data.length;
    document.getElementById('dcDone').textContent = allDone;
    document.getElementById('dcDoneSub').textContent = 'of ' + allItems + ' total items';
    document.getElementById('dcFinished').textContent = allFinished;

    renderDashGrid();
    renderAllList();
  }

  function makeResCard(res) {
    const m = TYPE_META[res.type];
    const done = res.items.filter(i => i.done).length;
    const total = res.items.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const card = document.createElement('div');
    card.className = 'res-card';

    const itemsHtml = res.items.map((item, idx) => `
      <div class="res-item" data-item-index="${idx}">
        <div class="check-circle ${item.done ? 'done' : ''}">✓</div>
        <span class="item-text ${item.done ? 'done' : ''}">${esc(item.label)}</span>
        <span class="item-num">${idx + 1}</span>
      </div>
    `).join('');

    // Output duration metadata line into card display if present
    const durationHtml = res.duration ? `<div class="res-meta res-duration">⏳ Total Time: ${res.duration}</div>` : '';

    if (res.type === 'text') {
      card.className = 'res-card text-resource-card';
      card.innerHTML = `
        <div class="res-card-top">
          <div class="res-card-header">
            <div class="res-card-title-wrap">
              <div class="res-card-icon ${m.iconClass}">${m.icon}</div>
              <div class="res-card-title-text">
                <div class="res-title">${esc(res.title)}</div>
                <div class="res-meta">${m.label}</div>
              </div>
            </div>
          </div>
          <div class="text-resource-body">${esc(res.text || '')}</div>
        </div>
      `;
      return card;
    }

    card.innerHTML = `
      <div class="res-card-top">
        <div class="res-card-header">
          <div class="res-card-title-wrap">
            <div class="res-card-icon ${m.iconClass}">${m.icon}</div>
            <div class="res-card-title-text">
              <div class="res-title">${esc(res.title)}</div>
              <div class="res-meta">${m.label} · ${total} items</div>
              ${durationHtml}
            </div>
          </div>
          <div class="res-card-actions">
            <button class="icon-btn js-open-detail" title="Open detail">⤢</button>
            <button class="icon-btn danger js-delete-resource" title="Delete">✕</button>
          </div>
        </div>
        <div class="res-progress">
          <div class="prog-header">
            <span class="prog-pct">${pct}%</span>
            <span class="prog-count">${done} / ${total}</span>
          </div>
          <div class="prog-track"><div class="prog-fill ${m.fillClass}"></div></div>
        </div>
      </div>
      <button class="res-items-toggle">
        <span>${total} items — click to expand</span>
        <span class="toggle-arrow">▼</span>
      </button>
      <div class="res-items">${itemsHtml}</div>
    `;
    card.querySelector('.prog-pct').style.color = m.color;
    card.querySelector('.prog-fill').style.width = pct + '%';
    card.querySelector('.js-open-detail').addEventListener('click', () => openDetail(res.id));
    card.querySelector('.js-delete-resource').addEventListener('click', event => {
      event.stopPropagation();
      deleteResource(res.id);
    });
    card.querySelector('.res-items-toggle').addEventListener('click', event => toggleItems(event.currentTarget));
    card.querySelectorAll('.res-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => toggleItem(res.id, Number(itemEl.dataset.itemIndex)));
    });
    return card;
  }

  function toggleItems(btn) {
    const list = btn.nextElementSibling;
    const arrow = btn.querySelector('.toggle-arrow');
    const open = list.classList.toggle('open');
    arrow.classList.toggle('open', open);
    btn.querySelector('span').textContent = open ? 'Collapse items' : (list.children.length + ' items — click to expand');
  }

  function renderDashGrid() {
    const grid = document.getElementById('dashGrid');
    const empty = document.getElementById('dashEmpty');
    grid.innerHTML = '';
    if (data.length === 0) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
    grid.style.display = '';
    empty.style.display = 'none';
    data.slice(0, 6).forEach(res => grid.appendChild(makeResCard(res)));
  }

  function renderAllList() {
    const list = document.getElementById('allList');
    const empty = document.getElementById('allEmpty');
    list.innerHTML = '';
    if (data.length === 0) { list.style.display = 'none'; empty.style.display = 'block'; return; }
    list.style.display = '';
    empty.style.display = 'none';
    data.forEach(res => list.appendChild(makeResCard(res)));
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function esc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function initEventListeners() {
    document.querySelectorAll('.js-open-plan-modal').forEach(button => {
      button.addEventListener('click', showPlanModal);
    });
    document.querySelectorAll('.js-back-to-landing').forEach(link => {
      link.addEventListener('click', backToLanding);
    });
    document.querySelectorAll('.js-close-plan-modal').forEach(button => {
      button.addEventListener('click', closePlanModal);
    });
    document.getElementById('planModalOverlay').addEventListener('click', handlePlanOverlayClick);
    document.getElementById('btnCreatePlan').addEventListener('click', createPlan);
    document.getElementById('inputPlanTitle').addEventListener('keydown', e => {
      if (e.key === 'Enter') createPlan();
    });
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.view, item));
    });
    document.querySelectorAll('.js-show-modal').forEach(button => {
      button.addEventListener('click', showModal);
    });
    document.getElementById('viewAllBtn').addEventListener('click', () => {
      navigate('all', document.querySelector('[data-view=all]'));
    });
    document.getElementById('detailBack').addEventListener('click', goBack);
    document.getElementById('modalOverlay').addEventListener('click', handleOverlayClick);
    document.querySelectorAll('.js-close-modal').forEach(button => {
      button.addEventListener('click', closeModal);
    });
    document.querySelectorAll('.type-tab[data-type]').forEach(button => {
      button.addEventListener('click', () => selectType(button.dataset.type, button));
    });
    document.querySelectorAll('[data-youtube-mode]').forEach(button => {
      button.addEventListener('click', () => setYoutubeMode(button.dataset.youtubeMode));
    });
    document.getElementById('btnAddSubmit').addEventListener('click', addResource);
    document.getElementById('detailDelete').addEventListener('click', event => {
      deleteResource(Number(event.currentTarget.dataset.resourceId));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal();
        closePlanModal();
      }
    });
  }

  initEventListeners();
  load();
  applyPlanState();
  handleInitialRoute();
  renderAll();
