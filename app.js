import './backend.js?v=20261031-static7';
await window.__duoduoBackendReady;

const app = document.getElementById('app');
const toastRegion = document.getElementById('toast-region');
const modalRegion = document.getElementById('modal-region');

const STEPS = [
  { key: 'project', label: '项目信息', desc: '名称、面积与投资基础' },
  { key: 'costs', label: '成本参数', desc: '工程、装修与公共费用' },
  { key: 'shops', label: '铺位数据', desc: 'Excel 导入与一铺一价' },
  { key: 'operations', label: '运营与税费', desc: '租金、成本、融资与退出' },
  { key: 'market', label: '周边市场', desc: '3–5公里供需与竞品租金' },
  { key: 'results', label: '分析结果', desc: '指标、图表与报告导出' },
];

const SETTLEMENT_PRESETS = {
  department: {
    label: '百货行业参考',
    categories: {
      '零售': { salesPerSqmMonth: 1200, concessionRate: 0.22, rent: 100 },
      '餐饮': { salesPerSqmMonth: 900, concessionRate: 0.12, rent: 80 },
      '娱乐': { salesPerSqmMonth: 600, concessionRate: 0.10, rent: 50 },
      '教培': { salesPerSqmMonth: 700, concessionRate: 0.10, rent: 60 },
      '服务': { salesPerSqmMonth: 700, concessionRate: 0.10, rent: 60 },
      '超市/主力店': { salesPerSqmMonth: 500, concessionRate: 0.08, rent: 35 },
      '其他': { salesPerSqmMonth: 700, concessionRate: 0.10, rent: 60 },
    },
  },
  outlet: {
    label: '奥特莱斯行业参考',
    categories: {
      '零售': { salesPerSqmMonth: 900, concessionRate: 0.12, rent: 60 },
      '餐饮': { salesPerSqmMonth: 800, concessionRate: 0.10, rent: 55 },
      '娱乐': { salesPerSqmMonth: 500, concessionRate: 0.08, rent: 35 },
      '教培': { salesPerSqmMonth: 600, concessionRate: 0.08, rent: 40 },
      '服务': { salesPerSqmMonth: 600, concessionRate: 0.08, rent: 40 },
      '超市/主力店': { salesPerSqmMonth: 500, concessionRate: 0.06, rent: 25 },
      '其他': { salesPerSqmMonth: 600, concessionRate: 0.08, rent: 40 },
    },
  },
};

const ICONS = {
  logo: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 19V8l8-4 8 4v11" stroke="currentColor" stroke-width="1.6"/><path d="M8 19v-6h8v6M3 19h18" stroke="currentColor" stroke-width="1.6"/></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v16M8 9h13" stroke="currentColor" stroke-width="1.6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 4h12l2 2v14H5V4Z" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v6h8V4M8 20v-6h8v6" stroke="currentColor" stroke-width="1.6"/></svg>',
  excel: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" stroke-width="1.6"/><path d="M15 3v5h4M9 12l6 6M15 12l-6 6" stroke="currentColor" stroke-width="1.6"/></svg>',
  ppt: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 17v4M8 21h8" stroke="currentColor" stroke-width="1.6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M5 14v5h14v-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4v12M7.5 11.5 12 16l4.5-4.5M5 20h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z" stroke="currentColor" stroke-width="1.5"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" fill="currentColor"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v6M12 7.5v.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="1.7"/></svg>',
  locate: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const state = {
  token: localStorage.getItem('cr_token') || '',
  user: safeParse(localStorage.getItem('cr_user')),
  projects: [],
  current: null,
  result: null,
  preview: null,
  marketAnalysis: null,
  marketWarnings: [],
  marketBusy: false,
  marketError: null,
  step: 0,
  dirty: false,
  busy: false,
  shopSearch: '',
  shopPage: 1,
  importWarnings: [],
  importHints: null,
  sidebarOpen: false,
};

let locationGeocodeTimer = null;
let activeMapPicker = null;
let previewTimer = null;

function safeParse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in node) || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts.at(-1)] = value;
}

function fmt(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function fmtDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function projectLocation() {
  return String(state.current?.model?.project?.location || '项目所在地').trim() || '项目所在地';
}

function jurisdictionName() {
  const location = projectLocation();
  let region = location.replace(/^.*?(?:省|自治区)/, '');
  const city = region.match(/^(.+?市)/) || region.match(/^(.+?(?:州|盟|地区))/);
  return city ? city[1] : location;
}

function toast(message, type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  toastRegion.appendChild(node);
  setTimeout(() => node.remove(), 3400);
}

function setBusy(value) {
  state.busy = value;
  let overlay = document.querySelector('.loading-overlay');
  if (value && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  } else if (!value && overlay) {
    overlay.remove();
  }
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(path, { ...options, headers, body });
  if (response.status === 401) {
    logout(false);
    throw new Error('登录已过期，请重新登录');
  }
  const contentType = response.headers.get('Content-Type') || '';
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      message = payload.error || message;
    }
    throw new Error(message);
  }
  return contentType.includes('application/json') ? response.json() : response;
}

async function downloadFile(path, fallbackName) {
  setBusy(true);
  try {
    const response = await fetch(path, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || '导出失败');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    let filename = fallbackName;
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (match) filename = decodeURIComponent(match[1]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('文件已生成', 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('cr_token', token);
  localStorage.setItem('cr_user', JSON.stringify(user));
}

function logout(render = true) {
  state.token = '';
  state.user = null;
  state.projects = [];
  state.current = null;
  state.result = null;
  state.preview = null;
  state.marketAnalysis = null;
  state.marketError = null;
  localStorage.removeItem('cr_token');
  localStorage.removeItem('cr_user');
  if (render) renderAuth('login');
}

async function boot() {
  if (!state.token) return renderAuth('login');
  try {
    const me = await api('/api/me');
    state.user = { username: me.username, displayName: me.displayName };
    await loadProjects();
    renderProjectList();
  } catch {
    logout();
  }
}

async function loadProjects() {
  const payload = await api('/api/projects');
  state.projects = payload.projects || [];
}

function renderAuth(mode = 'login') {
  const isLogin = mode === 'login';
  app.innerHTML = `
    <div class="auth-page">
      <section class="auth-visual">
        <div class="brand"><div class="brand-mark">${ICONS.logo}</div><span>多多 · 商业地产</span></div>
        <div class="auth-hero">
          <div class="auth-kicker">Investment intelligence</div>
          <h1>让商业项目测算<br>像填写一份表单一样简单</h1>
          <p>导入铺位面积与业态，系统自动完成投资、租金、税费、20年现金流、IRR与NPV分析，并生成可汇报的表格和PPT。</p>
        </div>
        <div class="auth-points">
          <div class="auth-point"><strong>5步</strong><span>完成项目基础测算</span></div>
          <div class="auth-point"><strong>20年</strong><span>经营与现金流预测</span></div>
          <div class="auth-point"><strong>1键</strong><span>导出Excel与PPT</span></div>
        </div>
        <div class="auth-foot">本工具用于投资初筛与方案比较，不替代可研、审计、评估或税务鉴证。</div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>${isLogin ? '登录工作台' : '创建新账号'}</h2>
          <p class="auth-sub">${isLogin ? '项目保存在本机，登录后继续之前的工作。' : '账号数据保存在本机，适合个人或小团队试用。'}</p>
          <div class="auth-tabs">
            <button type="button" class="${isLogin ? 'active' : ''}" data-auth-mode="login">登录</button>
            <button type="button" class="${!isLogin ? 'active' : ''}" data-auth-mode="register">注册</button>
          </div>
          <div class="auth-alert" id="auth-alert"></div>
          <form id="auth-form">
            ${!isLogin ? '<div class="field"><label>姓名 / 称呼</label><input class="input" name="displayName" autocomplete="name" placeholder="例如：王经理"></div>' : ''}
            <div class="field"><label>用户名</label><input class="input" name="username" autocomplete="username" required placeholder="输入用户名"></div>
            <div class="field"><label>密码 <small>至少6位</small></label><input class="input" type="password" name="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required placeholder="输入密码"></div>
            <button class="auth-submit" type="submit">${isLogin ? '进入工作台' : '注册并进入'}</button>
          </form>
          ${isLogin ? `<div class="auth-demo">首次使用可直接体验：账号 <strong>demo</strong>，密码 <strong>demo1234</strong>。<button type="button" id="fill-demo">一键填入</button></div>` : ''}
        </div>
      </section>
    </div>`;
  document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => renderAuth(btn.dataset.authMode)));
  document.getElementById('fill-demo')?.addEventListener('click', () => {
    const form = document.getElementById('auth-form');
    form.username.value = 'demo';
    form.password.value = 'demo1234';
  });
  document.getElementById('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const alert = document.getElementById('auth-alert');
    alert.classList.remove('show');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = {
      username: form.username.value.trim(),
      password: form.password.value,
      displayName: form.displayName?.value.trim() || form.username.value.trim(),
    };
    setBusy(true);
    try {
      const payload = await api(endpoint, { method: 'POST', body });
      saveSession(payload.token, payload.user);
      await loadProjects();
      renderProjectList();
    } catch (error) {
      alert.textContent = error.message;
      alert.classList.add('show');
    } finally {
      setBusy(false);
    }
  });
}

function sidebar(active = 'projects') {
  return `
    <aside class="sidebar ${state.sidebarOpen ? 'open' : ''}" id="sidebar">
      <div class="brand"><div class="brand-mark">${ICONS.logo}</div><span>多多 · 商业地产</span></div>
      <div class="sidebar-context">Workspace</div>
      <button class="nav-item ${active === 'projects' ? 'active' : ''}" data-nav="projects">
        <span class="nav-icon">${ICONS.projects}</span><span>项目总览</span>
      </button>
      <button class="nav-item" data-nav="new">
        <span class="nav-icon">${ICONS.plus}</span><span>新建项目</span>
      </button>
      <button class="nav-item" data-nav="guide">
        <span class="nav-icon">${ICONS.info}</span><span>使用说明</span>
      </button>
      <div class="sidebar-spacer"></div>
      <div class="user-box">
        <strong>${escapeHtml(state.user?.displayName || state.user?.username || '')}</strong>
        <span>本地工作空间</span>
        <button type="button" id="logout-btn">退出登录</button>
      </div>
    </aside>`;
}

function shell(content, active = 'projects', workspace = false) {
  const title = workspace ? (state.current?.model?.project?.name || '未命名项目') : '项目工作台';
  const subtitle = workspace ? '项目测算与汇报' : '商业地产投资测算';
  app.innerHTML = `
    <div class="app-shell">
      ${sidebar(active)}
      <main class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="back-btn" id="mobile-menu" title="菜单">${ICONS.menu}</button>
            ${workspace ? `<button class="back-btn" id="back-projects" title="返回项目列表">${ICONS.back}</button>` : ''}
            <div>
              <div class="topbar-title">${escapeHtml(title)}</div>
              <div class="save-state ${state.dirty ? 'dirty' : workspace ? 'saved' : ''}" id="save-state">
                <span class="save-dot"></span><span>${workspace ? (state.dirty ? '有未保存修改' : '已保存') : subtitle}</span>
              </div>
            </div>
          </div>
          <div class="top-actions">
            ${workspace ? `
              <button class="btn btn-secondary" id="top-save">${ICONS.save}<span>保存并计算</span></button>
              <button class="btn btn-secondary" id="top-export-excel">${ICONS.excel}<span>Excel</span></button>
              <button class="btn btn-primary" id="top-export-ppt">${ICONS.ppt}<span>PPT汇报</span></button>
            ` : `<button class="btn btn-primary" id="top-new-project">${ICONS.plus}<span>新建项目</span></button>`}
          </div>
        </header>
        <div class="content">${content}</div>
      </main>
    </div>`;
  bindShell();
}

function bindShell() {
  document.getElementById('mobile-menu')?.addEventListener('click', () => {
    state.sidebarOpen = !state.sidebarOpen;
    document.getElementById('sidebar')?.classList.toggle('open', state.sidebarOpen);
  });
  document.getElementById('logout-btn')?.addEventListener('click', () => logout());
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'projects') {
      state.current = null; state.result = null; state.sidebarOpen = false;
      renderProjectList();
    } else if (nav === 'new') openNewProjectModal();
    else if (nav === 'guide') openGuideModal();
  }));
  document.getElementById('back-projects')?.addEventListener('click', () => {
    if (state.dirty && !confirm('当前修改尚未保存，确定返回项目列表吗？')) return;
    state.current = null; state.result = null; state.dirty = false;
    renderProjectList();
  });
  document.getElementById('top-save')?.addEventListener('click', saveProject);
  document.getElementById('top-export-excel')?.addEventListener('click', () => {
    if (!state.current) return;
    if (state.dirty) return toast('请先保存并计算最新修改', 'error');
    downloadFile(`/api/projects/${state.current.id}/export/xlsx`, `${state.current.model.project.name || '项目'}_投资测算.xlsx`);
  });
  document.getElementById('top-export-ppt')?.addEventListener('click', () => {
    if (!state.current) return;
    if (state.dirty) return toast('请先保存并计算最新修改', 'error');
    downloadFile(`/api/projects/${state.current.id}/export/pptx`, `${state.current.model.project.name || '项目'}_投资汇报.pptx`);
  });
  document.getElementById('top-new-project')?.addEventListener('click', openNewProjectModal);
}

