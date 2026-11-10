// Browser-side application backend for the public GitHub Pages edition.
// Demo remains browser-local; formal accounts and projects use Supabase.
const nativeFetch = window.fetch.bind(window);
const APIJSON = 'application/json; charset=utf-8';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const USERS_KEY = 'duoduo_static_users_v1';
const SESSION_PREFIX = 'local|';
const CLOUD_CONFIG = window.DUODUO_CLOUD_CONFIG || {};
const CLOUD_ENABLED = CLOUD_CONFIG.mode === 'cloud' && Boolean(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey);
const CLOUD_SESSION_KEY = 'duoduo_cloud_session_v1';
const DEMO_USER = { username: 'demo', displayName: '演示用户', passwordHash: 'sha256|cd6f2e06047d9e0e9a84ad4a9325dbec4fd1e5e6a17f0e94d5bf8892b7c9b80f' };

function setBootText(text) {
  const node = document.querySelector('.boot-text');
  if (node) node.textContent = text;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': APIJSON, 'Cache-Control': 'no-store' },
  });
}

function fileResponse(blob, filename, contentType) {
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  if (crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return 'sha256|' + [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return 'plain|' + btoa(unescape(encodeURIComponent(text)));
}

async function ensureUsers() {
  let users = readJSON(USERS_KEY, null);
  if (!users || typeof users !== 'object') {
    users = {};
    users.demo = { ...DEMO_USER, passwordHash: await sha256('demo1234') };
    writeJSON(USERS_KEY, users);
  }
  if (!users.demo) {
    users.demo = { ...DEMO_USER, passwordHash: await sha256('demo1234') };
    writeJSON(USERS_KEY, users);
  }
  return users;
}

function tokenFor(username) {
  return `${SESSION_PREFIX}${encodeURIComponent(username)}|${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
}

function usernameFromToken(token) {
  if (!token || !token.startsWith(SESSION_PREFIX)) return '';
  const rest = token.slice(SESSION_PREFIX.length);
  return decodeURIComponent(rest.split('|')[0] || '');
}

function authTokenFromRequest(init = {}) {
  const headers = new Headers(init.headers || {});
  const auth = headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return localStorage.getItem('cr_token') || '';
}

async function currentUser(init) {
  const token = authTokenFromRequest(init);
  const localUsername = usernameFromToken(token);
  if (localUsername) {
    const users = await ensureUsers();
    return users[localUsername] ? { username: localUsername, displayName: users[localUsername].displayName || localUsername, role: 'user', status: 'approved' } : null;
  }
  if (CLOUD_ENABLED) return cloudCurrentUser(init);
  return null;
}

function cloudSession() {
  return readJSON(CLOUD_SESSION_KEY, null);
}

function storeCloudSession(payload, existing = null) {
  const accessToken = payload.access_token || existing?.accessToken || '';
  const refreshToken = payload.refresh_token || existing?.refreshToken || '';
  const expiresIn = Number(payload.expires_in || 3600);
  const session = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
    userId: payload.user?.id || existing?.userId || '',
    email: payload.user?.email || existing?.email || '',
    username: existing?.username || '',
    displayName: existing?.displayName || '',
  };
  writeJSON(CLOUD_SESSION_KEY, session);
  localStorage.setItem('cr_token', accessToken);
  return session;
}

function clearCloudSession() {
  localStorage.removeItem(CLOUD_SESSION_KEY);
  localStorage.removeItem('cr_token');
  localStorage.removeItem('cr_user');
}

function cloudErrorMessage(payload, fallback = '云端服务请求失败') {
  return payload?.msg || payload?.message || payload?.error_description || payload?.error?.message ||
    (typeof payload?.error === 'string' ? payload.error : '') || payload?.details || payload?.hint || fallback;
}

async function cloudRequest(path, options = {}) {
  const token = options.token || CLOUD_CONFIG.anonKey;
  const headers = new Headers(options.headers || {});
  headers.set('apikey', CLOUD_CONFIG.anonKey);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(options.timeoutMs) || 25000);
  try {
    return await nativeFetch(`${CLOUD_CONFIG.url}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body == null ? undefined : (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)),
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    const timeout = error?.name === 'AbortError';
    const networkError = new Error(timeout
      ? '连接云端服务超时。请切换 Wi-Fi 或手机移动网络，关闭 VPN、代理和广告拦截后重试。'
      : '无法连接云端服务。请切换 Wi-Fi 或手机移动网络，关闭 VPN、代理和广告拦截后重试。');
    networkError.status = 503;
    networkError.code = timeout ? 'CLOUD_TIMEOUT' : 'CLOUD_NETWORK';
    networkError.cause = error;
    throw networkError;
  } finally {
    clearTimeout(timer);
  }
}

async function cloudJSON(path, options = {}) {
  const response = await cloudRequest(path, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }
  }
  if (!response.ok) {
    const error = new Error(cloudErrorMessage(payload, `云端服务错误（${response.status}）`));
    error.status = response.status;
    error.code = payload?.code || payload?.error_code || '';
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function usernameEmail(username) {
  const digest = await sha256(String(username).trim().toLowerCase());
  const hex = digest.replace(/^sha256\|/, '').slice(0, 32);
  return `u_${hex}@duoduo.app`;
}

let cloudRefreshPromise = null;

async function refreshCloudSession(force = false) {
  const session = cloudSession();
  if (!session) throw Object.assign(new Error('登录状态不存在，请重新登录'), { status: 401 });
  if (!force && session.accessToken && Number(session.expiresAt || 0) > Date.now()) return session.accessToken;
  if (!session.refreshToken) throw Object.assign(new Error('登录已过期，请重新登录'), { status: 401 });
  if (!cloudRefreshPromise) {
    cloudRefreshPromise = cloudJSON('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refreshToken },
      token: CLOUD_CONFIG.anonKey,
    }).then(payload => storeCloudSession(payload, session).accessToken).finally(() => {
      cloudRefreshPromise = null;
    });
  }
  return cloudRefreshPromise;
}

async function cloudAccessToken(forceRefresh = false) {
  const session = cloudSession();
  if (!session?.accessToken && !session?.refreshToken) {
    throw Object.assign(new Error('请先登录'), { status: 401 });
  }
  if (!forceRefresh && session.accessToken && Number(session.expiresAt || 0) > Date.now()) {
    return session.accessToken;
  }
  return refreshCloudSession(forceRefresh);
}

async function cloudProfileWithToken(token, userId) {
  if (!userId) throw Object.assign(new Error('登录信息不完整，请重新登录'), { status: 401 });
  const rows = await cloudJSON(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,username,display_name,status,role,created_at,approved_at,last_login_at`, { token });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function cloudCurrentUser(init = {}) {
  let token = await cloudAccessToken();
  let session = cloudSession();
  let profile = null;
  try {
    profile = await cloudProfileWithToken(token, session?.userId);
  } catch (error) {
    if (error.status !== 401) throw error;
    token = await cloudAccessToken(true);
    session = cloudSession();
    profile = await cloudProfileWithToken(token, session?.userId);
  }
  if (!profile) throw Object.assign(new Error('账号资料尚未建立，请联系管理员'), { status: 403 });
  if (profile.status !== 'approved') {
    const labels = { pending: '账号正在等待超级管理员审核', rejected: '账号审核未通过', disabled: '账号已被停用' };
    throw Object.assign(new Error(labels[profile.status] || '账号当前不可用'), { status: 403, accountStatus: profile.status });
  }
  const normalized = {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    role: profile.role || 'user',
    status: profile.status,
    isCloud: true,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at,
  };
  const current = cloudSession();
  if (current) writeJSON(CLOUD_SESSION_KEY, { ...current, username: normalized.username, displayName: normalized.displayName, userId: normalized.id });
  return normalized;
}

async function cloudSignOut() {
  const session = cloudSession();
  if (session?.accessToken) {
    try {
      await cloudRequest('/auth/v1/logout', { method: 'POST', token: session.accessToken });
    } catch {}
  }
  clearCloudSession();
}

function cloudProject(row) {
  return {
    id: row.id,
    userId: row.user_id,
    model: row.model || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function cloudRequireAdmin(init) {
  const user = await cloudCurrentUser(init);
  if (user.role !== 'super_admin') throw Object.assign(new Error('仅超级管理员可访问此功能'), { status: 403 });
  return user;
}

async function cloudProjectSummary(project) {
  try {
    const result = await calculate(project.model, false);
    return { ...project, summary: result.summary || {} };
  } catch {
    return { ...project, summary: {} };
  }
}

async function requestJSON(init) {
  const raw = init?.body;
  if (!raw) return {};
  if (typeof raw === 'string') return JSON.parse(raw);
  if (raw instanceof Blob) return JSON.parse(await raw.text());
  if (raw instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(raw));
  return {};
}

function projectKey(username) {
  return `duoduo_projects_v1_${username}`;
}

function getProjects(username) {
  const rows = readJSON(projectKey(username), []);
  return Array.isArray(rows) ? rows : [];
}

function saveProjects(username, rows) {
  writeJSON(projectKey(username), rows);
}

function isoNow() {
  return new Date().toISOString().slice(0, 19);
}

let pyodidePromise = null;

function loadPyodideEngine() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    try {
      setBootText('正在载入本地计算引擎…');
      const indexURL = new URL('./pyodide/', import.meta.url).href;
      // The service worker exposes the two large runtime files as one response
      // assembled from small same-origin parts. Wait until it controls this page
      // before Pyodide starts requesting its runtime.
      await window.__duoduoSWReady;
      const { loadPyodide } = await import(indexURL + 'pyodide.mjs');
      const pyodide = await loadPyodide({ indexURL });
      setBootText('正在初始化投资测算公式…');
      const engineCode = await (await nativeFetch(new URL('./engine.py?v=20261110-preopen1', import.meta.url))).text();
      pyodide.FS.writeFile('/home/pyodide/engine.py', engineCode);
      await pyodide.runPythonAsync(`
import json
import sys
sys.path.insert(0, '/home/pyodide')
import engine

def duo_default_model(name):
    return json.dumps(engine.default_model(name), ensure_ascii=False)

def duo_normalize_model(model_json):
    return json.dumps(engine.normalize_model(json.loads(model_json)), ensure_ascii=False)

def duo_calculate(model_json, include_sensitivity=True):
    return json.dumps(engine.calculate_model(json.loads(model_json), include_sensitivity=include_sensitivity), ensure_ascii=False)
`);
      window.__duoduoPyodide = pyodide;
      setBootText('正在载入工作台…');
      return pyodide;
    } catch (error) {
      console.error(error);
      setBootText('载入失败，请刷新后重试');
      throw error;
    }
  })().catch(error => {
    pyodidePromise = null;
    throw error;
  });
  return pyodidePromise;
}

let xlsxLibraryPromise = null;
let pptxLibraryPromise = null;

function loadVendorScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => window[globalName]
      ? resolve(window[globalName])
      : reject(new Error(`${globalName} 组件初始化失败`));
    script.onerror = () => reject(new Error(`${globalName} 组件加载失败，请检查网络后重试`));
    document.head.appendChild(script);
  });
}

function ensureXlsxLibrary() {
  if (!xlsxLibraryPromise) xlsxLibraryPromise = loadVendorScript(new URL('./vendor/xlsx.full.min.js', import.meta.url).href, 'XLSX');
  return xlsxLibraryPromise;
}

function ensurePptxLibrary() {
  if (!pptxLibraryPromise) pptxLibraryPromise = loadVendorScript(new URL('./vendor/pptxgen.bundle.js', import.meta.url).href, 'PptxGenJS');
  return pptxLibraryPromise;
}

// The application shell starts immediately. Calculation and export libraries
// are loaded only when a request actually needs them.
window.__duoduoBackendReady = Promise.resolve();

function pyCallJSON(expression, { model, includeSensitivity = true } = {}) {
  const py = window.__duoduoPyodide;
  if (!py) throw new Error('计算引擎尚未就绪');
  if (model !== undefined) py.globals.set('__duo_model_json', JSON.stringify(model));
  py.globals.set('__duo_include_sensitivity', Boolean(includeSensitivity));
  return JSON.parse(py.runPython(expression));
}

async function calculate(model, includeSensitivity = true) {
  return pyCallJSON('duo_calculate(__duo_model_json, __duo_include_sensitivity)', { model, includeSensitivity });
}

async function defaultModel(name) {
  const py = window.__duoduoPyodide;
  if (!py) throw new Error('计算引擎尚未就绪');
  py.globals.set('__duo_name', String(name || '未命名商业项目'));
  return JSON.parse(py.runPython('duo_default_model(__duo_name)'));
}

async function normalizeModel(model) {
  return pyCallJSON('duo_normalize_model(__duo_model_json)', { model });
}

function demoModel() {
  return {
    version: 1,
    calculationMode: 'preliminary',
    project: {
      name: '柳州沿江商业示例项目',
      location: '广西壮族自治区柳州市沿江东堤路',
      latitude: 24.341202,
      longitude: 109.430294,
      mapZoom: 15,
      locationSource: 'address',
      projectType: '购物中心',
      developmentType: 'new_build',
      rentAreaBasis: 'leasable',
      revenueModel: 'rent',
      startYear: 2027,
      constructionYears: 2,
      operationYears: 20,
      landArea: 7000,
      gbaOverride: 0,
      commonAreaFactor: 0.2,
      landPrice: 3000,
      otherPreOpening: 300,
      preOpeningMarketing: 500,
      contingencyRate: 0.05,
    },
    ownerRent: {
      enabled: false,
      leaseType: 'property',
      landPricingMode: 'total',
      landArea: 0,
      landUnitRent: 0,
      landMonthlyRent: 0,
      landPaymentMonths: 12,
      propertyPricingMode: 'total',
      propertyArea: 0,
      propertyUnitRent: 0,
      propertyMonthlyRent: 0,
      propertyPaymentMonths: 12,
      growthMode: 'compound',
      growthRate: 0.03,
      annualIncrease: 0,
      stepYears: 3,
    },
    floors: [
      { building: '1号楼', name: 'B1', rentAreaBasis: 'inherit', buildingArea: 4000, leasableArea: 3000, avgRent: 50, salesPerSqmMonth: 0, concessionRate: 0 },
      { building: '1号楼', name: '1F', rentAreaBasis: 'inherit', buildingArea: 4000, leasableArea: 3200, avgRent: 200, salesPerSqmMonth: 0, concessionRate: 0 },
      { building: '1号楼', name: '2F', rentAreaBasis: 'inherit', buildingArea: 4000, leasableArea: 3200, avgRent: 130, salesPerSqmMonth: 0, concessionRate: 0 },
      { building: '1号楼', name: '3F', rentAreaBasis: 'inherit', buildingArea: 4000, leasableArea: 3200, avgRent: 95, salesPerSqmMonth: 0, concessionRate: 0 },
      { building: '1号楼', name: '4F', rentAreaBasis: 'inherit', buildingArea: 2000, leasableArea: 1600, avgRent: 65, salesPerSqmMonth: 0, concessionRate: 0 },
    ],
    shops: [
      { id: 'B1-001', building: '1号楼', rentAreaBasis: 'inherit', buildingArea: 1800, leasableArea: 1450, floor: 'B1', category: '超市/主力店', status: '营业', rentOverride: 42, conditions: ['主入口'], note: '超市主力店' },
      { id: '1F-001', buildingArea: 120, leasableArea: 92, floor: '1F', category: '餐饮', status: '营业', rentOverride: 195, conditions: ['转角铺', '临街'], note: '咖啡烘焙' },
      { id: '1F-002', buildingArea: 88, leasableArea: 69, floor: '1F', category: '零售', status: '营业', rentOverride: 180, conditions: ['主入口'], note: '美妆集合店' },
      { id: '1F-003', buildingArea: 160, leasableArea: 126, floor: '1F', category: '零售', status: '空置', rentOverride: 150, conditions: ['电梯口'], note: '运动零售' },
      { id: '2F-001', buildingArea: 420, leasableArea: 336, floor: '2F', category: '餐饮', status: '营业', rentOverride: 110, conditions: ['中庭', '电梯口'], note: '社交餐饮' },
      { id: '2F-002', buildingArea: 95, leasableArea: 76, floor: '2F', category: '服务', status: '营业', rentOverride: 125, conditions: ['通道口'], note: '丽人服务' },
      { id: '3F-001', buildingArea: 280, leasableArea: 224, floor: '3F', category: '教培', status: '营业', rentOverride: 82, conditions: ['电梯口'], note: '儿童成长' },
      { id: '4F-001', buildingArea: 650, leasableArea: 520, floor: '4F', category: '娱乐', status: '营业', rentOverride: 58, conditions: ['电梯口'], note: '娱乐体验' },
    ],
    market: {
      radiusKm: 3,
      comparables: [
        { name: '城中商圈购物中心样本', address: '柳州市城中区', floor: '1F', category: '零售', leasableArea: 120, rent: 138, date: '2026-09', distanceKm: 1.8, note: '演示样本，请替换为实地调研数据' },
        { name: '沿江街区餐饮样本', address: '柳州市城中区', floor: '1F', category: '餐饮', leasableArea: 95, rent: 165, date: '2026-09', distanceKm: 2.1, note: '演示样本，请替换为实地调研数据' },
        { name: '社区商业超市样本', address: '柳州市柳北区', floor: 'B1', category: '超市/主力店', leasableArea: 1500, rent: 45, date: '2026-09', distanceKm: 3.2, note: '演示样本，请替换为实地调研数据' },
        { name: '区域购物中心二层样本', address: '柳州市城中区', floor: '2F', category: '零售', leasableArea: 110, rent: 92, date: '2026-09', distanceKm: 2.4, note: '演示样本，请替换为实地调研数据' },
      ],
    },
    costs: {
      preconstructionRate: 260,
      constructionRate: 3900,
      municipalFeeRate: 0,
      civilDefenseFeeRate: 0,
      otherPublicFeeRate: 0,
      fitoutRate: 1250,
      equipmentRate: 680,
      otherEngineeringRate: 180,
      workingCapitalRate: 0.03,
    },
    revenues: { propertyFee: 20, otherIncomeRatio: 0.05, parkingSpaces: 480, parkingMonthly: 320 },
    operations: {
      rentGrowth: 0.03, occupancyY1: 0.72, occupancyY2: 0.86, stableOccupancy: 0.94, stableYear: 3,
      rentFreeMonths: 3, collectionRate: 0.98, renewalCycle: 3, commissionMonths: 1, renewalCommissionMonths: 0.5,
      depositMonths: 3, propertyOpsCost: 10, energyCost: 4.5, staffCostPerSqm: 11, adminCostPerSqm: 2,
      marketingRate: 0.02, repairRate: 0.01, insuranceRate: 0.0015, capexRate: 0.02, otherOpexRate: 0.005,
      salesGrowth: 0.03, rampY1: 0.8, rampY2: 0.9,
    },
    taxes: {
      vatRent: 0.09, vatProperty: 0.06, vatOther: 0.06, vatConcession: 0.06, inputVatShare: 0.6, inputVatRate: 0.06,
      cityTax: 0.07, educationSurcharge: 0.03, localEducationSurcharge: 0.02, propertyTaxMethod: 'rent',
      propertyTaxRateRent: 0.12, propertyTaxRateValue: 0.012, propertyValueDeduction: 0.3, landUseTax: 0,
      stampDuty: 0.001, localFundRate: 0, corporateTax: 0.25, deedTax: 0.03, exitTaxRate: 0,
    },
    finance: { debtRatio: 0.5, loanRate: 0.045, loanTerm: 15, graceYears: 1 },
    valuation: { discountRate: 0.08, exitCapRate: 0.06, includeExit: true },
  };
}

async function ensureDemoProject(username) {
  if (username !== 'demo') return;
  const rows = getProjects(username);
  if (rows.length) return;
  const model = await normalizeModel(demoModel());
  const now = isoNow();
  saveProjects(username, [{
    id: crypto.randomUUID(),
    model,
    createdAt: now,
    updatedAt: now,
  }]);
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim().replace(/[,，]/g, '').replace(/[−–—]/g, '-');
  const match = text.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = safeNumber(value);
  return Number.isFinite(n) ? n : null;
}

function roundArea(value) {
  const number = safeNumber(value);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function normalizeHeader(value) {
  return String(value ?? '').toLowerCase().replace(/[\s_\-—:：()（）[\]【】,，.。/\\]/g, '');
}

function matchesAlias(value, aliases) {
  const normalized = normalizeHeader(value);
  return Boolean(normalized) && aliases.some(alias => {
    const a = normalizeHeader(alias);
    return normalized === a || normalized.startsWith(a);
  });
}

const SHOP_ALIASES = {
  id: ['铺位号', '商铺号', '商铺编号', '铺位编号', '店铺号', '铺号', '编号', 'shopid', 'id'],
  building: ['楼栋', '楼号', 'building', 'buildingname'],
  buildingArea: ['建筑面积', '建筑面', 'grossarea'],
  leasableArea: ['实际租赁面积', '租赁面积', '可租赁面积', '实用面积', '套内面积', '计租面积', 'leasablearea'],
  floor: ['楼层', '所在楼层', 'floor'],
  rentAreaBasis: ['租金核算面积口径', '租金面积口径', '计租口径', '面积口径', 'rentareabasis'],
  category: ['业态', '经营业态', 'category'],
  status: ['状态', '经营状态', 'status'],
  rentOverride: [
    '租金单价覆盖', '租金单价', '月租金单价', '合同租金单价', '合同租金', '租金标准', '租金水平',
    '保底租金单价', '保底租金', '平均租金', '合同月租金单价', '租金元㎡月', 'rentoverride', 'rent'
  ],
  conditions: ['铺位条件', '位置条件', '条件', 'conditions'],
  propertyFeeOverride: ['物业管理费单价覆盖', '物业管理费覆盖', '物业费单价覆盖', '物业费单价'],
  commercialManagementFeeOverride: ['商业管理费单价覆盖', '商业管理费覆盖', '商管费单价覆盖', '商管费单价'],
  centralAcFeeOverride: ['中央空调费单价覆盖', '中央空调使用费单价覆盖', '中央空调费覆盖', '中央空调单价', '空调费单价'],
  note: ['备注', '说明', 'note'],
};

function normalizeRentAreaBasis(value, fallback = 'inherit') {
  const text = String(value ?? '').trim();
  if (/建筑/.test(text)) return 'building';
  if (/实用|套内|租赁/.test(text)) return 'leasable';
  return fallback;
}

const CN_DIGITS = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

function chineseNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  if (text === '十') return 10;
  if (/^十[一二三四五六七八九]$/.test(text)) return 10 + CN_DIGITS[text[1]];
  if (/^[一二三四五六七八九]十$/.test(text)) return CN_DIGITS[text[0]] * 10;
  if (/^[一二三四五六七八九]十[一二三四五六七八九]$/.test(text)) return CN_DIGITS[text[0]] * 10 + CN_DIGITS[text[2]];
  return CN_DIGITS[text] ?? null;
}

function normalizeBuildingName(value) {
  let text = String(value ?? '').trim().replace(/（/g, '(').replace(/）/g, ')');
  if (!text) return '1号楼';
  if (/^\d+$/.test(text)) return `${Number(text)}号楼`;
  if (/^[一二三四五六七八九十]+$/.test(text)) {
    const n = chineseNumber(text);
    return n == null ? text : `${n}号楼`;
  }
  text = text.replace(/^([一二三四五六七八九十]+)(号楼|栋|座)$/, (_, num, suffix) => {
    const n = chineseNumber(num);
    return `${n == null ? num : n}${suffix === '号楼' ? '号楼' : '号楼'}`;
  });
  text = text.replace(/^([A-Za-z0-9]+)(栋|座)$/, '$1号楼');
  return text;
}

function normalizeFloorName(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, '').replace(/Ｆ/gi, 'F');
  if (!text) return '';
  const upper = text.toUpperCase();
  if (/^B\d+$/.test(upper)) return upper;
  const basement = upper.match(/^(?:负|地下|-)([0-9一二三四五六七八九十]+)(?:层|楼)?$/);
  if (basement) {
    const n = chineseNumber(basement[1]);
    return n == null ? text : `B${n}`;
  }
  if (/^(?:首层|一层)$/.test(text)) return '1F';
  const floor = text.match(/^([0-9一二三四五六七八九十]+)(?:层|楼|F)$/i);
  if (floor) {
    const n = chineseNumber(floor[1]);
    return n == null ? text : `${n}F`;
  }
  const prefixed = upper.match(/^(?:F|L)(\d+)$/);
  if (prefixed) return `${Number(prefixed[1])}F`;
  return upper.replace(/^(\d+)$/, '$1F');
}

function splitBuildingFloor(buildingValue, floorValue) {
  let building = String(buildingValue ?? '').trim();
  let floor = String(floorValue ?? '').trim();
  const combined = `${building} ${floor}`.trim();
  const match = combined.match(/([A-Za-z0-9一二三四五六七八九十]+(?:号楼|栋|座|楼))[\s\-—_]*(负[0-9一二三四五六七八九十]+层|地下[0-9一二三四五六七八九十]+层|B\d+|(?:\d+|[一二三四五六七八九十]+)(?:层|楼|F)|F\d+|L\d+|首层|M层)/i);
  if (match) {
    building = match[1];
    floor = match[2];
  }
  return { building: normalizeBuildingName(building), floor: normalizeFloorName(floor) };
}

const MARKET_ALIASES = {
  name: ['样本名称', '项目名称', '竞品名称', '商场名称', 'name'],
  address: ['地址', '项目地址', '竞品地址', 'address'],
  floor: ['楼层', '所在楼层', 'floor'],
  category: ['业态', '经营业态', 'category'],
  leasableArea: ['可租赁面积', '租赁面积', '建筑面积', '面积', 'leasablearea'],
  rent: ['月租金单价', '租金单价', '租金元㎡月', 'rent'],
  date: ['数据日期', '调研日期', 'date'],
  distanceKm: ['距项目km', '距离km', '距项目距离', 'distancekm', 'distance'],
  note: ['备注', '说明', 'note'],
};

function findHeaderRow(rows, aliases, requiredKeys) {
  for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i] || [];
    const found = requiredKeys.every(key => row.some(cell => matchesAlias(cell, aliases[key])));
    if (found) return i;
  }
  return -1;
}

function headerIndexes(row, aliases) {
  const result = {};
  for (const [key, values] of Object.entries(aliases)) {
    const exactAliases = new Set(values.map(value => normalizeHeader(value)));
    let idx = row.findIndex(cell => exactAliases.has(normalizeHeader(cell)));
    if (idx < 0) idx = row.findIndex(cell => matchesAlias(cell, values));
    if (idx >= 0) result[key] = idx;
  }
  return result;
}

function rowValue(row, indexes, key) {
  const idx = indexes[key];
  return idx === undefined || idx >= row.length ? '' : row[idx];
}

function splitConditions(value) {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean);
  return String(value || '').split(/[、,，/|]+/).map(x => x.trim()).filter(Boolean);
}

function parseYesNo(value, fallback = null) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  if (/^(是|收|收取|启用|有|yes|y|true|1)$/i.test(text)) return true;
  if (/^(否|不收|不收取|停用|无|no|n|false|0)$/i.test(text)) return false;
  if (/不收|免收|不启用|否/.test(text)) return false;
  if (/收取|启用|是/.test(text)) return true;
  return fallback;
}

function parseCentralAcBuildingConfigs(workbook) {
  const sheetName = workbook.SheetNames.find(name => name.includes('楼栋收费'));
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
  const headerIdx = rows.findIndex(row => row.some(cell => /^楼栋$|楼号|building/i.test(String(cell || ''))) && row.some(cell => /空调/.test(String(cell || ''))));
  if (headerIdx < 0) return [];
  const buildingAliases = ['楼栋', '楼号', 'building'];
  const enabledAliases = ['是否收取中央空调费', '是否收取空调费', '中央空调收费', '是否收费'];
  const feeAliases = ['中央空调费单价', '中央空调使用费单价', '空调费单价', 'centralacfee'];
  const indexes = headerIndexes(rows[headerIdx], { building: buildingAliases, enabled: enabledAliases, fee: feeAliases });
  const configs = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const building = normalizeBuildingName(rowValue(row, indexes, 'building'));
    const rawBuilding = String(rowValue(row, indexes, 'building') || '').trim();
    if (!rawBuilding) continue;
    const fee = Math.max(0, optionalNumber(rowValue(row, indexes, 'fee')) || 0);
    const enabled = parseYesNo(rowValue(row, indexes, 'enabled'), fee > 0);
    configs.push({ building, enabled: Boolean(enabled && fee > 0), fee });
  }
  return configs;
}

function parseRentOverride(value, header, fallbackArea = 0) {
  const price = optionalNumber(value);
  if (price === null) return null;
  let normalizedPrice = price;
  const normalized = normalizeHeader(header);
  const areaUnit = /㎡|平方米|平米|平方/.test(String(header || ''));
  if (areaUnit && /万元/.test(String(header || ''))) normalizedPrice *= 10000;
  if (areaUnit && /天/.test(normalized)) normalizedPrice *= 30.4;
  if (areaUnit && /年/.test(normalized)) normalizedPrice /= 12;
  const isRentTotal = /总额|合计/.test(normalized) || (!areaUnit && /月租金/.test(normalized) && !/单价|标准|水平/.test(normalized));
  if (isRentTotal && fallbackArea > 0) normalizedPrice /= fallbackArea;
  return Number.isFinite(normalizedPrice) ? Math.round(normalizedPrice * 10000) / 10000 : null;
}

function sheetRows(workbook, preferredNames = []) {
  const sheets = workbook.SheetNames.map(name => ({ name, sheet: workbook.Sheets[name] }));
  sheets.sort((a, b) => {
    const ai = preferredNames.some(key => a.name.includes(key)) ? 0 : 1;
    const bi = preferredNames.some(key => b.name.includes(key)) ? 0 : 1;
    return ai - bi;
  });
  for (const { name, sheet } of sheets) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length) return { name, rows };
  }
  return { name: '', rows: [] };
}

function findShopSheet(workbook) {
  const candidates = workbook.SheetNames.map((name, order) => {
    const sheet = workbook.Sheets[name];
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) : [];
    const headerIdx = findHeaderRow(rows, SHOP_ALIASES, ['id', 'buildingArea', 'leasableArea']);
    return { name, rows, headerIdx, order };
  }).filter(item => item.headerIdx >= 0);
  candidates.sort((a, b) => {
    const aPreferred = ['商铺', '铺位', '一铺一价', '明细', '价格'].some(key => a.name.includes(key)) ? 0 : 1;
    const bPreferred = ['商铺', '铺位', '一铺一价', '明细', '价格'].some(key => b.name.includes(key)) ? 0 : 1;
    return aPreferred - bPreferred || a.headerIdx - b.headerIdx || a.order - b.order;
  });
  return candidates[0] || null;
}

function readWorkbook(base64, filename) {
  const clean = String(base64 || '').split(',').pop();
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (filename.toLowerCase().endsWith('.csv')) {
    let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');
    if (text.includes('�')) {
      try { text = new TextDecoder('gb18030').decode(bytes); } catch {}
    }
    return XLSX.read(text, { type: 'string', raw: false });
  }
  return XLSX.read(bytes, { type: 'array', cellDates: true, raw: false });
}

function parseShopWorkbook(base64, filename) {
  if (filename.toLowerCase().endsWith('.xls')) throw new Error('暂不支持旧版.xls，请在 Excel 中另存为.xlsx');
  if (!/\.(xlsx|xlsm|csv)$/i.test(filename)) throw new Error('仅支持.xlsx、.xlsm、.csv文件');
  const wb = readWorkbook(base64, filename);
  const matchedSheet = findShopSheet(wb);
  if (!matchedSheet) throw new Error(`工作簿中未找到“铺位号、建筑面积、实际租赁面积”列。已检查工作表：${wb.SheetNames.join('、')}`);
  const { name, rows, headerIdx } = matchedSheet;
  const indexes = headerIndexes(rows[headerIdx], SHOP_ALIASES);
  const rentHeader = rowValue(rows[headerIdx], indexes, 'rentOverride');
  const shops = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const id = String(rowValue(row, indexes, 'id') || '').trim();
    const buildingArea = roundArea(rowValue(row, indexes, 'buildingArea'));
    const leasableArea = roundArea(rowValue(row, indexes, 'leasableArea'));
    if (!id && buildingArea <= 0 && leasableArea <= 0) continue;
    const normalizedLocation = splitBuildingFloor(
      rowValue(row, indexes, 'building'),
      rowValue(row, indexes, 'floor'),
    );
    const rentAreaBasis = normalizeRentAreaBasis(rowValue(row, indexes, 'rentAreaBasis'), 'inherit');
    const fallbackRentArea = rentAreaBasis === 'building' ? buildingArea : (leasableArea || buildingArea);
    shops.push({
      id,
      building: normalizedLocation.building,
      buildingArea,
      leasableArea,
      floor: normalizedLocation.floor,
      rentAreaBasis,
      category: String(rowValue(row, indexes, 'category') || '零售').trim(),
      status: String(rowValue(row, indexes, 'status') || '营业').trim(),
      rentOverride: parseRentOverride(rowValue(row, indexes, 'rentOverride'), rentHeader, fallbackRentArea),
      propertyFeeOverride: optionalNumber(rowValue(row, indexes, 'propertyFeeOverride')),
      commercialManagementFeeOverride: optionalNumber(rowValue(row, indexes, 'commercialManagementFeeOverride')),
      centralAcFeeOverride: optionalNumber(rowValue(row, indexes, 'centralAcFeeOverride')),
      conditions: splitConditions(rowValue(row, indexes, 'conditions')),
      note: String(rowValue(row, indexes, 'note') || '').trim(),
    });
  }
  const projectHints = { project: {}, revenues: {}, centralAcBuildings: parseCentralAcBuildingConfigs(wb) };
  const projectSheetName = wb.SheetNames.find(name => name === '项目信息') || wb.SheetNames.find(name => name.includes('项目'));
  if (projectSheetName) {
    const projectRows = XLSX.utils.sheet_to_json(wb.Sheets[projectSheetName], { header: 1, raw: false, defval: '' });
    const numericProjectFields = new Set(['startYear', 'constructionYears', 'gbaOverride', 'landArea', 'landPrice', 'otherPreOpening', 'preOpeningMarketing']);
    for (const row of projectRows) {
      const rawLabel = String(row?.[0] || '').trim();
      const value = row?.[1];
      if (!rawLabel || value === null || value === undefined || value === '') continue;
      if (/项目名称/.test(rawLabel)) projectHints.project.name = String(value).trim();
      else if (/项目位置|项目地址/.test(rawLabel)) projectHints.project.location = String(value).trim();
      else if (/商业项目形态|项目形态/.test(rawLabel)) projectHints.project.projectType = String(value).trim();
      else if (/租金核算面积口径|租金面积口径|计租口径/.test(rawLabel)) projectHints.project.rentAreaBasis = normalizeRentAreaBasis(value, 'leasable');
      else if (/项目开发状态/.test(rawLabel)) {
        const text = String(value);
        projectHints.project.developmentType = /旧改|存量|改造/.test(text) ? 'renovation' : /运营中/.test(text) ? 'operating' : /轻资产/.test(text) ? 'light_asset' : 'new_build';
      }
      else if (/起始年份/.test(rawLabel)) projectHints.project.startYear = safeNumber(value);
      else if (/建设期/.test(rawLabel)) projectHints.project.constructionYears = safeNumber(value);
      else if (/^总建筑面积/.test(rawLabel)) projectHints.project.gbaOverride = roundArea(value);
      else if (/占地面积/.test(rawLabel)) projectHints.project.landArea = roundArea(value);
      else if (/土地价款/.test(rawLabel)) projectHints.project.landPrice = safeNumber(value);
      else if (/其他前期费用/.test(rawLabel)) projectHints.project.otherPreOpening = safeNumber(value);
      else if (/筹备期营销费用/.test(rawLabel)) projectHints.project.preOpeningMarketing = safeNumber(value);
      else if (/物业管理费单价|物业费单价/.test(rawLabel)) projectHints.revenues.propertyFee = Math.max(0, safeNumber(value));
      else if (/商业管理费单价|商管费单价/.test(rawLabel)) projectHints.revenues.commercialManagementFee = Math.max(0, safeNumber(value));
      else if (/默认中央空调.*单价|中央空调.*单价|空调费单价/.test(rawLabel)) projectHints.revenues.centralAcFee = Math.max(0, safeNumber(value));
    }
    for (const key of Object.keys(projectHints.project)) {
      if (numericProjectFields.has(key) && !Number.isFinite(Number(projectHints.project[key]))) delete projectHints.project[key];
    }
  }
  const warnings = shopWarnings(shops);
  const rentRecognizedCount = shops.filter(shop => shop.rentOverride !== null && shop.rentOverride > 0).length;
  const rentMissingCount = Math.max(0, shops.length - rentRecognizedCount);
  const propertyFeeOverrideCount = shops.filter(shop => shop.propertyFeeOverride !== null).length;
  const commercialManagementFeeOverrideCount = shops.filter(shop => shop.commercialManagementFeeOverride !== null).length;
  const centralAcFeeOverrideCount = shops.filter(shop => shop.centralAcFeeOverride !== null).length;
  if (indexes.rentOverride === undefined) {
    warnings.unshift('未识别到租金单价列。请使用“租金单价”“月租金单价”“租金标准”或“合同租金单价”等表头。');
  } else if (rentRecognizedCount === 0) {
    warnings.unshift(`已识别租金列“${String(rentHeader).trim()}”，但所有铺位的租金值均为空或不是有效数字。`);
  } else {
    warnings.unshift(`已识别 ${rentRecognizedCount} 个铺位的租金单价${rentMissingCount ? `；另有 ${rentMissingCount} 个铺位未填写，将按楼层和业态自动定价` : ''}。`);
  }
  return {
    shops,
    warnings,
    sheet: name,
    rowsRead: Math.max(0, rows.length - headerIdx - 1),
    projectHints,
    rentColumn: indexes.rentOverride === undefined ? '' : String(rentHeader).trim(),
    rentRecognizedCount,
    rentMissingCount,
    propertyFeeOverrideCount,
    commercialManagementFeeOverrideCount,
    centralAcFeeOverrideCount,
  };
}

function shopWarnings(shops) {
  const warnings = [];
  const counts = {};
  for (const shop of shops) if (shop.id) {
    const key = `${shop.building || '1号楼'}||${shop.id}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const duplicates = Object.entries(counts).filter(([, n]) => n > 1).map(([key]) => key.replace('||', ' / '));
  if (duplicates.length) warnings.push(`发现重复铺位号：${duplicates.slice(0, 8).join(', ')}`);
  const missingArea = shops.filter(s => safeNumber(s.buildingArea) <= 0).length;
  if (missingArea) warnings.push(`${missingArea}个铺位缺少建筑面积`);
  const missingLease = shops.filter(s => safeNumber(s.leasableArea) <= 0).length;
  if (missingLease) warnings.push(`${missingLease}个铺位缺少实际租赁面积`);
  const missingFloor = shops.filter(shop => !shop.floor).length;
  if (missingFloor) warnings.push(`${missingFloor}个铺位缺少可识别的楼层，请填写1F、2F、B1或“一楼”等格式`);
  const invalidArea = shops.filter(s => safeNumber(s.leasableArea) > safeNumber(s.buildingArea) && safeNumber(s.buildingArea) > 0).length;
  if (invalidArea) warnings.push(`${invalidArea}个铺位实际租赁面积大于建筑面积`);
  return warnings;
}

function parseMarketWorkbook(base64, filename) {
  if (!/\.(xlsx|xlsm|csv)$/i.test(filename)) throw new Error('仅支持.xlsx、.xlsm、.csv');
  const wb = readWorkbook(base64, filename);
  const { rows } = sheetRows(wb);
  const headerIdx = findHeaderRow(rows, MARKET_ALIASES, ['name', 'rent']);
  if (headerIdx < 0) throw new Error('未找到竞品名称和月租金单价列');
  const indexes = headerIndexes(rows[headerIdx], MARKET_ALIASES);
  const comparables = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const name = String(rowValue(row, indexes, 'name') || '').trim();
    const address = String(rowValue(row, indexes, 'address') || '').trim();
    const rent = safeNumber(rowValue(row, indexes, 'rent'));
    if (!name && !address && rent <= 0) continue;
    comparables.push({
      name: name || address || '未命名样本',
      address,
      floor: String(rowValue(row, indexes, 'floor') || '').trim(),
      category: String(rowValue(row, indexes, 'category') || '零售').trim(),
      leasableArea: roundArea(rowValue(row, indexes, 'leasableArea')),
      rent,
      date: String(rowValue(row, indexes, 'date') || '').trim(),
      distanceKm: optionalNumber(rowValue(row, indexes, 'distanceKm')),
      note: String(rowValue(row, indexes, 'note') || '').trim(),
    });
  }
  const warnings = [];
  if (!comparables.length) warnings.push('未读取到有效竞品样本');
  const noRent = comparables.filter(x => safeNumber(x.rent) <= 0).length;
  if (noRent) warnings.push(`${noRent}条样本缺少月租金单价`);
  const noArea = comparables.filter(x => safeNumber(x.leasableArea) <= 0).length;
  if (noArea) warnings.push(`${noArea}条样本缺少可租赁面积，租金均值将按样本简单平均`);
  return { comparables, warnings };
}

