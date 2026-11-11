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
    total_months = float(model["project"]["leasingPeriodMonths"])
    assert total_months == 12.0
    team_months = [float(item["months"]) for item in model["preOpeningBudget"]["team"]["positions"]]
    service_months = [float(item["months"]) for item in model["preOpeningBudget"]["property"]["services"]]
    admin_months = [float(item["months"]) for item in model["preOpeningBudget"]["admin"]["items"] if item["period"] == "monthly"]
    assert set(team_months) == {total_months}, team_months
    assert set(service_months) == {total_months}, service_months
    assert set(admin_months) == {total_months}, admin_months
    assert all(service.get("positions") for service in model["preOpeningBudget"]["property"]["services"])

    backend = read("backend.js")
    app = read("app.js")
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
    require_text(app, "本机兼容登录", "local fallback login UI")
    require_text(app, "budget.monthsVersion = 2", "preopening month migration")
    require_text(app, "data-sync-preopening-months", "preopening month sync action")

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
    })
    owner_basis_model["project"]["ownerRentAreaBasis"] = "building"
    owner_building = engine.calculate_model(owner_basis_model, False)
    assert close(owner_building["summary"]["ownerPropertyRentBaseAnnual"], 120)
    owner_basis_model["project"]["ownerRentAreaBasis"] = "leasable"
    owner_leasable = engine.calculate_model(owner_basis_model, False)
    assert close(owner_leasable["summary"]["ownerPropertyRentBaseAnnual"], 96)
    assert close(owner_building["summary"]["totalMonthlyRent"], owner_leasable["summary"]["totalMonthlyRent"])

    month_conflict = engine.default_model("筹备月数冲突")
    month_conflict["preOpeningBudget"]["mode"] = "detailed"
    month_conflict["preOpeningBudget"]["team"]["positions"][0]["months"] = 18
    conflict_diagnostics = engine.calculate_model(month_conflict, False)["diagnostics"]
    assert any(item.get("title") == "筹备明细月数超过筹备招商总周期" for item in conflict_diagnostics), conflict_diagnostics


def main() -> None:
    audits = [
        audit_version_and_cache,
        audit_defaults_and_units,
        audit_presets_and_formulas,
        audit_function_annotations,
        audit_engine_invariants,
    ]
    for audit in audits:
        audit()
        print(f"PASS {audit.__name__}")
    print(f"ALL_CONSISTENCY_AUDITS_PASS ({len(audits)} groups)")


if __name__ == "__main__":
    main()
