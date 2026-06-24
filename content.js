// 591 已看過濾器 + 有興趣標記

const STORAGE_KEY  = '591_seen_ids';
const INTEREST_KEY = '591_interested_items'; // [{id, url, title, addedAt, notes}]

// ── 站點設定 ─────────────────────────────────────────────────────
const isRent = window.location.hostname === 'rent.591.com.tw';
const SITE = isRent
  ? {
      cardSelector: '.item',
      linkSelector: 'a.link',
      isDetailPage: /^\/\d+/.test(window.location.pathname),
    }
  : {
      cardSelector: '.ware-item',
      linkSelector: 'a[href*="/detail/"]',
      isDetailPage: /\/detail\//.test(window.location.pathname),
    };

// ── Storage helpers ──────────────────────────────────────────────

function getSeenIds() {
  const d = localStorage.getItem(STORAGE_KEY);
  return new Set(d ? JSON.parse(d) : []);
}
function saveSeenIds(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function getInterestedItems() {
  const d = localStorage.getItem(INTEREST_KEY);
  return d ? JSON.parse(d) : [];
}
function saveInterestedItems(items) {
  localStorage.setItem(INTEREST_KEY, JSON.stringify(items));
}
function getInterestedIds() {
  return new Set(getInterestedItems().map(i => i.id));
}
function addInterested(id, url, title) {
  const items = getInterestedItems();
  if (items.find(i => i.id === id)) return;
  items.push({ id, url, title, addedAt: new Date().toISOString(), notes: '' });
  saveInterestedItems(items);
}
function removeInterested(id) {
  saveInterestedItems(getInterestedItems().filter(i => i.id !== id));
}

// ── URL helpers ──────────────────────────────────────────────────

function getIdFromUrl(url) {
  const match = url.match(/\/(\d+)(?:\.html)?(?:\?|$)/);
  return match ? match[1] : null;
}
function cleanUrl(url) {
  return url.split('?')[0];
}

// ── Styles ───────────────────────────────────────────────────────

function applySeenStyle(card) {
  card.style.opacity = '0.3';
  card.style.filter  = 'grayscale(100%)';
}
function applyInterestedStyle(card) {
  card.style.outline       = '3px solid #f39c12';
  card.style.outlineOffset = '-3px';
  card.style.opacity       = '';
  card.style.filter        = '';
}

// ── Button factory ───────────────────────────────────────────────

function makeBtn(text, bg, rightPx) {
  const b = document.createElement('button');
  b.textContent = text;
  b.dataset.s591 = 'true'; // 標記為 extension 注入的按鈕
  b.style.cssText = `
    position: absolute; bottom: 8px; right: ${rightPx}px;
    z-index: 999; background: ${bg}; color: #fff;
    border: none; border-radius: 4px;
    padding: 4px 8px; font-size: 12px; cursor: pointer;
    white-space: nowrap;
  `;
  return b;
}

// ── Process one card ─────────────────────────────────────────────

function processCard(card) {
  if (card.dataset.seen591Processed) {
    // Vue/React 重新渲染可能把注入的按鈕移除，但保留了 data 屬性
    // 若按鈕不見了，重新處理
    if (card.querySelector('[data-s591]')) return;
    delete card.dataset.seen591Processed;
  }
  card.dataset.seen591Processed = 'true';

  // 找有文字的物件連結（防禦圖片連結）
  const detailLinks = [...card.querySelectorAll(SITE.linkSelector)];
  const link = detailLinks.find(l => l.textContent.trim()) || detailLinks[0];
  if (!link) return;
  const id = getIdFromUrl(link.href);
  if (!id) return;
  const url   = cleanUrl(link.href);
  const title = link.textContent.trim() || id;

  if (getComputedStyle(card).position === 'static') {
    card.style.position = 'relative';
  }

  const seen       = getSeenIds();
  const interested = getInterestedIds();
  const isSeen     = seen.has(id);
  const isIntr     = interested.has(id);

  // ── 可 toggle 的「已看過」按鈕 ──
  function makeSeenBtn(active) {
    const sb = makeBtn(active ? '✓ 已看過' : '標記已看', active ? '#999' : '#e74c3c', 90);
    sb.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const isActive = sb.textContent === '✓ 已看過';
      if (isActive) {
        const s = getSeenIds(); s.delete(id); saveSeenIds(s);
        card.style.opacity = '';
        card.style.filter  = '';
        sb.textContent      = '標記已看';
        sb.style.background = '#e74c3c';
      } else {
        const s = getSeenIds(); s.add(id); saveSeenIds(s);
        applySeenStyle(card);
        sb.textContent      = '✓ 已看過';
        sb.style.background = '#999';
      }
    });
    return sb;
  }

  // ── 可 toggle 的「有興趣」按鈕 ──
  function makeInterestBtn(active) {
    const ib = makeBtn('⭐ 有興趣', active ? '#f39c12' : '#e67e22', 8);
    ib.dataset.active = active ? 'true' : 'false';
    ib.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const isActive = ib.dataset.active === 'true';
      if (isActive) {
        removeInterested(id);
        ib.dataset.active        = 'false';
        ib.style.background      = '#e67e22';
        card.style.outline       = '';
        card.style.outlineOffset = '';
        if (getSeenIds().has(id)) applySeenStyle(card);
      } else {
        addInterested(id, url, title);
        applyInterestedStyle(card);
        ib.dataset.active   = 'true';
        ib.style.background = '#f39c12';
      }
    });
    return ib;
  }

  // ── 有興趣（優先顯示，不灰化）──
  if (isIntr) {
    applyInterestedStyle(card);
    card.appendChild(makeInterestBtn(true));
    return;
  }

  // ── 已看過：灰化，顯示兩個按鈕 ──
  if (isSeen) {
    applySeenStyle(card);
    card.appendChild(makeSeenBtn(true));
    card.appendChild(makeInterestBtn(false));
    return;
  }

  // ── 新物件：兩個按鈕 ──
  card.appendChild(makeSeenBtn(false));
  card.appendChild(makeInterestBtn(false));
}