function workbookBlob(wb) {
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
  return new Blob([bytes], { type: XLSX_MIME });
}

function addSheet(wb, name, rows, widths = []) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let column = range.s.c; column <= range.e.c; column++) {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: column })];
        if (cell && cell.t === 'n' && !cell.z) cell.z = Number.isInteger(cell.v) ? '0' : '0.00';
      }
    }
  }
  if (widths.length) ws['!cols'] = widths.map(wch => ({ wch }));
  wb.SheetNames.push(name);
  wb.Sheets[name] = ws;
  return ws;
}

function setSheetColumnNumberFormat(ws, zeroBasedColumns, format = '0.00') {
  if (!ws?.['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (const column of zeroBasedColumns) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (ws[address] && typeof ws[address].v === 'number') ws[address].z = format;
    }
  }
}

function shopTemplate() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, '项目信息', [
    ['商业地产项目信息'],
    ['只需填写“填写值”列；未填写的内容可在网页向导中补充。'],
    ['参数', '填写值', '说明'],
    ['项目名称', '', '项目正式名称'],
    ['项目位置', '广西壮族自治区', '省/市/城区，例如：广西壮族自治区柳州市'],
    ['项目开发状态', '新建项目', '新建项目/旧改项目/运营中项目/轻资产运营项目'],
    ['商业项目形态', '购物中心', '购物中心/街区商业/社区商业等'],
    ['租金核算面积口径', '实用面积（套内/租赁面积）', '可填写：实用面积（套内/租赁面积）或建筑面积'],
    ['首年物业管理费单价（元/㎡/月）', 18, '物业管理服务费，默认适用于全部铺位'],
    ['首年商业管理费单价（元/㎡/月）', 0, '商业运营管理服务费，如项目不收可填0'],
    ['默认中央空调使用费单价（元/㎡/月）', 0, '作为楼栋收费配置的参考单价；实际是否收取在“楼栋收费设置”表开启'],
    ['起始年份', 2027, '建设第1年'],
    ['建设期', 2, '年'],
    ['总建筑面积', '', '㎡；可留空，由商铺建筑面积反推'],
    ['占地面积', '', '㎡；用于城镇土地使用税'],
    ['土地价款', '', '万元'],
    ['其他前期费用', '', '万元'],
    ['筹备期营销费用', '', '万元'],
  ], [24, 32, 44]);
  addSheet(wb, '楼栋收费设置', [
    ['楼栋中央空调收费设置'],
    ['只对实际提供中央空调并向租户收费的楼栋填写“是”；不收取的楼栋填“否”，单价填0。物业费和商业管理费默认全项目统一，可在商铺明细中用覆盖单价单独调整。'],
    [],
    ['楼栋', '是否收取中央空调费', '中央空调费单价（元/㎡/月）', '说明'],
    ['1号楼', '否', 0, '示例行，请按项目实际情况修改；填写“是”并填单价后该楼栋才计收空调费'],
    ['2号楼', '否', 0, '示例行，可删除'],
  ], [18, 26, 30, 68]);
  const rows = [
    ['商铺明细导入表'],
    ['填写顺序：楼栋 → 楼层 → 铺位号 → 建筑面积 → 实用面积 → 计租口径 → 租金单价。面积保留两位小数；请从第5行开始录入，不要移动表头。后三列收费覆盖仅在个别铺位不同于项目/楼栋标准时填写。'],
    [],
    ['楼栋', '楼层', '铺位号', '建筑面积（㎡）', '实用面积/套内面积（㎡）', '租金核算面积口径', '业态', '状态', '租金单价（元/㎡/月）', '物业管理费覆盖（元/㎡/月）', '商业管理费覆盖（元/㎡/月）', '中央空调费覆盖（元/㎡/月）', '铺位条件', '备注'],
    ['1号楼', '1F', 'A-101', 120.00, 90.00, '实用面积', '零售', '营业', '', '', '', '', '电梯口、转角铺', '示例行，可删除'],
  ];
  const shopWs = addSheet(wb, '商铺明细', rows, [14, 10, 16, 18, 22, 20, 16, 12, 24, 24, 24, 24, 24, 28]);
  setSheetColumnNumberFormat(shopWs, [3, 4, 8, 9, 10, 11], '0.00');
  addSheet(wb, '楼栋楼层填写说明', [
    ['楼栋与楼层填写规范'],
    ['推荐写法', '说明'],
    ['1号楼', '楼栋名称。也可填写“1栋”“A栋”“商业中心主楼”等，系统会按原文保留。'],
    ['B1 / 1F / 2F / 3F', '楼层推荐统一写成地下B1、地上1F、2F。也可填写“负一层”“一楼”“2层”，导入时会自动标准化。'],
    ['1号楼1F', '如果只在一个单元格内填写楼栋和楼层，系统会尝试自动拆分。'],
    ['计租口径', '可选：继承项目、建筑面积、实用面积。建议每行明确填写，避免混用口径。'],
    ['租金单价', '可直接填写“租金单价”“月租金单价”“合同租金单价”“保底租金”等表头。系统按元/㎡/月识别；元/㎡/天自动×30.4，元/㎡/年自动÷12，并自动计算铺位和楼层收入。'],
    ['物业管理费', '项目信息表填写全项目默认单价；个别铺位不同时，在商铺明细“物业管理费覆盖”列填写。覆盖值优先于项目默认值。'],
    ['商业管理费', '项目信息表填写全项目默认单价；个别铺位不同时，在商铺明细“商业管理费覆盖”列填写。覆盖值优先于项目默认值。'],
    ['中央空调费', '先在“楼栋收费设置”表选择楼栋“是”并填写单价；个别铺位不同时，可在商铺明细“中央空调费覆盖”列填写，填0表示该铺位不收取。'],
    ['面积精度', '建筑面积、实用面积及三项收费单价自动四舍五入保留两位小数。'],
    [''], ['楼栋楼层示例字典'],
    ['楼栋', '楼层'],
    ['1号楼', 'B1'], ['1号楼', '1F'], ['1号楼', '2F'], ['1号楼', '3F'],
    ['2号楼', 'B1'], ['2号楼', '1F'], ['2号楼', '2F'],
  ], [22, 78]);
  return wb;
}

function marketTemplate() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, '竞品租金样本', [
    ['竞品租金调研导入表'],
    ['建议填写3–5公里内的同类商业项目；月租金单位：元/㎡/月。'],
    [],
    ['样本名称', '地址', '楼层', '业态', '可租赁面积（㎡）', '月租金单价（元/㎡/月）', '数据日期', '距项目（km）', '备注'],
    ['示例购物中心', '柳州市城中区', '1F', '零售', 120, 138, '2026-09', 1.8, '示例行，可删除'],
  ], [24, 32, 10, 16, 18, 22, 14, 14, 28]);
  return wb;
}


const EXPORT_FUNCTIONS = {
  'IF': { syntax: 'IF(条件,成立值,不成立值)', meaning: '条件判断，根据条件选择不同计算路径。', example: 'IF(运营年=1,首年出租率,稳定期出租率)', note: '调整出租率、计租方式、退出方法和还款方式时重点检查。' },
  'SUM': { syntax: 'SUM(数值1,数值2,…)', meaning: '汇总多个分项金额。', example: '项目总投资=SUM(土地,工程,装修,预备费,开办费,流动资金)', note: '新增费用时确认是否已纳入汇总。' },
  'MAX': { syntax: 'MAX(数值1,数值2,…)', meaning: '取最大值，用于保底取高和零值下限。', example: 'MAX(保底租金,联营扣点)', note: '取高模式不会重复计算保底与扣点。' },
  'MIN': { syntax: 'MIN(数值1,数值2,…)', meaning: '取最小值，用于抵扣上限和溢价封顶。', example: 'MIN(销项税,可抵扣进项税)', note: '上限设置应依据税法和招商政策。' },
  'POWER': { syntax: 'POWER(底数,指数)', meaning: '乘幂，用于复利增长和折现。', example: '(1+租金增长率)^运营年', note: '复利前低后高，固定递增额应改用单利或按租约录入。' },
  'INT': { syntax: 'INT(数值)', meaning: '向下取整，用于计算完整递增周期。', example: 'INT((运营年-1)÷递增周期)', note: '每N年阶梯递增时，未满一个完整周期不得提前上调。' },
  'ROUND': { syntax: 'ROUND(数值,小数位)', meaning: '按小数位四舍五入。', example: 'ROUND(总投资,2)', note: '底层计算保留原精度，展示时取整。' },
  'NPV': { syntax: 'Σ[CFt÷(1+r)^t]', meaning: '净现值，将未来现金流按折现率折现后相加。', example: 'NPV=CF1/(1+r)+CF2/(1+r)^2+…', note: 'NPV大于0表示达到或超过门槛收益。' },
  'IRR': { syntax: 'NPV(IRR)=0', meaning: '内部收益率，项目自身可承受的折现率。', example: 'IRR=10%，门槛8%，则超过门槛2个百分点', note: '现金流结构异常时可能无解，应同时看NPV。' },
  'MOD': { syntax: 'MOD(数值,除数)', meaning: '取余数，用于判断续租周期等周期性年份。', example: 'MOD(运营年,续租周期)=0', note: '续租佣金不能每年重复计算。' },
  'INDEX': { syntax: 'INDEX(列表,位置)', meaning: '按位置取列表值。', example: 'INDEX(年度租金,运营年)', note: '确保年份和楼层数据完整。' },
  'LOOKUP': { syntax: 'LOOKUP(查找值,区域,返回区域)', meaning: '按条件查找并返回对应数据。', example: '查找回收期对应年度', note: '查找区域应覆盖完整测算期。' },
  'SEQUENCE': { syntax: 'SEQUENCE(MIN,MAX,STEP)', meaning: '按上下限和步长生成情景序列。', example: '90%、95%、100%、105%、110%', note: '通常5个情景即可，步长过细会增加计算量。' },
  '二分法': { syntax: '反复取区间中点逼近NPV=0', meaning: '数值求解IRR或盈亏平衡点的方法。', example: '在-99.99%到1000%之间迭代求解', note: '无解时系统显示“不适用”。' },
};

function exportFunctionDescription(names) {
  return (names || []).map(name => {
    const f = EXPORT_FUNCTIONS[name];
    return f ? `${name}：${f.syntax}；${f.meaning}` : name;
  }).join(' / ');
}


