// Browser-only backend for the public GitHub Pages edition.
// Projects stay in this browser; no project data is uploaded to a server.
const nativeFetch = window.fetch.bind(window);
const APIJSON = 'application/json; charset=utf-8';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const USERS_KEY = 'duoduo_static_users_v1';
const SESSION_PREFIX = 'local|';
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
  const username = usernameFromToken(authTokenFromRequest(init));
  if (!username) return null;
  const users = await ensureUsers();
  return users[username] ? { username, displayName: users[username].displayName || username } : null;
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

const pyodideReady = (async () => {
  try {
    setBootText('正在载入本地计算引擎…');
    if (!window.XLSX) throw new Error('Excel 组件未加载');
    if (!window.PptxGenJS) throw new Error('PPT 组件未加载');
    const indexURL = new URL('./pyodide/', import.meta.url).href;
    // The service worker exposes the two large runtime files as one response
    // assembled from small same-origin parts. Wait until it controls this page
    // before Pyodide starts requesting its runtime.
    await window.__duoduoSWReady;
    const { loadPyodide } = await import(indexURL + 'pyodide.mjs');
    const pyodide = await loadPyodide({ indexURL });
    setBootText('正在初始化投资测算公式…');
    const engineCode = await (await nativeFetch(new URL('./engine.py', import.meta.url))).text();
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
    setBootText('正在载入工作台…');
    return pyodide;
  } catch (error) {
    console.error(error);
    setBootText('载入失败，请刷新后重试');
    throw error;
  }
})();

window.__duoduoBackendReady = pyodideReady;

function pyCallJSON(expression, { model, includeSensitivity = true } = {}) {
  const py = window.__duoduoPyodide;
  if (!py) throw new Error('计算引擎尚未就绪');
  if (model !== undefined) py.globals.set('__duo_model_json', JSON.stringify(model));
  py.globals.set('__duo_include_sensitivity', Boolean(includeSensitivity));
  return JSON.parse(py.runPython(expression));
}

