#!/usr/bin/env python3
"""Cross-module consistency audit for the Duoduo commercial real-estate app."""

from __future__ import annotations

import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import engine  # noqa: E402


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def require_text(source: str, needle: str, label: str) -> None:
    if needle not in source:
        raise AssertionError(f"{label}: missing {needle!r}")


def function_segment(source: str, function_name: str) -> str:
    start = source.index(f"function {function_name}")
    end = source.find("\nfunction ", start + 1)
    return source[start : end if end >= 0 else len(source)]


def close(left: float, right: float, tolerance: float = 1e-6) -> bool:
    return abs(float(left) - float(right)) <= tolerance


def audit_version_and_cache() -> None:
    version = read("VERSION").splitlines()[0].strip()
    app = read("app.js")
    index = read("index.html")
    backend = read("backend.js")
    sw = read("sw.js")
    fix_login = read("fix-login.html")
    require_text(app, f"const APP_VERSION = '{version}';", "APP_VERSION")
    marker_match = re.search(r"app\.js\?v=([^\"']+)", index)
    assert marker_match, "index.html: app.js cache marker missing"
    marker = marker_match.group(1)
    for source, label in ((app, "app.js"), (backend, "backend.js"), (sw, "sw.js"), (fix_login, "fix-login.html")):
        if label == "app.js":
            require_text(source, f"backend.js?v={marker}", "app.js backend import marker")
        elif label == "backend.js":
            require_text(source, f"engine.py?v={marker}", "backend.js engine marker")
        else:
            require_text(source, marker, f"{label} cache marker")