const BUDGET_BASIC_DEFS = [
  { label: '单位社保公积金综合比例', path: 'organization.socialInsuranceRate', unit: '%', scale: 0.01, value: 28, aliases: ['社保公积金综合比例'], description: '单位承担的养老、医疗、失业、工伤、生育及公积金综合比例；默认值仅为测算参考' },
  { label: '个人社保公积金比例', path: 'organization.employeeSocialInsuranceRate', unit: '%', scale: 0.01, value: 10.5, aliases: ['个人社保公积金综合比例'], description: '从员工税前工资中代扣的个人社保及公积金综合比例' },
  { label: '个税起征点', path: 'organization.individualIncomeTaxThresholdMonthly', unit: '元/月', scale: 1, value: 5000, aliases: ['基本减除费用'], description: '居民个人综合所得基本减除费用，通常为5000元/月，以适用税法为准' },
  { label: '专项附加扣除', path: 'organization.specialAdditionalDeductionMonthly', unit: '元/人/月', scale: 1, value: 0, description: '子女教育、住房贷款/租金、赡养老人等平均月扣除额' },
  { label: '年度薪资月数（如12/15薪）', path: 'organization.annualSalaryMonths', unit: '薪/年', scale: 1, value: 12, aliases: ['年度薪资月数', '年终奖月数'], description: '影响税前年度工资和应税所得；不增加社保公积金12个月的缴费次数' },
  { label: '招聘培训费率', path: 'organization.recruitmentTrainingRate', unit: '%', scale: 0.01, value: 2, description: '按企业人员成本计取的招聘、培训及团队建设费用' },
  { label: '人员成本来源', path: 'operations.staffCostMode', unit: '', scale: 1, value: '按组织架构薪资倒推' },
  { label: '物业基础运营单价', path: 'operations.propertyOpsCost', unit: '元/㎡/月', scale: 1, value: 10 },
  { label: '公共能耗单价', path: 'operations.energyCost', unit: '元/㎡/月', scale: 1, value: 4.5 },
  { label: '日常维修费率', path: 'operations.repairRate', unit: '%', scale: 0.01, value: 1 },
  { label: '保险费用率', path: 'operations.insuranceRate', unit: '%', scale: 0.01, value: 0.15 },
  { label: '其他运营费用率', path: 'operations.otherOpexRate', unit: '%', scale: 0.01, value: 0.5 },
  { label: '物业基础运营直接金额', path: 'operations.annualCostOverrides.propertyOps', unit: '万元/年', scale: 1, value: 0 },
  { label: '公共能耗直接金额', path: 'operations.annualCostOverrides.energy', unit: '万元/年', scale: 1, value: 0 },
  { label: '日常维修直接金额', path: 'operations.annualCostOverrides.baseMaintenance', unit: '万元/年', scale: 1, value: 0 },
  { label: '保险费用直接金额', path: 'operations.annualCostOverrides.insurance', unit: '万元/年', scale: 1, value: 0 },
  { label: '其他运营费用直接金额', path: 'operations.annualCostOverrides.otherOpex', unit: '万元/年', scale: 1, value: 0 },
];
const CHINA_IIT_ANNUAL_BRACKETS = [
  ['不超过 36,000', '3%', 0],
  ['36,000 – 144,000', '10%', 2520],
  ['144,000 – 300,000', '20%', 16920],
  ['300,000 – 420,000', '25%', 31920],
  ['420,000 – 660,000', '30%', 52920],
  ['660,000 – 960,000', '35%', 85920],
  ['超过 960,000', '45%', 181920],
];
const OFFICE_BUDGET_DEFS = [
  ['办公室租金', 'officeRentAnnual'], ['水电及通讯费', 'utilitiesAnnual'], ['IT及软件服务', 'itSoftwareAnnual'],
  ['办公用品', 'officeSuppliesAnnual'], ['差旅及业务招待', 'travelEntertainmentAnnual'], ['其他办公费用', 'otherAnnual'],
];
const LEASING_BUDGET_DEFS = [
  ['渠道及代理费', 'channelFeeAnnual'], ['招商活动', 'eventsAnnual'], ['招商物料', 'materialsAnnual'],
  ['招商差旅', 'travelAnnual'], ['招商平台及系统', 'platformAnnual'], ['其他招商费用', 'otherAnnual'],
];
const MAINTENANCE_BUDGET_DEFS = [
  ['电梯维保', 'elevatorAnnual'], ['暖通空调维保', 'hvacAnnual'], ['消防维保', 'fireAnnual'],
  ['景观绿化养护', 'landscapeAnnual'], ['其他专项维保', 'otherAnnual'],
];
const PREOPENING_DEFS = [
  { label: '首开招商佣金月数', path: 'operations.commissionMonths', unit: '月', scale: 1, value: 1 },
  { label: '筹备招商期', path: 'project.leasingPeriodMonths', unit: '月', scale: 1, value: 12 },
  { label: '启动资金安全垫', path: 'project.startupReserveMonths', unit: '月', scale: 1, value: 3 },
  { label: '筹备期团队成本', path: 'project.preOpeningTeamCost', unit: '万元', scale: 1, value: 0 },
  { label: '筹备期物业成本', path: 'project.preOpeningPropertyCost', unit: '万元', scale: 1, value: 0 },
  { label: '筹备期营销费用', path: 'project.preOpeningMarketing', unit: '万元', scale: 1, value: 0 },
  { label: '其他前期及开办费用', path: 'project.otherPreOpening', unit: '万元', scale: 1, value: 0 },
];
const MARKETING_ANNUAL_DEFS = [
  ['营销推广', 'promotion'], ['商业美陈', 'visual'], ['媒体宣传', 'media'], ['会员营销', 'member'],
];
const MARKETING_OPENING_DEFS = [
  ['导视导览', 'wayfinding'], ['开业美陈', 'opening_visual'],
];
const PROPERTY_SERVICE_DEFS = [
  { key: 'property', name: '物业工程服务', note: '物业经理、工程、消防、强弱电、暖通、机电等岗位' },
  { key: 'security', name: '保安服务', note: '保安、秩序维护、监控等岗位' },
  { key: 'cleaning', name: '保洁服务', note: '保洁、环境卫生、垃圾清运等岗位' },
];
const PROPERTY_SERVICE_MODE_LABELS = {
  self: '自营（自行招聘）',
  resident_outsourced: '第三方常驻外包',
  non_resident: '第三方非常驻服务',
};

function operatingBudgetTemplate() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, '使用说明', [
    ['多多 · 商业地产运营成本预算导入模板'],
    ['请在黄色或空白单元格中填写，不要修改工作表名称和表头。'],
    ['导入后会覆盖当前项目的组织架构、办公、招商、营销和维保预算；不填写的工作表保持原值。'],
    ['费用优先按金额填写，权重和占比由系统自动计算，无需手工凑100%。金额单位均为万元/年，工资单位为元/月。'],
    ['办公预算和招商预算可按年或按月录入：按年录入时系统自动÷12得到月均；按月录入时自动×12得到年度金额。'],
    ['组织架构中的“税前应发基本月薪”是员工税前工资，不是实发工资。系统会继续计算个人社保公积金、个人所得税、实发工资、单位社保公积金和企业人员成本。'],
    ['社保公积金比例、个税起征点和专项附加扣除必须按项目属地最新政策及员工实际情况调整；模板默认值仅为测算示例。'],
    ['物业服务模式表可分别设置物业工程、保安、保洁为自营、第三方常驻外包或第三方非常驻服务；三种模式均以岗位成本为基础，第三方模式另计综合管理费。'],
  ], [20, 100]);
  addSheet(wb, '基础参数', [
    ['参数', '填写值', '单位', '说明'],
    ...BUDGET_BASIC_DEFS.map(item => [item.label, item.value, item.unit, item.description || '按项目实际预算和属地政策填写']),
  ], [28, 18, 16, 56]);
  const orgWs = addSheet(wb, '组织架构', [
    ['部门', '岗位', '编制人数', '税前应发月薪（元/月）', '岗位职责说明'],
    ['总经办', '项目总经理', 1, 25000, '项目整体经营、投资与重大决策'],
    ['总经办', '综合管理经理', 1, 14000, '计划运营、制度流程与跨部门协调'],
    ['招商部', '招商总监', 1, 20000, '招商策略、主力店及重点品牌'],
    ['招商部', '招商经理', 2, 13000, '业态招商、品牌储备与商务谈判'],
    ['招商部', '租赁专员', 3, 8500, '客户拓展、带看、合同及台账'],
    ['运营部', '运营总监', 1, 18000, '经营目标、营运统筹与重大事项'],
    ['运营部', '运营经理', 2, 12000, '楼层经营、租户管理与经营分析'],
    ['运营部', '楼层主管', 3, 9000, '现场巡检、租户服务和问题处理'],
    ['运营部', '客服专员', 4, 6500, '服务台、投诉、会员及活动支持'],
    ['市场推广部', '市场总监', 1, 18000, '市场策略、预算和品牌统筹'],
    ['市场推广部', '品牌经理', 1, 11000, '品牌传播、公关和异业合作'],
    ['市场推广部', '新媒体专员', 1, 8000, '内容、短视频和线上平台'],
    ['市场推广部', '会员运营', 1, 8000, '会员体系、私域和会员活动'],
    ['财务行政部', '财务经理', 1, 13000, '预算、核算、税务和资金管理'],
    ['财务行政部', '会计', 1, 9000, '账务、报表、结算和发票'],
    ['财务行政部', '人事行政专员', 1, 8000, '招聘、薪酬、行政和采购'],
    ['物业工程部', '物业经理', 1, 13000, '物业统筹、供应商和品质管理'],
    ['物业工程部', '工程主管', 2, 9000, '机电、暖通、给排水和维修'],
    ['物业工程部', '消防及强弱电', 3, 7000, '消防、弱电、配电及设备巡检'],
    ['保安部', '保安主管', 1, 7000, '秩序维护、排班和应急管理'],
    ['保安部', '保安员', 7, 5000, '门岗、巡逻、监控和车辆管理'],
    ['保洁部', '保洁主管', 1, 6000, '保洁品质、排班和物料管理'],
    ['保洁部', '保洁员', 9, 4000, '公共区域、卫生间和垃圾清运'],
  ], [18, 20, 14, 26, 52]);
  setSheetColumnNumberFormat(orgWs, [3], '0.00');
  addSheet(wb, '薪酬口径说明', [
    ['薪酬核算口径与公式说明'],
    ['项目', '公式 / 说明'],
    ['输入口径', '岗位月薪填写税前应发基本月薪，不填写员工实发工资，也不填写企业总成本。'],
    ['税前年度工资', 'Σ(岗位编制人数 × 税前应发月薪 × 年度薪资月数)。年度薪资月数可为12、13、14、15薪。'],
    ['个人社保公积金', 'Σ(税前应发月薪 × 12 × 个人社保公积金比例)。模板按月薪作为月缴费基数、全年缴费12个月。'],
    ['单位社保公积金', 'Σ(税前应发月薪 × 12 × 单位社保公积金比例)。'],
    ['年度应纳税所得额', '税前年度工资 - 个人社保公积金 - 个税起征点×12 - 专项附加扣除×12。'],
    ['个人所得税', '应纳税所得额 × 适用税率 - 速算扣除数；采用中国综合所得七级年度超额累进税率。'],
    ['实发工资', '税前年度工资 - 个人社保公积金 - 个人所得税。'],
    ['企业人员成本', '税前年度工资 + 单位社保公积金。'],
    ['含招聘培训人员成本', '企业人员成本 + 企业人员成本×招聘培训费率。'],
    ['重要提示', '社保公积金比例、缴费基数上下限、个税专项附加扣除和适用政策因城市、年度、险种及员工情况不同，系统默认值不能替代属地申报口径。'],
  ], [28, 110]);
  addSheet(wb, '个税税率表', [
    ['中国居民个人综合所得年度税率表（测算参考）'],
    ['年度应纳税所得额（元）', '税率', '速算扣除数（元）'],
    ...CHINA_IIT_ANNUAL_BRACKETS,
    [''],
    ['计算公式', '个人所得税 = 年度应纳税所得额 × 适用税率 - 速算扣除数'],
    ['年度应纳税所得额', '税前年度工资 - 个人社保公积金 - 个税起征点×12 - 专项附加扣除×12'],
    ['说明', '系统用于年度投资测算；正式申报应以累计预扣预缴和年度汇算结果为准。'],
  ], [30, 18, 22]);
  addSheet(wb, '物业服务模式', [
    ['服务类别', '服务模式', '非驻场折算比例（%）', '第三方综合管理费率（%）', '说明'],
    ...PROPERTY_SERVICE_DEFS.map(item => [item.name, PROPERTY_SERVICE_MODE_LABELS.self, 70, 12, `${item.note}。综合管理费率用于第三方模式，自营模式不收取。`]),
    [''],
    ['填写说明', '服务模式可填：自营、第三方常驻外包、第三方非常驻服务。', '', '', '非驻场折算比例只在第三方非常驻模式使用；综合管理费率建议包含管理费、利润、保险、装备、培训及税费。'],
  ], [20, 26, 24, 28, 90]);
  addSheet(wb, '筹备期成本', [
    ['参数', '填写值', '单位', '说明'],
    ...PREOPENING_DEFS.map(item => [item.label, item.value, item.unit, item.path === 'operations.commissionMonths' ? '按满租月租金和首年出租率计算首开招商佣金' : '只进入筹备期投资，不重复计入运营期成本']),
  ], [30, 20, 16, 90]);
  addSheet(wb, '办公预算', [['费用项目', '录入周期', '录入金额（万元/期）', '说明'], ...OFFICE_BUDGET_DEFS.map(([label]) => [label, '按年', 0, ''])] , [26, 16, 22, 50]);
  addSheet(wb, '招商预算', [['费用项目', '录入周期', '录入金额（万元/期）', '说明'], ...LEASING_BUDGET_DEFS.map(([label]) => [label, '按年', 0, ''])] , [26, 16, 22, 50]);
  addSheet(wb, '招商渠道核算', [
    ['参数', '填写值', '单位', '说明'],
    ['渠道及代理费核算方式', '按金额', '', '可填“按金额”或“按渠道面积和首年月租金”'],
    ['渠道招商面积比例', 50, '%', '按项目总建筑面积计算渠道招商面积，例如2,000㎡×50%=1,000㎡'],
    ['首年月租金单价', 0, '元/㎡/月', '填0时自动采用项目平均月租金'],
    ['首年月租金倍数', 1, '个月', '1表示1个月租金，1.5表示1.5个月租金'],
    ['说明', '渠道及代理费=项目总建筑面积×渠道面积比例×首年月租金单价×月租金倍数÷10000', '', '首开招商佣金已在项目投资中单列，如为同一笔合同请勿重复计入。'],
  ], [30, 24, 18, 100]);
  addSheet(wb, '营销常规预算', [
    ['营销类别', '年度金额（万元）', '费用内容'],
    ['营销推广', 80, '节庆活动、主题推广、异业合作及日常营销执行'],
    ['商业美陈', 50, '公共区域美陈、季节装饰、陈列更新'],
    ['媒体宣传', 40, '线上信息流、户外媒体、本地生活平台及公关传播'],
    ['会员营销', 30, '会员权益、积分、小程序、私域运营及会员活动'],
  ], [24, 16, 60]);
  addSheet(wb, '开业首年营销', [
    ['开业专项', '首年金额（万元）', '费用内容'],
    ['导视导览', 20, '开业导视、导览标识及临时指引'],
    ['开业美陈', 40, '开业主题美陈、氛围布置及公共空间装饰'],
  ], [24, 16, 60]);
  addSheet(wb, '维保预算', [['维保项目', '年度金额（万元）', '说明'], ...MAINTENANCE_BUDGET_DEFS.map(([label]) => [label, 0, ''])] , [26, 20, 50]);
  return wb;
}

function preopeningBudgetTemplate() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, '使用说明', [
    ['多多 · 商业地产筹备期成本明细导入模板'],
    ['适用于开业前筹备团队、物业工程/保安/保洁、行政办公及开办费用明细。'],
    ['请勿修改工作表名称和表头。黄色空白区域可填写，金额单位按各表表头执行。'],
    ['筹备团队月薪为税前月薪；系统按筹备月数计算税前工资、单位社保和招聘培训。'],
    ['物业工程、保安、保洁可分别选择自营、第三方常驻外包或第三方非常驻服务；第三方模式另计综合管理费。'],
    ['行政开办费用可按“每月×月数”或“一次性总额”录入。'],
    ['导入后会自动切换为“明细预算”，并将团队、物业和行政总表金额回写项目总投资。'],
  ], [22, 110]);
  addSheet(wb, '基础参数', [
    ['参数', '填写值', '说明'],
    ['单位社保公积金综合比例（%）', 28, '单位承担的社保和公积金综合比例，正式申报应按属地政策复核'],
    ['招聘培训费率（%）', 2, '按筹备团队工资与单位社保合计计提'],
    ['自营物业招聘培训费率（%）', 2, '用于自营物业工程、保安、保洁岗位'],
    ['默认筹备月数', 6, '新增岗位或行政月度费用时可参考'],
  ], [32, 18, 72]);
  addSheet(wb, '筹备团队', [
    ['部门', '岗位', '编制人数', '税前月薪（元/月）', '筹备月数', '岗位职责/说明'],
    ['项目筹备组', '筹备负责人', 0, 18000, 6, '填写实际编制人数后计入；0表示不纳入'],
    ['招商部', '招商经理', 0, 12000, 6, '负责首开招商、品牌储备和商务谈判'],
    ['运营部', '运营经理', 0, 12000, 4, '负责筹备运营制度、动线和租户进场'],
    ['市场推广部', '市场推广经理', 0, 10000, 4, '负责开业推广、媒体和美陈'],
    ['财务行政部', '财务行政专员', 0, 9000, 6, '负责预算、合同、人事和行政'],
    ['物业工程部', '工程机电主管', 0, 9000, 6, '负责工程介入、机电和物业筹备'],
  ], [18, 20, 14, 24, 14, 56]);
  addSheet(wb, '物业服务', [
    ['服务类别', '服务模式', '编制人数', '参考月薪（元/月）', '服务月数', '非驻场折算比例（%）', '综合管理费率（%）', '说明'],
    ['物业工程', '自营（自行招聘）', 0, 8000, 6, 70, 12, '工程介入、机电、消防、强弱电等'],
    ['保安服务', '第三方常驻外包', 0, 5500, 6, 70, 12, '筹备期门岗、巡逻和现场秩序'],
    ['保洁服务', '第三方常驻外包', 0, 4500, 6, 70, 12, '筹备期日常保洁和开业前开荒配合'],
  ], [18, 26, 14, 24, 14, 24, 24, 56]);
  addSheet(wb, '物业一次性费用', [
    ['费用项目', '金额（万元）', '说明'],
    ['工程介入', 0, '工程条件核查、设备接管、施工配合等'],
    ['开荒保洁', 0, '开业前全面开荒、玻璃幕墙及公共区域清洁'],
    ['物业顾问', 0, '物业体系、标准、培训和顾问服务'],
    ['物业开办及物资', 0, '工具、耗材、制服、标识及物业开办物资'],
  ], [24, 18, 72]);
  addSheet(wb, '行政开办', [
    ['费用科目', '金额（元）', '金额口径', '月数', '说明'],
    ['办公室租金', 0, '每月', 6, '筹备办公室租金'],
    ['水电及通讯费', 0, '每月', 6, '办公水电、网络和通讯'],
    ['IT及软件服务', 0, '一次性总额', 0, '系统、软件和IT设备'],
    ['办公用品及家具', 0, '一次性总额', 0, '办公家具、用品和低值易耗品'],
    ['招聘及培训费', 0, '一次性总额', 0, '招聘渠道、培训及团队建设'],
    ['差旅及业务招待', 0, '一次性总额', 0, '筹备差旅和业务招待'],
    ['证照及专业服务费', 0, '一次性总额', 0, '证照、尽调、咨询、法务和审计'],
    ['其他前期及开办费用', 0, '一次性总额', 0, '其他无法归类的筹备开办费用'],
  ], [26, 18, 18, 14, 72]);
  return wb;
}

function parseServiceMode(value) {
  const text = String(value || '').trim();
  if (/非常驻/.test(text)) return 'non_resident';
  if (/常驻|第三方|外包/.test(text)) return 'resident_outsourced';
  return 'self';
}

function parsePreopeningBudgetWorkbook(base64, filename) {
  if (!/\.(xlsx|xlsm)$/i.test(filename)) throw new Error('筹备期成本明细仅支持 .xlsx 或 .xlsm 多工作表文件');
  const wb = readWorkbook(base64, filename);
  const warnings = [];
  const budget = {
    mode: 'detailed',
    team: { socialInsuranceRate: 0.28, recruitmentTrainingRate: 0.02, positions: [] },
    property: { selfRecruitmentRate: 0.02, services: [], oneOffItems: [] },
    admin: { items: [] },
  };
  const findSheet = keyword => wb.SheetNames.find(name => name.includes(keyword));
  const findHeader = (rows, required) => rows.findIndex(row => required.every(text => row.some(cell => String(cell || '').includes(text))));
  const baseSheet = findSheet('基础参数');
  if (baseSheet) {
    const rows = getTemplateRows(wb, baseSheet);
    for (const row of rows) {
      const label = String(row?.[0] || '');
      if (/单位社保公积金/.test(label)) budget.team.socialInsuranceRate = Math.max(0, safeNumber(row?.[1])) / 100;
      else if (/自营物业招聘培训/.test(label)) budget.property.selfRecruitmentRate = Math.max(0, safeNumber(row?.[1])) / 100;
      else if (/招聘培训费率/.test(label)) budget.team.recruitmentTrainingRate = Math.max(0, safeNumber(row?.[1])) / 100;
    }
  }
  const teamSheet = findSheet('筹备团队');
  if (teamSheet) {
    const rows = getTemplateRows(wb, teamSheet);
    const headerIdx = findHeader(rows, ['部门', '岗位']);
    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        const position = String(row?.[1] || '').trim();
        const headcount = Math.max(0, safeNumber(row?.[2]));
        if (!position && !headcount) continue;
        budget.team.positions.push({
          department: String(row?.[0] || '项目筹备组').trim(),
          position: position || '未命名岗位',
          headcount,
          monthlySalary: Math.max(0, safeNumber(row?.[3])),
          months: Math.max(0, safeNumber(row?.[4])),
          note: String(row?.[5] || '').trim(),
        });
      }
    }
  }
  const propertySheet = findSheet('物业服务');
  if (propertySheet) {
    const rows = getTemplateRows(wb, propertySheet);
    const headerIdx = findHeader(rows, ['服务类别', '服务模式']);
    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        const name = String(row?.[0] || '').trim();
        if (!name) continue;
        budget.property.services.push({
          key: /保安/.test(name) ? 'security' : /保洁/.test(name) ? 'cleaning' : 'engineering',
          name,
          mode: parseServiceMode(row?.[1]),
          headcount: Math.max(0, safeNumber(row?.[2])),
          monthlySalary: Math.max(0, safeNumber(row?.[3])),
          months: Math.max(0, safeNumber(row?.[4])),
          nonResidentFactor: Math.max(0, Math.min(100, safeNumber(row?.[5] || 70))) / 100,
          managementFeeRate: Math.max(0, safeNumber(row?.[6] || 12)) / 100,
        });
      }
    }
  }
  const oneOffSheet = findSheet('物业一次性');
  if (oneOffSheet) {
    const rows = getTemplateRows(wb, oneOffSheet);
    const headerIdx = findHeader(rows, ['费用项目', '金额']);
    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        const name = String(row?.[0] || '').trim();
        if (!name) continue;
        budget.property.oneOffItems.push({ key: `property_${budget.property.oneOffItems.length}`, name, amount: Math.max(0, safeNumber(row?.[1])) });
      }
    }
  }
  const adminSheet = findSheet('行政开办');
  if (adminSheet) {
    const rows = getTemplateRows(wb, adminSheet);
    const headerIdx = findHeader(rows, ['费用科目', '金额']);
    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        const name = String(row?.[0] || '').trim();
        if (!name) continue;
        const periodText = String(row?.[2] || '').trim();
        budget.admin.items.push({
          key: `admin_${budget.admin.items.length}`,
          name,
          amount: Math.max(0, safeNumber(row?.[1])),
          period: /每月|月度/.test(periodText) ? 'monthly' : 'total',
          months: Math.max(0, safeNumber(row?.[3])),
          note: String(row?.[4] || '').trim(),
        });
      }
    }
  }
  if (!budget.team.positions.length && !budget.property.services.length && !budget.admin.items.length) throw new Error('未在模板中识别到筹备团队、物业服务或行政开办数据，请使用最新模板');
  if (!budget.team.positions.length) warnings.push('“筹备团队”工作表未识别到有效岗位');
  if (!budget.property.services.length) warnings.push('“物业服务”工作表未识别到有效服务类别');
  if (!budget.admin.items.length) warnings.push('“行政开办”工作表未识别到有效费用科目');
  return {
    preOpeningBudget: budget,
    warnings,
    teamCount: budget.team.positions.length,
    serviceCount: budget.property.services.length,
    adminCount: budget.admin.items.length,
  };
}

function getTemplateRows(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) : [];
}

