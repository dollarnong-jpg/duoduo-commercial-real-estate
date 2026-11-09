from __future__ import annotations

import copy
import math
import re
from datetime import datetime
from typing import Any


CATEGORY_PRESETS = [
    {"name": "零售", "rent": 120.0, "factor": 1.00, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "餐饮", "rent": 110.0, "factor": 1.08, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "娱乐", "rent": 70.0, "factor": 0.78, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "教培", "rent": 80.0, "factor": 0.85, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "服务", "rent": 90.0, "factor": 0.92, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "超市/主力店", "rent": 50.0, "factor": 0.65, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
    {"name": "其他", "rent": 80.0, "factor": 0.90, "revenueMode": "inherit", "salesPerSqmMonth": 0.0, "concessionRate": 0.0},
]

CONDITION_PRESETS = [
    {"name": "电梯口", "premium": 0.05, "enabled": True},
    {"name": "通道口", "premium": 0.03, "enabled": True},
    {"name": "转角铺", "premium": 0.08, "enabled": True},
    {"name": "主入口", "premium": 0.12, "enabled": True},
    {"name": "中庭", "premium": 0.05, "enabled": True},
    {"name": "临街", "premium": 0.10, "enabled": True},
    {"name": "主力店相邻", "premium": 0.04, "enabled": True},
]


def default_model(name: str = "未命名商业项目") -> dict[str, Any]:
    return {
        "version": 1,
        "calculationMode": "preliminary",
        "project": {
            "name": name,
            "location": "广西壮族自治区",
            "latitude": None,
            "longitude": None,
            "mapZoom": 12,
            "locationSource": "",
            "projectType": "购物中心",
            "developmentType": "new_build",
            "rentAreaBasis": "leasable",
            "revenueModel": "rent",
            "startYear": datetime.now().year + 1,
            "constructionYears": 2,
            "operationYears": 20,
            "landArea": 0.0,
            "gbaOverride": 0.0,
            "commonAreaFactor": 0.20,
            "landPrice": 0.0,
            "otherPreOpening": 0.0,
            "preOpeningMarketing": 0.0,
            "contingencyRate": 0.05,
        },
        "ownerRent": {
            "enabled": False,
            "leaseType": "property",
            "landPricingMode": "total",
            "landArea": 0.0,
            "landUnitRent": 0.0,
            "landMonthlyRent": 0.0,
            "landPaymentMonths": 12,
            "propertyPricingMode": "total",
            "propertyArea": 0.0,
            "propertyUnitRent": 0.0,
            "propertyMonthlyRent": 0.0,
            "propertyPaymentMonths": 12,
            "monthlyRent": 0.0,
            "growthMode": "compound",
            "growthRate": 0.03,
            "annualIncrease": 0.0,
            "stepYears": 3,
        },
        "shops": [],
        "floors": [
            {"building": "1号楼", "name": "B1", "buildingArea": 0.0, "leasableArea": 0.0, "avgRent": 0.0, "rentAreaBasis": "inherit"},
            {"building": "1号楼", "name": "1F", "buildingArea": 0.0, "leasableArea": 0.0, "avgRent": 0.0, "rentAreaBasis": "inherit"},
            {"building": "1号楼", "name": "2F", "buildingArea": 0.0, "leasableArea": 0.0, "avgRent": 0.0, "rentAreaBasis": "inherit"},
            {"building": "1号楼", "name": "3F", "buildingArea": 0.0, "leasableArea": 0.0, "avgRent": 0.0, "rentAreaBasis": "inherit"},
        ],
        "conditionPremiums": copy.deepcopy(CONDITION_PRESETS),
        "categories": copy.deepcopy(CATEGORY_PRESETS),
        "market": {
            "radiusKm": 3,
            "comparables": [],
        },
        "costs": {
            "preconstructionRate": 250.0,
            "constructionRate": 3800.0,
            "municipalFeeRate": 0.0,
            "civilDefenseFeeRate": 0.0,
            "otherPublicFeeRate": 0.0,
            "fitoutRate": 1300.0,
            "equipmentRate": 650.0,
            "otherEngineeringRate": 150.0,
            "workingCapitalRate": 0.03,
        },
        "revenues": {
            "propertyFee": 18.0,
            "otherIncomeRatio": 0.05,
            "parkingSpaces": 0,
            "parkingMonthly": 300.0,
        },
        "operations": {
            "rentGrowth": 0.03,
            "occupancyY1": 0.70,
            "occupancyY2": 0.85,
            "stableOccupancy": 0.95,
            "stableYear": 3,
            "rentFreeMonths": 3.0,
            "collectionRate": 0.98,
            "renewalCycle": 3,
            "commissionMonths": 1.0,
            "renewalCommissionMonths": 0.5,
            "depositMonths": 3.0,
            "propertyOpsCost": 9.0,
            "energyCost": 4.0,
            "staffCostPerSqm": 11.0,
            "staffCostMode": "organization",
            "adminCostPerSqm": 2.0,
            "marketingRate": 0.02,
            "repairRate": 0.01,
            "insuranceRate": 0.0015,
            "capexRate": 0.02,
            "otherOpexRate": 0.005,
            "salesGrowth": 0.03,
            "rampY1": 0.80,
            "rampY2": 0.90,
            "annualCostAdjustments": {},
            "annualCostOverrides": {
                "propertyOps": 0.0,
                "energy": 0.0,
                "baseMaintenance": 0.0,
                "insurance": 0.0,
                "otherOpex": 0.0,
            },
            "opexPreset": {
                "standard": "standard",
                "managementMode": "mixed",
                "categories": {
                    "property": True, "energy": True, "staff": True, "office": True,
                    "leasing": True, "marketing": True, "maintenance": True,
                    "insurance": True, "other": True
                }
            },
        },
        "organization": {
            "socialInsuranceRate": 0.28,
            "annualSalaryMonths": 12.0,
            "annualBonusMonths": 0.0,
            "recruitmentTrainingRate": 0.02,
            "departments": [
                {"name": "总经办", "headcount": 2, "avgMonthlySalary": 18000, "note": "项目负责人、综合管理"},
                {"name": "招商部", "headcount": 6, "avgMonthlySalary": 12000, "note": "招商总监、招商经理、租赁专员"},
                {"name": "运营部", "headcount": 10, "avgMonthlySalary": 10000, "note": "运营经理、楼层主管、客服"},
                {"name": "市场推广部", "headcount": 4, "avgMonthlySalary": 11000, "note": "品牌、活动、新媒体、会员"},
                {"name": "财务行政部", "headcount": 3, "avgMonthlySalary": 9000, "note": "财务、人事行政、采购"},
                {"name": "物业工程部", "headcount": 6, "avgMonthlySalary": 8500, "note": "物业经理、工程、消防、强弱电"},
                {"name": "保安部", "headcount": 8, "avgMonthlySalary": 5500, "note": "秩序维护、监控、巡逻"},
                {"name": "保洁部", "headcount": 10, "avgMonthlySalary": 4200, "note": "公共区域保洁、垃圾清运"},
            ],
        },
        "officeBudget": {
            "officeRentAnnual": 60.0,
            "utilitiesAnnual": 12.0,
            "itSoftwareAnnual": 25.0,
            "officeSuppliesAnnual": 8.0,
            "travelEntertainmentAnnual": 15.0,
            "otherAnnual": 10.0,
        },
        "leasingBudget": {
            "channelFeeAnnual": 120.0,
            "eventsAnnual": 60.0,
            "materialsAnnual": 15.0,
            "travelAnnual": 10.0,
            "platformAnnual": 8.0,
            "otherAnnual": 5.0,
        },
        "marketingBudget": {
            "amountMode": True,
            "annualItems": [
                {"key": "promotion", "name": "营销推广", "amount": 80.0, "note": "节庆活动、主题推广、异业合作及日常营销执行"},
                {"key": "visual", "name": "商业美陈", "amount": 50.0, "note": "公共区域美陈、季节装饰、陈列更新"},
                {"key": "media", "name": "媒体宣传", "amount": 40.0, "note": "线上信息流、户外媒体、本地生活平台及公关传播"},
                {"key": "member", "name": "会员营销", "amount": 30.0, "note": "会员权益、积分、小程序、私域运营及会员活动"},
            ],
            "openingYearItems": [
                {"key": "wayfinding", "name": "导视导览", "amount": 20.0, "note": "开业导视、导览标识及临时指引"},
                {"key": "opening_visual", "name": "开业美陈", "amount": 40.0, "note": "开业主题美陈、氛围布置及公共空间装饰"},
            ],
        },
        "maintenanceBudget": {
            "elevatorAnnual": 20.0,
            "hvacAnnual": 25.0,
            "fireAnnual": 8.0,
            "landscapeAnnual": 10.0,
            "otherAnnual": 12.0,
        },
        "taxes": {
            "vatRent": 0.09,
            "vatProperty": 0.06,
            "vatOther": 0.06,
            "vatConcession": 0.06,
            "inputVatShare": 0.60,
            "inputVatRate": 0.06,
            "cityTax": 0.07,
            "educationSurcharge": 0.03,
            "localEducationSurcharge": 0.02,
            "propertyTaxMethod": "rent",
            "propertyTaxRateRent": 0.12,
            "propertyTaxRateValue": 0.012,
            "propertyValueDeduction": 0.30,
            "landUseTax": 0.0,
            "stampDuty": 0.001,
            "localFundRate": 0.0,
            "corporateTax": 0.25,
            "deedTax": 0.03,
            "exitTaxRate": 0.0,
        },
        "finance": {
            "debtRatio": 0.50,
            "loanRate": 0.045,
            "loanTerm": 15,
            "graceYears": 1,
        },
        "valuation": {
            "discountRate": 0.08,
            "exitCapRate": 0.06,
            "includeExit": True,
        },
        "formulas": {
            "rentGrowthMode": "compound",
            "buildingDepreciationYears": 20,
            "fitoutDepreciationYears": 5,
            "equipmentDepreciationYears": 10,
            "taxLossCarryforwardYears": 5,
            "loanRepaymentMethod": "equal_principal",
            "exitValueMethod": "noi_cap",
            "exitRevenueMultiple": 1.0,
            "sensitivityRentMin": 0.90,
            "sensitivityRentMax": 1.10,
            "sensitivityRentStep": 0.05,
            "sensitivityCapexMin": 0.90,
            "sensitivityCapexMax": 1.10,
            "sensitivityCapexStep": 0.05,
        },
    }


def deep_merge(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def normalize_model(raw: dict[str, Any] | None) -> dict[str, Any]:
    model = default_model()
    default_marketing_budget = copy.deepcopy(model["marketingBudget"])
    explicit_mode = (raw or {}).get("calculationMode")
    if raw:
        deep_merge(model, raw)
    model["project"]["gbaOverride"] = round_area(model["project"].get("gbaOverride"))
    model["project"]["landArea"] = round_area(model["project"].get("landArea"))
    raw_organization = (raw or {}).get("organization") if isinstance((raw or {}).get("organization"), dict) else None
    if raw_organization is not None and "annualSalaryMonths" not in raw_organization:
        previous_bonus = max(0.0, as_float(raw_organization.get("annualBonusMonths")))
        model["organization"]["annualSalaryMonths"] = 12.0 + previous_bonus
    raw_owner_rent = (raw or {}).get("ownerRent") if isinstance((raw or {}).get("ownerRent"), dict) else None
    if raw_owner_rent is not None:
        if "propertyMonthlyRent" not in raw_owner_rent and "monthlyRent" in raw_owner_rent:
            model["ownerRent"]["propertyMonthlyRent"] = as_float(raw_owner_rent.get("monthlyRent"))
        if "leaseType" not in raw_owner_rent:
            model["ownerRent"]["leaseType"] = "property"
    raw_marketing = (raw or {}).get("marketingBudget") if isinstance((raw or {}).get("marketingBudget"), dict) else None
    if raw_marketing is not None and "amountMode" not in raw_marketing and raw_marketing.get("channels") and not raw_marketing.get("annualItems"):
        # Preserve projects created before amount-based marketing budgets. The UI offers
        # a one-click migration, while the engine keeps calculating the legacy weights.
        model["marketingBudget"]["amountMode"] = False
    marketing_budget = model.get("marketingBudget") if isinstance(model.get("marketingBudget"), dict) else {}
    def normalize_marketing_items(defaults: list[dict[str, Any]], incoming_items: Any) -> list[dict[str, Any]]:
        incoming = [item for item in incoming_items if isinstance(item, dict)] if isinstance(incoming_items, list) else []
        by_key = {str(item.get("key") or ""): item for item in incoming}
        by_name = {str(item.get("name") or "").strip(): item for item in incoming}
        normalized: list[dict[str, Any]] = []
        used_keys: set[str] = set()
        for default in defaults:
            key = str(default.get("key") or "")
            incoming_item = by_key.get(key) or by_name.get(str(default.get("name") or ""), {})
            used_keys.add(key)
            normalized.append({
                "key": key,
                "name": str(incoming_item.get("name") or default.get("name") or "未命名营销项目"),
                "amount": max(0.0, as_float(incoming_item.get("amount", default.get("amount")))),
                "note": str(incoming_item.get("note") or default.get("note") or ""),
            })
        for index, item in enumerate(incoming):
            key = str(item.get("key") or f"custom_{index}")
            if key in used_keys:
                continue
            normalized.append({
                "key": key,
                "name": str(item.get("name") or "自定义营销项目"),
                "amount": max(0.0, as_float(item.get("amount"))),
                "note": str(item.get("note") or ""),
            })
        return normalized

    marketing_budget["annualItems"] = normalize_marketing_items(default_marketing_budget["annualItems"], marketing_budget.get("annualItems"))
    marketing_budget["openingYearItems"] = normalize_marketing_items(default_marketing_budget["openingYearItems"], marketing_budget.get("openingYearItems"))
    model["marketingBudget"] = marketing_budget
    if not explicit_mode:
        model["calculationMode"] = "detailed" if (raw or {}).get("shops") else "preliminary"
    default_categories = {c["name"]: c for c in CATEGORY_PRESETS}
    categories = []
    for incoming in model.get("categories", []):
        name = str(incoming.get("name") or "").strip()
        if not name:
            continue
        base = copy.deepcopy(default_categories.get(name, {"name": name, "rent": 0.0, "factor": 1.0}))
        base.update(incoming)
        categories.append(base)
    model["categories"] = categories or copy.deepcopy(CATEGORY_PRESETS)
    default_conditions = {c["name"]: c for c in CONDITION_PRESETS}
    conditions = []
    for incoming in model.get("conditionPremiums", []):
        name = str(incoming.get("name") or "").strip()
        if not name:
            continue
        base = copy.deepcopy(default_conditions.get(name, {"name": name, "premium": 0.0, "enabled": True}))
        base.update(incoming)
        conditions.append(base)
    model["conditionPremiums"] = conditions or copy.deepcopy(CONDITION_PRESETS)
    model["floors"] = [normalize_floor(floor) for floor in model.get("floors", []) if isinstance(floor, dict)]
    model["shops"] = [normalize_shop(s) for s in model.get("shops", []) if isinstance(s, dict)]
    market = model.get("market") if isinstance(model.get("market"), dict) else {}
    market.setdefault("radiusKm", 3)
    market["comparables"] = [normalize_market_comp(item) for item in market.get("comparables", []) if isinstance(item, dict)]
    model["market"] = market
    return model


def normalize_floor(floor: dict[str, Any]) -> dict[str, Any]:
    return {
        "building": str(floor.get("building", floor.get("楼栋", "1号楼")) or "1号楼").strip(),
        "name": str(floor.get("name", floor.get("floor", "")) or "").strip(),
        "buildingArea": round_area(floor.get("buildingArea", 0)),
        "leasableArea": round_area(floor.get("leasableArea", 0)),
        "avgRent": as_float(floor.get("avgRent", 0)),
        "salesPerSqmMonth": as_float(floor.get("salesPerSqmMonth", 0)),
        "concessionRate": as_float(floor.get("concessionRate", 0)),
        "rentAreaBasis": str(floor.get("rentAreaBasis") or "inherit").strip(),
    }


def normalize_shop(shop: dict[str, Any]) -> dict[str, Any]:
    raw_conditions = shop.get("conditions", shop.get("铺位条件", []))
    if isinstance(raw_conditions, str):
        conditions = [x.strip() for x in re.split(r"[、,，/|]+", raw_conditions) if x.strip()]
    elif isinstance(raw_conditions, list):
        conditions = [str(x).strip() for x in raw_conditions if str(x).strip()]
    else:
        conditions = []
    return {
        "id": str(shop.get("id") or shop.get("shopId") or shop.get("铺位号") or "").strip(),
        "building": str(shop.get("building", shop.get("楼栋", "1号楼")) or "1号楼").strip(),
        "buildingArea": round_area(shop.get("buildingArea", shop.get("建筑面积", 0))),
        "leasableArea": round_area(shop.get("leasableArea", shop.get("实际租赁面积", 0))),
        "floor": str(shop.get("floor", shop.get("楼层", "")) or "").strip(),
        "category": str(shop.get("category", shop.get("业态", "零售")) or "零售").strip(),
        "status": str(shop.get("status", shop.get("状态", "营业")) or "营业").strip(),
        "rentOverride": optional_float(shop.get("rentOverride", shop.get("租金单价覆盖", None))),
        "rentAreaBasis": str(shop.get("rentAreaBasis") or shop.get("租金面积口径") or "inherit").strip(),
        "conditions": conditions,
        "note": str(shop.get("note", shop.get("备注", "")) or "").strip(),
    }


def normalize_market_comp(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(item.get("name", item.get("样本名称", "")) or "").strip(),
        "address": str(item.get("address", item.get("地址", "")) or "").strip(),
        "floor": str(item.get("floor", item.get("楼层", "")) or "").strip(),
        "category": str(item.get("category", item.get("业态", "零售")) or "零售").strip(),
        "leasableArea": round_area(item.get("leasableArea", item.get("可租赁面积", 0))),
        "rent": as_float(item.get("rent", item.get("月租金单价", 0))),
        "date": str(item.get("date", item.get("数据日期", "")) or "").strip(),
        "distanceKm": optional_float(item.get("distanceKm", item.get("距项目km", None))),
        "note": str(item.get("note", item.get("备注", "")) or "").strip(),
    }


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(str(value).replace(",", "").replace("，", "").strip())
    except (TypeError, ValueError):
        return default


def optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "").replace("，", "").strip())
    except (TypeError, ValueError):
        return None