pyodideReady.then(py => { window.__duoduoPyodide = py; });

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
    floors: [
      { name: 'B1', buildingArea: 4000, leasableArea: 3000, avgRent: 50, salesPerSqmMonth: 0, concessionRate: 0 },
      { name: '1F', buildingArea: 4000, leasableArea: 3200, avgRent: 200, salesPerSqmMonth: 0, concessionRate: 0 },
      { name: '2F', buildingArea: 4000, leasableArea: 3200, avgRent: 130, salesPerSqmMonth: 0, concessionRate: 0 },
      { name: '3F', buildingArea: 4000, leasableArea: 3200, avgRent: 95, salesPerSqmMonth: 0, concessionRate: 0 },
      { name: '4F', buildingArea: 2000, leasableArea: 1600, avgRent: 65, salesPerSqmMonth: 0, concessionRate: 0 },
    ],
    shops: [
      { id: 'B1-001', buildingArea: 1800, leasableArea: 1450, floor: 'B1', category: '超市/主力店', status: '营业', rentOverride: 42, conditions: ['主入口'], note: '超市主力店' },
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
  const n = Number(String(value).replace(/[,万元㎡%\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = safeNumber(value);
  return Number.isFinite(n) ? n : null;
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
  id: ['铺位号', '商铺号', '铺号', '编号', 'shopid', 'id'],
  buildingArea: ['建筑面积', '建筑面', 'grossarea'],
  leasableArea: ['实际租赁面积', '租赁面积', '可租赁面积', '计租面积', 'leasablearea'],
  floor: ['楼层', '所在楼层', 'floor'],
  category: ['业态', '经营业态', 'category'],
  status: ['状态', '经营状态', 'status'],
  rentOverride: ['租金单价覆盖', '租金单价', '租金', 'rentoverride', 'rent'],
  conditions: ['铺位条件', '位置条件', '条件', 'conditions'],
  note: ['备注', '说明', 'note'],
};

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
    const idx = row.findIndex(cell => matchesAlias(cell, values));
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
  const { name, rows } = sheetRows(wb, ['商铺', '铺位', '明细']);
  const headerIdx = findHeaderRow(rows, SHOP_ALIASES, ['id', 'buildingArea', 'leasableArea']);
  if (headerIdx < 0) throw new Error('工作簿中未找到“铺位号、建筑面积、实际租赁面积”列。请先下载导入模板。');
  const indexes = headerIndexes(rows[headerIdx], SHOP_ALIASES);
  const shops = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const id = String(rowValue(row, indexes, 'id') || '').trim();
    const buildingArea = safeNumber(rowValue(row, indexes, 'buildingArea'));
    const leasableArea = safeNumber(rowValue(row, indexes, 'leasableArea'));
    if (!id && buildingArea <= 0 && leasableArea <= 0) continue;
    shops.push({
      id,
      buildingArea,
      leasableArea,
      floor: String(rowValue(row, indexes, 'floor') || '').trim(),
      category: String(rowValue(row, indexes, 'category') || '零售').trim(),
      status: String(rowValue(row, indexes, 'status') || '营业').trim(),
      rentOverride: optionalNumber(rowValue(row, indexes, 'rentOverride')),
      conditions: splitConditions(rowValue(row, indexes, 'conditions')),
      note: String(rowValue(row, indexes, 'note') || '').trim(),
    });
  }
  const warnings = shopWarnings(shops);
  return { shops, warnings, sheet: name, rowsRead: Math.max(0, rows.length - headerIdx - 1), projectHints: {} };
}

function shopWarnings(shops) {
  const warnings = [];
  const counts = {};
  for (const shop of shops) if (shop.id) counts[shop.id] = (counts[shop.id] || 0) + 1;
  const duplicates = Object.entries(counts).filter(([, n]) => n > 1).map(([id]) => id);
  if (duplicates.length) warnings.push(`发现重复铺位号：${duplicates.slice(0, 8).join(', ')}`);
  const missingArea = shops.filter(s => safeNumber(s.buildingArea) <= 0).length;
  if (missingArea) warnings.push(`${missingArea}个铺位缺少建筑面积`);
  const missingLease = shops.filter(s => safeNumber(s.leasableArea) <= 0).length;
  if (missingLease) warnings.push(`${missingLease}个铺位缺少实际租赁面积`);
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
      leasableArea: safeNumber(rowValue(row, indexes, 'leasableArea')),
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
  if (widths.length) ws['!cols'] = widths.map(wch => ({ wch }));
  wb.SheetNames.push(name);
  wb.Sheets[name] = ws;
  return ws;
}

function shopTemplate() {
  const wb = XLSX.utils.book_new();
  addSheet(wb, '项目信息', [
    ['商业地产项目信息'],
    ['只需填写“填写值”列；未填写的内容可在网页向导中补充。'],
    ['参数', '填写值', '说明'],
    ['项目名称', '', '项目正式名称'],
    ['项目位置', '广西壮族自治区', '省/市/城区，例如：广西壮族自治区柳州市'],
    ['项目类型', '购物中心', '购物中心/街区商业/社区商业等'],
    ['起始年份', 2027, '建设第1年'],
    ['建设期', 2, '年'],
    ['总建筑面积', '', '㎡；可留空，由商铺建筑面积反推'],
    ['占地面积', '', '㎡；用于城镇土地使用税'],
    ['土地价款', '', '万元'],
    ['其他前期费用', '', '万元'],
    ['筹备期营销费用', '', '万元'],
  ], [24, 32, 44]);
  const rows = [
    ['商铺明细导入表'],
    ['示例：A-101｜120.00｜90.00｜1F｜零售｜营业｜租金可留空｜电梯口、转角铺。请从第6行开始录入，不要移动表头。'],
    [],
    ['铺位号', '建筑面积（㎡）', '实际租赁面积（㎡）', '楼层', '业态', '状态', '租金单价覆盖（元/㎡/月）', '铺位条件', '备注'],
    ['A-101', 120, 90, '1F', '零售', '营业', '', '电梯口、转角铺', '示例行，可删除'],
  ];
  addSheet(wb, '商铺明细', rows, [16, 18, 20, 10, 16, 12, 24, 24, 28]);
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

function exportExcel(result) {
  const model = result.model;
  const s = result.summary;
  const wb = XLSX.utils.book_new();
  addSheet(wb, '项目概览', [
    ['多多 · 商业地产投资测算'], [''],
    ['项目名称', s.projectName], ['项目位置', s.location], ['测算模式', s.calculationMode === 'preliminary' ? '楼层均价初步测算' : '一铺一价精细测算'],
    ['总建筑面积（㎡）', s.grossFloorArea], ['可租赁面积（㎡）', s.leasableArea], ['商铺/楼层数量', s.calculationMode === 'preliminary' ? s.floorCount : s.shopsCount],
    ['项目总投资（万元）', s.totalInvestment], ['稳定期营业收入（万元/年）', s.stableRevenue], ['稳定期NOI（万元/年）', s.stableNoi],
    ['NOI回报率', s.noiYield], ['项目IRR', s.projectIrr], ['项目NPV（万元）', s.projectNpv], ['静态回收期（年）', s.staticPayback],
    [''], ['说明', '本表由浏览器版多多·商业地产自动生成，用于投资初筛与方案比较，不替代可研、审计、评估或税务鉴证。'],
  ], [26, 32, 22, 22]);
  addSheet(wb, '核心参数', [
    ['参数大类', '参数', '数值'],
    ['项目', '起始年份', model.project.startYear], ['项目', '建设期（年）', model.project.constructionYears],
    ['项目', '运营期（年）', model.project.operationYears], ['项目', '建筑面积调节系数', model.project.commonAreaFactor],
    ['成本', '前期工程单价（元/㎡）', model.costs.preconstructionRate], ['成本', '土建工程单价（元/㎡）', model.costs.constructionRate],
    ['成本', '装修单价（元/㎡）', model.costs.fitoutRate], ['成本', '设备单价（元/㎡）', model.costs.equipmentRate],
    ['运营', '首年出租率', model.operations.occupancyY1], ['运营', '第二年出租率', model.operations.occupancyY2],
    ['运营', '稳定期出租率', model.operations.stableOccupancy], ['运营', '租金增长率', model.operations.rentGrowth],
    ['税费', '租金增值税', model.taxes.vatRent], ['税费', '房产税（从租）', model.taxes.propertyTaxRateRent], ['税费', '企业所得税', model.taxes.corporateTax],
    ['融资', '债务比例', model.finance.debtRatio], ['融资', '贷款利率', model.finance.loanRate], ['估值', '折现率', model.valuation.discountRate],
  ], [18, 28, 20]);
  addSheet(wb, '投资构成', [['项目', '金额（万元）', '占比'], ...result.investmentBreakdown.map(x => [x.name, x.value, s.totalInvestment ? x.value / s.totalInvestment : 0])], [28, 18, 14]);
  addSheet(wb, '楼层均价', [['楼层', '建筑面积（㎡）', '可租赁面积（㎡）', '平均月收益（元/㎡/月）', '满租月收益（万元）'], ...(result.floors || []).map(x => [x.name, x.buildingArea, x.leasableArea, x.weightedRent || x.avgRent, x.monthlyRevenue || x.monthlyRent])], [12, 18, 20, 26, 22]);
  addSheet(wb, '商铺明细', [['铺位号', '楼层', '业态', '状态', '建筑面积（㎡）', '实际租赁面积（㎡）', '租金单价（元/㎡/月）', '条件', '满租月收益（万元）'], ...(result.shops || []).map(x => [x.id, x.floor, x.category, x.status || '', x.buildingArea, x.leasableArea, x.rent, (x.appliedConditions || []).join('、'), x.monthlyRevenue])], [16, 10, 16, 12, 18, 20, 22, 24, 22]);
  addSheet(wb, '租赁联营规则', [['业态', '基准月租金（元/㎡/月）', '业态系数', '销售基数（元/㎡/月）', '扣点率', '结算方式'], ...(model.categories || []).map(x => [x.name, x.rent, x.factor, x.salesPerSqmMonth, x.concessionRate, x.revenueMode])], [20, 24, 14, 22, 14, 20]);
  addSheet(wb, '周边市场分析', [['指标', '结果'], ['项目平均租金（元/㎡/月）', result.marketSummary.projectAverageRent], ['市场加权均价（元/㎡/月）', result.marketSummary.weightedAverageRent], ['市场中位数（元/㎡/月）', result.marketSummary.medianRent], ['市场25分位（元/㎡/月）', result.marketSummary.p25Rent], ['市场75分位（元/㎡/月）', result.marketSummary.p75Rent], ['项目定价位置', result.marketSummary.position], ...(result.marketSummary.conclusions || []).map((x, i) => [`结论${i + 1}`, x])], [30, 80]);
  addSheet(wb, '竞品租金样本', [['样本名称', '地址', '楼层', '业态', '可租赁面积（㎡）', '月租金（元/㎡/月）', '数据日期', '距项目（km）', '备注'], ...(model.market?.comparables || []).map(x => [x.name, x.address, x.floor, x.category, x.leasableArea, x.rent, x.date, x.distanceKm, x.note])], [24, 30, 10, 16, 18, 22, 14, 14, 28]);
  addSheet(wb, '年度收益20年', [['运营年', '日历年', '营业收入（万元）', '运营成本（万元）', '税费（万元）', 'NOI（万元）', '项目现金流（万元）', '累计项目现金流（万元）'], ...(result.annual || []).map(x => [x.opYear, x.calendarYear, x.revenue, x.operatingCost, x.taxes, x.noi, x.projectCashFlow, x.cumulativeProjectCashFlow])], [10, 10, 18, 18, 16, 16, 20, 24]);
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
    ['项目IRR', s.projectIrr == null ? '不适用' : `${(s.projectIrr * 100).toFixed(1)}%`],
    ['项目NPV', `${s.projectNpv.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元`],
    ['稳定期NOI', `${s.stableNoi.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万元/年`],
    ['NOI回报率', `${(s.noiYield * 100).toFixed(1)}%`],
    ['静态回收期', s.staticPayback == null ? '未回收' : `${s.staticPayback.toFixed(1)} 年`],
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
  addSlideTitle(slide, '20年营业收入与NOI', '金额单位：万元');
  slide.addChart(pptx.ChartType.line, [
    { name: '营业收入', labels: result.annual.map(x => `Y${x.opYear}`), values: result.annual.map(x => x.revenue) },
    { name: 'NOI', labels: result.annual.map(x => `Y${x.opYear}`), values: result.annual.map(x => x.noi) },
  ], { x: 0.7, y: 1.45, w: 12.0, h: 5.3, showLegend: true, legendPos: 't', showTitle: false, lineDataSymbol: 'none', chartColors: ['1D6B57', 'D6A84B'], catAxisLabelFontSize: 8, valAxisLabelFontSize: 9 });

  slide = pptx.addSlide();
  addSlideTitle(slide, '租赁与联营规则', '不同业态可采用纯租金、纯扣点或保底与扣点取高');
  const catRows = [['业态', '基准租金', '业态系数', '销售基数', '扣点率', '结算方式'], ...(result.model.categories || []).map(x => [x.name, `${x.rent} 元/㎡/月`, x.factor, `${x.salesPerSqmMonth} 元/㎡/月`, `${(x.concessionRate * 100).toFixed(1)}%`, x.revenueMode])];
  slide.addTable(catRows, { x: 0.7, y: 1.45, w: 12.0, colW: [1.5, 2.2, 1.4, 2.3, 1.4, 2.4], border: { color: 'E6E1D8', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 9, margin: 0.05, rowH: 0.32, autoFit: false });

  slide = pptx.addSlide();
  addSlideTitle(slide, '项目租金与市场位置', '竞品租金样本用于校准项目一铺一价');
  const ms = result.marketSummary;
  slide.addText(`项目平均租金\n${ms.projectAverageRent.toFixed(1)} 元/㎡/月`, { x: 0.75, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'E5F0EB' }, margin: 0.16, breakLine: false });
  slide.addText(`市场加权均价\n${ms.weightedAverageRent.toFixed(1)} 元/㎡/月`, { x: 4.45, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'F7ECD4' }, margin: 0.16 });
  slide.addText(`市场中位数\n${ms.medianRent.toFixed(1)} 元/㎡/月`, { x: 8.15, y: 1.65, w: 3.4, h: 1.1, fontFace: 'Microsoft YaHei', fontSize: 16, bold: true, color: '103B33', fill: { color: 'FBF8F1' }, margin: 0.16 });
  slide.addText((ms.conclusions || []).map((x, i) => `${i + 1}. ${x}`).join('\n\n'), { x: 0.8, y: 3.15, w: 11.7, h: 2.7, fontFace: 'Microsoft YaHei', fontSize: 12, color: '17211E', breakLine: false, valign: 'top', margin: 0.05 });

  slide = pptx.addSlide();
  addSlideTitle(slide, 'NPV敏感性分析', '租金与投资同时变动时的项目NPV（万元）');
  const matrixRows = [['租金↓ / 投资→', ...(result.sensitivity.capexSteps || []).map(v => `${(v * 100).toFixed(0)}%`)], ...(result.sensitivity.rentSteps || []).map((rent, i) => [`${(rent * 100).toFixed(0)}%`, ...(result.sensitivity.npvMatrix[i] || []).map(v => v.toLocaleString('zh-CN', { maximumFractionDigits: 0 }))])];
  slide.addTable(matrixRows, { x: 1.15, y: 1.55, w: 10.9, colW: [2.0, 1.75, 1.75, 1.75, 1.75, 1.75], border: { color: 'D9E1F2', width: 0.5 }, fill: 'FFFFFF', color: '17211E', fontFace: 'Microsoft YaHei', fontSize: 10, align: 'center', valign: 'mid', margin: 0.06, rowH: 0.46 });

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
  if (shop === 'mall') return '购物中心';
  if (shop === 'department_store') return '百货商场';
  if (['supermarket', 'convenience'].includes(shop)) return '超市便利';
  if (amenity === 'marketplace') return '传统市场';
  if (['clothes', 'shoes', 'jewelry', 'cosmetics', 'electronics', 'furniture', 'sports'].includes(shop)) return '零售商业';
  if (['restaurant', 'cafe', 'fast_food'].includes(amenity)) return '餐饮';
  if (amenity === 'cinema') return '影院';
  if (['fitness_centre', 'sports_centre'].includes(leisure)) return '健身运动';
  if (tags.tourism === 'hotel') return '酒店';
  return null;
}

const LIUZHOU_MARKET = {
  provider: 'OpenStreetMap Overpass（缓存演示）',
  center: { lat: 24.341202, lon: 109.430294 },
  radiusKm: 3,
  totalPoi: 35,
  competitorCount: 11,
  densityPerKm2: 1.2,
  competitionLevel: '商业供给密集',
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
  if (Math.abs(lat - 24.341202) < 0.05 && Math.abs(lon - 109.430294) < 0.05) {
    return { ...LIUZHOU_MARKET, requestedRadiusKm: radiusKm, effectiveRadiusKm: 3, fallbackUsed: radiusKm !== 3 };
  }
  const radiusM = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];(nwr["shop"~"mall|department_store|supermarket|convenience|clothes|shoes|jewelry|cosmetics|electronics|furniture|sports"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});nwr["amenity"~"restaurant|cafe|fast_food|cinema|marketplace"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});nwr["leisure"~"fitness_centre|sports_centre"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)});nwr["tourism"="hotel"](around:${radiusM},${lat.toFixed(7)},${lon.toFixed(7)}););out tags center;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 27000);
  try {
    const response = await nativeFetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json' },
      body: new URLSearchParams({ data: query }).toString(), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const counts = {};
    const competitors = [];
    const seen = new Set();
    for (const element of payload.elements || []) {
      const key = `${element.type}:${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tags = element.tags || {};
      const category = classifyPOI(tags);
      if (!category) continue;
      counts[category] = (counts[category] || 0) + 1;
      const center = element.center || {};
      const poiLat = center.lat ?? element.lat;
      const poiLon = center.lon ?? element.lon;
      if (['购物中心', '百货商场', '超市便利', '传统市场'].includes(category) && tags.name) {
        competitors.push({ name: tags.name, category, distanceKm: poiLat != null && poiLon != null ? haversineKm(lat, lon, Number(poiLat), Number(poiLon)) : null, lat: poiLat, lon: poiLon });
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const competitorCount = ['购物中心', '百货商场', '超市便利', '传统市场'].reduce((sum, name) => sum + (counts[name] || 0), 0);
    const density = total / (Math.PI * radiusKm * radiusKm);
    return {
      provider: 'OpenStreetMap Overpass', center: { lat, lon }, radiusKm, totalPoi: total, competitorCount, densityPerKm2: density,
      competitionLevel: competitorCount < 5 ? '竞争相对有限' : competitorCount < 10 ? '中等竞争' : '商业供给密集',
      categories: Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      competitors: competitors.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 20),
      summary: `${radiusKm}公里范围内识别到${total}个相关商业POI，其中购物中心、百货、超市和传统市场等直接竞品约${competitorCount}个。`,
      coverageNote: '公开地图POI覆盖程度因城市和街区而异；该结果用于供给密度初筛，正式决策应结合实地踏勘和授权市场数据库。',
    };
  } finally {
    clearTimeout(timer);
  }
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
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const users = await ensureUsers();
    const user = users[username];
    if (!user || user.passwordHash !== await sha256(password)) return jsonResponse({ error: '用户名或密码错误' }, 401);
    return jsonResponse({ token: tokenFor(username), user: { username, displayName: user.displayName || username } });
  }

  if (pathname.endsWith('/api/register') && method === 'POST') {
    const body = await requestJSON(init);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const displayName = String(body.displayName || username).trim();
    if (username.length < 3) return jsonResponse({ error: '用户名至少3个字符' }, 400);
    if (password.length < 6) return jsonResponse({ error: '密码至少6个字符' }, 400);
    const users = await ensureUsers();
    if (users[username]) return jsonResponse({ error: '该用户名已存在' }, 409);
    users[username] = { username, displayName, passwordHash: await sha256(password) };
    writeJSON(USERS_KEY, users);
    return jsonResponse({ token: tokenFor(username), user: { username, displayName } });
  }

  if (pathname.endsWith('/api/logout') && method === 'POST') return jsonResponse({ ok: true });

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

  if (pathname.endsWith('/api/projects') && method === 'GET') {
    await ensureDemoProject(user.username);
    const rows = getProjects(user.username);
    const projects = [];
    for (const project of rows) {
      let summary = {};
      try { summary = (await calculate(project.model, false)).summary; } catch {}
      projects.push({ ...project, summary });
    }
    projects.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return jsonResponse({ projects });
  }

  if (pathname.endsWith('/api/projects') && method === 'POST') {
    const body = await requestJSON(init);
    const model = await normalizeModel(body.model || await defaultModel(String(body.name || '未命名商业项目')));
    const now = isoNow();
    const project = { id: crypto.randomUUID(), model, createdAt: now, updatedAt: now };
    const rows = getProjects(user.username);
    rows.unshift(project);
    saveProjects(user.username, rows);
    return jsonResponse({ project, result: await calculate(model, false) });
  }

  const match = pathname.match(/\/api\/projects\/([0-9a-f-]{8,64})(?:\/export\/(xlsx|pptx))?$/i);
  if (match) {
    const id = match[1];
    const format = match[2];
    const rows = getProjects(user.username);
    const idx = rows.findIndex(x => x.id === id);
    if (idx < 0) return jsonResponse({ error: '项目不存在' }, 404);
    if (format === 'xlsx') {
      const result = await calculate(rows[idx].model, true);
      return fileResponse(exportExcel(result), `${result.summary.projectName || '项目'}_投资测算.xlsx`, XLSX_MIME);
    }
    if (format === 'pptx') {
      const result = await calculate(rows[idx].model, true);
      return fileResponse(await exportPPT(result), `${result.summary.projectName || '项目'}_投资汇报.pptx`, PPTX_MIME);
    }
    if (method === 'GET') return jsonResponse({ project: rows[idx], result: await calculate(rows[idx].model, true) });
    if (method === 'PUT') {
      const body = await requestJSON(init);
      rows[idx].model = await normalizeModel(body.model || body);
      rows[idx].updatedAt = isoNow();
      saveProjects(user.username, rows);
      return jsonResponse({ project: rows[idx], result: await calculate(rows[idx].model, true) });
    }
    if (method === 'DELETE') {
      rows.splice(idx, 1);
      saveProjects(user.username, rows);
      return jsonResponse({ ok: true });
    }
  }

  if (pathname.endsWith('/api/health')) return jsonResponse({ ok: true, mode: 'static-browser', time: new Date().toISOString() });
  return jsonResponse({ error: '接口不存在' }, 404);
}

window.fetch = async function duoduoFetch(input, init = {}) {
  const rawUrl = typeof input === 'string' ? input : input?.url || '';
  const url = new URL(rawUrl, location.href);
  if (!url.pathname.includes('/api/')) return nativeFetch(input, init);
  try {
    await pyodideReady;
    return await handleApi(rawUrl, init);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: String(error?.message || error || '浏览器本地处理失败') }, 500);
  }
};


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: './' }).catch(error => {
    console.warn('离线缓存未启用', error);
  });
}