function parseOperatingBudgetWorkbook(base64, filename) {
  if (!/\.(xlsx|xlsm)$/i.test(filename)) throw new Error('运营成本预算仅支持 .xlsx 或 .xlsm 多工作表文件');
  const wb = readWorkbook(base64, filename);
  const warnings = [];
  const organization = { departments: [] };
  const officeBudget = {};
  const leasingBudget = {};
  const marketingBudget = { amountMode: true, annualItems: [], openingYearItems: [] };
  const maintenanceBudget = {};
  const propertyService = {};
  const projectFields = {};
  const operations = {};

  const basicRows = getTemplateRows(wb, '基础参数');
  const basicHeader = findHeaderRow(basicRows, { label: ['参数'], value: ['填写值'] }, ['label', 'value']);
  if (basicHeader >= 0) {
    const indexes = headerIndexes(basicRows[basicHeader], { label: ['参数'], value: ['填写值'] });
    const defsByLabel = {};
    BUDGET_BASIC_DEFS.forEach(item => {
      defsByLabel[normalizeHeader(item.label)] = item;
      (item.aliases || []).forEach(alias => { defsByLabel[normalizeHeader(alias)] = item; });
    });
    for (const row of basicRows.slice(basicHeader + 1)) {
      const label = String(rowValue(row, indexes, 'label') || '').trim();
      const raw = rowValue(row, indexes, 'value');
      const def = defsByLabel[normalizeHeader(label)];
      if (!def) continue;
      if (def.path === 'operations.staffCostMode') {
        operations.staffCostMode = String(raw || '').includes('面积') ? 'area' : 'organization';
      } else {
        let number = safeNumber(raw) * def.scale;
        if (def.path === 'organization.annualSalaryMonths' && normalizeHeader(label) === normalizeHeader('年终奖月数')) number += 12;
        const [group, key, nestedKey] = def.path.split('.');
        if (group === 'organization') organization[key] = number;
        else if (group === 'marketingBudget') marketingBudget[key] = number;
        else if (group === 'operations' && key === 'annualCostOverrides' && nestedKey) {
          operations.annualCostOverrides ||= {};
          operations.annualCostOverrides[nestedKey] = number;
        } else if (group === 'operations') operations[key] = number;
      }
    }
  } else {
    warnings.push('未找到“基础参数”工作表或表头');
  }

  const orgRows = getTemplateRows(wb, '组织架构');
  const orgHeader = findHeaderRow(orgRows, { name: ['部门', '部门名称'], position: ['岗位', '岗位名称', '职位'], headcount: ['编制人数'], salary: ['税前应发月薪', '税前月薪', '平均月薪', '月薪'], note: ['岗位职责', '职责说明', '说明'] }, ['name', 'headcount', 'salary']);
  if (orgHeader >= 0) {
    const indexes = headerIndexes(orgRows[orgHeader], { name: ['部门', '部门名称'], position: ['岗位', '岗位名称', '职位'], headcount: ['编制人数'], salary: ['税前应发月薪', '税前月薪', '平均月薪', '月薪'], note: ['岗位职责', '职责说明', '说明'] });
    const departmentMap = new Map();
    for (const row of orgRows.slice(orgHeader + 1)) {
      const name = String(rowValue(row, indexes, 'name') || '').trim();
      if (!name) continue;
      if (!departmentMap.has(name)) departmentMap.set(name, { name, note: '', positions: [] });
      const department = departmentMap.get(name);
      const positionName = String(rowValue(row, indexes, 'position') || '部门综合岗位').trim() || '部门综合岗位';
      const note = String(rowValue(row, indexes, 'note') || '').trim();
      department.positions.push({
        name: positionName,
        headcount: safeNumber(rowValue(row, indexes, 'headcount')),
        avgMonthlySalary: safeNumber(rowValue(row, indexes, 'salary')),
        note,
      });
    }
    organization.departments = [...departmentMap.values()];
  }
  if (!organization.departments.length) warnings.push('组织架构工作表没有有效部门或岗位记录');

  const serviceRows = getTemplateRows(wb, '物业服务模式');
  const serviceHeader = findHeaderRow(serviceRows, { name: ['服务类别', '服务项目'], mode: ['服务模式'], factor: ['非驻场折算比例', '折算比例'], fee: ['第三方综合管理费率', '管理费率'] }, ['name', 'mode']);
  if (serviceHeader >= 0) {
    const indexes = headerIndexes(serviceRows[serviceHeader], { name: ['服务类别', '服务项目'], mode: ['服务模式'], factor: ['非驻场折算比例', '折算比例'], fee: ['第三方综合管理费率', '管理费率'] });
    const keyByName = Object.fromEntries(PROPERTY_SERVICE_DEFS.map(item => [normalizeHeader(item.name), item.key]));
    for (const row of serviceRows.slice(serviceHeader + 1)) {
      const name = String(rowValue(row, indexes, 'name') || '').trim();
      const key = keyByName[normalizeHeader(name)];
      if (!key) continue;
      const rawMode = normalizeHeader(rowValue(row, indexes, 'mode'));
      const mode = rawMode.includes('非常驻') ? 'non_resident' : rawMode.includes('外包') || rawMode.includes('第三方') ? 'resident_outsourced' : 'self';
      const factorValue = rowValue(row, indexes, 'factor');
      const feeValue = rowValue(row, indexes, 'fee');
      propertyService[key] = {
        mode,
        nonResidentFactor: factorValue === '' ? 0.70 : Math.min(1, Math.max(0, safeNumber(factorValue) / 100)),
        managementFeeRate: feeValue === '' ? 0.12 : Math.max(0, safeNumber(feeValue) / 100),
      };
    }
  }

  const channelRows = getTemplateRows(wb, '招商渠道核算');
  const channelHeader = findHeaderRow(channelRows, { label: ['参数'], value: ['填写值'] }, ['label', 'value']);
  if (channelHeader >= 0) {
    const indexes = headerIndexes(channelRows[channelHeader], { label: ['参数'], value: ['填写值'] });
    for (const row of channelRows.slice(channelHeader + 1)) {
      const label = normalizeHeader(rowValue(row, indexes, 'label'));
      const raw = rowValue(row, indexes, 'value');
      if (!label || raw === '') continue;
      if (label.includes('核算方式')) leasingBudget.channelCalculationMode = normalizeHeader(raw).includes('面积') ? 'area_rent' : 'amount';
      else if (label.includes('面积比例')) leasingBudget.channelAreaRatio = Math.min(1, Math.max(0, safeNumber(raw) / 100));
      else if (label.includes('租金单价')) leasingBudget.channelRentPerSqmMonth = Math.max(0, safeNumber(raw));
      else if (label.includes('租金倍数')) leasingBudget.channelCommissionMonths = Math.max(0, safeNumber(raw));
    }
  }

  const preopeningRows = getTemplateRows(wb, '筹备期成本');
  const preopeningHeader = findHeaderRow(preopeningRows, { label: ['参数'], value: ['填写值'] }, ['label', 'value']);
  if (preopeningHeader >= 0) {
    const indexes = headerIndexes(preopeningRows[preopeningHeader], { label: ['参数'], value: ['填写值'] });
    const defsByLabel = Object.fromEntries(PREOPENING_DEFS.map(item => [normalizeHeader(item.label), item]));
    for (const row of preopeningRows.slice(preopeningHeader + 1)) {
      const def = defsByLabel[normalizeHeader(rowValue(row, indexes, 'label'))];
      if (!def) continue;
      const value = safeNumber(rowValue(row, indexes, 'value')) * def.scale;
      if (def.path.startsWith('operations.')) operations[def.path.split('.')[1]] = value;
      if (def.path.startsWith('project.')) projectFields[def.path.split('.')[1]] = value;
    }
  }

  function parseAmountSheet(sheetName, defs, target, periodTarget = null) {
    const rows = getTemplateRows(wb, sheetName);
    const header = findHeaderRow(rows, { name: ['费用项目', '维保项目', '营销类别', '开业专项'], amount: ['录入金额', '年度金额', '首年金额'] }, ['name', 'amount']);
    if (header < 0) return;
    const indexes = headerIndexes(rows[header], { name: ['费用项目', '维保项目', '营销类别', '开业专项'], amount: ['录入金额', '年度金额', '首年金额'], period: ['录入周期', '周期'], note: ['说明', '费用内容'] });
    const keyByLabel = Object.fromEntries(defs.map(([label, key]) => [normalizeHeader(label), key]));
    for (const row of rows.slice(header + 1)) {
      const label = String(rowValue(row, indexes, 'name') || '').trim();
      const key = keyByLabel[normalizeHeader(label)];
      if (!key) continue;
      const rawPeriod = normalizeHeader(rowValue(row, indexes, 'period'));
      const isMonthly = rawPeriod.includes('月') && !rawPeriod.includes('年');
      target[key] = safeNumber(rowValue(row, indexes, 'amount')) * (isMonthly ? 12 : 1);
      if (periodTarget) periodTarget[key] = isMonthly ? 'monthly' : 'annual';
    }
  }
  officeBudget.inputPeriods = {};
  leasingBudget.inputPeriods = {};
  parseAmountSheet('办公预算', OFFICE_BUDGET_DEFS, officeBudget, officeBudget.inputPeriods);
  parseAmountSheet('招商预算', LEASING_BUDGET_DEFS, leasingBudget, leasingBudget.inputPeriods);
  parseAmountSheet('维保预算', MAINTENANCE_BUDGET_DEFS, maintenanceBudget);
  const annualMarketingAmounts = {};
  const openingMarketingAmounts = {};
  parseAmountSheet('营销常规预算', MARKETING_ANNUAL_DEFS, annualMarketingAmounts);
  parseAmountSheet('开业首年营销', MARKETING_OPENING_DEFS, openingMarketingAmounts);
  marketingBudget.annualItems = MARKETING_ANNUAL_DEFS.map(([name, key]) => ({
    key,
    name,
    amount: safeNumber(annualMarketingAmounts[key]),
    note: '',
  }));
  marketingBudget.openingYearItems = MARKETING_OPENING_DEFS.map(([name, key]) => ({
    key,
    name,
    amount: safeNumber(openingMarketingAmounts[key]),
    note: '',
  }));
  if (!Object.keys(annualMarketingAmounts).length) warnings.push('营销常规预算工作表没有有效金额记录');
  if (!Object.keys(openingMarketingAmounts).length) warnings.push('开业首年营销工作表没有有效金额记录');
  marketingBudget.hasImportedAmounts = Boolean(Object.keys(annualMarketingAmounts).length || Object.keys(openingMarketingAmounts).length);

  return { organization, propertyService, projectFields, officeBudget, leasingBudget, marketingBudget, maintenanceBudget, operations, warnings };
}