def safe_div(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b else default


def round_area(value: Any) -> float:
    return round(max(0.0, as_float(value)), 2)


def resolved_rent_area_basis(record: dict[str, Any], project: dict[str, Any]) -> str:
    selected = str(record.get("rentAreaBasis") or "inherit")
    if selected not in {"building", "leasable"}:
        selected = str(project.get("rentAreaBasis") or "leasable")
    return "building" if selected == "building" else "leasable"


def rent_area_for(record: dict[str, Any], project: dict[str, Any]) -> float:
    basis = resolved_rent_area_basis(record, project)
    value = record.get("buildingArea") if basis == "building" else record.get("leasableArea")
    return max(0.0, as_float(value))


def building_floor_key(record: dict[str, Any]) -> str:
    building = str(record.get("building") or "1号楼").strip() or "1号楼"
    floor = str(record.get("floor", record.get("name", "")) or "未分楼层").strip() or "未分楼层"
    return f"{building}||{floor}"


def calculate_model(raw_model: dict[str, Any] | None, include_sensitivity: bool = True) -> dict[str, Any]:
    model = normalize_model(raw_model)
    project = model["project"]
    costs = model["costs"]
    revenues = model["revenues"]
    operations = model["operations"]
    taxes = model["taxes"]
    finance = model["finance"]
    valuation = model["valuation"]
    formulas = model.get("formulas") if isinstance(model.get("formulas"), dict) else {}
    organization = model.get("organization") if isinstance(model.get("organization"), dict) else {}
    office_budget = model.get("officeBudget") if isinstance(model.get("officeBudget"), dict) else {}
    leasing_budget = model.get("leasingBudget") if isinstance(model.get("leasingBudget"), dict) else {}
    marketing_budget = model.get("marketingBudget") if isinstance(model.get("marketingBudget"), dict) else {}
    maintenance_budget = model.get("maintenanceBudget") if isinstance(model.get("maintenanceBudget"), dict) else {}
    departments = [item for item in organization.get("departments", []) if isinstance(item, dict)]
    social_insurance_rate = max(0.0, as_float(organization.get("socialInsuranceRate")))
    annual_salary_months = max(1.0, as_float(organization.get("annualSalaryMonths"), 12.0))
    recruitment_training_rate = max(0.0, as_float(organization.get("recruitmentTrainingRate")))
    organization_breakdown = []
    structured_headcount = 0
    structured_personnel_cost = 0.0
    for department in departments:
        headcount = max(0.0, as_float(department.get("headcount")))
        monthly_salary = max(0.0, as_float(department.get("avgMonthlySalary")))
        annual_cost = headcount * monthly_salary * annual_salary_months * (1 + social_insurance_rate) / 10000
        structured_headcount += headcount
        structured_personnel_cost += annual_cost
        organization_breakdown.append({
            "name": str(department.get("name") or "未命名部门"),
            "headcount": headcount,
            "avgMonthlySalary": monthly_salary,
            "annualSalaryMonths": annual_salary_months,
            "annualCost": annual_cost,
            "note": str(department.get("note") or ""),
        })
    structured_recruitment_training = structured_personnel_cost * recruitment_training_rate
    for item in organization_breakdown:
        item["share"] = safe_div(item["annualCost"], structured_personnel_cost)
    security_personnel_cost = sum(item["annualCost"] for item in organization_breakdown if "保安" in item["name"])
    cleaning_personnel_cost = sum(item["annualCost"] for item in organization_breakdown if "保洁" in item["name"])
    property_personnel_cost = sum(item["annualCost"] for item in organization_breakdown if ("物业" in item["name"] or "工程" in item["name"]))
    operations_team_cost = max(0.0, structured_personnel_cost - security_personnel_cost - cleaning_personnel_cost - property_personnel_cost)
    office_items = [
        ("办公室租金", "officeRentAnnual"),
        ("水电通讯", "utilitiesAnnual"),
        ("IT及软件", "itSoftwareAnnual"),
        ("办公用品", "officeSuppliesAnnual"),
        ("差旅及业务招待", "travelEntertainmentAnnual"),
        ("其他办公费用", "otherAnnual"),
    ]
    office_breakdown = [{"name": name, "value": max(0.0, as_float(office_budget.get(key)))} for name, key in office_items]
    structured_office_cost = sum(item["value"] for item in office_breakdown)
    for item in office_breakdown:
        item["share"] = safe_div(item["value"], structured_office_cost)
    leasing_items = [
        ("渠道及代理费", "channelFeeAnnual"),
        ("招商活动", "eventsAnnual"),
        ("招商物料", "materialsAnnual"),
        ("招商差旅", "travelAnnual"),
        ("招商平台及系统", "platformAnnual"),
        ("其他招商费用", "otherAnnual"),
    ]
    leasing_breakdown = [{"name": name, "value": max(0.0, as_float(leasing_budget.get(key)))} for name, key in leasing_items]
    structured_leasing_cost = sum(item["value"] for item in leasing_breakdown)
    for item in leasing_breakdown:
        item["share"] = safe_div(item["value"], structured_leasing_cost)
    maintenance_items = [
        ("电梯维保", "elevatorAnnual"),
        ("暖通空调维保", "hvacAnnual"),
        ("消防维保", "fireAnnual"),
        ("景观绿化养护", "landscapeAnnual"),
        ("其他专项维保", "otherAnnual"),
    ]
    maintenance_breakdown = [{"name": name, "value": max(0.0, as_float(maintenance_budget.get(key)))} for name, key in maintenance_items]
    structured_maintenance_cost = sum(item["value"] for item in maintenance_breakdown)
    for item in maintenance_breakdown:
        item["share"] = safe_div(item["value"], structured_maintenance_cost)
    marketing_channels = [item for item in marketing_budget.get("channels", []) if isinstance(item, dict)]
    annual_marketing_items = [item for item in marketing_budget.get("annualItems", []) if isinstance(item, dict)]
    opening_marketing_items = [item for item in marketing_budget.get("openingYearItems", []) if isinstance(item, dict)]
    annual_marketing_total = sum(max(0.0, as_float(item.get("amount"))) for item in annual_marketing_items)
    opening_marketing_total = sum(max(0.0, as_float(item.get("amount"))) for item in opening_marketing_items)
    annual_cost_overrides = operations.get("annualCostOverrides") if isinstance(operations.get("annualCostOverrides"), dict) else {}
    shops = model["shops"]
    floors = model.get("floors", [])
    calculation_mode = str(model.get("calculationMode") or "preliminary")
    project_revenue_model = str(project.get("revenueModel") or "rent")
    gba_override = as_float(project.get("gbaOverride"))
    category_data = {str(c.get("name", "")).strip(): c for c in model.get("categories", [])}
    category_rent = {name: as_float(cat.get("rent")) for name, cat in category_data.items()}
    category_factor = {name: max(0.0, as_float(cat.get("factor"), 1.0)) for name, cat in category_data.items()}
    condition_map = {str(c.get("name", "")).strip(): max(0.0, as_float(c.get("premium"))) for c in model.get("conditionPremiums", []) if c.get("enabled", True)}

    floor_calc: list[dict[str, Any]] = []
    shop_calc: list[dict[str, Any]] = []
    total_monthly_revenue = 0.0
    total_monthly_guarantee = 0.0
    total_monthly_concession = 0.0
    total_rent_area = 0.0

    def settlement_revenue(guarantee_value: float, concession_value: float, settlement_mode: str) -> tuple[float, float, float]:
        if settlement_mode == "concession":
            return 0.0, concession_value, concession_value
        if settlement_mode == "guarantee_or_concession":
            if concession_value > guarantee_value:
                return 0.0, concession_value, concession_value
            return guarantee_value, 0.0, guarantee_value
        return guarantee_value, 0.0, guarantee_value

    if calculation_mode == "preliminary":
        shop_building_area = sum(max(0.0, as_float(floor.get("buildingArea"))) for floor in floors)
        gla = sum(max(0.0, as_float(floor.get("leasableArea"))) for floor in floors)
        gba = shop_building_area if shop_building_area > 0 else gba_override
        for floor in floors:
            leasable = max(0.0, as_float(floor.get("leasableArea")))
            rent_area = rent_area_for(floor, project)
            rent_basis = resolved_rent_area_basis(floor, project)
            avg_rent = max(0.0, as_float(floor.get("avgRent")))
            sales_base = max(0.0, as_float(floor.get("salesPerSqmMonth")))
            concession_rate = max(0.0, as_float(floor.get("concessionRate")))
            guarantee_revenue = rent_area * avg_rent
            concession_revenue = rent_area * sales_base * concession_rate
            rent_part, concession_part, monthly = settlement_revenue(guarantee_revenue, concession_revenue, project_revenue_model)
            total_monthly_guarantee += rent_part
            total_monthly_concession += concession_part
            total_monthly_revenue += monthly
            total_rent_area += rent_area
            floor_calc.append({**floor, "rentAreaBasis": rent_basis, "rentArea": rent_area, "guaranteeRevenue": guarantee_revenue, "concessionRevenue": concession_revenue, "monthlyRent": rent_part, "monthlyRevenue": monthly, "weightedRent": safe_div(monthly, rent_area), "settlementMode": project_revenue_model})
    else:
        shop_building_area = sum(max(0.0, s["buildingArea"]) for s in shops)
        gla = sum(max(0.0, s["leasableArea"]) for s in shops)
        gba = gba_override if gba_override > 0 else shop_building_area * (1 + as_float(project.get("commonAreaFactor")))
        floor_avg = {building_floor_key(floor): max(0.0, as_float(floor.get("avgRent"))) for floor in floors}
        factor_groups: dict[str, list[tuple[float, float]]] = {}
        for shop in shops:
            key = building_floor_key(shop)
            factor_groups.setdefault(key, []).append((rent_area_for(shop, project), max(0.0, category_factor.get(shop["category"], 1.0))))
        global_factor_pairs = [pair for pairs in factor_groups.values() for pair in pairs]
        def weighted_factor(pairs: list[tuple[float, float]]) -> float:
            area = sum(p[0] for p in pairs)
            if area <= 0:
                return sum(p[1] for p in pairs) / len(pairs) if pairs else 1.0
            return sum(p[0] * p[1] for p in pairs) / area
        global_factor_avg = weighted_factor(global_factor_pairs)
        for shop in shops:
            key = building_floor_key(shop)
            rent_area = rent_area_for(shop, project)
            rent_basis = resolved_rent_area_basis(shop, project)
            factor_avg = weighted_factor(factor_groups.get(key, [])) or global_factor_avg or 1.0
            applied_conditions = [name for name in shop.get("conditions", []) if name in condition_map]
            condition_premium = min(0.40, sum(condition_map[name] for name in applied_conditions))
            cat = category_data.get(shop["category"], {})
            category_mode = str(cat.get("revenueMode") or "inherit")
            settlement_mode = project_revenue_model if category_mode == "inherit" else category_mode
            if shop.get("rentOverride") is not None:
                base_rent = as_float(shop.get("rentOverride"))
                rent = base_rent
                condition_premium = 0.0
            elif floor_avg.get(key, 0) > 0:
                base_rent = floor_avg[key] * category_factor.get(shop["category"], 1.0) / factor_avg
                rent = base_rent * (1 + condition_premium)
            else:
                base_rent = category_rent.get(shop["category"], 0.0)
                rent = base_rent * (1 + condition_premium)
            sales_base = max(0.0, as_float(cat.get("salesPerSqmMonth")))
            concession_rate = max(0.0, as_float(cat.get("concessionRate")))
            guarantee_revenue = rent_area * rent
            concession_revenue = rent_area * sales_base * (1 + condition_premium) * concession_rate
            rent_part, concession_part, monthly = settlement_revenue(guarantee_revenue, concession_revenue, settlement_mode)
            total_monthly_guarantee += rent_part
            total_monthly_concession += concession_part
            total_monthly_revenue += monthly
            total_rent_area += rent_area
            shop_calc.append(
                {
                    **shop,
                    "rentAreaBasis": rent_basis,
                    "rentArea": rent_area,
                    "baseRent": base_rent,
                    "rent": rent,
                    "conditionPremium": condition_premium,
                    "appliedConditions": applied_conditions,
                    "salesPerSqmMonth": sales_base,
                    "concessionRate": concession_rate,
                    "settlementMode": settlement_mode,
                    "guaranteeRevenue": guarantee_revenue,
                    "concessionRevenue": concession_revenue,
                    "monthlyRent": rent_part,
                    "monthlyRevenue": monthly,
                    "firstYearRent": monthly * (12 - as_float(operations.get("rentFreeMonths"))) * as_float(operations.get("occupancyY1")) / 10000,
                    "commission": monthly * as_float(operations.get("commissionMonths")) * as_float(operations.get("occupancyY1")) / 10000,
                    "deposit": monthly * as_float(operations.get("depositMonths")) / 10000,
                }
            )
        floor_names = [building_floor_key(floor) for floor in floors]
        for floor in floors:
            key = building_floor_key(floor)
            group = [shop for shop in shop_calc if building_floor_key(shop) == key]
            rent_area = sum(shop["rentArea"] for shop in group) or rent_area_for(floor, project)
            monthly = sum(shop["monthlyRevenue"] for shop in group)
            floor_calc.append({**floor, "rentAreaBasis": resolved_rent_area_basis(floor, project), "rentArea": rent_area, "monthlyRent": sum(shop["monthlyRent"] for shop in group), "monthlyConcession": sum(shop["concessionRevenue"] for shop in group), "monthlyRevenue": monthly, "weightedRent": safe_div(monthly, rent_area)})
        for key, group in factor_groups.items():
            if key in floor_names:
                continue
            group_shops = [shop for shop in shop_calc if building_floor_key(shop) == key]
            building, floor_name = key.split("||", 1)
            rent_area = sum(shop["rentArea"] for shop in group_shops)
            monthly = sum(shop["monthlyRevenue"] for shop in group_shops)
            floor_calc.append({"building": building, "name": floor_name, "buildingArea": sum(shop["buildingArea"] for shop in group_shops), "leasableArea": sum(shop["leasableArea"] for shop in group_shops), "rentArea": rent_area, "rentAreaBasis": "mixed", "avgRent": safe_div(monthly, rent_area), "monthlyRent": sum(shop["monthlyRent"] for shop in group_shops), "monthlyConcession": sum(shop["concessionRevenue"] for shop in group_shops), "monthlyRevenue": monthly, "weightedRent": safe_div(monthly, rent_area)})
    land_area = as_float(project.get("landArea"))

    land_price = max(0.0, as_float(project.get("landPrice")))
    deed_tax = land_price * as_float(taxes.get("deedTax"))
    preconstruction = gba * as_float(costs.get("preconstructionRate")) / 10000
    construction = gba * as_float(costs.get("constructionRate")) / 10000
    municipal_fee = gba * as_float(costs.get("municipalFeeRate")) / 10000
    civil_defense = gba * as_float(costs.get("civilDefenseFeeRate")) / 10000
    other_public = gba * as_float(costs.get("otherPublicFeeRate")) / 10000
    fitout = gba * as_float(costs.get("fitoutRate")) / 10000
    equipment = gba * as_float(costs.get("equipmentRate")) / 10000
    other_engineering = gba * as_float(costs.get("otherEngineeringRate")) / 10000
    direct_engineering = preconstruction + construction + fitout + equipment + other_engineering + municipal_fee + civil_defense + other_public
    contingency = direct_engineering * as_float(project.get("contingencyRate"))
    commission = total_monthly_revenue * as_float(operations.get("commissionMonths")) * as_float(operations.get("occupancyY1")) / 10000
    preopening_marketing = as_float(project.get("preOpeningMarketing"))
    other_preopening = as_float(project.get("otherPreOpening"))

    # First-pass investment, then add working capital based on stabilized operating costs.
    investment_without_wc = land_price + deed_tax + direct_engineering + contingency + commission + preopening_marketing + other_preopening
    staff_cost_mode = str(operations.get("staffCostMode") or "organization")
    if staff_cost_mode not in {"organization", "area"}:
        staff_cost_mode = "organization" if structured_headcount > 0 else "area"
    personnel_proxy = (structured_personnel_cost + structured_recruitment_training) if staff_cost_mode == "organization" and structured_headcount > 0 else gba * as_float(operations.get("staffCostPerSqm")) * 12 / 10000
    office_proxy = structured_office_cost if structured_office_cost > 0 else gba * as_float(operations.get("adminCostPerSqm")) * 12 / 10000
    marketing_proxy = annual_marketing_total if bool(marketing_budget.get("amountMode", True)) else total_monthly_revenue * 12 * 0.95 / 10000 * as_float(operations.get("marketingRate"))
    property_proxy = max(0.0, as_float(annual_cost_overrides.get("propertyOps"))) or gba * as_float(operations.get("propertyOpsCost")) * 12 / 10000
    energy_proxy = max(0.0, as_float(annual_cost_overrides.get("energy"))) or gba * as_float(operations.get("energyCost")) * 12 / 10000
    base_maintenance_proxy = max(0.0, as_float(annual_cost_overrides.get("baseMaintenance"))) or (construction + fitout + equipment + other_engineering + contingency) * as_float(operations.get("repairRate"))
    insurance_proxy = max(0.0, as_float(annual_cost_overrides.get("insurance"))) or (construction + fitout + equipment + other_engineering) * as_float(operations.get("insuranceRate"))
    other_opex_proxy = max(0.0, as_float(annual_cost_overrides.get("otherOpex"))) or total_monthly_revenue * 12 * 0.95 / 10000 * as_float(operations.get("otherOpexRate"))
    stable_opex_proxy = (
        property_proxy + energy_proxy + personnel_proxy + office_proxy + structured_leasing_cost
        + structured_maintenance_cost + base_maintenance_proxy + marketing_proxy
        + insurance_proxy + other_opex_proxy
    )
    working_capital = stable_opex_proxy * as_float(costs.get("workingCapitalRate"))
    total_investment = investment_without_wc + working_capital

    investment_breakdown = [
        {"name": "土地及契税", "value": land_price + deed_tax},
        {"name": "前期及建安工程", "value": preconstruction + construction + other_engineering},
        {"name": "公共配套及规费", "value": municipal_fee + civil_defense + other_public},
        {"name": "装修及设施设备", "value": fitout + equipment},
        {"name": "预备费", "value": contingency},
        {"name": "招商及开办", "value": commission + preopening_marketing + other_preopening},
        {"name": "铺底流动资金", "value": working_capital},
    ]

    loan_amount = total_investment * as_float(finance.get("debtRatio"))
    construction_years = max(0, min(10, int(as_float(project.get("constructionYears"), 2))))
    operation_years = max(1, min(50, int(as_float(project.get("operationYears"), 20))))
    total_periods = construction_years + operation_years
    draw_weights = ([1.0 / construction_years] * construction_years if construction_years > 0 else []) + [0.0] * operation_years
    loan_schedule: list[dict[str, float]] = []
    balance = 0.0
    loan_rate = as_float(finance.get("loanRate"))
    loan_term = max(1, int(finance.get("loanTerm") or 1))
    grace = max(0, int(finance.get("graceYears") or 0))
    principal_per_year = safe_div(loan_amount, loan_term)
    for idx in range(total_periods):
        draw = loan_amount * draw_weights[idx] if idx < len(draw_weights) else 0.0
        interest = (balance + draw / 2) * loan_rate
        operation_year = idx - construction_years + 1
        principal = 0.0
        if operation_year > grace and operation_year <= grace + loan_term:
            if str(formulas.get("loanRepaymentMethod") or "equal_principal") == "interest_only":
                if operation_year == grace + loan_term:
                    principal = balance + draw
            else:
                principal = min(balance + draw, principal_per_year)
        closing = balance + draw - principal
        loan_schedule.append({"opening": balance, "draw": draw, "interest": interest, "principal": principal, "closing": closing})
        balance = closing

    depreciation_building_years = max(1, int(as_float(formulas.get("buildingDepreciationYears"), 20)))
    depreciation_fitout_years = max(1, int(as_float(formulas.get("fitoutDepreciationYears"), 5)))
    depreciation_equipment_years = max(1, int(as_float(formulas.get("equipmentDepreciationYears"), 10)))
    depreciation_building = (preconstruction + construction + municipal_fee + civil_defense + other_public + other_engineering + contingency) / depreciation_building_years
    depreciation_fitout = fitout / depreciation_fitout_years
    depreciation_equipment = equipment / depreciation_equipment_years
    annual_depreciation = depreciation_building + depreciation_fitout + depreciation_equipment

    annual_rows: list[dict[str, Any]] = []
    tax_loss_carry: list[tuple[int, float]] = []
    construction_interest_loss = sum(max(0.0, row["interest"]) for row in loan_schedule[:construction_years])
    if construction_interest_loss > 0:
        tax_loss_carry.append((0, construction_interest_loss))

    project_cash_flows: list[float] = []
    equity_cash_flows: list[float] = []
    cumulative_project = 0.0
    cumulative_equity = 0.0

    owner_rent_config = model.get("ownerRent") if isinstance(model.get("ownerRent"), dict) else {}
    owner_rent_enabled_value = owner_rent_config.get("enabled")
    owner_rent_enabled = owner_rent_enabled_value is True or str(owner_rent_enabled_value).strip().lower() in {"true", "1", "yes", "y", "是"}
    owner_rent_lease_type = str(owner_rent_config.get("leaseType") or "property")
    include_land_rent = owner_rent_enabled and owner_rent_lease_type in {"land", "land_and_property"}
    include_property_rent = owner_rent_enabled and owner_rent_lease_type in {"property", "land_and_property"}
    land_pricing_mode = str(owner_rent_config.get("landPricingMode") or "total")
    land_area = max(0.0, as_float(owner_rent_config.get("landArea")))
    land_unit_rent = max(0.0, as_float(owner_rent_config.get("landUnitRent")))
    land_monthly_rent = (
        land_area * land_unit_rent / 10000 if land_pricing_mode == "unit" else max(0.0, as_float(owner_rent_config.get("landMonthlyRent")))
    ) if include_land_rent else 0.0
    land_payment_months = max(0.0, as_float(owner_rent_config.get("landPaymentMonths"), 12.0)) if include_land_rent else 0.0
    property_pricing_mode = str(owner_rent_config.get("propertyPricingMode") or "total")
    property_area = max(0.0, as_float(owner_rent_config.get("propertyArea")))
    property_unit_rent = max(0.0, as_float(owner_rent_config.get("propertyUnitRent")))
    property_monthly_rent = (
        property_area * property_unit_rent / 10000 if property_pricing_mode == "unit" else max(0.0, as_float(owner_rent_config.get("propertyMonthlyRent")))
    ) if include_property_rent else 0.0
    property_payment_months = max(0.0, as_float(owner_rent_config.get("propertyPaymentMonths"), 12.0)) if include_property_rent else 0.0
    owner_land_rent_base_annual = land_monthly_rent * land_payment_months
    owner_property_rent_base_annual = property_monthly_rent * property_payment_months
    owner_rent_base_annual = owner_land_rent_base_annual + owner_property_rent_base_annual
    owner_rent_growth_mode = str(owner_rent_config.get("growthMode") or "compound")
    owner_rent_growth_rate = as_float(owner_rent_config.get("growthRate"))
    owner_rent_annual_increase = as_float(owner_rent_config.get("annualIncrease"))
    owner_rent_step_years = max(1, int(as_float(owner_rent_config.get("stepYears"), 3)))

    def owner_rent_components_for_year(operation_year: int) -> tuple[float, float]:
        if owner_rent_base_annual <= 0:
            return 0.0, 0.0
        periods = max(0, operation_year - 1)
        if owner_rent_growth_mode == "fixed_amount":
            total = max(0.0, owner_rent_base_annual + owner_rent_annual_increase * periods)
            land_share = safe_div(owner_land_rent_base_annual, owner_rent_base_annual)
            return total * land_share, total * (1 - land_share)
        if owner_rent_growth_mode == "none":
            factor = 1.0
        elif owner_rent_growth_mode == "simple":
            factor = 1 + owner_rent_growth_rate * periods
        elif owner_rent_growth_mode == "step":
            steps = periods // owner_rent_step_years
            factor = (1 + owner_rent_growth_rate) ** steps
        else:
            factor = (1 + owner_rent_growth_rate) ** periods
        return owner_land_rent_base_annual * factor, owner_property_rent_base_annual * factor

    annual_cost_adjustments = operations.get("annualCostAdjustments") if isinstance(operations.get("annualCostAdjustments"), dict) else {}

    def cost_adjustment_for_year(operation_year: int) -> tuple[float, float, float]:
        adjustment = annual_cost_adjustments.get(str(operation_year), annual_cost_adjustments.get(operation_year, {}))
        if not isinstance(adjustment, dict):
            adjustment = {}
        leasing_value = adjustment.get("leasingFactor")
        operations_value = adjustment.get("operationsFactor")
        leasing_factor = 1.0 if leasing_value is None else max(0.0, as_float(leasing_value, 1.0))
        operations_factor = 1.0 if operations_value is None else max(0.0, as_float(operations_value, 1.0))
        extra_cost = as_float(adjustment.get("extraCost"))
        return leasing_factor, operations_factor, extra_cost

    for idx in range(total_periods):
        period = idx + 1
        op_year = idx - construction_years + 1
        loan = loan_schedule[idx]
        if op_year < 1:
            pay_ratio = draw_weights[idx] if idx < len(draw_weights) else 0.0
            project_capex = total_investment * pay_ratio
            project_cf = -project_capex
            equity_cf = -project_capex + loan["draw"] - loan["interest"]
            annual_rows.append(
                {
                    "period": period,
                    "opYear": op_year,
                    "calendarYear": int(project.get("startYear") or datetime.now().year) + idx,
                    "revenue": 0.0,
                    "rentRevenue": 0.0,
                    "propertyRevenue": 0.0,
                    "otherRevenue": 0.0,
                    "operatingCost": 0.0,
                    "ownerRent": 0.0,
                    "ownerLandRent": 0.0,
                    "ownerPropertyRent": 0.0,
                    "leasingAdjustmentFactor": 1.0,
                    "operationsAdjustmentFactor": 1.0,
                    "extraOperatingCost": 0.0,
                    "taxes": 0.0,
                    "noi": 0.0,
                    "depreciation": 0.0,
                    "interest": loan["interest"],
                    "principal": loan["principal"],
                    "netProfit": -loan["interest"],
                    "projectCapex": project_capex,
                    "projectCashFlow": project_cf,
                    "equityCashFlow": equity_cf,
                    "cumulativeProjectCashFlow": 0.0,
                    "cumulativeEquityCashFlow": 0.0,
                    "exitValue": 0.0,
                }
            )
            project_cash_flows.append(project_cf)
            equity_cash_flows.append(equity_cf)
            cumulative_project += project_cf
            cumulative_equity += equity_cf
            annual_rows[-1]["cumulativeProjectCashFlow"] = cumulative_project
            annual_rows[-1]["cumulativeEquityCashFlow"] = cumulative_equity
            continue

        occupancy = occupancy_for_year(op_year, operations)
        free_factor = 1 - as_float(operations.get("rentFreeMonths")) / 12 if op_year == 1 else 1
        growth_mode = str(formulas.get("rentGrowthMode") or "compound")
        rent_growth_periods = op_year - 1
        rent_growth_factor = (1 + as_float(operations.get("rentGrowth")) * rent_growth_periods) if growth_mode == "simple" else (1 + as_float(operations.get("rentGrowth"))) ** rent_growth_periods
        sales_growth_factor = (1 + as_float(operations.get("salesGrowth")) * rent_growth_periods) if growth_mode == "simple" else (1 + as_float(operations.get("salesGrowth"))) ** rent_growth_periods
        guarantee_gross = total_monthly_guarantee * 12 * occupancy * free_factor * rent_growth_factor / 10000
        concession_gross = total_monthly_concession * 12 * occupancy * free_factor * sales_growth_factor / 10000
        rent_gross = guarantee_gross + concession_gross
        property_gross = gla * as_float(revenues.get("propertyFee")) * 12 * occupancy / 10000
        other_gross = (
            rent_gross * as_float(revenues.get("otherIncomeRatio"))
            + as_float(revenues.get("parkingSpaces")) * as_float(revenues.get("parkingMonthly")) * 12 * occupancy / 10000
        )
        revenue_gross = rent_gross + property_gross + other_gross
        output_vat = (
            guarantee_gross / (1 + as_float(taxes.get("vatRent"))) * as_float(taxes.get("vatRent"))
            + concession_gross / (1 + as_float(taxes.get("vatConcession"))) * as_float(taxes.get("vatConcession"))
            + property_gross / (1 + as_float(taxes.get("vatProperty"))) * as_float(taxes.get("vatProperty"))
            + other_gross / (1 + as_float(taxes.get("vatOther"))) * as_float(taxes.get("vatOther"))
        )
        revenue_net = revenue_gross - output_vat
        ramp = as_float(operations.get("rampY1")) if op_year == 1 else as_float(operations.get("rampY2")) if op_year == 2 else 1.0
        property_ops_override = max(0.0, as_float(annual_cost_overrides.get("propertyOps")))
        energy_override = max(0.0, as_float(annual_cost_overrides.get("energy")))
        base_maintenance_override = max(0.0, as_float(annual_cost_overrides.get("baseMaintenance")))
        insurance_override = max(0.0, as_float(annual_cost_overrides.get("insurance")))
        other_opex_override = max(0.0, as_float(annual_cost_overrides.get("otherOpex")))
        property_ops = property_ops_override * ramp if property_ops_override > 0 else gba * as_float(operations.get("propertyOpsCost")) * 12 / 10000 * ramp
        energy = energy_override * occupancy if energy_override > 0 else gba * as_float(operations.get("energyCost")) * 12 / 10000 * occupancy
        if staff_cost_mode == "organization" and structured_headcount > 0:
            operations_team = operations_team_cost * ramp
            property_team = property_personnel_cost * ramp
            security_team = security_personnel_cost * ramp
            cleaning_team = cleaning_personnel_cost * ramp
            recruitment_training = structured_recruitment_training * ramp
            staff = operations_team + property_team + security_team + cleaning_team + recruitment_training
        else:
            operations_team = gba * as_float(operations.get("staffCostPerSqm")) * 12 / 10000 * ramp
            property_team = 0.0
            security_team = 0.0
            cleaning_team = 0.0
            recruitment_training = 0.0
            staff = gba * as_float(operations.get("staffCostPerSqm")) * 12 / 10000 * ramp
        admin = structured_office_cost * ramp if structured_office_cost > 0 else gba * as_float(operations.get("adminCostPerSqm")) * 12 / 10000 * ramp
        renewal_commission = 0.0
        renewal_cycle = max(0, int(as_float(operations.get("renewalCycle"))))
        if op_year > 1 and renewal_cycle > 0 and op_year % renewal_cycle == 0:
            renewal_commission = total_monthly_revenue * as_float(operations.get("renewalCommissionMonths")) * occupancy * rent_growth_factor / 10000
        leasing = structured_leasing_cost * ramp + renewal_commission
        if bool(marketing_budget.get("amountMode", True)):
            marketing = annual_marketing_total + (opening_marketing_total if op_year == 1 else 0.0)
        elif bool(marketing_budget.get("useFixedAnnual")):
            marketing = max(0.0, as_float(marketing_budget.get("fixedAnnual")))
        else:
            marketing = revenue_net * as_float(operations.get("marketingRate"))
        rate_based_maintenance = base_maintenance_override * ramp if base_maintenance_override > 0 else (construction + fitout + equipment + other_engineering + contingency) * as_float(operations.get("repairRate")) * ramp
        fixed_maintenance = structured_maintenance_cost * ramp
        repair = rate_based_maintenance + fixed_maintenance
        insurance = insurance_override if insurance_override > 0 else (construction + fitout + equipment + other_engineering) * as_float(operations.get("insuranceRate"))
        bad_debt = revenue_net * (1 - as_float(operations.get("collectionRate")))
        other_opex = other_opex_override if other_opex_override > 0 else revenue_net * as_float(operations.get("otherOpexRate"))
        owner_land_rent, owner_property_rent = owner_rent_components_for_year(op_year)
        owner_rent = owner_land_rent + owner_property_rent
        leasing_adjustment_factor, operations_adjustment_factor, extra_operating_cost = cost_adjustment_for_year(op_year)
        property_ops *= operations_adjustment_factor
        energy *= operations_adjustment_factor
        staff *= operations_adjustment_factor
        admin *= operations_adjustment_factor
        marketing *= operations_adjustment_factor
        repair *= operations_adjustment_factor
        insurance *= operations_adjustment_factor
        bad_debt *= operations_adjustment_factor
        other_opex *= operations_adjustment_factor
        operations_team *= operations_adjustment_factor
        property_team *= operations_adjustment_factor
        security_team *= operations_adjustment_factor
        cleaning_team *= operations_adjustment_factor
        recruitment_training *= operations_adjustment_factor
        leasing *= leasing_adjustment_factor
        operating_cost_gross = property_ops + energy + staff + admin + leasing + marketing + repair + insurance + bad_debt + other_opex + owner_rent + extra_operating_cost
        input_vat = min(
            output_vat,
            (property_ops + energy + staff + admin + leasing + marketing + repair + insurance + other_opex + owner_rent)
            * as_float(taxes.get("inputVatShare"))
            * safe_div(as_float(taxes.get("inputVatRate")), 1 + as_float(taxes.get("inputVatRate"))),
        )
        operating_cost_net = operating_cost_gross - input_vat
        rent_net = guarantee_gross / (1 + as_float(taxes.get("vatRent"))) + concession_gross / (1 + as_float(taxes.get("vatConcession")))
        property_tax_base = guarantee_gross / (1 + as_float(taxes.get("vatRent")))
        if taxes.get("propertyTaxMethod") == "value":
            property_tax = (construction + municipal_fee + civil_defense + other_public + other_engineering + contingency) * (1 - as_float(taxes.get("propertyValueDeduction"))) * as_float(taxes.get("propertyTaxRateValue"))
        else:
            property_tax = property_tax_base * as_float(taxes.get("propertyTaxRateRent"))
        land_use_tax = land_area * as_float(taxes.get("landUseTax")) / 10000
        stamp_duty = rent_net * as_float(taxes.get("stampDuty"))
        vat_surcharge = max(0.0, output_vat - input_vat) * (
            as_float(taxes.get("cityTax")) + as_float(taxes.get("educationSurcharge")) + as_float(taxes.get("localEducationSurcharge"))
        )
        local_fund = revenue_net * as_float(taxes.get("localFundRate"))
        total_taxes = property_tax + land_use_tax + stamp_duty + vat_surcharge + local_fund
        noi = revenue_net - operating_cost_net - total_taxes
        capex_reserve = rent_net * as_float(operations.get("capexRate"))
        ebit = noi - annual_depreciation
        interest = loan["interest"]
        pretax_profit = ebit - interest
        loss_carry_years = max(0, int(as_float(formulas.get("taxLossCarryforwardYears"), 5)))
        tax_loss_carry = [(year, amount) for year, amount in tax_loss_carry if amount > 1e-9 and op_year - year <= loss_carry_years]
        loss_available = sum(amount for _, amount in tax_loss_carry)
        loss_used = min(loss_available, max(0.0, pretax_profit))
        remaining_loss_use = loss_used
        retained_losses: list[tuple[int, float]] = []
        for loss_year, amount in tax_loss_carry:
            used = min(amount, remaining_loss_use)
            remaining_loss_use -= used
            if amount - used > 1e-9:
                retained_losses.append((loss_year, amount - used))
        tax_loss_carry = retained_losses
        taxable_income = max(0.0, pretax_profit - loss_used)
        income_tax = taxable_income * as_float(taxes.get("corporateTax"))
        if pretax_profit < 0:
            tax_loss_carry.append((op_year, -pretax_profit))
        net_profit = pretax_profit - income_tax
        exit_value = 0.0
        if idx == total_periods - 1 and bool(valuation.get("includeExit")):
            if str(formulas.get("exitValueMethod") or "noi_cap") == "revenue_multiple":
                exit_value = max(0.0, revenue_net) * as_float(formulas.get("exitRevenueMultiple"), 1.0) * (1 - as_float(taxes.get("exitTaxRate")))
            else:
                exit_value = safe_div(max(0.0, noi), as_float(valuation.get("exitCapRate"))) * (1 - as_float(taxes.get("exitTaxRate")))
        unlevered_tax = max(0.0, ebit) * as_float(taxes.get("corporateTax"))
        project_cf = noi - capex_reserve - unlevered_tax + exit_value
        equity_cf = noi - capex_reserve - income_tax - interest - loan["principal"] + exit_value - (loan["closing"] if idx == total_periods - 1 else 0.0)
        cumulative_project += project_cf
        cumulative_equity += equity_cf
        annual_rows.append(
            {
                "period": period,
                "opYear": op_year,
                "calendarYear": int(project.get("startYear") or datetime.now().year) + idx,
                "occupancy": occupancy,
                "revenue": revenue_net,
                "rentRevenue": rent_net,
                "guaranteeRevenue": guarantee_gross,
                "concessionRevenue": concession_gross,
                "propertyRevenue": property_gross,
                "otherRevenue": other_gross,
                "operatingCost": operating_cost_net,
                "propertyOpsCost": property_ops,
                "energyCost": energy,
                "staffCost": staff,
                "operationsTeamCost": operations_team,
                "propertyTeamCost": property_team,
                "securityCost": security_team,
                "cleaningCost": cleaning_team,
                "recruitmentTrainingCost": recruitment_training,
                "officeCost": admin,
                "leasingCost": leasing,
                "renewalCommission": renewal_commission,
                "marketingCost": marketing,
                "maintenanceCost": repair,
                "rateBasedMaintenance": rate_based_maintenance,
                "fixedMaintenance": fixed_maintenance,
                "insuranceCost": insurance,
                "badDebtCost": bad_debt,
                "otherOpexCost": other_opex,
                "ownerRent": owner_rent,
                "ownerLandRent": owner_land_rent,
                "ownerPropertyRent": owner_property_rent,
                "leasingAdjustmentFactor": leasing_adjustment_factor,
                "operationsAdjustmentFactor": operations_adjustment_factor,
                "extraOperatingCost": extra_operating_cost,
                "headcount": structured_headcount,
                "taxes": total_taxes,
                "noi": noi,
                "depreciation": annual_depreciation,
                "interest": interest,
                "principal": loan["principal"],
                "netProfit": net_profit,
                "projectCapex": capex_reserve,
                "projectCashFlow": project_cf,
                "equityCashFlow": equity_cf,
                "cumulativeProjectCashFlow": cumulative_project,
                "cumulativeEquityCashFlow": cumulative_equity,
                "exitValue": exit_value,
            }
        )
        project_cash_flows.append(project_cf)
        equity_cash_flows.append(equity_cf)

    irr_project = irr(project_cash_flows)
    irr_equity = irr(equity_cash_flows)
    discount_rate = as_float(valuation.get("discountRate"))
    npv_project = npv(discount_rate, project_cash_flows)
    payback_static = payback_period(project_cash_flows)
    discounted_flows = [cf / ((1 + discount_rate) ** i) for i, cf in enumerate(project_cash_flows)]
    payback_dynamic = payback_period(discounted_flows)
    stable_row = next((row for row in annual_rows if row.get("opYear") == int(operations.get("stableYear") or 3)), None)
    if stable_row is None:
        stable_row = next((row for row in reversed(annual_rows) if row.get("opYear", 0) > 0), {})
    stable_noi = as_float(stable_row.get("noi"))
    stable_revenue = as_float(stable_row.get("revenue"))
    stable_staff_cost = as_float(stable_row.get("staffCost"))
    stable_office_cost = as_float(stable_row.get("officeCost"))
    stable_leasing_cost = as_float(stable_row.get("leasingCost"))
    stable_marketing_cost = as_float(stable_row.get("marketingCost"))
    stable_maintenance_cost = as_float(stable_row.get("maintenanceCost"))
    stable_owner_rent_cost = as_float(stable_row.get("ownerRent"))
    stable_owner_land_rent_cost = as_float(stable_row.get("ownerLandRent"))
    stable_owner_property_rent_cost = as_float(stable_row.get("ownerPropertyRent"))
    stable_extra_operating_cost = as_float(stable_row.get("extraOperatingCost"))
    stable_operating_cost = as_float(stable_row.get("operatingCost"))
    stable_taxes = as_float(stable_row.get("taxes"))
    marketing_allocation = []
    opening_marketing_allocation = []
    if bool(marketing_budget.get("amountMode", True)):
        stable_scale = safe_div(stable_marketing_cost, annual_marketing_total) if annual_marketing_total > 0 else 0.0
        for item in annual_marketing_items:
            amount = max(0.0, as_float(item.get("amount")))
            share = safe_div(amount, annual_marketing_total)
            marketing_allocation.append({
                "key": str(item.get("key") or ""),
                "name": str(item.get("name") or "未命名营销项目"),
                "amount": amount * stable_scale,
                "weight": share,
                "share": share,
                "note": str(item.get("note") or ""),
            })
        first_year_marketing_total = annual_marketing_total + opening_marketing_total
        for item in opening_marketing_items:
            amount = max(0.0, as_float(item.get("amount")))
            share = safe_div(amount, first_year_marketing_total)
            opening_marketing_allocation.append({
                "key": str(item.get("key") or ""),
                "name": str(item.get("name") or "未命名开业营销项目"),
                "amount": amount,
                "weight": share,
                "share": share,
                "note": str(item.get("note") or ""),
            })
    else:
        marketing_contingency_rate = max(0.0, as_float(marketing_budget.get("contingencyRate")))
        marketing_contingency = stable_marketing_cost * marketing_contingency_rate
        marketing_channel_pool = max(0.0, stable_marketing_cost - marketing_contingency)
        marketing_weight_total = sum(max(0.0, as_float(item.get("weight"))) for item in marketing_channels)
        for item in marketing_channels:
            weight = max(0.0, as_float(item.get("weight")))
            share = safe_div(weight, marketing_weight_total)
            marketing_allocation.append({
                "key": "",
                "name": str(item.get("name") or "未命名渠道"),
                "amount": marketing_channel_pool * share,
                "weight": share,
                "share": share,
                "note": str(item.get("note") or ""),
            })
        if marketing_contingency > 0:
            marketing_allocation.append({
                "key": "contingency",
                "name": "营销机动预备",
                "amount": marketing_contingency,
                "weight": safe_div(marketing_contingency, stable_marketing_cost),
                "share": safe_div(marketing_contingency, stable_marketing_cost),
                "note": "用于临时活动、媒体补位和不可预见营销支出",
            })
    operating_cost_breakdown = [
        {"name": "物业基础运营", "value": as_float(stable_row.get("propertyOpsCost"))},
        {"name": "公共能耗", "value": as_float(stable_row.get("energyCost"))},
        {"name": "管理团队人员成本", "value": as_float(stable_row.get("operationsTeamCost"))},
        {"name": "物业工程人员成本", "value": as_float(stable_row.get("propertyTeamCost"))},
        {"name": "保安人员成本", "value": as_float(stable_row.get("securityCost"))},
        {"name": "保洁人员成本", "value": as_float(stable_row.get("cleaningCost"))},
        {"name": "招聘培训成本", "value": as_float(stable_row.get("recruitmentTrainingCost"))},
        {"name": "办公行政成本", "value": stable_office_cost},
        {"name": "招商费用", "value": stable_leasing_cost},
        {"name": "年度营销费用", "value": stable_marketing_cost},
        {"name": "日常及专项维保", "value": stable_maintenance_cost},
        {"name": "保险费用", "value": as_float(stable_row.get("insuranceCost"))},
        {"name": "坏账准备", "value": as_float(stable_row.get("badDebtCost"))},
        {"name": "其他运营费用", "value": as_float(stable_row.get("otherOpexCost"))},
        {"name": "土地租赁支出", "value": stable_owner_land_rent_cost},
        {"name": "物业租赁支出", "value": stable_owner_property_rent_cost},
        {"name": "年度成本调整额", "value": stable_extra_operating_cost},
        {"name": "税费", "value": stable_taxes},
    ]
    operating_cost_share_total = sum(max(0.0, as_float(item.get("value"))) for item in operating_cost_breakdown)
    for item in operating_cost_breakdown:
        share = safe_div(max(0.0, as_float(item.get("value"))), operating_cost_share_total)
        item["share"] = share
        item["weight"] = share
    first_year_row = next((row for row in annual_rows if row.get("opYear") == 1), {})
    first_year_marketing_cost = as_float(first_year_row.get("marketingCost"))
    average_rent = safe_div(total_monthly_revenue, total_rent_area)
    average_rent_leasable = safe_div(total_monthly_revenue, gla)
    shops_count = len(shops)
    floor_count = sum(1 for floor in floor_calc if as_float(floor.get("buildingArea")) > 0 or as_float(floor.get("leasableArea")) > 0)
    diagnostics = build_diagnostics(model, shop_calc, floor_calc, gba, total_investment, total_monthly_revenue)
    analysis = build_analysis(
        model=model,
        total_investment=total_investment,
        npv=npv_project,
        irr=irr_project,
        equity_irr=irr_equity,
        stable_noi=stable_noi,
        stable_revenue=stable_revenue,
        payback=payback_static,
    )
    sensitivity = build_sensitivity(model, discount_rate) if include_sensitivity else {"rentSteps": [], "capexSteps": [], "npvMatrix": [], "discountRate": discount_rate}
    break_even = build_break_even(model, discount_rate) if include_sensitivity else {"rentMultiplier": None, "rentUplift": None, "capexMultiplier": None, "capexReduction": None}
    market_summary = summarize_market_comps(model, average_rent_leasable)

    return {
        "model": model,
        "summary": {
            "projectName": project.get("name"),
            "location": project.get("location"),
            "developmentType": project.get("developmentType"),
            "operationYears": operation_years,
            "calculationMode": calculation_mode,
            "shopsCount": shops_count,
            "floorCount": floor_count,
            "grossFloorArea": gba,
            "leasableArea": gla,
            "rentBasisArea": total_rent_area,
            "rentAreaBasis": str(project.get("rentAreaBasis") or "leasable"),
            "shopBuildingArea": shop_building_area,
            "averageRent": average_rent,
            "averageRentLeasable": average_rent_leasable,
            "totalMonthlyRent": total_monthly_revenue,
            "totalMonthlyGuarantee": total_monthly_guarantee,
            "totalMonthlyConcession": total_monthly_concession,
            "revenueModel": project_revenue_model,
            "totalInvestment": total_investment,
            "equityInvestment": total_investment - loan_amount,
            "loanAmount": loan_amount,
            "investmentPerGba": safe_div(total_investment * 10000, gba),
            "investmentPerGla": safe_div(total_investment * 10000, gla),
            "stableRevenue": stable_revenue,
            "stableNoi": stable_noi,
            "stableNoiMargin": safe_div(stable_noi, stable_revenue),
            "stableHeadcount": structured_headcount,
            "staffCostMode": staff_cost_mode,
            "stableStaffCost": stable_staff_cost,
            "stableOfficeCost": stable_office_cost,
            "stableLeasingCost": stable_leasing_cost,
            "stableMarketingCost": stable_marketing_cost,
            "annualMarketingBudget": annual_marketing_total,
            "openingMarketingItemsCost": opening_marketing_total,
            "firstYearMarketingCost": first_year_marketing_cost,
            "marketingAmountMode": bool(marketing_budget.get("amountMode", True)),
            "stableMaintenanceCost": stable_maintenance_cost,
            "stableOwnerRentCost": stable_owner_rent_cost,
            "ownerRentBaseAnnual": owner_rent_base_annual,
            "ownerLandRentBaseAnnual": owner_land_rent_base_annual,
            "ownerPropertyRentBaseAnnual": owner_property_rent_base_annual,
            "ownerLandMonthlyRentComputed": land_monthly_rent,
            "ownerPropertyMonthlyRentComputed": property_monthly_rent,
            "stableExtraOperatingCost": stable_extra_operating_cost,
            "stableOperatingCost": stable_operating_cost,
            "stableTaxes": stable_taxes,
            "noiYield": safe_div(stable_noi, total_investment),
            "projectIrr": irr_project,
            "equityIrr": irr_equity,
            "projectNpv": npv_project,
            "staticPayback": payback_static,
            "dynamicPayback": payback_dynamic,
            "exitValue": sum(as_float(row.get("exitValue")) for row in annual_rows),
            "status": analysis["status"],
        },
        "investmentBreakdown": investment_breakdown,
        "organizationBreakdown": organization_breakdown,
        "officeBreakdown": office_breakdown,
        "leasingBreakdown": leasing_breakdown,
        "marketingAllocation": marketing_allocation,
        "openingMarketingAllocation": opening_marketing_allocation,
        "maintenanceBreakdown": maintenance_breakdown,
        "operatingCostBreakdown": operating_cost_breakdown,
        "annual": [row for row in annual_rows if row.get("opYear", 0) > 0],
        "constructionCashflow": [row for row in annual_rows if row.get("opYear", 0) < 1],
        "loanSchedule": loan_schedule,
        "shops": shop_calc,
        "floors": floor_calc,
        "diagnostics": diagnostics,
        "analysis": analysis,
        "marketSummary": market_summary,
        "sensitivity": sensitivity,
        "breakEven": break_even,
    }


def occupancy_for_year(op_year: int, operations: dict[str, Any]) -> float:
    if op_year <= 0:
        return 0.0
    if op_year == 1:
        return as_float(operations.get("occupancyY1"))
    if op_year < int(operations.get("stableYear") or 3):
        return as_float(operations.get("occupancyY2"))
    return as_float(operations.get("stableOccupancy"))


def npv(rate: float, cashflows: list[float]) -> float:
    return sum(cf / ((1 + rate) ** i) for i, cf in enumerate(cashflows))


def irr(cashflows: list[float]) -> float | None:
    if not cashflows or min(cashflows) >= 0 or max(cashflows) <= 0:
        return None
    low, high = -0.9999, 10.0
    f_low = npv(low, cashflows)
    f_high = npv(high, cashflows)
    if math.isnan(f_low) or math.isnan(f_high) or f_low * f_high > 0:
        return None
    for _ in range(200):
        mid = (low + high) / 2
        f_mid = npv(mid, cashflows)
        if abs(f_mid) < 1e-7:
            return mid
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2


def payback_period(cashflows: list[float]) -> float | None:
    cumulative = 0.0
    for i, cf in enumerate(cashflows):
        previous = cumulative
        cumulative += cf
        if cumulative >= 0 and previous < 0 and cf > 0:
            return i + abs(previous) / cf
    return None


def build_diagnostics(
    model: dict[str, Any],
    shop_calc: list[dict[str, Any]],
    floor_calc: list[dict[str, Any]],
    gba: float,
    total_investment: float,
    total_monthly_rent: float,
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    shops = model.get("shops", [])
    mode = str(model.get("calculationMode") or "preliminary")
    if mode == "preliminary":
        if not floor_calc:
            items.append({"level": "error", "title": "尚未建立楼层测算", "detail": "请先添加楼层，并填写建筑面积、可租赁面积和楼层平均月租金。"})
        for floor in floor_calc:
            name = floor.get("name") or "未命名楼层"
            if as_float(floor.get("leasableArea")) <= 0:
                items.append({"level": "warning", "title": f"{name}缺少可租赁面积", "detail": "该楼层不会产生租金收入。"})
            if as_float(floor.get("avgRent")) <= 0:
                items.append({"level": "warning", "title": f"{name}平均租金为零", "detail": "请填写楼层平均月租金，或切换为详细一铺一价模式。"})
    elif not shops:
        items.append({"level": "error", "title": "尚未导入铺位", "detail": "请导入铺位号、建筑面积、实际租赁面积后再进行详细测算。"})
    if gba <= 0:
        items.append({"level": "error", "title": "项目总建筑面积为零", "detail": "请录入铺位面积或直接填写项目总建筑面积。"})
    seen: set[str] = set()
    for shop in shop_calc:
        sid = shop["id"]
        if sid in seen:
            items.append({"level": "error", "title": f"铺位号重复：{sid}", "detail": "重复铺位会导致租金和面积重复计算。"})
        seen.add(sid)
        if shop["buildingArea"] <= 0:
            items.append({"level": "error", "title": f"{sid or '未命名铺位'} 缺少建筑面积", "detail": "需补充建筑面积，否则投资分摊不准确。"})
        if shop["leasableArea"] <= 0:
            items.append({"level": "warning", "title": f"{sid or '未命名铺位'} 缺少实际租赁面积", "detail": "租金将以0计。"})
        if shop["leasableArea"] > shop["buildingArea"] > 0:
            items.append({"level": "warning", "title": f"{sid} 租赁面积大于建筑面积", "detail": "请确认是否存在夹层、赠送或录入错误。"})
        if shop["rent"] <= 0:
            items.append({"level": "warning", "title": f"{sid} 租金单价为零", "detail": "请填写业态基准租金或铺位租金覆盖值。"})
    taxes = model.get("taxes", {})
    if not as_float(taxes.get("landUseTax")):
        items.append({"level": "warning", "title": "城镇土地使用税未核定", "detail": f"{jurisdiction_name(model)}不同土地等级适用税额不同，请按最新政策填写。"})
    costs = model.get("costs", {})
    if not as_float(costs.get("municipalFeeRate")):
        items.append({"level": "warning", "title": "市政基础设施配套费未录入", "detail": "该费用通常与项目类型、区位和属地政策相关。"})
    if not as_float(costs.get("civilDefenseFeeRate")):
        items.append({"level": "warning", "title": "人防易地建设费未录入", "detail": "若规划条件要求配建防空地下室或异地建设，请补充。"})
    if total_investment > 0 and total_monthly_rent > 0:
        items.append({"level": "info", "title": "测算已形成", "detail": "当前结果由输入假设自动生成，建议继续核对土地、工程、税费和出租率假设。"})
    if not items:
        items.append({"level": "success", "title": "数据完整性良好", "detail": "未发现明显缺失项，可进入结果复核。"})
    return items


def build_analysis(
    model: dict[str, Any],
    total_investment: float,
    npv: float,
    irr: float | None,
    equity_irr: float | None,
    stable_noi: float,
    stable_revenue: float,
    payback: float | None,
) -> dict[str, Any]:
    discount = as_float(model.get("valuation", {}).get("discountRate"))
    operation_years = max(1, int(as_float(model.get("project", {}).get("operationYears"), 20)))
    noi_margin = safe_div(stable_noi, stable_revenue)
    noi_yield = safe_div(stable_noi, total_investment)
    status = "待完善"
    if total_investment > 0 and stable_revenue > 0:
        if irr is not None and npv >= 0 and irr >= discount:
            status = "通过初筛"
        elif irr is not None and irr >= discount:
            status = "收益接近门槛"
        else:
            status = "需优化"
    bullets: list[str] = []
    if irr is None:
        bullets.append("当前现金流尚未形成有效的正负现金流组合，无法计算 IRR。")
    else:
        bullets.append(f"项目税后融资前 IRR 约 {irr:.1%}，与折现率 {discount:.1%} 相差 {(irr - discount) * 100:+.1f} 个百分点。")
    bullets.append(f"稳定期 NOI 为 {stable_noi:,.0f} 万元，NOI 率约 {noi_margin:.1%}，项目 NOI 回报率约 {noi_yield:.1%}。")
    if payback is None:
        bullets.append(f"按当前假设，项目在{operation_years}年测算期内尚未回收全部投资。")
    else:
        bullets.append(f"静态回收期约 {payback:.1f} 年。")
    if npv < 0:
        bullets.append("当前项目 NPV 为负，应优先复核土地成本、工程投资、租金水平和首开出租率。")
    recommendations: list[str] = []
    if irr is None or npv < 0:
        recommendations.append("先做租金与资本开支的情景优化：重点比较下调工程成本、提高首开出租率、增加主力店带动租金三种方案。")
    if noi_margin < 0.35:
        recommendations.append("稳定期 NOI 率偏低，建议优化运营团队、公共能耗、营销费用和物业维护支出。")
    if noi_yield < max(0.05, discount - 0.02):
        recommendations.append("投资回报率偏低，建议压缩非必要公共空间投入，提高可租赁面积占比和首层优质铺位租金。")
    recommendations.append(f"正式决策前，应取得{jurisdiction_name(model)}属地最新的税务、市政配套、人防、水电气增容和报建收费标准。")
    owner_rent_config = model.get("ownerRent") if isinstance(model.get("ownerRent"), dict) else {}
    if owner_rent_config.get("enabled"):
        recommendations.append("项目已计入土地或物业租赁支出，应分别核对租期、免租期、支付节奏、递增条款、发票税率及提前解约责任，并单独测算土地和物业租金上涨情景。")
    cost_adjustment_config = model.get("operations", {}).get("annualCostAdjustments", {}) if isinstance(model.get("operations"), dict) else {}
    if isinstance(cost_adjustment_config, dict) and any(
        isinstance(item, dict) and (item.get("leasingFactor") not in (None, 1, 1.0, "1", "100%") or item.get("operationsFactor") not in (None, 1, 1.0, "1", "100%") or as_float(item.get("extraCost")) != 0)
        for item in cost_adjustment_config.values()
    ):
        recommendations.append("项目设置了年度招商或运营成本调整，应逐项核对调整年份、人员编制、招商计划和费用合同，避免因爬坡或一次性活动导致成本重复或遗漏。")
    staff_source = str(model.get("operations", {}).get("staffCostMode") or "organization")
    if staff_source == "organization":
        recommendations.append("当前管理团队及物业人员成本按组织架构、编制人数、月薪、年度薪资月数和社保公积金倒推，应继续核对定编定岗方案和属地薪酬水平。")
    else:
        recommendations.append("当前人员成本按面积单价快速估算，适合前期初筛；进入招商运营深化阶段后应切换为组织架构薪资成本。")
    development_type = str(model.get("project", {}).get("developmentType") or "new_build")
    if development_type == "renovation":
        recommendations.append("旧改项目应在投资决策前完成结构安全鉴定、消防改造可行性、机电容量和停业施工组织评估，并预留不可预见改造费用。")
    elif development_type == "operating":
        recommendations.append("运营中项目应区分资产收购与股权收购口径，补充收购对价、承接负债、租约继承、改造停业损失和过渡期运营成本。")
    elif development_type == "light_asset":
        recommendations.append("轻资产项目原则上不建议计入新建土建投资，应重点核算品牌、设计、局部改造、筹备团队和履约保证金占用。")
    if status == "通过初筛":
        recommendations.append("项目已达到当前假设下的初筛门槛，可进入产品定位、招商落位和融资方案深化阶段。")
    return {"status": status, "bullets": bullets, "recommendations": recommendations}


def jurisdiction_name(model: dict[str, Any]) -> str:
    location = str(model.get("project", {}).get("location") or "项目所在地").strip() or "项目所在地"
    region = re.sub(r"^.*?(?:省|自治区)", "", location)
    match = re.match(r"^(.+?市)", region) or re.match(r"^(.+?(?:州|盟|地区))", region)
    return match.group(1) if match else location


def summarize_market_comps(model: dict[str, Any], project_avg_rent: float) -> dict[str, Any]:
    comps = [item for item in model.get("market", {}).get("comparables", []) if as_float(item.get("rent")) > 0]
    if not comps:
        return {
            "count": 0,
            "averageRent": None,
            "weightedAverageRent": None,
            "medianRent": None,
            "p25Rent": None,
            "p75Rent": None,
            "projectAverageRent": project_avg_rent,
            "position": "暂无竞品租金样本",
            "byCategory": [],
            "byFloor": [],
            "conclusions": ["导入3–5公里范围内竞品租金样本后，系统将形成市场租金区间和项目定价建议。"],
        }
    rents = sorted(as_float(item.get("rent")) for item in comps)
    total_area = sum(max(0.0, as_float(item.get("leasableArea"))) for item in comps)
    weighted = sum(as_float(item.get("rent")) * max(0.0, as_float(item.get("leasableArea"))) for item in comps) / total_area if total_area else sum(rents) / len(rents)
    median = percentile(rents, 0.50)
    p25 = percentile(rents, 0.25)
    p75 = percentile(rents, 0.75)
    position = "暂无项目租金"
    if project_avg_rent > 0:
        ratio = project_avg_rent / weighted if weighted else 1
        if ratio > 1.15:
            position = "明显高于市场加权均价"
        elif ratio > 1.05:
            position = "略高于市场加权均价"
        elif ratio < 0.85:
            position = "明显低于市场加权均价"
        elif ratio < 0.95:
            position = "略低于市场加权均价"
        else:
            position = "接近市场加权均价"
    def grouped(key: str) -> list[dict[str, Any]]:
        groups: dict[str, list[dict[str, Any]]] = {}
        for item in comps:
            name = str(item.get(key) or "未填写").strip() or "未填写"
            groups.setdefault(name, []).append(item)
        rows = []
        for name, items in groups.items():
            item_rents = [as_float(x.get("rent")) for x in items]
            area = sum(max(0.0, as_float(x.get("leasableArea"))) for x in items)
            avg = sum(as_float(x.get("rent")) * max(0.0, as_float(x.get("leasableArea"))) for x in items) / area if area else sum(item_rents) / len(item_rents)
            rows.append({"name": name, "count": len(items), "averageRent": avg, "medianRent": percentile(sorted(item_rents), 0.5)})
        return sorted(rows, key=lambda row: row["averageRent"], reverse=True)
    conclusions = [f"共纳入{len(comps)}条有效竞品租金样本，市场加权均价约{weighted:,.1f}元/㎡/月，中位数约{median:,.1f}元/㎡/月。"]
    conclusions.append(f"项目平均租金约{project_avg_rent:,.1f}元/㎡/月，{position}。")
    if project_avg_rent > p75:
        conclusions.append("项目定价高于市场75分位，建议强化位置、品牌和运营价值支撑。")
    elif project_avg_rent < p25:
        conclusions.append("项目定价低于市场25分位，可检查是否存在租金提升空间或定位偏保守。")
    else:
        conclusions.append("项目定价位于市场中间区间，可结合楼层和铺位条件继续微调。")
    return {
        "count": len(comps),
        "averageRent": sum(rents) / len(rents),
        "weightedAverageRent": weighted,
        "medianRent": median,
        "p25Rent": p25,
        "p75Rent": p75,
        "projectAverageRent": project_avg_rent,
        "position": position,
        "byCategory": grouped("category"),
        "byFloor": grouped("floor"),
        "conclusions": conclusions,
    }


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * p
    low = int(math.floor(index))
    high = int(math.ceil(index))
    if low == high:
        return sorted_values[low]
    return sorted_values[low] * (high - index) + sorted_values[high] * (index - low)


def scale_model_for_sensitivity(model: dict[str, Any], rent_multiplier: float = 1.0, capex_multiplier: float = 1.0) -> dict[str, Any]:
    m = copy.deepcopy(model)
    for floor in m.get("floors", []):
        floor["avgRent"] = as_float(floor.get("avgRent")) * rent_multiplier
    for cat in m.get("categories", []):
        cat["rent"] = as_float(cat.get("rent")) * rent_multiplier
    for shop in m.get("shops", []):
        if shop.get("rentOverride") is not None:
            shop["rentOverride"] = as_float(shop.get("rentOverride")) * rent_multiplier
    for key in ["preconstructionRate", "constructionRate", "fitoutRate", "equipmentRate", "otherEngineeringRate", "municipalFeeRate", "civilDefenseFeeRate", "otherPublicFeeRate"]:
        m["costs"][key] = as_float(m["costs"].get(key)) * capex_multiplier
    return m


def build_percent_steps(minimum: float, maximum: float, step: float) -> list[float]:
    low, high = sorted((minimum, maximum))
    step = max(0.001, abs(step))
    values = {1.0}
    current = low
    while current <= high + 1e-9 and len(values) < 11:
        values.add(round(current, 6))
        current += step
    values.add(round(high, 6))
    return sorted(values)


def build_sensitivity(model: dict[str, Any], discount_rate: float) -> dict[str, Any]:
    formulas = model.get("formulas") if isinstance(model.get("formulas"), dict) else {}
    rent_steps = build_percent_steps(
        as_float(formulas.get("sensitivityRentMin"), 0.90),
        as_float(formulas.get("sensitivityRentMax"), 1.10),
        as_float(formulas.get("sensitivityRentStep"), 0.05),
    )
    capex_steps = build_percent_steps(
        as_float(formulas.get("sensitivityCapexMin"), 0.90),
        as_float(formulas.get("sensitivityCapexMax"), 1.10),
        as_float(formulas.get("sensitivityCapexStep"), 0.05),
    )
    matrix: list[list[float]] = []
    for capex in capex_steps:
        row: list[float] = []
        for rent in rent_steps:
            result = calculate_model(scale_model_for_sensitivity(model, rent, capex), include_sensitivity=False)
            row.append(as_float(result["summary"]["projectNpv"]))
        matrix.append(row)
    return {
        "rentSteps": rent_steps,
        "capexSteps": capex_steps,
        "npvMatrix": matrix,
        "discountRate": discount_rate,
    }


def build_break_even(model: dict[str, Any], discount_rate: float) -> dict[str, float | None]:
    def npv_for_rent(x: float) -> float:
        return as_float(calculate_model(scale_model_for_sensitivity(model, rent_multiplier=x), include_sensitivity=False)["summary"]["projectNpv"])

    def npv_for_capex(x: float) -> float:
        return as_float(calculate_model(scale_model_for_sensitivity(model, capex_multiplier=x), include_sensitivity=False)["summary"]["projectNpv"])

    rent_multiplier = find_zero(npv_for_rent, 0.5, 3.0)
    capex_multiplier = find_zero(npv_for_capex, 0.4, 1.5)
    return {
        "rentMultiplier": rent_multiplier,
        "rentUplift": (rent_multiplier - 1) if rent_multiplier is not None else None,
        "capexMultiplier": capex_multiplier,
        "capexReduction": (1 - capex_multiplier) if capex_multiplier is not None else None,
    }


def find_zero(func, low: float, high: float) -> float | None:
    f_low, f_high = func(low), func(high)
    if f_low == 0:
        return low
    if f_high == 0:
        return high
    if f_low * f_high > 0:
        return None
    for _ in range(80):
        mid = (low + high) / 2
        f_mid = func(mid)
        if abs(f_mid) < 1e-5:
            return mid
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2