// ── Toolbar（左下角）────────────────────────────────────────────

function createToolbar() {
  if (document.getElementById('seen591-toolbar')) return;

  const bar = document.createElement('div');
  bar.id = 'seen591-toolbar';
  bar.style.cssText = `
    position: fixed; bottom: 24px; left: 24px;
    z-index: 99999; display: flex; flex-direction: column;
    gap: 8px; align-items: flex-start;
  `;

  const btnStyle = `
    color: #fff; border: none; border-radius: 8px;
    padding: 10px 16px; font-size: 14px; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap;
  `;

  // 標記全部已看（跳過有興趣）
  const markAll = document.createElement('button');
  markAll.textContent = '✓ 標記本頁全部已看';
  markAll.style.cssText = btnStyle + 'background: #2c3e50;';
  markAll.addEventListener('click', () => {
    const s    = getSeenIds();
    const intr = getInterestedIds();
    document.querySelectorAll(`${SITE.cardSelector}[data-seen591-processed]`).forEach(card => {
      const link = card.querySelector(SITE.linkSelector);
      if (!link) return;
      const id = getIdFromUrl(link.href);
      if (!id || s.has(id) || intr.has(id)) return;
      s.add(id);
      applySeenStyle(card);
    });
    saveSeenIds(s);
    updateUnseenCount();
    markAll.textContent = '✓ 已全部標記';
    markAll.style.background = '#27ae60';
    setTimeout(() => {
      markAll.textContent = '✓ 標記本頁全部已看';
      markAll.style.background = '#2c3e50';
    }, 2000);
  });

  // 查看有興趣清單（Blob URL 避開 CSP）
  const viewIntr = document.createElement('button');
  viewIntr.textContent = '⭐ 查看有興趣清單';
  viewIntr.style.cssText = btnStyle + 'background: #e67e22;';
  viewIntr.addEventListener('click', () => {
    const blob = new Blob([buildManagerHTML()], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });

  // 跳到未看過
  const jumpBtn = document.createElement('button');
  jumpBtn.id = 'seen591-jump';
  jumpBtn.style.cssText = btnStyle + 'background: #2980b9;';
  jumpBtn.addEventListener('click', () => {
    const first = getUnseenCards()[0];
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  bar.appendChild(markAll);
  bar.appendChild(jumpBtn);
  bar.appendChild(viewIntr);
  document.body.appendChild(bar);
}

function getUnseenCards() {
  return [...document.querySelectorAll(`${SITE.cardSelector}[data-seen591-processed]`)]
    .filter(card =>
      card.querySelector('[data-s591]') &&
      !card.style.opacity &&
      !card.style.outline &&
      card.offsetHeight > 0  // 排除 display:none 的隱藏卡片（廣告佔位等）
    );
}

function updateUnseenCount() {
  const btn = document.getElementById('seen591-jump');
  if (!btn) return;
  const n = getUnseenCards().length;
  btn.textContent = `↓ 未看過 (${n} 筆)`;
  btn.style.opacity = n > 0 ? '1' : '0.4';
}

// ── 管理頁 HTML（有興趣 + 已看過 兩個 tab）───────────────────────
// Blob URL 開啟，資料嵌入，回寫透過 postMessage

function buildManagerHTML() {
  const intrItems = getInterestedItems();
  const seenIds   = [...getSeenIds()];

  // 依站點重建 URL
  const seenUrlOf = id => isRent
    ? `https://rent.591.com.tw/${id}`
    : `https://sale.591.com.tw/home/house/detail/2/${id}.html`;

  const esc = s => JSON.stringify(s).replace(/<\/script>/gi, '<\\/script>');

  const intrRows = intrItems.length
    ? intrItems.map(item => {
        const date = new Date(item.addedAt).toLocaleDateString('zh-TW');
        return `<tr id="intr-${item.id}">
          <td><a href="${item.url}" target="_blank" class="link">${item.title}</a></td>
          <td class="muted">${date}</td>
          <td><textarea data-id="${item.id}" rows="2" class="note">${item.notes || ''}</textarea></td>
          <td><button data-remove-intr="${item.id}" class="del">移除</button></td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="empty">目前沒有標記有興趣的物件</td></tr>';

  const seenRows = seenIds.length
    ? seenIds.map(id => `<tr id="seen-${id}">
        <td><a href="${seenUrlOf(id)}" target="_blank" class="link">${id}</a></td>
        <td><button data-remove-seen="${id}" class="del">移除</button></td>
      </tr>`).join('')
    : '<tr><td colspan="2" class="empty">目前沒有已看過的記錄</td></tr>';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>591${isRent ? '租屋' : '售屋'}網 · 有興趣清單</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: sans-serif; margin: 0; background: #f5f5f5; color: #333; }
    header { background: #2c3e50; color: #fff; padding: 14px 24px;
             display: flex; align-items: center; gap: 12px; }
    h1 { margin: 0; font-size: 18px; }
    .tabs { display: flex; gap: 0; border-bottom: 2px solid #ddd;
            margin: 0; padding: 0 24px; background: #fff; }
    .tab { padding: 10px 20px; cursor: pointer; font-size: 14px;
           border: none; background: none; border-bottom: 3px solid transparent;
           margin-bottom: -2px; color: #666; }
    .tab.active { border-bottom-color: #2c3e50; color: #2c3e50; font-weight: 600; }
    .panel { display: none; }
    .panel.active { display: block; }
    .toolbar { display: flex; align-items: center; gap: 12px;
               padding: 12px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .count { background: #f39c12; color: #fff; border-radius: 12px;
             padding: 2px 10px; font-size: 13px; }
    .count.blue { background: #7f8c8d; }
    .btn-clear { margin-left: auto; background: #e74c3c; color: #fff;
                 border: none; border-radius: 6px; padding: 6px 14px;
                 cursor: pointer; font-size: 13px; }
    .container { max-width: 960px; margin: 20px auto; padding: 0 16px; }
    table { width: 100%; border-collapse: collapse; background: #fff;
            border-radius: 8px; overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,.1); }
    thead th { background: #ecf0f1; padding: 10px 12px; text-align: left;
               font-size: 13px; color: #555; font-weight: 600; }
    tbody tr { border-top: 1px solid #f0f0f0; }
    tbody tr:hover { background: #fafafa; }
    td { padding: 9px 12px; vertical-align: middle; }
    .link { color: #2980b9; text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
    .muted { color: #888; white-space: nowrap; }
    .note { width: 200px; border: 1px solid #ddd; border-radius: 4px;
            padding: 4px; font-size: 13px; resize: vertical; }
    .del { background: #e74c3c; color: #fff; border: none; border-radius: 4px;
           padding: 4px 10px; cursor: pointer; font-size: 13px; white-space: nowrap; }
    .empty { text-align: center; padding: 32px; color: #999; }
  </style>
</head>
<body>
  <header>
    <h1 id="page-title">591${isRent ? '租屋' : '售屋'}網 · 有興趣清單</h1>
  </header>

  <div class="tabs">
    <button class="tab active" data-tab="intr">⭐ 有興趣</button>
    <button class="tab" data-tab="seen">👁 已看過</button>
  </div>

  <!-- 有興趣 panel -->
  <div class="panel active" id="panel-intr">
    <div class="toolbar">
      <span class="count" id="intr-count">${intrItems.length} 筆</span>
      <button class="btn-clear" id="intr-clear">清除全部</button>
    </div>
    <div class="container">
      <table>
        <thead><tr><th>物件</th><th>標記時間</th><th>備註</th><th></th></tr></thead>
        <tbody id="intr-tbody">${intrRows}</tbody>
      </table>
    </div>
  </div>

  <!-- 已看過 panel -->
  <div class="panel" id="panel-seen">
    <div class="toolbar">
      <span class="count blue" id="seen-count">${seenIds.length} 筆</span>
      <span style="font-size:13px;color:#888">約佔 ${Math.round(seenIds.join('').length / 1024)} KB</span>
      <button class="btn-clear" id="seen-clear">清除全部</button>
    </div>
    <div class="container">
      <table>
        <thead><tr><th>物件連結</th><th></th></tr></thead>
        <tbody id="seen-tbody">${seenRows}</tbody>
      </table>
    </div>
  </div>

  <script>
    // ── 資料（嵌入時快照）──
    let intrItems = ${esc(intrItems)};
    let seenIds   = ${esc(seenIds)};

    // ── Tab 切換 ──
    const site = '591${isRent ? '租屋' : '售屋'}網';
    const tabTitles = { intr: site + ' · 有興趣清單', seen: site + ' · 已看過清單' };
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab, .panel').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        const t = tabTitles[tab.dataset.tab];
        document.getElementById('page-title').textContent = t;
        document.title = t;
      });
    });

    // ── postMessage helpers ──
    function pushIntr(updated) {
      intrItems = updated;
      window.opener?.postMessage({ type: '591-manager-save', items: intrItems }, '*');
      document.getElementById('intr-count').textContent = intrItems.length + ' 筆';
    }
    function pushSeen(updated) {
      seenIds = updated;
      window.opener?.postMessage({ type: '591-seen-save', ids: seenIds }, '*');
      document.getElementById('seen-count').textContent = seenIds.length + ' 筆';
      document.querySelector('#panel-seen .count + span').textContent =
        '約佔 ' + Math.round(seenIds.join('').length / 1024) + ' KB';
    }

    const intrEmpty = '<tr><td colspan="4" class="empty">目前沒有標記有興趣的物件</td></tr>';
    const seenEmpty = '<tr><td colspan="2" class="empty">目前沒有已看過的記錄</td></tr>';

    // ── 有興趣：備註 debounce ──
    let noteTimer;
    document.getElementById('intr-tbody').addEventListener('input', e => {
      const ta = e.target.closest('textarea[data-id]');
      if (!ta) return;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        pushIntr(intrItems.map(i => i.id === ta.dataset.id ? {...i, notes: ta.value} : i));
      }, 500);
    });

    // ── 有興趣：移除 ──
    document.getElementById('intr-tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-intr]');
      if (!btn) return;
      const id = btn.dataset.removeIntr;
      pushIntr(intrItems.filter(i => i.id !== id));
      document.getElementById('intr-' + id)?.remove();
      if (!intrItems.length) document.getElementById('intr-tbody').innerHTML = intrEmpty;
    });

    // ── 有興趣：清除全部 ──
    document.getElementById('intr-clear').addEventListener('click', () => {
      if (!confirm('確定清除所有有興趣紀錄？')) return;
      pushIntr([]);
      document.getElementById('intr-tbody').innerHTML = intrEmpty;
    });

    // ── 已看過：移除 ──
    document.getElementById('seen-tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-seen]');
      if (!btn) return;
      const id = btn.dataset.removeSeen;
      pushSeen(seenIds.filter(i => i !== id));
      document.getElementById('seen-' + id)?.remove();
      if (!seenIds.length) document.getElementById('seen-tbody').innerHTML = seenEmpty;
    });

    // ── 已看過：清除全部 ──
    document.getElementById('seen-clear').addEventListener('click', () => {
      if (!confirm('確定清除所有已看過記錄？')) return;
      pushSeen([]);
      document.getElementById('seen-tbody').innerHTML = seenEmpty;
    });
  <\/script>
</body>
</html>`;
}

// ── 接收管理頁的 postMessage 回寫 ──────────────────────────────────

window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === '591-manager-save') saveInterestedItems(e.data.items);
  if (e.data.type === '591-seen-save')    saveSeenIds(new Set(e.data.ids));
});

// ── Detail 頁面狀態面板 ───────────────────────────────────────────

function processDetailPage() {
  const id = getIdFromUrl(window.location.href);
  if (!id) return;

  const panel = document.createElement('div');
  panel.id = 'seen591-detail-panel';
  panel.style.cssText = `
    position: fixed; bottom: 24px; left: 24px; z-index: 99999;
    background: #2c3e50; color: #fff; border-radius: 12px;
    padding: 12px 16px; font-size: 14px; font-family: sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex; flex-direction: column; gap: 8px; min-width: 160px;
  `;

  function render() {
    const isSeen = getSeenIds().has(id);
    const isIntr = getInterestedIds().has(id);

    panel.innerHTML = '';

    // 狀態標籤
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:12px; opacity:0.7; margin-bottom:2px;';
    badge.textContent = isIntr ? '⭐ 已標記有興趣'
                      : isSeen ? '👁 已看過'
                      : '未標記';
    panel.appendChild(badge);

    const btnStyle = `
      border: none; border-radius: 6px; padding: 6px 10px;
      font-size: 13px; cursor: pointer; color: #fff; text-align: center;
    `;

    // 已看按鈕
    if (!isSeen) {
      const sb = document.createElement('button');
      sb.textContent = '標記已看';
      sb.style.cssText = btnStyle + 'background:#e74c3c;';
      sb.addEventListener('click', () => {
        const s = getSeenIds(); s.add(id); saveSeenIds(s);
        render();
      });
      panel.appendChild(sb);
    } else {
      const sb = document.createElement('button');
      sb.textContent = '取消已看';
      sb.style.cssText = btnStyle + 'background:#7f8c8d;';
      sb.addEventListener('click', () => {
        const s = getSeenIds(); s.delete(id); saveSeenIds(s);
        render();
      });
      panel.appendChild(sb);
    }

    // 有興趣按鈕
    if (!isIntr) {
      const ib = document.createElement('button');
      ib.textContent = '⭐ 有興趣';
      ib.style.cssText = btnStyle + 'background:#e67e22;';
      ib.addEventListener('click', () => {
        const url   = cleanUrl(window.location.href);
        const title = document.title.replace(/ - 591.+網$/, '').trim();
        addInterested(id, url, title);
        // 如果原本是已看過，移除已看標記（有興趣優先）
        const s = getSeenIds(); s.delete(id); saveSeenIds(s);
        render();
      });
      panel.appendChild(ib);
    } else {
      const ib = document.createElement('button');
      ib.textContent = '取消有興趣';
      ib.style.cssText = btnStyle + 'background:#f39c12;';
      ib.addEventListener('click', () => {
        removeInterested(id);
        render();
      });
      panel.appendChild(ib);
    }
  }

  document.body.appendChild(panel);
  render();
}

// ── Main ─────────────────────────────────────────────────────────

const isDetailPage = SITE.isDetailPage;

function processAllCards() {
  const cards = document.querySelectorAll(SITE.cardSelector);
  cards.forEach(processCard);
  if (cards.length > 0) createToolbar();
  updateUnseenCount();
}

if (isDetailPage) {
  // Detail 頁面：等 DOM 就緒後掛狀態面板
  processDetailPage();
} else {
  // 列表頁：MutationObserver 處理動態載入
  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processAllCards, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  processAllCards();
}