function exportExcel(result) {
  const model = result.model;
  const s = result.summary;
  const formulas = model.formulas || {};
  const developmentLabels = { new_build: '新建项目', renovation: '旧改 / 存量改造项目', operating: '运营中项目', light_asset: '轻资产运营项目' };
  const growthModeLabels = { none: '不递增', compound: '每年复利递增', simple: '每年单利递增', step: '每N年阶梯递增' };
  const settlementPresetLabels = { shopping: '购物中心行业常规', department: '百货商场行业常规', outlet: '奥特莱斯行业常规' };
  const ownerRentGrowthLabels = { none: '不复递增', compound: '按比例复利递增', simple: '按比例单利递增', fixed_amount: '每年固定金额递增', step: '每N年阶梯递增' };
  const ownerRentLeaseLabels = { land: '仅土地租赁', property: '仅物业租赁', land_and_property: '土地+物业租赁' };
  const propertyRightsLabels = { owned: '自有产权', leased: '租赁物业', equity: '股权持有', government: '政府划拨/合作持有', other: '其他产权安排' };
  const acquisitionMethodLabels = { market_auction: '招拍挂/市场竞得', negotiated_transfer: '协议转让', equity_acquisition: '股权收购', government_allocation: '政府划拨/定向供应', lease: '租赁取得', other: '其他方式' };
  const buildingStatusLabels = { under_construction: '在建/待建', completed_unopened: '已竣工未开业', operating: '已开业运营中', renovation_pending: '待改造/停业改造' };
  const wb = XLSX.utils.book_new();
  addSheet(wb, '项目概览', [
    ['多多 · 商业地产投资测算'], [''],
    ['项目名称', s.projectName], ['项目位置', s.location], ['项目开发状态', developmentLabels[s.developmentType] || s.developmentType || '新建项目'], ['商业项目形态', model.project.projectType], ['产权状态', propertyRightsLabels[model.project.propertyRightsStatus] || '自有产权'], ['取得方式', acquisitionMethodLabels[model.project.acquisitionMethod] || '招拍挂/市场竞得'], ['建设/经营状态', buildingStatusLabels[model.project.buildingStatus] || '在建/待建'], ['租金核算面积口径', model.project.rentAreaBasis === 'building' ? '建筑面积' : '实用面积（套内/租赁面积）'], ['测算模式', s.calculationMode === 'preliminary' ? '楼层均价初步测算' : '一铺一价精细测算'],
    ['总建筑面积（㎡）', s.grossFloorArea], ['可租赁面积（㎡）', s.leasableArea], ['商铺/楼层数量', s.calculationMode === 'preliminary' ? s.floorCount : s.shopsCount],
    ['项目总投资（万元）', s.totalInvestment], ['稳定期营业收入（万元/年）', s.stableRevenue], ['稳定期物业管理费收入（万元/年）', s.stablePropertyManagementIncome || 0], ['稳定期商业管理费收入（万元/年）', s.stableCommercialManagementIncome || 0], ['稳定期中央空调费收入（万元/年）', s.stableCentralAcIncome || 0], ['稳定期三项费用收入合计（万元/年）', s.stablePropertyFeeIncome || 0], ['业主租金支出（万元/年）', s.stableOwnerRentCost || 0], ['稳定期NOI（万元/年）', s.stableNoi],
    ['NOI回报率', s.noiYield], ['项目IRR', s.projectIrr], ['项目NPV（万元）', s.projectNpv], ['静态回收期（年）', s.staticPayback],
    [''], ['说明', '本表由浏览器版多多·商业地产自动生成，用于投资初筛与方案比较，不替代可研、审计、评估或税务鉴证。'],
  ], [26, 32, 22, 22]);
  addSheet(wb, '核心参数', [
    ['参数大类', '参数', '数值'],
    ['项目', '开发状态', developmentLabels[model.project.developmentType] || model.project.developmentType || '新建项目'], ['项目', '起始年份', model.project.startYear], ['项目', '建设期（年）', model.project.constructionYears],
    ['项目', '产权状态', propertyRightsLabels[model.project.propertyRightsStatus] || '自有产权'], ['项目', '取得方式', acquisitionMethodLabels[model.project.acquisitionMethod] || '招拍挂/市场竞得'], ['项目', '建设/经营状态', buildingStatusLabels[model.project.buildingStatus] || '在建/待建'],
    ['项目', '招商运营年限（年）', model.project.operationYears], ['项目', '租金核算面积口径', model.project.rentAreaBasis === 'building' ? '建筑面积' : '实用面积（套内/租赁面积）'], ['项目', '建筑面积调节系数', model.project.commonAreaFactor],
    ['业主租金', '是否支付', model.ownerRent?.enabled ? '是' : '否'], ['业主租金', '租赁标的', ownerRentLeaseLabels[model.ownerRent?.leaseType] || '仅物业租赁'],
    ['业主租金', '土地计价方式', model.ownerRent?.landPricingMode === 'unit' ? '按面积单价' : '按月度总额'],
    ['业主租金', '土地面积（㎡）', model.ownerRent?.landArea || 0], ['业主租金', '土地单价（元/㎡/月）', model.ownerRent?.landUnitRent || 0],
    ['业主租金', '土地月租金（万元/月）', model.ownerRent?.landMonthlyRent || 0], ['业主租金', '土地支付月数', model.ownerRent?.landPaymentMonths || 0],
    ['业主租金', '物业计价方式', model.ownerRent?.propertyPricingMode === 'unit' ? '按面积单价' : '按月度总额'],
    ['业主租金', '物业面积（㎡）', model.ownerRent?.propertyArea || 0], ['业主租金', '物业单价（元/㎡/月）', model.ownerRent?.propertyUnitRent || 0],
    ['业主租金', '物业月租金（万元/月）', model.ownerRent?.propertyMonthlyRent || 0], ['业主租金', '物业支付月数', model.ownerRent?.propertyPaymentMonths || 0],
    ['业主租金', '递增方式', ownerRentGrowthLabels[model.ownerRent?.growthMode] || '不复递增'],
    ['业主租金', '递增率', model.ownerRent?.growthRate || 0], ['业主租金', '每年增加额（万元/年）', model.ownerRent?.annualIncrease || 0],
    ['成本', '前期工程单价（元/㎡）', model.costs.preconstructionRate], ['成本', '土建工程单价（元/㎡）', model.costs.constructionRate],
    ['成本', '装修单价（元/㎡）', model.costs.fitoutRate], ['成本', '设备单价（元/㎡）', model.costs.equipmentRate],
    ['运营', '首年出租率', model.operations.occupancyY1], ['运营', '第二年出租率', model.operations.occupancyY2],
    ['运营', '稳定期出租率', model.operations.stableOccupancy], ['运营', '租金递增方式', growthModeLabels[formulas.rentGrowthMode] || formulas.rentGrowthMode],
    ['运营', '租金年递增率', model.operations.rentGrowth], ['运营', '租金递增周期（阶梯）', model.operations.rentStepYears],
    ['运营', '租金阶梯递增率', model.operations.rentStepRate],
    ['运营', '首年物业管理费单价（元/㎡/月）', model.revenues.propertyFee], ['运营', '物业管理费递增方式', growthModeLabels[formulas.propertyFeeGrowthMode] || formulas.propertyFeeGrowthMode],
    ['运营', '物业管理费年递增率', model.operations.propertyFeeGrowth], ['运营', '物业管理费递增周期（阶梯）', model.operations.propertyFeeStepYears], ['运营', '物业管理费阶梯递增率', model.operations.propertyFeeStepRate],
    ['运营', '首年商业管理费单价（元/㎡/月）', model.revenues.commercialManagementFee], ['运营', '商业管理费递增方式', growthModeLabels[formulas.commercialManagementGrowthMode] || formulas.commercialManagementGrowthMode],
    ['运营', '商业管理费年递增率', model.operations.commercialManagementGrowth], ['运营', '商业管理费递增周期（阶梯）', model.operations.commercialManagementStepYears], ['运营', '商业管理费阶梯递增率', model.operations.commercialManagementStepRate],
    ['运营', '默认中央空调费单价（元/㎡/月）', model.revenues.centralAcFee], ['运营', '中央空调费递增方式', growthModeLabels[formulas.centralAcGrowthMode] || formulas.centralAcGrowthMode],
    ['运营', '中央空调费年递增率', model.operations.centralAcGrowth], ['运营', '中央空调费递增周期（阶梯）', model.operations.centralAcStepYears], ['运营', '中央空调费阶梯递增率', model.operations.centralAcStepRate],
    ['运营成本', '办公行政年度金额（万元/年）', s.stableOfficeCost || 0], ['运营成本', '办公行政月均金额（万元/月）', s.monthlyOfficeCost || 0],
    ['招商费用', '渠道核算方式', s.channelCalculationMode === 'area_rent' ? '渠道面积×首年月租金×倍数' : '直接金额'], ['招商费用', '渠道招商面积比例', s.channelAreaRatio || 0],
    ['招商费用', '渠道招商面积（㎡）', s.channelArea || 0], ['招商费用', '采用首年月租金（元/㎡/月）', s.channelRentPerSqmMonth || 0],
    ['招商费用', '首年月租金倍数', s.channelCommissionMonths || 0], ['招商费用', '渠道及代理费年度金额（万元/年）', s.annualChannelFee || 0], ['招商费用', '渠道及代理费月均（万元/月）', s.monthlyChannelFee || 0],
    ['运营成本参考', '运营标准', model.operations.opexPreset?.standard || 'standard'], ['运营成本参考', '管理模式', model.operations.opexPreset?.managementMode || 'mixed'],
    ['运营成本参考', '所在地参考', model.operations.opexPreset?.locationLabel || model.project.location],
    ...(result.propertyServiceBreakdown || []).map(item => ['物业服务', `${item.name}模式`, item.modeLabel || PROPERTY_SERVICE_MODE_LABELS[item.mode] || item.mode]),
    ['物业服务', '第三方综合管理费（万元/年）', s.annualOutsourcedManagementFee || 0], ['物业服务', '年度物业服务总成本（万元/年）', s.annualPropertyServiceTotal || 0],
    ['税费', '租金增值税', model.taxes.vatRent], ['税费', '房产税（从租）', model.taxes.propertyTaxRateRent], ['税费', '企业所得税', model.taxes.corporateTax],
    ['融资', '债务比例', model.finance.debtRatio], ['融资', '贷款利率', model.finance.loanRate], ['估值', '折现率', model.valuation.discountRate],
    ['公式', '租金增长方式', formulas.rentGrowthMode], ['公式', '物业管理费增长方式', formulas.propertyFeeGrowthMode], ['公式', '商业管理费增长方式', formulas.commercialManagementGrowthMode], ['公式', '中央空调费增长方式', formulas.centralAcGrowthMode], ['公式', '建筑折旧年限', formulas.buildingDepreciationYears],
    ['公式', '装修折旧年限', formulas.fitoutDepreciationYears], ['公式', '设备折旧年限', formulas.equipmentDepreciationYears],
    ['公式', '亏损结转年限', formulas.taxLossCarryforwardYears], ['公式', '贷款还款方式', formulas.loanRepaymentMethod],
    ['公式', '退出估值方法', formulas.exitValueMethod], ['公式', '退出收入倍数', formulas.exitRevenueMultiple],
    ['人员', '单位社保公积金比例', model.organization?.socialInsuranceRate], ['人员', '个人社保公积金比例', model.organization?.employeeSocialInsuranceRate], ['人员', '年度薪资月数', model.organization?.annualSalaryMonths || 12],
    ['人员', '个税起征点（元/月）', model.organization?.individualIncomeTaxThresholdMonthly ?? 5000], ['人员', '专项附加扣除（元/人/月）', model.organization?.specialAdditionalDeductionMonthly || 0],
    ['人员', '税前年度工资（万元）', s.annualGrossPayroll || 0], ['人员', '个人社保公积金（万元）', s.annualEmployeeSocialInsurance || 0],
    ['人员', '个人所得税（万元）', s.annualIndividualIncomeTax || 0], ['人员', '员工实发工资（万元）', s.annualNetPayroll || 0],
    ['人员', '单位社保公积金（万元）', s.annualEmployerSocialInsurance || 0], ['人员', '实际人员及服务成本（万元）', s.stableStaffCost || 0],
    ['人员', '人员成本来源', model.operations?.staffCostMode === 'area' ? '按面积快速估算' : '按组织架构薪资倒推'],
    ['人员', '招聘培训费率', model.organization?.recruitmentTrainingRate], ['营销', '核算方式', model.marketingBudget?.amountMode === false ? '旧版权重（建议转换）' : '按金额录入，自动计算权重'],
  ], [18, 28, 20]);
  let buildingConfigs = Array.isArray(model.revenues?.centralAcBuildings)
    ? model.revenues.centralAcBuildings
    : Object.entries(model.revenues?.centralAcBuildings || {}).map(([building, value]) => ({ building, ...(value || {}) }));
  const buildingFloorRows = result.floors || [];
  if (!buildingConfigs.length) {
    buildingConfigs = [...new Set(buildingFloorRows.map(row => String(row.building || '1号楼')))].map(building => ({ building, enabled: false, fee: Number(model.revenues?.centralAcFee || 0) }));
  }
  const buildingChargeWs = addSheet(wb, '楼栋收费设置', [
    ['楼栋', '是否收取中央空调费', '中央空调费单价（元/㎡/月）', '计租面积（㎡）', '物业管理费（元/㎡/月）', '商业管理费（元/㎡/月）', '满租月物业费（元）', '满租月商管费（元）', '满租月空调费（元）', '满租月三项费用合计（元）', '说明'],
    ...buildingConfigs.map(config => {
      const rows = buildingFloorRows.filter(row => String(row.building || '1号楼') === String(config.building || ''));
      const rentArea = rows.reduce((sum, row) => sum + Number(row.rentArea || 0), 0);
      const monthlyProperty = rows.reduce((sum, row) => sum + Number(row.monthlyPropertyFee || 0), 0);
      const monthlyCommercial = rows.reduce((sum, row) => sum + Number(row.monthlyCommercialManagementFee || 0), 0);
      const monthlyCentral = rows.reduce((sum, row) => sum + Number(row.monthlyCentralAcFee || 0), 0);
      const propertyRate = rentArea > 0 ? monthlyProperty / rentArea : 0;
      const commercialRate = rentArea > 0 ? monthlyCommercial / rentArea : 0;
      return [config.building || '1号楼', config.enabled ? '是' : '否', Number(config.fee || 0), roundArea(rentArea), propertyRate, commercialRate, monthlyProperty, monthlyCommercial, monthlyCentral, monthlyProperty + monthlyCommercial + monthlyCentral, config.enabled ? '中央空调费独立计入年度收益' : '不收取中央空调费；物业费和商管费照常计收'];
    }),
    [''],
    ['计算说明', '满租月物业费=Σ(铺位计租面积×物业管理费单价)；满租月商管费=Σ(铺位计租面积×商业管理费单价)；满租月空调费=Σ(铺位计租面积×楼栋空调单价)。年度收益再乘出租率和对应递增因子。'],
  ], [18, 24, 28, 18, 24, 24, 22, 22, 22, 26, 48]);
  setSheetColumnNumberFormat(buildingChargeWs, [2, 3, 4, 5, 6, 7, 8, 9], '0.00');
  const orgExportWs = addSheet(wb, '组织架构与人员成本', [
    ['部门','岗位','编制人数','税前应发月薪（元/月）','社保缴费基数（元/月）','年度薪资月数','税前年度工资（万元）','个人社保公积金（万元）','个人所得税（万元）','实发工资（万元）','单位社保公积金（万元）','企业人员成本（万元）','岗位职责说明'],
    ...(result.positionBreakdown || []).map(x => [x.department, x.name, x.headcount, x.avgMonthlySalary, x.socialInsuranceBaseMonthly ?? x.avgMonthlySalary, x.annualSalaryMonths || model.organization?.annualSalaryMonths || 12, x.grossPayroll, x.employeeSocialInsurance, x.individualIncomeTax, x.netSalary, x.employerSocialInsurance, x.annualCost, x.note]),
    [''],
    ['合计', '', s.stableHeadcount || 0, '', '', '', s.annualGrossPayroll || 0, s.annualEmployeeSocialInsurance || 0, s.annualIndividualIncomeTax || 0, s.annualNetPayroll || 0, s.annualEmployerSocialInsurance || 0, (s.annualGrossPayroll || 0) + (s.annualEmployerSocialInsurance || 0), '未含招聘培训费'],
    ['实际人员及服务成本', '', '', '', '', '', '', '', '', '', '', s.stableStaffCost || 0, `含招聘培训及第三方物业服务管理费`],
    [''],
    ['口径说明', '岗位月薪为税前应发基本月薪；社保公积金按税前月薪作为月缴费基数×12个月估算；年度薪资月数只影响税前工资和应税所得。'],
    ['风险提示', '单位/个人社保公积金比例、缴费基数上下限、个税专项附加扣除及适用政策须按项目属地最新规定和员工实际情况复核，默认值仅为测算参考。'],
  ], [20, 20, 12, 24, 22, 14, 24, 24, 20, 20, 24, 24, 48]);
  setSheetColumnNumberFormat(orgExportWs, [3, 4], '0.00');
  setSheetColumnNumberFormat(orgExportWs, [6, 7, 8, 9, 10, 11], '0.00');
  addSheet(wb, '个税税率表', [
    ['中国居民个人综合所得年度税率表（测算参考）'],
    ['年度应纳税所得额（元）', '税率', '速算扣除数（元）'],
    ...CHINA_IIT_ANNUAL_BRACKETS,
    [''],
    ['计算公式', '个人所得税 = 年度应纳税所得额 × 适用税率 - 速算扣除数'],
    ['年度应纳税所得额', '税前年度工资 - 个人社保公积金 - 个税起征点×12 - 专项附加扣除×12'],
    ['当前个税起征点（元/月）', model.organization?.individualIncomeTaxThresholdMonthly ?? 5000],
    ['当前专项附加扣除（元/人/月）', model.organization?.specialAdditionalDeductionMonthly || 0],
    ['说明', '系统用于年度投资测算；正式申报应以累计预扣预缴和年度汇算结果为准。'],
  ], [32, 18, 22]);
  const propertyServiceWs = addSheet(wb, '物业服务模式', [
    ['服务类别', '服务模式', '自动归类岗位', '编制人数', '岗位基础成本（万元）', '非驻场折算比例', '实际折算比例', '第三方综合管理费率', '折算后岗位成本（万元）', '第三方管理费（万元）', '自营招聘培训费（万元）', '年度服务成本（万元）'],
    ...(result.propertyServiceBreakdown || []).map(item => [item.name, item.modeLabel, (item.positions || []).join('、'), item.headcount, item.basePositionCost, item.nonResidentFactor, item.positionFactor, item.managementFeeRate, item.positionCostAfterFactor, item.managementFee, item.selfRecruitmentTraining, item.serviceCost]),
    [''],
    ['合计', '', '', s.stableHeadcount || 0, s.annualServicePositionBaseCost || 0, '', '', '', '', s.annualOutsourcedManagementFee || 0, (result.propertyServiceBreakdown || []).reduce((sum, item) => sum + Number(item.selfRecruitmentTraining || 0), 0), s.annualPropertyServiceTotal || 0],
    ['说明', '自营=岗位成本+自营招聘培训；第三方常驻=岗位成本×(1+综合管理费率)；第三方非常驻=岗位成本×非驻场折算比例×(1+综合管理费率)。'],
  ], [20, 24, 48, 12, 24, 22, 18, 24, 26, 24, 26, 24]);
  setSheetColumnNumberFormat(propertyServiceWs, [4, 8, 9, 10, 11], '0.00');
  setSheetColumnNumberFormat(propertyServiceWs, [5, 6, 7], '0.00%');
  setSheetColumnNumberFormat(propertyServiceWs, [3], '0');
  const officeBudgetTotal = (result.officeBreakdown || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const leasingBudgetTotal = (result.leasingBreakdown || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const officePeriods = model.officeBudget?.inputPeriods || {};
  const leasingPeriods = model.leasingBudget?.inputPeriods || {};
  const officeKeyByName = Object.fromEntries(OFFICE_BUDGET_DEFS.map(([label, key]) => [label, key]));
  const leasingKeyByName = Object.fromEntries(LEASING_BUDGET_DEFS.map(([label, key]) => [label, key]));
  const officeExportRows = (result.officeBreakdown || []).map(x => {
    const key = officeKeyByName[x.name];
    const period = officePeriods[key] === 'monthly' ? '按月' : '按年';
    return ['办公行政', x.name, period, period === '按月' ? Number(x.value || 0) / 12 : x.value, Number(x.value || 0) / 12, x.value, officeBudgetTotal ? Number(x.value || 0) / officeBudgetTotal : 0, ''];
  });
  const leasingExportRows = (result.leasingBreakdown || []).map(x => {
    const key = leasingKeyByName[x.name];
    const formulaMode = key === 'channelFeeAnnual' && x.calculationMode === 'area_rent';
    const period = formulaMode ? '面积公式' : leasingPeriods[key] === 'monthly' ? '按月' : '按年';
    return ['招商费用', x.name, period, formulaMode || period === '按年' ? x.value : Number(x.value || 0) / 12, Number(x.value || 0) / 12, x.value, leasingBudgetTotal ? Number(x.value || 0) / leasingBudgetTotal : 0, formulaMode ? `渠道面积${Number(x.channelArea || 0).toFixed(2)}㎡；首年月租金${Number(x.rentPerSqmMonth || 0).toFixed(2)}元/㎡；${Number(x.commissionMonths || 0).toFixed(2)}倍` : ''];
  });
  const officeLeasingWs = addSheet(wb, '办公与招商预算', [
    ['类别','费用项目','录入周期','录入金额（万元/期）','月度金额（万元/月）','年度金额（万元/年）','自动权重','说明'],
    ...officeExportRows,
    ...leasingExportRows,
  ], [16, 30, 14, 22, 22, 22, 16, 60]);
  setSheetColumnNumberFormat(officeLeasingWs, [3, 4, 5], '0.00');
  setSheetColumnNumberFormat(officeLeasingWs, [6], '0.00%');
  addSheet(wb, '年度营销预算分解', [
    ['常规年度营销预算'],
    ['营销类别','年度金额（万元）','自动权重','费用内容'],
    ...(result.marketingAllocation || []).map(x => [x.name, x.amount, x.share, x.note]),
    ['常规年度合计', result.summary.annualMarketingBudget || 0, 1, '每年持续发生'],
    [''],
    ['开业首年专项营销'],
    ['开业专项','首年金额（万元）','占首年营销总预算','费用内容'],
    ...(result.openingMarketingAllocation || []).map(x => [x.name, x.amount, x.share, x.note]),
    ['开业首年营销合计', result.summary.firstYearMarketingCost || 0, 1, `常规年度 + 开业专项`],
  ], [24, 20, 20, 60]);
  const operatingCostTotalForExport = (result.operatingCostBreakdown || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  addSheet(wb, '运营成本构成', [
    ['成本项目','年度金额（万元）','占运营成本及税费比例'],
    ...(result.operatingCostBreakdown || []).map(x => [x.name, x.value, operatingCostTotalForExport ? Number(x.value || 0) / operatingCostTotalForExport : 0])
  ], [32, 20, 24]);
  const phaseTotal = Number(s.fullCycleCostExcludingFinancing || 0);
  addSheet(wb, '阶段成本汇总', [
    ['阶段', '成本项目', '金额（万元）', '占全周期成本比例'],
    ...(result.phaseCostBreakdown || []).map(x => [x.stage, x.name, x.value, phaseTotal ? Number(x.value || 0) / phaseTotal : 0]),
    [''],
    ['筹备期', '筹备期投入合计', s.preOpeningInvestment || 0, phaseTotal ? Number(s.preOpeningInvestment || 0) / phaseTotal : 0],
    ['运营期', '运营期经营成本合计', s.operationPeriodOperatingCost || 0, phaseTotal ? Number(s.operationPeriodOperatingCost || 0) / phaseTotal : 0],
    ['运营期', '运营期税费合计', s.operationPeriodTaxes || 0, phaseTotal ? Number(s.operationPeriodTaxes || 0) / phaseTotal : 0],
    ['全周期', '全周期成本（不含融资）', phaseTotal, 1],
    ['融资', '运营期融资利息（参考）', s.operationPeriodInterest || 0, ''],
    ['全周期', '含融资现金成本（参考）', s.fullCycleCashCostIncludingFinancing || 0, ''],
  ], [16, 36, 22, 24]);
  const preBudget = model.preOpeningBudget || {};
  if (preBudget.mode === 'detailed') {
    const socialRate = Math.max(0, Number(preBudget.team?.socialInsuranceRate ?? 0.28));
    const recruitmentRate = Math.max(0, Number(preBudget.team?.recruitmentTrainingRate ?? 0.02));
    const preTeamRows = (preBudget.team?.positions || []).map(item => {
      const headcount = Number(item.headcount || 0);
      const salary = Number(item.monthlySalary || 0);
      const months = Number(item.months || 0);
      const gross = headcount * salary * months / 10000;
      const social = headcount * salary * months * socialRate / 10000;
      const training = (gross + social) * recruitmentRate;
      return [item.department || '', item.position || '', headcount, salary, months, gross, social, training, gross + social + training, item.note || ''];
    });
    const prePropertyRows = (preBudget.property?.services || []).map(item => {
      const headcount = Number(item.headcount || 0);
      const salary = Number(item.monthlySalary || 0);
      const months = Number(item.months || 0);
      const factor = Number(item.nonResidentFactor ?? 0.7);
      const feeRate = Number(item.managementFeeRate ?? 0.12);
      const base = headcount * salary * months * (1 + socialRate) / 10000;
      const positionCost = item.mode === 'non_resident' ? base * factor : base;
      const managementFee = ['resident_outsourced', 'non_resident'].includes(item.mode) ? positionCost * feeRate : 0;
      const selfTraining = item.mode === 'self' ? positionCost * Number(preBudget.property?.selfRecruitmentRate ?? 0.02) : 0;
      return [item.name || '', PROPERTY_SERVICE_MODE_LABELS[item.mode] || item.mode || '', headcount, salary, months, factor, feeRate, positionCost + managementFee + selfTraining];
    });
    const preAdminRows = (preBudget.admin?.items || []).map(item => {
      const amount = Number(item.amount || 0);
      const months = Number(item.months || 0);
      return [item.name || '', amount, item.period === 'monthly' ? '每月' : '一次性总额', months, item.period === 'monthly' ? amount * months / 10000 : amount / 10000, item.note || ''];
    });
    const preOneOffRows = (preBudget.property?.oneOffItems || []).map(item => [item.name || '', Number(item.amount || 0)]);
    const preTeamTotal = preTeamRows.reduce((sum, row) => sum + Number(row[8] || 0), 0);
    const prePropertyServiceTotal = prePropertyRows.reduce((sum, row) => sum + Number(row[7] || 0), 0);
    const preOneOffTotal = preOneOffRows.reduce((sum, row) => sum + Number(row[1] || 0), 0);
    const preAdminTotal = preAdminRows.reduce((sum, row) => sum + Number(row[4] || 0), 0);
    const preWs = addSheet(wb, '筹备期成本明细', [
      ['筹备期成本明细预算'],
      ['单位社保公积金比例', socialRate, '招聘培训费率', recruitmentRate],
      ['筹备团队合计（万元）', preTeamTotal, '筹备物业合计（万元）', prePropertyServiceTotal + preOneOffTotal, '行政开办合计（万元）', preAdminTotal],
      [''],
      ['一、筹备团队人力资源'],
      ['部门', '岗位', '编制', '税前月薪（元/月）', '筹备月数', '税前工资（万元）', '单位社保（万元）', '招聘培训（万元）', '合计（万元）', '说明'],
      ...preTeamRows,
      ['团队合计', '', '', '', '', '', '', '', preTeamTotal, ''],
      [''],
      ['二、筹备期物业工程、保安、保洁'],
      ['服务类别', '服务模式', '编制', '参考月薪（元/月）', '服务月数', '非驻场折算', '综合管理费率', '服务成本（万元）'],
      ...prePropertyRows,
      ['物业服务小计', '', '', '', '', '', '', prePropertyServiceTotal],
      [''],
      ['物业一次性费用', '金额（万元）'],
      ...preOneOffRows,
      ['一次性费用小计', preOneOffTotal],
      ['物业合计', prePropertyServiceTotal + preOneOffTotal],
      [''],
      ['三、行政办公及开办费用'],
      ['费用科目', '金额（元）', '金额口径', '月数', '核算金额（万元）', '说明'],
      ...preAdminRows,
      ['行政开办合计', '', '', '', preAdminTotal, ''],
      [''],
      ['重要说明', '本表为筹备期明细预算，应与合同、招聘计划、物业方案和行政开办清单交叉核对。'],
    ], [24, 22, 14, 24, 14, 20, 20, 20, 20, 56]);
    setSheetColumnNumberFormat(preWs, [3, 5, 6, 7, 8, 15, 20], '0.00');
    setSheetColumnNumberFormat(preWs, [4, 6, 7], '0.00%');
  }
  addSheet(wb, '资金计划', [
    ['资金需求与阶段现金流'],
    ['建议启动资金（万元）', s.recommendedStartupCapital || 0],
    ['项目资金缺口峰值（万元）', s.peakProjectFundingRequirement || 0],
    ['资本金缺口峰值（万元）', s.peakEquityFundingRequirement || 0],
    ['累计现金流转正月份', s.cashFlowBreakEvenMonth || '未在月度计划内转正'],
    ['累计现金流转正年份', s.cashFlowBreakEvenYear || '未在测算期内转正'],
    ['自有资本金（万元）', s.equityCapital || 0],
    ['债务融资（万元）', s.loanAmount || 0],
    ['杠杆倍数', s.leverageMultiple || 0],
    ['项目净现金收益（万元）', s.projectNetCashProfit || 0],
    ['资本金净收益（万元）', s.equityNetCashProfit || 0],
    ['资本金回报倍数', s.equityReturnMultiple || 0],
    ['资本金净收益率', s.equityProfitRate || 0],
    ['股权IRR', s.equityIrr == null ? '不适用' : s.equityIrr],
    [''],
    ['阶段', '项目净现金流（万元）', '资本金净现金流（万元）'],
    ...(result.phaseCashFlowSummary || []).map(x => [x.phase, x.projectCashFlow, x.equityCashFlow]),
    [''],
    ['月份', '阶段', '日历年', '项目净现金流（万元）', '项目累计现金流（万元）', '资本金净现金流（万元）', '资本金累计现金流（万元）'],
    ...(result.monthlyFundingPlan || []).map(x => [x.month, x.phase, x.calendarYear, x.projectCashFlow, x.cumulativeProjectCashFlow, x.equityCashFlow, x.cumulativeEquityCashFlow]),
  ], [20, 32, 22, 26, 28, 28, 30]);
  const formulaRows = [
    ['面积', '总建筑面积', 'IF(手动总建筑面积=0,商铺建筑面积合计×(1+公区系数),手动总建筑面积)', ['IF','SUM'], '先判断是否手动填写总建筑面积；没有则按商铺面积和公区系数推算；结果进入建设投资和单位投资指标计算。', '优先填规划面积或测绘面积；没有时用商铺面积反推。调整公区系数后观察总投资和单位投资变化。', 'project.commonAreaFactor', model.project.commonAreaFactor, '公区系数增加会同步增加建安、装修、设备和规费。'],
    ['租金', '有效出租率', 'IF(运营年=1,首年出租率,IF(运营年<稳定年,第二年出租率,稳定出租率))', ['IF'], '按运营年份选择出租率：首年、爬坡第二年或稳定期；再乘租金、物业费和停车收入。', '出租率按招商计划和同类项目爬坡速度设置。先看首年出租率，再调稳定出租率；两者都会影响NOI和NPV。', 'operations.occupancyY1', model.operations.occupancyY1, '首年出租率影响首年现金流和招商佣金。'],
    ['租金', '租金递增因子', '不递增=1；每年复利=(1+年递增率)^(运营年-1)；每年单利=1+年递增率×(运营年-1)；每N年阶梯=(1+阶梯递增率)^INT((运营年-1)÷N)', ['POWER','INT','IF'], '按所选模式逐年计算租金增长因子，再乘首年满租租金。阶梯模式只在每个N年周期到达时上调。', '有租约递增条款时按条款设置，例如“每3年递增5%”选择阶梯模式并填周期3、递增率5%。租金与销售扣点增长分开管理。', 'formulas.rentGrowthMode', formulas.rentGrowthMode, '增长方式会显著影响后期NOI和退出价值。'],
    ['租金', '首年免租调整', '首年租金×出租率×(1-免租月数÷12)', ['IF','SUM'], '首年免租系数将免租月数换算成年化扣减比例，只影响首年租金收入。', '按实际免租期和装修期填写；免租越长，首年现金流越低，但不改变合同单价。', 'operations.rentFreeMonths', model.operations.rentFreeMonths, '仅影响首年收入及现金流的低点。'],
    ['联营', '保底与扣点取高', 'IF(纯租金,保底,IF(纯扣点,扣点,MAX(保底,扣点)))', ['IF','MAX'], '先按项目或业态选择结算方式；取高模式逐铺比较保底收入和扣点收入，选较高者。', '百货和奥特莱斯常用取高模式；纯租金项目不要重复叠加扣点。先核对每种业态的扣点率和销售基数。', 'project.revenueModel', model.project.revenueModel, '结算方式改变会直接改变租金收入和租户风险分担。'],
    ['投资', '分项工程投资', '总建筑面积×分项单价÷10000', ['SUM','ROUND'], '将前期、建安、装修、设备和其他工程分别按面积乘单价，再汇总为直接工程费。', '以目标成本、造价咨询或合同金额为准。先调建安和装修，再调其他工程；每次调整后查看总投资和NPV。', 'costs.constructionRate', model.costs.constructionRate, '建安单价是最主要的投资敏感项。'],
    ['投资', '预备费', '直接工程费×预备费费率', ['SUM'], '直接工程费汇总后乘预备费费率，作为不可预见费用。', '通常3%–8%；方案深度越浅、建设风险越高，预备费应越充分。', 'project.contingencyRate', model.project.contingencyRate, '预备费增加会提高总投资和折旧基数。'],
    ['投资', '铺底流动资金', '稳定运营成本估算×铺底比例', ['SUM','MAX'], '先估算稳定期物业、能耗、商管、行政和维修成本，再乘铺底比例。', '按运营资金周转需求设置；通常3%左右，招商爬坡慢时可适当提高。', 'costs.workingCapitalRate', model.costs.workingCapitalRate, '流动资金属于总投资但不形成长期资产。'],
    ['阶段成本', '筹备期与运营期成本', '筹备期投入=项目总投资；运营期成本=Σ各运营年度经营成本+税费；全周期成本（不含融资）=筹备期投入+运营期成本', ['SUM'], '按项目推进阶段分别汇总，避免把筹备期资本投入与运营期经营成本混在一起。', '核对筹备期工程和开办费是否完整，再检查运营期人员、物业、招商、营销、维保和税费；融资利息单独列示。', 'project.operationYears', model.project.operationYears, '用于判断投资峰值、运营成本和全周期现金流压力。'],
    ['收入', '物业管理费收入', 'Σ铺位计租面积×物业管理费单价×12×出租率×物业费递增因子÷10000', ['SUM','POWER','INT','IF'], '逐铺读取物业管理费覆盖值，没有覆盖值时使用项目默认单价；再按物业费独立递增模式逐年调整。', '按物业服务合同设置单价与递增周期，与商业管理费和空调费分开核对。', 'formulas.propertyFeeGrowthMode', formulas.propertyFeeGrowthMode, '物业费递增会提高后期收入、销项税和NOI。'],
    ['收入', '商业管理费收入', 'Σ铺位计租面积×商业管理费单价×12×出租率×商管费递增因子÷10000', ['SUM','POWER','INT','IF'], '逐铺读取商业管理费覆盖值，没有覆盖值时使用项目默认单价；按商管费独立递增模式逐年调整。', '按商业管理委托合同设置单价与递增周期；如项目不收商管费则填0。', 'formulas.commercialManagementGrowthMode', formulas.commercialManagementGrowthMode, '商管费独立增加服务性收入，并单独计算增值税。'],
    ['收入', '中央空调使用费收入', 'Σ开启楼栋的铺位计租面积×楼栋空调单价×12×出租率×空调费递增因子÷10000', ['SUM','POWER','INT','IF'], '按楼栋开关判断是否收费，逐铺读取空调费覆盖值；未开启楼栋按0核算。', '先梳理哪些楼栋实际提供中央空调并收费，再按能源、运维成本和合同调整楼栋单价及递增率。', 'formulas.centralAcGrowthMode', formulas.centralAcGrowthMode, '空调费为独立收入来源，不计入物业费或商业管理费。'],
    ['收入', '多经与停车收入', '租金×多经比例+车位数×月租×12×出租率÷10000', ['SUM'], '多经收入按租金比例计算，停车收入按车位数量和月租计算，两者相加进入营业收入。', '按广告、场地、临时点位和停车收费方案调整；没有数据时可保守设置为0。', 'revenues.otherIncomeRatio', model.revenues.otherIncomeRatio, '属于其他收入，需单独计算增值税。'],
    ['运营', '运营成本', '物业+能耗+商管+行政+营销+维修+保险+坏账+其他+业主租金', ['SUM','MIN'], '各成本分项按面积、收入或资产原值计算，汇总后扣减可抵扣进项税，形成不含税运营成本。', '按运营预算和物业合同调整。先核对人员编制、能耗和维保，再调营销、其他费用和业主租金。', 'operations.propertyOpsCost', model.operations.propertyOpsCost, '运营成本直接扣减NOI。'],
    ['运营', '年度招商及运营成本调整', '当年招商费用=基准×招商系数+额外额；常规运营成本=基准×运营系数+年度额外成本', ['IF','SUM'], '系统按运营年度读取设置，对招商费用和常规运营成本分别应用系数，并叠加额外成本。', '在年度调整表中按年份填写；100%表示不调整，超过100%表示增加，低于100%表示压缩。', 'operations.annualCostAdjustments', '按年设置', '用于体现开业爬坡、招商计划、团队扩编或成本优化。'],
    ['成本', '土地及物业租赁支出', '按面积：面积×元/㎡/月÷10000；按总额：直接取月租金；再乘支付月数并按合同递增', ['SUM','IF','POWER'], '土地和物业分别选择按面积单价或月度总额计价，形成月度租金后乘以支付月数，再按所选递增方式逐年计算。', '分别核对土地合同和物业合同的计价方式、面积、单价或月租金总额、支付月数、递增方式和递增率，并检查免租期和解约条款。', 'ownerRent.propertyMonthlyRent', model.ownerRent?.propertyMonthlyRent || 0, '土地及物业租赁支出属于运营成本，直接扣减NOI。'],
    ['税费', '销项税与进项税', '销项=Σ[含税收入÷(1+税率)×税率]；进项=MIN(销项,可抵扣成本×比例×税率÷(1+税率))', ['SUM','MIN'], '先按租金、物业、其他收入和联营扣点分别计算销项税，再估算可抵扣进项税，差额形成增值税净额。', '税率和抵扣比例按项目属地、合同类型和税务认定设置；不能直接套用全国统一值。', 'taxes.vatRent', model.taxes.vatRent, '增值税净额影响附加税和现金流。'],
    ['税费', '房产税', 'IF(从租,不含税租金×12%,房产原值×(1-扣除比例)×1.2%)', ['IF'], '根据从租或从价方式选择公式；从租按不含税租金，从价按房产余值。', '先确认税务认定的计征方式；从租和从价结果差异较大，不能同时使用。', 'taxes.propertyTaxMethod', model.taxes.propertyTaxMethod, '房产税是商业地产重要持有税。'],
    ['税费', '土地使用税', '占地面积×单位税额÷10000', ['ROUND'], '按项目占地面积和土地等级对应单位税额计算，金额换算为万元。', '按项目所在地最新土地等级和税额标准填写；不同地块可能适用不同税额。', 'taxes.landUseTax', model.taxes.landUseTax, '属于年度固定税费。'],
    ['税费', '企业所得税', 'MAX(0,税前利润-可结转亏损)×所得税率', ['MAX','IF'], '税前利润先抵减可结转亏损，再乘企业所得税率；亏损按设定年限结转。', '所得税率按适用税法填写；亏损结转年限和税务口径应与财务顾问确认。', 'taxes.corporateTax', model.taxes.corporateTax, '影响税后净利润和股权现金流。'],
    ['融资', '贷款额与利息', '贷款额=总投资×债务比例；利息=(期初余额+当年提款÷2)×年利率', ['SUM'], '先按总投资和债务比例确定贷款额，再按建设期提款和期初余额计算每年利息。', '按融资方案调整债务比例、利率和提款节奏；提高杠杆可能提高股权IRR，但增加偿债压力。', 'finance.debtRatio', model.finance.debtRatio, '影响股权投入、利息和股权现金流。'],
    ['融资', '还款方式', '等额本金：贷款额÷期限；先息后本：期末一次还本', ['IF'], '等额本金在宽限期后逐年偿还本金；先息后本在贷款期末一次性偿还本金。', '按融资合同设置；先息后本前期现金流压力小，但期末还本压力集中。', 'formulas.loanRepaymentMethod', formulas.loanRepaymentMethod, '影响本金流出年度分布。'],
    ['折旧', '年折旧', '建筑投资÷建筑年限+装修投资÷装修年限+设备投资÷设备年限', ['SUM'], '三类资产分别按各自年限直线折旧，再合计为年度折旧。', '折旧年限按会计政策、税法规定和资产寿命设置；折旧不是现金支出，但会影响所得税。', 'formulas.buildingDepreciationYears', formulas.buildingDepreciationYears, '折旧变化影响税前利润、所得税和净利润。'],
    ['退出', 'NOI资本化率法', '期末NOI÷退出资本化率×(1-退出税费率)', ['MAX','IF'], '用期末稳定NOI除以资本化率得到毛退出价值，再扣退出税费。', '资本化率按同类资产成交和估值判断；资本化率上升会降低退出价值。', 'valuation.exitCapRate', model.valuation.exitCapRate, '影响最后一年现金流、NPV和IRR。'],
    ['退出', '收入倍数法', '期末营业收入×退出收入倍数×(1-退出税费率)', ['SUM','IF'], '用期末营业收入乘退出倍数得到退出价值，再扣退出税费。', '收入倍数应保守，并与NOI资本化率法交叉验证；不要只用较高方法支撑投资结论。', 'formulas.exitRevenueMultiple', formulas.exitRevenueMultiple, '影响期末退出价值和项目NPV。'],
    ['收益', 'NPV', 'Σ[CFt÷(1+r)^t]', ['NPV','POWER','SUM'], '把每年项目现金流按折现率折到当前时点后相加；建设期现金流出也纳入。', '折现率采用企业投资门槛或同类项目资本成本；NPV大于0才表示达到门槛。', 'valuation.discountRate', model.valuation.discountRate, 'NPV是项目可行性判断的核心指标。'],
    ['收益', 'IRR', '求使NPV(IRR)=0的折现率', ['IRR','二分法'], '系统在合理区间内反复二分，寻找让NPV等于0的折现率。', 'IRR高于企业门槛才通过初筛；现金流异常时IRR可能无解，应结合NPV。', 'valuation.discountRate', model.valuation.discountRate, '用于比较项目自身收益能力。'],
    ['收益', '静态回收期', '累计现金流由负转正的插值年份', ['LOOKUP','IF'], '逐年累计现金流，找到由负转正的年份，并按当年现金流比例插值。', '回收期越短，资金占用风险越低；可与融资期限和退出计划对照。', 'project.operationYears', model.project.operationYears, '用于判断投资回收速度。'],
    ['人员', '税前年度工资与社保', '税前年度工资=Σ(人数×税前应发月薪×年度薪资月数)；个人社保=Σ(税前月薪×12×个人比例)；单位社保=Σ(税前月薪×12×单位比例)', ['SUM'], '岗位月薪按税前应发口径录入。年度多薪增加税前工资；社保公积金按每月缴费基数缴纳12个月，不随13/15薪重复增加缴费月数。', '按定编定岗方案填写人数和税前应发月薪；年度薪资月数可填12、13、14或15薪。单位和个人社保公积金比例必须按项目属地险种、基数和年度政策调整，不能直接套用默认值。', 'organization.employeeSocialInsuranceRate', model.organization?.employeeSocialInsuranceRate, '决定税前工资、员工实发和企业人员成本。'],
    ['人员', '个人所得税与实发工资', '年度应纳税所得额=税前年度工资-个人社保公积金-5000×12-专项附加扣除×12；个税=应纳税所得额×税率-速算扣除数；实发=税前工资-个人社保-个税', ['MAX','IF'], '采用中国居民个人综合所得七级年度超额累进税率：3%、10%、20%、25%、30%、35%、45%，并减去对应速算扣除数。', '核对个税起征点、专项附加扣除和年度薪资结构。系统按年度总额估算，正式申报应采用累计预扣预缴和年度汇算结果。', 'organization.individualIncomeTaxThresholdMonthly', model.organization?.individualIncomeTaxThresholdMonthly ?? 5000, '影响员工个人所得税和实发工资，不直接改变企业现金工资总额。'],
    ['人员', '企业人员成本及招聘培训', '企业人员成本=税前年度工资+单位社保公积金；含招聘培训成本=企业人员成本×(1+招聘培训费率)', ['SUM','IF'], '企业实际承担的是税前工资、单位社保公积金，以及另计的招聘培训支出；个人社保和个税从员工税前工资中代扣，不重复增加企业成本。', '将组织架构倒推的企业人员成本与属地薪酬水平、招聘计划和培训预算交叉核对。', 'organization.recruitmentTrainingRate', model.organization?.recruitmentTrainingRate, '企业人员成本直接进入年度运营成本和NOI。'],
    ['物业', '物业服务模式与第三方管理费', '自营=岗位基础成本+自营招聘培训；第三方常驻=岗位基础成本×(1+综合管理费率)；第三方非常驻=岗位基础成本×非驻场折算比例×(1+综合管理费率)', ['IF','SUM','MIN'], '系统先按部门/岗位自动归集物业工程、保安、保洁岗位，以岗位工资和单位社保成本为基础，再按服务模式增加招聘培训费或第三方综合管理费。', '自营适合直接管理团队；第三方常驻适合稳定驻场服务；非常驻适合巡检和专项服务。第三方综合管理费率应按合同覆盖管理费、利润、保险、装备、培训及税费。', 'propertyService.security.managementFeeRate', model.propertyService?.security?.managementFeeRate, '服务模式直接影响人员与服务成本、NOI、NPV和IRR。'],
    ['人员', '人员成本来源', '按组织架构=Σ企业人员成本+招聘培训费；按面积=总建筑面积×人员成本单价×12', ['IF','SUM'], '选择组织架构模式后，管理团队及物业人员成本由HR薪资明细倒推。', '前期可用面积快速估算，招商运营阶段应使用组织架构薪资成本。', 'operations.staffCostMode', model.operations?.staffCostMode || 'organization', '决定管理团队人员成本采用薪资倒推还是面积估算。'],
    ['成本录入', '年度与月度金额换算', '按年录入：月度金额=录入金额÷12；年度金额=录入金额。按月录入：年度金额=录入金额×12；月度金额=录入金额', ['IF','SUM'], '办公预算和招商预算可逐项选择年度或月度录入，系统统一转成年化金额参与NOI和现金流。', '同一张表可混合年度和月度录入。切换周期只换算显示口径，不改变年化金额；重新输入金额后才会改变年化值。', 'officeBudget.inputPeriods', '逐项设置', '影响运营成本、NOI、NPV和IRR。'],
    ['招商', '渠道面积与首年月租金佣金', '渠道招商面积=项目总建筑面积×渠道面积比例；渠道及代理费=渠道招商面积×首年月租金单价×月租金倍数÷10000', ['IF','SUM'], '例如项目总建筑面积2,000㎡、渠道比例50%，渠道面积为1,000㎡；再乘合同首年月租金单价和佣金月数。', '渠道面积比例按实际招商委托范围设置；首年月租金单价填0时自动采用项目当前平均租金。首开招商佣金已在投资中单列，如为同一合同避免重复计入。', 'leasingBudget.channelCalculationMode', model.leasingBudget?.channelCalculationMode, '渠道佣金会直接增加年度招商费用和运营成本。'],
    ['办公', '年度办公行政成本', '租金+水电通讯+IT软件+办公用品+差旅招待+其他', ['SUM'], '逐项汇总年度办公行政预算。', '按行政预算和已签合同调整；办公室租金、IT服务和差旅标准应与团队规模匹配。', 'officeBudget.officeRentAnnual', model.officeBudget?.officeRentAnnual, '办公成本直接扣减NOI。'],
    ['招商', '年度招商费用', '渠道代理+活动+物料+差旅+平台+其他；续租佣金按周期另计', ['SUM','MOD','IF'], '年度固定招商预算与续租佣金分开计算，避免重复。', '按招商策略和渠道政策填写；首开佣金、年度招商费用和续租佣金分别管理。', 'leasingBudget.channelFeeAnnual', model.leasingBudget?.channelFeeAnnual, '招商费用直接扣减运营现金流。'],
    ['营销', '年度营销金额与自动权重', '常规年度=营销推广+商业美陈+媒体宣传+会员营销；首年=常规年度+导视导览+开业美陈；自动权重=单项金额÷对应合计', ['SUM','IF'], '营销费用全部由用户按金额录入，系统不再按权重倒推预算。常规四项每年发生，开业两项只在运营第1年计入。', '直接按年度推广计划、合同和报价填写金额。权重用于检查结构，不需要手工调整；某项金额变化后，合计、占比、NOI和现金流会自动重算。', 'marketingBudget.annualItems', '按金额录入', '营销费用直接扣减NOI；开业专项只影响首年现金流。'],
    ['维保', '年度维保费用', '资产原值×维修费率+电梯+暖通+消防+景观+其他专项维保', ['SUM'], '日常维修按费率计提，专项维保按年度合同金额单列，两者相加。', '维修费率通常按资产原值0.5%–2%；专项维保按合同和年检要求填写。', 'maintenanceBudget.elevatorAnnual', model.maintenanceBudget?.elevatorAnnual, '维保成本直接扣减NOI。'],
    ['敏感性', 'NPV敏感性矩阵', 'NPV=f(租金系数,投资系数)，按MIN~MAX和STEP生成', ['SEQUENCE','NPV'], '分别改变租金和投资系数，逐个重新计算项目NPV，形成矩阵。', '上下限覆盖悲观和乐观情景，通常从±10%开始，步长5%；重点观察NPV由负转正的临界点。', 'formulas.sensitivityRentMin', formulas.sensitivityRentMin, '用于识别项目最敏感的假设。'],
  ];
  addSheet(wb, '公式与参数', [
    ['模块','公式名称','公式表达式','使用函数','函数注解','计算逻辑','调整建议','参数路径','当前值','参数影响'],
    ...formulaRows.map(row => [row[0],row[1],row[2],row[3].join(' / '),exportFunctionDescription(row[3]),row[4],row[5],row[6],row[7],row[8]])
  ], [14, 22, 68, 22, 60, 70, 70, 34, 18, 48]);
  addSheet(wb, '函数注解', [
    ['函数','语法','含义','项目示例','调整注意事项'],
    ...Object.entries(EXPORT_FUNCTIONS).map(([name, f]) => [name, f.syntax, f.meaning, f.example, f.note])
  ], [16, 38, 55, 55, 70]);
  addSheet(wb, '投资构成', [['项目', '金额（万元）', '占比'], ...result.investmentBreakdown.map(x => [x.name, x.value, s.totalInvestment ? x.value / s.totalInvestment : 0])], [28, 18, 14]);
  const floorWs = addSheet(wb, '楼层均价', [['楼栋', '楼层', '计租口径', '建筑面积（㎡）', '实用面积（㎡）', '计租面积（㎡）', '平均月租金（元/㎡/月）', '物业费单价（元/㎡/月）', '商管费单价（元/㎡/月）', '空调费单价（元/㎡/月）', '满租月租金（万元）', '满租月物业费（元）', '满租月商管费（元）', '满租月空调费（元）', '满租月三项费用合计（元）', '满租年三项费用（万元）', '租金收入占比'], ...(result.floors || []).map(x => { const monthlyWan = Number(x.monthlyRevenue || x.monthlyRent || 0) / 10000; const monthlyProperty = Number(x.monthlyPropertyFee || 0); const monthlyCommercial = Number(x.monthlyCommercialManagementFee || 0); const monthlyCentral = Number(x.monthlyCentralAcFee || 0); return [x.building || '1号楼', x.name, x.rentAreaBasis === 'building' ? '建筑面积' : x.rentAreaBasis === 'leasable' ? '实用面积' : '混合口径', roundArea(x.buildingArea), roundArea(x.leasableArea), roundArea(x.rentArea), x.weightedRent || x.avgRent, Number(x.propertyFee || 0), Number(x.commercialManagementFee || 0), Number(x.centralAcFee || 0), monthlyWan, monthlyProperty, monthlyCommercial, monthlyCentral, monthlyProperty + monthlyCommercial + monthlyCentral, (monthlyProperty + monthlyCommercial + monthlyCentral) * 12 / 10000, s.totalMonthlyRent ? (Number(x.monthlyRevenue || x.monthlyRent || 0) / s.totalMonthlyRent) : 0]; })], [12, 10, 14, 18, 18, 18, 24, 22, 22, 22, 22, 22, 22, 22, 26, 24, 16]);

  setSheetColumnNumberFormat(floorWs, [3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15], '0.00');
  const exportShopWs = addSheet(wb, '商铺明细', [['楼栋', '铺位号', '楼层', '计租口径', '业态', '状态', '建筑面积（㎡）', '实用面积（㎡）', '计租面积（㎡）', '租金单价（元/㎡/月）', '物业管理费（元/㎡/月）', '商业管理费（元/㎡/月）', '中央空调费（元/㎡/月）', '满租月物业费（元）', '满租月商管费（元）', '满租月空调费（元）', '满租月三项费用合计（元）', '满租年三项费用（万元）', '条件', '满租月租金收益（万元）'], ...(result.shops || []).map(x => [x.building || '1号楼', x.id, x.floor, x.rentAreaBasis === 'building' ? '建筑面积' : '实用面积', x.category, x.status || '', roundArea(x.buildingArea), roundArea(x.leasableArea), roundArea(x.rentArea), x.rent, Number(x.propertyFee || 0), Number(x.commercialManagementFee || 0), Number(x.centralAcFee || 0), Number(x.monthlyPropertyFee || 0), Number(x.monthlyCommercialManagementFee || 0), Number(x.monthlyCentralAcFee || 0), Number(x.monthlyServiceFee || 0), Number(x.monthlyServiceFee || 0) * 12 / 10000, (x.appliedConditions || []).join('、'), x.monthlyRevenue])], [12, 16, 10, 14, 16, 12, 18, 18, 18, 22, 24, 24, 24, 22, 22, 22, 26, 24, 24, 24]);

  setSheetColumnNumberFormat(exportShopWs, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], '0.00');
  addSheet(wb, '租赁联营规则', [
    ['业态', '结算方式', '当前保底租金（元/㎡/月）', '保底租金常规区间', '当前销售基数（元/㎡/月）', '销售基数常规区间（元/㎡/月）', '当前扣点率', '扣点率常规区间', '扣点收益（元/㎡/月）', '业态系数', '行业基准方案', '基准版本', '销售修正系数', '数据来源'],
    ...(model.categories || []).map(item => {
      const salesMin = item.benchmarkSalesMin == null ? '' : Number(item.benchmarkSalesMin);
      const salesMax = item.benchmarkSalesMax == null ? '' : Number(item.benchmarkSalesMax);
      const rateMin = item.benchmarkConcessionMin == null ? '' : Number(item.benchmarkConcessionMin);
      const rateMax = item.benchmarkConcessionMax == null ? '' : Number(item.benchmarkConcessionMax);
      const rentMin = item.benchmarkRentMin == null ? '' : Number(item.benchmarkRentMin);
      const rentMax = item.benchmarkRentMax == null ? '' : Number(item.benchmarkRentMax);
      return [item.name, item.revenueMode || 'inherit', Number(item.rent || 0), rentMin === '' ? '' : `${rentMin}–${rentMax}`, Number(item.salesPerSqmMonth || 0), salesMin === '' ? '' : `${salesMin}–${salesMax}`, Number(item.concessionRate || 0), rateMin === '' ? '' : `${rateMin}–${rateMax}`, Number(item.salesPerSqmMonth || 0) * Number(item.concessionRate || 0), Number(item.factor || 1), settlementPresetLabels[item.benchmarkPreset] || '', item.benchmarkVersion || '', item.benchmarkSalesFactor == null ? '' : Number(item.benchmarkSalesFactor), item.benchmarkSource || ''];
    }),
    [''],
    ['数据口径', model.settlementBenchmark?.source || '行业常规基准；正式招商前应以本地竞品、品牌流水、合同扣点和实地访谈校准。'],
    ['重要边界', '行业基准和地区/商业侦测修正不等同于当地实测销售大数据；未接入授权租户流水数据库。'],
  ], [18, 18, 26, 22, 28, 30, 16, 20, 24, 14, 28, 14, 16, 72]);
  const settlementRuleWs = wb.Sheets['租赁联营规则'];
  setSheetColumnNumberFormat(settlementRuleWs, [2, 4, 6, 8, 9, 12], '0.00');
  setSheetColumnNumberFormat(settlementRuleWs, [7], '0.00%');
  addSheet(wb, '周边市场分析', [['指标', '结果'], ['项目平均租金（元/㎡/月）', result.marketSummary.projectAverageRent], ['市场加权均价（元/㎡/月）', result.marketSummary.weightedAverageRent], ['市场中位数（元/㎡/月）', result.marketSummary.medianRent], ['市场25分位（元/㎡/月）', result.marketSummary.p25Rent], ['市场75分位（元/㎡/月）', result.marketSummary.p75Rent], ['项目定价位置', result.marketSummary.position], ...(result.marketSummary.conclusions || []).map((x, i) => [`结论${i + 1}`, x])], [30, 80]);
  const detection = model.market?.lastAnalysis || {};
  addSheet(wb, '3-5公里商业侦测', [
    ['指标','结果','说明'],
    ['侦测评分', detection.detectionScore, '综合商业、锚点、交通、居住、配套和业态多样性'],
    ['商圈等级', detection.marketGrade, 'A级/成熟、B级/成长、C级/培育、D级/远端或潜力'],
    ['商业类POI', detection.commercialCount, '购物、餐饮、娱乐、服务、酒店、金融和商务等'],
    ['直接竞品', detection.competitorCount, '购物中心、百货、超市和传统市场'],
    ['商业锚点', detection.anchorCount, '购物中心、百货、影院、酒店等'],
    ['交通配套', detection.transportCount, '公共交通、轨道站点和停车设施'],
    ['居住社区', detection.residentialCount, '住宅社区和居住片区'],
    ['竞争判断', detection.competitionLevel, '基于商业密度和竞品数量'],
    [''], ['分圈层统计'], ['圈层','商业POI','直接竞品','交通配套','居住片区','业态数量'],
    ...(detection.ringStats || []).map(x => [x.label, x.commercialCount, x.competitorCount, x.transportCount, x.residentialCount, x.categoryCount]),
    [''], ['周边业态结构'], ['业态','POI数量'],
    ...(detection.categories || []).map(x => [x.name, x.count]),
    [''], ['主要竞品'], ['名称','业态','距离（km）'],
    ...(detection.competitors || []).map(x => [x.name, x.category, x.distanceKm]),
    [''], ['侦测结论'], ['结论'],
    ...(detection.conclusions || []).map(x => [x]),
    [''], ['商业机会'], ['机会'],
    ...(detection.opportunities || []).map(x => [x]),
    [''], ['数据边界', detection.coverageNote || '公开地图数据不含人口、销售额和授权租金；正式决策需结合实地调查。']
  ], [22, 30, 70]);
  addSheet(wb, '竞品租金样本', [['样本名称', '地址', '楼层', '业态', '可租赁面积（㎡）', '月租金（元/㎡/月）', '数据日期', '距项目（km）', '备注'], ...(model.market?.comparables || []).map(x => [x.name, x.address, x.floor, x.category, x.leasableArea, x.rent, x.date, x.distanceKm, x.note])], [24, 30, 10, 16, 18, 22, 14, 14, 28]);
  const annualYears = Number(model.project.operationYears || result.annual?.length || 20);
  addSheet(wb, `年度收益${annualYears}年`, [['运营年', '阶段', '日历年', '租金递增因子', '物业费递增因子', '商管费递增因子', '空调费递增因子', '租金收入', '物业管理费收入', '商业管理费收入', '中央空调费收入', '三项费用合计', '营业收入', '人员及服务成本', '第三方物业服务管理费', '办公行政', '招商费用系数', '招商费用', '运营成本系数', '额外成本', '营销费用', '维保费用', '土地租赁支出', '物业租赁支出', '租赁支出合计', '其他运营及税费', '运营成本', '税费', 'NOI', '项目现金流', '累计项目现金流'], ...(result.annual || []).map(x => [x.opYear, x.phase || '运营期', x.calendarYear, x.rentGrowthFactor, x.propertyFeeGrowthFactor, x.commercialManagementGrowthFactor, x.centralAcGrowthFactor, x.rentRevenue, x.propertyManagementRevenue, x.commercialManagementRevenue, x.centralAcRevenue, x.propertyRevenue, x.revenue, x.staffCost, x.outsourcedManagementFee || 0, x.officeCost, x.leasingAdjustmentFactor, x.leasingCost, x.operationsAdjustmentFactor, x.extraOperatingCost, x.marketingCost, x.maintenanceCost, x.ownerLandRent, x.ownerPropertyRent, x.ownerRent, x.operatingCost - x.staffCost - x.officeCost - x.leasingCost - x.marketingCost - x.maintenanceCost - (x.ownerRent || 0) - (x.extraOperatingCost || 0), x.operatingCost, x.taxes, x.noi, x.projectCashFlow, x.cumulativeProjectCashFlow])], [10,16,10,14,16,16,16,16,20,20,20,18,16,18,22,16,16,16,16,14,16,16,16,16,16,22,16,14,16,18,22]);

  addSheet(wb, '敏感性分析', [['租金变化 ↓ / 投资变化 →', ...(result.sensitivity.capexSteps || []).map(v => (v * 100).toFixed(0) + '%')], ...(result.sensitivity.rentSteps || []).map((rent, i) => [(rent * 100).toFixed(0) + '%', ...(result.sensitivity.npvMatrix[i] || [])])], [24, 14, 14, 14, 14, 14]);
  addSheet(wb, '分析结论', [['类型', '内容'], ...(result.analysis.bullets || []).map(x => ['分析结论', x]), ...(result.analysis.recommendations || []).map(x => ['建议', x]), ...(result.diagnostics || []).map(x => [x.level, `${x.title}：${x.detail}`])], [18, 100]);
  return workbookBlob(wb);
}

function addSlideTitle(slide, title, subtitle = '') {
  slide.addText(title, { x: 0.65, y: 0.38, w: 12.0, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 22, bold: true, color: '103B33' });
  if (subtitle) slide.addText(subtitle, { x: 0.67, y: 0.86, w: 11.8, h: 0.3, fontFace: 'Microsoft YaHei', fontSize: 9, color: '66736F' });
  slide.addShape('rect', { x: 0.65, y: 1.18, w: 12.0, h: 0.025, fill: { color: 'D6A84B' }, line: { color: 'D6A84B' } });
}

async function exportPPT(result) {
  const pptx = new PptxGenJS();
  const s = result.summary;
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '多多 · 商业地产';
  pptx.subject = '商业地产投资测算汇报';
  pptx.title = `${s.projectName || '商业项目'}投资测算`;
  pptx.company = '多多 · 商业地产';
  pptx.lang = 'zh-CN';
  pptx.theme = { headFontFace: 'Microsoft YaHei', bodyFontFace: 'Microsoft YaHei', lang: 'zh-CN' };

  let slide = pptx.addSlide();
  slide.background = { color: '103B33' };
  slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 0.65, w: 0.08, h: 5.9, fill: { color: 'D6A84B' }, line: { color: 'D6A84B' } });
  slide.addText('多多 · 商业地产', { x: 1.05, y: 0.65, w: 5, h: 0.35, fontFace: 'Microsoft YaHei', fontSize: 10, color: 'D6A84B', charSpacing: 2 });
  slide.addText(s.projectName || '商业项目', { x: 1.05, y: 1.7, w: 10.8, h: 1.0, fontFace: 'Microsoft YaHei', fontSize: 34, bold: true, color: 'FFFFFF' });
  slide.addText('投资测算与收益分析汇报', { x: 1.05, y: 2.8, w: 8.0, h: 0.55, fontFace: 'Microsoft YaHei', fontSize: 21, color: 'C8D8D3' });
  slide.addText(s.location || '', { x: 1.05, y: 3.55, w: 10.5, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 12, color: 'A9C0BA' });
  slide.addText(`${new Date().toLocaleDateString('zh-CN')}｜人民币｜金额单位：万元`, { x: 1.05, y: 5.95, w: 8, h: 0.3, fontFace: 'Microsoft YaHei', fontSize: 9, color: '88A7A0' });

  slide = pptx.addSlide();
  addSlideTitle(slide, '核心结论', '基于当前输入假设自动生成');
  const kpis = [
    ['项目总投资', `${s.totalInvestment.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元`],
    ['项目IRR', s.projectIrr == null ? '不适用' : `${(s.projectIrr * 100).toFixed(2)}%`],
    ['项目NPV', `${s.projectNpv.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元`],
    ['稳定期NOI', `${s.stableNoi.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元/年`],
    ['NOI回报率', `${(s.noiYield * 100).toFixed(2)}%`],
    ['静态回收期', s.staticPayback == null ? '未回收' : `${s.staticPayback.toFixed(2)} 年`],
  ];
  kpis.forEach((item, i) => {
    const x = 0.75 + (i % 3) * 4.1;
    const y = 1.65 + Math.floor(i / 3) * 1.75;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.65, h: 1.3, fill: { color: i < 3 ? 'F7ECD4' : 'E5F0EB' }, line: { color: i < 3 ? 'E9D6AC' : 'C9DDD4', width: 0.5 }, radius: 0.08 });
    slide.addText(item[0], { x: x + 0.22, y: y + 0.15, w: 3.1, h: 0.28, fontFace: 'Microsoft YaHei', fontSize: 10, color: '66736F' });
    slide.addText(item[1], { x: x + 0.22, y: y + 0.55, w: 3.1, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 21, bold: true, color: '103B33' });
  });
  slide.addText(`初筛状态：${s.status}`, { x: 0.78, y: 5.45, w: 11.7, h: 0.5, fontFace: 'Microsoft YaHei', fontSize: 14, bold: true, color: s.status === '通过初筛' ? '1D6B57' : 'B94A48', fill: { color: 'FBF8F1' }, margin: 0.12 });

  slide = pptx.addSlide();
  addSlideTitle(slide, '投资构成', '土地、工程、装修、预备费与开办资金');
  slide.addChart(pptx.ChartType.doughnut, [{ name: '投资构成', labels: result.investmentBreakdown.map(x => x.name), values: result.investmentBreakdown.map(x => x.value) }], {
    x: 0.75, y: 1.5, w: 6.1, h: 4.9, holeSize: 55, showLegend: true, legendPos: 'r', showValue: false,
    chartColors: ['103B33', '1D6B57', 'D6A84B', '8EA9A1', 'B7A888', '527C70', 'E4CF9F'],
    showTitle: false,
  });
  let py = 1.68;
  for (const item of result.investmentBreakdown) {
    slide.addText(item.name, { x: 7.0, y: py, w: 2.6, h: 0.25, fontFace: 'Microsoft YaHei', fontSize: 10, color: '17211E' });
    slide.addText(`${item.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元`, { x: 9.7, y: py, w: 2.4, h: 0.25, fontFace: 'Microsoft YaHei', fontSize: 10, bold: true, color: '103B33', align: 'right' });
    py += 0.52;
  }

  slide = pptx.addSlide();
  addSlideTitle(slide, `${Number(result.model.project.operationYears || result.annual?.length || 20)}年营业收入与NOI`, '金额单位：万元');
  slide.addChart(pptx.ChartType.line, [
    { name: '营业收入', labels: result.annual.map(x => `Y${x.opYear}`), values: result.annual.map(x => x.revenue) },
    { name: 'NOI', labels: result.annual.map(x => `Y${x.opYear}`), values: result.annual.map(x => x.noi) },
  ], { x: 0.7, y: 1.45, w: 12.0, h: 4.75, showLegend: true, legendPos: 't', showTitle: false, lineDataSymbol: 'none', chartColors: ['1D6B57', 'D6A84B'], catAxisLabelFontSize: 8, valAxisLabelFontSize: 9 });
  slide.addText(`稳定期费用性收入：物业管理费 ${Number(s.stablePropertyManagementIncome || 0).toFixed(2)} 万元/年｜商业管理费 ${Number(s.stableCommercialManagementIncome || 0).toFixed(2)} 万元/年｜中央空调费 ${Number(s.stableCentralAcIncome || 0).toFixed(2)} 万元/年｜三项合计 ${Number(s.stablePropertyFeeIncome || 0).toFixed(2)} 万元/年`, { x: 0.72, y: 6.35, w: 11.95, h: 0.5, fontFace: 'Microsoft YaHei', fontSize: 8, color: '17211E', fill: { color: 'E5F0EB' }, margin: 0.08, valign: 'mid' });

  slide = pptx.addSlide();
  addSlideTitle(slide, '楼栋与楼层面积及租金汇总', `租金核算口径：${result.model.project.rentAreaBasis === 'building' ? '建筑面积' : '实用面积（套内/租赁面积）'}`);
  const floorSummaryRows = [['楼栋','楼层','建筑㎡','实用㎡','计租㎡','平均租金','年租金(万元)','占比'], ...(result.floors || []).slice(0, 12).map(x => [x.building || '1号楼', x.name, Number(x.buildingArea || 0).toFixed(0), Number(x.leasableArea || 0).toFixed(0), Number(x.rentArea || 0).toFixed(0), Number(x.weightedRent || x.avgRent || 0).toFixed(2), (Number(x.monthlyRevenue || x.monthlyRent || 0) * 12 / 10000).toFixed(2), `${(Number(x.monthlyRevenue || x.monthlyRent || 0) / Math.max(Number(s.totalMonthlyRent || 0), 1) * 100).toFixed(2)}%`])];
  slide.addTable(floorSummaryRows, { x: 0.55, y: 1.4, w: 12.3, colW: [1.25, 0.9, 1.35, 1.35, 1.35, 1.55, 1.9, 1.2], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 7.5, margin: 0.03, rowH: 0.28, autoFit: false });
  if ((result.floors || []).length > 12) slide.addText(`仅展示前12个楼层，完整数据见Excel。`, { x: 0.7, y: 6.65, w: 5, h: 0.25, fontFace: 'Microsoft YaHei', fontSize: 8, color: '66736F' });

  slide = pptx.addSlide();
  addSlideTitle(slide, '租赁与联营规则', `行业基准：${settlementPresetLabels[result.model.settlementBenchmark?.preset] || '购物中心行业常规'}｜销售修正 ×${Number(result.model.settlementBenchmark?.salesFactor || 1).toFixed(2)}`);
  const catRows = [['业态', '保底租金', '销售基数 / 常规区间', '扣点率 / 常规区间', '扣点收益/㎡', '结算方式'], ...(result.model.categories || []).map(x => {
    const salesRange = x.benchmarkSalesMin == null ? '' : `${x.benchmarkSalesMin}–${x.benchmarkSalesMax}`;
    const rateRange = x.benchmarkConcessionMin == null ? '' : `${(Number(x.benchmarkConcessionMin) * 100).toFixed(1)}%–${(Number(x.benchmarkConcessionMax) * 100).toFixed(1)}%`;
    return [x.name, `${Number(x.rent || 0).toFixed(1)}`, `${Number(x.salesPerSqmMonth || 0).toFixed(0)}
${salesRange}`, `${(Number(x.concessionRate || 0) * 100).toFixed(1)}%
${rateRange}`, Number(x.salesPerSqmMonth || 0) * Number(x.concessionRate || 0), x.revenueMode];
  })];
  slide.addTable(catRows, { x: 0.55, y: 1.4, w: 12.2, colW: [1.25, 1.35, 2.5, 2.5, 1.5, 1.5], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 7.6, margin: 0.04, rowH: 0.55, autoFit: false });
  slide.addText(`数据来源：${result.model.settlementBenchmark?.source || '公开行业常规区间与项目测算经验'}。已按项目地区能级和3–5公里商业侦测评分做初步销售修正；不代表当地租户实测流水，正式招商前应以竞品流水、品牌报价和合同扣点校准。`, { x: 0.55, y: 6.45, w: 12.2, h: 0.5, fontFace: 'Microsoft YaHei', fontSize: 7.2, color: '66736F', fill: { color: 'FBF8F1' }, margin: 0.08 });

  slide = pptx.addSlide();
  const serviceModeShort = { self: '自营', resident_outsourced: '第三方常驻', non_resident: '第三方非常驻' };
  const serviceModeText = (result.propertyServiceBreakdown || []).map(item => `${item.name.replace('服务', '')}${serviceModeShort[item.mode] || item.mode}`).join('｜');
  addSlideTitle(slide, '组织架构与人员成本', result.model.operations?.staffCostMode === 'area'
    ? `当前按面积估算企业人员成本 ${(result.summary.stableStaffCost || 0).toFixed(2)} 万元/年｜组织架构为测算参考`
    : `合计编制 ${result.summary.stableHeadcount || 0} 人｜税前工资 ${(result.summary.annualGrossPayroll || 0).toFixed(2)}｜员工实发 ${(result.summary.annualNetPayroll || 0).toFixed(2)}｜实际人员服务成本 ${(result.summary.stableStaffCost || 0).toFixed(2)} 万元/年｜${serviceModeText}`);
  const orgRows = [
    ['部门','岗位构成','编制','税前工资','个人社保','个税','实发工资','单位社保','企业成本'],
    ...(result.organizationBreakdown || []).map(x => [x.name, (x.positions || []).map(p => `${p.name}${Number(p.headcount) > 1 ? `×${p.headcount}` : ''}`).join('、'), `${x.headcount}人`, (x.grossPayroll || 0).toFixed(2), (x.employeeSocialInsurance || 0).toFixed(2), (x.individualIncomeTax || 0).toFixed(2), (x.netSalary || 0).toFixed(2), (x.employerSocialInsurance || 0).toFixed(2), (x.annualCost || 0).toFixed(2)]),
  ];
  slide.addTable(orgRows, { x: 0.55, y: 1.42, w: 12.2, colW: [1.35, 2.75, 0.65, 1.05, 1.05, 0.85, 1.05, 1.05, 1.2], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 6.8, margin: 0.03, rowH: 0.43, autoFit: false });
  slide.addText(`金额单位：万元/年。月薪按税前应发口径；社保公积金按税前月薪×12个月×配置比例估算。第三方综合管理费合计 ${(result.summary.annualOutsourcedManagementFee || 0).toFixed(2)} 万元；比例、基数及物业服务合同须按属地政策和实际条款复核。`, { x: 0.55, y: 6.55, w: 12.2, h: 0.32, fontFace: 'Microsoft YaHei', fontSize: 7.2, color: '66736F' });

  slide = pptx.addSlide();
  addSlideTitle(slide, '项目启动资金与资本金杠杆', `建议启动资金 ${(result.summary.recommendedStartupCapital || 0).toFixed(2)} 万元｜资本金 ${(result.summary.equityCapital || 0).toFixed(2)} 万元×${(result.summary.leverageMultiple || 0).toFixed(2)}倍｜资本金净收益 ${(result.summary.equityNetCashProfit || 0).toFixed(2)} 万元`);
  const fundingCards = [
    ['建议启动资金', result.summary.recommendedStartupCapital || 0, '含资金缺口峰值及安全垫'],
    ['项目资金缺口峰值', result.summary.peakProjectFundingRequirement || 0, '项目口径'],
    ['资本金缺口峰值', result.summary.peakEquityFundingRequirement || 0, '资本金口径'],
    ['累计现金流转正', result.summary.cashFlowBreakEvenYear || '测算期内未转正', result.summary.cashFlowBreakEvenMonth ? `月度计划第${result.summary.cashFlowBreakEvenMonth}个月` : '按年现金流'],
  ];
  fundingCards.forEach((card, index) => {
    const x = 0.65 + index * 3.12;
    slide.addText(`${card[0]}\n${typeof card[1] === 'number' ? card[1].toFixed(2) + ' 万元' : card[1]}\n${card[2]}`, { x, y: 1.35, w: 2.9, h: 1.05, fontFace: 'Microsoft YaHei', fontSize: 10, bold: true, color: index === 0 ? '76591C' : '103B33', fill: { color: index === 0 ? 'F7ECD4' : 'F7FAF8' }, margin: 0.12, breakLine: false });
  });
  const phaseCashRows = [['阶段', '项目净现金流（万元）', '资本金净现金流（万元）'], ...(result.phaseCashFlowSummary || []).map(x => [x.phase, Number(x.projectCashFlow || 0).toFixed(2), Number(x.equityCashFlow || 0).toFixed(2)])];
  slide.addTable(phaseCashRows, { x: 0.65, y: 2.7, w: 11.9, colW: [3.3, 4.3, 4.3], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 9, margin: 0.05, rowH: 0.43, autoFit: false });
  slide.addText('资金计划按建设期、筹备招商期和开业首年均匀铺排；实际应结合工程付款、招商合同、融资提款和租金收取节奏调整。', { x: 0.65, y: 5.8, w: 11.9, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 8, color: '66736F', fill: { color: 'FBF8F1' }, margin: 0.1 });

  slide = pptx.addSlide();
  addSlideTitle(slide, '年度运营成本与营销预算', '稳定运营年｜金额单位：万元/年');
  const costRows = [['成本项目','金额'], ...(result.operatingCostBreakdown || []).map(x => [x.name, x.value.toFixed(2)])];
  slide.addTable(costRows, { x: 0.65, y: 1.4, w: 5.9, colW: [4.4, 1.5], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 7.5, margin: 0.035, rowH: 0.29, autoFit: false });
  const marketingRows = [
    ['营销类别','年度金额','自动权重'],
    ...(result.marketingAllocation || []).map(x => [x.name, x.amount.toFixed(2), `${(Number(x.share || 0) * 100).toFixed(2)}%`]),
    ...(result.openingMarketingAllocation || []).map(x => [`开业·${x.name}`, x.amount.toFixed(2), `首年${(Number(x.share || 0) * 100).toFixed(2)}%`]),
  ];
  slide.addTable(marketingRows, { x: 6.8, y: 1.4, w: 5.8, colW: [3.0, 1.4, 1.4], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 7.2, margin: 0.035, rowH: 0.34, autoFit: false });
  slide.addText(`年度营销 ${(result.summary.stableMarketingCost || 0).toFixed(2)} 万元｜开业首年 ${(result.summary.firstYearMarketingCost || 0).toFixed(2)} 万元｜办公 ${(result.summary.stableOfficeCost || 0).toFixed(2)} 万元｜招商 ${(result.summary.stableLeasingCost || 0).toFixed(2)} 万元｜维保 ${(result.summary.stableMaintenanceCost || 0).toFixed(2)} 万元`, { x: 6.8, y: 5.85, w: 5.8, h: 0.55, fontFace: 'Microsoft YaHei', fontSize: 7.2, color: '66736F', fill: { color: 'FBF8F1' }, margin: 0.08 });

  slide = pptx.addSlide();
  const detection = result.model.market?.lastAnalysis || {};
  addSlideTitle(slide, '3–5公里商业侦测', `综合评分 ${detection.detectionScore || 0}/100｜${detection.marketGrade || '待评估'}｜${detection.competitionLevel || ''}`);
  slide.addText(`商业POI ${detection.commercialCount || 0}｜直接竞品 ${detection.competitorCount || 0}｜商业锚点 ${detection.anchorCount || 0}｜交通配套 ${detection.transportCount || 0}｜居住社区 ${detection.residentialCount || 0}`, { x: 0.7, y: 1.35, w: 12.0, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 10, color: '17211E', fill: { color: 'E5F0EB' }, margin: 0.1 });
  const ringRows = [['圈层','商业POI','直接竞品','交通配套','居住片区','业态数'], ...(detection.ringStats || []).map(x => [x.label, x.commercialCount, x.competitorCount, x.transportCount, x.residentialCount, x.categoryCount])];
  slide.addTable(ringRows, { x: 0.7, y: 1.95, w: 5.8, colW: [1.2, 1.0, 1.0, 1.0, 1.0, 0.8], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 8, margin: 0.04, rowH: 0.52, autoFit: false });
  slide.addText(`侦测结论\n${(detection.conclusions || []).map(x => `• ${x}`).join('\n')}\n\n商业机会\n${(detection.opportunities || []).map(x => `• ${x}`).join('\n')}`, { x: 6.8, y: 1.95, w: 5.8, h: 4.2, fontFace: 'Microsoft YaHei', fontSize: 9, color: '17211E', fill: { color: 'FBF8F1' }, margin: 0.14, valign: 'top', breakLine: false });
  slide.addText('公开地图数据不含人口、销售额和授权租金，正式决策需结合实地客流、租户访谈和授权市场数据。', { x: 0.7, y: 6.35, w: 11.9, h: 0.4, fontFace: 'Microsoft YaHei', fontSize: 8, color: '66736F' });

  slide = pptx.addSlide();
  addSlideTitle(slide, '项目租金与市场位置', '竞品租金样本用于校准项目一铺一价');
  const ms = result.marketSummary;
  slide.addText(`项目平均租金\n${ms.projectAverageRent.toFixed(2)} 元/㎡/月`, { x: 0.75, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'E5F0EB' }, margin: 0.16, breakLine: false });
  slide.addText(`市场加权均价\n${ms.weightedAverageRent.toFixed(2)} 元/㎡/月`, { x: 4.45, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'F7ECD4' }, margin: 0.16 });
  slide.addText(`市场中位数\n${ms.medianRent.toFixed(2)} 元/㎡/月`, { x: 8.15, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'FBF8F1' }, margin: 0.16 });
  slide.addText((ms.conclusions || []).map((x, i) => `${i + 1}. ${x}`).join('\n\n'), { x: 0.8, y: 3.15, w: 11.7, h: 2.7, fontFace: 'Microsoft YaHei', fontSize: 12, color: '17211E', breakLine: false, valign: 'top', margin: 0.05 });

  slide = pptx.addSlide();
  addSlideTitle(slide, 'NPV敏感性分析', '租金与投资同时变动时的项目NPV（万元）');
  const matrixRows = [['租金↓ / 投资→', ...(result.sensitivity.capexSteps || []).map(v => `${(v * 100).toFixed(0)}%`)], ...(result.sensitivity.rentSteps || []).map((rent, i) => [`${(rent * 100).toFixed(0)}%`, ...(result.sensitivity.npvMatrix[i] || []).map(v => v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }))])];
  slide.addTable(matrixRows, { x: 1.15, y: 1.55, w: 10.9, colW: [2.0, 1.75, 1.75, 1.75, 1.75, 1.75], border: { color: 'D9E1F2', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 10, align: 'center', valign: 'mid', margin: 0.06, rowH: 0.46 });

  slide = pptx.addSlide();
  addSlideTitle(slide, '测算公式（一）', '面积、租金、投资与运营成本');
  slide.addTable([
    ['模块', '公式', '使用函数'],
    ['面积', 'GBA = IF(手动值为0, 商铺面积×(1+公区系数), 手动值)', 'IF / SUM'],
    ['租金', '有效出租率 = IF(首年, 首年出租率, IF(稳定前, 第二年出租率, 稳定出租率))', 'IF'],
    ['租金', '租金收入 = 满租月租金×12×出租率×免租系数×租金递增因子', 'POWER / INT / SUM'],
    ['物业费', '物业管理费收入 = Σ计租面积×物业费单价×12×出租率×物业费递增因子', 'POWER / INT / SUM'],
    ['商管费', '商业管理费收入 = Σ计租面积×商管费单价×12×出租率×商管费递增因子', 'POWER / INT / SUM'],
    ['空调费', '中央空调费收入 = Σ开启楼栋计租面积×楼栋空调单价×12×出租率×空调费递增因子', 'IF / POWER / INT / SUM'],
    ['联营', '测算收入 = IF(纯租金, 保底, IF(纯扣点, 扣点, MAX(保底,扣点)))', 'IF / MAX'],
    ['投资', '分项工程投资 = 总建筑面积×分项单价÷10000', 'SUM / ROUND'],
    ['投资', '预备费 = 直接工程费×预备费率', 'SUM'],
    ['运营', 'NOI = 不含税收入 - 不含税运营成本 - 税费', 'SUM / MIN / MAX'],
  ], { x: 0.7, y: 1.45, w: 12.0, colW: [1.2, 8.7, 2.1], border: { color: 'D9E1F2', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 9, margin: 0.05, rowH: 0.48, autoFit: false });

  slide = pptx.addSlide();
  addSlideTitle(slide, '测算公式（二）', '税费、融资、折旧、现金流与收益指标');
  slide.addTable([
    ['模块', '公式', '使用函数'],
    ['税费', '销项税 = Σ[含税收入÷(1+税率)×税率]；进项税 = MIN(销项税,可抵扣成本×比例×税率÷(1+税率))', 'SUM / MIN'],
    ['房产税', 'IF(从租, 不含税租金×12%, 房产原值×(1-扣除比例)×1.2%)', 'IF'],
    ['融资', '贷款利息 = (期初余额+当年提款÷2)×年利率；等额本金=贷款额÷期限', 'IF / MIN'],
    ['折旧', '年折旧 = 建筑投资÷年限 + 装修投资÷年限 + 设备投资÷年限', 'SUM'],
    ['所得税', '所得税 = MAX(0, 税前利润-可结转亏损)×所得税率', 'MAX / IF'],
    ['现金流', '项目CF = NOI - 资本化改造 - 所得税 + 期末退出价值', 'SUM / IF'],
    ['收益', 'NPV = Σ[CFt÷(1+r)^t]；IRR：NPV(IRR)=0；回收期按累计CF插值', 'NPV / IRR / LOOKUP'],
    ['敏感性', 'NPV=f(租金系数,投资系数)，在MIN~MAX间按STEP生成矩阵', 'SEQUENCE / NPV'],
  ], { x: 0.7, y: 1.45, w: 12.0, colW: [1.2, 8.7, 2.1], border: { color: 'D9E1F2', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 9, margin: 0.05, rowH: 0.48, autoFit: false });

  slide = pptx.addSlide();
  addSlideTitle(slide, '函数与公式注解', '语法、含义和调整时应注意的事项');
  const functionRows = [['函数', '语法与含义', '调整注意'], ...Object.entries(EXPORT_FUNCTIONS).map(([name, f]) => [name, `${f.syntax}\n${f.meaning}`, f.note])];
  slide.addTable(functionRows, { x: 0.7, y: 1.4, w: 12.0, colW: [1.3, 6.7, 4.0], border: { color: 'D9E1F2', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 7.5, margin: 0.04, rowH: 0.36, autoFit: false });

  slide = pptx.addSlide();
  addSlideTitle(slide, '分析结论与行动建议', '供内部评审和下一步决策使用');
  slide.addText((result.analysis.bullets || []).map((x, i) => `• ${x}`).join('\n\n'), { x: 0.72, y: 1.45, w: 5.85, h: 5.35, fontFace: 'Microsoft YaHei', fontSize: 10, color: '17211E', breakLine: false, valign: 'top', fill: { color: 'FBF8F1' }, margin: 0.16 });
  slide.addText((result.analysis.recommendations || []).map((x, i) => `${i + 1}. ${x}`).join('\n\n'), { x: 6.78, y: 1.45, w: 5.85, h: 5.35, fontFace: 'Microsoft YaHei', fontSize: 10, color: '17211E', breakLine: false, valign: 'top', fill: { color: 'F7ECD4' }, margin: 0.16 });

  const output = await pptx.write({ outputType: 'blob' });
  return output instanceof Blob ? output : new Blob([output], { type: PPTX_MIME });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyPOI(tags) {
  const shop = tags.shop;
  const amenity = tags.amenity;
  const leisure = tags.leisure;
  const office = tags.office;
  if (shop === 'mall') return '购物中心';
  if (shop === 'department_store') return '百货商场';
  if (['supermarket', 'convenience', 'grocery', 'greengrocer'].includes(shop)) return '超市便利';
  if (amenity === 'marketplace') return '传统市场';
  if (['clothes', 'shoes', 'jewelry', 'cosmetics', 'electronics', 'furniture', 'sports', 'books', 'toys', 'gift', 'bags', 'watches'].includes(shop)) return '零售商业';
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity)) return '餐饮';
  if (amenity === 'cinema') return '影院';
  if (['fitness_centre', 'sports_centre'].includes(leisure)) return '健身运动';
  if (['hotel', 'guest_house'].includes(tags.tourism)) return '酒店';
  if (['bank', 'atm', 'bureau_de_change'].includes(amenity)) return '银行金融';
  if (['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'].includes(amenity)) return '医疗健康';
  if (['school', 'college', 'university', 'kindergarten'].includes(amenity)) return '教育培训';
  if (['parking', 'fuel', 'charging_station'].includes(amenity)) return '停车交通';
  if (['bus_station', 'taxi'].includes(amenity) || tags.public_transport || ['station', 'subway_entrance'].includes(tags.railway)) return '公共交通';
  if (['park', 'playground'].includes(leisure)) return '公园休闲';
  if (office || ['coworking', 'company'].includes(office)) return '商务办公';
  if (shop || amenity === 'post_office' || amenity === 'laundry' || amenity === 'hairdresser') return '生活服务';
  if (tags.building === 'residential' || tags.landuse === 'residential') return '住宅社区';
  return null;
}

const COMMERCIAL_CATEGORIES = new Set(['购物中心','百货商场','超市便利','传统市场','零售商业','餐饮','影院','健身运动','酒店','银行金融','生活服务','商务办公']);
const TRANSPORT_CATEGORIES = new Set(['公共交通','停车交通']);
const SUPPORT_CATEGORIES = new Set(['医疗健康','教育培训','公园休闲','住宅社区']);

const LIUZHOU_MARKET = {
  provider: 'OpenStreetMap Overpass（缓存演示）',
  center: { lat: 24.341202, lon: 109.430294 },
  radiusKm: 3,
  totalPoi: 35,
  commercialCount: 35,
  competitorCount: 11,
  anchorCount: 9,
  transportCount: 0,
  supportCount: 0,
  residentialCount: 0,
  densityPerKm2: 1.2,
  detectionScore: 58,
  marketGrade: 'C级培育商圈',
  competitionLevel: '商业供给密集',
  ringStats: [
    {label:'0–1公里',minKm:0,maxKm:1,totalPoi:8,commercialCount:8,competitorCount:3,transportCount:0,residentialCount:0,categoryCount:4},
    {label:'1–3公里',minKm:1,maxKm:3,totalPoi:27,commercialCount:27,competitorCount:8,transportCount:0,residentialCount:0,categoryCount:6},
    {label:'3–5公里',minKm:3,maxKm:5,totalPoi:0,commercialCount:0,competitorCount:0,transportCount:0,residentialCount:0,categoryCount:0}
  ],
  conclusions: ['3公里范围内识别到35个相关商业POI，直接竞品约11个。','商业供给较密集，建议通过业态组合、品牌和场景体验形成差异化。'],
  opportunities: ['可结合竞品租金样本和实地客流进一步寻找餐饮、体验和生活服务的差异化机会。'],
  categories: [
    { name: '健身运动', count: 11 }, { name: '餐饮', count: 7 }, { name: '传统市场', count: 7 },
    { name: '酒店', count: 4 }, { name: '购物中心', count: 4 }, { name: '影院', count: 2 },
  ],
  competitors: [
    { name: '柳柴赏石文化产业园', category: '传统市场', distanceKm: 1.7 },
    { name: '王府井购物中心', category: '购物中心', distanceKm: null },
    { name: '保利商业广场', category: '购物中心', distanceKm: 2.0 },
    { name: '金东花卉市场', category: '传统市场', distanceKm: 2.2 },
    { name: '万象城', category: '购物中心', distanceKm: 2.4 },
    { name: '顺兴达花鸟市场', category: '传统市场', distanceKm: 2.6 },
  ],
  summary: '3公里范围内识别到35个相关商业POI，其中购物中心、百货、超市和传统市场等直接竞品约11个。',
  coverageNote: '当前为已缓存的演示数据；正式决策应结合最新实地踏勘和授权市场数据库。',
};

async function marketAnalysis(lat, lon, radiusKm) {
  const radiusM = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:35];(
    nwr["shop"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|cinema|marketplace|bank|atm|bureau_de_change|pharmacy|hospital|clinic|doctors|dentist|school|college|university|kindergarten|bus_station|taxi|parking|fuel|charging_station|post_office|laundry|hairdresser"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["leisure"~"fitness_centre|sports_centre|park|playground"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["tourism"~"hotel|guest_house|attraction"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["office"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["public_transport"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    nwr["railway"~"station|subway_entrance"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    way["landuse"="residential"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    relation["landuse"="residential"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    way["building"="residential"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
    relation["building"="residential"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});
  );out tags center;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter',
  ];
  let payload = null;
  let lastError = null;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await nativeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json' },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = await response.json();
      break;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  if (!payload) {
    if (Math.abs(lat - 24.341202) < 0.05 && Math.abs(lon - 109.430294) < 0.05) {
      const fallback = { ...LIUZHOU_MARKET };
      fallback.requestedRadiusKm = radiusKm;
      fallback.effectiveRadiusKm = 3;
      fallback.fallbackUsed = radiusKm !== 3;
      fallback.coverageNote = `实时数据源暂时不可用，当前展示柳州项目缓存侦测结果。${lastError ? String(lastError.message || lastError) : ''}`;
      return fallback;
    }
    throw new Error(`周边商业侦测服务暂时不可用：${lastError?.message || '全部数据节点无响应'}`);
  }

  const counts = {};
  const competitors = [];
  const namedPois = [];
  const ringDefs = [
    { label: '0–1公里', min: 0, max: 1 },
    { label: '1–3公里', min: 1, max: 3 },
    { label: '3–5公里', min: 3, max: 5 },
  ];
  const rings = ringDefs.map(item => ({ ...item, total: 0, commercial: 0, competitors: 0, transport: 0, residential: 0, categories: new Set() }));
  const seen = new Set();
  for (const element of payload.elements || []) {
    const key = `${element.type}:${element.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = element.tags || {};
    const category = classifyPOI(tags);
    if (!category) continue;
    const center = element.center || {};
    const poiLat = center.lat ?? element.lat;
    const poiLon = center.lon ?? element.lon;
    const distanceKm = poiLat != null && poiLon != null ? haversineKm(lat, lon, Number(poiLat), Number(poiLon)) : null;
    if (distanceKm != null && distanceKm > radiusKm) continue;
    counts[category] = (counts[category] || 0) + 1;
    const ring = rings.find(item => distanceKm != null && distanceKm <= item.max && distanceKm > item.min) || rings[0];
    ring.total += 1;
    ring.categories.add(category);
    if (COMMERCIAL_CATEGORIES.has(category)) ring.commercial += 1;
    if (TRANSPORT_CATEGORIES.has(category)) ring.transport += 1;
    if (category === '住宅社区') ring.residential += 1;
    const name = tags.name || tags['name:zh'] || tags['name:en'] || '';
    const record = { name: name || '', category, distanceKm, lat: poiLat, lon: poiLon };
    if (name) namedPois.push(record);
    if (['购物中心', '百货商场', '超市便利', '传统市场'].includes(category)) {
      ring.competitors += 1;
      if (name) competitors.push(record);
    }
  }
  const commercialCount = Object.entries(counts).reduce((sum, [name, count]) => sum + (COMMERCIAL_CATEGORIES.has(name) ? count : 0), 0);
  const competitorCount = ['购物中心', '百货商场', '超市便利', '传统市场'].reduce((sum, name) => sum + (counts[name] || 0), 0);
  const transportCount = ['公共交通', '停车交通'].reduce((sum, name) => sum + (counts[name] || 0), 0);
  const supportCount = ['医疗健康', '教育培训', '公园休闲', '住宅社区', '银行金融'].reduce((sum, name) => sum + (counts[name] || 0), 0);
  const residentialCount = counts['住宅社区'] || 0;
  const anchorCount = ['购物中心', '百货商场', '影院', '酒店'].reduce((sum, name) => sum + (counts[name] || 0), 0);
  const density = radiusKm > 0 ? commercialCount / (Math.PI * radiusKm * radiusKm) : 0;
  const diversity = Object.keys(counts).length;
  const supplyScore = Math.min(24, commercialCount * 0.55);
  const anchorScore = Math.min(18, anchorCount * 2.2);
  const transportScore = Math.min(15, transportCount * 1.4);
  const supportScore = Math.min(15, supportCount * 0.45);
  const residentialScore = Math.min(10, residentialCount * 0.35);
  const diversityScore = Math.min(10, diversity * 1.1);
  const densityScore = Math.min(8, density * 3.0);
  const detectionScore = Math.round(Math.min(100, supplyScore + anchorScore + transportScore + supportScore + residentialScore + diversityScore + densityScore));
  const marketGrade = detectionScore >= 78 ? 'A级成熟商圈' : detectionScore >= 62 ? 'B级成长商圈' : detectionScore >= 46 ? 'C级培育商圈' : 'D级远端/潜力商圈';
  const competitionLevel = competitorCount >= 18 || commercialCount >= 120 ? '商业供给高度密集' : competitorCount >= 10 || commercialCount >= 70 ? '商业供给密集' : competitorCount >= 5 ? '中等竞争' : '竞争相对有限';
  const sortedCompetitors = competitors.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 30);
  const conclusions = [];
  conclusions.push(`3公里内识别到${commercialCount}个商业类POI、${competitorCount}个直接竞品、${anchorCount}个商业锚点。`);
  if (competitionLevel.includes('密集')) conclusions.push('周边直接竞品密集，项目需要明确差异化定位，避免仅以租金竞争。');
  else if (competitionLevel === '竞争相对有限') conclusions.push('直接竞品相对有限，但仍需验证有效客流和消费支撑。');
  else conclusions.push('周边形成一定商业集聚，需要通过业态组合和品质形成差异化。');
  if (transportCount < 5) conclusions.push('公共交通和停车配套识别数量偏少，建议补充实地交通与停车调查。');
  else conclusions.push(`识别到${transportCount}个公交、轨道或停车配套，交通可达性具备一定基础。`);
  if (residentialCount < 8) conclusions.push('公开地图住宅社区识别数量偏少，人口和消费数据需通过授权数据源补充。');
  else conclusions.push(`识别到${residentialCount}个住宅社区/居住片区，具备一定社区消费基础。`);
  const opportunities = [];
  if (residentialCount >= 15) opportunities.push('居住社区密集，可重点布局社区餐饮、亲子、生活服务和日常零售。');
  if (transportCount >= 12) opportunities.push('交通节点较多，可强化目的性业态和周末客流转化。');
  if ((counts['餐饮'] || 0) > (counts['零售商业'] || 0)) opportunities.push('餐饮POI占比较高，项目可考虑差异化零售、体验和服务组合。');
  if (anchorCount < 3) opportunities.push('周边大型商业锚点不足，存在承接区域消费的窗口。');
  if (!opportunities.length) opportunities.push('可结合竞品租金样本、租户访谈和实地客流进一步寻找切入点。');
  const ringStats = rings.map(item => ({
    label: item.label,
    minKm: item.min,
    maxKm: item.max,
    totalPoi: item.total,
    commercialCount: item.commercial,
    competitorCount: item.competitors,
    transportCount: item.transport,
    residentialCount: item.residential,
    categoryCount: item.categories.size,
  }));
  return {
    provider: 'OpenStreetMap Overpass 多节点侦测',
    center: { lat, lon },
    radiusKm,
    totalPoi: Object.values(counts).reduce((a, b) => a + b, 0),
    commercialCount,
    competitorCount,
    anchorCount,
    transportCount,
    supportCount,
    residentialCount,
    densityPerKm2: density,
    detectionScore,
    marketGrade,
    competitionLevel,
    categories: Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    competitors: sortedCompetitors,
    namedPois: namedPois.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 50),
    ringStats,
    conclusions,
    opportunities,
    summary: `${radiusKm}公里范围内识别到${commercialCount}个商业POI，其中直接竞品约${competitorCount}个；综合商业侦测评分${detectionScore}/100，判定为${marketGrade}。`,
    coverageNote: '本侦测基于公开地图POI和交通、居住、公共配套数据，不含人口、销售额和授权租金数据；正式决策应结合实地踏勘、客流调研和授权商业数据库。',
    detectionAt: new Date().toISOString(),
  };
}
async function geocode(query) {
  const coord = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coord) return { results: [{ displayName: `${coord[1]}, ${coord[2]}`, lat: Number(coord[1]), lon: Number(coord[2]) }] };
  const known = { '柳州': [24.3264, 109.4281], '南宁': [22.8170, 108.3665], '桂林': [25.2736, 110.2900], '北海': [21.4811, 109.1202], '梧州': [23.4769, 111.2791] };
  const q = String(query || '');
  const fallbackKey = Object.keys(known).find(k => q.includes(k));
  try {
    const response = await nativeFetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=zh-CN&q=${encodeURIComponent(q)}`, {
      headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout ? AbortSignal.timeout(18000) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    return { results: rows.map(x => ({ displayName: x.display_name, lat: Number(x.lat), lon: Number(x.lon) })) };
  } catch (error) {
    if (fallbackKey) return { results: [{ displayName: `${fallbackKey}（离线参考坐标，请在地图中微调）`, lat: known[fallbackKey][0], lon: known[fallbackKey][1] }] };
    throw new Error('地址服务暂时不可用，可直接输入“纬度,经度”或在地图中手动选点');
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await nativeFetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-CN`, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout ? AbortSignal.timeout(18000) : undefined });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return { displayName: payload.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}` };
  } catch {
    return { displayName: `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}` };
  }
}