def audit_defaults_and_units() -> None:
    model = engine.default_model("一致性审计")
    assert model["project"]["rentAreaBasis"] == "leasable"
    assert model["project"]["ownerRentAreaBasis"] == "building"
    assert all("paymentMode" in item and "depositMonths" in item and "prepaidRentMonths" in item for item in model["categories"])
    total_months = float(model["project"]["leasingPeriodMonths"])
    assert total_months == 12.0
    team_months = [float(item["months"]) for item in model["preOpeningBudget"]["team"]["positions"]]
    service_months = [float(item["months"]) for item in model["preOpeningBudget"]["property"]["services"]]
    admin_months = [float(item["months"]) for item in model["preOpeningBudget"]["admin"]["items"] if item["period"] == "monthly"]
    assert set(team_months) == {total_months}, team_months
    assert set(service_months) == {total_months}, service_months
    assert set(admin_months) == {total_months}, admin_months
    assert all(service.get("positions") for service in model["preOpeningBudget"]["property"]["services"])
    normalized_office = engine.normalize_model(model)
    assert len(normalized_office["officeBudget"]["items"]) == 6

    backend = read("backend.js")
    app = read("app.js")
    engine_text = read("engine.py")
    require_text(engine_text, "constructionPeriodUnit", "construction duration unit")
    require_text(engine_text, "constructionMonthsInput", "construction duration months input")
    require_text(engine_text, "owner_rent_month_billable", "owner rent-free monthly recognition")
    require_text(engine_text, "actual_construction_months", "monthly funding uses actual construction months")
    require_text(backend, "['默认筹备月数', 12,", "preopening template default months")
    for department, position, salary in (
        ("项目筹备组", "筹备负责人", 18000),
        ("招商部", "招商经理", 12000),
        ("运营部", "运营经理", 12000),
        ("市场推广部", "市场推广经理", 10000),
        ("财务行政部", "财务行政专员", 9000),
        ("物业工程部", "工程机电主管", 9000),
    ):
        require_text(backend, f"['{department}', '{position}', 0, {salary}, 12,", f"template {position} months")
    for service, mode, salary in (
        ("物业工程", "自营（自行招聘）", 8000),
        ("保安服务", "第三方常驻外包", 5500),
        ("保洁服务", "第三方常驻外包", 4500),
    ):
        require_text(backend, f"['{service}', '{mode}', 0, {salary}, 12,", f"template {service} months")
    require_text(backend, "addSheet(wb, '物业服务岗位'", "property service position template")
    require_text(backend, "['物业工程', '物业经理', 0, 13000,", "property manager template")
    require_text(app, "data-add-preop-property-position", "property position add action")
    require_text(app, "data-remove-preop-property-position", "property position delete action")
    require_text(app, "org-delete-btn danger-text", "organization icon delete action")
    assert "<span>删除岗位</span>" not in app
    assert "<span>删除部门</span>" not in app
    require_text(backend, "body.mode === 'local'", "local fallback registration")
    require_text(app, "离线兼容登录", "local fallback login UI")
    require_text(backend, "cloudLoginIdentity", "local login cloud upgrade")
    require_text(backend, "cloudRegisterIdentity", "local login cloud registration fallback")
    require_text(backend, "cloudLinked: true", "local login cloud link response")
    require_text(backend, "自动提交云端账号申请", "local account cloud approval queue")
    require_text(backend, "_duoduoLocalProjectId", "local project migration marker")
    require_text(app, "重新登录并同步", "local project manual re-login sync action")
    require_text(app, "parseDD4CompressedBytes", "share code byte-length compatibility")
    require_text(app, "decompressShareJson", "legacy share code repair")
    require_text(app, "shareUsernameTopic", "username inbox routing")
    require_text(app, "对方用户名或昵称", "username or nickname recipient field")
    require_text(app, "const displayNameTopic = await shareUsernameTopic", "display name delivery routing")
    require_text(app, "renderInvestmentOutcomeDiagnostic", "investment loss diagnosis")
    require_text(app, "为什么当前测算显示亏损、IRR不适用或未回收", "loss diagnosis explanation")
    require_text(app, "buildOperatingLedger", "operating ledger")
    require_text(app, "运营收入、成本与物业/商管/空调收费结余", "operating ledger title")
    require_text(app, "为 0 / 异常原因", "zero-value reason column")
    require_text(app, "三项经营性费用收入合计", "three-fee revenue subtotal")
    require_text(app, "收费结余（不是净利润）", "three-fee surplus")
    require_text(backend, "经营归集与为0原因", "Excel operating ledger")
    require_text(backend, "对应物业/能耗成本", "Excel three-fee service cost")
    require_text(app, "直接发送到伙伴项目工作台", "direct project delivery wording")
    require_text(app, "由 ${escapeHtml(sharedFrom)} 发送，已直接加入工作台", "project sender attribution")
    assert "站内收件箱" not in app
    require_text(app, "仅本机 · 未进入管理员后台", "project storage status")
    require_text(app, "发现 ${localOnlyCount} 个仅本机项目", "local-only project warning")
    require_text(backend, "storage: 'cloud'", "cloud project storage marker")
    assert "userOK && (!keyword || haystack.includes(keyword))" not in app
    require_text(app, "buildStatusAdvice", "actionable live status advice")
    require_text(app, "单靠压缩投资无法解决", "investment diagnosis action")
    require_text(app, "稳定年NOI需增加约", "quantified NOI improvement target")
    require_text(app, "项目租金均价", "project average rent label")
    require_text(app, "简单算术均价", "simple average comparison")
    require_text(app, "导入单价面积加权值", "imported rent comparison")
    require_text(app, "项目租金均价 = 满租月租金总收入 ÷ 商户计租面积合计", "project rent average formula")
    require_text(app, "分楼层租金均价核算", "floor rent average table")
    require_text(app, "楼层均价 = 该层满租月租金收入 ÷ 该层商户计租面积", "floor rent average formula")
    require_text(app, "buildKpiNarratives", "KPI reason and action narratives")
    require_text(app, "未回收原因", "unrecovered reason")
    require_text(app, "不适用原因", "IRR unavailable reason")
    require_text(app, "提高到约", "target rent recommendation")
    require_text(app, "不能只靠提租", "practical rent ceiling advice")
    require_text(app, "满租季度租金收入", "quarterly rent income")
    require_text(app, "运营周期实收租金", "operating-period collected rent income")
    require_text(app, "满租季度租金（万元）", "floor quarterly rent")
    require_text(app, "运营期分摊租金（万元）", "floor operating-period allocation")
    require_text(app, "propertyAnnualRent", "owner annual rent input")
    require_text(app, "按年租金总额", "annual owner rent mode")
    require_text(app, "物业年租金总价", "annual owner rent field")
    require_text(app, "物业租金反算结果", "owner rent derivation summary")
    require_text(engine_text, 'property_pricing_mode == "annual_total"', 'engine annual owner rent mode')
    require_text(app, "updateQuickRentEstimateFromModel", "instant rent recalculation")
    require_text(app, "租金指标已按当前输入即时更新，NOI/NPV正在重算", "live recalculation status")
    require_text(app, 'data-live="quarterlyRent"', 'live quarterly rent updates')
    require_text(app, 'data-live="operationRent"', 'live operating-period rent updates')
    require_text(app, "previewRefreshPending", "post-preview DOM refresh")
    require_text(app, "previewRequestSeq", "stale preview request protection")
    require_text(app, "applyCalculationResult(result);", "live preview publishes latest result globally")
    require_text(app, "sidebar-build", "workspace version badge")
    require_text(app, "function fmt(value, digits = 2)", "two-decimal numeric display default")
    require_text(app, "minimumFractionDigits: precision, maximumFractionDigits: precision", "fixed decimal display")
    require_text(app, "function fmtArea(value) {\n  return fmt(value, 2);", "two-decimal area display")
    require_text(app, "syncFloorRentToShops", "floor rent to shop rent synchronization")
    sync_floor_rent = function_segment(app, "syncFloorRentToShops")
    require_text(sync_floor_rent, "syncFloorOverrideAverage(model, floor, nextRent)", "floor rent edits resync shop overrides")
    require_text(app, "function reconcileFloorRentOverrides(model)", "automatic floor-rent reconciliation")
    require_text(app, "已自动按楼层基准租金同步", "automatic floor-rent synchronization notice")
    ensure_floors = function_segment(app, "ensureFloorsFromShops")
    require_text(ensure_floors, "floor.avgRent = Number(avg.toFixed(2));", "shop rent edits refresh floor actual average")
    require_text(app, "实际楼层平均租金 = 该层实际月租金收入 ÷ 该层商户计租面积", "floor rent average formula")
    require_text(app, "项目平均租金 = 项目实际月租金收入 ÷ 项目商户计租面积", "project rent average formula")
    require_text(app, "data-floor-avg-allocated", "floor allocated rent post-preview update")
    require_text(app, "displayedMonthlyRent", "exact current-model rent display")
    require_text(app, "displayedAverageRent", "exact current-model average rent display")
    require_text(app, "fmt(displayedMonthlyRent, 2)", "two-decimal monthly rent display")
    require_text(app, "data-floor-avg-monthly", "immediate floor rent DOM update")
    require_text(app, "data-project-rent-monthly", "immediate project rent total update")
    require_text(app, "租金指标已按当前输入即时更新，NOI/NPV正在重算", "instant rent status message")
    require_text(app, "自然年运营收入与支出报表", "natural-year report UI")
    require_text(app, "建设期核算方式", "construction duration unit selector")
    require_text(app, "project.constructionMonthsInput", "construction duration in months")
    require_text(app, "业主免租开始日期", "owner rent-free start date")
    require_text(app, "业主免租结束日期", "owner rent-free end date")
    require_text(app, "逐年经营收入明细", "natural-year income detail table")
    require_text(app, "逐年成本、税费与现金流", "natural-year cost and cash-flow table")
    require_text(app, "natural-year-income-table", "natural-year income table layout")
    require_text(app, "物业管理费收入", "natural-year property fee revenue")
    require_text(app, "商业管理费收入", "natural-year commercial management revenue")
    require_text(app, "中央空调费收入", "natural-year central AC revenue")
    require_text(app, "三项费用合计", "natural-year fee subtotal")
    require_text(app, "其他收入", "natural-year other revenue")
    require_text(app, "下载调整模板", "natural-year adjustment template")
    require_text(app, "导入调整", "natural-year adjustment import")
    require_text(app, "首尾不足一年按实际日期和有效月数核算", "natural-year partial period basis")
    require_text(backend, "自然年运营报表", "natural-year Excel export")
    require_text(backend, "自然年调整模板", "natural-year adjustment workbook")
    require_text(app, "budget.monthsVersion = 2", "preopening month migration")
    require_text(app, "data-sync-preopening-months", "preopening month sync action")
    require_text(app, "add-office-budget-item", "office budget add action")
    require_text(app, "remove-office-budget-item", "office budget delete action")
    require_text(app, "feeCustomized", "building central AC fee override")
    require_text(app, "enable-all-central-ac", "central AC bulk enable action")
    revenue_assumptions = function_segment(app, "renderRevenueAssumptionsSection")
    assert "breakdowns.get(" in revenue_assumptions
    require_text(revenue_assumptions, "const breakdowns = centralAcBuildingAreaBreakdown(model);", "central AC floor breakdown initialization")
    require_text(revenue_assumptions, "central-ac-floor-row", "central AC floor breakdown rows")
    require_text(revenue_assumptions, "fee-collection-toggle", "central AC explicit collection options")
    require_text(revenue_assumptions, 'value="true"', "central AC collect option")
    detailed_pricing = function_segment(app, "renderDetailedPricing")
    require_text(detailed_pricing, "hasPreviewSummary ? Number(preview.summary.totalMonthlyRent", "detailed pricing uses live calculated monthly rent")
    live_stats = function_segment(app, "updateLiveStats")
    require_text(live_stats, "detailedMode ? Number(summary.totalMonthlyRent", "live detailed rent summary")
    require_text(live_stats, "detailedMode ? Number(summary.averageRent", "live detailed average rent")

    office = function_segment(app, "renderOfficeBudgetSection")
    leasing = function_segment(app, "renderLeasingBudgetSection")
    assert 'data-budget-unit="yuan"' in office and "录入金额（元/期）" in office
    assert 'data-budget-unit="yuan"' not in leasing and "录入金额（万元/期）" in leasing