function renderProjectList() {
  const cards = state.projects.map(project => projectCard(project)).join('');
  const content = `
    <div class="page-intro">
      <div>
        <div class="eyebrow">Project portfolio</div>
        <h1>项目工作台</h1>
        <p>从项目基础信息开始，按步骤完成成本、铺位和运营测算。所有项目保存在此浏览器所在的本地工作空间。</p>
      </div>
      <button class="btn btn-primary" id="new-project-btn">${ICONS.plus}<span>新建测算项目</span></button>
    </div>
    ${state.projects.length ? `<div class="project-grid">${cards}${newProjectCard()}</div>` : emptyProjectState()}`;
  shell(content, 'projects', false);
  document.getElementById('new-project-btn')?.addEventListener('click', openNewProjectModal);
  document.getElementById('new-project-card')?.addEventListener('click', openNewProjectModal);
  document.getElementById('empty-new-project')?.addEventListener('click', openNewProjectModal);
  document.querySelectorAll('[data-project-id]').forEach(card => card.addEventListener('click', event => {
    if (event.target.closest('[data-delete-project]')) return;
    openProject(card.dataset.projectId);
  }));
  document.querySelectorAll('[data-delete-project]').forEach(btn => btn.addEventListener('click', async event => {
    event.stopPropagation();
    const id = btn.dataset.deleteProject;
    if (!confirm('删除后无法恢复，确定删除该项目吗？')) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' });
      await loadProjects(); renderProjectList(); toast('项目已删除', 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
  }));
}

function newProjectCard() {
  return `<div class="project-card new-project-card" id="new-project-card"><div class="new-project-inner"><div class="new-project-icon">${ICONS.plus}</div><strong>创建新项目</strong><div style="margin-top:6px;font-size:10px">从空白项目开始</div></div></div>`;
}

function emptyProjectState() {
  return `<div class="empty-state"><div class="new-project-icon" style="width:58px;height:58px;font-size:30px">${ICONS.plus}</div><h3>还没有测算项目</h3><p>创建第一个项目，系统会用5个步骤带你完成投资测算。</p><button class="btn btn-primary" id="empty-new-project">创建第一个项目</button></div>`;
}

function projectCard(project) {
  const s = project.summary || {};
  const status = s.status || '待完善';
  return `<article class="project-card" data-project-id="${project.id}">
    <div class="project-card-status"><span>●</span>${escapeHtml(status)}</div>
    <h3>${escapeHtml(s.projectName || project.model?.project?.name || '未命名项目')}</h3>
    <div class="project-location">${escapeHtml(s.location || project.model?.project?.location || '')}</div>
    <div class="project-metrics">
      <div class="project-metric"><strong>${fmt(s.totalInvestment)}</strong><span>投资总额/万元</span></div>
      <div class="project-metric"><strong>${s.projectIrr == null ? '—' : fmtPct(s.projectIrr)}</strong><span>项目IRR</span></div>
      <div class="project-metric"><strong>${s.calculationMode === 'preliminary' ? (s.floorCount || 0) : (s.shopsCount || 0)}</strong><span>${s.calculationMode === 'preliminary' ? '测算楼层' : '铺位数量'}</span></div>
    </div>
    <div class="project-card-foot"><span>更新于 ${fmtDate(project.updatedAt)}</span><button class="btn btn-ghost btn-sm" data-delete-project="${project.id}" title="删除项目">${ICONS.trash}</button></div>
  </article>`;
}

function openNewProjectModal() {
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <div class="modal-head"><div><h2>新建测算项目</h2><p>先填写项目名称和位置，后续可随时修改。</p></div><button class="modal-close" id="modal-close">×</button></div>
        <form id="new-project-form">
          <div class="modal-body">
            <div class="field"><label>项目名称</label><input class="input" name="name" required placeholder="例如：柳江沿岸商业中心"></div>
            <div class="field"><label>项目位置</label><input class="input" name="location" value="广西壮族自治区" placeholder="例如：广西壮族自治区柳州市"></div>
            <div class="field"><label>项目类型</label><select class="select" name="projectType"><option>购物中心</option><option>百货商场</option><option>奥特莱斯</option><option>街区商业</option><option>社区商业</option><option>商业综合体</option><option>其他</option></select></div>
            <div class="field"><label>项目计租方式</label><select class="select" name="revenueModel"><option value="rent">纯租金</option><option value="concession">纯联营扣点</option><option value="guarantee_or_concession">保底与联营扣点取高</option></select></div>
          </div>
          <div class="modal-foot"><button type="button" class="btn btn-secondary" id="modal-cancel">取消</button><button class="btn btn-primary" type="submit">创建并开始</button></div>
        </form>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') close(); });
  document.getElementById('new-project-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const payload = await api('/api/projects', { method: 'POST', body: { name: form.get('name'), model: null } });
      const id = payload.project.id;
      const updated = await api(`/api/projects/${id}`);
      updated.project.model.project.location = form.get('location');
      updated.project.model.project.projectType = form.get('projectType');
      updated.project.model.project.revenueModel = form.get('revenueModel');
      await api(`/api/projects/${id}`, { method: 'PUT', body: { model: updated.project.model } });
      close();
      state.current = { ...updated.project, model: updated.project.model };
      state.result = null; state.preview = null; state.marketAnalysis = null; state.marketError = null; state.step = 0; state.dirty = true;
      renderWorkspace();
    } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
  });
}

function openGuideModal() {
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" style="width:min(680px,100%)">
        <div class="modal-head"><div><h2>使用说明</h2><p>只需准备项目和商铺数据，其余由系统自动计算。</p></div><button class="modal-close" id="modal-close">×</button></div>
        <div class="modal-body" style="line-height:1.8;color:var(--muted);font-size:12px">
          <p><strong style="color:var(--navy)">1. 项目信息：</strong>填写项目名称、位置、总建筑面积和土地价款。</p>
          <p><strong style="color:var(--navy)">2. 成本参数：</strong>可选择参考模板，再按本地造价、装修和公共费用调整。</p>
          <p><strong style="color:var(--navy)">3. 铺位数据：</strong>下载模板，粘贴铺位号、建筑面积、实际租赁面积、楼层和业态后导入。</p>
          <p><strong style="color:var(--navy)">4. 运营与税费：</strong>确认租金增长、出租率、运营成本以及项目属地税费。</p>
          <p><strong style="color:var(--navy)">5. 分析结果：</strong>查看投资、IRR、NPV、NOI、回收期和分析建议，并导出Excel与PPT。</p>
          <div class="callout" style="margin-top:18px;margin-bottom:0">${ICONS.info}<div>演示账号：demo / demo1234。数据只保存在本机，不上传云端。</div></div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary" id="modal-cancel">知道了</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') close(); });
}

async function openProject(projectId) {
  setBusy(true);
  try {
    const payload = await api(`/api/projects/${projectId}`);
    state.current = { ...payload.project, model: payload.result?.model || payload.project.model };
    state.result = payload.result;
    state.preview = payload.result;
    state.marketAnalysis = null;
    state.marketError = null;
    state.step = 0;
    state.dirty = false;
    state.importWarnings = [];
    state.shopPage = 1;
    state.shopSearch = '';
    renderWorkspace();
  } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
}

function renderWorkspace() {
  if (!state.current) return renderProjectList();
  const active = STEPS[state.step];
  const stepsHtml = STEPS.map((step, i) => `
    <button class="step-item ${i === state.step ? 'active' : ''} ${i < state.step ? 'done' : ''}" data-step="${i}">
      <span class="step-no">${i < state.step ? '✓' : i + 1}</span>
      <span class="step-label"><strong>${step.label}</strong><span>${step.desc}</span></span>
    </button>`).join('');
  const content = `
    <div class="workspace-grid">
      <aside class="steps">
        ${stepsHtml}
        <div class="step-footer">数据保存在本机<br>每次保存后自动计算最新结果</div>
      </aside>
      <section class="step-panel">
        <div class="panel-head"><h2>${active.label}</h2><p>${stepDescription(state.step)}</p></div>
        <div class="panel-body">${renderStep()}</div>
        <div class="panel-foot">
          <button class="btn btn-secondary" id="prev-step" ${state.step === 0 ? 'disabled' : ''}>${ICONS.back}<span>上一步</span></button>
          ${state.step < STEPS.length - 1
            ? `<button class="btn btn-primary" id="next-step"><span>下一步：${STEPS[state.step + 1].label}</span>${ICONS.chevron}</button>`
            : `<button class="btn btn-gold" id="final-save">${ICONS.spark}<span>重新测算</span></button>`}
        </div>
      </section>
    </div>`;
  shell(content, 'projects', true);
  bindWorkspace();
  bindStepInputs();
  if (state.step === 5) requestAnimationFrame(renderResultCharts);
}

function stepDescription(step) {
  return [
    '先建立项目的基本边界。除非已经有明确数据，不确定的成本可先采用系统参考值。',
    '成本不必一次精确到合同金额。先形成合理的投资量级，后续可逐步替换为预算或已签合同。',
    '可先用楼层均价做初步测算；招商铺位明确后，再切换一铺一价，并结合电梯口、通道口、转角铺等条件自动分配租金。',
    `这里决定项目收益。优先关注出租率、租金增长、运营成本和折现率，税费可按${jurisdictionName()}属地政策补充。`,
    '系统按项目地图定位，自动汇总3公里和5公里范围内的商业POI与竞品分布；可导入竞品租金样本形成市场租金结论。',
    '结果页会自动形成投资、收益、现金流、敏感性和建议。可在核对参数后重新测算或导出汇报材料。',
  ][step];
}

function bindWorkspace() {
  document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    const nextStep = Number(btn.dataset.step);
    state.sidebarOpen = false;
    if (nextStep === 5 && (state.dirty || !state.result)) {
      saveProject();
      return;
    }
    state.step = nextStep;
    renderWorkspace();
  }));
  document.getElementById('prev-step')?.addEventListener('click', () => {
    state.step = Math.max(0, state.step - 1); renderWorkspace();
  });
  document.getElementById('next-step')?.addEventListener('click', () => {
    const nextStep = Math.min(STEPS.length - 1, state.step + 1);
    if (nextStep === 5 && (state.dirty || !state.result)) {
      saveProject();
      return;
    }
    state.step = nextStep; renderWorkspace();
  });
  document.getElementById('final-save')?.addEventListener('click', saveProject);
}

function renderStep() {
  switch (state.step) {
    case 0: return renderProjectStep();
    case 1: return renderCostStep();
    case 2: return renderShopsStep();
    case 3: return renderOperationsStep();
    case 4: return renderMarketStep();
    case 5: return renderResultsStep();
    default: return '';
  }
}

function textField(label, path, opts = {}) {
  const value = getPath(state.current.model, path);
  const type = opts.type || 'text';
  const unit = opts.unit || '';
  const help = opts.help || '';
  const scale = opts.scale || 1;
  const display = type === 'number' && value !== null && value !== undefined && value !== ''
    ? Number(value) / scale
    : (value ?? '');
  return `<div class="field">
    <label>${label}${opts.optional ? '<small>可选</small>' : ''}</label>
    <div class="${unit ? 'input-affix' : ''}">
      <input class="input" data-path="${path}" data-type="${type}" data-scale="${scale}" type="${type === 'number' ? 'number' : 'text'}" step="${opts.step || 'any'}" value="${escapeHtml(display)}" placeholder="${escapeHtml(opts.placeholder || '')}">
      ${unit ? `<span>${unit}</span>` : ''}
    </div>
    ${help ? `<div class="field-help">${help}</div>` : ''}
  </div>`;
}

function locationField() {
  const project = state.current.model.project;
  const lat = Number(project.latitude);
  const lon = Number(project.longitude);
  const located = Number.isFinite(lat) && Number.isFinite(lon) && project.latitude !== null && project.longitude !== null;
  const source = project.locationSource === 'map' ? '地图选点' : project.locationSource === 'address' ? '地址解析' : '尚未定位';
  return `<div class="field">
    <label>项目位置<small>支持地址自动定位</small></label>
    <div class="location-row">
      <input class="input" id="project-location-input" data-path="project.location" data-type="text" value="${escapeHtml(project.location || '')}" placeholder="输入省、市、区、道路或项目地址">
      <button class="map-button" type="button" id="open-map-picker">${ICONS.pin}<span>地图选点</span></button>
    </div>
    <div class="map-status ${located ? 'located' : ''}" id="map-coord-status"><span class="status-dot"></span><span>${located ? `${source} · ${lat.toFixed(6)}, ${lon.toFixed(6)}` : '输入地址后自动解析；如未识别，可打开地图手动选点'}</span></div>
    <div class="field-help">地址搜索由 OpenStreetMap 提供；地图选点会保存经纬度并随项目一起保存。</div>
  </div>`;
}