async function handleApi(path, init) {
  const method = String(init?.method || 'GET').toUpperCase();
  const url = new URL(path, location.href);
  const pathname = url.pathname;

  if (pathname.endsWith('/api/login') && method === 'POST') {
    const body = await requestJSON(init);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (username === 'demo') {
      const users = await ensureUsers();
      const user = users[username];
      if (!user || user.passwordHash !== await sha256(password)) return jsonResponse({ error: '用户名或密码错误' }, 401);
      return jsonResponse({ token: tokenFor(username), user: { username, displayName: user.displayName || username, role: 'user', status: 'approved' } });
    }
    if (!CLOUD_ENABLED) return jsonResponse({ error: '云端账号服务尚未配置' }, 503);
    try {
      const auth = await cloudJSON('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email: await usernameEmail(username), password },
        token: CLOUD_CONFIG.anonKey,
      });
      if (!auth?.access_token || !auth?.user?.id) throw new Error('登录响应不完整，请稍后重试');
      const profile = await cloudProfileWithToken(auth.access_token, auth.user.id);
      if (!profile) throw Object.assign(new Error('账号资料尚未建立，请联系超级管理员'), { status: 403 });
      if (profile.status !== 'approved') {
        await cloudRequest('/auth/v1/logout', { method: 'POST', token: auth.access_token }).catch(() => {});
        const messages = {
          pending: '账号已注册，正在等待超级管理员审核授权',
          rejected: '账号审核未通过，请联系超级管理员',
          disabled: '账号已被停用，请联系超级管理员',
        };
        return jsonResponse({ error: messages[profile.status] || '账号当前不可用', code: 'ACCOUNT_' + profile.status.toUpperCase(), status: profile.status }, 403);
      }
      storeCloudSession(auth, { username: profile.username, displayName: profile.display_name });
      await cloudJSON('/rest/v1/rpc/record_login', { method: 'POST', body: {}, token: auth.access_token }).catch(() => {});
      return jsonResponse({
        token: auth.access_token,
        user: {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          role: profile.role,
          status: profile.status,
        },
      });
    } catch (error) {
      if (error.status === 403) return jsonResponse({ error: error.message, code: error.code || '', status: error.accountStatus || '' }, 403);
      if (error.code === 'CLOUD_NETWORK' || error.code === 'CLOUD_TIMEOUT') return jsonResponse({ error: error.message, code: error.code }, 503);
      return jsonResponse({ error: '用户名或密码错误，或账号尚未开通' }, 401);
    }
  }

  if (pathname.endsWith('/api/register') && method === 'POST') {
    const body = await requestJSON(init);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || username).trim();
    if (!/^[a-z0-9_\u4e00-\u9fa5-]{3,24}$/i.test(username)) return jsonResponse({ error: '用户名需为3–24位，可使用中文、字母、数字、下划线或短横线' }, 400);
    if (password.length < 6) return jsonResponse({ error: '密码至少6个字符' }, 400);
    if (!CLOUD_ENABLED) return jsonResponse({ error: '云端账号服务尚未配置' }, 503);
    try {
      const health = await cloudRequest('/auth/v1/health', { token: CLOUD_CONFIG.anonKey, timeoutMs: 12000 });
      if (!health.ok) throw Object.assign(new Error(`云端注册服务暂时不可用（HTTP ${health.status}）`), { status: 503, code: 'CLOUD_UNAVAILABLE' });
      const auth = await cloudJSON('/auth/v1/signup', {
        method: 'POST',
        body: {
          email: await usernameEmail(username),
          password,
          data: { username, display_name: displayName || username },
        },
        token: CLOUD_CONFIG.anonKey,
      });
      if (!auth?.access_token || !auth?.user?.id) {
        return jsonResponse({ pending: true, message: '注册申请已提交，请等待超级管理员审核后登录' });
      }
      const profile = await cloudProfileWithToken(auth.access_token, auth.user.id);
      if (profile?.status === 'approved') {
        storeCloudSession(auth, { username: profile.username, displayName: profile.display_name });
        await cloudJSON('/rest/v1/rpc/record_login', { method: 'POST', body: {}, token: auth.access_token }).catch(() => {});
        return jsonResponse({
          token: auth.access_token,
          user: {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name || profile.username,
            role: profile.role,
            status: profile.status,
          },
          firstAdmin: profile.role === 'super_admin',
        });
      }
      await cloudRequest('/auth/v1/logout', { method: 'POST', token: auth.access_token }).catch(() => {});
      clearCloudSession();
      return jsonResponse({
        pending: true,
        user: { username, displayName: displayName || username, status: profile?.status || 'pending' },
        message: '注册申请已提交。请等待超级管理员审核授权后再登录。',
      });
    } catch (error) {
      const detail = String(error.message || '');
      if (/already|registered|duplicate|unique/i.test(detail)) return jsonResponse({ error: '该用户名已被使用，请更换后重试' }, 409);
      if (error.code === 'CLOUD_NETWORK' || error.code === 'CLOUD_TIMEOUT') {
        return jsonResponse({
          error: `${error.message} 如果重试时提示用户名已存在，说明上一次注册可能已经提交，请直接登录或联系超级管理员审核。`,
          code: error.code,
        }, 503);
      }
      if (error.status >= 500) return jsonResponse({ error: detail || '云端注册服务暂时不可用，请稍后重试' }, 503);
      return jsonResponse({ error: `注册失败：${detail}` }, error.status || 400);
    }
  }

  if (pathname.endsWith('/api/logout') && method === 'POST') {
    if (CLOUD_ENABLED) await cloudSignOut();
    return jsonResponse({ ok: true });
  }

  if (pathname.endsWith('/api/admin/users') && method === 'GET') {
    if (!CLOUD_ENABLED) return jsonResponse({ error: '用户管理仅在云端模式可用' }, 503);
    await cloudRequireAdmin(init);
    const token = await cloudAccessToken();
    const users = await cloudJSON('/rest/v1/profiles?select=id,username,display_name,status,role,created_at,approved_at,approved_by,last_login_at&order=created_at.desc', { token });
    return jsonResponse({ users: Array.isArray(users) ? users : [] });
  }

  if (pathname.endsWith('/api/admin/projects') && method === 'GET') {
    if (!CLOUD_ENABLED) return jsonResponse({ error: '用户管理仅在云端模式可用' }, 503);
    await cloudRequireAdmin(init);
    const token = await cloudAccessToken();
    const rows = await cloudJSON('/rest/v1/projects?select=id,user_id,name,model,created_at,updated_at&order=updated_at.desc&limit=200', { token });
    const projects = [];
    for (const row of Array.isArray(rows) ? rows : []) projects.push(await cloudProjectSummary(cloudProject(row)));
    return jsonResponse({ projects });
  }

  if (pathname.endsWith('/api/admin/audit') && method === 'GET') {
    if (!CLOUD_ENABLED) return jsonResponse({ error: '用户管理仅在云端模式可用' }, 503);
    await cloudRequireAdmin(init);
    const token = await cloudAccessToken();
    const logs = await cloudJSON('/rest/v1/audit_logs?select=id,actor_id,action,target_user_id,target_project_id,metadata,created_at&order=created_at.desc&limit=30', { token });
    return jsonResponse({ logs: Array.isArray(logs) ? logs : [] });
  }

  const adminStatusMatch = pathname.match(/\/api\/admin\/users\/([0-9a-f-]{36})\/status$/i);
  if (adminStatusMatch && method === 'POST') {
    if (!CLOUD_ENABLED) return jsonResponse({ error: '用户管理仅在云端模式可用' }, 503);
    const admin = await cloudRequireAdmin(init);
    const targetId = adminStatusMatch[1];
    const body = await requestJSON(init);
    const nextStatus = String(body.status || '');
    if (!['approved', 'rejected', 'disabled', 'pending'].includes(nextStatus)) return jsonResponse({ error: '无效的审核状态' }, 400);
    if (targetId === admin.id && nextStatus !== 'approved') return jsonResponse({ error: '不能停用或拒绝当前超级管理员账号' }, 400);
    const token = await cloudAccessToken();
    const rows = await cloudJSON(`/rest/v1/profiles?id=eq.${encodeURIComponent(targetId)}&select=id,username,display_name,status,role`, { token });
    const target = Array.isArray(rows) ? rows[0] : null;
    if (!target) return jsonResponse({ error: '目标用户不存在' }, 404);
    if (target.role === 'super_admin' && nextStatus !== 'approved') return jsonResponse({ error: '不能停用或拒绝超级管理员账号' }, 400);
    const patch = {
      status: nextStatus,
      approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
      approved_by: nextStatus === 'approved' ? admin.id : null,
    };
    const updated = await cloudJSON(`/rest/v1/profiles?id=eq.${encodeURIComponent(targetId)}&select=id,username,display_name,status,role,created_at,approved_at,approved_by,last_login_at`, {
      method: 'PATCH', token, body: patch, headers: { Prefer: 'return=representation' },
    });
    await cloudJSON('/rest/v1/audit_logs', {
      method: 'POST', token, body: {
        actor_id: admin.id,
        action: `user_${nextStatus}`,
        target_user_id: targetId,
        metadata: { previousStatus: target.status, nextStatus, username: target.username },
      },
    }).catch(() => {});
    return jsonResponse({ ok: true, user: Array.isArray(updated) ? updated[0] : null });
  }

  const user = await currentUser(init);
  if (!user && !pathname.endsWith('/api/health')) return jsonResponse({ error: '请先登录' }, 401);

  if (pathname.endsWith('/api/me') && method === 'GET') return jsonResponse(user);

  if (pathname.endsWith('/api/calculate') && method === 'POST') {
    const body = await requestJSON(init);
    const result = await calculate(body.model, body.includeSensitivity !== false);
    return jsonResponse(result);
  }

  if (pathname.endsWith('/api/import-shops') && method === 'POST') {
    const body = await requestJSON(init);
    if (!body.contentBase64) return jsonResponse({ error: '请选择要导入的文件' }, 400);
    return jsonResponse(parseShopWorkbook(body.contentBase64, String(body.filename || '')));
  }

  if (pathname.endsWith('/api/import-operating-budget') && method === 'POST') {
    const body = await requestJSON(init);
    if (!body.contentBase64) return jsonResponse({ error: '请选择运营成本预算文件' }, 400);
    try { return jsonResponse(parseOperatingBudgetWorkbook(body.contentBase64, String(body.filename || ''))); }
    catch (error) { return jsonResponse({ error: error.message }, 400); }
  }

  if (pathname.endsWith('/api/import-preopening-budget') && method === 'POST') {
    const body = await requestJSON(init);
    if (!body.contentBase64) return jsonResponse({ error: '请选择筹备期成本明细文件' }, 400);
    try { return jsonResponse(parsePreopeningBudgetWorkbook(body.contentBase64, String(body.filename || ''))); }
    catch (error) { return jsonResponse({ error: error.message }, 400); }
  }

  if (pathname.endsWith('/api/import-market-comps') && method === 'POST') {
    const body = await requestJSON(init);
    if (!body.contentBase64) return jsonResponse({ error: '请选择竞品租金文件' }, 400);
    return jsonResponse(parseMarketWorkbook(body.contentBase64, String(body.filename || '')));
  }

  if (pathname.endsWith('/api/market-analysis') && method === 'POST') {
    const body = await requestJSON(init);
    try {
      return jsonResponse(await marketAnalysis(Number(body.lat), Number(body.lon), Math.max(1, Math.min(10, Number(body.radiusKm || 3)))));
    } catch (error) {
      return jsonResponse({ error: `周边市场数据服务暂时不可用：${error.message}。可稍后重试或继续导入竞品租金样本。` }, 502);
    }
  }

  if (pathname.endsWith('/api/geocode') && method === 'GET') {
    try { return jsonResponse(await geocode(url.searchParams.get('q') || '')); }
    catch (error) { return jsonResponse({ error: error.message }, 503); }
  }

  if (pathname.endsWith('/api/reverse-geocode') && method === 'GET') {
    return jsonResponse(await reverseGeocode(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lon'))));
  }

  if (pathname.endsWith('/api/templates/shop-import') && method === 'GET') {
    return fileResponse(workbookBlob(shopTemplate()), '商业地产铺位导入模板.xlsx', XLSX_MIME);
  }

  if (pathname.endsWith('/api/templates/market-comps') && method === 'GET') {
    return fileResponse(workbookBlob(marketTemplate()), '商业地产竞品租金导入模板.xlsx', XLSX_MIME);
  }

  if (pathname.endsWith('/api/templates/operating-budget') && method === 'GET') {
    return fileResponse(workbookBlob(operatingBudgetTemplate()), '商业地产运营成本预算导入模板.xlsx', XLSX_MIME);
  }

  if (pathname.endsWith('/api/templates/preopening-budget') && method === 'GET') {
    return fileResponse(workbookBlob(preopeningBudgetTemplate()), '商业地产筹备期成本明细导入模板.xlsx', XLSX_MIME);
  }

  if (pathname.endsWith('/api/share/users') && method === 'GET') {
    if (user.isCloud) {
      try {
        const token = await cloudAccessToken();
        const rows = await cloudJSON('/rest/v1/profiles?status=eq.approved&select=id,username,display_name,status&order=display_name.asc', { token });
        return jsonResponse({ users: (Array.isArray(rows) ? rows : []).filter(item => item.id !== user.id).map(item => ({ id: item.id, username: item.username, displayName: item.display_name || item.username })) });
      } catch (error) {
        return jsonResponse({ users: [], warning: '当前云端权限不支持直接读取用户目录，可使用项目分享码发送。' });
      }
    }
    const users = await ensureUsers();
    return jsonResponse({ users: Object.entries(users).filter(([username, item]) => username !== user.username && (!item.status || item.status === 'approved')).map(([username, item]) => ({ id: username, username, displayName: item.displayName || username })) });
  }

  const shareMatch = pathname.match(/\/api\/projects\/([0-9a-f-]{8,64})\/share$/i);
  if (shareMatch && method === 'POST') {
    const body = await requestJSON(init);
    const sourceId = shareMatch[1];
    const recipientUsername = String(body.recipientUsername || '').trim();
    const recipientId = String(body.recipientId || recipientUsername).trim();
    const note = String(body.note || '').trim();
    if (!recipientId || recipientId === user.id || recipientUsername === user.username) return jsonResponse({ error: '请选择其他已审核用户作为接收方' }, 400);
    let source = null;
    if (user.isCloud) {
      const token = await cloudAccessToken();
      const rows = await cloudJSON(`/rest/v1/projects?id=eq.${encodeURIComponent(sourceId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,name,model,created_at,updated_at`, { token });
      source = Array.isArray(rows) && rows[0] ? cloudProject(rows[0]) : null;
    } else {
      source = getProjects(user.username).find(item => item.id === sourceId) || null;
    }
    if (!source) return jsonResponse({ error: '项目不存在或无权分享' }, 404);
    const sourceName = source.model?.project?.name || source.name || '未命名商业项目';
    const sharedModel = await normalizeModel(JSON.parse(JSON.stringify(source.model || {})));
    sharedModel.shareMeta = { sourceProjectId: sourceId, sourceUsername: user.username, sourceDisplayName: user.displayName || user.username, sharedAt: new Date().toISOString(), note };
    sharedModel.project.name = `${sourceName} · ${user.displayName || user.username}分享`;
    if (user.isCloud) {
      try {
        const token = await cloudAccessToken();
        const rows = await cloudJSON('/rest/v1/projects?select=id,user_id,name,model,created_at,updated_at', {
          method: 'POST', token,
          body: { user_id: recipientId, name: sharedModel.project.name, model: sharedModel },
          headers: { Prefer: 'return=representation' },
        });
        if (!Array.isArray(rows) || !rows[0]) throw new Error('直接投递失败');
        return jsonResponse({ direct: true, project: cloudProject(rows[0]) });
      } catch (error) {
        return jsonResponse({ error: '云端项目权限未开放直接投递到对方账户，请使用项目分享码发送。', code: 'SHARE_REQUIRES_CODE' }, 403);
      }
    }
    const targetUsers = await ensureUsers();
    const target = targetUsers[recipientUsername];
    if (!target || (target.status && target.status !== 'approved')) return jsonResponse({ error: '接收用户不存在或尚未通过审核' }, 404);
    const now = isoNow();
    const sharedProject = { id: crypto.randomUUID(), model: sharedModel, createdAt: now, updatedAt: now };
    const targetProjects = getProjects(recipientUsername);
    targetProjects.unshift(sharedProject);
    saveProjects(recipientUsername, targetProjects);
    return jsonResponse({ direct: true, project: sharedProject });
  }

  const duplicateMatch = pathname.match(/\/api\/projects\/([0-9a-f-]{8,64})\/duplicate$/i);
  if (duplicateMatch && method === 'POST') {
    const sourceId = duplicateMatch[1];
    let source = null;
    if (user.isCloud) {
      const token = await cloudAccessToken();
      const rows = await cloudJSON(`/rest/v1/projects?id=eq.${encodeURIComponent(sourceId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,name,model,created_at,updated_at`, { token });
      source = Array.isArray(rows) && rows[0] ? cloudProject(rows[0]) : null;
    } else {
      source = getProjects(user.username).find(item => item.id === sourceId) || null;
    }
    if (!source) return jsonResponse({ error: '项目不存在或无权复制' }, 404);
    const duplicateModel = await normalizeModel(JSON.parse(JSON.stringify(source.model || {})));
    duplicateModel.project.name = `${source.model?.project?.name || source.name || '未命名商业项目'} · 方案副本`;
    let project;
    if (user.isCloud) {
      const token = await cloudAccessToken();
      const rows = await cloudJSON('/rest/v1/projects?select=id,user_id,name,model,created_at,updated_at', {
        method: 'POST', token,
        body: { user_id: user.id, name: duplicateModel.project.name, model: duplicateModel },
        headers: { Prefer: 'return=representation' },
      });
      if (!Array.isArray(rows) || !rows[0]) throw new Error('项目副本创建失败');
      project = cloudProject(rows[0]);
    } else {
      const now = isoNow();
      project = { id: crypto.randomUUID(), model: duplicateModel, createdAt: now, updatedAt: now };
      const rows = getProjects(user.username);
      rows.unshift(project);
      saveProjects(user.username, rows);
    }
    return jsonResponse({ project, result: await calculate(duplicateModel, false) });
  }

  if (pathname.endsWith('/api/projects') && method === 'GET') {
    const projects = [];
    if (user.isCloud) {
      const token = await cloudAccessToken();
      const rows = await cloudJSON(`/rest/v1/projects?select=id,user_id,name,model,created_at,updated_at&user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.desc`, { token });
      for (const row of Array.isArray(rows) ? rows : []) projects.push(await cloudProjectSummary(cloudProject(row)));
    } else {
      await ensureDemoProject(user.username);
      const rows = getProjects(user.username);
      for (const project of rows) {
        let summary = {};
        try { summary = (await calculate(project.model, false)).summary; } catch {}
        projects.push({ ...project, summary });
      }
    }
    projects.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return jsonResponse({ projects });
  }

  if (pathname.endsWith('/api/projects') && method === 'POST') {
    const body = await requestJSON(init);
    const projectName = String(body.name || body.model?.project?.name || '未命名商业项目').trim();
    const model = await normalizeModel(body.model || await defaultModel(projectName));
    let project;
    if (user.isCloud) {
      const token = await cloudAccessToken();
      const rows = await cloudJSON('/rest/v1/projects?select=id,user_id,name,model,created_at,updated_at', {
        method: 'POST', token,
        body: { user_id: user.id, name: projectName, model },
        headers: { Prefer: 'return=representation' },
      });
      if (!Array.isArray(rows) || !rows[0]) throw new Error('项目创建失败，请稍后重试');
      project = cloudProject(rows[0]);
    } else {
      const now = isoNow();
      project = { id: crypto.randomUUID(), model, createdAt: now, updatedAt: now };
      const rows = getProjects(user.username);
      rows.unshift(project);
      saveProjects(user.username, rows);
    }
    return jsonResponse({ project, result: await calculate(model, false) });
  }

  const match = pathname.match(/\/api\/projects\/([0-9a-f-]{8,64})(?:\/export\/(xlsx|pptx))?$/i);
  if (match) {
    const id = match[1];
    const format = match[2];
    let project = null;
    let localRows = null;
    let idx = -1;
    let cloudToken = '';
    if (user.isCloud) {
      cloudToken = await cloudAccessToken();
      const rows = await cloudJSON(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=id,user_id,name,model,created_at,updated_at`, { token: cloudToken });
      if (Array.isArray(rows) && rows[0]) project = cloudProject(rows[0]);
    } else {
      localRows = getProjects(user.username);
      idx = localRows.findIndex(x => x.id === id);
      if (idx >= 0) project = localRows[idx];
    }
    if (!project) return jsonResponse({ error: '项目不存在或无权访问' }, 404);
    if (format === 'xlsx') {
      const result = await calculate(project.model, true);
      return fileResponse(exportExcel(result), `${result.summary.projectName || '项目'}_投资测算.xlsx`, XLSX_MIME);
    }
    if (format === 'pptx') {
      const result = await calculate(project.model, true);
      return fileResponse(await exportPPT(result), `${result.summary.projectName || '项目'}_投资汇报.pptx`, PPTX_MIME);
    }
    if (method === 'GET') return jsonResponse({ project, result: await calculate(project.model, true) });
    if (method === 'PUT') {
      const body = await requestJSON(init);
      const model = await normalizeModel(body.model || body);
      if (user.isCloud) {
        const rows = await cloudJSON(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=id,user_id,name,model,created_at,updated_at`, {
          method: 'PATCH', token: cloudToken,
          body: { model, name: String(body.name || model.project?.name || project.name || '未命名商业项目').trim() },
          headers: { Prefer: 'return=representation' },
        });
        if (!Array.isArray(rows) || !rows[0]) return jsonResponse({ error: '项目保存失败或无权修改' }, 403);
        project = cloudProject(rows[0]);
      } else {
        localRows[idx].model = model;
        localRows[idx].updatedAt = isoNow();
        saveProjects(user.username, localRows);
        project = localRows[idx];
      }
      return jsonResponse({ project, result: await calculate(model, true) });
    }
    if (method === 'DELETE') {
      if (user.isCloud) {
        await cloudRequest(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE', token: cloudToken, headers: { Prefer: 'return=minimal' },
        }).then(async response => {
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(cloudErrorMessage(payload, '项目删除失败'));
          }
        });
      } else {
        localRows.splice(idx, 1);
        saveProjects(user.username, localRows);
      }
      return jsonResponse({ ok: true });
    }
  }

  if (pathname.endsWith('/api/health')) return jsonResponse({ ok: true, mode: CLOUD_ENABLED ? 'supabase-cloud' : 'browser-local', time: new Date().toISOString() });
  return jsonResponse({ error: '接口不存在' }, 404);
}