def audit_presets_and_formulas() -> None:
    app = read("app.js")
    backend = read("backend.js")
    for preset in ("shopping", "department", "outlet", "street", "community", "community_base"):
        require_text(app, f"  {preset}: {{", f"settlement preset {preset}")
    for project_type in ("街区商业", "社区商业", "社区底商"):
        require_text(app, project_type, f"project type {project_type}")
    require_text(app, "一铺一价=商铺建筑面积×（1+公区系数）", "area formula")
    require_text(app, "初步测算=楼层建筑面积合计", "area formula")
    require_text(app, "商户租金核算面积口径", "merchant rent basis UI")
    require_text(app, "业主租金支付面积口径", "owner rent basis UI")
    require_text(app, "const rentAreaRecords = mode === 'detailed' && shops.length ? shops : floors", "merchant basis summary cascade")
    require_text(app, "rentAreaBasisOverride", "manual shop basis exception")
    require_text(app, "data-shop-settlement", "live settlement mode label")
    require_text(backend, "商户租金核算面积口径", "merchant rent basis template")
    require_text(backend, "商铺计租例外", "shop rent basis exception template")
    require_text(backend, "exportShopAuditWorkbook", "formula audit workbook")
    require_text(backend, "setFormulaCell", "formula cells in audit workbook")
    require_text(backend, "一铺一价核算表：公式、函数与修改说明", "formula audit instructions")
    require_text(app, "导出核算表（含公式）", "audit workbook export action")
    require_text(backend, "function formatWorkbook", "shared Excel visual system")
    require_text(backend, "cellStyles: true", "styled workbook writing")
    require_text(read("vendor/xlsx.full.min.js"), "xlsx-js-style", "styled Excel browser library")
    require_text(backend, "业主租金支付面积口径", "owner rent basis export")
    require_text(app, "企业所得税（融资前项目口径）", "project income tax label")
    require_text(app, "企业所得税（融资后股权口径）", "equity income tax label")
    require_text(backend, "融资前项目所得税", "project income tax export")
    require_text(backend, "融资后股权所得税", "equity income tax export")
    require_text(app, "阶段性招商调整期", "leasing stage UI")
    require_text(read("engine.py"), "leasingAdjustmentPeriods", "leasing stage engine")