function selectField(label, path, options, opts = {}) {
  const value = getPath(state.current.model, path);
  const normalized = options.map(opt => typeof opt === 'object' ? opt : { value: String(opt), label: String(opt) });
  return `<div class="field">
    <label>${label}</label>
    <select class="select" data-path="${path}" data-type="text">
      ${normalized.map(opt => `<option value="${escapeHtml(opt.value)}" ${String(value) === String(opt.value) ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
    </select>
    ${opts.help ? `<div class="field-help">${opts.help}</div>` : ''}
  </div>`;
}

function renderProjectStep() {
  const m = state.current.model;
  const preliminary = (m.calculationMode || 'preliminary') === 'preliminary';
  const floors = m.floors || [];
  const shopBuilding = (m.shops || []).reduce((s, x) => s + Number(x.buildingArea || 0), 0);
  const shopLease = (m.shops || []).reduce((s, x) => s + Number(x.leasableArea || 0), 0);
  const floorBuilding = floors.reduce((s, x) => s + Number(x.buildingArea || 0), 0);
  const floorLease = floors.reduce((s, x) => s + Number(x.leasableArea || 0), 0);
  const preview = state.preview || state.result;
  return `
    <div class="callout">${ICONS.info}<div>不确定“总建筑面积”时可以先留空，系统会按商铺建筑面积 ×（1 + 公共部位分摊系数）自动推算。</div></div>
    <div class="form-section">
      <div class="section-title">项目概况</div>
      <div class="form-grid">
        ${textField('项目名称', 'project.name', { placeholder: '例如：柳江沿岸商业中心' })}
        ${locationField()}
        ${selectField('项目类型', 'project.projectType', ['购物中心', '百货商场', '奥特莱斯', '街区商业', '社区商业', '商业综合体', '其他'])}
        ${selectField('项目计租方式', 'project.revenueModel', [{value:'rent',label:'纯租金'},{value:'concession',label:'纯联营扣点'},{value:'guarantee_or_concession',label:'保底与联营扣点取高'}], { help: '业态可在铺位数据页单独覆盖项目规则' })}
        ${textField('建设起始年份', 'project.startYear', { type: 'number', unit: '年' })}
        ${textField('建设期', 'project.constructionYears', { type: 'number', unit: '年' })}
        ${textField('运营测算期', 'project.operationYears', { type: 'number', unit: '年' })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">面积与土地</div>
      <div class="form-grid">
        ${textField('项目总建筑面积', 'project.gbaOverride', { type: 'number', unit: '㎡', help: '留空或为0时，系统按商铺面积自动推算', optional: true })}
        ${textField('项目占地面积', 'project.landArea', { type: 'number', unit: '㎡', help: '用于城镇土地使用税' })}
        ${textField('公共部位及设备房分摊系数', 'project.commonAreaFactor', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('土地取得价款', 'project.landPrice', { type: 'number', unit: '万元', help: '土地出让金或转让价款' })}
        ${textField('其他前期及开办费用', 'project.otherPreOpening', { type: 'number', unit: '万元', help: '咨询、尽调、筹备办公等' })}
        ${textField('筹备期营销费用', 'project.preOpeningMarketing', { type: 'number', unit: '万元', help: '开业前品牌和招商推广' })}
        ${textField('预备费费率', 'project.contingencyRate', { type: 'number', unit: '%', scale: 0.01, help: '通常按工程及装修直接费用的3%–8%' })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">当前基础结果</div>
      <div class="stats-row">
        <div class="mini-stat"><strong>${fmt(preliminary ? floors.filter(floor => Number(floor.buildingArea) > 0).length : (m.shops?.length || 0))}</strong><span>${preliminary ? '已填写楼层' : '已导入铺位'}</span></div>
        <div class="mini-stat"><strong>${fmt((preliminary ? floorBuilding : shopBuilding) || m.project.gbaOverride || 0)}</strong><span>${preliminary ? '楼层建筑面积合计/㎡' : '商铺建筑面积合计/㎡'}</span></div>
        <div class="mini-stat"><strong>${fmt(preliminary ? floorLease : shopLease)}</strong><span>可租赁面积合计/㎡</span></div>
        <div class="mini-stat"><strong data-live="investment">${preview ? fmt(preview.summary.totalInvestment) : '待计算'}</strong><span>项目总投资/万元</span></div>
      </div>
    </div>`;
}

function renderCostStep() {
  const presets = [
    { name: '社区商业', values: { preconstructionRate: 180, constructionRate: 3200, fitoutRate: 850, equipmentRate: 450, otherEngineeringRate: 100 } },
    { name: '街区商业', values: { preconstructionRate: 220, constructionRate: 3600, fitoutRate: 1100, equipmentRate: 550, otherEngineeringRate: 130 } },
    { name: '购物中心', values: { preconstructionRate: 280, constructionRate: 4200, fitoutRate: 1600, equipmentRate: 800, otherEngineeringRate: 180 } },
  ];
  return `
    <div class="callout">${ICONS.info}<div>系统预填的是参考量级，不代表${escapeHtml(jurisdictionName())}本地实际造价。可先选择项目类型，再根据造价咨询或目标成本调整。</div></div>
    <div class="preset-row">
      <span style="font-size:10px;color:var(--muted);padding:8px 2px">参考模板：</span>
      ${presets.map((preset, i) => `<button class="preset" data-preset="${i}">${preset.name}</button>`).join('')}
    </div>
    <div class="form-section">
      <div class="section-title">工程及装修投资单价</div>
      <div class="form-grid">
        ${textField('前期工程费', 'costs.preconstructionRate', { type: 'number', unit: '元/㎡' })}
        ${textField('建安工程费', 'costs.constructionRate', { type: 'number', unit: '元/㎡' })}
        ${textField('其他工程费用', 'costs.otherEngineeringRate', { type: 'number', unit: '元/㎡' })}
        ${textField('公共区域精装', 'costs.fitoutRate', { type: 'number', unit: '元/㎡' })}
        ${textField('设施设备', 'costs.equipmentRate', { type: 'number', unit: '元/㎡' })}
        ${textField('铺底流动资金率', 'costs.workingCapitalRate', { type: 'number', unit: '%', scale: 0.01 })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">项目所在地公共费用</div>
      <div class="section-note">以下费用没有统一的全国单价，默认留为0，请按${escapeHtml(projectLocation())}的项目条件和现行属地政策填写。</div>
      <div class="form-grid">
        ${textField('市政基础设施配套费', 'costs.municipalFeeRate', { type: 'number', unit: '元/㎡', optional: true })}
        ${textField('人防易地建设费', 'costs.civilDefenseFeeRate', { type: 'number', unit: '元/㎡', optional: true })}
        ${textField('其他公共规费', 'costs.otherPublicFeeRate', { type: 'number', unit: '元/㎡', optional: true })}
      </div>
    </div>
    <div class="stats-row">
      <div class="mini-stat"><strong id="cost-estimate">${state.result ? fmt(state.result.summary.totalInvestment) : '保存后计算'}</strong><span>预计项目总投资/万元</span></div>
      <div class="mini-stat"><strong>${fmt(state.current.model.project.gbaOverride || state.current.model.shops.reduce((s, x) => s + Number(x.buildingArea || 0), 0) * (1 + Number(state.current.model.project.commonAreaFactor || 0)) || 0)}</strong><span>计算用总建筑面积/㎡</span></div>
      <div class="mini-stat"><strong>${fmtPct(state.current.model.project.contingencyRate)}</strong><span>预备费费率</span></div>
      <div class="mini-stat"><strong>${fmt(state.current.model.shops.length)}</strong><span>铺位数量</span></div>
    </div>`;
}

function renderShopsStep() {
  const m = state.current.model;
  const mode = m.calculationMode || 'preliminary';
  const floors = m.floors || [];
  const shops = m.shops || [];
  const preview = state.preview || state.result;
  const totalBuilding = floors.reduce((sum, floor) => sum + Number(floor.buildingArea || 0), 0);
  const totalLease = floors.reduce((sum, floor) => sum + Number(floor.leasableArea || 0), 0);
  const revenueMode = m.project?.revenueModel || 'rent';
  const totalMonthly = floors.reduce((sum, floor) => {
    const area = Number(floor.leasableArea || 0);
    const guarantee = area * Number(floor.avgRent || 0);
    const concession = area * Number(floor.salesPerSqmMonth || 0) * Number(floor.concessionRate || 0);
    return sum + (revenueMode === 'concession' ? concession : revenueMode === 'guarantee_or_concession' ? Math.max(guarantee, concession) : guarantee);
  }, 0);
  return `
    <div class="callout">${ICONS.info}<div>初期没有铺位明细时，可按楼层填写可租赁面积和平均月租金快速测算；招商方案明确后，再切换为一铺一价测算。</div></div>
    <div class="mode-switch">
      <button type="button" class="mode-card ${mode === 'preliminary' ? 'active' : ''}" data-shop-mode="preliminary"><strong>初步测算</strong><span>按楼层均价快速判断项目量级</span></button>
      <button type="button" class="mode-card ${mode === 'detailed' ? 'active' : ''}" data-shop-mode="detailed"><strong>一铺一价</strong><span>按铺位、业态和位置条件精细定价</span></button>
    </div>
    ${renderSettlementControls(m)}
    ${renderFloorEditor(m, mode, preview)}
    <div class="stats-row">
      <div class="mini-stat"><strong data-live="investment">${preview ? fmt(preview.summary.totalInvestment) : '待计算'}</strong><span>项目总投资/万元</span></div>
      <div class="mini-stat"><strong data-live="monthlyRent">${preview ? fmt(preview.summary.totalMonthlyRent) : fmt(totalMonthly)}</strong><span>满租月收益/元</span></div>
      <div class="mini-stat"><strong data-live="avgRent">${preview ? fmt(preview.summary.averageRent, 1) : fmt(totalLease ? totalMonthly / totalLease : 0, 1)}</strong><span>平均月收益/元/㎡</span></div>
      <div class="mini-stat"><strong data-live="status">${preview ? escapeHtml(preview.summary.status) : '自动计算中'}</strong><span>实时测算状态</span></div>
    </div>
    ${mode === 'preliminary'
      ? renderPreliminarySummary(shops, floors, totalBuilding, totalLease, totalMonthly)
      : renderDetailedPricing(m, shops, preview)}
  `;
}

function renderSettlementControls(m) {
  const current = m.project?.revenueModel || 'rent';
  const labels = { rent: '纯租金', concession: '纯联营扣点', guarantee_or_concession: '保底与联营扣点取高' };
  return `<div class="settlement-panel">
    <div><span class="eyebrow">Revenue model</span><strong>项目计租方式</strong><small>百货和奥特莱斯通常采用联营扣点或保底与扣点取高，也可按业态分别覆盖。</small></div>
    <div class="settlement-actions">
      <select class="select" data-path="project.revenueModel" data-type="text">
        ${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      <button type="button" class="preset" data-settlement-preset="department">应用百货参考</button>
      <button type="button" class="preset" data-settlement-preset="outlet">应用奥莱参考</button>
    </div>
  </div>`;
}

function renderFloorEditor(m, mode, preview) {
  const floors = m.floors || [];
  const revenueMode = m.project?.revenueModel || 'rent';
  const concessionEnabled = revenueMode !== 'rent';
  const previewFloors = new Map((preview?.floors || []).map(floor => [floor.name, floor]));
  return `<div class="form-section">
    <div class="section-title">楼层均价与面积</div>
    <div class="section-note">${mode === 'preliminary' ? `系统按项目计租方式汇总楼层收益${concessionEnabled ? '，并比较保底租金与联营扣点' : ''}。调整面积、租金、销售基数或扣点率后会自动重新测算。` : '这里的楼层均价将作为一铺一价的基础：再乘业态系数并叠加铺位条件溢价。'}</div>
    <div class="data-table-wrap floor-table-wrap">
      <table class="data-table floor-table"><thead><tr><th>楼层</th><th class="num">建筑面积（㎡）</th><th class="num">可租赁面积（㎡）</th><th class="num">得铺率</th><th class="num">保底/平均租金（元/㎡）</th>${concessionEnabled ? '<th class="num">销售基数（元/㎡/月）</th><th class="num">扣点率</th>' : ''}<th class="num">满租月收益（元）</th><th class="num">实际加权收益</th><th></th></tr></thead><tbody>
        ${floors.length ? floors.map((floor, i) => {
          const ratio = Number(floor.buildingArea) ? Number(floor.leasableArea) / Number(floor.buildingArea) : 0;
          const area = Number(floor.leasableArea || 0);
          const guarantee = area * Number(floor.avgRent || 0);
          const concession = area * Number(floor.salesPerSqmMonth || 0) * Number(floor.concessionRate || 0);
          const monthly = revenueMode === 'concession' ? concession : revenueMode === 'guarantee_or_concession' ? Math.max(guarantee, concession) : guarantee;
          const calculated = previewFloors.get(floor.name);
          return `<tr>
            <td><input class="table-input floor-name-input" data-path="floors.${i}.name" data-type="text" value="${escapeHtml(floor.name || '')}"></td>
            <td class="num"><input class="table-input" data-path="floors.${i}.buildingArea" data-type="number" type="number" step="any" value="${floor.buildingArea ?? 0}"></td>
            <td class="num"><input class="table-input" data-path="floors.${i}.leasableArea" data-type="number" type="number" step="any" value="${floor.leasableArea ?? 0}"></td>
            <td class="num">${fmtPct(ratio)}</td>
            <td class="num"><input class="table-input highlight-input" data-path="floors.${i}.avgRent" data-type="number" type="number" step="any" value="${floor.avgRent ?? 0}"></td>
            ${concessionEnabled ? `<td class="num"><input class="table-input" data-path="floors.${i}.salesPerSqmMonth" data-type="number" type="number" step="any" value="${floor.salesPerSqmMonth ?? 0}"></td><td class="num"><input class="table-input" data-path="floors.${i}.concessionRate" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(floor.concessionRate || 0) * 100).toFixed(1)}"></td>` : ''}
            <td class="num">${fmt(monthly)}</td>
            <td class="num" data-floor-actual="${escapeHtml(floor.name)}">${calculated ? fmt(calculated.weightedRent || calculated.avgRent, 1) : '待计算'}</td>
            <td><button type="button" class="btn btn-ghost btn-sm" data-remove-floor="${i}">${ICONS.trash}</button></td>
          </tr>`;
        }).join('') : `<tr><td colspan="${concessionEnabled ? 10 : 8}" style="text-align:center;padding:26px;color:var(--muted)">尚未添加楼层，点击下方“新增楼层”。</td></tr>`}
      </tbody></table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
      <button type="button" class="btn btn-secondary btn-sm" id="add-floor">${ICONS.plus}<span>新增楼层</span></button>
      <span class="live-hint">调整楼层均价后系统自动核算</span>
    </div>
  </div>`;
}

function renderPreliminarySummary(shops, floors, totalBuilding, totalLease, totalMonthly) {
  return `<div class="form-section">
    <div class="section-title">初步测算说明</div>
    <div class="preliminary-grid">
      <div class="insight-card"><span>楼层数量</span><strong>${fmt(floors.length)}</strong><em>已纳入测算</em></div>
      <div class="insight-card"><span>建筑面积</span><strong>${fmt(totalBuilding, 1)}</strong><em>㎡</em></div>
      <div class="insight-card"><span>可租赁面积</span><strong>${fmt(totalLease, 1)}</strong><em>㎡</em></div>
      <div class="insight-card"><span>满租月收益</span><strong>${fmt(totalMonthly)}</strong><em>元/月</em></div>
    </div>
    <div class="callout soft">${ICONS.spark}<div>初步测算适合项目拿地、定位和投资机会研判阶段。招商铺位明确后，切换到“一铺一价”，可按楼层均价、业态系数和电梯口、转角铺等条件自动分配单铺租金。</div></div>
  </div>`;
}

function renderDetailedPricing(m, shops, preview) {
  const categoryRent = Object.fromEntries((m.categories || []).map(c => [c.name, Number(c.rent || 0)]));
  const filtered = shops.filter(s => !state.shopSearch || `${s.id} ${s.floor} ${s.category} ${s.status} ${(s.conditions || []).join(' ')}`.toLowerCase().includes(state.shopSearch.toLowerCase()));
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.shopPage = Math.min(state.shopPage, pageCount);
  const start = (state.shopPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const previewShopMap = new Map((preview?.shops || []).map(shop => [shop.id, shop]));
  const totalBuilding = shops.reduce((sum, shop) => sum + Number(shop.buildingArea || 0), 0);
  const totalLease = shops.reduce((sum, shop) => sum + Number(shop.leasableArea || 0), 0);
  return `
    <div class="import-zone" id="import-zone">
      <div class="import-icon">${ICONS.upload}</div>
      <div><h3>导入一铺一价电子表格</h3><p>支持 .xlsx、.xlsm、.csv。可导入铺位号、面积、楼层、业态、状态、租金覆盖值和铺位条件。</p></div>
      <div class="import-actions"><button class="btn btn-secondary" id="download-template">${ICONS.download}<span>下载模板</span></button><button class="btn btn-primary" id="choose-file">${ICONS.upload}<span>选择文件</span></button><input type="file" id="shop-file" accept=".xlsx,.xlsm,.csv" hidden></div>
    </div>
    ${state.importWarnings.length ? `<div class="warning-list">${state.importWarnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}</div>` : ''}
    <div class="form-section compact-top">
      <div class="section-title">业态租金 / 联营扣点规则</div>
      <div class="section-note">每个业态可单独选择计租方式：继承项目、纯租金、纯联营扣点或保底与扣点取高。销售基数和扣点率为行业参考起点，应与本地竞品核对。</div>
      <div class="data-table-wrap" style="max-height:none"><table class="data-table category-rules-table"><thead><tr><th>业态</th><th>结算方式</th><th class="num">保底租金（元/㎡/月）</th><th class="num">销售基数（元/㎡/月）</th><th class="num">扣点率</th><th class="num">业态系数</th></tr></thead><tbody>
        ${(m.categories || []).map((cat, i) => `<tr><td><strong>${escapeHtml(cat.name)}</strong></td><td><select class="table-select" data-path="categories.${i}.revenueMode" data-type="text"><option value="inherit" ${cat.revenueMode === 'inherit' ? 'selected' : ''}>继承项目</option><option value="rent" ${cat.revenueMode === 'rent' ? 'selected' : ''}>纯租金</option><option value="concession" ${cat.revenueMode === 'concession' ? 'selected' : ''}>纯联营扣点</option><option value="guarantee_or_concession" ${cat.revenueMode === 'guarantee_or_concession' ? 'selected' : ''}>保底与扣点取高</option></select></td><td class="num"><input class="table-input" data-path="categories.${i}.rent" data-type="number" type="number" step="any" value="${cat.rent ?? 0}"></td><td class="num"><input class="table-input" data-path="categories.${i}.salesPerSqmMonth" data-type="number" type="number" step="any" value="${cat.salesPerSqmMonth ?? 0}"></td><td class="num"><input class="table-input" data-path="categories.${i}.concessionRate" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(cat.concessionRate || 0) * 100).toFixed(1)}"></td><td class="num"><input class="table-input" data-path="categories.${i}.factor" data-type="number" type="number" step="any" value="${cat.factor ?? 1}"></td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="form-section">
      <div class="section-title">铺位位置条件溢价</div>
      <div class="section-note">勾选启用后，同一铺位可叠加多个条件；条件溢价合计最高按40%封顶。</div>
      <div class="condition-grid">
        ${(m.conditionPremiums || []).map((condition, i) => `<div class="condition-item ${condition.enabled ? 'active' : ''}"><label class="condition-toggle"><input type="checkbox" data-path="conditionPremiums.${i}.enabled" data-type="bool" ${condition.enabled ? 'checked' : ''}><span></span></label><input class="condition-name" data-path="conditionPremiums.${i}.name" data-type="text" value="${escapeHtml(condition.name)}"><div class="condition-rate"><input data-path="conditionPremiums.${i}.premium" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(condition.premium || 0) * 100).toFixed(1)}"><span>%</span></div></div>`).join('')}
      </div>
    </div>
    <div class="table-toolbar">
      <div style="position:relative;flex:1;max-width:330px"><input class="input" id="shop-search" placeholder="搜索铺位号、楼层、业态或位置条件" value="${escapeHtml(state.shopSearch)}"></div>
      <div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" id="add-shop">${ICONS.plus}<span>新增铺位</span></button>${shops.length ? `<button class="btn btn-danger btn-sm" id="clear-shops">${ICONS.trash}<span>清空</span></button>` : ''}</div>
    </div>
    <div class="data-table-wrap">
      <table class="data-table"><thead><tr><th>铺位号</th><th>楼层</th><th>业态</th><th>位置条件</th><th>结算方式</th><th class="num">建筑面积</th><th class="num">租赁面积</th><th class="num">保底收入</th><th class="num">联营收入</th><th class="num">测算收入</th><th></th></tr></thead><tbody>
        ${pageRows.length ? pageRows.map(shop => {
          const calc = previewShopMap.get(shop.id);
          const base = calc?.baseRent ?? (categoryRent[shop.category] || 0);
          const modeLabels = { rent:'纯租金', concession:'纯扣点', guarantee_or_concession:'保底/扣点取高' };
          const mode = calc?.settlementMode || (m.categories.find(c => c.name === shop.category)?.revenueMode !== 'inherit' ? m.categories.find(c => c.name === shop.category)?.revenueMode : m.project.revenueModel) || 'rent';
          return `<tr><td><strong>${escapeHtml(shop.id)}</strong></td><td>${escapeHtml(shop.floor || '—')}</td><td>${escapeHtml(shop.category)}</td><td>${(shop.conditions || []).length ? shop.conditions.map(c => `<span class="tag condition-tag">${escapeHtml(c)}</span>`).join(' ') : '<span style="color:#a1a7a3">—</span>'}</td><td><span class="tag">${modeLabels[mode] || mode}</span></td><td class="num">${fmt(shop.buildingArea, 1)}</td><td class="num">${fmt(shop.leasableArea, 1)}</td><td class="num" data-shop-guarantee="${escapeHtml(shop.id)}">${calc ? fmt(calc.guaranteeRevenue) : '待计算'}</td><td class="num" data-shop-concession="${escapeHtml(shop.id)}">${calc ? fmt(calc.concessionRevenue) : '待计算'}</td><td class="num"><strong data-shop-revenue="${escapeHtml(shop.id)}">${calc ? fmt(calc.monthlyRevenue) : '待计算'}</strong></td><td><button class="btn btn-ghost btn-sm" data-edit-shop="${shops.indexOf(shop)}">编辑</button><button class="btn btn-ghost btn-sm" data-delete-shop="${escapeHtml(shop.id)}">${ICONS.trash}</button></td></tr>`;
        }).join('') : `<tr><td colspan="11" style="text-align:center;padding:36px;color:var(--muted)">尚未导入铺位。点击上方“选择文件”或“新增铺位”。</td></tr>`}
      </tbody></table>
    </div>
    <div class="table-pagination"><button class="btn btn-ghost btn-sm" id="shop-prev" ${state.shopPage <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${state.shopPage} / ${pageCount} 页，共 ${filtered.length} 个铺位</span><button class="btn btn-ghost btn-sm" id="shop-next" ${state.shopPage >= pageCount ? 'disabled' : ''}>下一页</button></div>`;
}

function renderOperationsStep() {
  return `
    <div class="callout">${ICONS.info}<div>如果暂时没有详细运营预算，可保留系统参考值。系统会自动形成20年现金流、税费和投资收益。</div></div>
    <div class="form-section">
      <div class="section-title">租金与出租率</div>
      <div class="form-grid">
        ${textField('首年出租率', 'operations.occupancyY1', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('第二年出租率', 'operations.occupancyY2', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('稳定期出租率', 'operations.stableOccupancy', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('稳定期起始运营年', 'operations.stableYear', { type: 'number', unit: '年' })}
        ${textField('首年免租月数', 'operations.rentFreeMonths', { type: 'number', unit: '月' })}
        ${textField('租金年增长率', 'operations.rentGrowth', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('联营销售额年增长率', 'operations.salesGrowth', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('租金收缴率', 'operations.collectionRate', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('续租周期', 'operations.renewalCycle', { type: 'number', unit: '年' })}
        ${textField('租赁保证金月数', 'operations.depositMonths', { type: 'number', unit: '月' })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">收入与运营成本</div>
      <div class="form-grid">
        ${textField('物业管理费', 'revenues.propertyFee', { type: 'number', unit: '元/㎡/月' })}
        ${textField('多经收入占租金比例', 'revenues.otherIncomeRatio', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('停车位数量', 'revenues.parkingSpaces', { type: 'number', unit: '个', optional: true })}
        ${textField('停车月租', 'revenues.parkingMonthly', { type: 'number', unit: '元/位/月', optional: true })}
        ${textField('物业运营成本', 'operations.propertyOpsCost', { type: 'number', unit: '元/㎡/月' })}
        ${textField('公共能耗', 'operations.energyCost', { type: 'number', unit: '元/㎡/月' })}
        ${textField('商管团队成本', 'operations.staffCostPerSqm', { type: 'number', unit: '元/㎡/月' })}
        ${textField('行政办公成本', 'operations.adminCostPerSqm', { type: 'number', unit: '元/㎡/月' })}
        ${textField('营销费用率', 'operations.marketingRate', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('维修改造费率', 'operations.repairRate', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('保险费用率', 'operations.insuranceRate', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('资本化改造率', 'operations.capexRate', { type: 'number', unit: '%', scale: 0.01 })}
      </div>
    </div>
    <details class="advanced">
      <summary>税费与属地公共费用（高级）</summary>
      <div class="advanced-body">
        <div class="form-grid">
          ${textField('租金增值税率', 'taxes.vatRent', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('物业费增值税率', 'taxes.vatProperty', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('其他收入增值税率', 'taxes.vatOther', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('联营扣点增值税率', 'taxes.vatConcession', { type: 'number', unit: '%', scale: 0.01 })}
          ${selectField('房产税计征方式', 'taxes.propertyTaxMethod', [{ value: 'rent', label: '从租计征' }, { value: 'value', label: '从价计征' }], { help: '出租物业通常按从租计征，具体以税务认定为准' })}
          ${textField('房产税从租税率', 'taxes.propertyTaxRateRent', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('城镇土地使用税', 'taxes.landUseTax', { type: 'number', unit: '元/㎡/年', optional: true })}
          ${textField('印花税率', 'taxes.stampDuty', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('地方基金/附加占收入', 'taxes.localFundRate', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('企业所得税率', 'taxes.corporateTax', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('土地契税率', 'taxes.deedTax', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('城建税率', 'taxes.cityTax', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('教育费附加', 'taxes.educationSurcharge', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('地方教育附加', 'taxes.localEducationSurcharge', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('退出费用及税费率', 'taxes.exitTaxRate', { type: 'number', unit: '%', scale: 0.01 })}
        </div>
      </div>
    </details>
    <details class="advanced">
      <summary>融资与退出假设</summary>
      <div class="advanced-body">
        <div class="form-grid">
          ${textField('债务融资比例', 'finance.debtRatio', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('年贷款利率', 'finance.loanRate', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('贷款期限', 'finance.loanTerm', { type: 'number', unit: '年' })}
          ${textField('运营期还款宽限期', 'finance.graceYears', { type: 'number', unit: '年' })}
          ${textField('折现率', 'valuation.discountRate', { type: 'number', unit: '%', scale: 0.01 })}
          ${textField('退出资本化率', 'valuation.exitCapRate', { type: 'number', unit: '%', scale: 0.01 })}
          ${selectField('是否计入期末退出价值', 'valuation.includeExit', [{ value: 'true', label: '计入' }, { value: 'false', label: '不计入' }], { help: '退出价值=期末NOI÷退出资本化率' })}
        </div>
      </div>
    </details>`;
}

function renderMarketStep() {
  const model = state.current.model;
  const project = model.project;
  const market = model.market || (model.market = { radiusKm: 3, comparables: [] });
  const lat = Number(project.latitude);
  const lon = Number(project.longitude);
  const hasLocation = project.latitude !== null && project.longitude !== null && Number.isFinite(lat) && Number.isFinite(lon);
  const analysis = state.marketAnalysis || market.lastAnalysis;
  const comps = market.comparables || [];
  const rentSummary = (state.preview || state.result)?.marketSummary;
  if (!hasLocation) {
    return `<div class="empty-state"><div class="new-project-icon">${ICONS.pin}</div><h3>请先给项目做地图定位</h3><p>周边市场分析需要项目经纬度。打开项目信息页，通过地址自动定位或地图选点后再回来。</p><button class="btn btn-primary" id="go-location-step">${ICONS.pin}<span>去定位项目位置</span></button></div>`;
  }
  return `
    <div class="market-location-bar">
      <div><span class="eyebrow">Market intelligence</span><strong>${escapeHtml(project.location || '')}</strong><small>定位：${lat.toFixed(6)}, ${lon.toFixed(6)} · 数据来源 OpenStreetMap</small></div>
      <div class="market-radius-switch">
        ${[3, 5].map(radius => `<button type="button" class="${Number(market.radiusKm) === radius ? 'active' : ''}" data-market-radius="${radius}">${radius}公里</button>`).join('')}
      </div>
    </div>
    ${analysis?.fallbackUsed ? `<div class="warning-item market-fallback-note">${escapeHtml(analysis.coverageNote || '当前显示较近半径的缓存市场结果。')}</div>` : ''}
    ${state.marketBusy ? `<div class="market-loading"><div class="spinner"></div><strong>正在汇总周边商业大数据</strong><span>分析购物中心、百货、超市、餐饮、影院、健身和酒店等POI</span></div>` : state.marketError && !analysis ? `<div class="market-error-card"><div class="import-icon">${ICONS.info}</div><div><strong>周边市场数据暂时获取失败</strong><span>${escapeHtml(state.marketError)}</span></div><button class="btn btn-primary" id="retry-market-analysis">${ICONS.spark}<span>重新获取</span></button></div>` : analysis ? `
      <div class="stats-row market-stats">
        <div class="mini-stat"><strong>${fmt(analysis.totalPoi)}</strong><span>相关商业POI</span></div>
        <div class="mini-stat"><strong>${fmt(analysis.competitorCount)}</strong><span>直接竞品</span></div>
        <div class="mini-stat"><strong>${fmt(analysis.densityPerKm2, 1)}</strong><span>商业POI密度/平方公里</span></div>
        <div class="mini-stat"><strong>${escapeHtml(analysis.competitionLevel)}</strong><span>供给竞争判断</span></div>
      </div>
      <div class="dashboard-grid market-dashboard">
        <div class="card"><h3>周边商业业态结构</h3><div class="market-bars">${(analysis.categories || []).map(item => { const max = Math.max(...(analysis.categories || []).map(x => x.count), 1); return `<div class="market-bar-row"><span>${escapeHtml(item.name)}</span><div><i style="width:${Math.max(4, item.count / max * 100)}%"></i></div><strong>${fmt(item.count)}</strong></div>`; }).join('') || '<div class="empty-inline">暂无分类数据</div>'}</div><div class="market-source-note">${escapeHtml(analysis.summary || '')}</div></div>
        <div class="card"><h3>主要竞品</h3><div class="competitor-list">${(analysis.competitors || []).slice(0, 8).map((item, index) => `<div class="competitor-item"><span class="competitor-index">${index + 1}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${item.distanceKm == null ? '距离未知' : `${fmt(item.distanceKm, 1)}km`}</small></div></div>`).join('') || '<div class="empty-inline">未识别到具名直接竞品</div>'}</div></div>
      </div>` : `<div class="callout">${ICONS.info}<div>已完成项目定位。点击下方按钮，系统将自动分析${market.radiusKm || 3}公里范围内的商业供给和竞品分布。</div></div><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px"><span class="live-hint">公开地图POI仅用于供给密度初筛</span><button class="btn btn-primary" id="run-market-analysis">${ICONS.spark}<span>开始市场分析</span></button></div>`}
    <div class="panel-subsection">
      <div class="section-title">竞品租金大数据</div>
      <div class="section-note">地图公开数据通常不包含租金。导入3–5公里范围内的竞品租金样本后，系统会计算市场中位数、加权均价、分位数和项目租金位置。</div>
      <div class="import-zone market-import-zone" id="market-import-zone">
        <div class="import-icon">${ICONS.excel}</div>
        <div><h3>导入竞品租金样本</h3><p>支持 .xlsx、.xlsm、.csv。建议填写样本名称、地址、楼层、业态、面积、月租金和数据日期。</p></div>
        <div class="import-actions"><button class="btn btn-secondary" id="download-market-template">${ICONS.download}<span>下载模板</span></button><button class="btn btn-primary" id="choose-market-file">${ICONS.upload}<span>选择文件</span></button><input type="file" id="market-file" accept=".xlsx,.xlsm,.csv" hidden></div>
      </div>
      ${state.marketWarnings.length ? `<div class="warning-list">${state.marketWarnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}</div>` : ''}
    </div>
    ${rentSummary && rentSummary.count > 0 ? renderMarketRentSummary(rentSummary, comps) : `<div class="market-empty-comps"><strong>尚未导入竞品租金样本</strong><span>没有市场样本时，系统不会凭空判断项目租金高低。请导入调研数据或授权市场数据库记录。</span></div>`}
  `;
}

function renderMarketRentSummary(summary, comps) {
  return `
    <div class="market-rent-head"><h3>竞品租金分析</h3><span class="rent-position">${escapeHtml(summary.position)}</span></div>
    <div class="stats-row market-rent-stats">
      <div class="mini-stat"><strong>${fmt(summary.count)}</strong><span>有效样本</span></div>
      <div class="mini-stat"><strong>${fmt(summary.weightedAverageRent, 1)}</strong><span>市场加权均价/元/㎡/月</span></div>
      <div class="mini-stat"><strong>${fmt(summary.medianRent, 1)}</strong><span>市场中位数/元/㎡/月</span></div>
      <div class="mini-stat"><strong>${fmt(summary.projectAverageRent, 1)}</strong><span>项目平均租金/元/㎡/月</span></div>
    </div>
    <div class="market-rent-band"><span>市场25分位 <strong>${fmt(summary.p25Rent, 1)}</strong></span><i></i><span>中位数 <strong>${fmt(summary.medianRent, 1)}</strong></span><i></i><span>75分位 <strong>${fmt(summary.p75Rent, 1)}</strong></span></div>
    <div class="dashboard-grid market-rent-grid">
      <div class="card"><h3>分业态市场租金</h3><div class="data-table-wrap" style="max-height:280px"><table class="data-table"><thead><tr><th>业态</th><th class="num">样本数</th><th class="num">加权均价</th><th class="num">中位数</th></tr></thead><tbody>${summary.byCategory.map(row => `<tr><td>${escapeHtml(row.name)}</td><td class="num">${row.count}</td><td class="num">${fmt(row.averageRent, 1)}</td><td class="num">${fmt(row.medianRent, 1)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>租金研判</h3><ul class="analysis-list">${summary.conclusions.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul><button class="btn btn-ghost btn-sm" id="clear-market-comps">清空竞品样本</button></div>
    </div>`;
}

function bindMarketStep() {
  const model = state.current.model;
  const project = model.project;
  document.getElementById('go-location-step')?.addEventListener('click', () => { state.step = 0; renderWorkspace(); });
  document.querySelectorAll('[data-market-radius]').forEach(btn => btn.addEventListener('click', () => {
    model.market.radiusKm = Number(btn.dataset.marketRadius);
    state.marketAnalysis = null;
    state.marketError = null;
    state.dirty = true;
    loadMarketAnalysis(true);
  }));
  document.getElementById('run-market-analysis')?.addEventListener('click', () => loadMarketAnalysis(true));
  document.getElementById('retry-market-analysis')?.addEventListener('click', () => loadMarketAnalysis(true));
  const fileInput = document.getElementById('market-file');
  document.getElementById('choose-market-file')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => fileInput.files[0] && importMarketComparables(fileInput.files[0]));
  document.getElementById('download-market-template')?.addEventListener('click', () => downloadFile('/api/templates/market-comps', '商业地产竞品租金导入模板.xlsx'));
  document.getElementById('clear-market-comps')?.addEventListener('click', async () => {
    if (!confirm('确定清空所有竞品租金样本吗？')) return;
    model.market.comparables = [];
    state.marketWarnings = [];
    state.dirty = true;
    await runLivePreview();
    renderWorkspace();
  });
  if (project.latitude !== null && project.longitude !== null && !state.marketBusy && !state.marketError && !isMarketAnalysisCurrent()) {
    loadMarketAnalysis(false);
  } else if ((project.latitude === null || project.longitude === null) && String(project.location || '').trim().length >= 3) {
    toast('正在根据项目地址自动定位并准备市场分析', 'success');
    autoLocateAddress(project.location).then(result => {
      if (result) loadMarketAnalysis(true);
    });
  }
}

function isMarketAnalysisCurrent() {
  const model = state.current.model;
  const project = model.project;
  const analysis = state.marketAnalysis || model.market?.lastAnalysis;
  if (!analysis) return false;
  const radius = Number(model.market?.radiusKm || 3);
  return Math.abs(Number(analysis.center?.lat) - Number(project.latitude)) < 0.0001
    && Math.abs(Number(analysis.center?.lon) - Number(project.longitude)) < 0.0001
    && Math.abs(Number(analysis.radiusKm) - radius) < 0.01;
}

async function loadMarketAnalysis(force = false) {
  const model = state.current.model;
  const project = model.project;
  if (project.latitude === null || project.longitude === null) return;
  if (!force && isMarketAnalysisCurrent()) {
    state.marketAnalysis = state.marketAnalysis || model.market.lastAnalysis;
    return;
  }
  state.marketBusy = true;
  state.marketError = null;
  renderWorkspace();
  try {
    const radius = Number(model.market?.radiusKm || 3);
    const analysis = await api('/api/market-analysis', { method: 'POST', body: { lat: Number(project.latitude), lon: Number(project.longitude), radiusKm: radius } });
    model.market.radiusKm = radius;
    model.market.lastAnalysis = analysis;
    model.market.lastAnalysisAt = new Date().toISOString();
    state.marketAnalysis = analysis;
    state.marketError = null;
    state.dirty = true;
    state.marketBusy = false;
    updateSaveState();
    renderWorkspace();
    toast('周边市场分析已更新', 'success');
  } catch (error) {
    state.marketBusy = false;
    state.marketError = error.message;
    renderWorkspace();
  }
}

async function importMarketComparables(file) {
  setBusy(true);
  try {
    const contentBase64 = await fileToBase64(file);
    const payload = await api('/api/import-market-comps', { method: 'POST', body: { filename: file.name, contentBase64 } });
    state.current.model.market.comparables = payload.comparables || [];
    state.marketWarnings = payload.warnings || [];
    state.dirty = true;
    await runLivePreview();
    renderWorkspace();
    toast(`已导入 ${payload.comparables?.length || 0} 条竞品租金样本`, 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function renderResultsStep() {
  if (!state.result) {
    return `<div class="empty-state"><div class="new-project-icon">${ICONS.spark}</div><h3>结果尚未生成</h3><p>请先保存并计算项目。</p><button class="btn btn-primary" id="inline-calculate">${ICONS.spark}<span>保存并计算</span></button></div>`;
  }
  const s = state.result.summary;
  const analysis = state.result.analysis;
  const kpiClass = value => value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  return `
    <div class="result-hero">
      <div class="result-hero-top"><div><span class="result-status">${escapeHtml(s.status)}</span><h2>${escapeHtml(s.projectName || '商业项目')}</h2><p>${escapeHtml(s.location || '')}｜总建筑面积 ${fmt(s.grossFloorArea)}㎡｜可租赁面积 ${fmt(s.leasableArea)}㎡｜${s.calculationMode === 'preliminary' ? `${fmt(s.floorCount)}个楼层` : `${fmt(s.shopsCount)}个铺位`}</p></div><div style="color:#c9dad5;font-size:10px;text-align:right">${s.calculationMode === 'preliminary' ? '初步楼层均价测算' : '一铺一价精细测算'}<br>${new Date().toLocaleDateString('zh-CN')}</div></div>
    </div>
    <div class="kpi-grid">
      ${kpiCard('项目总投资', fmt(s.totalInvestment), '万元', '')}
      ${kpiCard('项目IRR', s.projectIrr == null ? '不适用' : fmtPct(s.projectIrr), '税后融资前', kpiClass(s.projectIrr))}
      ${kpiCard('项目NPV', fmt(s.projectNpv), '万元', kpiClass(s.projectNpv))}
      ${kpiCard('稳定期NOI', fmt(s.stableNoi), '万元/年', kpiClass(s.stableNoi))}
      ${kpiCard('NOI回报率', fmtPct(s.noiYield), 'NOI / 总投资', kpiClass(s.noiYield))}
      ${kpiCard('静态回收期', s.staticPayback == null ? '未回收' : `${fmt(s.staticPayback, 1)}年`, '按项目现金流', '')}
    </div>
    <div class="dashboard-grid">
      <div class="card"><h3>20年营业收入与NOI</h3><div class="chart-wrap"><canvas id="revenue-chart"></canvas></div><div class="legend"><span><i style="background:#1d6b57"></i>营业收入</span><span><i style="background:#d6a84b"></i>NOI</span></div></div>
      <div class="card"><h3>投资构成</h3><div class="donut-wrap"><canvas id="cost-donut"></canvas><div class="donut-legend">${state.result.investmentBreakdown.map((item, i) => `<div class="donut-item"><i style="background:${donutColor(i)}"></i><span>${escapeHtml(item.name)}</span><strong>${fmt(item.value)}万</strong></div>`).join('')}</div></div></div>
    </div>
    <div class="analysis-panel">
      <div class="card"><h3>分析结论</h3><ul class="analysis-list">${analysis.bullets.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul></div>
      <div class="card"><h3>建议与下一步</h3>${analysis.recommendations.map((text, i) => `<div class="recommendation"><div class="num">${i + 1}</div><p>${escapeHtml(text)}</p></div>`).join('')}</div>
    </div>
    <div class="dashboard-grid" style="grid-template-columns:1.15fr .85fr">
      <div class="card"><h3>项目NPV敏感性（万元）</h3><div style="overflow:auto"><table class="sensitivity-table"><thead><tr><th>租金 ↓ / 投资 →</th>${state.result.sensitivity.capexSteps.map(v => `<th>${fmtPct(v, 0)}</th>`).join('')}</tr></thead><tbody>${state.result.sensitivity.rentSteps.map((rent, i) => `<tr><th>${fmtPct(rent, 0)}</th>${state.result.sensitivity.npvMatrix[i].map(v => `<td class="${v >= 0 ? 'pos' : 'neg'}">${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>数据完整性检查</h3><div class="diagnostic-list">${state.result.diagnostics.slice(0, 8).map(item => `<div class="diagnostic ${item.level}"><span class="dot"></span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div></div>`).join('')}</div></div>
    </div>
    ${renderFloorResultTable()}
    <div class="export-bar"><div><strong>生成汇报材料</strong><span>Excel用于继续分析；PPT用于内部评审和项目汇报。</span></div><div class="export-actions"><button class="btn btn-secondary" id="export-excel">${ICONS.excel}<span>导出Excel</span></button><button class="btn btn-primary" id="export-ppt">${ICONS.ppt}<span>导出PPT汇报</span></button></div></div>`;
}

function renderFloorResultTable() {
  const floors = (state.result?.floors || []).filter(floor => Number(floor.buildingArea || 0) > 0 || Number(floor.leasableArea || 0) > 0);
  if (!floors.length) return '';
  const totalMonthly = floors.reduce((sum, floor) => sum + Number(floor.monthlyRevenue ?? floor.monthlyRent ?? 0), 0);
  return `<div class="card" style="margin-bottom:16px"><h3>楼层收益拆分</h3><div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>楼层</th><th class="num">建筑面积</th><th class="num">可租赁面积</th><th class="num">平均月收益</th><th class="num">满租月收益</th><th class="num">收益占比</th></tr></thead><tbody>${floors.map(floor => `<tr><td><strong>${escapeHtml(floor.name || '未命名')}</strong></td><td class="num">${fmt(floor.buildingArea, 1)}</td><td class="num">${fmt(floor.leasableArea, 1)}</td><td class="num">${fmt(floor.weightedRent || floor.avgRent, 1)}</td><td class="num">${fmt(floor.monthlyRevenue ?? floor.monthlyRent)}</td><td class="num">${fmtPct(totalMonthly ? (floor.monthlyRevenue ?? floor.monthlyRent) / totalMonthly : 0)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function kpiCard(label, value, unit, cls) {
  return `<div class="kpi-card ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="unit">${unit}</div></div>`;
}

function donutColor(i) {
  return ['#103b33', '#1d6b57', '#d6a84b', '#8ea9a1', '#b7a888', '#527c70', '#e4cf9f'][i % 7];
}

function bindStepInputs() {
  document.querySelectorAll('[data-path]').forEach(input => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      const path = input.dataset.path;
      const type = input.dataset.type;
      const scale = Number(input.dataset.scale || 1);
      let value = input.value;
      if (input.type === 'checkbox') value = input.checked;
      else if (type === 'number') value = value === '' ? 0 : Number(value) * scale;
      if (type === 'boolean' || (path === 'valuation.includeExit')) {
        if (value === 'true') value = true;
        if (value === 'false') value = false;
      }
      setPath(state.current.model, path, value);
      if (path === 'project.location') {
        state.current.model.project.latitude = null;
        state.current.model.project.longitude = null;
        state.current.model.project.locationSource = '';
        if (state.current.model.market) state.current.model.market.lastAnalysis = null;
        state.marketAnalysis = null;
        state.marketError = null;
        clearTimeout(locationGeocodeTimer);
        setMapStatus('正在识别地址…', 'loading');
        locationGeocodeTimer = setTimeout(() => {
          if (String(value).trim().length >= 3) autoLocateAddress(String(value).trim());
        }, 900);
      }
      state.dirty = true;
      updateSaveState();
      scheduleLivePreview();
      if (path === 'project.revenueModel') {
        state.preview = null;
        renderWorkspace();
      }
    });
  });
  document.getElementById('open-map-picker')?.addEventListener('click', openMapPicker);
  if (state.step === 2) bindShopsStep();
  if (state.step === 1) bindCostPresets();
  if (state.step === 4) bindMarketStep();
  if (state.step === 5) bindResultsActions();
}

function updateSaveState() {
  const el = document.getElementById('save-state');
  if (!el) return;
  el.classList.toggle('dirty', state.dirty);
  el.classList.toggle('saved', !state.dirty);
  el.querySelector('span:last-child').textContent = state.dirty ? '有未保存修改' : '已保存';
}

function bindCostPresets() {
  const presets = [
    { preconstructionRate: 180, constructionRate: 3200, fitoutRate: 850, equipmentRate: 450, otherEngineeringRate: 100 },
    { preconstructionRate: 220, constructionRate: 3600, fitoutRate: 1100, equipmentRate: 550, otherEngineeringRate: 130 },
    { preconstructionRate: 280, constructionRate: 4200, fitoutRate: 1600, equipmentRate: 800, otherEngineeringRate: 180 },
  ];
  document.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
    const preset = presets[Number(btn.dataset.preset)];
    Object.assign(state.current.model.costs, preset);
    state.dirty = true;
    toast('已应用参考模板，请根据实际项目调整', 'success');
    renderWorkspace();
  }));
}

function setMapStatus(text, mode = '') {
  const el = document.getElementById('map-coord-status');
  if (!el) return;
  el.className = `map-status ${mode}`.trim();
  el.innerHTML = `<span class="status-dot"></span><span>${escapeHtml(text)}</span>`;
}

async function autoLocateAddress(address) {
  if (!address || address.trim().length < 3) return null;
  setMapStatus('正在识别地址…', 'loading');
  try {
    const payload = await api(`/api/geocode?q=${encodeURIComponent(address.trim())}`);
    const first = payload.results?.[0];
    if (!first) {
      setMapStatus('未找到该地址，请点击“地图选点”手动定位');
      return null;
    }
    const project = state.current.model.project;
    project.latitude = Number(first.lat);
    project.longitude = Number(first.lon);
    project.mapZoom = 15;
    project.locationSource = 'address';
    if (state.current.model.market) state.current.model.market.lastAnalysis = null;
    state.marketAnalysis = null;
    state.marketError = null;
    state.dirty = true;
    updateSaveState();
    setMapStatus(`地址解析 · ${first.displayName}`, 'located');
    return first;
  } catch (error) {
    setMapStatus(`地址解析失败：${error.message}`);
    return null;
  }
}

function fallbackMapCenter(project) {
  const location = String(project.location || '');
  if (/柳州/.test(location)) return { lat: 24.3266, lon: 109.4281 };
  if (/桂林/.test(location)) return { lat: 25.2736, lon: 110.2900 };
  if (/南宁/.test(location)) return { lat: 22.8170, lon: 108.3665 };
  if (/北海/.test(location)) return { lat: 21.4811, lon: 109.1202 };
  return { lat: 23.80, lon: 108.30 };
}

function openMapPicker() {
  const project = state.current.model.project;
  const hasCoordinates = Number.isFinite(Number(project.latitude)) && project.latitude !== null && project.longitude !== null;
  const fallback = fallbackMapCenter(project);
  let picked = {
    lat: hasCoordinates ? Number(project.latitude) : fallback.lat,
    lon: hasCoordinates ? Number(project.longitude) : fallback.lon,
    zoom: Number(project.mapZoom) || 12,
    address: project.location || '',
  };
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal map-modal">
        <div class="modal-head">
          <div><h2>地图定位项目位置</h2><p>搜索地址，或直接在地图上拖动、缩放和点击选点。</p></div>
          <button class="modal-close" id="modal-close">×</button>
        </div>
        <div class="modal-body">
          <form class="map-search-row" id="map-search-form">
            <input class="input" id="map-search-input" value="${escapeHtml(project.location || '')}" placeholder="输入项目地址，例如：柳州市沿江东堤路">
            <button class="btn btn-primary" type="submit">${ICONS.search}<span>搜索地址</span></button>
            <button class="btn btn-secondary" type="button" id="use-current-location">${ICONS.locate}<span>当前位置</span></button>
          </form>
          <div class="map-search-results" id="map-search-results"></div>
          <div class="map-canvas" id="map-canvas">
            <div class="map-tile-layer" id="map-tile-layer"></div>
            <div class="map-center-marker">${ICONS.pin}</div>
            <div class="map-instruction">拖动地图或点击选点，中心标记即项目位置</div>
            <a class="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
          </div>
          <div class="map-coordinate-box">
            <div><strong id="map-picked-address">${escapeHtml(picked.address || '尚未选择地址')}</strong><span>点击地图后会自动反向解析地址</span></div>
            <span class="map-coordinate-code" id="map-picked-coords">${picked.lat.toFixed(6)}, ${picked.lon.toFixed(6)}</span>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-secondary" id="modal-cancel">取消</button><button class="btn btn-primary" id="confirm-map-location">${ICONS.pin}<span>使用此位置</span></button></div>
      </div>
    </div>`;
  const close = () => {
    activeMapPicker?.destroy?.();
    activeMapPicker = null;
    modalRegion.innerHTML = '';
  };
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') close(); });

  const map = new TileMap(document.getElementById('map-canvas'), document.getElementById('map-tile-layer'), picked);
  activeMapPicker = map;
  const resultsEl = document.getElementById('map-search-results');
  const addressEl = document.getElementById('map-picked-address');
  const coordsEl = document.getElementById('map-picked-coords');
  let reverseTimer = null;

  const updateSelection = (lat, lon, address = null, resolve = true) => {
    picked.lat = lat;
    picked.lon = lon;
    picked.zoom = map.zoom;
    coordsEl.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    if (address) {
      picked.address = address;
      addressEl.textContent = address;
    }
    if (!resolve) return;
    addressEl.textContent = '正在解析地址…';
    clearTimeout(reverseTimer);
    reverseTimer = setTimeout(async () => {
      try {
        const payload = await api(`/api/reverse-geocode?lat=${lat.toFixed(7)}&lon=${lon.toFixed(7)}`);
        picked.address = payload.displayName || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        addressEl.textContent = picked.address;
      } catch (error) {
        picked.address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        addressEl.textContent = picked.address;
        toast(`反向解析失败：${error.message}`, 'error');
      }
    }, 420);
  };

  map.onSelect = (lat, lon) => updateSelection(lat, lon);
  map.render();

  const showResults = results => {
    if (!results?.length) {
      resultsEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:10px">未找到匹配地址，请尝试更具体的道路或地标名称。</div>';
      resultsEl.classList.add('show');
      return;
    }
    resultsEl.innerHTML = results.map((result, index) => `<button class="map-result" type="button" data-result-index="${index}"><strong>${escapeHtml(result.displayName.split(',')[0])}</strong><span>${escapeHtml(result.displayName)}</span></button>`).join('');
    resultsEl.classList.add('show');
    resultsEl.querySelectorAll('[data-result-index]').forEach(btn => btn.addEventListener('click', () => {
      const result = results[Number(btn.dataset.resultIndex)];
      map.setView(Number(result.lat), Number(result.lon), 15);
      updateSelection(Number(result.lat), Number(result.lon), result.displayName, false);
      resultsEl.classList.remove('show');
    }));
  };

  const search = async (quiet = false) => {
    const query = document.getElementById('map-search-input').value.trim();
    if (query.length < 2) return;
    if (!quiet) {
      resultsEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:10px">正在搜索…</div>';
      resultsEl.classList.add('show');
    }
    try {
      const payload = await api(`/api/geocode?q=${encodeURIComponent(query)}`);
      const results = payload.results || [];
      showResults(results);
      if (quiet && results[0]) {
        map.setView(Number(results[0].lat), Number(results[0].lon), 15);
        updateSelection(Number(results[0].lat), Number(results[0].lon), results[0].displayName, false);
        resultsEl.classList.remove('show');
      }
    } catch (error) {
      resultsEl.innerHTML = `<div style="padding:12px;color:var(--red);font-size:10px">${escapeHtml(error.message)}</div>`;
      resultsEl.classList.add('show');
    }
  };

  document.getElementById('map-search-form').addEventListener('submit', event => {
    event.preventDefault();
    search(false);
  });
  document.getElementById('use-current-location').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('当前浏览器不支持定位', 'error');
    const button = document.getElementById('use-current-location');
    button.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
      button.disabled = false;
      map.setView(position.coords.latitude, position.coords.longitude, 16);
      updateSelection(position.coords.latitude, position.coords.longitude);
    }, error => {
      button.disabled = false;
      toast(`无法获取当前位置：${error.message}`, 'error');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
  document.getElementById('confirm-map-location').addEventListener('click', () => {
    project.latitude = Number(picked.lat.toFixed(7));
    project.longitude = Number(picked.lon.toFixed(7));
    project.mapZoom = map.zoom;
    project.locationSource = 'map';
    if (state.current.model.market) state.current.model.market.lastAnalysis = null;
    state.marketAnalysis = null;
    state.marketError = null;
    if (picked.address) project.location = picked.address;
    state.dirty = true;
    close();
    renderWorkspace();
    toast('项目位置已更新', 'success');
  });
  if (!hasCoordinates && project.location && project.location.length >= 3) setTimeout(() => search(true), 120);
}

class TileMap {
  constructor(container, tileLayer, state) {
    this.container = container;
    this.tileLayer = tileLayer;
    this.lat = Number(state.lat);
    this.lon = Number(state.lon);
    this.zoom = Math.max(3, Math.min(19, Number(state.zoom) || 12));
    this.onSelect = null;
    this.drag = null;
    this.frame = null;
    this.bind();
  }

  get worldSize() { return 256 * 2 ** this.zoom; }
  lonToX(lon) { return (lon + 180) / 360 * this.worldSize; }
  latToY(lat) {
    const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
    const rad = clamped * Math.PI / 180;
    return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * this.worldSize;
  }
  xToLon(x) { return x / this.worldSize * 360 - 180; }
  yToLat(y) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / this.worldSize))) * 180 / Math.PI; }
  centerWorld() { return { x: this.lonToX(this.lon), y: this.latToY(this.lat) }; }

  setView(lat, lon, zoom = this.zoom) {
    this.lat = Math.max(-85.05, Math.min(85.05, lat));
    this.lon = ((lon + 540) % 360) - 180;
    this.zoom = Math.max(3, Math.min(19, Math.round(zoom)));
    this.render();
  }

  render() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.drawTiles());
  }

  drawTiles() {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const center = this.centerWorld();
    const left = center.x - rect.width / 2;
    const top = center.y - rect.height / 2;
    const startX = Math.floor(left / 256);
    const endX = Math.floor((left + rect.width) / 256);
    const startY = Math.floor(top / 256);
    const endY = Math.floor((top + rect.height) / 256);
    const maxTile = 2 ** this.zoom;
    const fragment = document.createDocumentFragment();
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.src = `https://tile.openstreetmap.org/${this.zoom}/${wrappedX}/${y}.png`;
        img.style.left = `${x * 256 - left}px`;
        img.style.top = `${y * 256 - top}px`;
        fragment.appendChild(img);
      }
    }
    this.tileLayer.replaceChildren(fragment);
  }

  bind() {
    this.container.addEventListener('wheel', event => {
      event.preventDefault();
      const next = this.zoom + (event.deltaY < 0 ? 1 : -1);
      if (next !== this.zoom) this.setView(this.lat, this.lon, next);
    }, { passive: false });
    this.container.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.container.setPointerCapture(event.pointerId);
      const rect = this.container.getBoundingClientRect();
      this.drag = { startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, rect, moved: false, center: this.centerWorld() };
      this.container.classList.add('dragging');
    });
    this.container.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      const x = this.drag.center.x - dx;
      const y = this.drag.center.y - dy;
      this.lon = this.xToLon(x);
      this.lat = this.yToLat(y);
      this.render();
    });
    const finish = event => {
      if (!this.drag) return;
      const state = this.drag;
      this.drag = null;
      this.container.classList.remove('dragging');
      if (!state.moved) {
        const rect = state.rect;
        const center = this.centerWorld();
        const x = center.x - rect.width / 2 + (event.clientX - rect.left);
        const y = center.y - rect.height / 2 + (event.clientY - rect.top);
        this.setView(this.yToLat(y), this.xToLon(x), this.zoom);
      }
      if (this.onSelect) this.onSelect(this.lat, this.lon);
    };
    this.container.addEventListener('pointerup', finish);
    this.container.addEventListener('pointercancel', event => {
      this.drag = null;
      this.container.classList.remove('dragging');
    });
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.onSelect = null;
  }
}

function scheduleLivePreview() {
  if (!state.current) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { runLivePreview(); }, 650);
}

async function runLivePreview() {
  if (!state.current) return null;
  try {
    const result = await api('/api/calculate', { method: 'POST', body: { model: state.current.model, includeSensitivity: false } });
    state.preview = result;
    updateLiveStats();
    return result;
  } catch (error) {
    console.warn('实时测算失败', error);
    return null;
  }
}

function updateLiveStats() {
  if (!state.preview) return;
  const summary = state.preview.summary;
  document.querySelectorAll('[data-live="investment"], #cost-estimate').forEach(el => { el.textContent = fmt(summary.totalInvestment); });
  document.querySelectorAll('[data-live="monthlyRent"]').forEach(el => { el.textContent = fmt(summary.totalMonthlyRent); });
  document.querySelectorAll('[data-live="avgRent"]').forEach(el => { el.textContent = fmt(summary.averageRent, 1); });
  document.querySelectorAll('[data-live="status"]').forEach(el => { el.textContent = summary.status; });
  const floors = new Map((state.preview.floors || []).map(floor => [floor.name, floor]));
  document.querySelectorAll('[data-floor-actual]').forEach(el => {
    const floor = floors.get(el.dataset.floorActual);
    if (floor) el.textContent = fmt(floor.weightedRent || floor.avgRent, 1);
  });
  const shops = new Map((state.preview.shops || []).map(shop => [shop.id, shop]));
  document.querySelectorAll('[data-shop-revenue]').forEach(el => {
    const shop = shops.get(el.dataset.shopRevenue);
    if (shop) el.textContent = fmt(shop.monthlyRevenue);
  });
  document.querySelectorAll('[data-shop-base]').forEach(el => {
    const shop = shops.get(el.dataset.shopBase);
    if (shop) el.textContent = fmt(shop.baseRent, 1);
  });
  document.querySelectorAll('[data-shop-premium]').forEach(el => {
    const shop = shops.get(el.dataset.shopPremium);
    if (shop) el.textContent = fmtPct(shop.conditionPremium || 0);
  });
  document.querySelectorAll('[data-shop-guarantee]').forEach(el => {
    const shop = shops.get(el.dataset.shopGuarantee);
    if (shop) el.textContent = fmt(shop.guaranteeRevenue || 0);
  });
  document.querySelectorAll('[data-shop-concession]').forEach(el => {
    const shop = shops.get(el.dataset.shopConcession);
    if (shop) el.textContent = fmt(shop.concessionRevenue || 0);
  });
}

function ensureFloorsFromShops(model) {
  model.floors ||= [];
  const shops = model.shops || [];
  const groups = new Map();
  const categoryRent = Object.fromEntries((model.categories || []).map(cat => [cat.name, Number(cat.rent || 0)]));
  for (const shop of shops) {
    const name = String(shop.floor || '未分楼层').trim() || '未分楼层';
    if (!groups.has(name)) groups.set(name, { buildingArea: 0, leasableArea: 0, rentValue: 0 });
    const group = groups.get(name);
    const rent = shop.rentOverride == null ? categoryRent[shop.category] || 0 : Number(shop.rentOverride);
    group.buildingArea += Number(shop.buildingArea || 0);
    group.leasableArea += Number(shop.leasableArea || 0);
    group.rentValue += Number(shop.leasableArea || 0) * rent;
  }
  const existing = new Map((model.floors || []).map(floor => [floor.name, floor]));
  for (const [name, group] of groups) {
    const avg = group.leasableArea ? group.rentValue / group.leasableArea : 0;
    const floor = existing.get(name);
    if (floor) {
      if (!Number(floor.buildingArea)) floor.buildingArea = group.buildingArea;
      if (!Number(floor.leasableArea)) floor.leasableArea = group.leasableArea;
      if (!Number(floor.avgRent)) floor.avgRent = Number(avg.toFixed(2));
    } else {
      model.floors.push({ name, buildingArea: group.buildingArea, leasableArea: group.leasableArea, avgRent: Number(avg.toFixed(2)) });
    }
  }
}

function bindShopsStep() {
  document.querySelectorAll('[data-settlement-preset]').forEach(btn => btn.addEventListener('click', () => {
    const preset = SETTLEMENT_PRESETS[btn.dataset.settlementPreset];
    if (!preset) return;
    state.current.model.project.revenueModel = 'guarantee_or_concession';
    state.current.model.project.projectType = btn.dataset.settlementPreset === 'department' ? '百货商场' : '奥特莱斯';
    state.current.model.categories.forEach(cat => {
      const rule = preset.categories[cat.name];
      if (rule) Object.assign(cat, rule, { revenueMode: 'inherit' });
    });
    const rules = Object.values(preset.categories);
    const avgRent = rules.reduce((sum, rule) => sum + rule.rent, 0) / rules.length;
    const avgSales = rules.reduce((sum, rule) => sum + rule.salesPerSqmMonth, 0) / rules.length;
    const avgRate = rules.reduce((sum, rule) => sum + rule.concessionRate, 0) / rules.length;
    (state.current.model.floors || []).forEach(floor => {
      if (!Number(floor.avgRent)) floor.avgRent = Number(avgRent.toFixed(1));
      if (!Number(floor.salesPerSqmMonth)) floor.salesPerSqmMonth = Number(avgSales.toFixed(0));
      if (!Number(floor.concessionRate)) floor.concessionRate = Number(avgRate.toFixed(4));
    });
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast(`已应用${preset.label}，请结合本地品牌和竞品调整`, 'success');
  }));
  document.querySelectorAll('[data-shop-mode]').forEach(btn => btn.addEventListener('click', () => {
    state.current.model.calculationMode = btn.dataset.shopMode;
    if (btn.dataset.shopMode === 'detailed') ensureFloorsFromShops(state.current.model);
    state.preview = null;
    state.dirty = true;
    renderWorkspace();
    scheduleLivePreview();
  }));
  document.getElementById('add-floor')?.addEventListener('click', () => {
    const floors = state.current.model.floors || (state.current.model.floors = []);
    const names = new Set(floors.map(item => item.name));
    let index = floors.length + 1;
    let name = `${index}F`;
    while (names.has(name)) { index += 1; name = `${index}F`; }
    floors.push({ name, buildingArea: 0, leasableArea: 0, avgRent: 0, salesPerSqmMonth: 0, concessionRate: 0 });
    state.dirty = true;
    renderWorkspace();
    scheduleLivePreview();
  });
  document.querySelectorAll('[data-remove-floor]').forEach(btn => btn.addEventListener('click', () => {
    state.current.model.floors.splice(Number(btn.dataset.removeFloor), 1);
    state.dirty = true;
    renderWorkspace();
    scheduleLivePreview();
  }));
  const fileInput = document.getElementById('shop-file');
  document.getElementById('choose-file')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => fileInput.files[0] && handleShopImport(fileInput.files[0]));
  document.getElementById('download-template')?.addEventListener('click', () => downloadFile('/api/templates/shop-import', '商业地产铺位导入模板.xlsx'));
  const zone = document.getElementById('import-zone');
  zone?.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragging'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone?.addEventListener('drop', event => {
    event.preventDefault(); zone.classList.remove('dragging');
    if (event.dataTransfer.files[0]) handleShopImport(event.dataTransfer.files[0]);
  });
  document.getElementById('add-shop')?.addEventListener('click', () => openAddShopModal());
  document.querySelectorAll('[data-edit-shop]').forEach(btn => btn.addEventListener('click', () => openAddShopModal(Number(btn.dataset.editShop))));
  document.getElementById('clear-shops')?.addEventListener('click', () => {
    if (!confirm('确定清空所有铺位数据吗？')) return;
    state.current.model.shops = []; state.dirty = true; state.preview = null; renderWorkspace(); scheduleLivePreview();
  });
  document.querySelectorAll('[data-delete-shop]').forEach(btn => btn.addEventListener('click', () => {
    state.current.model.shops = state.current.model.shops.filter(shop => shop.id !== btn.dataset.deleteShop);
    state.dirty = true; state.preview = null; renderWorkspace(); scheduleLivePreview();
  }));
  const shopSearch = document.getElementById('shop-search');
  const applyShopSearch = () => {
    state.shopSearch = shopSearch.value;
    state.shopPage = 1;
    const body = document.querySelector('.panel-body');
    if (body) { body.innerHTML = renderShopsStep(); bindStepInputs(); }
  };
  shopSearch?.addEventListener('change', applyShopSearch);
  shopSearch?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyShopSearch(); } });
  document.getElementById('shop-prev')?.addEventListener('click', () => { state.shopPage = Math.max(1, state.shopPage - 1); renderWorkspace(); });
  document.getElementById('shop-next')?.addEventListener('click', () => { state.shopPage += 1; renderWorkspace(); });
}

async function handleShopImport(file) {
  if (file.size > 20 * 1024 * 1024) return toast('文件不能超过20MB', 'error');
  setBusy(true);
  try {
    const contentBase64 = await fileToBase64(file);
    const payload = await api('/api/import-shops', { method: 'POST', body: { filename: file.name, contentBase64 } });
    state.current.model.calculationMode = 'detailed';
    state.current.model.shops = payload.shops || [];
    ensureFloorsFromShops(state.current.model);
    state.importWarnings = payload.warnings || [];
    state.importHints = payload.projectHints || {};
    applyImportHints(payload.projectHints || {});
    state.dirty = true;
    state.shopPage = 1;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast(`已导入 ${payload.shops?.length || 0} 个铺位`, 'success');
  } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyImportHints(hints) {
  const p = state.current.model.project;
  const projectHints = hints.project || {};
  const numeric = ['startYear', 'constructionYears', 'gbaOverride', 'landArea', 'landPrice', 'otherPreOpening', 'preOpeningMarketing'];
  for (const [key, value] of Object.entries(projectHints)) {
    if (value === null || value === undefined || value === '') continue;
    if (numeric.includes(key)) p[key] = Number(value) || 0;
    else if (p[key] === '' || p[key] === null || p[key] === undefined) p[key] = value;
  }
  if (Object.keys(projectHints).length) toast('已同步项目信息表中的基础字段', 'success');
}

function openAddShopModal(editIndex = null) {
  const m = state.current.model;
  const editing = Number.isInteger(editIndex) && editIndex >= 0 ? m.shops[editIndex] : null;
  const selectedConditions = new Set(editing?.conditions || []);
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <div class="modal-head"><div><h2>${editing ? '编辑铺位与位置条件' : '新增铺位'}</h2><p>铺位条件会影响单铺租金分配，可多选。</p></div><button class="modal-close" id="modal-close">×</button></div>
        <form id="add-shop-form">
          <div class="modal-body">
            <div class="form-grid two">
              <div class="field"><label>铺位号</label><input class="input" name="id" required placeholder="例如 A-101" value="${escapeHtml(editing?.id || '')}"></div>
              <div class="field"><label>楼层</label><input class="input" name="floor" list="floor-options" placeholder="例如 1F" value="${escapeHtml(editing?.floor || '')}"><datalist id="floor-options">${(m.floors || []).map(floor => `<option value="${escapeHtml(floor.name)}"></option>`).join('')}</datalist></div>
              <div class="field"><label>建筑面积（㎡）</label><input class="input" name="buildingArea" type="number" step="any" required value="${editing?.buildingArea ?? ''}"></div>
              <div class="field"><label>实际租赁面积（㎡）</label><input class="input" name="leasableArea" type="number" step="any" required value="${editing?.leasableArea ?? ''}"></div>
              <div class="field"><label>业态</label><select class="select" name="category">${(m.categories || []).map(c => `<option ${editing?.category === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
              <div class="field"><label>状态</label><select class="select" name="status">${['营业','未开业','停业'].map(status => `<option ${editing?.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
              <div class="field"><label>租金单价覆盖 <small>可选</small></label><input class="input" name="rentOverride" type="number" step="any" placeholder="留空则自动定价" value="${editing?.rentOverride ?? ''}"></div>
            </div>
            <div class="field"><label>铺位位置条件 <small>可多选</small></label><div class="condition-picker">${(m.conditionPremiums || []).filter(item => item.enabled).map(item => `<label><input type="checkbox" name="conditions" value="${escapeHtml(item.name)}" ${selectedConditions.has(item.name) ? 'checked' : ''}><span>${escapeHtml(item.name)} <em>+${fmtPct(item.premium, 1)}</em></span></label>`).join('')}</div></div>
          </div>
          <div class="modal-foot"><button type="button" class="btn btn-secondary" id="modal-cancel">取消</button><button type="submit" class="btn btn-primary">${editing ? '保存修改' : '添加铺位'}</button></div>
        </form>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-cancel').addEventListener('click', close);
  document.getElementById('add-shop-form').addEventListener('submit', event => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const nextShop = {
      id: String(f.get('id')).trim(), floor: String(f.get('floor')).trim(), buildingArea: Number(f.get('buildingArea')), leasableArea: Number(f.get('leasableArea')), category: f.get('category'), status: f.get('status'), rentOverride: f.get('rentOverride') ? Number(f.get('rentOverride')) : null, note: '',
      conditions: f.getAll('conditions'),
    };
    if (editing) state.current.model.shops[editIndex] = { ...editing, ...nextShop };
    else state.current.model.shops.push(nextShop);
    ensureFloorsFromShops(state.current.model);
    state.dirty = true;
    state.preview = null;
    close(); renderWorkspace(); scheduleLivePreview();
  });
}

function bindResultsActions() {
  document.getElementById('inline-calculate')?.addEventListener('click', saveProject);
  document.getElementById('export-excel')?.addEventListener('click', () => downloadFile(`/api/projects/${state.current.id}/export/xlsx`, `${state.current.model.project.name || '项目'}_投资测算.xlsx`));
  document.getElementById('export-ppt')?.addEventListener('click', () => downloadFile(`/api/projects/${state.current.id}/export/pptx`, `${state.current.model.project.name || '项目'}_投资汇报.pptx`));
}

async function saveProject() {
  if (!state.current) return;
  setBusy(true);
  try {
    const payload = await api(`/api/projects/${state.current.id}`, { method: 'PUT', body: { model: state.current.model } });
    state.current = { ...payload.project, model: payload.result?.model || payload.project.model };
    state.result = payload.result;
    state.preview = payload.result;
    state.dirty = false;
    state.step = 5;
    await loadProjects();
    renderWorkspace();
    toast('测算已更新', 'success');
  } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
}

function renderResultCharts() {
  if (!state.result) return;
  drawRevenueChart(document.getElementById('revenue-chart'), state.result.annual);
  drawDonut(document.getElementById('cost-donut'), state.result.investmentBreakdown);
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawRevenueChart(canvas, rows) {
  if (!canvas || !rows?.length) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const margin = { left: 54, right: 18, top: 20, bottom: 35 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const values = rows.flatMap(r => [r.revenue, r.noi]);
  let minY = Math.min(0, ...values);
  let maxY = Math.max(...values, 1);
  const pad = (maxY - minY) * 0.12 || 1;
  maxY += pad;
  if (minY < 0) minY -= pad;
  const x = i => margin.left + (rows.length <= 1 ? 0 : (i / (rows.length - 1)) * plotW);
  const y = v => margin.top + (maxY - v) / (maxY - minY) * plotH;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#e9e5dd';
  ctx.fillStyle = '#929a96';
  ctx.lineWidth = 1;
  ctx.font = '9px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = minY + (maxY - minY) * i / 4;
    const yy = y(value);
    ctx.beginPath(); ctx.moveTo(margin.left, yy); ctx.lineTo(width - margin.right, yy); ctx.stroke();
    ctx.fillText(formatAxis(value), margin.left - 8, yy + 3);
  }
  const series = [
    { key: 'revenue', color: '#1d6b57', fill: 'rgba(29,107,87,.10)' },
    { key: 'noi', color: '#d6a84b', fill: 'rgba(214,168,75,.08)' },
  ];
  for (const s of series) {
    ctx.beginPath();
    rows.forEach((row, i) => { const xx = x(i), yy = y(row[s.key]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(x(rows.length - 1), y(Math.max(0, minY))); ctx.lineTo(x(0), y(Math.max(0, minY))); ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#7f8985';
  rows.forEach((row, i) => {
    if (i === 0 || i === rows.length - 1 || (i + 1) % 5 === 0) ctx.fillText(`Y${row.opYear}`, x(i), height - 12);
  });
}

function formatAxis(v) {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}亿`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

function drawDonut(canvas, items) {
  if (!canvas || !items?.length) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const centerX = width / 2, centerY = height / 2, radius = Math.min(width, height) * 0.42, inner = radius * 0.64;
  const total = items.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  let start = -Math.PI / 2;
  ctx.clearRect(0, 0, width, height);
  items.forEach((item, i) => {
    const angle = Math.max(0, item.value) / total * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.arc(centerX, centerY, radius, start, start + angle); ctx.closePath();
    ctx.fillStyle = donutColor(i); ctx.fill();
    start += angle;
  });
  ctx.beginPath(); ctx.arc(centerX, centerY, inner, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.textAlign = 'center'; ctx.fillStyle = '#103b33'; ctx.font = '600 22px Arial';
  ctx.fillText(formatAxis(total), centerX, centerY - 2);
  ctx.fillStyle = '#7a8580'; ctx.font = '9px Arial'; ctx.fillText('万元', centerX, centerY + 15);
}

window.addEventListener('resize', () => {
  if (state.step === 5 && state.current) renderResultCharts();
});

boot();