window.fetch = async function duoduoFetch(input, init = {}) {
  const rawUrl = typeof input === 'string' ? input : input?.url || '';
  const url = new URL(rawUrl, location.href);
  if (!url.pathname.includes('/api/')) return nativeFetch(input, init);
  try {
    const fastEndpoints = [
      '/api/login', '/api/register', '/api/logout', '/api/me', '/api/health',
      '/api/geocode', '/api/reverse-geocode', '/api/market-analysis',
      '/api/admin/users', '/api/admin/audit', '/api/share/users',
    ];
    const fastRequest = fastEndpoints.some(path => url.pathname.endsWith(path)) || /\/api\/admin\/users\/[0-9a-f-]+\/status$/i.test(url.pathname);
    const needsXlsx = /\/api\/templates\//.test(url.pathname) || /\/api\/import-(shops|operating-budget|preopening-budget|market-comps)$/.test(url.pathname) || /\/export\/xlsx$/.test(url.pathname);
    const needsPptx = /\/export\/pptx$/.test(url.pathname);
    if (needsXlsx) await ensureXlsxLibrary();
    if (needsPptx) await ensurePptxLibrary();
    if (!fastRequest) await loadPyodideEngine();
    return await handleApi(rawUrl, init);
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (![401, 403, 404].includes(status)) console.error(error);
    return jsonResponse({
      error: String(error?.message || error || '处理失败'),
      code: error?.code || '',
      status: error?.accountStatus || '',
    }, status);
  }
};


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './' }).catch(error => {
    console.warn('离线缓存未启用', error);
  });
}