def audit_function_annotations() -> None:
    app = read("app.js")
    backend = read("backend.js")
    for source, marker, label in (
        (app, "const FUNCTION_DEFINITIONS = {", "app.js"),
        (backend, "const EXPORT_FUNCTIONS = {", "backend.js"),
    ):
        start = source.index(marker)
        end = source.index("\n};", start)
        known = set(re.findall(r"^\s*'([^']+)':", source[start:end], re.MULTILINE))
        used = set()
        for block in re.findall(r"functions:\s*\[([^\]]*)\]", source):
            used.update(re.findall(r"'([^']+)'", block))
        for block in re.findall(r"formulaPanel\([^\n]*?\[([^\]]*)\]", source):
            used.update(re.findall(r"'([^']+)'", block))
        missing = sorted(used - known)
        assert not missing, f"{label}: missing function annotations {missing}"


def audit_engine_invariants() -> None:
    model = engine.default_model("完整一致性回归")
    model["calculationMode"] = "detailed"
    model["shops"] = [
        {
            "id": f"X{i:02d}",
            "building": "1号楼",
            "floor": "1F",
            "buildingArea": 100,
            "leasableArea": 80,
            "category": "零售",
            "rentOverride": 1000,
            "conditions": [],
        }
        for i in range(18)
    ]
    model["project"]["commonAreaFactor"] = 0.2
    model["finance"]["debtRatio"] = 0.5
    model["taxes"]["corporateTax"] = 0.25
    model["operations"]["stableYear"] = 4
    model["operations"]["leasingAdjustmentPeriods"] = [
        {
            "name": "品牌升级期",
            "startYear": 4,
            "endYear": 6,
            "rentAdjustmentRate": 0.1,
            "targetOccupancy": 0.9,
            "oneOffLeasingCost": 50,
        }
    ]
    result = engine.calculate_model(model, include_sensitivity=False)
    summary = result["summary"]
    assert close(summary["grossFloorArea"], 2160)
    assert close(summary["shopBuildingArea"], 1800)
    assert close(summary["leasableArea"], 1440)
    assert close(sum(item["value"] for item in result["investmentBreakdown"]), summary["totalInvestment"])

    rows = {row["opYear"]: row for row in result["annual"] if row.get("opYear", 0) > 0}
    assert close(summary["periodNetProfit"], sum(row["netProfit"] for row in rows.values()))
    all_cash_rows = list(result["constructionCashflow"]) + list(result["annual"])
    assert close(summary["projectProfitTotal"], sum(row["projectCashFlow"] for row in all_cash_rows))
    operation_recovery = sum(row["noi"] - row["capexReserve"] - row["projectIncomeTax"] for row in rows.values())
    assert close(summary["operationCashAvailableForInitialRecovery"], operation_recovery)
    assert close(summary["capitalRecoveredByOperation"], max(0.0, operation_recovery))
    assert close(summary["unrecoveredInitialInvestment"], max(0.0, summary["totalInvestment"] - max(0.0, operation_recovery)))
    for year, row in rows.items():
        assert close(row["revenue"] - row["operatingCost"] - row["taxes"], row["noi"]), f"NOI mismatch {year}"
        assert close(row["noi"] - row["projectCapex"] - row["projectIncomeTax"] + row["exitValue"], row["projectCashFlow"]), f"project CF mismatch {year}"
        assert close(row["vatPayable"] + row["taxes"] + row["projectIncomeTax"], row["taxCashOutflow"]), f"tax cash mismatch {year}"
        assert close(row["vatPayable"] + row["taxes"] + row["equityIncomeTax"], row["equityTaxCashOutflow"]), f"equity tax cash mismatch {year}"
    assert close(rows[4]["rentGrowthFactor"], rows[4]["baseRentGrowthFactor"] * 1.1)
    assert close(rows[4]["occupancy"], 0.9)
    assert close(rows[4]["leasingStageCost"], 50)
    assert close(rows[5]["leasingStageCost"], 0)
    assert rows[7]["leasingStageName"] == ""

    preliminary = engine.default_model("初步面积优先级")
    preliminary["calculationMode"] = "preliminary"
    preliminary["floors"] = [{"building": "1号楼", "name": "1F", "buildingArea": 1000, "leasableArea": 800, "avgRent": 100, "rentAreaBasis": "leasable"}]
    preliminary["project"]["gbaOverride"] = 1500
    assert close(engine.calculate_model(preliminary, False)["summary"]["grossFloorArea"], 1500)

    basis_model = engine.default_model("双面积口径审计")
    basis_model["calculationMode"] = "detailed"
    basis_model["shops"] = [{
        "id": "A-101",
        "building": "1号楼",
        "floor": "1F",
        "buildingArea": 100,
        "leasableArea": 80,
        "category": "零售",
        "rentOverride": 100,
    }]
    basis_model["project"]["rentAreaBasis"] = "building"
    building_basis = engine.calculate_model(basis_model, False)
    assert close(building_basis["summary"]["totalMonthlyRent"], 10000)
    basis_model["project"]["rentAreaBasis"] = "leasable"
    leasable_basis = engine.calculate_model(basis_model, False)
    assert close(leasable_basis["summary"]["totalMonthlyRent"], 8000)
    assert close(leasable_basis["shops"][0]["includedConcessionRevenue"], 0)
    assert close(leasable_basis["shops"][0]["includedGuaranteeRevenue"], 8000)
    assert close(leasable_basis["summary"]["grossFloorArea"], 120)
    assert leasable_basis["summary"]["rentAreaBasis"] == "leasable"
    basis_model["shops"][0]["rentAreaBasis"] = "leasable"
    basis_model["shops"][0]["rentAreaBasisOverride"] = False
    basis_model["floors"] = [{"building": "1号楼", "name": "1F", "rentAreaBasis": "building", "buildingArea": 100, "leasableArea": 80, "avgRent": 100}]
    floor_override = engine.calculate_model(basis_model, False)
    assert close(floor_override["summary"]["totalMonthlyRent"], 10000)
    assert floor_override["shops"][0]["rentAreaBasis"] == "building"
    basis_model["shops"][0]["rentAreaBasisOverride"] = True
    shop_override = engine.calculate_model(basis_model, False)
    assert close(shop_override["summary"]["totalMonthlyRent"], 8000)
    assert shop_override["shops"][0]["rentAreaBasis"] == "leasable"

    basis_model["project"]["revenueModel"] = "guarantee_or_concession"
    basis_model["categories"][0]["salesPerSqmMonth"] = 1000
    basis_model["categories"][0]["concessionRate"] = 0.10
    take_higher = engine.calculate_model(basis_model, False)["shops"][0]
    assert close(take_higher["includedGuaranteeRevenue"] + take_higher["includedConcessionRevenue"], take_higher["monthlyRevenue"])
    assert close(min(take_higher["includedGuaranteeRevenue"], take_higher["includedConcessionRevenue"]), 0)

    owner_basis_model = engine.default_model("业主租金面积口径审计")
    owner_basis_model["calculationMode"] = "preliminary"
    owner_basis_model["floors"] = [{"building": "1号楼", "name": "1F", "buildingArea": 1000, "leasableArea": 800, "avgRent": 100}]
    owner_basis_model["ownerRent"].update({
        "enabled": True,
        "leaseType": "property",
        "propertyPricingMode": "unit",
        "propertyArea": 0,
        "propertyUnitRent": 100,
        "growthMode": "none",
        "growthRate": 0,
    })
    owner_basis_model["project"]["ownerRentAreaBasis"] = "building"
    owner_building = engine.calculate_model(owner_basis_model, False)
    assert close(owner_building["summary"]["ownerPropertyRentBaseAnnual"], 120)
    owner_basis_model["project"]["ownerRentAreaBasis"] = "leasable"
    owner_leasable = engine.calculate_model(owner_basis_model, False)
    assert close(owner_leasable["summary"]["ownerPropertyRentBaseAnnual"], 96)
    assert close(owner_building["summary"]["totalMonthlyRent"], owner_leasable["summary"]["totalMonthlyRent"])
    owner_row = next(row for row in owner_building["annual"] if row.get("ownerRent", 0) > 0)
    assert close(owner_row["operatingCost"], owner_row["operatingCostExOwnerRent"] + owner_row["ownerRent"])
    owner_natural = next(row for row in owner_building["naturalYearReport"] if row.get("ownerRent", 0) > 0)
    assert close(owner_natural["cashOperatingCost"], owner_natural["cashOperatingCostExOwnerRent"] + owner_natural["ownerRent"])
    full_owner_years = [row["ownerRent"] for row in owner_building["naturalYearReport"] if row.get("activeDays", 0) >= 365]
    assert full_owner_years and all(close(value, 120) for value in full_owner_years), full_owner_years

    leasehold_model = engine.default_model("租赁物业退出价值审计")
    leasehold_model["project"]["propertyRightsStatus"] = "leased"
    leasehold_model["project"]["acquisitionMethod"] = "lease"
    leasehold_model["ownerRent"].update({"enabled": True, "leaseType": "property", "propertyMonthlyRent": 100, "propertyPaymentMonths": 12})
    leasehold_result = engine.calculate_model(leasehold_model, False)
    assert leasehold_result["summary"]["exitValueAllowed"] is False
    assert close(leasehold_result["summary"]["exitValue"], 0)

    month_conflict = engine.default_model("筹备月数冲突")
    month_conflict["preOpeningBudget"]["mode"] = "detailed"
    month_conflict["preOpeningBudget"]["team"]["positions"][0]["months"] = 18
    conflict_diagnostics = engine.calculate_model(month_conflict, False)["diagnostics"]
    assert any(item.get("title") == "筹备明细月数超过筹备招商总周期" for item in conflict_diagnostics), conflict_diagnostics

    office_model = engine.default_model("办公费用自定义项目")
    office_model["officeBudget"]["itemSchema"] = 1
    office_model["officeBudget"]["items"] = [
        {"id": "custom_legal", "name": "法务顾问费", "annual": 12, "period": "annual", "note": "年度法律顾问"},
        {"id": "custom_audit", "name": "审计咨询费", "annual": 6, "period": "annual", "note": "专项审计"},
    ]
    office_result = engine.calculate_model(office_model, False)
    assert len(office_result["officeBreakdown"]) == 2
    assert close(office_result["summary"]["stableOfficeCost"], 18)
    office_model["officeBudget"]["items"] = []
    assert close(engine.calculate_model(office_model, False)["summary"]["stableOfficeCost"], 0)

    central_ac_model = engine.default_model("中央空调楼栋总控")
    central_ac_model["calculationMode"] = "detailed"
    central_ac_model["shops"] = [{
        "id": "AC-01", "building": "1号楼", "floor": "1F",
        "buildingArea": 100, "leasableArea": 80, "category": "零售",
        "rentOverride": 100, "centralAcFeeOverride": 9,
    }]
    central_ac_model["revenues"]["centralAcFee"] = 8
    central_ac_model["revenues"]["centralAcBuildings"] = [{"building": "1号楼", "enabled": False, "fee": 8}]
    disabled_ac = engine.calculate_model(central_ac_model, False)["shops"][0]
    assert close(disabled_ac["centralAcFee"], 0)
    assert close(disabled_ac["monthlyCentralAcFee"], 0)
    central_ac_model["revenues"]["centralAcBuildings"][0]["enabled"] = True
    enabled_ac = engine.calculate_model(central_ac_model, False)["shops"][0]
    assert close(enabled_ac["centralAcFee"], 9)
    assert close(enabled_ac["monthlyCentralAcFee"], 720)


def audit_monthly_cash_flow() -> None:
    model = engine.default_model("真实月度现金流审计")
    model["project"].update({
        "constructionStartDate": "2027-01-01",
        "constructionEndDate": "2027-07-01",
        "handoverDate": "2027-07-01",
        "leasingStartDate": "2027-07-01",
        "openingDate": "2027-10-01",
        "operationEndDate": "2029-09-30",
        "constructionPeriodUnit": "month",
        "constructionMonthsInput": 6,
        "leasingPeriodMonths": 3,
        "operationYears": 2,
        "startYear": 2027,
        "gbaOverride": 12000,
        "landArea": 4000,
        "landPrice": 5000,
        "preOpeningTeamCost": 60,
        "preOpeningPropertyCost": 30,
        "otherPreOpening": 10,
    })
    model["costs"].update({
        "preconstructionRate": 200,
        "constructionRate": 3000,
        "fitoutRate": 600,
        "equipmentRate": 250,
        "otherEngineeringRate": 80,
    })
    model["calculationMode"] = "detailed"
    model["shops"] = [
        {"id": f"CF{i:02d}", "building": "1号楼", "floor": "1F", "buildingArea": 500, "leasableArea": 400, "category": "零售", "rentOverride": 80}
        for i in range(12)
    ]
    model["operations"]["leasingMilestones"] = [
        {"date": "2027-10-01", "occupancy": 0.40},
        {"date": "2028-01-01", "occupancy": 0.70},
        {"date": "2028-07-01", "occupancy": 0.90},
    ]
    model["operations"]["rentFreeMonths"] = 0
    model["operations"]["rentFreeUntilDate"] = "2028-01-01"
    model["ownerRent"].update({
        "enabled": True,
        "leaseType": "property",
        "propertyMonthlyRent": 100,
        "propertyPaymentMonths": 12,
        "depositAmount": 300,
        "depositPaymentDate": "",
        "depositRefundDate": "",
        "paymentTiming": "arrears",
        "paymentFrequency": "monthly",
        "paymentStartDate": "2027-10-01",
        "rentFreeStartDate": "2027-10-01",
        "rentFreeEndDate": "2028-01-01",
    })
    result = engine.calculate_model(model, include_sensitivity=False)
    plan = result["monthlyFundingPlan"]
    assert len(plan) >= 24, len(plan)
    assert all(row.get("date") for row in plan)
    assert all(close(row["projectCashFlow"], row["operatingInflow"] + row["depositInflow"] - row["operatingOutflow"] - row["ownerRentOutflow"] - row["depositOutflow"] - row["taxOutflow"] - row["capexOutflow"] - row["incomeTaxOutflow"] + row["exitInflow"]) for row in plan)
    phase = {row["phase"]: row for row in result["phaseCashFlowSummary"]}
    construction = [row for row in plan if row["phase"] == "建设期"]
    assert close(phase["建设期"]["projectCashFlow"], sum(row["projectCashFlow"] for row in construction))
    operating_inflows = [row["operatingInflow"] for row in plan if row["phase"] == "运营期"][:9]
    assert max(operating_inflows) - min(operating_inflows) > 1e-6, operating_inflows
    assert any(row["prepaidRentInflow"] > 0 for row in plan), "prepaid rent cash inflow missing"
    assert any(row["preopeningManagementOutflow"] > 0 for row in plan), "management entry cost missing"
    assert result["summary"]["normalOperationWorkingCapital"] >= result["summary"]["normalOperationCapital"]
    category_cash = result["categoryPaymentAnalysis"]
    assert category_cash
    assert close(sum(item["depositCashInflow"] for item in category_cash), result["summary"]["merchantDepositCashInflow"])
    assert close(sum(item["prepaidRentCashInflow"] for item in category_cash), result["summary"]["merchantPrepaidRentCashInflow"])
    assert {event["date"] for item in category_cash for event in item.get("paymentEvents", [])} == {"2027-10-01", "2028-01-01", "2028-07-01"}
    assert close(sum(row["prepaidRentInflow"] for row in plan), result["summary"]["merchantPrepaidRentCashInflow"])
    assert sum(row["prepaidRentAmortization"] for row in plan) <= sum(row["prepaidRentInflow"] for row in plan) + 1e-6
    preopening_events = -sum(event["amount"] for event in result["keyCashEvents"] if event["category"] == "筹备支出")
    management_costs = sum(row["preopeningManagementOutflow"] for row in plan)
    assert close(preopening_events + management_costs, result["summary"]["softPreopeningInvestment"])
    hard_events = -sum(event["amount"] for event in result["keyCashEvents"] if event["category"] == "建设投资")
    assert close(hard_events, result["summary"]["hardInvestment"])
    all_cash_rows = list(result["constructionCashflow"]) + list(result["annual"])
    assert close(result["summary"]["projectProfitTotal"], sum(row["projectCashFlow"] for row in all_cash_rows))
    assert all(close(row["operatingCost"], row["operatingCostExOwnerRent"] + row["ownerRent"]) for row in result["annual"])
    for row in result["naturalYearReport"]:
        assert close(row["totalExpense"], row["cashOperatingCost"] + row["taxes"] + row["projectIncomeTax"] + row["projectCapex"])
    assert result["summary"]["peakProjectFundingDate"] in {row["date"] for row in plan}
    owner_deposit_events = [event for event in result["keyCashEvents"] if "业主" in event["name"] and "保证金" in event["name"]]
    assert any(event["date"] == "2027-07-01" and event["amount"] == -300 for event in owner_deposit_events)
    assert any(event["date"] == "2029-09-30" and event["amount"] == 300 for event in owner_deposit_events)


def main() -> None:
    audits = [
        audit_version_and_cache,
        audit_defaults_and_units,
        audit_presets_and_formulas,
        audit_function_annotations,
        audit_engine_invariants,
        audit_monthly_cash_flow,
    ]
    for audit in audits:
        audit()
        print(f"PASS {audit.__name__}")
    print(f"ALL_CONSISTENCY_AUDITS_PASS ({len(audits)} groups)")


if __name__ == "__main__":
    main()
