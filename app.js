import './backend.js?v=20261110-bench1';
await window.__duoduoBackendReady;

const APP_VERSION = '1.19.0';
const app = document.getElementById('app');
const toastRegion = document.getElementById('toast-region');
const modalRegion = document.getElementById('modal-region');

const STEPS = [
  { key: 'project', label: '项目基本条件', desc: '产权、位置、业态、面积与开发状态' },
  { key: 'costs', label: '建设投资', desc: '土地、建安、装修、设备与公共规费' },
  { key: 'shops', label: '商铺收益', desc: '楼层均价、一铺一价与市场依据' },
  { key: 'preopening', label: '筹备期成本', desc: '筹备团队、物业、招商、营销与开办费' },
  { key: 'operations', label: '运营期成本', desc: '组织、物业、招商、营销、办公与维保' },
  { key: 'taxes', label: '税费与利润', desc: '税费、融资、折旧、所得税与退出' },
  { key: 'results', label: '资本金与回报', desc: 'NPV、IRR、回收期、对比与汇报材料' },
];

const DEFAULT_FORMULAS = {
  rentGrowthMode: 'compound',
  propertyFeeGrowthMode: 'compound',
  buildingDepreciationYears: 20,
  fitoutDepreciationYears: 5,
  equipmentDepreciationYears: 10,
  taxLossCarryforwardYears: 5,
  loanRepaymentMethod: 'equal_principal',
  exitValueMethod: 'noi_cap',
  exitRevenueMultiple: 1.0,
  sensitivityRentMin: 0.90,
  sensitivityRentMax: 1.10,
  sensitivityRentStep: 0.05,
  sensitivityCapexMin: 0.90,
  sensitivityCapexMax: 1.10,
  sensitivityCapexStep: 0.05,
};

const PROPERTY_SERVICE_DEFINITIONS = [
  { key: 'property', name: '物业工程服务', keywords: ['物业', '工程', '消防', '强弱电', '暖通', '机电'] },
  { key: 'security', name: '保安服务', keywords: ['保安', '秩序维护', '监控'] },
  { key: 'cleaning', name: '保洁服务', keywords: ['保洁', '环境卫生', '垃圾清运'] },
];

const PROPERTY_SERVICE_MODE_OPTIONS = [
  { value: 'self', label: '自营（自行招聘）' },
  { value: 'resident_outsourced', label: '第三方常驻外包' },
  { value: 'non_resident', label: '第三方非常驻服务' },
];

const FIELD_FORMULAS = {
  'project.gbaOverride': { title: '总建筑面积', formula: '总建筑面积 = 手动总建筑面积；若为0，则 = 商铺建筑面积 ×（1 + 公区系数）', functions: ['IF', 'SUM'], role: '作为建安、装修、设备、预备费和单位投资指标的计算基数。' },
  'project.commonAreaFactor': { title: '公区分摊系数', formula: '总建筑面积 = 商铺建筑面积合计 ×（1 + 公共部位及设备房分摊系数）', functions: ['SUM'], role: '提高该系数会增加总建筑面积，进而增加按面积计取的建设投资。' },
  'project.landArea': { title: '占地面积与土地使用税', formula: '城镇土地使用税 = 占地面积 × 单位土地税额 ÷ 10000', functions: ['ROUND'], role: '仅影响城镇土地使用税，不影响土地价款。' },
  'project.landPrice': { title: '土地价款与契税', formula: '土地取得成本 = 土地价款 + 土地价款 × 契税率', functions: ['SUM'], role: '土地价款同时进入项目总投资和融资基数。' },
  'project.propertyRightsStatus': { title: '产权状态', formula: '自有产权/租赁物业/股权持有/政府合作', functions: ['IF'], role: '不同产权状态决定土地、物业租赁、收购对价和运营边界的核算方式。' },
  'project.acquisitionMethod': { title: '取得方式', formula: '招拍挂/协议转让/股权收购/政府划拨/租赁取得', functions: ['IF'], role: '用于识别税费、尽调、交易对价和前期风险。' },
  'project.buildingStatus': { title: '建设与经营状态', formula: '在建/竣工未开业/运营中/待改造', functions: ['IF'], role: '决定建设投资、改造投入、筹备成本和运营接续成本的核算重点。' },
  'project.otherPreOpening': { title: '其他前期及开办费用', formula: '项目总投资 = 土地及契税 + 建设工程 + 预备费 + 招商开办 + 流动资金', functions: ['SUM'], role: '该金额直接计入招商及开办投资。' },
  'project.preOpeningMarketing': { title: '筹备期营销费用', formula: '招商及开办 = 招商佣金 + 筹备期营销费用 + 其他前期费用', functions: ['SUM'], role: '该金额直接计入项目总投资。' },
  'project.preOpeningTeamCost': { title: '筹备期团队成本', formula: '筹备期团队成本 = 开业前工资社保 + 招聘培训 + 筹备差旅及办公', functions: ['SUM'], role: '只计入筹备期投入，不重复计入运营期人员成本。' },
  'project.preOpeningPropertyCost': { title: '筹备期物业成本', formula: '筹备期物业成本 = 工程介入 + 开荒保洁 + 临时保安 + 物业顾问', functions: ['SUM'], role: '用于开业前物业介入和开荒，不重复计入运营期物业服务成本。' },
  'project.leasingPeriodMonths': { title: '筹备招商期', formula: '开业时间 = 建设期 + 筹备招商期；筹备费用在筹备招商期内形成现金流出', functions: ['SUM'], role: '让招商期和建设期、运营期在现金流时间轴上分开。' },
  'project.startupReserveMonths': { title: '启动资金安全垫', formula: '建议启动资金 = 资本金累计资金缺口峰值 + 稳定期月均运营成本 × 安全垫月数', functions: ['MAX','SUM'], role: '用于覆盖招商爬坡和开业初期不确定性的额外资金准备。' },
  'project.contingencyRate': { title: '预备费', formula: '预备费 = 直接工程费 × 预备费费率', functions: ['SUM', 'ROUND'], role: '直接工程费包括前期、建安、公共配套、装修、设备和其他工程。' },
  'project.constructionYears': { title: '建设期与贷款提款', formula: '总测算期 = 建设期 + 运营期；建设期按0.55、0.45比例提款', functions: ['SUM', 'INDEX'], role: '建设期影响首笔经营年度、利息资本化与现金流时点。' },
  'project.operationYears': { title: '运营期与NPV', formula: '总测算期 = 建设期 + 运营期；NPV = Σ[CFt ÷（1+r）^t]', functions: ['SUM', 'POWER', 'NPV'], role: '延长运营期会改变累计现金流和退出价值时点。' },
  'project.revenueModel': { title: '项目计租方式', formula: '纯租金 = 保底；纯扣点 = 扣点；取高 = MAX(保底, 扣点)', functions: ['IF', 'MAX'], role: '该选择是项目默认结算方式，各业态可单独覆盖。' },
  'project.developmentType': { title: '项目开发状态', formula: '参考单价 = 城市系数 × 开发状态基准单价 × 商业类型系数', functions: ['ROUND'], role: '新建、旧改、运营中和轻资产项目会采用不同的建安、改造和装修参考基准。' },
  'project.rentAreaBasis': { title: '租金核算面积口径', formula: '按建筑面积：租金 = 建筑面积 × 单价；按实用面积：租金 = 实用/租赁面积 × 单价', functions: ['IF'], role: '决定楼层和铺位租金按建筑面积还是实用面积（套内面积）核算，楼层和铺位可单独覆盖。' },
  'costs.preconstructionRate': { title: '前期工程费', formula: '前期工程费 = 总建筑面积 × 前期工程单价 ÷ 10000', functions: ['SUM', 'ROUND'], role: '金额单位为万元，计入直接工程费和折旧基数。' },
  'costs.constructionRate': { title: '建安工程费', formula: '建安工程费 = 总建筑面积 × 建安工程单价 ÷ 10000', functions: ['SUM', 'ROUND'], role: '计入直接工程费、预备费、维修费、保险和折旧基数。' },
  'costs.otherEngineeringRate': { title: '其他工程费', formula: '其他工程费 = 总建筑面积 × 其他工程单价 ÷ 10000', functions: ['SUM'], role: '并入前期及建安工程和折旧基数。' },
  'costs.fitoutRate': { title: '公共区域精装', formula: '装修工程费 = 总建筑面积 × 精装单价 ÷ 10000', functions: ['SUM'], role: '进入装修投资、装修折旧和维修改造基数。' },
  'costs.equipmentRate': { title: '设施设备', formula: '设备工程费 = 总建筑面积 × 设备单价 ÷ 10000', functions: ['SUM'], role: '进入设备投资、设备折旧和维修改造基数。' },
  'costs.workingCapitalRate': { title: '铺底流动资金', formula: '铺底流动资金 = 稳定运营成本估算 × 铺底流动资金率', functions: ['SUM', 'MAX'], role: '运营成本估算包含物业、能耗、商管、行政及维修成本。' },
  'costs.municipalFeeRate': { title: '市政基础设施配套费', formula: '市政配套费 = 总建筑面积 × 属地配套费单价 ÷ 10000', functions: ['SUM'], role: '默认0，应按项目属地最新政策填写。' },
  'costs.civilDefenseFeeRate': { title: '人防易地建设费', formula: '人防易地建设费 = 总建筑面积 × 属地人防单价 ÷ 10000', functions: ['SUM'], role: '默认0，应按规划条件和属地政策填写。' },
  'costs.otherPublicFeeRate': { title: '其他公共规费', formula: '其他公共规费 = 总建筑面积 × 其他规费单价 ÷ 10000', functions: ['SUM'], role: '用于水电气增容、报建等未单列公共费用。' },
  'operations.occupancyY1': { title: '首年有效出租率', formula: '首年出租率 = 输入值；首年免租系数 = 1 - 免租月数 ÷ 12', functions: ['IF', 'POWER'], role: '首年出租率同时影响租金、物业费、停车和多经收入。' },
  'operations.occupancyY2': { title: '第二年出租率', formula: '第二年出租率 = 输入值；稳定年前各年按该出租率计算', functions: ['IF'], role: '稳定期前的过渡出租率。' },
  'operations.stableOccupancy': { title: '稳定期出租率', formula: '稳定期出租率 = 输入值；运营年 ≥ 稳定起始年时启用', functions: ['IF'], role: '决定稳定期NOI和退出价值。' },
  'operations.stableYear': { title: '稳定期起始年', formula: 'IF(运营年 < 稳定期起始年, 第二年出租率, 稳定期出租率)', functions: ['IF'], role: '控制出租率爬坡持续时间。' },
  'operations.rentFreeMonths': { title: '首年免租', formula: '首年有效租金 = 满租租金 × 出租率 ×（1 - 免租月数 ÷ 12）', functions: ['IF'], role: '仅影响首个运营年，不改变合同租金单价。' },
  'operations.rentGrowth': { title: '租金年递增率', formula: '每年复利：租金 ×（1 + 年递增率）^（运营年 - 1）\n每年单利：租金 ×［1 + 年递增率 ×（运营年 - 1）］', functions: ['POWER', 'IF'], role: '用于每年复利或每年单利递增；阶梯递增使用单独的递增周期和递增率。' },
  'operations.rentStepYears': { title: '租金递增周期', formula: '阶梯递增：每 N 个运营年上调一次租金', functions: ['INT', 'POWER'], role: '例如填3，表示第1—3年不变，第4年开始按阶梯递增率上调。' },
  'operations.rentStepRate': { title: '租金阶梯递增率', formula: '租金因子 =（1 + 阶梯递增率）^［(运营年 - 1) ÷ N 取整］', functions: ['INT', 'POWER'], role: '仅在“每N年阶梯递增”模式下生效。' },
  'operations.propertyFeeGrowth': { title: '物业管理费年递增率', formula: '每年复利：物业费 ×（1 + 年递增率）^（运营年 - 1）\n每年单利：物业费 ×［1 + 年递增率 ×（运营年 - 1）］', functions: ['POWER', 'IF'], role: '物业管理费与租金分别递增，可设置不同增长方式。' },
  'operations.propertyFeeStepYears': { title: '物业管理费递增周期', formula: '阶梯递增：每 N 个运营年上调一次物业费', functions: ['INT', 'POWER'], role: '仅在物业费“每N年阶梯递增”模式下生效。' },
  'operations.propertyFeeStepRate': { title: '物业管理费阶梯递增率', formula: '物业费因子 =（1 + 阶梯递增率）^［(运营年 - 1) ÷ N 取整］', functions: ['INT', 'POWER'], role: '用于每N年调整一次物业管理费单价。' },
  'operations.commercialManagementGrowth': { title: '商业管理费年递增率', formula: '每年复利：商管费 ×（1 + 年递增率）^（运营年 - 1）\n每年单利：商管费 ×［1 + 年递增率 ×（运营年 - 1）］', functions: ['POWER', 'IF'], role: '商业管理费可按委托管理合同独立调整，不跟随物业费增长。' },
  'operations.commercialManagementStepYears': { title: '商业管理费递增周期', formula: '阶梯递增：每 N 个运营年上调一次商业管理费', functions: ['INT', 'POWER'], role: '仅在商业管理费“每N年阶梯递增”模式下生效。' },
  'operations.commercialManagementStepRate': { title: '商业管理费阶梯递增率', formula: '商管费因子 =（1 + 阶梯递增率）^［(运营年 - 1) ÷ N 取整］', functions: ['INT', 'POWER'], role: '用于每N年调整一次商业管理费单价。' },
  'operations.centralAcGrowth': { title: '中央空调费年递增率', formula: '每年复利：空调费 ×（1 + 年递增率）^（运营年 - 1）\n每年单利：空调费 ×［1 + 年递增率 ×（运营年 - 1）］', functions: ['POWER', 'IF'], role: '中央空调使用费可按能耗、运维成本或合同约定独立调整。' },
  'operations.centralAcStepYears': { title: '中央空调费递增周期', formula: '阶梯递增：每 N 个运营年上调一次中央空调费', functions: ['INT', 'POWER'], role: '仅在中央空调费“每N年阶梯递增”模式下生效。' },
  'operations.centralAcStepRate': { title: '中央空调费阶梯递增率', formula: '空调费因子 =（1 + 阶梯递增率）^［(运营年 - 1) ÷ N 取整］', functions: ['INT', 'POWER'], role: '用于每N年调整一次中央空调使用费单价。' },
  'operations.salesGrowth': { title: '联营销售额增长', formula: '联营扣点收入 = 销售基数 × 扣点率 × 销售额增长因子', functions: ['POWER', 'MAX'], role: '仅影响联营扣点收入；纯租金模式不产生此项。' },
  'operations.collectionRate': { title: '租金收缴率', formula: '坏账损失 = 不含税营业收入 ×（1 - 租金收缴率）', functions: ['SUM'], role: '收缴率越低，运营成本和现金流压力越大。' },
  'operations.renewalCycle': { title: '续租周期', formula: '续租佣金年度 = 运营年 MOD 续租周期 = 0', functions: ['MOD', 'IF'], role: '用于测算续租佣金和招商费用发生时点。' },
  'operations.commissionMonths': { title: '首开招商佣金', formula: '首开招商佣金 = 月租金 × 招商佣金月数 × 首年出租率', functions: ['SUM'], role: '该费用计入项目总投资中的招商及开办。' },
  'operations.renewalCommissionMonths': { title: '续租佣金', formula: '续租佣金 = 月租金 × 续租佣金月数 × 当年出租率', functions: ['MOD', 'IF'], role: '按续租周期进入运营期现金流。' },
  'operations.depositMonths': { title: '租赁保证金', formula: '租赁保证金 = 月租金 × 保证金月数', functions: ['SUM'], role: '作为招商期现金流入和期末退还的参考。' },
  'revenues.propertyFee': { title: '物业管理费单价', formula: '物业管理费收入 = Σ铺位计租面积 × 物业管理费单价（或铺位覆盖值）× 12 × 出租率 × 物业费递增因子 ÷ 10000', functions: ['SUM', 'POWER', 'IF'], role: '物业管理费独立核算，不与商业管理费、中央空调费合并；可按楼栋或铺位覆盖单价。' },
  'revenues.commercialManagementFee': { title: '商业管理费单价', formula: '商业管理费收入 = Σ铺位计租面积 × 商业管理费单价（或铺位覆盖值）× 12 × 出租率 × 商管费递增因子 ÷ 10000', functions: ['SUM', 'POWER', 'IF'], role: '商业管理费独立核算，适用于商业运营管理服务；可与物业费设置不同单价和递增方式。' },
  'revenues.centralAcFee': { title: '中央空调使用费单价', formula: '中央空调使用费收入 = Σ(收取楼栋铺位计租面积 × 楼栋空调单价) × 12 × 出租率 × 空调费递增因子 ÷ 10000', functions: ['SUM', 'POWER', 'IF'], role: '只对已开启中央空调收费的楼栋或填写铺位覆盖单价的铺位计费，未开启楼栋按0核算。' },
  'revenues.otherIncomeRatio': { title: '多经收入', formula: '多经收入 = 租金收入 × 多经收入占比', functions: ['SUM'], role: '包含广告、场地、多经点位等收入。' },
  'revenues.parkingSpaces': { title: '停车收入', formula: '停车收入 = 车位数 × 停车月租 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '与停车月租共同决定停车收入。' },
  'revenues.parkingMonthly': { title: '停车月租', formula: '停车收入 = 车位数 × 停车月租 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '与停车位数量共同决定停车收入。' },
  'operations.propertyOpsCost': { title: '物业运营参考单价', formula: '未填直接金额时：物业运营成本 = 总建筑面积 × 单价 × 12 × 运营爬坡系数 ÷ 10000', functions: ['IF','SUM'], role: '只在物业基础运营直接金额为0时作为自动核算参考。' },
  'operations.energyCost': { title: '公共能耗参考单价', formula: '未填直接金额时：公共能耗 = 总建筑面积 × 能耗单价 × 12 × 出租率 ÷ 10000', functions: ['IF','SUM'], role: '只在公共能耗直接金额为0时作为自动核算参考。' },
  'operations.staffCostPerSqm': { title: '商管团队成本', formula: '商管团队成本 = 总建筑面积 × 团队成本单价 × 12 × 爬坡系数 ÷ 10000', functions: ['SUM'], role: '进入运营成本和NOI。' },
  'operations.staffCostMode': { title: '人员成本来源', formula: '按组织架构：Σ部门年度薪资及社保；按面积：总建筑面积×人员成本单价×12', functions: ['IF', 'SUM'], role: '组织架构模式会通过人力资源月薪成本倒推管理团队和物业人员成本。' },
  'operations.adminCostPerSqm': { title: '行政办公参考单价', formula: '办公预算为0时：行政办公成本 = 总建筑面积 × 行政成本单价 × 12 × 爬坡系数 ÷ 10000', functions: ['IF','SUM'], role: '办公预算已有金额时优先按金额核算。' },
  'operations.marketingRate': { title: '旧版营销费率', formula: '仅旧版权重项目兼容：营销费用 = 不含税营业收入 × 营销费用率', functions: ['IF','SUM'], role: '新项目已改为营销金额录入，该费率不再参与新项目计算。' },
  'operations.repairRate': { title: '日常维修参考费率', formula: '未填日常维修金额时：维修改造费 =（建安 + 装修 + 设备 + 其他工程 + 预备费）× 维修改造费率 × 爬坡系数', functions: ['IF','SUM'], role: '仅在未填写日常维修直接金额时使用。' },
  'operations.insuranceRate': { title: '保险参考费率', formula: '未填保险金额时：保险费用 =（建安 + 装修 + 设备 + 其他工程）× 保险费率', functions: ['IF','SUM'], role: '仅在未填写保险直接金额时使用。' },
  'operations.capexRate': { title: '资本化改造', formula: '资本化改造 = 不含税租金收入 × 资本化改造率', functions: ['SUM'], role: '作为项目现金流中的年度资本开支扣除项。' },
  'operations.otherOpexRate': { title: '其他运营费用参考费率', formula: '未填其他费用金额时：其他运营费用 = 不含税营业收入 × 其他运营费用率', functions: ['IF','SUM'], role: '仅在未填写其他运营费用直接金额时使用。' },
  'operations.rampY1': { title: '首年运营爬坡', formula: '首年运营成本 = 稳定运营成本 × 首年爬坡系数', functions: ['IF'], role: '降低开业首年物业、商管和行政成本。' },
  'operations.rampY2': { title: '第二年运营爬坡', formula: '第二年运营成本 = 稳定运营成本 × 第二年爬坡系数', functions: ['IF'], role: '用于第二年的成本过渡。' },
  'taxes.vatRent': { title: '租金销项税', formula: '租金销项税 = 含税租金 ÷（1 + 租金增值税率）× 租金增值税率', functions: ['SUM', 'ROUND'], role: '现行租金参考税率通常为9%，以税务认定为准。' },
  'taxes.vatProperty': { title: '物业费销项税', formula: '物业费销项税 = 含税物业费 ÷（1 + 税率）× 税率', functions: ['SUM'], role: '按物业费收入计算销项税。' },
  'taxes.vatOther': { title: '其他收入销项税', formula: '其他收入销项税 = 含税其他收入 ÷（1 + 税率）× 税率', functions: ['SUM'], role: '用于停车、多经等收入。' },
  'taxes.vatConcession': { title: '联营扣点销项税', formula: '联营扣点销项税 = 含税扣点收入 ÷（1 + 税率）× 税率', functions: ['SUM'], role: '纯联营或保底取高模式下使用。' },
  'taxes.inputVatShare': { title: '进项税抵扣比例', formula: '进项税 = MIN(销项税, 可抵扣运营成本 × 抵扣比例 × 进项税率 ÷（1 + 进项税率）)', functions: ['MIN'], role: '控制运营成本对应进项税的抵扣比例。' },
  'taxes.inputVatRate': { title: '进项税率', formula: '进项税 = MIN(销项税, 可抵扣运营成本 × 抵扣比例 × 进项税率 ÷（1 + 进项税率）)', functions: ['MIN'], role: '用于估算可抵扣进项税。' },
  'taxes.cityTax': { title: '城建税', formula: '附加税 = MAX(0, 销项税 - 进项税）×（城建税率 + 教育费附加 + 地方教育附加）', functions: ['MAX', 'SUM'], role: '按增值税净额计征。' },
  'taxes.educationSurcharge': { title: '教育费附加', formula: '教育费附加 = MAX(0, 销项税 - 进项税）× 教育费附加率', functions: ['MAX'], role: '与城建税、地方教育附加合并计算。' },
  'taxes.localEducationSurcharge': { title: '地方教育附加', formula: '地方教育附加 = MAX(0, 销项税 - 进项税）× 地方教育附加率', functions: ['MAX'], role: '与城建税、教育费附加合并计算。' },
  'taxes.propertyTaxMethod': { title: '房产税计征方式', formula: '从租：不含税租金 × 12%；从价：房产原值 ×（1 - 扣除比例）× 1.2%', functions: ['IF'], role: '出租物业通常从租计征，最终以税务认定为准。' },
  'taxes.propertyTaxRateRent': { title: '房产税从租税率', formula: '房产税 = 不含税租金 × 从租税率', functions: ['IF'], role: '从租计征方式下使用。' },
  'taxes.propertyTaxRateValue': { title: '房产税从价税率', formula: '房产税 = 房产原值 ×（1 - 扣除比例）× 从价税率', functions: ['IF'], role: '从价计征方式下使用。' },
  'taxes.propertyValueDeduction': { title: '房产原值扣除比例', formula: '房产余值 = 房产原值 ×（1 - 扣除比例）', functions: ['IF'], role: '用于从价计征房产税。' },
  'taxes.landUseTax': { title: '城镇土地使用税', formula: '土地使用税 = 占地面积 × 单位税额 ÷ 10000', functions: ['ROUND'], role: '不同土地等级税额不同，应按属地政策填写。' },
  'taxes.stampDuty': { title: '印花税', formula: '印花税 = 不含税租金收入 × 印花税率', functions: ['SUM'], role: '按租金收入估算。' },
  'taxes.localFundRate': { title: '地方基金及附加', formula: '地方基金 = 不含税营业收入 × 地方基金费率', functions: ['SUM'], role: '默认0，按属地政策填写。' },
  'taxes.corporateTax': { title: '企业所得税', formula: '所得税 = MAX(0, 税前利润 - 可结转亏损）× 企业所得税率', functions: ['MAX', 'IF'], role: '用于税后净利润和股权现金流。' },
  'taxes.deedTax': { title: '土地契税', formula: '契税 = 土地价款 × 契税率', functions: ['SUM'], role: '进入土地及契税投资。' },
  'taxes.exitTaxRate': { title: '退出税费率', formula: '净退出价值 = 退出价值 ×（1 - 退出税费率）', functions: ['SUM'], role: '用于期末退出现金流扣除。' },
  'finance.debtRatio': { title: '贷款额', formula: '贷款额 = 项目总投资 × 债务融资比例', functions: ['SUM'], role: '影响股权投入、利息和还本现金流。' },
  'finance.loanRate': { title: '贷款利息', formula: '当年利息 =（期初余额 + 当年提款 ÷ 2）× 年贷款利率', functions: ['SUM'], role: '建设期利息在现金流中体现。' },
  'finance.loanTerm': { title: '还本期限', formula: '等额本金：年还本额 = 贷款额 ÷ 贷款期限；先息后本：期末一次还本', functions: ['IF', 'MIN'], role: '可在“公式参数”中选择还款方式。' },
  'finance.graceYears': { title: '还款宽限期', formula: '运营年 > 宽限期 且 运营年 ≤ 宽限期 + 贷款期限时还本', functions: ['IF'], role: '控制开始还本的时间。' },
  'valuation.discountRate': { title: '折现率与NPV', formula: 'NPV = Σ[CFt ÷（1 + 折现率）^t]', functions: ['SUM', 'POWER', 'NPV'], role: '折现率越高，未来现金流现值越低。' },
  'valuation.exitCapRate': { title: '资本化率退出法', formula: '退出价值 = 期末NOI ÷ 退出资本化率 ×（1 - 退出税费率）', functions: ['MAX', 'IF'], role: '在“公式参数”中选择NOI资本化率法时使用。' },
  'valuation.includeExit': { title: '期末退出价值', formula: '项目现金流 = NOI - 资本化改造 - 所得税 + 期末退出价值', functions: ['IF'], role: '关闭后不计算期末退出价值。' },
  'formulas.rentGrowthMode': { title: '租金增长方式', formula: '复利 = POWER(1+g,n)；单利 = 1 + g×n', functions: ['POWER', 'IF'], role: '决定租金和销售额随运营年份的增长曲线。' },
  'formulas.propertyFeeGrowthMode': { title: '物业管理费增长方式', formula: '不复递增 / 每年复利 / 每年单利 / 每N年阶梯递增', functions: ['POWER', 'IF'], role: '物业管理费增长与租金、商管费和空调费分别设置，便于匹配物业服务合同。' },
  'formulas.commercialManagementGrowthMode': { title: '商业管理费增长方式', formula: '不复递增 / 每年复利 / 每年单利 / 每N年阶梯递增', functions: ['POWER', 'IF'], role: '商业管理费独立递增，可按商业管理委托合同设置不同周期。' },
  'formulas.centralAcGrowthMode': { title: '中央空调费增长方式', formula: '不复递增 / 每年复利 / 每年单利 / 每N年阶梯递增', functions: ['POWER', 'IF'], role: '中央空调使用费独立递增，可按能源价格、设备运维成本或合同约定调整。' },
  'formulas.buildingDepreciationYears': { title: '建筑折旧年限', formula: '建筑年折旧 = 建筑工程投资 ÷ 建筑折旧年限', functions: ['SUM'], role: '影响税前利润、所得税和净利润。' },
  'formulas.fitoutDepreciationYears': { title: '装修折旧年限', formula: '装修年折旧 = 装修投资 ÷ 装修折旧年限', functions: ['SUM'], role: '影响税前利润、所得税和净利润。' },
  'formulas.equipmentDepreciationYears': { title: '设备折旧年限', formula: '设备年折旧 = 设备投资 ÷ 设备折旧年限', functions: ['SUM'], role: '影响税前利润、所得税和净利润。' },
  'formulas.taxLossCarryforwardYears': { title: '亏损结转年限', formula: '可结转亏损 = Σ[历史亏损中年限 ≤ N的部分]', functions: ['SUM', 'IF'], role: '用于抵减以后年度应纳税所得额。' },
  'formulas.loanRepaymentMethod': { title: '贷款还款方式', formula: '等额本金：本金=贷款额÷期限；先息后本：期末一次还本', functions: ['IF'], role: '影响运营期本金流出和股权现金流。' },
  'formulas.exitValueMethod': { title: '退出估值方法', formula: 'NOI资本化率法：NOI÷CapRate；收入倍数法：营业收入×收入倍数', functions: ['IF', 'MAX'], role: '决定期末退出价值公式。' },
  'formulas.exitRevenueMultiple': { title: '退出收入倍数', formula: '退出价值 = 期末营业收入 × 退出收入倍数', functions: ['SUM'], role: '仅在收入倍数法下启用。' },
  'formulas.sensitivityRentMin': { title: '敏感性租金下限', formula: '敏感性矩阵租金系数 = MIN ~ MAX，按STEP生成', functions: ['SEQUENCE', 'ROUND'], role: '用于NPV敏感性分析。' },
  'formulas.sensitivityRentMax': { title: '敏感性租金上限', formula: '敏感性矩阵租金系数 = MIN ~ MAX，按STEP生成', functions: ['SEQUENCE', 'ROUND'], role: '用于NPV敏感性分析。' },
  'formulas.sensitivityRentStep': { title: '敏感性租金步长', formula: '租金系数序列 = MIN, MIN+STEP, …, MAX', functions: ['SEQUENCE'], role: '步长越小，矩阵越细。' },
  'formulas.sensitivityCapexMin': { title: '敏感性投资下限', formula: '敏感性矩阵投资系数 = MIN ~ MAX，按STEP生成', functions: ['SEQUENCE', 'ROUND'], role: '用于NPV敏感性分析。' },
  'formulas.sensitivityCapexMax': { title: '敏感性投资上限', formula: '敏感性矩阵投资系数 = MIN ~ MAX，按STEP生成', functions: ['SEQUENCE', 'ROUND'], role: '用于NPV敏感性分析。' },
  'formulas.sensitivityCapexStep': { title: '敏感性投资步长', formula: '投资系数序列 = MIN, MIN+STEP, …, MAX', functions: ['SEQUENCE'], role: '步长越小，矩阵越细。' },
  'ownerRent.enabled': { title: '业主租金支付', formula: '启用后，业主租金作为运营期固定支出进入NOI', functions: ['IF'], role: '轻资产、租赁经营和运营中项目通常需要计入业主租金。' },
  'ownerRent.leaseType': { title: '租赁标的类型', formula: '土地租金、物业租金或土地+物业租金分别汇总', functions: ['IF'], role: '区分土地租赁和物业租赁，避免将两类合同成本混在一起。' },
  'ownerRent.landPricingMode': { title: '土地计价方式', formula: '按面积：土地面积 × 单价 ÷ 10000；按总额：直接采用月租金总额', functions: ['IF'], role: '土地合同可按元/㎡/月或月度总额录入。' },
  'ownerRent.landArea': { title: '土地租赁面积', formula: '土地月租金 = 土地面积 × 土地单价 ÷ 10000', functions: ['SUM'], role: '仅在按面积计价时启用。' },
  'ownerRent.landUnitRent': { title: '土地租赁单价', formula: '土地月租金 = 土地面积 × 土地单价 ÷ 10000', functions: ['SUM'], role: '单位为元/㎡/月，系统自动换算为万元/月。' },
  'ownerRent.landMonthlyRent': { title: '土地月租金', formula: '首年土地租金 = 土地月租金 × 土地支付月数', functions: ['SUM'], role: '支付给土地权利人的租赁成本，直接影响NOI和现金流。' },
  'ownerRent.landPaymentMonths': { title: '土地租金支付月数', formula: '首年土地租金 = 土地月租金 × 支付月数', functions: ['SUM'], role: '按土地租赁合同填写，免租期可按实际支付月份调整。' },
  'ownerRent.propertyPricingMode': { title: '物业计价方式', formula: '按面积：物业面积 × 单价 ÷ 10000；按总额：直接采用月租金总额', functions: ['IF'], role: '物业合同可按元/㎡/月或月度总额录入。' },
  'ownerRent.propertyArea': { title: '物业租赁面积', formula: '物业月租金 = 物业面积 × 物业单价 ÷ 10000', functions: ['SUM'], role: '仅在按面积计价时启用。' },
  'ownerRent.propertyUnitRent': { title: '物业租赁单价', formula: '物业月租金 = 物业面积 × 物业单价 ÷ 10000', functions: ['SUM'], role: '单位为元/㎡/月，系统自动换算为万元/月。' },
  'ownerRent.propertyMonthlyRent': { title: '物业月租金', formula: '首年物业租金 = 物业月租金 × 物业支付月数', functions: ['SUM'], role: '支付给物业业主的租赁成本，直接影响NOI和现金流。' },
  'ownerRent.propertyPaymentMonths': { title: '物业租金支付月数', formula: '首年物业租金 = 物业月租金 × 支付月数', functions: ['SUM'], role: '按物业租赁合同填写，免租期可按实际支付月份调整。' },
  'ownerRent.growthMode': { title: '业主租金递增方式', formula: '不复递增 / 复利递增 / 单利递增 / 每年固定金额递增 / 每N年阶梯递增', functions: ['IF', 'POWER'], role: '按业主租赁合同选择递增方式。' },
  'ownerRent.growthRate': { title: '业主租金递增率', formula: '复利 = 首年租金×(1+r)^(n-1)；阶梯 = 每N年上调一次', functions: ['POWER', 'IF'], role: '用于复利、单利和阶梯递增。' },
  'ownerRent.annualIncrease': { title: '业主租金每年增加额', formula: '第n年业主租金 = 首年租金 + 每年增加额×(n-1)', functions: ['SUM'], role: '用于固定金额递增方式，单位为万元/年。' },
  'ownerRent.stepYears': { title: '业主租金递增周期', formula: '阶梯递增 = 每N年按递增率上调一次', functions: ['INT', 'POWER'], role: '用于每N年阶梯递增方式。' },
  'organization.socialInsuranceRate': { title: '单位社保公积金比例', formula: '单位社保公积金 = Σ(税前月薪 × 12 × 单位社保公积金比例)', functions: ['SUM'], role: '单位承担的养老、医疗、失业、工伤、生育和住房公积金综合比例；默认值仅为测算参考。' },
  'organization.employeeSocialInsuranceRate': { title: '个人社保公积金比例', formula: '个人社保公积金 = Σ(税前月薪 × 12 × 个人社保公积金比例)', functions: ['SUM'], role: '从员工税前工资中代扣，用于计算实发工资；不额外增加企业人员成本。' },
  'organization.individualIncomeTaxThresholdMonthly': { title: '个税起征点', formula: '年度应纳税所得额 = 税前工资 - 个人社保公积金 - 起征点×12 - 专项附加扣除×12', functions: ['MAX'], role: '中国综合所得基本减除费用通常为5000元/月，最终以适用税法为准。' },
  'organization.specialAdditionalDeductionMonthly': { title: '专项附加扣除', formula: '年度专项附加扣除 = 月扣除额 × 12', functions: ['SUM'], role: '可填每个岗位平均的子女教育、住房贷款/租金、赡养老人等月扣除额。' },
  'organization.annualSalaryMonths': { title: '年度薪资月数', formula: '年度工资 = 平均月薪 × 年度薪资月数', functions: ['SUM'], role: '可填写12薪、13薪、14薪或15薪，影响年度工资和人员成本。' },
  'organization.recruitmentTrainingRate': { title: '招聘培训费', formula: '招聘培训费 = 年度工资成本 × 招聘培训费率', functions: ['SUM'], role: '用于招聘、培训、团队建设等人员相关支出。' },
  'officeBudget.officeRentAnnual': { title: '办公室租金', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '直接计入年度办公行政成本。' },
  'officeBudget.utilitiesAnnual': { title: '水电及通讯费', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '直接计入年度办公行政成本。' },
  'officeBudget.itSoftwareAnnual': { title: 'IT及软件服务', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '包括商管系统、财务系统、会员系统等年度服务费。' },
  'officeBudget.officeSuppliesAnnual': { title: '办公用品', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '直接计入年度办公行政成本。' },
  'officeBudget.travelEntertainmentAnnual': { title: '差旅及业务招待', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '直接计入年度办公行政成本。' },
  'officeBudget.otherAnnual': { title: '其他办公费用', formula: '办公行政成本 = 租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他', functions: ['SUM'], role: '直接计入年度办公行政成本。' },
  'leasingBudget.channelFeeAnnual': { title: '渠道及代理费', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '计入年度招商费用。' },
  'leasingBudget.eventsAnnual': { title: '招商活动', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '包括招商推介会、品牌对接会等。' },
  'leasingBudget.materialsAnnual': { title: '招商物料', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '包括招商手册、效果图、视频和印刷物料。' },
  'leasingBudget.travelAnnual': { title: '招商差旅', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '直接计入年度招商费用。' },
  'leasingBudget.platformAnnual': { title: '招商平台及系统', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '包括招商数据库、线上平台和渠道系统。' },
  'leasingBudget.otherAnnual': { title: '其他招商费用', formula: '年度招商费用 = 渠道代理费 + 活动 + 物料 + 差旅 + 平台 + 其他', functions: ['SUM'], role: '直接计入年度招商费用。' },
  'marketingBudget.annualItems.amount': { title: '年度营销金额', formula: '年度常规营销预算 = 营销推广 + 商业美陈 + 媒体宣传 + 会员营销\n自动权重 = 单项金额 ÷ 全部常规营销金额', functions: ['SUM'], role: '所有营销费用直接按金额录入，权重与占比由系统自动计算，不需要凑满100%。' },
  'marketingBudget.openingYearItems.amount': { title: '开业首年专项营销金额', formula: '开业首年营销预算 = 年度常规营销金额 + 导视导览 + 开业美陈', functions: ['SUM'], role: '导视导览和开业美陈只在运营第1年计入，后续年度不重复发生。' },
  'operations.annualCostOverrides.propertyOps': { title: '物业基础运营直接金额', formula: 'IF(直接金额>0, 直接金额×运营爬坡系数, 总建筑面积×参考单价×12÷10000×运营爬坡系数)', functions: ['IF'], role: '填写稳定年年度金额后，系统优先按金额核算，并自动计算其占运营成本的权重。' },
  'operations.annualCostOverrides.energy': { title: '公共能耗直接金额', formula: 'IF(直接金额>0, 直接金额×出租率, 总建筑面积×参考单价×12÷10000×出租率)', functions: ['IF'], role: '可录入年度能源预算，空白或0时继续使用面积单价参考。' },
  'operations.annualCostOverrides.baseMaintenance': { title: '日常维修直接金额', formula: 'IF(直接金额>0, 直接金额×运营爬坡系数, 资产原值×维修费率×运营爬坡系数)', functions: ['IF'], role: '优先使用年度维修预算金额；专项维保金额另计。' },
  'operations.annualCostOverrides.insurance': { title: '保险费用直接金额', formula: 'IF(直接金额>0, 直接金额, 可投保资产原值×保险费率)', functions: ['IF'], role: '已有保单或年度预算时直接填金额，系统自动进入运营成本和NOI。' },
  'operations.annualCostOverrides.otherOpex': { title: '其他运营费用直接金额', formula: 'IF(直接金额>0, 直接金额, 不含税营业收入×其他运营费用率)', functions: ['IF'], role: '用于录入上述分类之外的年度费用预算，避免继续依赖比例估算。' },
  'maintenanceBudget.elevatorAnnual': { title: '电梯维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '按电梯维保合同计入年度维保成本。' },
  'maintenanceBudget.hvacAnnual': { title: '暖通空调维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '按暖通维保合同计入年度维保成本。' },
  'maintenanceBudget.fireAnnual': { title: '消防维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '包括消防设施检测、维保和年检。' },
  'maintenanceBudget.landscapeAnnual': { title: '景观绿化养护', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '包括室内外绿植、景观和水景养护。' },
  'maintenanceBudget.otherAnnual': { title: '其他专项维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '用于未单列的专项维保支出。' },
};

for (const service of PROPERTY_SERVICE_DEFINITIONS) {
  FIELD_FORMULAS[`propertyService.${service.key}.mode`] = {
    title: `${service.name}模式`,
    formula: '自营 = 岗位基础成本 + 自营招聘培训；第三方常驻 = 岗位基础成本 ×（1 + 综合管理费率）；非常驻 = 岗位基础成本 × 非驻场折算比例 ×（1 + 综合管理费率）',
    functions: ['IF', 'SUM'],
    role: '按岗位核算服务成本。第三方综合管理费率应覆盖管理费、利润、保险、服装装备、培训、税费等合同综合费用。'
  };
  FIELD_FORMULAS[`propertyService.${service.key}.nonResidentFactor`] = {
    title: `${service.name}非驻场折算比例`,
    formula: '非常驻岗位成本 = 岗位基础成本 × 非驻场折算比例',
    functions: ['SUM'],
    role: '仅第三方非常驻模式使用。按服务频次、现场覆盖时长和实际岗位配置折算，常驻模式按100%计算。'
  };
  FIELD_FORMULAS[`propertyService.${service.key}.managementFeeRate`] = {
    title: `${service.name}第三方综合管理费率`,
    formula: '第三方管理费 = 折算后岗位成本 × 第三方综合管理费率',
    functions: ['SUM'],
    role: '仅第三方常驻或非常驻模式使用。该费率应结合物业服务合同，覆盖管理费、利润、保险、培训、装备及税费。'
  };
}
FIELD_FORMULAS['leasingBudget.channelCalculationMode'] = { title: '渠道及代理费核算方式', formula: '按金额：渠道费=直接录入金额；按面积：渠道费=总建筑面积×渠道面积比例×首年月租金单价×月租金倍数÷10000', functions: ['IF','SUM'], role: '用于区分固定代理费和按招商面积及租金计算的渠道佣金。' };
FIELD_FORMULAS['leasingBudget.channelAreaRatio'] = { title: '渠道招商面积比例', formula: '渠道招商面积 = 项目总建筑面积 × 渠道招商面积比例', functions: ['SUM'], role: '例如项目总建筑面积2,000㎡、渠道比例50%，则渠道招商面积为1,000㎡。' };
FIELD_FORMULAS['leasingBudget.channelRentPerSqmMonth'] = { title: '渠道首年月租金单价', formula: '首年月租金总额 = 渠道招商面积 × 首年月租金单价 × 月租金倍数', functions: ['SUM'], role: '填0时系统自动采用项目当前平均月租金；也可填写合同约定的渠道租金单价。' };
FIELD_FORMULAS['leasingBudget.channelCommissionMonths'] = { title: '渠道月租金倍数', formula: '渠道佣金 = 渠道招商面积 × 首年月租金单价 × 月租金倍数 ÷ 10000', functions: ['SUM'], role: '1倍表示1个月租金，1.5倍表示1.5个月租金。' };
const FUNCTION_DEFINITIONS = {
  'IF': { syntax: 'IF(条件, 条件成立时的值, 条件不成立时的值)', meaning: '条件判断函数。系统先判断条件，再选择对应的计算结果。', example: 'IF(运营年=1, 首年出租率, 稳定期出租率)', note: '调整出租率、稳定年或计租方式时，首先会检查 IF 的条件和边界。' },
  'SUM': { syntax: 'SUM(数值1, 数值2, …) 或 Σ', meaning: '把多个分项金额或比率相加，形成合计。', example: '项目总投资 = SUM(土地, 工程, 装修, 预备费, 开办费, 流动资金)', note: '漏项会直接造成投资或收入低估；新增费用时应检查是否已纳入对应 SUM。' },
  'MAX': { syntax: 'MAX(数值1, 数值2, …)', meaning: '取多个数值中的最大值，常用于保底与扣点取高、零值下限。', example: '月收益 = MAX(保底月租金, 联营扣点月收入)', note: '如果希望保底条款优先，确保保底收入被正确录入；取高模式不会同时重复计算两项收入。' },
  'MIN': { syntax: 'MIN(数值1, 数值2, …)', meaning: '取多个数值中的最小值，常用于进项税抵扣上限、条件溢价封顶。', example: '进项税 = MIN(销项税, 可抵扣进项税估算)', note: 'MIN 的上限值如果设得过低，会压低抵扣或溢价；应核对税法上限和项目招商政策。' },
  'POWER': { syntax: 'POWER(底数, 指数)', meaning: '乘幂函数，用于复利增长和折现计算。', example: '第n年租金 = 首年租金 × POWER(1+增长率, n)', note: '复利增长前低后高；如果项目租约采用固定递增额，应切换为单利或直接按租约录入。' },
  'INT': { syntax: 'INT(数值)', meaning: '向下取整，用于计算已经过去的完整递增周期。', example: 'INT((运营年-1)÷3)', note: '每N年阶梯递增时，未满一个完整周期不会提前上调。' },
  'ROUND': { syntax: 'ROUND(数值, 小数位数)', meaning: '按指定小数位四舍五入，通常用于金额、面积和比率展示。', example: 'ROUND(总投资, 2)', note: '显示取整不应改变底层计算；系统计算保留原始精度，表格展示时才取整。' },
  'NPV': { syntax: 'NPV = Σ[CFt ÷ POWER(1+r, t)]', meaning: '净现值，把每一年现金流按折现率折算到当前时点后相加。', example: 'NPV = CF1/(1+r)^1 + CF2/(1+r)^2 + …', note: '折现率越高，未来现金流越不值钱；NPV大于0表示达到或超过门槛收益。' },
  'IRR': { syntax: 'IRR：使 NPV(IRR)=0 的折现率', meaning: '内部收益率，是项目自身能够承受的折现率。系统通过二分法不断逼近解。', example: '若IRR=10%，且企业要求8%，说明项目超过门槛。', note: '现金流没有正负交替或全部同号时，IRR可能无解；此时优先看NPV。' },
  'MOD': { syntax: 'MOD(数值, 除数)', meaning: '返回除法余数，用于判断续租周期或周期性发生年份。', example: 'IF(MOD(运营年, 续租周期)=0, 计算续租佣金, 0)', note: '续租周期应结合租约结构设置，不能简单把首开佣金每年重复计算。' },
  'INDEX': { syntax: 'INDEX(列表, 位置)', meaning: '按位置取出列表中的值，常用于按楼层、年份或业态取参数。', example: 'INDEX(年度租金列表, 运营年)', note: '如果缺少对应年份或楼层数据，系统会使用0或默认值，需检查数据完整性。' },
  'LOOKUP': { syntax: 'LOOKUP(查找值, 查找区域, 返回区域)', meaning: '按条件查找并返回对应数据，用于回收期、楼层和业态参数匹配。', example: 'LOOKUP(运营年, 年度列表, 累计现金流)', note: '查找表必须覆盖完整年度；新增楼层或业态时应同步补充规则。' },
  'SEQUENCE': { syntax: 'SEQUENCE(MIN, MAX, STEP)', meaning: '按下限、上限和步长生成一列敏感性情景值。', example: '租金系数 = 90%、95%、100%、105%、110%', note: '步长过细会增加计算量；通常设置5个左右情景即可用于初筛。' },
  '二分法': { syntax: '不断取区间中点，直到 NPV(IRR)≈0', meaning: '一种数值求解方法，用于反推 IRR 或盈亏平衡点。', example: '在-99.99%到1000%之间反复二分，逼近使NPV为0的利率', note: '如果现金流结构异常，二分法可能找不到解；系统会显示“不适用”。' },
};

const FORMULA_GUIDES = {
  project: {
    how: '① 先确定项目面积、土地、建设期和计租方式等基础参数；② 代入公式计算总建筑面积、租金基数或土地成本；③ 再把结果传递到工程投资、税费和年度现金流。',
    adjust: '优先采用土地合同、规划条件和经批准的目标成本。每调整一项，观察总投资、NPV、IRR和回收期；不要同时大幅修改多个基础假设。'
  },
  costs: {
    how: '先按“总建筑面积 × 分项单价 ÷ 10000”计算各分项工程金额，再汇总直接工程费和预备费，最后加入土地、开办费和流动资金形成项目总投资。',
    adjust: '以造价咨询、工程量清单、已签合同或同类项目对标为依据。先调整建安和装修单价，再调整预备费和非必要公共投入，比较投资变化对NPV和IRR的影响。'
  },
  operations: {
    how: '先确定出租率和租金增长，再按面积、业态系数、铺位条件计算租金；管理费单价按独立的管理费递增规则逐年计算，再叠加停车和多经收入。运营成本按面积、单价、出租率和爬坡系数计算，最后得到NOI和年度现金流。',
    adjust: '出租率按招商计划，租金和管理费分别按合同递增条款设置。每年复利/单利适合逐年调整，每N年阶梯递增适合“每3年上调5%”之类的合同。每次只调整一个变量，并比较NPV敏感性结果。'
  },
  taxes: {
    how: '先按含税收入计算销项税，再用可抵扣成本和进项税率计算进项税，得到增值税净额及附加税；随后计算房产税、土地使用税、印花税和企业所得税。',
    adjust: '税率和计征方式必须按项目属地最新税政、税务顾问意见和实际合同口径填写。房产税从租/从价、进项抵扣比例、亏损结转年限是影响税后收益的主要变量。'
  },
  finance: {
    how: '贷款额 = 项目总投资 × 债务融资比例；利息按期初余额和当年提款计算；本金按等额本金或先息后本偿还。融资结果进入股权现金流和股权IRR。',
    adjust: '按银行或融资机构方案填写贷款比例、利率、期限和宽限期。提高债务比例可能提高股权IRR，但会增加利息和偿债压力，必须同时查看股权现金流最低点。'
  },
  valuation: {
    how: '折现率用于把未来年度现金流折现为NPV；期末退出价值按NOI资本化率法或营业收入倍数法计算，再扣除退出税费后进入最后一年现金流。',
    adjust: '折现率采用企业投资门槛或同类项目资本成本；资本化率按区域同类商业资产成交和估值判断；收入倍数应保守，并与NOI资本化率法交叉验证。'
  },
  depreciation: {
    how: '建筑、装修和设备分别按各自折旧年限计提折旧。折旧会降低税前利润和所得税，但不是当年实际现金支出。亏损可在设定年限内结转，抵减以后年度应纳税所得额。',
    adjust: '折旧年限按会计政策、税法规定和资产实际寿命设置；亏损结转年限按适用税法设置。调整后重点观察税后净利润、所得税和股权现金流，不要将折旧重复当作现金支出。'
  },
  sensitivity: {
    how: '系统按设定的下限、上限和步长生成租金和投资情景，逐个重新计算项目NPV，形成敏感性矩阵。',
    adjust: '上下限应覆盖悲观和乐观情景，通常从±10%开始；步长5%适合初筛。若某个变量跨越NPV由负转正的临界点，应进一步细化该变量。'
  },
  organization: {
    how: '先确定部门和岗位编制，再以税前应发月薪计算税前年度工资；个人和单位社保公积金按税前月薪作为月缴费基数×12个月计算；个税以年度工资减去个人社保公积金、起征点和专项附加扣除后的应纳税所得额，适用中国综合所得七级超额累进税率；最后得到员工实发工资和企业人员成本。年度薪资月数可填12、13、14或15薪。',
    adjust: '按定编定岗方案填写人数和税前应发月薪，按劳动合同及年终奖政策设置年度薪资月数。单位、个人社保公积金比例和缴费基数必须按项目属地最新政策、险种明细和员工情况调整；当前默认值不是任何城市法定统一标准。重点比较企业人员成本、员工实发工资及其对NOI和现金流的影响。'
  },
  propertyService: {
    how: '系统先按部门和岗位名称自动归集物业工程、保安、保洁岗位，以岗位企业人员成本作为基础。自营模式加入内部招聘培训费；第三方常驻模式按岗位基础成本加综合管理费；第三方非常驻模式先按非驻场折算比例降低岗位成本，再加综合管理费。',
    adjust: '自营适合直接控制服务品质和人员管理的项目；第三方常驻适合需要稳定现场团队的保安、保洁和设备服务；非常驻适合巡检、专项维修或低频服务。综合管理费率必须依据合同，覆盖管理费、利润、保险、培训、装备和税费，避免只比较裸工资造成外包成本低估。'
  },
  ownerRent: {
    how: '土地和物业租赁均可选择按面积单价或按月度总额计价。按面积时，月租金=面积×元/㎡/月÷10000；按总额时直接使用月租金。随后分别乘支付月数，并按合同选择不复递增、复利、单利、固定金额或每N年阶梯递增。',
    adjust: '分别核对土地和物业租赁合同的计价方式、面积、单价或月租金总额、支付月数、递增方式、递增率、免租期、解约责任和发票税率。按面积计价时，应确保面积口径与合同一致。'
  },
  office: {
    how: '每项办公费用可选择按年或按月录入。按年录入时月均=年度÷12；按月录入时年度=月度×12。系统按年化金额汇总办公行政成本，并计算每项权重。',
    adjust: '优先使用年度行政预算或已签合同。可在同一张表中混合使用年度和月度口径；切换录入周期只改变显示口径，重新输入金额才改变年化值。'
  },
  leasing: {
    how: '招商费用支持按年或按月录入。渠道及代理费可直接填金额，也可按“项目总建筑面积×渠道面积比例×首年月租金单价×月租金倍数”计算；其他招商项目按年化金额汇总，权重自动反算。',
    adjust: '渠道面积比例按项目总建筑面积设置；首年月租金单价填0时自动采用项目当前平均租金。首开招商佣金已在投资中单列，如本表为同一笔渠道合同，应避免重复计入。'
  },
  marketing: {
    how: '常规年度直接按金额录入营销推广、商业美陈、媒体宣传、会员营销四项，系统汇总年度营销总额；每项自动权重=单项金额÷四项合计。开业第1年再额外加入导视导览和开业美陈两项专项金额。',
    adjust: '按年度推广计划和合同预算直接填写金额，不需要手工设置权重。系统会用自动权重检查结构是否失衡，例如媒体或美陈占比过高；调整金额后，预算、占比、NOI和现金流会同步重算。'
  },
  maintenance: {
    how: '日常维修可优先填写年度金额；未填金额时再按资产原值×维修费率作为参考。电梯、暖通、消防、景观等专项维保均按年度金额录入，系统汇总后自动计算每项权重。',
    adjust: '有年度维保预算或合同时直接填金额；没有金额数据时才使用资产原值0.5%–2%的费率参考。新开业项目可提高首年维保预算，并通过自动权重检查专项维保结构。'
  },
  generic: {
    how: '系统读取该参数，代入上方公式，并按项目面积、出租率、税率和年度现金流逐年计算；最终汇总到投资、NOI、NPV、IRR或回收期。',
    adjust: '先采用可研、预算、合同或市场调研的基准值；每次只调整一个变量，比较NPV、IRR、回收期和现金流最低点，避免同时改变多个假设造成误判。'
  }
};

function formulaGuideFor(path, info) {
  if (path === 'project.revenueModel') return {
    how: '先判断项目采用纯租金、纯联营扣点还是保底与扣点取高；纯租金取保底收入，纯扣点取扣点收入，取高模式逐铺比较两者并选择较高值。',
    adjust: '先确定项目整体商业模式，再到“铺位数据”中按业态覆盖。百货/奥莱通常使用保底与扣点取高；社区商业通常纯租金。切换后重点比较租金收入、租户风险和NOI。'
  };
  if (path.startsWith('formulas.sensitivity')) return FORMULA_GUIDES.sensitivity;
  if (path.includes('DepreciationYears') || path.includes('taxLossCarryforwardYears')) return FORMULA_GUIDES.depreciation;
  if (path.includes('propertyFeeGrowthMode') || path.includes('commercialManagementGrowthMode') || path.includes('centralAcGrowthMode')) return FORMULA_GUIDES.operations;
  if (path.includes('rentGrowthMode')) return FORMULA_GUIDES.operations;
  if (path.includes('loanRepaymentMethod')) return FORMULA_GUIDES.finance;
  if (path.includes('exitValueMethod') || path.includes('exitRevenueMultiple')) return FORMULA_GUIDES.valuation;
  if (path.startsWith('organization.')) return FORMULA_GUIDES.organization;
  if (path.startsWith('propertyService.')) return FORMULA_GUIDES.propertyService;
  if (path.startsWith('ownerRent.')) return FORMULA_GUIDES.ownerRent;
  if (path.startsWith('officeBudget.')) return FORMULA_GUIDES.office;
  if (path.startsWith('leasingBudget.')) return FORMULA_GUIDES.leasing;
  if (path.startsWith('marketingBudget.')) return FORMULA_GUIDES.marketing;
  if (path.startsWith('maintenanceBudget.')) return FORMULA_GUIDES.maintenance;
  if (path.startsWith('costs.')) return FORMULA_GUIDES.costs;
  if (path.startsWith('taxes.')) return FORMULA_GUIDES.taxes;
  if (path.startsWith('finance.')) return FORMULA_GUIDES.finance;
  if (path.startsWith('valuation.')) return FORMULA_GUIDES.valuation;
  if (path.startsWith('operations.') || path.startsWith('revenues.')) return FORMULA_GUIDES.operations;
  if (path.startsWith('project.')) return FORMULA_GUIDES.project;
  return FORMULA_GUIDES.generic;
}


const TERM_DEFINITIONS = {
  '项目总投资': { category: '投资收益', definition: '项目从取得土地、建设、装修、设备到开业前招商和铺底流动资金的全部投入。', why: '它是判断项目需要多少钱、单位面积投资强度和融资规模的基础。', how: '先用它检查投资量级是否合理，再与NOI、IRR和NPV结合判断是否值得继续推进。' },
  'IRR': { category: '投资收益', definition: '内部收益率，是让项目全部现金流净现值等于0的折现率，可理解为项目自身的年化收益能力。', why: '用于与企业投资门槛或资金成本比较。', how: '通常IRR高于门槛收益率才通过初筛；如果现金流异常导致IRR无法计算，应优先看NPV。' },
  'NPV': { category: '投资收益', definition: '净现值，把未来每年的现金流按折现率折算成今天的价值后相加。', why: 'NPV大于0表示项目达到或超过门槛收益。', how: '重点观察NPV对租金、投资和出租率的敏感性，而不是只看单个静态利润。' },
  'NOI': { category: '投资收益', definition: '净营运收入，等于不含税营业收入减运营成本和税费，未扣折旧、利息和所得税。', why: '它反映商业物业本身持续经营产生现金的能力。', how: '先看稳定期NOI是否为正，再看NOI回报率和退出估值是否合理。' },
  'NOI回报率': { category: '投资收益', definition: '稳定期NOI除以项目总投资。', why: '用于快速比较不同项目或方案的运营收益水平。', how: '应与当地同类商业资产资本化率和企业投资门槛对照，而不是只看绝对金额。' },
  '静态回收期': { category: '投资收益', definition: '累计项目现金流由负转正所需的年数，不考虑资金时间价值。', why: '反映资金占用时间和回收速度。', how: '回收期越短风险通常越低；如果超过贷款期限或运营期，应重新检查投资和租金假设。' },
  '得铺率': { category: '建筑面积', definition: '可租赁面积除以建筑面积，反映公共空间、交通和设备房等不可租面积占比。', why: '得铺率越高，同样建筑面积可产生租金的空间越多。', how: '购物中心通常在50%–75%左右，具体应结合业态、动线和公共空间品质判断。' },
  '计租面积口径': { category: '招商租赁', definition: '计算租金时所采用的面积基础，可按建筑面积或实用面积（套内/租赁面积）确定。', why: '同一租金单价在不同面积口径下，对应的实际租金总额会明显不同。', how: '项目可设默认口径，楼层和铺位可按合同单独覆盖；比较竞品租金时必须确认双方采用同一面积口径。' },
  '公区分摊系数': { category: '建筑面积', definition: '用于由商铺建筑面积反推项目总建筑面积的公共部位及设备房分摊比例。', why: '公区系数会同时影响建安、装修、设备和规费投资。', how: '按规划设计或测绘口径填写，不要为了压低投资而任意降低。' },
  '商业POI': { category: '市场侦测', definition: '地图上具有商业经营属性的兴趣点，例如购物中心、餐饮、零售、酒店和商务办公。', why: '用于判断周边商业供给密度和业态丰富度。', how: 'POI数量只能做初筛，还要结合竞品质量、客流和实际经营情况判断。' },
  '直接竞品': { category: '市场侦测', definition: '与本项目在客群、业态或消费场景上直接争夺客户的购物中心、百货、超市和传统市场。', why: '直接决定项目招商和租金定价面临的市场竞争。', how: '应优先分析3公里内直接竞品的定位、品牌、空置率、租金和客流，而不只看数量。' },
  '商业锚点': { category: '市场侦测', definition: '能够带动目的性客流的商业设施，例如购物中心、百货、影院和酒店。', why: '锚点越强，区域商业吸引力和客流基础通常越好。', how: '既可能是竞争，也可能带来客流外溢，需要进一步判断业态互补关系。' },
  '商业密度': { category: '市场侦测', definition: '单位面积范围内的商业POI数量。', why: '用于判断商业供给集中程度。', how: '密度高不代表一定好，要结合区域人口、消费能力、交通和竞品经营质量判断。' },
  '商业侦测评分': { category: '市场侦测', definition: '综合商业POI、直接竞品、商业锚点、交通、居住、公共配套和业态多样性形成的0–100分初筛评分。', why: '用于快速比较不同项目位置的商业环境。', how: '评分只用于初筛，不能替代实地踏勘、客流调查和授权商业数据。' },
  '商圈等级': { category: '市场侦测', definition: '根据侦测评分划分的A、B、C、D级商业环境判断。', why: '帮助快速判断项目属于成熟商圈、成长商圈还是培育商圈。', how: '成熟商圈竞争通常更强，培育商圈需要更多运营和招商投入，不能简单认为等级越高越好。' },
  '交通配套': { category: '市场侦测', definition: '项目周边的公交、轨道、停车和加油充电等交通设施。', why: '交通可达性直接影响目的性客流和停留时间。', how: '除POI数量外，还要实地核对地铁口步行距离、公交线路、停车位和高峰拥堵。' },
  '居住社区': { category: '市场侦测', definition: '公开地图识别到的住宅小区或居住片区。', why: '用于判断周边是否有稳定的社区消费基础。', how: '这只是数量代理指标，正式分析还需人口规模、家庭结构、收入和入住率数据。' },
  '保底与扣点取高': { category: '招商租赁', definition: '租户按保底租金和联营扣点分别计算，项目取两者中的较高金额。', why: '既保障业主最低租金，又能分享租户销售增长。', how: '需要明确保底、扣点率、销售口径、结算周期和取高条款，避免重复计算。' },
  '扣点率': { category: '招商租赁', definition: '联营扣点收入占租户销售额的比例。', why: '扣点率决定销售增长能在多大程度上转化为项目收入。', how: '先在联营基准面板选择购物中心、百货或奥莱行业常规，再结合本地品牌谈判、同类商场扣点和租户承受能力调整。系统给出的是行业区间与地区修正，不是品牌实测流水。' },
  '销售基数': { category: '招商租赁', definition: '用于测算联营扣点收入的单位面积月销售额参考值。', why: '销售基数越高，在相同扣点率下项目收入越高。', how: '系统按业态行业常规、项目城市能级及3–5公里商业侦测做初步修正；正式决策应再以同类项目、品牌方流水或授权市场数据校准。' },
  '出租率': { category: '招商租赁', definition: '已出租面积或已营业面积占可租赁面积的比例。', why: '出租率同时影响租金、物业费、停车和运营成本。', how: '首年、爬坡期和稳定期应分别设置，结合招商计划和同类项目开业爬坡情况。' },
  '免租期': { category: '招商租赁', definition: '租户在合同开始阶段无需支付租金的月数。', why: '免租期会减少首年现金流，但不一定降低合同租金单价。', how: '按装修期和招商谈判填写，并关注免租期后的现金流恢复。' },
  '招商佣金': { category: '招商租赁', definition: '支付给招商团队、渠道或代理机构的租赁成交佣金。', why: '属于招商成本，影响项目总投资和运营期现金流。', how: '区分首开佣金、续租佣金和渠道年度预算，避免重复计算。' },
  '业主租金': { category: '招商租赁', definition: '项目运营方向物业业主支付的租赁费用，常见于租赁经营、轻资产和存量商业项目。', why: '业主租金是运营期固定现金支出，会直接降低NOI；业主租金上涨可能显著压缩项目收益。', how: '按合同录入月租金、支付月数、递增方式和递增率，并核对免租期、支付节奏、发票税率和解约条款。' },
  '资本化率': { category: '估值退出', definition: '用稳定期NOI估算商业物业价值时使用的收益率指标。', why: '资本化率越高，相同NOI对应的物业估值越低。', how: '应参考同类商业资产成交、区位、租约质量和运营水平，谨慎选择。' },
  '折现率': { category: '估值退出', definition: '把未来现金流折算为当前价值时使用的收益率门槛。', why: '折现率越高，未来现金流现值越低，NPV越保守。', how: '通常参考企业投资门槛、资金成本和同类项目风险收益要求。' },
  '预备费': { category: '工程投资', definition: '为设计变更、工程量误差和不可预见工程风险预留的费用。', why: '方案深度越浅、建设风险越高，预备费越重要。', how: '通常按直接工程费的3%–8%设置，并随设计深化动态调整。' },
  '铺底流动资金': { category: '运营资金', definition: '项目开业初期为支付运营成本和周转需要准备的启动资金。', why: '即使项目长期可行，开业初期也可能因出租率和现金流爬坡需要额外资金。', how: '按稳定运营成本的一定比例估算，并结合招商爬坡速度检查是否充足。' },
  '增值税': { category: '税费', definition: '对商品和服务增值部分征收的流转税，项目测算中通常分别计算销项税和可抵扣进项税。', why: '影响不含税收入、运营成本和现金流。', how: '按项目实际纳税人身份、业务类型和属地税务口径设置，不建议直接套用单一税率。' },
  '房产税': { category: '税费', definition: '商业物业持有期间按房产原值或租金收入计征的税。', why: '是持有型商业项目的重要年度税费。', how: '需确认从租计征或从价计征及当地扣除比例，按税务认定填写。' },
  '企业所得税': { category: '税费', definition: '对项目税前利润征收的所得税。', why: '影响税后净利润和股权现金流。', how: '按适用企业所得税率和亏损结转政策测算，并结合融资利息和折旧影响。' },
  '租金收缴率': { category: '运营管理', definition: '实际收到租金占应收租金的比例。', why: '收缴率不足会形成坏账并影响现金流。', how: '根据商户质量、运营管理能力和历史收缴情况设置，不宜默认100%。' },
  '运营成本': { category: '运营管理', definition: '项目运营期间发生的物业、能耗、人员、办公、招商、营销、维保、保险和坏账等成本。', why: '运营成本直接决定NOI和资产估值。', how: '按年度预算和合同逐项填写，重点区分固定成本、随出租率变化的成本和一次性费用。' },
};

const TERM_ALIASES = { '项目IRR': 'IRR', '项目NPV': 'NPV', '稳定期NOI': 'NOI' };
function termLabel(name, text = name) {
  const termName = TERM_ALIASES[name] || name;
  const info = TERM_DEFINITIONS[termName];
  if (!info) return escapeHtml(text);
  return `<span class="term-label">${escapeHtml(text)}<button type="button" class="term-help" data-term="${escapeHtml(termName)}" title="点击查看“${escapeHtml(name)}”解释">?</button></span>`;
}

function openTermHelp(name) {
  const info = TERM_DEFINITIONS[name];
  if (!info) return;
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="term-help-backdrop">
      <div class="modal" style="width:min(640px,100%)">
        <div class="modal-head"><div><span class="term-category">${escapeHtml(info.category)}</span><h2>${escapeHtml(name)}</h2><p>名词解释与使用建议</p></div><button class="modal-close" id="term-help-close">×</button></div>
        <div class="modal-body term-help-body">
          <div class="formula-guide-block"><strong>通俗解释</strong><p>${escapeHtml(info.definition)}</p></div>
          <div class="formula-guide-block"><strong>为什么重要</strong><p>${escapeHtml(info.why)}</p></div>
          <div class="formula-guide-block adjust"><strong>测算时怎么用</strong><p>${escapeHtml(info.how)}</p></div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary" id="term-help-ok">知道了</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('term-help-close').addEventListener('click', close);
  document.getElementById('term-help-ok').addEventListener('click', close);
  document.getElementById('term-help-backdrop').addEventListener('click', event => { if (event.target.id === 'term-help-backdrop') close(); });
}

function openTermGlossary() {
  const groups = {};
  for (const [name, info] of Object.entries(TERM_DEFINITIONS)) (groups[info.category] ||= []).push([name, info]);
  const cards = Object.entries(groups).map(([category, items]) => `<section class="term-group"><h3>${escapeHtml(category)}</h3><div class="term-grid">${items.map(([name, info]) => `<button type="button" class="term-card" data-term="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(info.definition)}</span></button>`).join('')}</div></section>`).join('');
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="term-glossary-backdrop">
      <div class="modal" style="width:min(980px,100%)">
        <div class="modal-head"><div><h2>商业地产名词词典</h2><p>点击名词查看通俗解释、重要性和测算使用建议。</p></div><button class="modal-close" id="term-glossary-close">×</button></div>
        <div class="modal-body term-glossary-body">${cards}</div>
        <div class="modal-foot"><button class="btn btn-primary" id="term-glossary-ok">关闭</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('term-glossary-close').addEventListener('click', close);
  document.getElementById('term-glossary-ok').addEventListener('click', close);
  document.getElementById('term-glossary-backdrop').addEventListener('click', event => { if (event.target.id === 'term-glossary-backdrop') close(); });
}

const SETTLEMENT_PRESETS = {
  shopping: {
    label: '购物中心行业常规',
    shortLabel: '购物中心',
    version: '2026.11',
    source: '公开行业租售比、购物中心联营惯例及项目测算经验区间',
    categories: {
      '零售': { rent: 120, rentRange: [80, 180], salesPerSqmMonth: 1200, salesRange: [800, 1600], concessionRate: 0.18, concessionRange: [0.15, 0.25] },
      '餐饮': { rent: 110, rentRange: [70, 160], salesPerSqmMonth: 900, salesRange: [600, 1200], concessionRate: 0.12, concessionRange: [0.08, 0.15] },
      '娱乐': { rent: 70, rentRange: [35, 90], salesPerSqmMonth: 550, salesRange: [300, 800], concessionRate: 0.08, concessionRange: [0.05, 0.12] },
      '教培': { rent: 80, rentRange: [45, 110], salesPerSqmMonth: 750, salesRange: [500, 1100], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
      '服务': { rent: 90, rentRange: [50, 130], salesPerSqmMonth: 700, salesRange: [500, 1000], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
      '超市/主力店': { rent: 50, rentRange: [25, 70], salesPerSqmMonth: 450, salesRange: [250, 700], concessionRate: 0.05, concessionRange: [0.03, 0.08] },
      '其他': { rent: 80, rentRange: [45, 110], salesPerSqmMonth: 700, salesRange: [500, 1000], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
    },
  },
  department: {
    label: '百货商场行业常规',
    shortLabel: '百货商场',
    version: '2026.11',
    source: '公开百货联营扣点惯例、品牌承受力及项目测算经验区间',
    categories: {
      '零售': { rent: 100, rentRange: [60, 150], salesPerSqmMonth: 1500, salesRange: [1000, 2200], concessionRate: 0.20, concessionRange: [0.18, 0.25] },
      '餐饮': { rent: 80, rentRange: [50, 120], salesPerSqmMonth: 1000, salesRange: [650, 1300], concessionRate: 0.12, concessionRange: [0.09, 0.15] },
      '娱乐': { rent: 50, rentRange: [30, 75], salesPerSqmMonth: 650, salesRange: [350, 900], concessionRate: 0.09, concessionRange: [0.06, 0.12] },
      '教培': { rent: 60, rentRange: [35, 90], salesPerSqmMonth: 800, salesRange: [500, 1200], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
      '服务': { rent: 60, rentRange: [35, 90], salesPerSqmMonth: 750, salesRange: [500, 1100], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
      '超市/主力店': { rent: 35, rentRange: [20, 55], salesPerSqmMonth: 500, salesRange: [300, 800], concessionRate: 0.06, concessionRange: [0.04, 0.09] },
      '其他': { rent: 60, rentRange: [35, 90], salesPerSqmMonth: 750, salesRange: [500, 1100], concessionRate: 0.10, concessionRange: [0.08, 0.15] },
    },
  },
  outlet: {
    label: '奥特莱斯行业常规',
    shortLabel: '奥特莱斯',
    version: '2026.11',
    source: '公开奥莱联营扣点惯例、折扣零售租售比及项目测算经验区间',
    categories: {
      '零售': { rent: 60, rentRange: [35, 90], salesPerSqmMonth: 900, salesRange: [600, 1400], concessionRate: 0.12, concessionRange: [0.10, 0.16] },
      '餐饮': { rent: 55, rentRange: [30, 80], salesPerSqmMonth: 800, salesRange: [500, 1100], concessionRate: 0.10, concessionRange: [0.07, 0.13] },
      '娱乐': { rent: 35, rentRange: [20, 55], salesPerSqmMonth: 500, salesRange: [300, 750], concessionRate: 0.08, concessionRange: [0.05, 0.11] },
      '教培': { rent: 40, rentRange: [22, 60], salesPerSqmMonth: 600, salesRange: [350, 900], concessionRate: 0.08, concessionRange: [0.06, 0.12] },
      '服务': { rent: 40, rentRange: [22, 60], salesPerSqmMonth: 600, salesRange: [350, 900], concessionRate: 0.08, concessionRange: [0.06, 0.12] },
      '超市/主力店': { rent: 25, rentRange: [15, 40], salesPerSqmMonth: 450, salesRange: [250, 700], concessionRate: 0.06, concessionRange: [0.03, 0.08] },
      '其他': { rent: 40, rentRange: [22, 60], salesPerSqmMonth: 600, salesRange: [350, 900], concessionRate: 0.08, concessionRange: [0.06, 0.12] },
    },
  },
};

function settlementPresetKeyFor(model) {
  const type = String(model?.project?.projectType || '');
  if (/百货/.test(type)) return 'department';
  if (/奥莱/i.test(type)) return 'outlet';
  return model?.settlementBenchmark?.preset && SETTLEMENT_PRESETS[model.settlementBenchmark.preset] ? model.settlementBenchmark.preset : 'shopping';
}

function settlementLocationAdjustment(model) {
  const location = String(model?.project?.location || '');
  if (/南宁|广州|深圳|北京|上海|重庆|成都|杭州|武汉|南京|西安|苏州|天津|厦门|青岛|长沙|郑州|昆明|海口|三亚/.test(location)) {
    return { label: '省会/重点城市', factor: 1.00 };
  }
  if (/柳州|桂林|北海|梧州|玉林|贵港|钦州|防城港|百色|贺州|河池|来宾|崇左/.test(location)) {
    return { label: '广西地级市', factor: 0.93 };
  }
  if (/县|县域|镇/.test(location)) return { label: '县域市场', factor: 0.82 };
  return { label: '未识别城市能级', factor: 0.90 };
}

function settlementMarketAdjustment(model) {
  const detection = model?.market?.lastAnalysis || {};
  const grade = String(detection.marketGrade || '');
  let factor = /A/.test(grade) ? 1.05 : /B/.test(grade) ? 1.02 : /C/.test(grade) ? 0.98 : /D/.test(grade) ? 0.93 : 1.00;
  const competition = String(detection.competitionLevel || '');
  if (/高|激烈/.test(competition)) factor *= 0.96;
  else if (/低|较弱/.test(competition)) factor *= 1.03;
  return {
    label: grade ? `${grade || '待评估'} · 竞争${competition || '未评估'}` : '尚未商业侦测',
    factor: Math.min(1.12, Math.max(0.82, factor)),
  };
}

function settlementBenchmarkContext(model) {
  const presetKey = settlementPresetKeyFor(model);
  const preset = SETTLEMENT_PRESETS[presetKey];
  const location = settlementLocationAdjustment(model);
  const market = settlementMarketAdjustment(model);
  const combinedFactor = Math.min(1.20, Math.max(0.72, location.factor * market.factor));
  return { presetKey, preset, location, market, combinedFactor };
}

function benchmarkForCategory(model, categoryName) {
  const context = settlementBenchmarkContext(model);
  const rule = context.preset.categories[categoryName] || context.preset.categories['其他'];
  const sales = Math.round(Number(rule.salesPerSqmMonth || 0) * context.combinedFactor);
  const salesMin = Math.round(Number(rule.salesRange?.[0] || rule.salesPerSqmMonth || 0) * context.combinedFactor);
  const salesMax = Math.round(Number(rule.salesRange?.[1] || rule.salesPerSqmMonth || 0) * context.combinedFactor);
  return { ...rule, salesPerSqmMonth: sales, salesRange: [salesMin, salesMax], context };
}

function applySettlementBenchmark(model, presetKey, options = {}) {
  const safePresetKey = SETTLEMENT_PRESETS[presetKey] ? presetKey : settlementPresetKeyFor(model);
  model.settlementBenchmark = {
    ...(model.settlementBenchmark || {}),
    preset: safePresetKey,
    version: SETTLEMENT_PRESETS[safePresetKey].version,
    appliedAt: new Date().toISOString(),
  };
  model.categories ||= [];
  let changed = 0;
  for (const category of model.categories) {
    const rule = benchmarkForCategory({ ...model, settlementBenchmark: model.settlementBenchmark }, category.name);
    const fillSales = options.overwrite || !(Number(category.salesPerSqmMonth) > 0);
    const fillRate = options.overwrite || !(Number(category.concessionRate) > 0);
    const fillRent = options.overwriteRent || !(Number(category.rent) > 0);
    if (fillSales) category.salesPerSqmMonth = rule.salesPerSqmMonth;
    if (fillRate) category.concessionRate = rule.concessionRate;
    if (fillRent) category.rent = rule.rent;
    category.benchmarkPreset = safePresetKey;
    category.benchmarkVersion = rule.context.preset.version;
    category.benchmarkSource = rule.context.preset.source;
    category.benchmarkSalesMin = rule.salesRange[0];
    category.benchmarkSalesMax = rule.salesRange[1];
    category.benchmarkConcessionMin = rule.concessionRange[0];
    category.benchmarkConcessionMax = rule.concessionRange[1];
    category.benchmarkRentMin = rule.rentRange[0];
    category.benchmarkRentMax = rule.rentRange[1];
    category.benchmarkLocationFactor = rule.context.location.factor;
    category.benchmarkMarketFactor = rule.context.market.factor;
    category.benchmarkSalesFactor = rule.context.combinedFactor;
    if (fillSales || fillRate || fillRent) changed += 1;
  }
  model.settlementBenchmark.locationLabel = settlementLocationAdjustment(model).label;
  model.settlementBenchmark.locationFactor = settlementLocationAdjustment(model).factor;
  model.settlementBenchmark.marketLabel = settlementMarketAdjustment(model).label;
  model.settlementBenchmark.marketFactor = settlementMarketAdjustment(model).factor;
  model.settlementBenchmark.salesFactor = settlementBenchmarkContext(model).combinedFactor;
  model.settlementBenchmark.source = SETTLEMENT_PRESETS[safePresetKey].source;
  return changed;
}

function ensureSettlementBenchmarks(model) {
  const categories = Array.isArray(model?.categories) ? model.categories : [];
  if (!categories.length) return false;
  const allBlank = categories.every(category => !(Number(category.salesPerSqmMonth) > 0) && !(Number(category.concessionRate) > 0));
  if (!allBlank) return false;
  return applySettlementBenchmark(model, settlementPresetKeyFor(model), { overwrite: false }) > 0;
}

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
  users: '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 5.5a3 3 0 0 1 0 5.8M16.5 14.2c2.4.3 3.7 2.2 4 5.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  compare: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h7v12H4zM13 6h7v12h-7zM7.5 3v18M16.5 3v18" stroke="currentColor" stroke-width="1.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="11" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V4H5v12h3" stroke="currentColor" stroke-width="1.6"/></svg>',
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
  shopPageSize: 100,
  importWarnings: [],
  rentImportStats: null,
  importHints: null,
  budgetWarnings: [],
  sidebarOpen: false,
  adminUsers: [],
  adminProjects: [],
  adminLogs: [],
  adminStatus: 'all',
  adminSearch: '',
  adminLoaded: false,
  fontScale: localStorage.getItem('duoduo_font_scale_v1') || '1',
};

let locationGeocodeTimer = null;
let activeMapPicker = null;
let previewTimer = null;

function safeParse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

const RENT_BASIS_LABELS = {
  inherit: '继承项目',
  leasable: '实用面积',
  building: '建筑面积',
};

function resolvedRentAreaBasis(record, model = state.current?.model) {
  const selected = record?.rentAreaBasis || 'inherit';
  if (selected === 'building' || selected === 'leasable') return selected;
  return model?.project?.rentAreaBasis === 'building' ? 'building' : 'leasable';
}

function rentAreaFor(record, model = state.current?.model) {
  return Number(resolvedRentAreaBasis(record, model) === 'building' ? record?.buildingArea || 0 : record?.leasableArea || 0);
}

function buildingFloorKey(record) {
  const building = String(record?.building || '1号楼').trim() || '1号楼';
  const floor = String(record?.floor ?? record?.name ?? '未分楼层').trim() || '未分楼层';
  return `${building}||${floor}`;
}

function normalizeBuildingInput(value) {
  let text = String(value || '').trim();
  if (!text) return '1号楼';
  const cn = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if (/^\d+$/.test(text)) return `${Number(text)}号楼`;
  if (cn[text]) return `${cn[text]}号楼`;
  text = text.replace(/^([一二三四五六七八九十])(号楼|栋|座)$/, (_, num, suffix) => `${cn[num] || num}号楼`);
  return text.replace(/^([A-Za-z0-9]+)(栋|座)$/, '$1号楼');
}

function normalizeFloorInput(value) {
  let text = String(value || '').trim().replace(/\s+/g, '').replace(/Ｆ/gi, 'F').toUpperCase();
  if (!text) return '';
  const cn = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if (/^B\d+$/.test(text)) return text;
  let match = text.match(/^(?:负|地下|-)([0-9一二三四五六七八九十]+)(?:层|楼)?$/);
  if (match) return `B${match[1].replace(/[一二三四五六七八九十]/g, c => cn[c] || c)}`;
  match = text.match(/^([0-9一二三四五六七八九十]+)(?:层|楼|F)$/);
  if (match) return `${match[1].replace(/[一二三四五六七八九十]/g, c => cn[c] || c)}F`;
  if (/^首层$/.test(text)) return '1F';
  match = text.match(/^(?:F|L)(\d+)$/);
  if (match) return `${Number(match[1])}F`;
  return text.replace(/^(\d+)$/, '$1F');
}

function shopRecordKey(shop) {
  return `${String(shop?.building || '1号楼').trim()}||${String(shop?.id || '').trim()}`;
}

function roundAreaValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function applyFontScale(value, notify = false) {
  const scale = ['1', '1.1', '1.2'].includes(String(value)) ? String(value) : '1';
  state.fontScale = scale;
  document.documentElement.style.setProperty('--font-scale', scale);
  localStorage.setItem('duoduo_font_scale_v1', scale);
  document.querySelectorAll('[data-font-scale]').forEach(button => button.classList.toggle('active', button.dataset.fontScale === scale));
  if (state.result) requestAnimationFrame(renderResultCharts);
  if (notify) toast(`界面字号已调整为${scale === '1' ? '标准' : scale === '1.1' ? '大' : '特大'}`, 'success');
}

const DEVELOPMENT_TYPE_OPTIONS = [
  { value: 'new_build', label: '新建项目' },
  { value: 'renovation', label: '旧改 / 存量改造项目' },
  { value: 'operating', label: '运营中项目' },
  { value: 'light_asset', label: '轻资产运营项目' },
];

const DEVELOPMENT_TYPE_LABELS = Object.fromEntries(DEVELOPMENT_TYPE_OPTIONS.map(item => [item.value, item.label]));

const PROPERTY_RIGHTS_OPTIONS = [
  { value: 'owned', label: '自有产权' },
  { value: 'leased', label: '租赁物业' },
  { value: 'equity', label: '股权持有' },
  { value: 'government', label: '政府划拨 / 合作持有' },
  { value: 'other', label: '其他产权安排' },
];

const ACQUISITION_METHOD_OPTIONS = [
  { value: 'market_auction', label: '招拍挂 / 市场竞得' },
  { value: 'negotiated_transfer', label: '协议转让' },
  { value: 'equity_acquisition', label: '股权收购' },
  { value: 'government_allocation', label: '政府划拨 / 定向供应' },
  { value: 'lease', label: '租赁取得' },
  { value: 'other', label: '其他方式' },
];

const BUILDING_STATUS_OPTIONS = [
  { value: 'under_construction', label: '在建 / 待建' },
  { value: 'completed_unopened', label: '已竣工未开业' },
  { value: 'operating', label: '已开业运营中' },
  { value: 'renovation_pending', label: '待改造 / 停业改造' },
];

const COST_REFERENCE_PROFILES = {
  new_build: {
    label: '新建项目',
    note: '按新建商业物业的土建、机电、消防、公区精装和设施设备完整投入估算。',
    rates: { preconstructionRate: 250, constructionRate: 3800, fitoutRate: 1300, equipmentRate: 650, otherEngineeringRate: 150 },
  },
  renovation: {
    label: '旧改 / 存量改造',
    note: '按结构加固、机电更新、消防改造、立面及公区重做估算；开工前需完成结构鉴定和机电评估。',
    rates: { preconstructionRate: 120, constructionRate: 1800, fitoutRate: 1900, equipmentRate: 750, otherEngineeringRate: 120 },
  },
  operating: {
    label: '运营中项目',
    note: '按局部改造、设备更新和品牌升级估算；如为收购项目，应另行录入收购对价和承接负债。',
    rates: { preconstructionRate: 40, constructionRate: 250, fitoutRate: 600, equipmentRate: 250, otherEngineeringRate: 50 },
  },
  light_asset: {
    label: '轻资产运营项目',
    note: '原则上不发生土建投资，仅预留必要的品牌形象、局部改造和设备补充费用。',
    rates: { preconstructionRate: 20, constructionRate: 0, fitoutRate: 300, equipmentRate: 120, otherEngineeringRate: 20 },
  },
};

const FORMAT_COST_FACTORS = {
  '购物中心': 1.05,
  '百货商场': 0.95,
  '奥特莱斯': 0.92,
  '街区商业': 0.90,
  '社区商业': 0.82,
  '商业综合体': 1.10,
  '其他': 1.00,
};

const CITY_COST_FACTORS = [
  { pattern: /深圳|上海|北京/, factor: 1.28, label: '一线城市' },
  { pattern: /广州|杭州|南京|苏州|成都|武汉|重庆|西安|天津/, factor: 1.15, label: '重点二线城市' },
  { pattern: /长沙|郑州|合肥|福州|厦门|青岛|济南|昆明|贵阳|海口/, factor: 1.08, label: '省会及计划单列市' },
  { pattern: /南宁/, factor: 1.08, label: '南宁' },
  { pattern: /柳州/, factor: 1.00, label: '柳州' },
  { pattern: /桂林/, factor: 0.98, label: '桂林' },
  { pattern: /北海|钦州|防城港/, factor: 0.96, label: '北部湾城市' },
  { pattern: /玉林|贵港|梧州|百色|贺州|河池|来宾|崇左/, factor: 0.93, label: '广西地级市' },
];

function roundCostRate(value) {
  const number = Number(value) || 0;
  return number === 0 ? 0 : Math.round(number / 10) * 10;
}

function cityCostProfile(location) {
  const text = String(location || '').trim();
  const matched = CITY_COST_FACTORS.find(item => item.pattern.test(text));
  if (matched) return matched;
  if (/广西/.test(text)) return { factor: 0.92, label: '广西其他地区' };
  const cityMatch = text.match(/([^\s省市自治区]{2,10}市)/);
  return { factor: 0.95, label: cityMatch ? cityMatch[1] : '项目所在地' };
}

function getCostReference(model = state.current?.model) {
  const project = model?.project || {};
  const developmentType = COST_REFERENCE_PROFILES[project.developmentType] ? project.developmentType : 'new_build';
  const profile = COST_REFERENCE_PROFILES[developmentType];
  const city = cityCostProfile(project.location);
  const formatLabel = project.projectType || '其他';
  const formatFactor = FORMAT_COST_FACTORS[formatLabel] ?? 1;
  const factor = city.factor * formatFactor;
  const rates = Object.fromEntries(Object.entries(profile.rates).map(([key, value]) => [key, roundCostRate(value * factor)]));
  const range = value => {
    const rate = Number(value) || 0;
    return { low: roundCostRate(rate * 0.85), high: roundCostRate(rate * 1.15) };
  };
  return {
    developmentType,
    developmentLabel: profile.label,
    profileNote: profile.note,
    cityLabel: city.label,
    cityFactor: city.factor,
    formatLabel,
    formatFactor,
    factor,
    rates,
    ranges: {
      constructionRate: range(rates.constructionRate),
      fitoutRate: range(rates.fitoutRate),
      equipmentRate: range(rates.equipmentRate),
    },
  };
}

function applyCostReference(model, overrides = {}, rerender = false) {
  if (!model) return null;
  if (overrides.developmentType) model.project.developmentType = overrides.developmentType;
  if (overrides.projectType) model.project.projectType = overrides.projectType;
  if (overrides.location !== undefined) model.project.location = overrides.location;
  const reference = getCostReference(model);
  model.costs = model.costs || {};
  Object.assign(model.costs, reference.rates);
  state.dirty = true;
  state.preview = null;
  updateSaveState();
  if (rerender) renderWorkspace();
  return reference;
}

const OPEX_STANDARD_OPTIONS = [
  { value: 'basic', label: '基础运营标准', factor: 0.86 },
  { value: 'standard', label: '标准运营标准', factor: 1.0 },
  { value: 'premium', label: '品质运营标准', factor: 1.18 },
];

const OPEX_MANAGEMENT_OPTIONS = [
  { value: 'self', label: '自管团队', property: 0.94, staff: 1.10, leasing: 1.0 },
  { value: 'mixed', label: '自管 + 外包混合', property: 1.0, staff: 1.0, leasing: 1.0 },
  { value: 'outsourced', label: '委托专业团队', property: 1.16, staff: 0.82, leasing: 1.06 },
];

const OPEX_CATEGORY_OPTIONS = [
  { value: 'property', label: '物业基础运营' },
  { value: 'energy', label: '公共能耗' },
  { value: 'staff', label: '组织架构及人员成本' },
  { value: 'office', label: '办公及行政费用' },
  { value: 'leasing', label: '招商费用' },
  { value: 'marketing', label: '营销推广' },
  { value: 'maintenance', label: '日常及专项维保' },
  { value: 'insurance', label: '保险及风险准备' },
  { value: 'other', label: '其他运营费用' },
];

function operatingCostReference(model = state.current?.model, overrides = {}) {
  const project = model?.project || {};
  const preset = model?.operations?.opexPreset || {};
  const standard = OPEX_STANDARD_OPTIONS.find(item => item.value === (overrides.standard || preset.standard)) || OPEX_STANDARD_OPTIONS[1];
  const management = OPEX_MANAGEMENT_OPTIONS.find(item => item.value === (overrides.managementMode || preset.managementMode)) || OPEX_MANAGEMENT_OPTIONS[1];
  const city = cityCostProfile(project.location);
  const formatFactor = FORMAT_COST_FACTORS[project.projectType || '其他'] || 1;
  const floors = model?.floors || [];
  const shops = model?.shops || [];
  const gba = Number(project.gbaOverride || 0) || floors.reduce((sum, floor) => sum + Number(floor.buildingArea || 0), 0) || shops.reduce((sum, shop) => sum + Number(shop.buildingArea || 0), 0) * (1 + Number(project.commonAreaFactor || 0));
  const gla = floors.reduce((sum, floor) => sum + Number(floor.leasableArea || 0), 0) || shops.reduce((sum, shop) => sum + Number(shop.leasableArea || 0), 0);
  const departments = model?.organization?.departments || [];
  const headcount = departments.reduce((sum, dept) => sum + (Array.isArray(dept.positions) ? dept.positions : []).reduce((n, position) => n + Number(position.headcount || 0), 0), 0) || 7;
  const cityFactor = Math.max(0.85, Math.min(1.35, city.factor));
  const format = Math.max(0.82, Math.min(1.15, formatFactor));
  const standardFactor = standard.factor;
  const salaryBase = {
    '总经办': 19000, '招商部': 11000, '运营部': 9500, '市场推广部': 10500,
    '财务行政部': 8500, '物业工程部': 8000, '保安部': 5200, '保洁部': 4000,
  };
  const values = {
    propertyOpsCost: Number((9.0 * Math.pow(cityFactor, 0.45) * format * standardFactor * management.property).toFixed(1)),
    energyCost: Number((4.0 * Math.pow(cityFactor, 0.35) * format * standardFactor).toFixed(1)),
    staffCostPerSqm: Number((11.0 * Math.pow(cityFactor, 0.55) * format * standardFactor * management.staff).toFixed(1)),
    adminCostPerSqm: Number((2.0 * Math.pow(cityFactor, 0.35) * format * standardFactor).toFixed(1)),
    marketingRate: Number((0.02 * format * standardFactor).toFixed(4)),
    repairRate: Number((0.01 * Math.pow(cityFactor, 0.2) * standardFactor).toFixed(4)),
    insuranceRate: 0.0015,
    otherOpexRate: Number((0.005 * format * standardFactor).toFixed(4)),
    officeBudget: {
      officeRentAnnual: Number((Math.max(18, headcount * 0.33 * 12) * cityFactor * standardFactor).toFixed(1)),
      utilitiesAnnual: Number((9 * cityFactor * standardFactor).toFixed(1)),
      itSoftwareAnnual: Number((18 + headcount * 1.6).toFixed(1)),
      officeSuppliesAnnual: Number((5 * cityFactor * standardFactor).toFixed(1)),
      travelEntertainmentAnnual: Number((9 * cityFactor * standardFactor).toFixed(1)),
      otherAnnual: Number((8 * cityFactor * standardFactor).toFixed(1)),
    },
    leasingBudget: {
      channelFeeAnnual: Number((Math.max(20, gla * 0.008) * cityFactor * format * standardFactor * management.leasing).toFixed(1)),
      eventsAnnual: Number((45 * cityFactor * format * standardFactor * management.leasing).toFixed(1)),
      materialsAnnual: Number((10 * cityFactor * standardFactor).toFixed(1)),
      travelAnnual: Number((8 * cityFactor * standardFactor).toFixed(1)),
      platformAnnual: Number((7 * cityFactor * standardFactor).toFixed(1)),
      otherAnnual: Number((4 * cityFactor * standardFactor).toFixed(1)),
    },
    maintenanceBudget: {
      elevatorAnnual: Number((20 * cityFactor * standardFactor).toFixed(1)),
      hvacAnnual: Number((24 * cityFactor * standardFactor).toFixed(1)),
      fireAnnual: Number((8 * cityFactor * standardFactor).toFixed(1)),
      landscapeAnnual: Number((9 * cityFactor * standardFactor).toFixed(1)),
      otherAnnual: Number((11 * cityFactor * standardFactor).toFixed(1)),
    },
    salaries: departments.flatMap(dept => (Array.isArray(dept.positions) ? dept.positions : []).map(position => ({
      department: dept.name,
      name: position.name,
      avgMonthlySalary: Math.round(Number(position.avgMonthlySalary || salaryBase[dept.name] || 8000) * Math.pow(cityFactor, 0.75) * standardFactor * management.staff / 100) * 100,
    }))),
  };
  return { standard, management, city, formatFactor, gba, gla, headcount, values };
}

function applyOperatingCostReference(model = state.current?.model, options = {}) {
  if (!model) return null;
  model.operations ||= {};
  const preset = model.operations.opexPreset || (model.operations.opexPreset = {});
  const standard = options.standard || preset.standard || 'standard';
  const managementMode = options.managementMode || preset.managementMode || 'mixed';
  const categories = options.categories || preset.categories || Object.fromEntries(OPEX_CATEGORY_OPTIONS.map(item => [item.value, true]));
  const reference = operatingCostReference(model, { standard, managementMode });
  const selected = value => categories[value] !== false;
  model.operations.annualCostOverrides ||= {};
  const annualProperty = reference.gba * reference.values.propertyOpsCost * 12 / 10000;
  const annualEnergy = reference.gba * reference.values.energyCost * 12 / 10000 * Number(model.operations.stableOccupancy || 0.95);
  const assetBase = reference.gba * (
    Number(model.costs?.constructionRate || 0) + Number(model.costs?.fitoutRate || 0) +
    Number(model.costs?.equipmentRate || 0) + Number(model.costs?.otherEngineeringRate || 0)
  ) / 10000;
  const annualRevenue = Number(state.preview?.summary?.stableRevenue || 0);
  if (selected('property')) {
    model.operations.propertyOpsCost = reference.values.propertyOpsCost;
    model.operations.annualCostOverrides.propertyOps = Number(annualProperty.toFixed(1));
  }
  if (selected('energy')) {
    model.operations.energyCost = reference.values.energyCost;
    model.operations.annualCostOverrides.energy = Number(annualEnergy.toFixed(1));
  }
  if (selected('staff')) {
    model.operations.staffCostMode = 'organization';
    model.operations.staffCostPerSqm = reference.values.staffCostPerSqm;
    const salaries = new Map(reference.values.salaries.map(item => [`${item.department}||${item.name}`, item.avgMonthlySalary]));
    (model.organization?.departments || []).forEach(dept => {
      (dept.positions || []).forEach(position => {
        const key = `${dept.name}||${position.name}`;
        if (salaries.has(key)) position.avgMonthlySalary = salaries.get(key);
      });
    });
  }
  if (selected('office')) {
    model.operations.adminCostPerSqm = reference.values.adminCostPerSqm;
    model.officeBudget = { ...(model.officeBudget || {}), ...reference.values.officeBudget };
  }
  if (selected('leasing')) model.leasingBudget = { ...(model.leasingBudget || {}), ...reference.values.leasingBudget };
  if (selected('marketing')) {
    model.operations.marketingRate = reference.values.marketingRate;
    model.marketingBudget ||= {};
    model.marketingBudget.amountMode = true;
    const annualItems = model.marketingBudget.annualItems || [];
    const annualRevenue = Number(state.preview?.summary?.stableRevenue || 0);
    const referenceTotal = annualRevenue * reference.values.marketingRate;
    if (referenceTotal > 0 && annualItems.length) {
      const shares = [0.40, 0.25, 0.20, 0.15];
      annualItems.forEach((item, index) => {
        item.amount = Number((referenceTotal * (shares[index] ?? 1 / annualItems.length)).toFixed(1));
      });
      const openingItems = model.marketingBudget.openingYearItems || [];
      openingItems.forEach((item, index) => {
        item.amount = Number((referenceTotal * (index === 0 ? 0.10 : 0.20)).toFixed(1));
      });
    }
  }
  if (selected('maintenance')) {
    model.operations.repairRate = reference.values.repairRate;
    model.maintenanceBudget = { ...(model.maintenanceBudget || {}), ...reference.values.maintenanceBudget };
    model.operations.annualCostOverrides.baseMaintenance = Number((assetBase * reference.values.repairRate).toFixed(1));
  }
  if (selected('insurance')) {
    model.operations.insuranceRate = reference.values.insuranceRate;
    model.operations.annualCostOverrides.insurance = Number((assetBase * reference.values.insuranceRate).toFixed(1));
  }
  if (selected('other')) {
    model.operations.otherOpexRate = reference.values.otherOpexRate;
    if (annualRevenue > 0) model.operations.annualCostOverrides.otherOpex = Number((annualRevenue * reference.values.otherOpexRate).toFixed(1));
  }
  model.operations.opexPreset = { standard, managementMode, categories, appliedAt: new Date().toISOString(), locationLabel: reference.city.label };
  state.dirty = true;
  state.preview = null;
  updateSaveState();
  return reference;
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
  const precision = Math.min(2, Math.max(0, Number(digits) || 0));
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: precision });
}

function fmtArea(value) {
  return fmt(value, 2);
}

function fmtPct(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const precision = Math.min(2, Math.max(0, Number(digits) || 0));
  return `${Number((Number(value) * 100).toFixed(precision)).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: precision })}%`;
}

function roundDisplayValue(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const factor = 10 ** Math.min(2, Math.max(0, Number(digits) || 0));
  return String(Math.round((number + Number.EPSILON) * factor) / factor);
}

function normalizeNumericInputDisplays() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    if (!input.value || input === document.activeElement) return;
    input.value = roundDisplayValue(input.value, 2);
  });
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
  if (response.status === 401 && !path.endsWith('/api/login') && !path.endsWith('/api/register')) {
    clearSession();
    renderAuth('login');
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

function clearSession() {
  state.token = '';
  state.user = null;
  state.projects = [];
  state.current = null;
  state.result = null;
  state.preview = null;
  state.marketAnalysis = null;
  state.marketError = null;
  state.adminUsers = [];
  state.adminProjects = [];
  state.adminLogs = [];
  state.adminLoaded = false;
  localStorage.removeItem('cr_token');
  localStorage.removeItem('cr_user');
}

async function logout(render = true) {
  const token = state.token;
  if (token) {
    // Clear the local UI immediately; the Supabase session is revoked in the background.
    fetch('/api/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  clearSession();
  if (render) renderAuth('login');
}

async function boot() {
  if (!state.token) return renderAuth('login');
  renderWorkspaceLoading('正在恢复登录状态并同步项目数据…');
  try {
    const me = await api('/api/me');
    state.user = { ...me, username: me.username, displayName: me.displayName };
    localStorage.setItem('cr_user', JSON.stringify(state.user));
    await loadProjects();
    renderProjectList();
  } catch {
    logout();
  }
}

async function loadProjects() {
  const payload = await api('/api/projects');
  state.projects = payload.projects || [];
  state.adminLoaded = false;
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
          <p>导入铺位面积与业态，系统自动完成投资、租金、税费、可调年期现金流、IRR与NPV分析，并生成可汇报的表格和PPT。</p>
        </div>
        <div class="auth-points">
          <div class="auth-point"><strong>7步</strong><span>完成项目财务测算</span></div>
          <div class="auth-point"><strong>可调</strong><span>招商运营与现金流年限</span></div>
          <div class="auth-point"><strong>1键</strong><span>导出Excel与PPT</span></div>
        </div>
        <div class="auth-foot">本工具用于投资初筛与方案比较，不替代可研、审计、评估或税务鉴证。</div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>${isLogin ? '登录工作台' : '申请正式账号'}</h2>
          <p class="auth-sub">${isLogin ? '正式账号登录后可跨设备访问自己的项目；演示账号仍保存在本机。' : '首个正式账号自动成为超级管理员，其余账号须经管理员审核授权。'}</p>
          <div class="auth-tabs">
            <button type="button" class="${isLogin ? 'active' : ''}" data-auth-mode="login">登录</button>
            <button type="button" class="${!isLogin ? 'active' : ''}" data-auth-mode="register">注册</button>
          </div>
          <div class="auth-alert" id="auth-alert"></div>
          <form id="auth-form">
            ${!isLogin ? '<div class="field"><label>姓名 / 称呼</label><input class="input" name="displayName" autocomplete="name" placeholder="例如：王经理"></div>' : ''}
            <div class="field"><label>用户名</label><input class="input" name="username" autocomplete="username" required placeholder="输入用户名"></div>
            <div class="field"><label>密码 <small>至少6位</small></label><input class="input" type="password" name="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required placeholder="输入密码"></div>
            <button class="auth-submit" type="submit">${isLogin ? '进入工作台' : '提交注册申请'}</button>
          </form>
          ${isLogin ? `<div class="auth-demo"><span class="version-badge">v${APP_VERSION}</span>首次使用可直接体验：账号 <strong>demo</strong>，密码 <strong>demo1234</strong>。<button type="button" id="fill-demo">一键填入</button></div>` : ''}
          <div class="auth-font-setting">
            <span>界面字号</span>
            <div class="auth-font-options" role="group" aria-label="界面字号调整">
              <button type="button" data-font-scale="1" class="${state.fontScale === '1' ? 'active' : ''}">标准</button>
              <button type="button" data-font-scale="1.1" class="${state.fontScale === '1.1' ? 'active' : ''}">大</button>
              <button type="button" data-font-scale="1.2" class="${state.fontScale === '1.2' ? 'active' : ''}">特大</button>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => renderAuth(btn.dataset.authMode)));
  document.querySelectorAll('[data-font-scale]').forEach(button => button.addEventListener('click', () => applyFontScale(button.dataset.fontScale, true)));
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
      if (payload.pending) {
        alert.textContent = payload.message || '注册申请已提交，请等待超级管理员审核授权。';
        alert.classList.add('show', 'success');
        return;
      }
      saveSession(payload.token, payload.user);
      setBusy(false);
      renderWorkspaceLoading('正在同步账号与项目数据，首次载入会初始化本地计算引擎…');
      await loadProjects();
      renderProjectList();
      if (payload.firstAdmin) setTimeout(() => toast('首个正式账号已自动设为超级管理员', 'success'), 120);
    } catch (error) {
      alert.textContent = error.message;
      alert.classList.remove('success');
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
      <button class="nav-item" data-nav="terms">
        <span class="nav-icon">${ICONS.info}</span><span>名词解释</span>
      </button>
      ${state.user?.role === 'super_admin' ? `
      <div class="sidebar-context">Administration</div>
      <button class="nav-item ${active === 'admin' ? 'active' : ''}" data-nav="admin">
        <span class="nav-icon">${ICONS.users}</span><span>用户与项目管理</span>
      </button>` : ''}
      <div class="sidebar-spacer"></div>
      <div class="user-box">
        <strong>${escapeHtml(state.user?.displayName || state.user?.username || '')}</strong>
        <span>${state.user?.role === 'super_admin' ? '超级管理员 · 云端工作空间' : state.user?.username === 'demo' ? '演示账号 · 本地工作空间' : '正式账号 · 云端工作空间'}</span>
        <div class="font-size-setting">
          <span class="font-size-setting-title">界面字号</span>
          <div class="font-size-options" role="group" aria-label="界面字号调整">
            <button type="button" data-font-scale="1" class="${state.fontScale === '1' ? 'active' : ''}">标准</button>
            <button type="button" data-font-scale="1.1" class="${state.fontScale === '1.1' ? 'active' : ''}">大</button>
            <button type="button" data-font-scale="1.2" class="${state.fontScale === '1.2' ? 'active' : ''}">特大</button>
          </div>
        </div>
        <button type="button" id="logout-btn">退出登录</button>
      </div>
    </aside>`;
}

function renderWorkspaceLoading(message = '正在载入项目数据…') {
  const content = `<div class="workspace-loading-page"><div class="workspace-loading-mark">${ICONS.spark}</div><strong>${escapeHtml(message)}</strong><span>请稍候，不需要重复点击或刷新页面。</span></div>`;
  shell(content, 'projects', false);
}

function shell(content, active = 'projects', workspace = false) {
  const title = workspace ? (state.current?.model?.project?.name || '未命名项目') : active === 'admin' ? '用户与项目管理' : '项目工作台';
  const subtitle = workspace ? '项目测算与汇报' : active === 'admin' ? '账号审核 · 项目数据总览' : '商业地产投资测算';
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
            ` : active === 'admin' ? `<button class="btn btn-secondary" id="admin-refresh">${ICONS.spark}<span>刷新数据</span></button>` : `<button class="btn btn-primary" id="top-new-project">${ICONS.plus}<span>新建项目</span></button>`}
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
  document.querySelectorAll('[data-font-scale]').forEach(button => button.addEventListener('click', () => applyFontScale(button.dataset.fontScale, true)));
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'projects') {
      state.current = null; state.result = null; state.sidebarOpen = false;
      renderProjectList();
    } else if (nav === 'new') openNewProjectModal();
    else if (nav === 'guide') openGuideModal();
    else if (nav === 'terms') openTermGlossary();
    else if (nav === 'admin') openAdminDashboard();
  }));
  document.getElementById('admin-refresh')?.addEventListener('click', () => openAdminDashboard(true));
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
  const storageCopy = state.user?.username === 'demo'
    ? '演示账号项目只保存在当前浏览器，适合体验功能。'
    : '正式账号项目保存在云端，登录后可跨设备继续测算。';
  const content = `
    <div class="page-intro">
      <div>
        <div class="eyebrow">Project portfolio</div>
        <h1>项目工作台</h1>
        <p>从项目基础信息开始，按步骤完成成本、铺位和运营测算。${storageCopy}</p>
      </div>
      <div class="project-intro-actions"><button class="btn btn-secondary" id="compare-projects-btn">${ICONS.compare}<span>方案对比</span></button><button class="btn btn-secondary" id="import-share-btn">${ICONS.download}<span>接收项目</span></button><button class="btn btn-primary" id="new-project-btn">${ICONS.plus}<span>新建测算项目</span></button></div>
    </div>
    ${state.projects.length ? `<div class="project-grid">${cards}${newProjectCard()}</div>` : emptyProjectState()}`;
  shell(content, 'projects', false);
  document.getElementById('new-project-btn')?.addEventListener('click', openNewProjectModal);
  document.getElementById('compare-projects-btn')?.addEventListener('click', openCompareProjectsModal);
  document.getElementById('import-share-btn')?.addEventListener('click', openImportShareModal);
  document.getElementById('new-project-card')?.addEventListener('click', openNewProjectModal);
  document.getElementById('empty-new-project')?.addEventListener('click', openNewProjectModal);
  document.querySelectorAll('[data-project-id]').forEach(card => card.addEventListener('click', event => {
    if (event.target.closest('[data-delete-project], [data-share-project], [data-duplicate-project]')) return;
    openProject(card.dataset.projectId);
  }));
  document.querySelectorAll('[data-share-project]').forEach(btn => btn.addEventListener('click', event => {
    event.stopPropagation();
    openShareProjectModal(btn.dataset.shareProject);
  }));
  document.querySelectorAll('[data-duplicate-project]').forEach(btn => btn.addEventListener('click', async event => {
    event.stopPropagation();
    setBusy(true);
    try {
      const payload = await api(`/api/projects/${btn.dataset.duplicateProject}/duplicate`, { method: 'POST' });
      await loadProjects();
      renderProjectList();
      toast(`已创建${payload.project?.model?.project?.name || '方案副本'}`, 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
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

function encodeProjectShareCode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `DDPROJECT1.${btoa(binary)}`;
}

function decodeProjectShareCode(code) {
  const clean = String(code || '').trim();
  if (!clean.startsWith('DDPROJECT1.')) throw new Error('分享码格式不正确');
  const binary = atob(clean.slice('DDPROJECT1.'.length));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (!payload?.project?.model?.project) throw new Error('分享码中没有有效项目数据');
  return payload;
}

async function copyTextValue(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

async function openShareProjectModal(projectId) {
  setBusy(true);
  try {
    const [payload, userPayload] = await Promise.all([
      api(`/api/projects/${projectId}`),
      api('/api/share/users').catch(error => ({ users: [], warning: error.message })),
    ]);
    const project = payload.project;
    const model = payload.result?.model || project.model;
    const projectName = model?.project?.name || project.name || '未命名项目';
    const shareCode = encodeProjectShareCode({
      version: 1,
      sourceUsername: state.user?.username || '',
      sourceDisplayName: state.user?.displayName || state.user?.username || '',
      sharedAt: new Date().toISOString(),
      project: { name: projectName, model },
    });
    const users = userPayload.users || [];
    modalRegion.innerHTML = `
      <div class="modal-backdrop" id="share-project-backdrop">
        <div class="modal share-project-modal">
          <div class="modal-head"><div><span class="eyebrow">Project transfer</span><h2>发送项目</h2><p>${escapeHtml(projectName)} · 完整发送测算参数和铺位数据</p></div><button class="modal-close" id="share-project-close">×</button></div>
          <div class="modal-body share-project-body">
            <div class="share-option-card">
              <div class="share-option-head"><strong>发送给系统内已审核用户</strong><span>对方收到的是独立副本，不会修改您的原项目。</span></div>
              ${users.length ? `<div class="share-direct-row"><select class="select" id="share-recipient">${users.map(user => `<option value="${escapeHtml(user.id)}" data-username="${escapeHtml(user.username)}">${escapeHtml(user.displayName || user.username)} @${escapeHtml(user.username)}</option>`).join('')}</select><input class="input" id="share-note" placeholder="给对方的说明，可选"><button class="btn btn-primary" id="send-project-direct">${ICONS.share}<span>发送项目</span></button></div>` : `<div class="share-warning">${escapeHtml(userPayload.warning || '当前没有其他已审核用户。请先让对方注册并通过审核，或使用下方项目分享码。')}</div>`}
              <div id="share-direct-status" class="share-direct-status"></div>
            </div>
            <div class="share-divider"><span>或使用跨账号项目分享码</span></div>
            <div class="share-option-card share-code-card">
              <div class="share-option-head"><strong>复制项目分享码发送给B用户</strong><span>B在“接收项目”中粘贴后，系统会生成完整项目副本。分享码包含测算参数，不包含账号密码。</span></div>
              <textarea class="share-code-text" id="share-code-text" readonly>${escapeHtml(shareCode)}</textarea>
              <div class="share-code-actions"><button class="btn btn-secondary" id="copy-share-code">${ICONS.copy}<span>复制分享码</span></button><span id="copy-share-status"></span></div>
            </div>
          </div>
          <div class="modal-foot"><span class="admin-readonly-note">建议发送后由接收方另存为独立方案，再基于同一项目进行对比。</span><button class="btn btn-secondary" id="share-project-done">关闭</button></div>
        </div>
      </div>`;
    const close = () => { modalRegion.innerHTML = ''; };
    document.getElementById('share-project-close').addEventListener('click', close);
    document.getElementById('share-project-done').addEventListener('click', close);
    document.getElementById('share-project-backdrop').addEventListener('click', event => { if (event.target.id === 'share-project-backdrop') close(); });
    document.getElementById('copy-share-code').addEventListener('click', async () => {
      await copyTextValue(shareCode);
      document.getElementById('copy-share-status').textContent = '已复制';
    });
    document.getElementById('send-project-direct')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const select = document.getElementById('share-recipient');
      const option = select.selectedOptions[0];
      const status = document.getElementById('share-direct-status');
      button.disabled = true;
      status.className = 'share-direct-status';
      status.textContent = '正在发送项目副本…';
      try {
        await api(`/api/projects/${projectId}/share`, {
          method: 'POST',
          body: {
            recipientId: select.value,
            recipientUsername: option?.dataset.username || '',
            note: document.getElementById('share-note').value.trim(),
          },
        });
        status.classList.add('success');
        status.textContent = `已发送给 ${option?.textContent || '接收用户'}，对方登录后可在项目工作台查看副本。`;
      } catch (error) {
        status.classList.add('warning');
        status.textContent = `${error.message} 可直接复制下方项目分享码发送。`;
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function openImportShareModal() {
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="import-share-backdrop">
      <div class="modal import-share-modal">
        <div class="modal-head"><div><span class="eyebrow">Import shared project</span><h2>接收项目</h2><p>粘贴其他用户发送的项目分享码，系统将生成独立副本。</p></div><button class="modal-close" id="import-share-close">×</button></div>
        <form id="import-share-form">
          <div class="modal-body">
            <div class="field"><label>项目分享码</label><textarea class="share-code-text" name="shareCode" required placeholder="粘贴 DDPROJECT1. 开头的分享码"></textarea></div>
            <div id="import-share-status" class="share-direct-status"></div>
          </div>
          <div class="modal-foot"><button class="btn btn-secondary" type="button" id="import-share-cancel">取消</button><button class="btn btn-primary" type="submit">${ICONS.download}<span>生成项目副本</span></button></div>
        </form>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('import-share-close').addEventListener('click', close);
  document.getElementById('import-share-cancel').addEventListener('click', close);
  document.getElementById('import-share-backdrop').addEventListener('click', event => { if (event.target.id === 'import-share-backdrop') close(); });
  document.getElementById('import-share-form').addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('import-share-status');
    try {
      const payload = decodeProjectShareCode(new FormData(event.currentTarget).get('shareCode'));
      status.className = 'share-direct-status';
      status.textContent = '正在生成项目副本…';
      const model = payload.project.model;
      model.shareMeta = { importedFrom: payload.sourceUsername || '', importedFromName: payload.sourceDisplayName || '', importedAt: new Date().toISOString() };
      model.project.name = `${payload.project.name || model.project.name || '未命名项目'} · ${payload.sourceDisplayName || payload.sourceUsername || '用户'}分享`;
      const result = await api('/api/projects', { method: 'POST', body: { name: model.project.name, model } });
      await loadProjects();
      close();
      renderProjectList();
      toast(`已接收项目：${result.project?.model?.project?.name || model.project.name}`, 'success');
    } catch (error) {
      status.className = 'share-direct-status warning';
      status.textContent = error.message;
    }
  });
}

function compareMetricDefinitions() {
  return [
    { key: 'totalInvestment', label: '项目总投资', unit: '万元', better: 'lower' },
    { key: 'stableRevenue', label: '稳定期营业收入', unit: '万元/年', better: 'higher' },
    { key: 'stableNoi', label: '稳定期NOI', unit: '万元/年', better: 'higher' },
    { key: 'noiYield', label: 'NOI回报率', percent: true, better: 'higher' },
    { key: 'projectIrr', label: '项目IRR', percent: true, better: 'higher' },
    { key: 'projectNpv', label: '项目NPV', unit: '万元', better: 'higher' },
    { key: 'staticPayback', label: '静态回收期', unit: '年', better: 'lower' },
    { key: 'averageRent', label: '平均月租金', unit: '元/㎡/月', better: 'higher' },
    { key: 'investmentPerGba', label: '单位建筑面积投资', unit: '元/㎡', better: 'lower' },
    { key: 'stableStaffCost', label: '人员及服务成本', unit: '万元/年', better: 'lower' },
    { key: 'stableLeasingCost', label: '招商及租赁费用', unit: '万元/年', better: 'lower' },
    { key: 'stableMarketingCost', label: '营销费用', unit: '万元/年', better: 'lower' },
    { key: 'annualOutsourcedManagementFee', label: '第三方物业综合管理费', unit: '万元/年', better: 'lower' },
  ];
}

function comparisonValue(summary, metric) {
  const value = Number(summary?.[metric.key]);
  return Number.isFinite(value) ? value : null;
}

function compareProjectSummaries(projectA, projectB) {
  const a = projectA.summary || {};
  const b = projectB.summary || {};
  const metrics = compareMetricDefinitions().map(metric => {
    const va = comparisonValue(a, metric);
    const vb = comparisonValue(b, metric);
    const delta = va == null || vb == null ? null : vb - va;
    const pct = va == null || vb == null || Math.abs(va) < 0.0001 ? null : delta / Math.abs(va);
    let winner = 'tie';
    if (delta != null && Math.abs(delta) > 0.0001) winner = metric.better === 'higher' ? (vb > va ? 'B' : 'A') : (vb < va ? 'B' : 'A');
    return { ...metric, a: va, b: vb, delta, pct, winner };
  });
  const winsA = metrics.filter(item => item.winner === 'A').length;
  const winsB = metrics.filter(item => item.winner === 'B').length;
  const strengthsA = metrics.filter(item => item.winner === 'A').slice(0, 4).map(item => item.label);
  const strengthsB = metrics.filter(item => item.winner === 'B').slice(0, 4).map(item => item.label);
  const weaknessesA = metrics.filter(item => item.winner === 'B').slice(0, 4).map(item => item.label);
  const weaknessesB = metrics.filter(item => item.winner === 'A').slice(0, 4).map(item => item.label);
  const conclusions = [];
  if (winsA === 0 && winsB === 0) conclusions.push('两个方案的核心指标完全一致，可能尚未形成实质方案差异。建议修改租金、成本、面积、服务模式或融资假设后再比较。');
  else if (winsA === winsB) conclusions.push('两个方案在不同指标上各有优势，不能仅凭单项指标判断优劣，应结合企业投资门槛和经营策略。');
  else conclusions.push(`${winsA > winsB ? '方案A' : '方案B'}在 ${Math.max(winsA, winsB)} 项核心指标上占优，综合表现相对更好。`);
  if (metrics.find(item => item.key === 'totalInvestment')?.winner === 'A') conclusions.push('方案A投资更省，但需同时检查其NOI、IRR和NPV是否因压缩投入而下降。');
  if (metrics.find(item => item.key === 'totalInvestment')?.winner === 'B') conclusions.push('方案B投资更高，应重点判断新增投入是否带来足够的NOI、NPV和IRR提升。');
  const rentWinner = metrics.find(item => item.key === 'averageRent')?.winner;
  if (rentWinner && rentWinner !== 'tie') conclusions.push(`租金较高的是${rentWinner}方案，需核对其租金假设是否有市场样本和招商落地计划支撑。`);
  if (Math.abs(Number(a.grossFloorArea || 0) - Number(b.grossFloorArea || 0)) > 1) conclusions.push('两个方案面积规模不同，绝对金额不宜直接比较，建议优先看单位投资、NOI回报率、IRR和回收期。');
  return { a, b, metrics, winsA, winsB, strengthsA, strengthsB, weaknessesA, weaknessesB, conclusions };
}

function formatComparisonValue(metric, value) {
  if (value == null) return '—';
  return metric.percent ? fmtPct(value) : `${fmt(value, 2)}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function openCompareProjectsModal() {
  if (state.projects.length < 2) {
    toast('至少需要两个项目或方案才能对比。可以先复制一个方案，或接收其他用户分享的项目。', 'error');
    return;
  }
  const options = state.projects.map(project => {
    const name = project.summary?.projectName || project.model?.project?.name || project.name || '未命名项目';
    return `<option value="${project.id}">${escapeHtml(name)}</option>`;
  }).join('');
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="compare-projects-backdrop">
      <div class="modal compare-projects-modal">
        <div class="modal-head"><div><span class="eyebrow">Scenario comparison</span><h2>方案对比与优劣分析</h2><p>选择两个项目或同一项目的不同方案，系统自动比较投资、租金、成本、NOI、IRR和NPV。</p></div><button class="modal-close" id="compare-projects-close">×</button></div>
        <div class="modal-body">
          <div class="compare-select-grid"><label>方案A<select class="select" id="compare-project-a">${options}</select></label><label>方案B<select class="select" id="compare-project-b">${options}</select></label><button class="btn btn-primary" id="run-project-compare">${ICONS.compare}<span>开始对比</span></button></div>
          <div id="compare-results"></div>
        </div>
        <div class="modal-foot"><button class="btn btn-secondary" id="compare-projects-done">关闭</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  const selectA = document.getElementById('compare-project-a');
  const selectB = document.getElementById('compare-project-b');
  selectB.selectedIndex = Math.min(1, state.projects.length - 1);
  document.getElementById('compare-projects-close').addEventListener('click', close);
  document.getElementById('compare-projects-done').addEventListener('click', close);
  document.getElementById('compare-projects-backdrop').addEventListener('click', event => { if (event.target.id === 'compare-projects-backdrop') close(); });
  document.getElementById('run-project-compare').addEventListener('click', () => {
    if (selectA.value === selectB.value) {
      toast('请选择两个不同的项目或方案', 'error');
      return;
    }
    const projectA = state.projects.find(item => item.id === selectA.value);
    const projectB = state.projects.find(item => item.id === selectB.value);
    const comparison = compareProjectSummaries(projectA, projectB);
    const nameA = projectA.summary?.projectName || projectA.model?.project?.name || '方案A';
    const nameB = projectB.summary?.projectName || projectB.model?.project?.name || '方案B';
    document.getElementById('compare-results').innerHTML = `
      <div class="compare-summary-head"><div><span>A</span><strong>${escapeHtml(nameA)}</strong></div><div class="compare-vs">VS</div><div><span>B</span><strong>${escapeHtml(nameB)}</strong></div></div>
      <div class="compare-table-wrap"><table class="data-table compare-table"><thead><tr><th>指标</th><th class="num">方案A</th><th class="num">方案B</th><th class="num">B−A</th><th>优势</th></tr></thead><tbody>${comparison.metrics.map(metric => `<tr><td>${escapeHtml(metric.label)}</td><td class="num">${formatComparisonValue(metric, metric.a)}</td><td class="num">${formatComparisonValue(metric, metric.b)}</td><td class="num ${metric.delta == null ? '' : metric.delta >= 0 ? 'pos' : 'neg'}">${metric.delta == null ? '—' : metric.percent ? fmtPct(metric.delta) : `${fmt(metric.delta, 2)}${metric.unit ? ` ${metric.unit}` : ''}`}</td><td>${metric.winner === 'tie' ? '接近' : `<span class="compare-winner ${metric.winner === 'A' ? 'a' : 'b'}">${metric.winner}</span>`}</td></tr>`).join('')}</tbody></table></div>
      <div class="compare-insight-grid"><div class="compare-insight-card"><h3>方案A · ${comparison.winsA}项占优</h3><p><strong>优势：</strong>${comparison.strengthsA.join('、') || '暂无'}</p><p><strong>需关注：</strong>${comparison.weaknessesA.join('、') || '暂无'}</p></div><div class="compare-insight-card"><h3>方案B · ${comparison.winsB}项占优</h3><p><strong>优势：</strong>${comparison.strengthsB.join('、') || '暂无'}</p><p><strong>需关注：</strong>${comparison.weaknessesB.join('、') || '暂无'}</p></div></div>
      <div class="compare-conclusion"><h3>系统分析结论</h3>${comparison.conclusions.map(text => `<p>• ${escapeHtml(text)}</p>`).join('')}</div>`;
  });
  document.getElementById('run-project-compare').click();
}

function newProjectCard() {
  return `<div class="project-card new-project-card" id="new-project-card"><div class="new-project-inner"><div class="new-project-icon">${ICONS.plus}</div><strong>创建新项目</strong><div style="margin-top:6px;font-size:var(--fs-10)">从空白项目开始</div></div></div>`;
}

function emptyProjectState() {
  return `<div class="empty-state"><div class="new-project-icon" style="width:58px;height:58px;font-size:var(--fs-30)">${ICONS.plus}</div><h3>还没有测算项目</h3><p>创建第一个项目，系统会用6个步骤带你完成投资测算。</p><button class="btn btn-primary" id="empty-new-project">创建第一个项目</button></div>`;
}

function projectCard(project) {
  const s = project.summary || {};
  const status = s.status || '待完善';
  const developmentLabel = DEVELOPMENT_TYPE_LABELS[s.developmentType] || '';
  const shareMeta = project.model?.shareMeta || {};
  const sharedFrom = shareMeta.sourceDisplayName || shareMeta.importedFromName || shareMeta.sourceUsername || shareMeta.importedFrom;
  return `<article class="project-card" data-project-id="${project.id}">
    <div class="project-card-status"><span>●</span>${escapeHtml(status)}</div>
    <h3>${escapeHtml(s.projectName || project.model?.project?.name || '未命名项目')}</h3>
    <div class="project-location">${escapeHtml(s.location || project.model?.project?.location || '')}${developmentLabel ? ` · ${escapeHtml(developmentLabel)}` : ''}</div>
    ${sharedFrom ? `<div class="project-share-meta">${ICONS.share}<span>来自 ${escapeHtml(sharedFrom)} 分享的参考项目</span></div>` : ''}
    <div class="project-metrics">
      <div class="project-metric"><strong>${fmt(s.totalInvestment)}</strong><span>投资总额/万元</span></div>
      <div class="project-metric"><strong>${s.projectIrr == null ? '—' : fmtPct(s.projectIrr)}</strong><span>项目IRR</span></div>
      <div class="project-metric"><strong>${s.calculationMode === 'preliminary' ? (s.floorCount || 0) : (s.shopsCount || 0)}</strong><span>${s.calculationMode === 'preliminary' ? '测算楼层' : '铺位数量'}</span></div>
    </div>
    <div class="project-card-foot"><span>更新于 ${fmtDate(project.updatedAt)}</span><div class="project-card-actions"><button class="btn btn-ghost btn-sm" data-share-project="${project.id}" title="发送或生成分享码">${ICONS.share}<span>发送</span></button><button class="btn btn-ghost btn-sm" data-duplicate-project="${project.id}" title="复制为对比方案">${ICONS.copy}<span>复制</span></button><button class="btn btn-ghost btn-sm" data-delete-project="${project.id}" title="删除项目">${ICONS.trash}</button></div></div>
  </article>`;
}

function adminStatusMeta(status) {
  return {
    pending: { label: '待审核', className: 'pending' },
    approved: { label: '已授权', className: 'approved' },
    rejected: { label: '已拒绝', className: 'rejected' },
    disabled: { label: '已停用', className: 'disabled' },
  }[status] || { label: status || '未知', className: 'pending' };
}

function adminUserForProject(project) {
  return state.adminUsers.find(user => user.id === project.userId || user.id === project.user_id);
}

function adminFilteredUsers() {
  const keyword = state.adminSearch.trim().toLowerCase();
  return state.adminUsers.filter(user => {
    const statusOK = state.adminStatus === 'all' || user.status === state.adminStatus;
    const haystack = `${user.username || ''} ${user.display_name || ''}`.toLowerCase();
    return statusOK && (!keyword || haystack.includes(keyword));
  });
}

function adminFilteredProjects() {
  const keyword = state.adminSearch.trim().toLowerCase();
  const visibleUserIds = new Set(adminFilteredUsers().map(user => user.id));
  return state.adminProjects.filter(project => {
    const owner = adminUserForProject(project) || {};
    const modelProject = project.model?.project || {};
    const haystack = `${project.name || ''} ${modelProject.name || ''} ${modelProject.location || ''} ${owner.username || ''} ${owner.display_name || ''}`.toLowerCase();
    const userOK = state.adminStatus === 'all' || visibleUserIds.has(project.userId);
    return userOK && (!keyword || haystack.includes(keyword));
  });
}

function adminUserTable() {
  const users = adminFilteredUsers();
  if (!users.length) return '<div class="admin-empty">没有符合条件的用户。</div>';
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>用户</th><th>审核状态</th><th>角色</th><th>项目</th><th>注册 / 最近登录</th><th>管理操作</th></tr></thead>
    <tbody>${users.map(user => {
      const meta = adminStatusMeta(user.status);
      const projectCount = state.adminProjects.filter(project => project.userId === user.id).length;
      const actions = [];
      if (user.role !== 'super_admin') {
        if (user.status !== 'approved') actions.push(`<button class="admin-action approve" data-admin-user="${user.id}" data-admin-status="approved">${user.status === 'pending' ? '批准' : '重新启用'}</button>`);
        if (user.status !== 'rejected') actions.push(`<button class="admin-action reject" data-admin-user="${user.id}" data-admin-status="rejected">拒绝</button>`);
        if (user.status === 'approved') actions.push(`<button class="admin-action disable" data-admin-user="${user.id}" data-admin-status="disabled">停用</button>`);
      }
      return `<tr>
        <td><div class="admin-user-cell"><span class="admin-avatar">${escapeHtml((user.display_name || user.username || '?').slice(0, 1))}</span><div><strong>${escapeHtml(user.display_name || user.username)}</strong><small>@${escapeHtml(user.username)}</small></div></div></td>
        <td><span class="status-badge ${meta.className}">${meta.label}</span></td>
        <td>${user.role === 'super_admin' ? '<span class="role-badge">超级管理员</span>' : '普通用户'}</td>
        <td><strong>${projectCount}</strong> 个</td>
        <td><span class="admin-date">${escapeHtml(fmtDate(user.created_at))}</span><small class="admin-date">${user.last_login_at ? '最近 ' + escapeHtml(fmtDate(user.last_login_at)) : '尚未登录'}</small></td>
        <td><div class="admin-actions">${actions.length ? actions.join('') : '<span class="admin-locked">当前账号受保护</span>'}</div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function adminProjectTable() {
  const projects = adminFilteredProjects();
  if (!projects.length) return '<div class="admin-empty">没有符合条件的项目。</div>';
  return `<div class="admin-table-wrap"><table class="admin-table project-admin-table">
    <thead><tr><th>项目</th><th>所属用户</th><th>模式 / 规模</th><th>总投资</th><th>IRR / NPV</th><th>更新日期</th><th></th></tr></thead>
    <tbody>${projects.map(project => {
      const summary = project.summary || {};
      const owner = adminUserForProject(project) || {};
    const developmentLabel = DEVELOPMENT_TYPE_LABELS[summary.developmentType] || DEVELOPMENT_TYPE_LABELS[project.model?.project?.developmentType] || '新建项目';
      const modelProject = project.model?.project || {};
      return `<tr>
        <td><strong>${escapeHtml(summary.projectName || project.name || modelProject.name || '未命名项目')}</strong><small class="admin-project-location">${escapeHtml(summary.location || modelProject.location || '未填写位置')}</small></td>
        <td><strong>${escapeHtml(owner.display_name || owner.username || '未知用户')}</strong><small class="admin-date">@${escapeHtml(owner.username || '—')}</small></td>
        <td>${summary.calculationMode === 'preliminary' ? '初步测算' : '一铺一价'}<small class="admin-date">${escapeHtml(developmentLabel)} · ${summary.calculationMode === 'preliminary' ? `${summary.floorCount || 0} 个楼层` : `${summary.shopsCount || 0} 个铺位`}</small></td>
        <td><strong>${fmt(summary.totalInvestment)}</strong><small class="admin-date">万元</small></td>
        <td><strong>${summary.projectIrr == null ? '—' : fmtPct(summary.projectIrr)}</strong><small class="admin-date">NPV ${fmt(summary.projectNpv)} 万元</small></td>
        <td><span class="admin-date">${escapeHtml(fmtDate(project.updatedAt))}</span></td>
        <td><button class="admin-action view" data-admin-project="${project.id}">查看数据</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function updateAdminLists() {
  const userList = document.getElementById('admin-user-list');
  const projectList = document.getElementById('admin-project-list');
  const visibleCount = document.getElementById('admin-visible-count');
  if (userList) userList.innerHTML = adminUserTable();
  if (projectList) projectList.innerHTML = adminProjectTable();
  if (visibleCount) visibleCount.textContent = `${adminFilteredUsers().length} 位用户 · ${adminFilteredProjects().length} 个项目`;
  bindAdminListActions();
}

function bindAdminListActions() {
  document.querySelectorAll('[data-admin-user]').forEach(button => button.addEventListener('click', async () => {
    const nextStatus = button.dataset.adminStatus;
    const meta = adminStatusMeta(nextStatus);
    if ((nextStatus === 'rejected' || nextStatus === 'disabled') && !confirm(`确定将该用户设为“${meta.label}”吗？`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/users/${button.dataset.adminUser}/status`, { method: 'POST', body: { status: nextStatus } });
      state.adminLoaded = false;
      await loadAdminData();
      renderAdminDashboard();
      toast(`用户已设为${meta.label}`, 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setBusy(false); }
  }));
  document.querySelectorAll('[data-admin-project]').forEach(button => button.addEventListener('click', () => openAdminProject(button.dataset.adminProject)));
}

async function loadAdminData() {
  const [userPayload, projectPayload, auditPayload] = await Promise.all([
    api('/api/admin/users'),
    api('/api/admin/projects'),
    api('/api/admin/audit'),
  ]);
  state.adminUsers = userPayload.users || [];
  state.adminProjects = projectPayload.projects || [];
  state.adminLogs = auditPayload.logs || [];
  state.adminLoaded = true;
}

async function openAdminDashboard(force = false) {
  if (state.user?.role !== 'super_admin') return toast('仅超级管理员可访问用户管理', 'error');
  state.current = null;
  state.result = null;
  state.preview = null;
  state.sidebarOpen = false;
  if (!state.adminLoaded || force) {
    setBusy(true);
    try { await loadAdminData(); }
    catch (error) { toast(error.message, 'error'); return; }
    finally { setBusy(false); }
  }
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const pending = state.adminUsers.filter(user => user.status === 'pending').length;
  const approved = state.adminUsers.filter(user => user.status === 'approved').length;
  const totalInvestment = state.adminProjects.reduce((sum, project) => sum + Number(project.summary?.totalInvestment || 0), 0);
  const filters = [
    ['all', '全部'], ['pending', '待审核'], ['approved', '已授权'], ['rejected', '已拒绝'], ['disabled', '已停用'],
  ];
  const content = `
    <div class="page-intro admin-intro">
      <div>
        <div class="eyebrow">Super administrator</div>
        <h1>用户审核与项目总览</h1>
        <p>只有你授权的账号才能进入工作台。这里可查看所有正式用户、审核状态、项目测算摘要与最近管理操作。</p>
      </div>
    </div>
    <div class="admin-kpis">
      <div class="admin-kpi urgent"><span>待审核账号</span><strong>${pending}</strong><small>${pending ? '请及时处理注册申请' : '当前没有待审核申请'}</small></div>
      <div class="admin-kpi"><span>已授权用户</span><strong>${approved}</strong><small>含超级管理员账号</small></div>
      <div class="admin-kpi"><span>全部正式项目</span><strong>${state.adminProjects.length}</strong><small>项目数据由云端同步</small></div>
      <div class="admin-kpi"><span>项目投资合计</span><strong>${fmt(totalInvestment)}</strong><small>万元 · 按当前测算结果</small></div>
    </div>
    <section class="admin-section">
      <div class="admin-section-head">
        <div><span class="eyebrow">Access control</span><h2>注册用户与授权</h2></div>
        <span class="admin-count" id="admin-visible-count">${adminFilteredUsers().length} 位用户 · ${adminFilteredProjects().length} 个项目</span>
      </div>
      <div class="admin-toolbar">
        <label class="admin-search">${ICONS.search}<input id="admin-search" type="search" value="${escapeHtml(state.adminSearch)}" placeholder="搜索用户名、项目名称或地址"></label>
        <div class="admin-filter-group">${filters.map(([value, label]) => `<button type="button" class="${state.adminStatus === value ? 'active' : ''}" data-admin-filter="${value}">${label}</button>`).join('')}</div>
      </div>
      <div id="admin-user-list">${adminUserTable()}</div>
    </section>
    <section class="admin-section">
      <div class="admin-section-head"><div><span class="eyebrow">Project oversight</span><h2>全部用户项目</h2></div></div>
      <div id="admin-project-list">${adminProjectTable()}</div>
    </section>
    <section class="admin-section admin-audit-section">
      <div class="admin-section-head"><div><span class="eyebrow">Audit trail</span><h2>最近管理记录</h2></div></div>
      ${state.adminLogs.length ? `<div class="admin-audit-list">${state.adminLogs.slice(0, 10).map(log => {
        const actionLabels = { user_approved: '批准用户', user_rejected: '拒绝用户', user_disabled: '停用用户', user_pending: '恢复待审核' };
        return `<div><span>${escapeHtml(actionLabels[log.action] || log.action)}</span><strong>${escapeHtml(log.metadata?.username || '')}</strong><small>${escapeHtml(new Date(log.created_at).toLocaleString('zh-CN'))}</small></div>`;
      }).join('')}</div>` : '<div class="admin-empty">暂无管理记录。</div>'}
    </section>`;
  shell(content, 'admin', false);
  document.getElementById('admin-search')?.addEventListener('input', event => {
    state.adminSearch = event.target.value;
    updateAdminLists();
  });
  document.querySelectorAll('[data-admin-filter]').forEach(button => button.addEventListener('click', () => {
    state.adminStatus = button.dataset.adminFilter;
    document.querySelectorAll('[data-admin-filter]').forEach(item => item.classList.toggle('active', item === button));
    updateAdminLists();
  }));
  bindAdminListActions();
}

async function openAdminProject(projectId) {
  setBusy(true);
  try {
    const payload = await api(`/api/projects/${projectId}`);
    const project = payload.project;
    const result = payload.result || {};
    const summary = result.summary || {};
    const owner = adminUserForProject(project) || {};
    const investmentRows = (result.investmentBreakdown || []).map(item => `<div><span>${escapeHtml(item.name)}</span><strong>${fmt(item.value)} 万元</strong></div>`).join('');
    const costRows = (result.operatingCostBreakdown || []).map(item => `<div><span>${escapeHtml(item.name)}</span><strong>${fmt(item.value)} 万元/年</strong></div>`).join('');
    const organizationRows = (result.organizationBreakdown || []).map(item => `<div><span>${escapeHtml(item.name)} · ${fmt(item.headcount)}人</span><strong>${fmt(item.annualCost)} 万元/年</strong></div>`).join('');
    modalRegion.innerHTML = `
      <div class="modal-backdrop" id="admin-project-backdrop">
        <div class="modal admin-project-modal">
          <div class="modal-head"><div><span class="eyebrow">Read-only project review</span><h2>${escapeHtml(summary.projectName || project.name || '项目数据')}</h2><p>${escapeHtml(summary.location || '未填写项目位置')} · 所属用户 ${escapeHtml(owner.display_name || owner.username || '未知')}</p></div><button class="modal-close" id="admin-project-close">×</button></div>
          <div class="modal-body admin-project-body">
            <div class="admin-project-metrics">
              <div><span>项目总投资</span><strong>${fmt(summary.totalInvestment)}</strong><small>万元</small></div>
              <div><span>项目 IRR</span><strong>${summary.projectIrr == null ? '—' : fmtPct(summary.projectIrr)}</strong><small>融资前税后</small></div>
              <div><span>项目 NPV</span><strong>${fmt(summary.projectNpv)}</strong><small>万元</small></div>
              <div><span>稳定期 NOI</span><strong>${fmt(summary.stableNoi)}</strong><small>万元/年</small></div>
              <div><span>NOI 回报率</span><strong>${summary.noiYield == null ? '—' : fmtPct(summary.noiYield)}</strong><small>NOI / 总投资</small></div>
              <div><span>初步结论</span><strong class="admin-status-text">${escapeHtml(summary.status || '待完善')}</strong><small>系统自动判断</small></div>
            </div>
            <div class="admin-project-facts">
              <span>开发状态：${escapeHtml(DEVELOPMENT_TYPE_LABELS[summary.developmentType] || '新建项目')}</span>
              <span>计租方式：${escapeHtml({ rent: '纯租金', concession: '纯联营扣点', guarantee_or_concession: '保底与扣点取高' }[summary.revenueModel] || '—')}</span>
              <span>测算模式：${summary.calculationMode === 'preliminary' ? '楼层均价初步测算' : '一铺一价'}</span>
              <span>总建筑面积：${fmtArea(summary.grossFloorArea)} ㎡</span>
              <span>可租赁面积：${fmtArea(summary.leasableArea)} ㎡</span>
              <span>铺位 / 楼层：${summary.shopsCount || 0} 个 / ${summary.floorCount || 0} 层</span>
              <span>静态回收期：${summary.staticPayback == null ? '—' : fmt(summary.staticPayback, 1) + ' 年'}</span>
            </div>
            <div class="admin-analysis-grid">
              <div class="admin-data-panel"><h3>投资构成</h3>${investmentRows || '<p>暂无数据</p>'}</div>
              <div class="admin-data-panel"><h3>稳定期运营成本</h3>${costRows || '<p>暂无数据</p>'}</div>
              <div class="admin-data-panel"><h3>组织架构与人员成本</h3>${organizationRows || '<p>暂无数据</p>'}</div>
            </div>
            <div class="admin-analysis-note">
              <h3>系统分析结论</h3>
              ${(result.analysis?.bullets || []).map(text => `<p>• ${escapeHtml(text)}</p>`).join('') || '<p>暂无分析结论。</p>'}
              <h3>优化建议</h3>
              ${(result.analysis?.recommendations || []).map(text => `<p>• ${escapeHtml(text)}</p>`).join('') || '<p>暂无优化建议。</p>'}
            </div>
          </div>
          <div class="modal-foot"><span class="admin-readonly-note">管理员只读查看，不会修改用户项目</span><button class="btn btn-secondary" id="admin-project-done">关闭</button></div>
        </div>
      </div>`;
    const close = () => { modalRegion.innerHTML = ''; };
    document.getElementById('admin-project-close').addEventListener('click', close);
    document.getElementById('admin-project-done').addEventListener('click', close);
    document.getElementById('admin-project-backdrop').addEventListener('click', event => { if (event.target.id === 'admin-project-backdrop') close(); });
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setBusy(false);
  }
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
            <div class="field"><label>项目开发状态</label><select class="select" name="developmentType">${DEVELOPMENT_TYPE_OPTIONS.map(item => `<option value="${item.value}">${item.label}</option>`).join('')}</select></div>
            <div class="field"><label>商业项目形态</label><select class="select" name="projectType"><option>购物中心</option><option>百货商场</option><option>奥特莱斯</option><option>街区商业</option><option>社区商业</option><option>商业综合体</option><option>其他</option></select></div>
            <div class="field"><label>租金核算面积口径</label><select class="select" name="rentAreaBasis"><option value="leasable">实用面积（套内/租赁面积）</option><option value="building">建筑面积</option></select></div>
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
      updated.project.model.project.developmentType = form.get('developmentType');
      updated.project.model.project.projectType = form.get('projectType');
      updated.project.model.project.rentAreaBasis = form.get('rentAreaBasis');
      updated.project.model.project.revenueModel = form.get('revenueModel');
      applyCostReference(updated.project.model);
      applyOperatingCostReference(updated.project.model);
      await api(`/api/projects/${id}`, { method: 'PUT', body: { model: updated.project.model } });
      state.adminLoaded = false;
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
        <div class="modal-body" style="line-height:1.8;color:var(--muted);font-size:var(--fs-12)">
          <p><strong style="color:var(--navy)">1. 项目基本条件：</strong>填写产权、取得方式、位置、面积、业态和开发状态。</p>
          <p><strong style="color:var(--navy)">2. 建设投资：</strong>按土地、建安、装修、设备、公共规费和预备费形成建设投资。</p>
          <p><strong style="color:var(--navy)">3. 商铺收益：</strong>完成楼层均价或一铺一价，并结合3–5公里市场与竞品租金校准。</p>
          <p><strong style="color:var(--navy)">4. 筹备期成本：</strong>单独录入筹备团队、首开佣金、筹备营销和开办费用。</p>
          <p><strong style="color:var(--navy)">5. 运营期成本：</strong>核算组织、物业、办公、招商、营销、维保和服务成本。</p>
          <p><strong style="color:var(--navy)">6. 税费与利润：</strong>设置税费、融资、折旧、所得税和退出参数。</p>
          <p><strong style="color:var(--navy)">7. 资本金与回报：</strong>查看投资、IRR、NPV、NOI、回收期和方案对比，并导出Excel与PPT。</p>
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
    const benchmarkInitialized = ensureSettlementBenchmarks(state.current.model);
    state.result = payload.result;
    state.preview = benchmarkInitialized ? null : payload.result;
    state.marketAnalysis = null;
    state.marketError = null;
    state.step = 0;
    state.dirty = benchmarkInitialized;
    state.importWarnings = [];
    state.rentImportStats = null;
    state.shopPage = 1;
    state.shopSearch = '';
    renderWorkspace();
    if (benchmarkInitialized) {
      scheduleLivePreview();
      setTimeout(() => toast('已按行业常规和项目地区补充联营销售/扣点基准，请核对后保存', 'success'), 250);
    }
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
        <div class="panel-body">${state.step < STEPS.length - 1 ? `<div class="formula-toolbar"><div><span class="fx-chip">ƒ</span><strong>公式就在对应数据下方</strong><small>点击任一项查看计算式、函数和参数作用</small></div><div class="formula-toolbar-actions"><button class="btn btn-ghost btn-sm" id="open-term-glossary">名词解释</button><button class="btn btn-ghost btn-sm" id="open-function-glossary">函数说明</button><button class="btn btn-ghost btn-sm" id="toggle-all-formulas">显示全部公式</button></div></div>` : ''}${renderStep()}</div>
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
  normalizeNumericInputDisplays();
  bindStepInputs();
  bindFormulaToolbar();
  if (state.step === 6) requestAnimationFrame(renderResultCharts);
}

function stepDescription(step) {
  return [
    '先明确产权状态、取得方式、项目位置、商业形态、面积和开发阶段，形成整个投资测算的基础条件。',
    '按土地及契税、工程前期、建安、装修装饰、配套设施设备、市政规费和预备费形成项目建设投资。',
    '先用楼层均价快速测算，再导入一铺一价；同时结合3–5公里市场、竞品和租金样本校准项目收益。',
    '单独核算开业前发生的筹备团队、筹备物业、首开招商佣金、筹备营销和其他开办费用。',
    '核算稳定运营期的人力资源、物业服务、办公行政、招商、营销、维保和其他运营成本。',
    `按${jurisdictionName()}属地政策核对企业所得税、增值税、房产税等，并设置融资、折旧、退出和折现参数。`,
    '结果页汇总资本金投入、项目IRR、股权IRR、NPV、回收期、敏感性及项目建议，可导出Excel和PPT。',
  ][step];
}

function bindWorkspace() {
  document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    const nextStep = Number(btn.dataset.step);
    state.sidebarOpen = false;
    if (nextStep === 6 && (state.dirty || !state.result)) {
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
    if (nextStep === 6 && (state.dirty || !state.result)) {
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
    case 3: return renderPreOpeningCostStep();
    case 4: return renderOperationCostsStep();
    case 5: return renderTaxProfitStep();
    case 6: return renderResultsStep();
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
  const formula = FIELD_FORMULAS[path];
  return `<div class="field">
    <label><span>${label}${opts.optional ? '<small>可选</small>' : ''}</span>${formula ? '<span class="label-fx" title="查看公式">ƒ</span>' : ''}</label>
    <div class="${unit ? 'input-affix' : ''}">
      <input class="input" data-path="${path}" data-type="${type}" data-scale="${scale}" type="${type === 'number' ? 'number' : 'text'}" step="${opts.step || 'any'}" value="${escapeHtml(display)}" placeholder="${escapeHtml(opts.placeholder || '')}">
      ${unit ? `<span>${unit}</span>` : ''}
    </div>
    ${help ? `<div class="field-help">${help}</div>` : ''}
    ${formulaHint(path)}
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
  const formula = FIELD_FORMULAS[path];
  const normalized = options.map(opt => typeof opt === 'object' ? opt : { value: String(opt), label: String(opt) });
  return `<div class="field">
    <label><span>${label}</span>${formula ? '<span class="label-fx" title="查看公式">ƒ</span>' : ''}</label>
    <select class="select" data-path="${path}" data-type="${opts.type || 'text'}">
      ${normalized.map(opt => `<option value="${escapeHtml(opt.value)}" ${String(value) === String(opt.value) ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
    </select>
    ${opts.help ? `<div class="field-help">${opts.help}</div>` : ''}
    ${formulaHint(path)}
  </div>`;
}

function functionChips(functions) {
  return (functions || []).map(name => {
    const definition = FUNCTION_DEFINITIONS[name];
    const title = definition ? `${definition.syntax}｜点击查看函数说明` : '点击查看函数说明';
    return `<button type="button" class="function-chip" data-function="${escapeHtml(name)}" title="${escapeHtml(title)}">${escapeHtml(name)}</button>`;
  }).join('');
}

function formulaHint(path) {
  const info = FIELD_FORMULAS[path];
  if (!info) return '';
  const guide = formulaGuideFor(path, info);
  const current = getPath(state.current.model, path);
  const shown = current === true ? '是' : current === false ? '否' : current === null || current === undefined || current === '' ? '未填写' : (typeof current === 'number' ? fmt(current, Number.isInteger(current) ? 0 : 4) : String(current));
  return `<details class="inline-formula" data-formula-path="${escapeHtml(path)}">
    <summary><span class="fx-chip">ƒ</span><span>${escapeHtml(info.title)}：公式、算法与调整建议</span><span class="formula-current">当前：${escapeHtml(shown)}</span></summary>
    <div class="inline-formula-body">
      <div class="formula-label">公式表达式</div>
      <code>${escapeHtml(info.formula)}</code>
      <div class="formula-function-row"><span>使用函数（点击看语法和示例）</span>${functionChips(info.functions)}</div>
      <div class="formula-guide-grid">
        <div class="formula-guide-block"><strong>怎么算</strong><p>${escapeHtml(guide.how)}</p></div>
        <div class="formula-guide-block adjust"><strong>应该怎么调</strong><p>${escapeHtml(guide.adjust)}</p></div>
      </div>
      <div class="formula-impact"><strong>这个参数的影响：</strong>${escapeHtml(info.role || '')}</div>
    </div>
  </details>`;
}

function formulaPanel(title, formula, functions, note = '') {
  return `<details class="section-formula">
    <summary><span class="fx-chip">ƒ</span><strong>${escapeHtml(title)}</strong><span>展开公式、函数和计算顺序</span></summary>
    <div class="inline-formula-body">
      <div class="formula-label">公式表达式</div>
      <code>${escapeHtml(formula)}</code>
      <div class="formula-function-row"><span>使用函数（点击看语法和示例）</span>${functionChips(functions)}</div>
      ${note ? `<div class="formula-impact"><strong>调整说明：</strong>${escapeHtml(note)}</div>` : ''}
    </div>
  </details>`;
}

function openFunctionHelp(name) {
  const info = FUNCTION_DEFINITIONS[name];
  if (!info) return;
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="function-help-backdrop">
      <div class="modal" style="width:min(620px,100%)">
        <div class="modal-head"><div><h2><span class="function-title-chip">ƒ</span> ${escapeHtml(name)} 函数说明</h2><p>${escapeHtml(info.syntax)}</p></div><button class="modal-close" id="function-help-close">×</button></div>
        <div class="modal-body function-help-body">
          <div class="formula-guide-block"><strong>含义</strong><p>${escapeHtml(info.meaning)}</p></div>
          <div class="formula-guide-block"><strong>本项目示例</strong><p><code>${escapeHtml(info.example)}</code></p></div>
          <div class="formula-guide-block adjust"><strong>调整时注意</strong><p>${escapeHtml(info.note)}</p></div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary" id="function-help-ok">知道了</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('function-help-close').addEventListener('click', close);
  document.getElementById('function-help-ok').addEventListener('click', close);
  document.getElementById('function-help-backdrop').addEventListener('click', event => { if (event.target.id === 'function-help-backdrop') close(); });
}

function openFunctionGlossary() {
  const cards = Object.entries(FUNCTION_DEFINITIONS).map(([name, info]) => `<button type="button" class="function-glossary-card" data-function="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(info.syntax)}</span><small>${escapeHtml(info.meaning)}</small></button>`).join('');
  modalRegion.innerHTML = `
    <div class="modal-backdrop" id="function-glossary-backdrop">
      <div class="modal" style="width:min(860px,100%)">
        <div class="modal-head"><div><h2>测算函数字典</h2><p>点击任一函数查看语法、含义、项目示例和调整注意事项。</p></div><button class="modal-close" id="function-glossary-close">×</button></div>
        <div class="modal-body"><div class="function-glossary-grid">${cards}</div></div>
        <div class="modal-foot"><button class="btn btn-primary" id="function-glossary-ok">关闭</button></div>
      </div>
    </div>`;
  const close = () => { modalRegion.innerHTML = ''; };
  document.getElementById('function-glossary-close').addEventListener('click', close);
  document.getElementById('function-glossary-ok').addEventListener('click', close);
  document.getElementById('function-glossary-backdrop').addEventListener('click', event => { if (event.target.id === 'function-glossary-backdrop') close(); });
}

function renderCostReferencePanel() {
  const reference = getCostReference();
  const rangeText = range => range.low === range.high ? fmt(range.low) : `${fmt(range.low)}–${fmt(range.high)}`;
  return `<div class="cost-reference-card" id="cost-reference-panel">
    <div class="cost-reference-head">
      <div><span class="eyebrow">Location cost benchmark</span><h3>${escapeHtml(reference.cityLabel)} · ${escapeHtml(reference.developmentLabel)} · ${escapeHtml(reference.formatLabel)}</h3><p>${escapeHtml(reference.profileNote)}</p></div>
      <button type="button" class="btn btn-secondary btn-sm" data-apply-cost-reference>重新应用参考价</button>
    </div>
    <div class="cost-reference-rates">
      <div><span>建安工程参考</span><strong>${fmt(reference.rates.constructionRate)}</strong><small>元/㎡ · 建议复核 ${rangeText(reference.ranges.constructionRate)}</small></div>
      <div><span>装修改造参考</span><strong>${fmt(reference.rates.fitoutRate)}</strong><small>元/㎡ · 建议复核 ${rangeText(reference.ranges.fitoutRate)}</small></div>
      <div><span>设施设备参考</span><strong>${fmt(reference.rates.equipmentRate)}</strong><small>元/㎡ · 建议复核 ${rangeText(reference.ranges.equipmentRate)}</small></div>
    </div>
    <div class="cost-reference-note">系统按“城市系数 × 开发状态基准 × 商业形态系数”自动带入；参考区间按基准单价的 ±15% 展示，最终应以属地造价指标、设计概算和现场鉴定为准。手工调整会保留到下次切换项目位置或开发状态。</div>
  </div>`;
}

function refreshCostReferencePreview() {
  const current = document.getElementById('cost-reference-panel');
  if (!current) return;
  current.outerHTML = renderCostReferencePanel();
  bindCostReferenceAction();
}

function bindCostReferenceAction() {
  document.querySelector('[data-apply-cost-reference]')?.addEventListener('click', () => {
    const reference = applyCostReference(state.current.model, {}, true);
    if (reference) toast('已重新应用所在地和开发状态参考价', 'success');
    scheduleLivePreview();
  });
}

function renderOwnerRentSection() {
  const model = state.current.model;
  const ownerRent = model.ownerRent || (model.ownerRent = {
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
  });
  const enabled = ownerRent.enabled === true || [1, '1', 'true', 'yes', '是'].includes(ownerRent.enabled);
  const leaseType = ownerRent.leaseType || 'property';
  const includesLand = ['land', 'land_and_property'].includes(leaseType);
  const includesProperty = ['property', 'land_and_property'].includes(leaseType);
  const landPricingMode = ownerRent.landPricingMode || 'total';
  const propertyPricingMode = ownerRent.propertyPricingMode || 'total';
  const growthMode = ownerRent.growthMode || 'compound';
  const landMonthlyComputed = includesLand
    ? landPricingMode === 'unit' ? Number(ownerRent.landArea || 0) * Number(ownerRent.landUnitRent || 0) / 10000 : Number(ownerRent.landMonthlyRent || 0)
    : 0;
  const propertyMonthlyComputed = includesProperty
    ? propertyPricingMode === 'unit' ? Number(ownerRent.propertyArea || 0) * Number(ownerRent.propertyUnitRent || 0) / 10000 : Number(ownerRent.propertyMonthlyRent || 0)
    : 0;
  const landBase = landMonthlyComputed * Number(ownerRent.landPaymentMonths || 0);
  const propertyBase = propertyMonthlyComputed * Number(ownerRent.propertyPaymentMonths || 0);
  const annualBase = landBase + propertyBase;
  const growthOptions = [
    { value: 'none', label: '不复递增' },
    { value: 'compound', label: '按比例复利递增' },
    { value: 'simple', label: '按比例单利递增' },
    { value: 'fixed_amount', label: '每年固定金额递增' },
    { value: 'step', label: '每N年阶梯递增' },
  ];
  return `<div class="form-section owner-rent-section">
    <div class="section-title">土地及物业租赁支出</div>
    <div class="section-note">适用于土地租赁、物业租赁、租赁经营、轻资产和运营中项目。土地与物业租金会分别作为年度运营支出计入NOI和现金流。</div>
    ${formulaPanel('土地及物业租赁支付公式', '按面积：月租金 = 面积 × 单价 ÷ 10000\n按总额：月租金 = 合同月度总额\n土地首年租金 = 土地月租金 × 土地支付月数\n物业首年租金 = 物业月租金 × 物业支付月数\n首年合计 = 土地首年租金 + 物业首年租金\n复利：第n年 = 首年 ×（1+递增率）^(n-1)\n单利：第n年 = 首年 ×［1+递增率×(n-1)］\n固定金额：第n年 = 首年 + 每年增加额×(n-1)\n阶梯：每N年按递增率上调一次', ['SUM', 'IF', 'POWER', 'INT'], '按土地租赁合同和物业租赁合同分别录入；自有物业不支付租金时选择“否”。')}
    <div class="form-grid">
      ${selectField('是否支付土地或物业租金', 'ownerRent.enabled', [{ value: true, label: '是，需要支付' }, { value: false, label: '否，自有物业' }], { type: 'boolean', help: '选择“是”后，租赁支出作为运营成本扣减NOI' })}
      ${enabled ? selectField('租赁标的类型', 'ownerRent.leaseType', [{ value: 'land', label: '仅土地租赁' }, { value: 'property', label: '仅物业租赁' }, { value: 'land_and_property', label: '土地 + 物业租赁' }], { help: '按实际租赁合同选择，系统将分别计算土地和物业租金' }) : ''}
      ${enabled && includesLand ? selectField('土地计价方式', 'ownerRent.landPricingMode', [{ value: 'total', label: '按月度总额' }, { value: 'unit', label: '按面积单价' }], { help: '按合同选择月度总额或元/㎡/月计价' }) : ''}
      ${enabled && includesLand && landPricingMode === 'unit' ? textField('土地租赁面积', 'ownerRent.landArea', { type: 'number', unit: '㎡', help: '按土地租赁合同约定面积填写' }) : ''}
      ${enabled && includesLand && landPricingMode === 'unit' ? textField('土地单价', 'ownerRent.landUnitRent', { type: 'number', unit: '元/㎡/月', help: `折合土地月租金约 ${fmt(landMonthlyComputed, 2)} 万元/月` }) : ''}
      ${enabled && includesLand && landPricingMode === 'total' ? textField('土地月租金总额', 'ownerRent.landMonthlyRent', { type: 'number', unit: '万元/月', help: `首年土地租金约 ${fmt(landBase, 2)} 万元/年` }) : ''}
      ${enabled && includesLand ? textField('土地年度支付月数', 'ownerRent.landPaymentMonths', { type: 'number', unit: '月/年', help: '土地租赁免租期或分次支付时按实际月数调整' }) : ''}
      ${enabled && includesProperty ? selectField('物业计价方式', 'ownerRent.propertyPricingMode', [{ value: 'total', label: '按月度总额' }, { value: 'unit', label: '按面积单价' }], { help: '按合同选择月度总额或元/㎡/月计价' }) : ''}
      ${enabled && includesProperty && propertyPricingMode === 'unit' ? textField('物业租赁面积', 'ownerRent.propertyArea', { type: 'number', unit: '㎡', help: '按物业租赁合同约定面积填写' }) : ''}
      ${enabled && includesProperty && propertyPricingMode === 'unit' ? textField('物业单价', 'ownerRent.propertyUnitRent', { type: 'number', unit: '元/㎡/月', help: `折合物业月租金约 ${fmt(propertyMonthlyComputed, 2)} 万元/月` }) : ''}
      ${enabled && includesProperty && propertyPricingMode === 'total' ? textField('物业月租金总额', 'ownerRent.propertyMonthlyRent', { type: 'number', unit: '万元/月', help: `首年物业租金约 ${fmt(propertyBase, 2)} 万元/年` }) : ''}
      ${enabled && includesProperty ? textField('物业年度支付月数', 'ownerRent.propertyPaymentMonths', { type: 'number', unit: '月/年', help: '物业租赁免租期或分次支付时按实际月数调整' }) : ''}
      ${enabled ? selectField('递增方式', 'ownerRent.growthMode', growthOptions, { help: '按业主租赁合同的递增条款选择' }) : ''}
      ${enabled && ['compound', 'simple', 'step'].includes(growthMode) ? textField('递增率', 'ownerRent.growthRate', { type: 'number', unit: '%', scale: 0.01 }) : ''}
      ${enabled && growthMode === 'fixed_amount' ? textField('每年增加额', 'ownerRent.annualIncrease', { type: 'number', unit: '万元/年' }) : ''}
      ${enabled && growthMode === 'step' ? textField('递增周期', 'ownerRent.stepYears', { type: 'number', unit: '年/次' }) : ''}
    </div>
    ${enabled ? `<div class="owner-rent-summary">首年土地租赁 <strong>${fmt(landBase, 2)} 万元/年</strong> · 首年物业租赁 <strong>${fmt(propertyBase, 2)} 万元/年</strong> · 合计 <strong>${fmt(annualBase, 2)} 万元/年</strong></div>` : '<div class="owner-rent-summary muted">当前按自有物业测算：土地及物业租赁支出为0。</div>'}
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
    ${formulaPanel('面积、租金与投资基数公式', '总建筑面积 = IF(手动值为0, 商铺建筑面积合计 ×（1 + 公区系数), 手动值)\n有效租金 = 租赁面积 × 基准租金 × 业态系数 ×（1 + 条件溢价）\n项目总投资 = 土地及契税 + 建设工程 + 预备费 + 招商开办 + 流动资金', ['IF', 'SUM', 'MAX', 'POWER'], '每个参数下方的ƒ按钮会显示该参数在公式中的具体作用。')}
    <div class="form-section">
      <div class="section-title">项目概况</div>
      <div class="form-grid">
        ${textField('项目名称', 'project.name', { placeholder: '例如：柳江沿岸商业中心' })}
        ${locationField()}
        ${selectField('项目开发状态', 'project.developmentType', DEVELOPMENT_TYPE_OPTIONS, { help: '不同状态会自动匹配新建土建、旧改改造或运营提升的参考造价' })}
        ${selectField('商业项目形态', 'project.projectType', ['购物中心', '百货商场', '奥特莱斯', '街区商业', '社区商业', '商业综合体', '其他'])}
        ${selectField('产权状态', 'project.propertyRightsStatus', PROPERTY_RIGHTS_OPTIONS, { help: '区分自有、租赁、股权或政府合作等产权安排，影响投资和运营边界。' })}
        ${selectField('取得方式', 'project.acquisitionMethod', ACQUISITION_METHOD_OPTIONS, { help: '用于识别招拍挂、协议转让、股权收购、租赁取得等不同前期风险。' })}
        ${selectField('物业建设 / 经营状态', 'project.buildingStatus', BUILDING_STATUS_OPTIONS, { help: '用于区分在建、竣工未开业、运营中和待改造项目的成本重点。' })}
        ${selectField('租金核算面积口径', 'project.rentAreaBasis', [{value:'leasable',label:'实用面积（套内/租赁面积）'},{value:'building',label:'建筑面积'}], { help:'楼层和铺位可单独覆盖项目默认口径' })}
        ${selectField('项目计租方式', 'project.revenueModel', [{value:'rent',label:'纯租金'},{value:'concession',label:'纯联营扣点'},{value:'guarantee_or_concession',label:'保底与联营扣点取高'}], { help: '业态可在铺位数据页单独覆盖项目规则' })}
        ${textField('建设起始年份', 'project.startYear', { type: 'number', unit: '年' })}
        ${textField('建设期', 'project.constructionYears', { type: 'number', unit: '年' })}
        ${textField('招商运营年限', 'project.operationYears', { type: 'number', unit: '年', help: '可填1–50年，现金流、IRR、NPV、Excel和PPT都会按该年限计算' })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">面积与土地</div>
      <div class="form-grid">
        ${textField('项目总建筑面积', 'project.gbaOverride', { type: 'number', unit: '㎡', step: '0.01', help: '留空或为0时，系统按商铺面积自动推算；保留两位小数', optional: true })}
        ${textField('项目占地面积', 'project.landArea', { type: 'number', unit: '㎡', step: '0.01', help: '用于城镇土地使用税；保留两位小数' })}
        ${textField('公共部位及设备房分摊系数', 'project.commonAreaFactor', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('土地取得价款', 'project.landPrice', { type: 'number', unit: '万元', help: '土地出让金或转让价款' })}
        ${textField('预备费费率', 'project.contingencyRate', { type: 'number', unit: '%', scale: 0.01, help: '通常按工程及装修直接费用的3%–8%' })}
      </div>
    </div>
    ${renderOwnerRentSection()}
    <div class="form-section">
      <div class="section-title">当前基础结果</div>
      <div class="stats-row">
        <div class="mini-stat"><strong>${fmt(preliminary ? floors.filter(floor => Number(floor.buildingArea) > 0).length : (m.shops?.length || 0))}</strong><span>${preliminary ? '已填写楼层' : '已导入铺位'}</span></div>
        <div class="mini-stat"><strong>${fmtArea((preliminary ? floorBuilding : shopBuilding) || m.project.gbaOverride || 0)}</strong><span>${preliminary ? '楼层建筑面积合计/㎡' : '商铺建筑面积合计/㎡'}</span></div>
        <div class="mini-stat"><strong>${fmtArea(preliminary ? floorLease : shopLease)}</strong><span>可租赁面积合计/㎡</span></div>
        <div class="mini-stat"><strong data-live="investment">${preview ? fmt(preview.summary.totalInvestment) : '待计算'}</strong><span>项目总投资/万元</span></div>
      </div>
    </div>`;
}

function renderCostStep() {
  const presets = ['社区商业', '街区商业', '购物中心', '商业综合体'];
  const reference = getCostReference();
  return `
    <div class="callout">${ICONS.info}<div>当前参考为“${escapeHtml(reference.cityLabel)} · ${escapeHtml(reference.developmentLabel)} · ${escapeHtml(reference.formatLabel)}”。系统已自动套用${escapeHtml(DEVELOPMENT_TYPE_LABELS[reference.developmentType] || '新建项目')}的造价逻辑，以下单价仍可按目标成本、设计概算和现场鉴定结果逐项调整。</div></div>
    ${formulaPanel('工程投资与流动资金公式', '分项工程投资 = 总建筑面积 × 分项单价 ÷ 10000\n直接工程费 = 前期 + 建安 + 公共配套 + 装修 + 设备 + 其他工程\n预备费 = 直接工程费 × 预备费率\n铺底流动资金 = 稳定运营成本估算 × 铺底比例', ['SUM', 'ROUND', 'MAX'], '金额单位均为万元；修改任一单价后，投资、折旧、税费和现金流会联动更新。')}
    ${renderCostReferencePanel()}
    <div class="preset-row">
      <span style="font-size:var(--fs-10);color:var(--muted);padding:8px 2px">按商业形态重算：</span>
      ${presets.map(preset => `<button class="preset" data-reference-format="${preset}">${preset}</button>`).join('')}
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
    <div class="form-section cost-structure-section">
      <div class="section-title">成本结构口径映射</div>
      <div class="section-note">以下按商业地产财务测算的常用成本结构展示各细分项当前归入的系统字段，避免咨询、设计、外立面、配套和设备费用遗漏。</div>
      <div class="data-table-wrap" style="max-height:none"><table class="data-table cost-structure-table"><thead><tr><th>成本大类</th><th>应包含的细分内容</th><th>当前核算字段 / 方法</th></tr></thead><tbody>
        <tr><td><strong>土地及契税</strong></td><td>土地出让金、转让价款、契税及相关取得费用</td><td>土地取得价款 + 契税税率</td></tr>
        <tr><td><strong>工程前期费</strong></td><td>咨询、策划、规划、设计、报建、勘察、检测等</td><td>前期工程费单价 × 总建筑面积</td></tr>
        <tr><td><strong>建安及配套</strong></td><td>土建、机电、消防、水电气网、排油烟、排污、隔油池</td><td>建安工程费 + 其他工程费 + 公共规费</td></tr>
        <tr><td><strong>装修装饰</strong></td><td>公区精装、内部装修、外立面、亮化、导视及精装商铺</td><td>公共区域精装单价 × 总建筑面积</td></tr>
        <tr><td><strong>设施设备</strong></td><td>中央空调、电梯、消防、智能化、运营设备及后厨设备</td><td>设施设备单价 × 总建筑面积</td></tr>
        <tr><td><strong>市政及规费</strong></td><td>市政基础设施配套、人防易地建设及其他属地公共规费</td><td>按项目属地单价 × 总建筑面积</td></tr>
        <tr><td><strong>预备费与开办</strong></td><td>不可预见费、招商佣金、筹备营销、筹备团队及其他开办费</td><td>预备费按直接工程费计提；开办费按项目金额计入</td></tr>
      </tbody></table></div>
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
      <div class="mini-stat"><strong>${fmtArea(state.current.model.project.gbaOverride || state.current.model.shops.reduce((s, x) => s + Number(x.buildingArea || 0), 0) * (1 + Number(state.current.model.project.commonAreaFactor || 0)) || 0)}</strong><span>计算用总建筑面积/㎡</span></div>
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
  const totalRentArea = floors.reduce((sum, floor) => sum + rentAreaFor(floor, m), 0);
  const revenueMode = m.project?.revenueModel || 'rent';
  const totalMonthly = floors.reduce((sum, floor) => {
    const area = rentAreaFor(floor, m);
    const guarantee = area * Number(floor.avgRent || 0);
    const concession = area * Number(floor.salesPerSqmMonth || 0) * Number(floor.concessionRate || 0);
    return sum + (revenueMode === 'concession' ? concession : revenueMode === 'guarantee_or_concession' ? Math.max(guarantee, concession) : guarantee);
  }, 0);
  return `
    <div class="callout">${ICONS.info}<div>初期没有铺位明细时，可按楼层填写可租赁面积和平均月租金快速测算；招商方案明确后，再切换为一铺一价测算。</div></div>
    ${shops.length && mode === 'preliminary' ? `<div class="callout soft shop-detail-notice">${ICONS.info}<div>系统检测到 <strong>${shops.length}</strong> 个铺位明细，但当前仍在“初步测算”。点击“查看一铺一价明细”可查看全部铺位、租金单价和收入统计。</div><button class="btn btn-secondary btn-sm" type="button" id="view-detailed-shops">查看一铺一价明细</button></div>` : ''}
    <div class="mode-switch">
      <button type="button" class="mode-card ${mode === 'preliminary' ? 'active' : ''}" data-shop-mode="preliminary"><strong>初步测算</strong><span>按楼层均价快速判断项目量级</span></button>
      <button type="button" class="mode-card ${mode === 'detailed' ? 'active' : ''}" data-shop-mode="detailed"><strong>一铺一价</strong><span>按铺位、业态和位置条件精细定价</span></button>
    </div>
    ${renderSettlementControls(m)}
    ${renderFloorEditor(m, mode, preview)}
    <div class="stats-row">
      <div class="mini-stat"><strong data-live="investment">${preview ? fmt(preview.summary.totalInvestment) : '待计算'}</strong><span>项目总投资/万元</span></div>
      <div class="mini-stat"><strong data-live="monthlyRent">${preview ? fmt(preview.summary.totalMonthlyRent) : fmt(totalMonthly)}</strong><span>满租月收益/元</span></div>
      <div class="mini-stat"><strong data-live="avgRent">${preview ? fmt(preview.summary.averageRent, 1) : fmt(totalRentArea ? totalMonthly / totalRentArea : 0, 1)}</strong><span>平均月收益/计租㎡</span></div>
      <div class="mini-stat"><strong data-live="status">${preview ? escapeHtml(preview.summary.status) : '自动计算中'}</strong><span>实时测算状态</span></div>
    </div>
    ${mode === 'preliminary'
      ? renderPreliminarySummary(shops, floors, totalBuilding, totalLease, totalMonthly)
      : renderDetailedPricing(m, shops, preview)}
    ${renderFloorRentSummary(preview)}
    ${renderRevenueAssumptionsSection()}
    <details class="advanced">
      <summary>3–5公里市场判断与竞品租金</summary>
      <div class="advanced-body">${renderMarketStep()}</div>
    </details>
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
      <button type="button" class="preset" data-settlement-current-benchmark>补全当前行业基准</button>
    </div>
  </div>`;
}

function renderFloorEditor(m, mode, preview) {
  const floors = m.floors || [];
  const revenueMode = m.project?.revenueModel || 'rent';
  const concessionEnabled = revenueMode !== 'rent';
  const previewFloors = new Map((preview?.floors || []).map(floor => [buildingFloorKey(floor), floor]));
  const buildingOptions = [...new Set([...(floors || []).map(floor => floor.building || '1号楼'), ...(m.shops || []).map(shop => shop.building || '1号楼')])];
  return `<div class="form-section">
    <div class="section-title">楼层均价与面积</div>
    <div class="section-note">${mode === 'preliminary' ? `系统按项目计租方式汇总楼层收益${concessionEnabled ? '，并比较保底租金与联营扣点' : ''}。调整面积、租金、销售基数或扣点率后会自动重新测算。` : '这里的楼层均价将作为一铺一价的基础：再乘业态系数并叠加铺位条件溢价。'}</div>
    ${formulaPanel('楼层收益公式', '计租面积 = IF(计租口径=建筑面积, 建筑面积, 实用面积)\n楼层满租月收益 = 计租面积 × 楼层均价\n联营扣点月收益 = 计租面积 × 销售基数 × 扣点率\n实际加权收益 = 楼层月收益合计 ÷ 计租面积', ['SUM', 'MAX', 'IF'], '项目默认口径可被楼层单独覆盖；调整楼栋、楼层、面积、租金、销售基数或扣点率后，系统会实时更新。')}
    <div class="data-table-wrap floor-table-wrap">
      <table class="data-table floor-table"><thead><tr><th>楼栋</th><th>楼层</th><th>计租口径</th><th class="num">建筑面积（㎡）</th><th class="num">实用/租赁面积（㎡）</th><th class="num">${termLabel('得铺率')}</th><th class="num">保底/平均租金（元/㎡）</th>${concessionEnabled ? `<th class="num">${termLabel('销售基数', '销售基数（元/㎡/月）')}</th><th class="num">${termLabel('扣点率')}</th>` : ''}<th class="num">满租月收益（元）</th><th class="num">实际加权收益</th><th></th></tr></thead><tbody>
        ${floors.length ? floors.map((floor, i) => {
          const ratio = Number(floor.buildingArea) ? Number(floor.leasableArea) / Number(floor.buildingArea) : 0;
          const area = rentAreaFor(floor, m);
          const guarantee = area * Number(floor.avgRent || 0);
          const concession = area * Number(floor.salesPerSqmMonth || 0) * Number(floor.concessionRate || 0);
          const monthly = revenueMode === 'concession' ? concession : revenueMode === 'guarantee_or_concession' ? Math.max(guarantee, concession) : guarantee;
          const calculated = previewFloors.get(buildingFloorKey(floor));
          return `<tr>
            <td><input class="table-input floor-name-input" data-path="floors.${i}.building" data-type="text" list="building-options" value="${escapeHtml(floor.building || '1号楼')}"></td>
            <td><input class="table-input floor-name-input" data-path="floors.${i}.name" data-type="text" value="${escapeHtml(floor.name || '')}"></td>
            <td><select class="table-select" data-path="floors.${i}.rentAreaBasis" data-type="text">${Object.entries(RENT_BASIS_LABELS).map(([value,label]) => `<option value="${value}" ${((floor.rentAreaBasis || 'inherit') === value) ? 'selected' : ''}>${label}</option>`).join('')}</select></td>
            <td class="num"><input class="table-input" data-path="floors.${i}.buildingArea" data-type="number" type="number" step="0.01" value="${Number(floor.buildingArea ?? 0).toFixed(2)}"></td>
            <td class="num"><input class="table-input" data-path="floors.${i}.leasableArea" data-type="number" type="number" step="0.01" value="${Number(floor.leasableArea ?? 0).toFixed(2)}"></td>
            <td class="num">${fmtPct(ratio)}</td>
            <td class="num"><input class="table-input highlight-input" data-path="floors.${i}.avgRent" data-type="number" type="number" step="any" value="${floor.avgRent ?? 0}"></td>
            ${concessionEnabled ? `<td class="num"><input class="table-input" data-path="floors.${i}.salesPerSqmMonth" data-type="number" type="number" step="any" value="${floor.salesPerSqmMonth ?? 0}"></td><td class="num"><input class="table-input" data-path="floors.${i}.concessionRate" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(floor.concessionRate || 0) * 100).toFixed(1)}"></td>` : ''}
            <td class="num">${fmt(monthly)}</td>
            <td class="num" data-floor-actual="${escapeHtml(buildingFloorKey(floor))}">${calculated ? fmt(calculated.weightedRent || calculated.avgRent, 1) : '待计算'}</td>
            <td><button type="button" class="btn btn-ghost btn-sm" data-remove-floor="${i}">${ICONS.trash}</button></td>
          </tr>`;
        }).join('') : `<tr><td colspan="${concessionEnabled ? 12 : 10}" style="text-align:center;padding:26px;color:var(--muted)">尚未添加楼层，点击下方“新增楼层”。</td></tr>`}
      </tbody></table>
    </div>
    <datalist id="building-options">${buildingOptions.map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist>
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
      <div class="insight-card"><span>建筑面积</span><strong>${fmtArea(totalBuilding)}</strong><em>㎡</em></div>
      <div class="insight-card"><span>可租赁面积</span><strong>${fmtArea(totalLease)}</strong><em>㎡</em></div>
      <div class="insight-card"><span>满租月收益</span><strong>${fmt(totalMonthly)}</strong><em>元/月</em></div>
    </div>
    <div class="callout soft">${ICONS.spark}<div>初步测算适合项目拿地、定位和投资机会研判阶段。招商铺位明确后，切换到“一铺一价”，可按楼层均价、业态系数和电梯口、转角铺等条件自动分配单铺租金。</div></div>
  </div>`;
}

function renderFloorRentSummary(preview) {
  const floors = preview?.floors || [];
  if (!floors.length) return '<div class="form-section floor-summary-section"><div class="section-title">楼栋及楼层面积与租金汇总</div><div class="admin-empty">完成楼层或铺位数据后，系统将自动生成统一汇总。</div></div>';
  const total = floors.reduce((acc, floor) => {
    acc.buildingArea += Number(floor.buildingArea || 0);
    acc.leasableArea += Number(floor.leasableArea || 0);
    acc.rentArea += Number(floor.rentArea || 0);
    acc.monthly += Number(floor.monthlyRevenue || 0);
    acc.property += Number(floor.monthlyPropertyFee || 0);
    acc.commercial += Number(floor.monthlyCommercialManagementFee || 0);
    acc.central += Number(floor.monthlyCentralAcFee || 0);
    return acc;
  }, { buildingArea: 0, leasableArea: 0, rentArea: 0, monthly: 0, property: 0, commercial: 0, central: 0 });
  return `<div class="form-section floor-summary-section">
    <div class="section-title">楼栋及楼层面积与租金汇总</div>
    <div class="section-note">按“楼栋 → 楼层”统一汇总面积与租金收入。平均租金按各楼层实际计租面积加权，年租金按满租月租金 × 12 展示。</div>
    <div class="data-table-wrap">
      <table class="data-table floor-summary-table">
        <thead><tr><th>楼栋</th><th>楼层</th><th>计租口径</th><th class="num">建筑面积（㎡）</th><th class="num">实用面积（㎡）</th><th class="num">计租面积（㎡）</th><th class="num">平均租金（元/㎡/月）</th><th class="num">月租金收入（元）</th><th class="num">月物业费（元）</th><th class="num">月商管费（元）</th><th class="num">月空调费（元）</th><th class="num">三费合计（元/月）</th><th class="num">年租金收入（万元）</th><th class="num">租金占比</th></tr></thead>
        <tbody>
          ${floors.map(floor => {
            const basisLabel = floor.rentAreaBasis === 'building' ? '建筑面积' : floor.rentAreaBasis === 'leasable' ? '实用面积' : '混合口径';
            const monthly = Number(floor.monthlyRevenue || 0);
            const property = Number(floor.monthlyPropertyFee || 0);
            const commercial = Number(floor.monthlyCommercialManagementFee || 0);
            const central = Number(floor.monthlyCentralAcFee || 0);
            return `<tr><td><strong>${escapeHtml(floor.building || '1号楼')}</strong></td><td>${escapeHtml(floor.name || '—')}</td><td><span class="tag">${basisLabel}</span></td><td class="num">${fmtArea(floor.buildingArea)}</td><td class="num">${fmtArea(floor.leasableArea)}</td><td class="num">${fmtArea(floor.rentArea)}</td><td class="num">${fmt(floor.weightedRent || floor.avgRent, 1)}</td><td class="num">${fmt(monthly)}</td><td class="num">${fmt(property)}</td><td class="num">${fmt(commercial)}</td><td class="num">${fmt(central)}</td><td class="num"><strong>${fmt(property + commercial + central)}</strong></td><td class="num">${fmt(monthly * 12 / 10000, 1)}</td><td class="num">${fmtPct(total.monthly ? monthly / total.monthly : 0)}</td></tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr><td colspan="3"><strong>项目合计</strong></td><td class="num"><strong>${fmtArea(total.buildingArea)}</strong></td><td class="num"><strong>${fmtArea(total.leasableArea)}</strong></td><td class="num"><strong>${fmtArea(total.rentArea)}</strong></td><td class="num"><strong>${fmt(total.rentArea ? total.monthly / total.rentArea : 0, 1)}</strong></td><td class="num"><strong>${fmt(total.monthly)}</strong></td><td class="num"><strong>${fmt(total.property)}</strong></td><td class="num"><strong>${fmt(total.commercial)}</strong></td><td class="num"><strong>${fmt(total.central)}</strong></td><td class="num"><strong>${fmt(total.property + total.commercial + total.central)}</strong></td><td class="num"><strong>${fmt(total.monthly * 12 / 10000, 1)}</strong></td><td class="num"><strong>100.0%</strong></td></tr></tfoot>
      </table>
    </div>
  </div>`;
}

function renderSettlementBenchmarkPanel(model) {
  const context = settlementBenchmarkContext(model);
  const detection = model.market?.lastAnalysis || {};
  const active = context.presetKey;
  const button = (key, label) => `<button type="button" class="preset benchmark-preset ${active === key ? 'active' : ''}" data-settlement-preset="${key}">${label}</button>`;
  return `<div class="benchmark-card">
    <div class="benchmark-head">
      <div><span class="eyebrow">INDUSTRY BENCHMARK · ${escapeHtml(context.preset.version)}</span><strong>${escapeHtml(context.preset.label)}</strong><small>点击基准只补全销售基数、扣点率和空保底租金，不自动改变项目当前结算方式。</small></div>
      <div class="benchmark-presets">${button('shopping', '购物中心')}${button('department', '百货')}${button('outlet', '奥莱')}</div>
    </div>
    <div class="benchmark-factor-row">
      <span><b>销售修正</b> ×${Number(context.combinedFactor).toFixed(2)}</span>
      <span><b>地区</b> ${escapeHtml(context.location.label)} ×${Number(context.location.factor).toFixed(2)}</span>
      <span><b>商业侦测</b> ${escapeHtml(detection.marketGrade || '未评估')} ×${Number(context.market.factor).toFixed(2)}</span>
      <span><b>竞争</b> ${escapeHtml(detection.competitionLevel || '未评估')}</span>
      <span><b>置信度</b> ${detection.marketGrade ? '中低 · 需本地复核' : '待商业侦测'}</span>
    </div>
    <details class="benchmark-source"><summary>数据来源、算法与使用边界</summary><div><p><strong>当前口径：</strong>${escapeHtml(context.preset.source)}。销售基数按项目地址城市能级和3–5公里商业侦测评分、竞争强度做初步修正；扣点率按业态行业常规区间给参考值。</p><p><strong>重要边界：</strong>当前系统没有接入赢商网、边界猎手等授权租户销售流水数据库，因此这些数值是“行业常规基准＋地区初步修正”，不是当地品牌实测销售大数据。正式招商定价应再用本地竞品、品牌流水、合同扣点和实地访谈校准。</p></div></details>
  </div>`;
}

function renderDetailedPricing(m, shops, preview) {
  const categoryRent = Object.fromEntries((m.categories || []).map(c => [c.name, Number(c.rent || 0)]));
  const filtered = shops.filter(s => !state.shopSearch || `${s.id} ${s.building || ''} ${s.floor} ${s.category} ${s.status} ${(s.conditions || []).join(' ')}`.toLowerCase().includes(state.shopSearch.toLowerCase()));
  const pageSize = Number(state.shopPageSize || 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.shopPage = Math.min(state.shopPage, pageCount);
  const start = (state.shopPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const previewShopMap = new Map((preview?.shops || []).map(shop => [shopRecordKey(shop), shop]));
  const totalBuilding = shops.reduce((sum, shop) => sum + Number(shop.buildingArea || 0), 0);
  const totalLease = shops.reduce((sum, shop) => sum + Number(shop.leasableArea || 0), 0);
  const rentOverrideShops = shops.filter(shop => shop.rentOverride !== null && shop.rentOverride !== undefined && Number(shop.rentOverride) > 0);
  const overrideRentArea = rentOverrideShops.reduce((sum, shop) => sum + rentAreaFor(shop, m), 0);
  const weightedOverrideRent = overrideRentArea > 0
    ? rentOverrideShops.reduce((sum, shop) => sum + Number(shop.rentOverride || 0) * rentAreaFor(shop, m), 0) / overrideRentArea
    : 0;
  const importedStats = state.rentImportStats;
  return `
    <div class="import-zone" id="import-zone">
      <div class="import-icon">${ICONS.upload}</div>
      <div><h3>导入一铺一价电子表格</h3><p>支持 .xlsx、.xlsm、.csv。自动识别楼栋、铺位号、面积、楼层、业态、租金单价、三项费用覆盖单价和铺位条件；元/㎡/天或元/㎡/年会自动换算为月租金。</p></div>
      <div class="import-actions"><button class="btn btn-secondary" id="download-template">${ICONS.download}<span>下载模板</span></button><button class="btn btn-primary" id="choose-file">${ICONS.upload}<span>选择文件</span></button><input type="file" id="shop-file" accept=".xlsx,.xlsm,.csv" hidden></div>
    </div>
    ${state.importWarnings.length ? `<div class="warning-list">${state.importWarnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}</div>` : ''}
    <div class="shop-rent-recognition">
      <div><span>已识别租金单价</span><strong>${rentOverrideShops.length} / ${shops.length}</strong><em>个铺位${importedStats?.rentColumn ? `｜列：${escapeHtml(importedStats.rentColumn)}` : ''}</em></div>
      <div><span>导入租金加权均价</span><strong>${fmt(weightedOverrideRent, 1)}</strong><em>元/㎡/月</em></div>
      <div><span>满租月租金收入</span><strong>${preview ? fmt(preview.summary.totalMonthlyRent) : fmt(0)}</strong><em>元/月</em></div>
      <div><span>满租年租金收入</span><strong>${preview ? fmt(Number(preview.summary.totalMonthlyRent || 0) * 12 / 10000, 1) : '0.0'}</strong><em>万元/年</em></div>
    </div>
    <div class="form-section compact-top">
      <div class="section-title">业态租金 / 联营扣点规则</div>
      <div class="section-note">每个业态可单独选择计租方式。基准面板会给出销售基数、扣点率和保底租金的行业常见区间；当前结算方式为纯租金时，联营条件仅作参考，不进入收入。</div>
      ${renderSettlementBenchmarkPanel(m)}
      ${formulaPanel('一铺一价与联营扣点公式', '保底月收入 = 租赁面积 × 楼层均价 × 业态系数 ×（1 + 位置条件溢价）\n联营扣点月收入 = 租赁面积 × 月销售基数 × 扣点率\n纯租金 = 保底；纯扣点 = 扣点；取高 = MAX(保底, 扣点)', ['MAX', 'IF', 'SUM'], '条件溢价合计最高40%；铺位填写租金覆盖值时，以覆盖值优先。')}
      <div class="data-table-wrap" style="max-height:none"><table class="data-table category-rules-table"><thead><tr><th>业态</th><th>结算方式</th><th class="num">保底租金<br><small>元/㎡/月</small></th><th class="num">${termLabel('销售基数', '销售基数（元/㎡/月）')}<br><small>当前 / 常规区间</small></th><th class="num">${termLabel('扣点率')}<br><small>当前 / 常规区间</small></th><th class="num">扣点收益<br><small>元/㎡/月</small></th><th class="num">业态系数</th></tr></thead><tbody>
        ${(m.categories || []).map((cat, i) => {
          const benchmark = benchmarkForCategory(m, cat.name);
          const commissionPerSqm = Number(cat.salesPerSqmMonth || 0) * Number(cat.concessionRate || 0);
          return `<tr><td><strong>${escapeHtml(cat.name)}</strong><small class="benchmark-row-source">${escapeHtml(benchmark.context.preset.shortLabel)}基准</small></td><td><select class="table-select" data-path="categories.${i}.revenueMode" data-type="text"><option value="inherit" ${cat.revenueMode === 'inherit' ? 'selected' : ''}>继承项目</option><option value="rent" ${cat.revenueMode === 'rent' ? 'selected' : ''}>纯租金</option><option value="concession" ${cat.revenueMode === 'concession' ? 'selected' : ''}>纯联营扣点</option><option value="guarantee_or_concession" ${cat.revenueMode === 'guarantee_or_concession' ? 'selected' : ''}>保底与扣点取高</option></select></td><td class="num"><input class="table-input" data-path="categories.${i}.rent" data-type="number" type="number" step="any" value="${cat.rent ?? 0}"><small class="range-hint">常规 ${fmt(benchmark.rentRange[0], 0)}–${fmt(benchmark.rentRange[1], 0)}</small></td><td class="num"><input class="table-input" data-path="categories.${i}.salesPerSqmMonth" data-type="number" type="number" step="any" value="${cat.salesPerSqmMonth ?? 0}"><small class="range-hint">常规 ${fmt(benchmark.salesRange[0], 0)}–${fmt(benchmark.salesRange[1], 0)}</small></td><td class="num"><input class="table-input" data-path="categories.${i}.concessionRate" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(cat.concessionRate || 0) * 100).toFixed(1)}"><small class="range-hint">常规 ${fmtPct(benchmark.concessionRange[0], 0)}–${fmtPct(benchmark.concessionRange[1], 0)}</small></td><td class="num"><strong>${fmt(commissionPerSqm, 1)}</strong><small class="range-hint">${cat.revenueMode === 'rent' ? '纯租金不参与' : '测算参考'}</small></td><td class="num"><input class="table-input" data-path="categories.${i}.factor" data-type="number" type="number" step="any" value="${cat.factor ?? 1}"></td></tr>`;
        }).join('')}
      </tbody></table></div>
    </div>
    <div class="form-section">
      <div class="section-title">铺位位置条件溢价</div>
      <div class="section-note">勾选启用后，同一铺位可叠加多个条件；条件溢价合计最高按40%封顶。</div>
      ${formulaPanel('位置条件溢价公式', '条件溢价 = MIN(40%, SUM(已启用条件溢价))\n条件调整后租金 = 基准租金 ×（1 + 条件溢价）', ['MIN', 'SUM'], '位置越优，溢价越高；可按项目实际招商策略调整每一项比例。')}
      <div class="condition-grid">
        ${(m.conditionPremiums || []).map((condition, i) => `<div class="condition-item ${condition.enabled ? 'active' : ''}"><label class="condition-toggle"><input type="checkbox" data-path="conditionPremiums.${i}.enabled" data-type="bool" ${condition.enabled ? 'checked' : ''}><span></span></label><input class="condition-name" data-path="conditionPremiums.${i}.name" data-type="text" value="${escapeHtml(condition.name)}"><div class="condition-rate"><input data-path="conditionPremiums.${i}.premium" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(condition.premium || 0) * 100).toFixed(1)}"><span>%</span></div></div>`).join('')}
      </div>
    </div>
    <div class="table-toolbar">
      <div style="position:relative;flex:1;max-width:360px"><input class="input" id="shop-search" placeholder="搜索楼栋、铺位号、楼层、业态或位置条件" value="${escapeHtml(state.shopSearch)}"></div>
      <div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" id="add-shop">${ICONS.plus}<span>新增铺位</span></button>${shops.length ? `<button class="btn btn-danger btn-sm" id="clear-shops">${ICONS.trash}<span>清空</span></button>` : ''}</div>
    </div>
      <div class="data-table-wrap">
      <table class="data-table shop-detail-table"><thead><tr><th>楼栋</th><th>楼层</th><th>铺位号</th><th>计租口径</th><th>业态</th><th>位置条件</th><th>结算方式</th><th class="num">建筑面积</th><th class="num">实用/租赁面积</th><th class="num">租金单价<br><small>元/㎡/月</small></th><th class="num">物业/商管/空调<br><small>元/㎡/月</small></th><th class="num">保底收入</th><th class="num">联营收入</th><th class="num">测算收入</th><th></th></tr></thead><tbody>
        ${pageRows.length ? pageRows.map(shop => {
          const key = shopRecordKey(shop);
          const calc = previewShopMap.get(key);
          const base = calc?.baseRent ?? (categoryRent[shop.category] || 0);
          const modeLabels = { rent:'纯租金', concession:'纯扣点', guarantee_or_concession:'保底/扣点取高' };
          const mode = calc?.settlementMode || (m.categories.find(c => c.name === shop.category)?.revenueMode !== 'inherit' ? m.categories.find(c => c.name === shop.category)?.revenueMode : m.project.revenueModel) || 'rent';
          const rentSource = shop.rentOverride !== null && shop.rentOverride !== undefined && Number(shop.rentOverride) > 0 ? '导入/指定' : '自动分配';
          const feeText = calc ? `物业 ${fmt(calc.propertyFee, 2)} / 商管 ${fmt(calc.commercialManagementFee, 2)} / 空调 ${fmt(calc.centralAcFee, 2)}<small class="rent-source">合计 ${fmt(calc.monthlyServiceFee, 2)} 元/月</small>` : '待计算';
          return `<tr><td>${escapeHtml(shop.building || '1号楼')}</td><td>${escapeHtml(shop.floor || '—')}</td><td><strong>${escapeHtml(shop.id)}</strong></td><td><span class="tag">${escapeHtml(RENT_BASIS_LABELS[resolvedRentAreaBasis(shop, m)])}</span></td><td>${escapeHtml(shop.category)}</td><td>${(shop.conditions || []).length ? shop.conditions.map(c => `<span class="tag condition-tag">${escapeHtml(c)}</span>`).join(' ') : '<span style="color:#a1a7a3">—</span>'}</td><td><span class="tag">${modeLabels[mode] || mode}</span></td><td class="num">${fmtArea(shop.buildingArea)}</td><td class="num">${fmtArea(shop.leasableArea)}</td><td class="num"><strong data-shop-unit-rent="${escapeHtml(key)}">${calc ? fmt(calc.rent, 2) : fmt(shop.rentOverride, 2)}</strong><small class="rent-source">${rentSource}</small></td><td class="num">${feeText}</td><td class="num" data-shop-guarantee="${escapeHtml(key)}">${calc ? fmt(calc.guaranteeRevenue) : '待计算'}</td><td class="num" data-shop-concession="${escapeHtml(key)}">${calc ? fmt(calc.concessionRevenue) : '待计算'}</td><td class="num"><strong data-shop-revenue="${escapeHtml(key)}">${calc ? fmt(calc.monthlyRevenue) : '待计算'}</strong></td><td><button class="btn btn-ghost btn-sm" data-edit-shop="${shops.indexOf(shop)}">编辑</button><button class="btn btn-ghost btn-sm" data-delete-shop="${escapeHtml(key)}">${ICONS.trash}</button></td></tr>`;
        }).join('') : `<tr><td colspan="15" style="text-align:center;padding:36px;color:var(--muted)">尚未导入铺位。点击上方“选择文件”或“新增铺位”。</td></tr>`}
      </tbody></table>
    </div>
    <div class="table-pagination"><button class="btn btn-ghost btn-sm" id="shop-prev" ${state.shopPage <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${state.shopPage} / ${pageCount} 页，共 ${filtered.length} 个铺位，当前显示 ${pageRows.length} 条</span><label class="page-size-control">每页 <select id="shop-page-size">${[50,100,200,500,9999].map(size => `<option value="${size}" ${pageSize === size ? 'selected' : ''}>${size === 9999 ? '全部' : size}</option>`).join('')}</select></label><button class="btn btn-ghost btn-sm" id="shop-next" ${state.shopPage >= pageCount ? 'disabled' : ''}>下一页</button></div>`;
}


const ANNUAL_COMPREHENSIVE_TAX_BRACKETS = [
  [36000, 0.03, 0],
  [144000, 0.10, 2520],
  [300000, 0.20, 16920],
  [420000, 0.25, 31920],
  [660000, 0.30, 52920],
  [960000, 0.35, 85920],
  [Infinity, 0.45, 181920],
];

const ANNUAL_COMPREHENSIVE_TAX_BRACKET_LABELS = [
  ['不超过 36,000', '3%', '0'],
  ['36,000 – 144,000', '10%', '2,520'],
  ['144,000 – 300,000', '20%', '16,920'],
  ['300,000 – 420,000', '25%', '31,920'],
  ['420,000 – 660,000', '30%', '52,920'],
  ['660,000 – 960,000', '35%', '85,920'],
  ['超过 960,000', '45%', '181,920'],
];

function individualIncomeTaxAnnual(taxableIncome) {
  const taxable = Math.max(0, Number(taxableIncome || 0));
  const bracket = ANNUAL_COMPREHENSIVE_TAX_BRACKETS.find(([limit]) => taxable <= limit) || ANNUAL_COMPREHENSIVE_TAX_BRACKETS.at(-1);
  return Math.max(0, taxable * bracket[1] - bracket[2]);
}

function organizationPositionPayroll(position, organization = {}) {
  const headcount = Number(position.headcount || 0);
  const monthlySalary = Number(position.avgMonthlySalary || 0);
  const salaryMonths = Number(organization.annualSalaryMonths ?? 12);
  const employerRate = Number(organization.socialInsuranceRate ?? 0.28);
  const employeeRate = Number(organization.employeeSocialInsuranceRate ?? 0.105);
  const thresholdMonthly = Number(organization.individualIncomeTaxThresholdMonthly ?? 5000);
  const specialDeductionMonthly = Number(organization.specialAdditionalDeductionMonthly ?? 0);
  const grossPerPerson = monthlySalary * salaryMonths;
  const socialInsuranceBaseMonthly = monthlySalary;
  const employeeSocialPerPerson = socialInsuranceBaseMonthly * 12 * employeeRate;
  const employerSocialPerPerson = socialInsuranceBaseMonthly * 12 * employerRate;
  const taxablePerPerson = Math.max(0, grossPerPerson - employeeSocialPerPerson - thresholdMonthly * 12 - specialDeductionMonthly * 12);
  const iitPerPerson = individualIncomeTaxAnnual(taxablePerPerson);
  const grossPayroll = headcount * grossPerPerson / 10000;
  const employeeSocial = headcount * employeeSocialPerPerson / 10000;
  const individualIncomeTax = headcount * iitPerPerson / 10000;
  const employerSocial = headcount * employerSocialPerPerson / 10000;
  return {
    socialInsuranceBaseMonthly,
    grossPayroll,
    employeeSocial,
    individualIncomeTax,
    netSalary: Math.max(0, grossPayroll - employeeSocial - individualIncomeTax),
    employerSocial,
    companyCost: grossPayroll + employerSocial,
  };
}

function organizationPayrollTotals(positions, organization) {
  return (positions || []).reduce((totals, position) => {
    const payroll = organizationPositionPayroll(position, organization);
    totals.grossPayroll += payroll.grossPayroll;
    totals.employeeSocial += payroll.employeeSocial;
    totals.individualIncomeTax += payroll.individualIncomeTax;
    totals.netSalary += payroll.netSalary;
    totals.employerSocial += payroll.employerSocial;
    totals.companyCost += payroll.companyCost;
    return totals;
  }, { grossPayroll: 0, employeeSocial: 0, individualIncomeTax: 0, netSalary: 0, employerSocial: 0, companyCost: 0 });
}

function propertyServiceAnalysis(model) {
  const organization = model.organization || (model.organization = {});
  const serviceConfig = model.propertyService || (model.propertyService = {});
  const recruitmentRate = Number(organization.recruitmentTrainingRate ?? 0.02);
  const buckets = Object.fromEntries(PROPERTY_SERVICE_DEFINITIONS.map(service => [service.key, []]));
  const operationsPositions = [];
  for (const department of organization.departments || []) {
    for (const position of Array.isArray(department.positions) ? department.positions : []) {
      const record = { ...position, department: department.name || '' };
      const text = `${record.department}${record.name || ''}${record.note || ''}`;
      const matched = PROPERTY_SERVICE_DEFINITIONS.find(service => service.keywords.some(keyword => text.includes(keyword)));
      if (matched) buckets[matched.key].push(record);
      else operationsPositions.push(record);
    }
  }
  const records = PROPERTY_SERVICE_DEFINITIONS.map(service => {
    const positions = buckets[service.key];
    const payroll = organizationPayrollTotals(positions, organization);
    const config = serviceConfig[service.key] || (serviceConfig[service.key] = {});
    if (config.mode == null) config.mode = 'self';
    if (config.nonResidentFactor == null) config.nonResidentFactor = 0.70;
    if (config.managementFeeRate == null) config.managementFeeRate = 0.12;
    const mode = PROPERTY_SERVICE_MODE_OPTIONS.some(option => option.value === config.mode) ? config.mode : 'self';
    const nonResidentFactor = Math.min(1, Math.max(0, Number(config.nonResidentFactor ?? 0.70)));
    const managementFeeRate = Math.max(0, Number(config.managementFeeRate ?? 0.12));
    const positionFactor = mode === 'non_resident' ? nonResidentFactor : 1;
    const positionCostAfterFactor = payroll.companyCost * positionFactor;
    const managementFee = ['resident_outsourced', 'non_resident'].includes(mode) ? positionCostAfterFactor * managementFeeRate : 0;
    const selfRecruitmentTraining = mode === 'self' ? payroll.companyCost * recruitmentRate : 0;
    return {
      key: service.key,
      name: service.name,
      mode,
      modeLabel: PROPERTY_SERVICE_MODE_OPTIONS.find(option => option.value === mode)?.label || mode,
      headcount: positions.reduce((sum, position) => sum + Number(position.headcount || 0), 0),
      positions: positions.map(position => position.name || '未命名岗位'),
      basePositionCost: payroll.companyCost,
      nonResidentFactor,
      positionFactor,
      managementFeeRate,
      positionCostAfterFactor,
      managementFee,
      selfRecruitmentTraining,
      serviceCost: positionCostAfterFactor + managementFee + selfRecruitmentTraining,
    };
  });
  const operationsPayroll = organizationPayrollTotals(operationsPositions, organization);
  const operationsRecruitmentTraining = operationsPayroll.companyCost * recruitmentRate;
  const servicePositionBaseCost = records.reduce((sum, record) => sum + record.basePositionCost, 0);
  const outsourcedManagementFee = records.reduce((sum, record) => sum + record.managementFee, 0);
  const selfServiceRecruitment = records.reduce((sum, record) => sum + record.selfRecruitmentTraining, 0);
  const serviceTotal = records.reduce((sum, record) => sum + record.serviceCost, 0);
  const organizationFullCost = operationsPayroll.companyCost + servicePositionBaseCost + (operationsPayroll.companyCost + servicePositionBaseCost) * recruitmentRate;
  const totalActiveStaffCost = operationsPayroll.companyCost + operationsRecruitmentTraining + serviceTotal;
  return {
    records,
    operationsTeamCost: operationsPayroll.companyCost,
    operationsRecruitmentTraining,
    servicePositionBaseCost,
    outsourcedManagementFee,
    selfServiceRecruitment,
    serviceTotal,
    organizationFullCost,
    activeRecruitmentTrainingCost: operationsRecruitmentTraining + selfServiceRecruitment,
    totalActiveStaffCost,
    staffCostMode: model.operations?.staffCostMode || 'organization',
  };
}

function renderOperatingBudgetImport() {
  return `<div class="form-section budget-import-section">
    <div class="section-title">Excel 运营成本预算导入</div>
    <div class="section-note">可下载标准模板，填写基础参数、组织架构、物业服务模式、办公预算、招商预算、营销金额和维保预算后一次性导入。权重由系统自动计算。</div>
    <div class="import-zone" id="budget-import-zone">
      <div class="import-icon">${ICONS.excel}</div>
      <div><h3>运营成本预算模板</h3><p>支持 .xlsx、.xlsm。金额单位为万元/年，工资单位为元/月，比例按百分数填写。</p></div>
      <div class="import-actions"><button class="btn btn-secondary" id="download-budget-template">${ICONS.download}<span>下载模板</span></button><button class="btn btn-primary" id="choose-budget-file">${ICONS.upload}<span>导入预算</span></button><input type="file" id="budget-file" accept=".xlsx,.xlsm" hidden></div>
    </div>
    ${state.budgetWarnings.length ? `<div class="warning-list">${state.budgetWarnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}</div>` : ''}
  </div>`;
}

function renderOrganizationSection(model, preview) {
  const organization = model.organization || (model.organization = {});
  if (organization.socialInsuranceRate == null) organization.socialInsuranceRate = 0.28;
  if (organization.employeeSocialInsuranceRate == null) organization.employeeSocialInsuranceRate = 0.105;
  if (organization.individualIncomeTaxThresholdMonthly == null) organization.individualIncomeTaxThresholdMonthly = 5000;
  if (organization.specialAdditionalDeductionMonthly == null) organization.specialAdditionalDeductionMonthly = 0;
  const departments = organization.departments || (organization.departments = []);
  const payrollLocation = String(model.project?.location || '项目所在地').trim();
  const allPositions = departments.flatMap(dept => {
    const positions = Array.isArray(dept.positions) ? dept.positions : [];
    return positions.length ? positions : [dept];
  });
  const headcount = allPositions.reduce((sum, position) => sum + Number(position.headcount || 0), 0);
  const payrollTotals = organizationPayrollTotals(allPositions, organization);
  const recruitmentTraining = payrollTotals.companyCost * Number(organization.recruitmentTrainingRate || 0);
  const annualCost = payrollTotals.companyCost + recruitmentTraining;
  return `<div class="form-section budget-section">
    <div class="section-title">组织架构、岗位与人员成本</div>
    <div class="section-note">按“部门 → 岗位”两级维护组织架构。表格第二列提供“新增岗位 / 删除岗位 / 删除部门”操作；岗位月薪是税前应发基本工资，系统据此计算税前年度工资、个人和单位社保公积金、个人所得税、实发工资及企业人员成本。</div>
    ${formulaPanel('岗位工资、个税与社保公式', '税前年度工资 = Σ(岗位编制人数 × 税前应发月薪 × 年度薪资月数)\n个人社保公积金 = Σ(税前应发月薪 × 12 × 个人社保公积金比例)\n单位社保公积金 = Σ(税前应发月薪 × 12 × 单位社保公积金比例)\n年度应纳税所得额（每人）= 税前年度工资 - 个人社保公积金 - 个税起征点×12 - 专项附加扣除×12\n个人所得税 = MAX(0, 应纳税所得额 × 适用税率 - 速算扣除数)\n实发工资 = 税前年度工资 - 个人社保公积金 - 个人所得税\n企业人员成本 = 税前年度工资 + 单位社保公积金\n含招聘培训人员成本 = 企业人员成本 + 招聘培训费', ['SUM','MAX','IF'], '12/13/15薪影响年度应税工资，但社保公积金按每月缴费基数缴纳12个月。当前以税前月薪作为月缴费基数；社保、公积金比例和缴费基数上下限必须按项目属地最新政策及员工实际情况调整。')}
    <div class="callout soft payroll-caliber-note">${ICONS.info}<div><strong>当前为“税前应发工资”口径。</strong>项目位置：${escapeHtml(payrollLocation)}。默认单位社保公积金 ${fmtPct(Number(organization.socialInsuranceRate || 0))}、个人社保公积金 ${fmtPct(Number(organization.employeeSocialInsuranceRate || 0))} 仅为测算参考，不能视为当地法定统一比例。个税按中国综合所得七级年度超额累进税率估算；实际应以项目属地缴费基数上下限、险种明细、公积金政策和年度汇算为准。</div></div>
    <div class="form-grid">
      ${textField('单位社保公积金比例', 'organization.socialInsuranceRate', { type: 'number', unit: '%', scale: 0.01, help: '单位承担的养老、医疗、失业、工伤、生育及公积金综合比例' })}
      ${textField('个人社保公积金比例', 'organization.employeeSocialInsuranceRate', { type: 'number', unit: '%', scale: 0.01, help: '从员工税前工资中代扣的个人部分' })}
      ${textField('年度薪资月数', 'organization.annualSalaryMonths', { type: 'number', unit: '薪/年', help: '常用12薪、13薪、14薪、15薪' })}
      ${textField('个税起征点', 'organization.individualIncomeTaxThresholdMonthly', { type: 'number', unit: '元/月', help: '中国综合所得基本减除费用通常为5000元/月' })}
      ${textField('专项附加扣除', 'organization.specialAdditionalDeductionMonthly', { type: 'number', unit: '元/人/月', help: '子女教育、住房贷款/租金、赡养老人等平均月扣除额' })}
      ${textField('招聘培训费率', 'organization.recruitmentTrainingRate', { type: 'number', unit: '%', scale: 0.01 })}
    </div>
    <details class="advanced payroll-tax-details">
      <summary>个人所得税七级税率表（年度综合所得）<span>查看税率、速算扣除数及计算方式</span></summary>
      <div class="data-table-wrap" style="max-height:none">
        <table class="data-table payroll-tax-table">
          <thead><tr><th>年度应纳税所得额（元）</th><th class="num">税率</th><th class="num">速算扣除数（元）</th></tr></thead>
          <tbody>${ANNUAL_COMPREHENSIVE_TAX_BRACKET_LABELS.map(([range, rate, deduction]) => `<tr><td>${escapeHtml(range)}</td><td class="num">${escapeHtml(rate)}</td><td class="num">${escapeHtml(deduction)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="section-note">个人所得税 = 年度应纳税所得额 × 适用税率 - 速算扣除数。税率表按中国居民个人综合所得年度税率展示；系统用于年度投资测算，正式申报以累计预扣预缴和年度汇算结果为准。</div>
    </details>
    <div class="org-structure-tools"><span>部门操作：新增部门；岗位操作：在对应部门行点击“新增岗位”，在岗位行点击“删除岗位”。</span><button class="btn btn-secondary btn-sm" type="button" data-add-department>${ICONS.plus}<span>新增部门</span></button></div>
    <div class="data-table-wrap budget-table-wrap org-structure-wrap">
      <table class="data-table budget-table org-structure-table"><thead><tr><th>部门 / 岗位</th><th class="org-actions">操作</th><th class="num">编制人数</th><th class="num">税前应发月薪（元）</th><th class="num">税前年度工资（万元）</th><th class="num">个人社保公积金（万元）</th><th class="num">个人所得税（万元）</th><th class="num">实发工资（万元）</th><th class="num">单位社保公积金（万元）</th><th class="num">企业人员成本（万元）</th><th>岗位职责说明</th></tr></thead><tbody>
        ${departments.map((dept, i) => {
          const positions = Array.isArray(dept.positions) ? dept.positions : [];
          const deptHeadcount = positions.reduce((sum, position) => sum + Number(position.headcount || 0), 0);
          const deptSalaryArea = positions.reduce((sum, position) => sum + Number(position.headcount || 0) * Number(position.avgMonthlySalary || 0), 0);
          const deptAvgSalary = deptHeadcount ? deptSalaryArea / deptHeadcount : 0;
          const deptPayroll = organizationPayrollTotals(positions.length ? positions : [dept], organization);
          return `<tr class="org-department-row">
            <td><span class="org-level-tag">部门</span><input class="table-input text-left" data-path="organization.departments.${i}.name" data-type="text" value="${escapeHtml(dept.name || '')}"></td>
            <td class="org-actions"><button class="btn btn-secondary btn-sm" type="button" data-add-position="${i}">${ICONS.plus}<span>新增岗位</span></button><button class="btn btn-ghost btn-sm danger-text" type="button" data-remove-department="${i}">${ICONS.trash}<span>删除部门</span></button></td>
            <td class="num"><strong>${fmt(deptHeadcount)}</strong></td>
            <td class="num"><strong>${fmt(deptAvgSalary, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="grossPayroll">${fmt(deptPayroll.grossPayroll, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="employeeSocialInsurance">${fmt(deptPayroll.employeeSocial, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="individualIncomeTax">${fmt(deptPayroll.individualIncomeTax, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="netSalary">${fmt(deptPayroll.netSalary, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="employerSocialInsurance">${fmt(deptPayroll.employerSocial, 2)}</strong></td>
            <td class="num"><strong data-payroll-dept="${i}" data-payroll-field="annualCost">${fmt(deptPayroll.companyCost, 2)}</strong></td>
            <td><input class="table-input text-left" data-path="organization.departments.${i}.note" data-type="text" value="${escapeHtml(dept.note || '')}"></td>
          </tr>
          ${positions.map((position, j) => { const payroll = organizationPositionPayroll(position, organization); return `<tr class="org-position-row">
            <td><span class="org-position-branch">└ 岗位</span><input class="table-input text-left" data-path="organization.departments.${i}.positions.${j}.name" data-type="text" value="${escapeHtml(position.name || '')}"></td>
            <td class="org-actions"><button class="btn btn-ghost btn-sm danger-text" type="button" data-remove-position="${i}" data-position-index="${j}">${ICONS.trash}<span>删除岗位</span></button></td>
            <td class="num"><input class="table-input" data-path="organization.departments.${i}.positions.${j}.headcount" data-type="number" type="number" step="1" value="${position.headcount ?? 0}"></td>
            <td class="num"><input class="table-input" data-path="organization.departments.${i}.positions.${j}.avgMonthlySalary" data-type="number" type="number" step="100" value="${position.avgMonthlySalary ?? 0}"></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="grossPayroll">${fmt(payroll.grossPayroll, 2)}</strong></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="employeeSocialInsurance">${fmt(payroll.employeeSocial, 2)}</strong></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="individualIncomeTax">${fmt(payroll.individualIncomeTax, 2)}</strong></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="netSalary">${fmt(payroll.netSalary, 2)}</strong></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="employerSocialInsurance">${fmt(payroll.employerSocial, 2)}</strong></td>
            <td class="num"><strong data-payroll-position="${i}:${j}" data-payroll-field="annualCost">${fmt(payroll.companyCost, 2)}</strong></td>
            <td><input class="table-input text-left" data-path="organization.departments.${i}.positions.${j}.note" data-type="text" value="${escapeHtml(position.note || '')}"></td>
          </tr>`; }).join('')}
        `; }).join('') || '<tr><td colspan="11" class="empty-table-cell">尚未设置部门和岗位</td></tr>'}
      </tbody></table>
    </div>
    <div class="payroll-summary-grid">
      <div><span>合计编制</span><strong data-payroll-summary="stableHeadcount">${fmt(headcount)}</strong><em>人</em></div>
      <div><span>税前年度工资</span><strong data-payroll-summary="annualGrossPayroll">${fmt(payrollTotals.grossPayroll, 2)}</strong><em>万元</em></div>
      <div><span>个人社保公积金</span><strong data-payroll-summary="annualEmployeeSocialInsurance">${fmt(payrollTotals.employeeSocial, 2)}</strong><em>万元</em></div>
      <div><span>个人所得税</span><strong data-payroll-summary="annualIndividualIncomeTax">${fmt(payrollTotals.individualIncomeTax, 2)}</strong><em>万元</em></div>
      <div><span>员工实发工资</span><strong data-payroll-summary="annualNetPayroll">${fmt(payrollTotals.netSalary, 2)}</strong><em>万元</em></div>
      <div><span>单位社保公积金</span><strong data-payroll-summary="annualEmployerSocialInsurance">${fmt(payrollTotals.employerSocial, 2)}</strong><em>万元</em></div>
      <div><span>企业人员成本</span><strong data-payroll-summary="companyCost">${fmt(payrollTotals.companyCost, 2)}</strong><em>万元</em></div>
      <div class="highlight"><span>组织架构全口径成本</span><strong data-payroll-summary="organizationFullCost">${fmt(annualCost, 2)}</strong><em>万元</em></div>
    </div>
    <div class="budget-toolbar"><button class="btn btn-secondary btn-sm" id="add-department" type="button">${ICONS.plus}<span>新增部门</span></button><span>组织架构招聘培训费 <strong data-payroll-summary="organizationRecruitmentTrainingCost">${fmt(recruitmentTraining, 2)}</strong> 万元｜${model.operations?.staffCostMode === 'area' ? '当前未用于成本测算' : '物业服务模式及第三方管理费在下方单独核算'}</span></div>
  </div>`;
}

function renderPropertyServiceSection(model, preview) {
  const analysis = propertyServiceAnalysis(model);
  const staffMode = analysis.staffCostMode;
  return `<div class="form-section budget-section property-service-section">
    <div class="section-title">物业服务模式、岗位成本与第三方管理费</div>
    <div class="section-note">系统自动把“物业工程、保安、保洁”相关岗位归入对应服务。三种模式都先按岗位核算企业人员成本，再根据服务模式增加自营招聘培训费或第三方综合管理费。</div>
    ${formulaPanel('物业服务模式与岗位成本公式', '岗位基础成本 = Σ(岗位税前年度工资 + 单位社保公积金)\n自营服务成本 = 岗位基础成本 + 自营招聘培训费\n第三方常驻外包 = 岗位基础成本 ×（1 + 第三方综合管理费率）\n第三方非常驻服务 = 岗位基础成本 × 非驻场折算比例 ×（1 + 第三方综合管理费率）\n实际人员及服务成本 = 管理团队成本 + 管理团队招聘培训 + Σ各类服务成本', ['IF','SUM','MIN'], '第三方综合管理费率建议包含管理费、利润、保险、服装装备、培训、税费等全部合同费用。非驻场折算比例按现场服务频次、覆盖时长和岗位配置确定；自营模式不使用第三方费率。')}
    <div class="property-service-mode-guide">
      <div><strong>自营</strong><span>自行招聘岗位，承担工资、社保、个税及招聘培训。</span></div>
      <div><strong>第三方常驻外包</strong><span>物业公司长期驻场，岗位成本基础上增加综合管理费。</span></div>
      <div><strong>第三方非常驻服务</strong><span>按巡检或专项服务配置，岗位成本先按非驻场比例折算。</span></div>
    </div>
    ${staffMode === 'area' ? `<div class="warning-item">当前“人员成本来源”选择了按面积快速估算，物业服务模式仅作为方案参考，不进入本次人员成本核算。切换为按组织架构薪资倒推后生效。</div>` : ''}
    <div class="property-service-items">${analysis.records.map(record => `<div class="property-service-item" data-service-key="${record.key}">
      <div class="property-service-item-head"><div><strong>${escapeHtml(record.name)}</strong><div class="service-position-tags">${record.positions.length ? record.positions.map(name => `<span class="tag">${escapeHtml(name)}</span>`).join('') : '<span class="service-empty">未匹配到岗位</span>'}</div></div><span class="service-headcount" data-service-headcount>${fmt(record.headcount)}人</span></div>
      <div class="property-service-form-grid">
        <label class="service-control"><span>服务模式</span><select class="table-select service-mode-select" data-path="propertyService.${record.key}.mode" data-type="text">${PROPERTY_SERVICE_MODE_OPTIONS.map(option => `<option value="${option.value}" ${record.mode === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label>
        <label class="service-control"><span>非驻场折算比例</span><div class="input-affix compact"><input class="table-input" data-path="propertyService.${record.key}.nonResidentFactor" data-type="number" data-scale="0.01" type="number" step="1" value="${roundDisplayValue(record.nonResidentFactor * 100, 2)}"><span>%</span></div></label>
        <label class="service-control"><span>第三方综合管理费率</span><div class="input-affix compact"><input class="table-input" data-path="propertyService.${record.key}.managementFeeRate" data-type="number" data-scale="0.01" type="number" step="1" value="${roundDisplayValue(record.managementFeeRate * 100, 2)}"><span>%</span></div></label>
        <div class="service-metric"><span>岗位基础成本</span><strong data-service-field="basePositionCost">${fmt(record.basePositionCost, 2)}</strong><em>万元</em></div>
        <div class="service-metric"><span>第三方管理费</span><strong data-service-field="managementFee">${fmt(record.managementFee, 2)}</strong><em>万元</em></div>
        <div class="service-metric highlight"><span>年度服务成本</span><strong data-service-field="serviceCost">${fmt(record.serviceCost, 2)}</strong><em>万元</em><small data-service-cost-note>${record.mode === 'self' ? '含自营招聘培训' : record.mode === 'non_resident' ? '已按非驻场折算' : '含第三方管理费'}</small></div>
      </div>
    </div>`).join('')}</div>
    <div class="property-service-summary">
      <div><span>自动归类岗位基础成本</span><strong data-service-summary="servicePositionBaseCost">${fmt(analysis.servicePositionBaseCost, 2)}</strong><em>万元</em></div>
      <div><span>第三方综合管理费</span><strong data-service-summary="outsourcedManagementFee">${fmt(analysis.outsourcedManagementFee, 2)}</strong><em>万元</em></div>
      <div><span>自营招聘培训费</span><strong data-service-summary="selfServiceRecruitment">${fmt(analysis.selfServiceRecruitment, 2)}</strong><em>万元</em></div>
      <div><span>年度物业服务总成本</span><strong data-service-summary="serviceTotal">${fmt(analysis.serviceTotal, 2)}</strong><em>万元</em></div>
      <div class="highlight"><span>实际人员及服务成本</span><strong data-service-summary="totalActiveStaffCost">${fmt(analysis.totalActiveStaffCost, 2)}</strong><em>万元</em></div>
    </div>
    <div class="budget-toolbar"><span>岗位归类规则：部门或岗位名称包含“物业/工程/消防/强弱电/暖通/机电”归入物业工程；包含“保安/秩序维护/监控”归入保安；包含“保洁/环境卫生/垃圾清运”归入保洁。</span></div>
  </div>`;
}

function projectGrossBuildingArea(model) {
  const project = model?.project || {};
  const floors = model?.floors || [];
  const shops = model?.shops || [];
  return Number(project.gbaOverride || 0)
    || floors.reduce((sum, floor) => sum + Number(floor.buildingArea || 0), 0)
    || shops.reduce((sum, shop) => sum + Number(shop.buildingArea || 0), 0) * (1 + Number(project.commonAreaFactor || 0));
}

function estimatedProjectAverageRent(model, preview) {
  const previewRent = Number(preview?.summary?.averageRent || 0);
  if (previewRent > 0) return previewRent;
  const categoryRent = new Map((model.categories || []).map(item => [item.name, Number(item.rent || 0)]));
  const shops = model.shops || [];
  if (shops.length) {
    let area = 0;
    let rentValue = 0;
    shops.forEach(shop => {
      const basis = resolvedRentAreaBasis(shop, model);
      const shopArea = basis === 'building' ? Number(shop.buildingArea || 0) : Number(shop.leasableArea || 0);
      const rent = shop.rentOverride != null && Number(shop.rentOverride) > 0 ? Number(shop.rentOverride) : Number(categoryRent.get(shop.category) || 0);
      area += shopArea;
      rentValue += shopArea * rent;
    });
    if (area > 0 && rentValue > 0) return rentValue / area;
  }
  let floorArea = 0;
  let floorRentValue = 0;
  (model.floors || []).forEach(floor => {
    const basis = resolvedRentAreaBasis(floor, model);
    const area = basis === 'building' ? Number(floor.buildingArea || 0) : Number(floor.leasableArea || 0);
    floorArea += area;
    floorRentValue += area * Number(floor.avgRent || 0);
  });
  return floorArea > 0 ? floorRentValue / floorArea : 0;
}

function leasingBudgetAnalysis(model, preview) {
  const leasing = model.leasingBudget || (model.leasingBudget = {});
  const channelMode = leasing.channelCalculationMode === 'area_rent' ? 'area_rent' : 'amount';
  const areaRatio = Math.min(1, Math.max(0, Number(leasing.channelAreaRatio ?? 0.50)));
  const gba = projectGrossBuildingArea(model);
  const channelArea = gba * areaRatio;
  const averageRent = estimatedProjectAverageRent(model, preview);
  const rentOverride = Math.max(0, Number(leasing.channelRentPerSqmMonth || 0));
  const referenceRent = rentOverride > 0 ? rentOverride : averageRent;
  const commissionMonths = Math.max(0, Number(leasing.channelCommissionMonths ?? 1));
  const areaFormulaFee = channelArea * referenceRent * commissionMonths / 10000;
  const channelFeeAnnual = channelMode === 'area_rent' ? areaFormulaFee : Math.max(0, Number(leasing.channelFeeAnnual || 0));
  const otherAnnual = ['eventsAnnual', 'materialsAnnual', 'travelAnnual', 'platformAnnual', 'otherAnnual']
    .reduce((sum, key) => sum + Math.max(0, Number(leasing[key] || 0)), 0);
  return {
    channelMode,
    areaRatio,
    gba,
    channelArea,
    averageRent,
    referenceRent,
    commissionMonths,
    areaFormulaFee,
    channelFeeAnnual,
    monthlyChannelFee: channelFeeAnnual / 12,
    totalAnnual: channelFeeAnnual + otherAnnual,
  };
}

function budgetInputPeriod(container, key) {
  return container?.inputPeriods?.[key] === 'monthly' ? 'monthly' : 'annual';
}

function budgetPeriodAmount(annualAmount, period) {
  return period === 'monthly' ? Number(annualAmount || 0) / 12 : Number(annualAmount || 0);
}

function budgetPeriodOptions(selected) {
  return `<option value="annual" ${selected === 'annual' ? 'selected' : ''}>按年录入</option><option value="monthly" ${selected === 'monthly' ? 'selected' : ''}>按月录入</option>`;
}

function renderOfficeBudgetSection(model) {
  const officeBudget = model.officeBudget || (model.officeBudget = {});
  officeBudget.inputPeriods ||= {};
  const items = [
    { label: '办公室租金', key: 'officeRentAnnual', note: '办公室、办公场地及配套租金' },
    { label: '水电及通讯费', key: 'utilitiesAnnual', note: '办公水电、网络、电话及邮寄' },
    { label: 'IT及软件服务', key: 'itSoftwareAnnual', note: '商管、财务、会员及协同办公系统' },
    { label: '办公用品', key: 'officeSuppliesAnnual', note: '耗材、打印、日常办公采购' },
    { label: '差旅及业务招待', key: 'travelEntertainmentAnnual', note: '差旅、接待、业务拓展' },
    { label: '其他办公费用', key: 'otherAnnual', note: '培训、团建及其他行政支出' },
  ];
  const total = items.reduce((sum, item) => sum + Number(officeBudget[item.key] || 0), 0);
  return `<div class="form-section budget-section">
    <div class="section-title">办公及行政费用</div>
    <div class="section-note">每项可选择“按年录入”或“按月录入”。系统统一换算为年度金额进入成本测算，同时展示月度金额；自动权重按年化金额计算。</div>
    ${formulaPanel('办公及行政费用月度/年度换算公式', '按年录入：月度金额 = 录入金额 ÷ 12；年度金额 = 录入金额\n按月录入：年度金额 = 录入金额 × 12；月度金额 = 录入金额\n办公行政成本 = 办公室租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他办公费用\n自动权重 = 单项年度金额 ÷ 办公行政成本合计', ['SUM','IF'], '同一项目可以混合使用年度和月度录入。切换周期只改变显示口径，不改变已存的年化总额；随后重新输入金额才会改年化值。')}
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table budget-period-table" data-share-table><thead><tr><th>费用项目</th><th>录入周期</th><th class="num">录入金额（万元/期）</th><th class="num">月度金额（万元/月）</th><th class="num">年度金额（万元/年）</th><th class="num">自动权重</th><th>费用内容</th></tr></thead><tbody>
        ${items.map(item => {
          const annual = Number(officeBudget[item.key] || 0);
          const period = budgetInputPeriod(officeBudget, item.key);
          const entered = budgetPeriodAmount(annual, period);
          return `<tr data-annualized-row data-annual-value="${annual}"><td><strong>${escapeHtml(item.label)}</strong><small class="cost-method-label">金额录入 · 年/月换算</small></td><td><select class="table-select period-select" data-path="officeBudget.inputPeriods.${item.key}" data-type="text" data-budget-period="true">${budgetPeriodOptions(period)}</select></td><td class="num"><input class="table-input" data-path="officeBudget.${item.key}" data-type="number" data-annualize="true" data-period-path="officeBudget.inputPeriods.${item.key}" type="number" step="0.01" value="${roundDisplayValue(entered, 2)}"></td><td class="num"><strong data-budget-monthly>${fmt(annual / 12, 2)}</strong></td><td class="num"><strong data-budget-annual>${fmt(annual, 2)}</strong></td><td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(total > 0 ? annual / total : 0)}</span></td><td>${escapeHtml(item.note)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><span>办公及行政费用合计</span><span><strong data-share-total>${fmt(total, 2)}</strong> 万元/年｜月均 <strong data-budget-total-monthly>${fmt(total / 12, 2)}</strong> 万元/月</span></div>
  </div>`;
}

function renderLeasingBudgetSection(model, preview) {
  const leasingBudget = model.leasingBudget || (model.leasingBudget = {});
  leasingBudget.inputPeriods ||= {};
  const channel = leasingBudgetAnalysis(model, preview);
  const items = [
    { label: '渠道及代理费', key: 'channelFeeAnnual', note: '渠道佣金、代理服务及品牌推荐' },
    { label: '招商活动', key: 'eventsAnnual', note: '招商推介会、品牌对接及路演' },
    { label: '招商物料', key: 'materialsAnnual', note: '招商手册、效果图、视频和印刷物料' },
    { label: '招商差旅', key: 'travelAnnual', note: '品牌拜访、项目考察及差旅' },
    { label: '招商平台及系统', key: 'platformAnnual', note: '招商数据库、线上平台及系统服务' },
    { label: '其他招商费用', key: 'otherAnnual', note: '其他年度招商专项支出' },
  ];
  const total = channel.totalAnnual;
  const channelPeriod = budgetInputPeriod(leasingBudget, 'channelFeeAnnual');
  const channelEntered = budgetPeriodAmount(Number(leasingBudget.channelFeeAnnual || 0), channelPeriod);
  return `<div class="form-section budget-section">
    <div class="section-title">年度招商费用预算</div>
    <div class="section-note">招商费用可按年或按月录入。渠道及代理费还支持按“渠道招商面积 × 首年月租金 × 月租金倍数”核算；首开招商佣金已在项目投资中单列，如本表为同一笔合同，请勿重复计入。</div>
    ${formulaPanel('招商费用、月度/年度换算与渠道面积佣金公式', '按年录入：月度金额 = 录入金额 ÷ 12；年度金额 = 录入金额\n按月录入：年度金额 = 录入金额 × 12；月度金额 = 录入金额\n渠道招商面积 = 项目总建筑面积 × 渠道招商面积比例\n渠道及代理费 = 渠道招商面积 × 首年月租金单价 × 月租金倍数 ÷ 10000\n招商费用 = 渠道代理费 + 招商活动 + 招商物料 + 招商差旅 + 招商平台系统 + 其他\n自动权重 = 单项年度金额 ÷ 年度招商预算合计', ['SUM','IF','MOD'], '渠道面积比例按项目总建筑面积设置；首年月租金单价填0时自动采用项目当前平均月租金。月租金倍数示例：1倍=1个月租金，1.5倍=1.5个月租金。')}
    <div class="channel-calculation-card">
      <div class="channel-calculation-head"><div><strong>渠道及代理费核算方式</strong><span>按金额直接录入，或按渠道面积和首年月租金自动计算</span></div><select class="select" data-path="leasingBudget.channelCalculationMode" data-type="text" data-channel-mode="true"><option value="amount" ${channel.channelMode === 'amount' ? 'selected' : ''}>直接按金额录入</option><option value="area_rent" ${channel.channelMode === 'area_rent' ? 'selected' : ''}>按渠道面积×首年月租金×倍数</option></select></div>
      ${channel.channelMode === 'area_rent' ? `<div class="channel-calculation-grid">
        <label class="service-control"><span>渠道招商面积比例</span><div class="input-affix compact"><input class="table-input" data-path="leasingBudget.channelAreaRatio" data-type="number" data-scale="0.01" type="number" step="1" value="${roundDisplayValue(channel.areaRatio * 100, 2)}"><span>%</span></div></label>
        <label class="service-control"><span>首年月租金单价（0=自动）</span><div class="input-affix compact"><input class="table-input" data-path="leasingBudget.channelRentPerSqmMonth" data-type="number" type="number" step="0.01" value="${roundDisplayValue(Number(leasingBudget.channelRentPerSqmMonth || 0), 2)}"><span>元/㎡/月</span></div></label>
        <label class="service-control"><span>首年月租金倍数</span><div class="input-affix compact"><input class="table-input" data-path="leasingBudget.channelCommissionMonths" data-type="number" type="number" step="0.1" value="${roundDisplayValue(Number(leasingBudget.channelCommissionMonths ?? 1), 2)}"><span>个月</span></div></label>
      </div>
      <div class="channel-calculation-results">
        <div><span>项目总建筑面积</span><strong data-channel-field="gba">${fmtArea(channel.gba)}</strong><em>㎡</em></div>
        <div><span>渠道招商面积</span><strong data-channel-field="channelArea">${fmtArea(channel.channelArea)}</strong><em>㎡</em></div>
        <div><span>采用首年月租金</span><strong data-channel-field="referenceRent">${fmt(channel.referenceRent, 2)}</strong><em>元/㎡/月</em></div>
        <div class="highlight"><span>渠道及代理费</span><strong data-channel-field="channelFeeAnnual">${fmt(channel.channelFeeAnnual, 2)}</strong><em>万元/年</em></div>
      </div>` : `<div class="channel-amount-mode-note">当前按直接金额核算。可在下方渠道及代理费行选择年度或月度录入，系统自动换算月度和年度金额。</div>`}
    </div>
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table budget-period-table" data-share-table><thead><tr><th>费用项目</th><th>录入周期</th><th class="num">录入金额（万元/期）</th><th class="num">月度金额（万元/月）</th><th class="num">年度金额（万元/年）</th><th class="num">自动权重</th><th>费用内容</th></tr></thead><tbody>
        ${items.map(item => {
          if (item.key === 'channelFeeAnnual') {
            const enteredCell = channel.channelMode === 'area_rent'
              ? `<strong data-lease-channel-amount>${fmt(channel.channelFeeAnnual, 2)}</strong><small class="table-subnote">按面积公式自动计算</small>`
              : `<input class="table-input" data-path="leasingBudget.channelFeeAnnual" data-type="number" data-annualize="true" data-period-path="leasingBudget.inputPeriods.channelFeeAnnual" type="number" step="0.01" value="${roundDisplayValue(channelEntered, 2)}">`;
            return `<tr data-annualized-row data-channel-row data-annual-value="${channel.channelFeeAnnual}"><td><strong>${escapeHtml(item.label)}</strong><small class="cost-method-label">${channel.channelMode === 'area_rent' ? '渠道面积 × 首年月租金 × 倍数' : '金额录入 · 年/月换算'}</small></td><td>${channel.channelMode === 'area_rent' ? '<span class="formula-period-tag">面积公式</span>' : `<select class="table-select period-select" data-path="leasingBudget.inputPeriods.channelFeeAnnual" data-type="text" data-budget-period="true">${budgetPeriodOptions(channelPeriod)}</select>`}</td><td class="num">${enteredCell}</td><td class="num"><strong data-budget-monthly>${fmt(channel.channelFeeAnnual / 12, 2)}</strong></td><td class="num"><strong data-budget-annual>${fmt(channel.channelFeeAnnual, 2)}</strong></td><td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(total > 0 ? channel.channelFeeAnnual / total : 0)}</span></td><td>${escapeHtml(item.note)}</td></tr>`;
          }
          const annual = Number(leasingBudget[item.key] || 0);
          const period = budgetInputPeriod(leasingBudget, item.key);
          const entered = budgetPeriodAmount(annual, period);
          return `<tr data-annualized-row data-annual-value="${annual}"><td><strong>${escapeHtml(item.label)}</strong><small class="cost-method-label">预算金额 · 年/月换算</small></td><td><select class="table-select period-select" data-path="leasingBudget.inputPeriods.${item.key}" data-type="text" data-budget-period="true">${budgetPeriodOptions(period)}</select></td><td class="num"><input class="table-input" data-path="leasingBudget.${item.key}" data-type="number" data-annualize="true" data-period-path="leasingBudget.inputPeriods.${item.key}" type="number" step="0.01" value="${roundDisplayValue(entered, 2)}"></td><td class="num"><strong data-budget-monthly>${fmt(annual / 12, 2)}</strong></td><td class="num"><strong data-budget-annual>${fmt(annual, 2)}</strong></td><td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(total > 0 ? annual / total : 0)}</span></td><td>${escapeHtml(item.note)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><span>年度招商费用合计</span><span><strong data-share-total>${fmt(total, 2)}</strong> 万元/年｜月均 <strong data-budget-total-monthly>${fmt(total / 12, 2)}</strong> 万元/月</span></div>
  </div>`;
}

function renderMarketingBudgetSection(model, preview) {
  const marketing = model.marketingBudget || (model.marketingBudget = {});
  const annualItems = marketing.annualItems || (marketing.annualItems = []);
  const openingItems = marketing.openingYearItems || (marketing.openingYearItems = []);
  const annualTotal = annualItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const openingTotal = openingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const firstYearTotal = annualTotal + openingTotal;
  const amountMode = marketing.amountMode !== false;
  const legacyNotice = amountMode ? '' : `<div class="callout soft" id="legacy-marketing-notice">${ICONS.info}<div>该项目使用旧版“权重分配”营销预算。建议点击右侧按钮，将旧预算总额换算为金额项目；之后只调整金额，权重由系统自动计算。</div><button class="btn btn-secondary btn-sm" type="button" id="migrate-marketing-amounts">转换为金额核算</button></div>`;
  return `<div class="form-section budget-section">
    <div class="section-title">年度营销推广费用及分解</div>
    <div class="section-note">营销费用全部按年度金额录入。常规年度分为营销推广、商业美陈、媒体宣传、会员营销四大类；开业第1年另加导视导览和开业美陈。自动权重由金额反算，不参与费用分配。</div>
    ${legacyNotice}
    ${formulaPanel('年度营销金额与自动权重公式', '年度常规营销预算 = 营销推广 + 商业美陈 + 媒体宣传 + 会员营销\n开业首年营销预算 = 年度常规营销预算 + 导视导览 + 开业美陈\n自动权重 = 单项金额 ÷ 对应预算合计\n单项金额 = 用户录入金额（系统不按权重反推）', ['SUM','IF'], '只录入金额，不录入权重。系统用自动权重检查预算结构；开业首年专项只计入运营第1年。')}
    <div class="subsection-heading"><div><strong>常规年度营销预算</strong><span>每年持续发生</span></div><div class="amount-total-chip">合计 <strong data-marketing-annual-total>${fmt(annualTotal, 1)}</strong> 万元/年</div></div>
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table" data-marketing-annual-table><thead><tr><th>营销类别</th><th class="num">年度金额（万元）</th><th class="num">自动权重</th><th>费用内容</th></tr></thead><tbody>
        ${annualItems.map((item, i) => `<tr>
          <td><strong>${escapeHtml(item.name || '未命名类别')}</strong></td>
          <td class="num"><input class="table-input marketing-amount-input" data-path="marketingBudget.annualItems.${i}.amount" data-type="number" data-marketing-amount="true" type="number" step="0.1" value="${Number(item.amount || 0)}"></td>
          <td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(annualTotal > 0 ? Number(item.amount || 0) / annualTotal : 0)}</span></td>
          <td><input class="table-input text-left" data-path="marketingBudget.annualItems.${i}.note" data-type="text" value="${escapeHtml(item.note || '')}"></td>
        </tr>`).join('') || '<tr><td colspan="4" class="empty-table-cell">尚未设置常规营销类别</td></tr>'}
      </tbody></table>
    </div>
    <div class="subsection-heading opening-marketing-heading"><div><strong>开业首年专项营销</strong><span>仅在运营第1年计入</span></div><div class="amount-total-chip">首年合计 <strong data-marketing-first-total>${fmt(firstYearTotal, 1)}</strong> 万元</div></div>
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table" data-marketing-opening-table><thead><tr><th>开业专项</th><th class="num">首年金额（万元）</th><th class="num">占首年营销总预算</th><th>费用内容</th></tr></thead><tbody>
        ${openingItems.map((item, i) => `<tr>
          <td><strong>${escapeHtml(item.name || '未命名开业专项')}</strong></td>
          <td class="num"><input class="table-input marketing-amount-input" data-path="marketingBudget.openingYearItems.${i}.amount" data-type="number" data-marketing-amount="true" type="number" step="0.1" value="${Number(item.amount || 0)}"></td>
          <td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(firstYearTotal > 0 ? Number(item.amount || 0) / firstYearTotal : 0)}</span></td>
          <td><input class="table-input text-left" data-path="marketingBudget.openingYearItems.${i}.note" data-type="text" value="${escapeHtml(item.note || '')}"></td>
        </tr>`).join('') || '<tr><td colspan="4" class="empty-table-cell">尚未设置开业首年专项</td></tr>'}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><span>稳定年营销预算 <strong data-marketing-annual-total>${fmt(annualTotal, 1)}</strong> 万元/年</span><span>开业首年营销预算 <strong data-marketing-first-total>${fmt(firstYearTotal, 1)}</strong> 万元</span></div>
  </div>`;
}

function renderMaintenanceBudgetSection(model, preview) {
  const specials = [
    { label: '电梯维保', key: 'elevatorAnnual', note: '电梯年检、维保及应急服务' },
    { label: '暖通空调维保', key: 'hvacAnnual', note: '冷机、空调、通风及自控系统' },
    { label: '消防维保', key: 'fireAnnual', note: '消防设施检测、维保及年检' },
    { label: '景观绿化养护', key: 'landscapeAnnual', note: '绿化、水景、室外景观养护' },
    { label: '其他专项维保', key: 'otherAnnual', note: '幕墙、弱电、给排水等其他专项' },
  ];
  const specialTotal = specials.reduce((sum, item) => sum + Number(model.maintenanceBudget?.[item.key] || 0), 0);
  const overrideBase = Number(model.operations?.annualCostOverrides?.baseMaintenance || 0);
  const previewMaintenance = Number(preview?.summary?.stableMaintenanceCost || 0);
  const automaticBase = Math.max(0, previewMaintenance - specialTotal);
  const baseAmount = overrideBase > 0 ? overrideBase : automaticBase;
  const total = baseAmount + specialTotal;
  const rows = [
    { label: '日常维修', key: 'baseMaintenance', path: 'operations.annualCostOverrides.baseMaintenance', note: '未填金额时按资产原值×维修费率自动计提' },
    ...specials.map(item => ({ ...item, path: `maintenanceBudget.${item.key}` })),
  ];
  return `<div class="form-section budget-section">
    <div class="section-title">日常维保与专项维修</div>
    <div class="section-note">优先按年度金额核算。日常维修未填金额时，系统才用资产原值×维修费率自动计提；专项维保全部按金额录入，系统自动计算权重。</div>
    ${formulaPanel('维保费用金额与自动权重公式', '日常维修 = IF(直接金额>0, 直接金额, 资产原值×维修费率)×运营爬坡系数\n专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他\n维保合计 = 日常维修 + 专项维保\n自动权重 = 单项金额 ÷ 维保合计', ['SUM','ROUND','IF'], '有年度维保预算或合同时直接填写金额；没有时日常维修才使用费率参考。')}
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table" data-share-table><thead><tr><th>维保项目</th><th class="num">年度金额（万元）</th><th class="num">自动权重</th><th>费用内容</th></tr></thead><tbody>
        ${rows.map(item => {
          const amount = item.key === 'baseMaintenance' ? baseAmount : Number(model.maintenanceBudget?.[item.key] || 0);
          return `<tr><td><strong>${escapeHtml(item.label)}</strong></td><td class="num"><input class="table-input" data-path="${item.path}" data-type="number" type="number" step="0.1" value="${amount}"></td><td class="num"><span class="auto-weight" data-auto-weight>${fmtPct(total > 0 ? amount / total : 0)}</span></td><td>${escapeHtml(item.note)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><span>维保费用合计</span><span><strong data-share-total>${fmt(total, 1)}</strong> 万元/年</span></div>
  </div>`;
}

function renderOperatingCostSummary(preview) {
  const breakdown = preview?.operatingCostBreakdown || [];
  const total = breakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!breakdown.length) return '';
  const directOverrides = {
    '物业基础运营': { path: 'operations.annualCostOverrides.propertyOps', source: '可直接按金额调整；0/空白时按面积参考单价' },
    '公共能耗': { path: 'operations.annualCostOverrides.energy', source: '可直接按金额调整；0/空白时按面积参考单价×出租率' },
    '保险费用': { path: 'operations.annualCostOverrides.insurance', source: '可直接按金额调整；0/空白时按资产原值×费率' },
    '其他运营费用': { path: 'operations.annualCostOverrides.otherOpex', source: '可直接按金额调整；0/空白时按营业收入×费率' },
  };
  const sourceLabels = {
    '管理团队人员成本': '组织架构薪资自动汇总',
    '物业工程服务成本': '岗位成本×物业服务模式自动汇总',
    '保安服务成本': '岗位成本×物业服务模式自动汇总',
    '保洁服务成本': '岗位成本×物业服务模式自动汇总',
    '招聘培训成本': '按人员成本×招聘培训费率',
    '办公行政成本': '办公预算金额合计',
    '招商费用': '招商预算金额合计',
    '年度营销费用': '营销四类金额合计',
    '日常及专项维保': '维保金额合计',
    '坏账准备': '营业收入×（1-收缴率）',
    '土地租赁支出': '按土地租赁合同自动计算',
    '物业租赁支出': '按物业租赁合同自动计算',
    '年度成本调整额': '年度额外成本',
    '税费': '按税率和属地政策自动计算',
  };
  return `<div class="form-section budget-section">
    <div class="section-title">年度运营费用金额汇总与自动权重</div>
    <div class="section-note">稳定运营年、金额单位：万元/年。所有分项先形成金额，再反算权重；带输入框的项目可直接按金额调整，其余项目请在对应明细中调整。</div>
    ${formulaPanel('年度运营费用权重公式', '运营费用合计 = 物业 + 能耗 + 人员 + 办公 + 招商 + 营销 + 维保 + 保险 + 坏账 + 其他 + 业主租金 + 年度额外成本 + 税费\n自动权重 = 单项金额 ÷ 运营费用合计', ['SUM','IF'], '权重是结果不是输入项。直接金额调整填0或留空时，系统回到公式自动核算。')}
    <div class="data-table-wrap operating-amount-table-wrap">
      <table class="data-table budget-table operating-amount-table"><thead><tr><th>成本项目</th><th class="num">核算金额（万元/年）</th><th class="num">自动权重</th><th>金额来源 / 调整方式</th></tr></thead><tbody>
        ${breakdown.map(item => {
          const override = directOverrides[item.name];
          const value = Number(item.value || 0);
          const overrideValue = override ? Number(getPath(preview?.model || state.current.model, override.path) || 0) : 0;
          const inputValue = override ? (overrideValue > 0 ? overrideValue : value) : null;
          const source = override?.source || sourceLabels[item.name] || '系统自动核算';
          return `<tr data-op-row="${escapeHtml(item.name)}"><td><strong>${escapeHtml(item.name)}</strong></td><td class="num">${override ? `<input class="table-input" data-op-amount data-path="${override.path}" data-type="number" type="number" step="0.1" value="${Number(inputValue || 0)}">` : `<strong data-op-amount>${fmt(value, 1)}</strong>`}</td><td class="num"><span class="auto-weight" data-op-weight>${fmtPct(total > 0 ? value / total : 0)}</span></td><td><span class="amount-source">${escapeHtml(source)}</span></td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    <div class="budget-total-line"><span>稳定期运营成本及税费合计</span><strong data-operating-total>${fmt(total, 1)} 万元/年</strong></div>
  </div>`;
}

function refreshShareTables() {
  document.querySelectorAll('[data-share-table]').forEach(table => {
    const rows = [...table.querySelectorAll('tbody tr')];
    const values = rows.map(row => {
      if (row.dataset.annualValue != null && row.dataset.annualValue !== '') return Number(row.dataset.annualValue || 0);
      return Number(row.querySelector('input[type="number"]')?.value || 0);
    });
    const total = values.reduce((sum, value) => sum + value, 0);
    rows.forEach((row, index) => {
      const weight = row.querySelector('[data-auto-weight]');
      if (weight) weight.textContent = fmtPct(total > 0 ? values[index] / total : 0);
      if (row.dataset.annualizedRow != null) row.dataset.annualValue = String(values[index]);
      const monthlyEl = row.querySelector('[data-budget-monthly]');
      const annualEl = row.querySelector('[data-budget-annual]');
      if (monthlyEl) monthlyEl.textContent = fmt(values[index] / 12, 2);
      if (annualEl) annualEl.textContent = fmt(values[index], 2);
    });
    const totalEl = table.closest('.budget-section')?.querySelector('[data-share-total]');
    if (totalEl) totalEl.textContent = fmt(total, 2);
    const monthlyTotalEl = table.closest('.budget-section')?.querySelector('[data-budget-total-monthly]');
    if (monthlyTotalEl) monthlyTotalEl.textContent = fmt(total / 12, 2);
  });
}

function refreshMarketingWeights() {
  const readTableValues = selector => [...document.querySelectorAll(`${selector} tbody tr`)]
    .map(row => Number(row.querySelector('input[type="number"]')?.value || 0));
  const annualValues = readTableValues('[data-marketing-annual-table]');
  const openingValues = readTableValues('[data-marketing-opening-table]');
  const annualTotal = annualValues.reduce((sum, value) => sum + value, 0);
  const openingTotal = openingValues.reduce((sum, value) => sum + value, 0);
  const firstYearTotal = annualTotal + openingTotal;
  document.querySelectorAll('[data-marketing-annual-table] tbody tr').forEach((row, index) => {
    const weight = row.querySelector('[data-auto-weight]');
    if (weight) weight.textContent = fmtPct(annualTotal > 0 ? annualValues[index] / annualTotal : 0);
  });
  document.querySelectorAll('[data-marketing-opening-table] tbody tr').forEach((row, index) => {
    const weight = row.querySelector('[data-auto-weight]');
    if (weight) weight.textContent = fmtPct(firstYearTotal > 0 ? openingValues[index] / firstYearTotal : 0);
  });
  document.querySelectorAll('[data-marketing-annual-total]').forEach(el => { el.textContent = fmt(annualTotal, 1); });
  document.querySelectorAll('[data-marketing-first-total]').forEach(el => { el.textContent = fmt(firstYearTotal, 1); });
}

function updateOperatingPreviewDom(result) {
  const breakdown = result?.operatingCostBreakdown || [];
  updatePayrollPreviewDom(result);
  updatePropertyServicePreviewDom(result);
  updateChannelPreviewDom(result);
  updatePreOpeningPreviewDom(result);
  if (!breakdown.length) return;
  const total = breakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const values = new Map(breakdown.map(item => [item.name, Number(item.value || 0)]));
  document.querySelectorAll('[data-op-row]').forEach(row => {
    const value = values.get(row.dataset.opRow);
    if (value == null) return;
    const amountEl = row.querySelector('[data-op-amount]');
    if (amountEl && amountEl !== document.activeElement) {
      if (amountEl.tagName === 'INPUT') amountEl.value = roundDisplayValue(value, 2);
      else amountEl.textContent = fmt(value, 1);
    }
    const weightEl = row.querySelector('[data-op-weight]');
    if (weightEl) weightEl.textContent = fmtPct(total > 0 ? value / total : 0);
  });
  const totalEl = document.querySelector('[data-operating-total]');
  if (totalEl) totalEl.textContent = `${fmt(total, 1)} 万元/年`;
}

function updatePreOpeningPreviewDom(result) {
  if (!result) return;
  const summary = result.summary || {};
  const values = {
    commission: summary.preOpeningCommission || 0,
    'team-property': Number(summary.preOpeningTeamCost || 0) + Number(summary.preOpeningPropertyCost || 0),
    'marketing-other': Number(summary.preOpeningMarketingCost || 0) + Number(summary.preOpeningOtherCost || 0),
  };
  values.total = Number(values.commission) + Number(values['team-property']) + Number(values['marketing-other']);
  document.querySelectorAll('[data-preopening]').forEach(el => {
    const value = values[el.dataset.preopening];
    if (value != null) el.textContent = fmt(value, 2);
  });
}

function updateChannelPreviewDom(result) {
  if (!result) return;
  const summary = result.summary || {};
  const values = {
    gba: summary.grossFloorArea ?? 0,
    channelArea: summary.channelArea ?? 0,
    referenceRent: summary.channelRentPerSqmMonth ?? 0,
    channelFeeAnnual: summary.annualChannelFee ?? 0,
  };
  document.querySelectorAll('[data-channel-field]').forEach(el => {
    const value = values[el.dataset.channelField];
    if (value != null) el.textContent = el.dataset.channelField === 'gba' || el.dataset.channelField === 'channelArea' ? fmtArea(value) : fmt(value, 2);
  });
  const channelRow = document.querySelector('[data-channel-row]');
  if (channelRow) {
    channelRow.dataset.annualValue = String(values.channelFeeAnnual);
    const amount = channelRow.querySelector('[data-lease-channel-amount]');
    if (amount) amount.textContent = fmt(values.channelFeeAnnual, 2);
    const monthly = channelRow.querySelector('[data-budget-monthly]');
    const annual = channelRow.querySelector('[data-budget-annual]');
    if (monthly) monthly.textContent = fmt(values.channelFeeAnnual / 12, 2);
    if (annual) annual.textContent = fmt(values.channelFeeAnnual, 2);
    refreshShareTables();
  }
}

function updatePayrollPreviewDom(result) {
  if (!result) return;
  const summary = result.summary || {};
  const summaryValues = {
    stableHeadcount: summary.stableHeadcount ?? 0,
    annualGrossPayroll: summary.annualGrossPayroll ?? 0,
    annualEmployeeSocialInsurance: summary.annualEmployeeSocialInsurance ?? 0,
    annualIndividualIncomeTax: summary.annualIndividualIncomeTax ?? 0,
    annualNetPayroll: summary.annualNetPayroll ?? 0,
    annualEmployerSocialInsurance: summary.annualEmployerSocialInsurance ?? 0,
    annualRecruitmentTrainingCost: summary.annualRecruitmentTrainingCost ?? 0,
    organizationFullCost: summary.organizationFullCost ?? 0,
    organizationRecruitmentTrainingCost: summary.organizationRecruitmentTrainingCost ?? 0,
    companyCost: Number(summary.annualGrossPayroll || 0) + Number(summary.annualEmployerSocialInsurance || 0),
    stableStaffCost: summary.stableStaffCost ?? 0,
  };
  document.querySelectorAll('[data-payroll-summary]').forEach(el => {
    const value = summaryValues[el.dataset.payrollSummary];
    if (value != null) el.textContent = fmt(value, el.dataset.payrollSummary === 'stableHeadcount' ? 0 : 2);
  });
  const departmentFields = ['grossPayroll', 'employeeSocialInsurance', 'individualIncomeTax', 'netSalary', 'employerSocialInsurance', 'annualCost'];
  (result.organizationBreakdown || []).forEach((department, departmentIndex) => {
    departmentFields.forEach(field => {
      document.querySelectorAll(`[data-payroll-dept="${departmentIndex}"][data-payroll-field="${field}"]`).forEach(el => {
        el.textContent = fmt(department[field] ?? 0, 2);
      });
    });
    (department.positions || []).forEach((position, positionIndex) => {
      departmentFields.forEach(field => {
        document.querySelectorAll(`[data-payroll-position="${departmentIndex}:${positionIndex}"][data-payroll-field="${field}"]`).forEach(el => {
          el.textContent = fmt(position[field] ?? 0, 2);
        });
      });
    });
  });
}

function updatePropertyServicePreviewDom(result) {
  if (!result) return;
  const records = result.propertyServiceBreakdown || [];
  records.forEach(record => {
    const row = document.querySelector(`[data-service-key="${record.key}"]`);
    if (!row) return;
    row.querySelectorAll('[data-service-field]').forEach(el => {
      el.textContent = fmt(record[el.dataset.serviceField] ?? 0, 2);
    });
    const headcount = row.querySelector('[data-service-headcount]');
    if (headcount) headcount.textContent = `${fmt(record.headcount)}人`;
    const note = row.querySelector('[data-service-cost-note]');
    if (note) note.textContent = record.mode === 'self' ? '含自营招聘培训' : record.mode === 'non_resident' ? '已按非驻场折算' : '含第三方管理费';
  });
  const summary = result.summary || {};
  const summaryValues = {
    servicePositionBaseCost: summary.annualServicePositionBaseCost ?? 0,
    outsourcedManagementFee: summary.annualOutsourcedManagementFee ?? 0,
    selfServiceRecruitment: records.reduce((sum, record) => sum + Number(record.selfRecruitmentTraining || 0), 0),
    serviceTotal: summary.annualPropertyServiceTotal ?? 0,
    totalActiveStaffCost: summary.stableStaffCost ?? 0,
  };
  document.querySelectorAll('[data-service-summary]').forEach(el => {
    const value = summaryValues[el.dataset.serviceSummary];
    if (value != null) el.textContent = fmt(value, 2);
  });
}

function bindOperationsBudgets() {
  const model = state.current.model;
  const budgetFile = document.getElementById('budget-file');
  document.getElementById('download-budget-template')?.addEventListener('click', () => downloadFile('/api/templates/operating-budget', '商业地产运营成本预算导入模板.xlsx'));
  document.getElementById('choose-budget-file')?.addEventListener('click', () => budgetFile.click());
  budgetFile?.addEventListener('change', () => budgetFile.files[0] && importOperatingBudget(budgetFile.files[0]));
  document.querySelectorAll('#add-department, [data-add-department]').forEach(button => button.addEventListener('click', () => {
    model.organization ||= { socialInsuranceRate: 0.28, employeeSocialInsuranceRate: 0.105, individualIncomeTaxThresholdMonthly: 5000, specialAdditionalDeductionMonthly: 0, annualSalaryMonths: 12, recruitmentTrainingRate: 0.02, departments: [] };
    model.organization.departments ||= [];
    model.organization.departments.push({ name: '新增部门', note: '', positions: [{ name: '新增岗位', headcount: 1, avgMonthlySalary: 8000, note: '' }] });
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
  document.querySelectorAll('[data-add-position]').forEach(btn => btn.addEventListener('click', () => {
    const department = model.organization.departments[Number(btn.dataset.addPosition)];
    if (!department) return;
    department.positions ||= [];
    department.positions.push({ name: '新增岗位', headcount: 1, avgMonthlySalary: 8000, note: '' });
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
  document.querySelectorAll('[data-remove-position]').forEach(btn => btn.addEventListener('click', () => {
    const department = model.organization.departments[Number(btn.dataset.removePosition)];
    if (department?.positions) department.positions.splice(Number(btn.dataset.positionIndex), 1);
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
  document.querySelectorAll('[data-remove-department]').forEach(btn => btn.addEventListener('click', () => {
    model.organization.departments.splice(Number(btn.dataset.removeDepartment), 1);
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
  document.querySelectorAll('[data-marketing-amount]').forEach(input => input.addEventListener('input', () => {
    model.marketingBudget ||= {};
    model.marketingBudget.amountMode = true;
    document.getElementById('legacy-marketing-notice')?.remove();
    refreshMarketingWeights();
  }));
  document.querySelectorAll('[data-share-table] input[type="number"]').forEach(input => input.addEventListener('input', refreshShareTables));
  document.getElementById('migrate-marketing-amounts')?.addEventListener('click', () => {
    model.marketingBudget ||= {};
    const total = Number(state.preview?.summary?.stableMarketingCost || 0);
    const allocation = state.preview?.marketingAllocation || [];
    const bucketNames = {
      promotion: ['品牌', '公关', '活动', '推广'],
      visual: ['物料', '美陈'],
      media: ['媒体'],
      member: ['会员', '数字'],
    };
    const bucketShares = {};
    for (const [key, keywords] of Object.entries(bucketNames)) {
      bucketShares[key] = allocation
        .filter(item => keywords.some(word => String(item.name || '').includes(word)))
        .reduce((sum, item) => sum + Number(item.share || item.weight || 0), 0);
    }
    const shareSum = Object.values(bucketShares).reduce((sum, value) => sum + value, 0);
    const fallbackShares = { promotion: 0.40, visual: 0.25, media: 0.20, member: 0.15 };
    (model.marketingBudget.annualItems || []).forEach(item => {
      const share = shareSum > 0 ? bucketShares[item.key] / shareSum : fallbackShares[item.key] || 0;
      item.amount = Number((total * share).toFixed(1));
    });
    model.marketingBudget.amountMode = true;
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast('旧版权重预算已转换为金额核算', 'success');
  });
  document.querySelectorAll('[data-annual-cost-field]').forEach(input => input.addEventListener('input', () => {
    model.operations ||= {};
    model.operations.annualCostAdjustments ||= {};
    const year = String(input.dataset.annualCostYear);
    const field = input.dataset.annualCostField;
    const entry = model.operations.annualCostAdjustments[year] || (model.operations.annualCostAdjustments[year] = {});
    if (field === 'note') entry.note = input.value;
    else {
      const scale = Number(input.dataset.scale || 1);
      const value = input.value === '' ? (field === 'extraCost' ? 0 : 1 / scale) : Number(input.value) * scale;
      entry[field] = Number.isFinite(value) ? value : (field === 'extraCost' ? 0 : 1);
    }
    input.closest('tr')?.classList.add('adjusted');
    state.dirty = true;
    updateSaveState();
    scheduleLivePreview();
  }));
  document.getElementById('reset-annual-cost-adjustments')?.addEventListener('click', () => {
    model.operations ||= {};
    model.operations.annualCostAdjustments = {};
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast('年度招商及运营成本已全部恢复100%', 'success');
  });
  document.getElementById('opex-standard-select')?.addEventListener('change', updateOperatingReferenceValues);
  document.getElementById('opex-management-select')?.addEventListener('change', updateOperatingReferenceValues);
  document.querySelectorAll('[data-opex-category]').forEach(input => input.addEventListener('change', updateOperatingReferenceValues));
  document.getElementById('apply-opex-reference')?.addEventListener('click', () => {
    const selections = currentOperatingReferenceSelections();
    const reference = applyOperatingCostReference(model, selections);
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast(`已按${reference.city.label} · ${reference.standard.label}应用运营成本参考`, 'success');
  });
}


async function importOperatingBudget(file) {
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) return toast('运营成本预算仅支持 .xlsx 或 .xlsm', 'error');
  if (file.size > 20 * 1024 * 1024) return toast('文件不能超过20MB', 'error');
  setBusy(true);
  try {
    const contentBase64 = await fileToBase64(file);
    const payload = await api('/api/import-operating-budget', { method: 'POST', body: { filename: file.name, contentBase64 } });
    const model = state.current.model;
    if (payload.organization?.departments?.length) model.organization = { ...(model.organization || {}), ...payload.organization };
    if (payload.propertyService && Object.keys(payload.propertyService).length) {
      model.propertyService ||= {};
      Object.entries(payload.propertyService).forEach(([key, value]) => {
        model.propertyService[key] = { ...(model.propertyService[key] || {}), ...(value || {}) };
      });
    }
    if (payload.officeBudget && Object.keys(payload.officeBudget).length) model.officeBudget = { ...(model.officeBudget || {}), ...payload.officeBudget };
    if (payload.leasingBudget && Object.keys(payload.leasingBudget).length) model.leasingBudget = { ...(model.leasingBudget || {}), ...payload.leasingBudget };
    if (payload.marketingBudget) {
      model.marketingBudget ||= {};
      if (payload.marketingBudget.hasImportedAmounts) {
        model.marketingBudget = { ...model.marketingBudget, ...payload.marketingBudget };
        delete model.marketingBudget.hasImportedAmounts;
        model.marketingBudget.amountMode = true;
        model.marketingBudget.annualItems = payload.marketingBudget.annualItems || model.marketingBudget.annualItems || [];
        model.marketingBudget.openingYearItems = payload.marketingBudget.openingYearItems || model.marketingBudget.openingYearItems || [];
      }
    }
    if (payload.maintenanceBudget && Object.keys(payload.maintenanceBudget).length) model.maintenanceBudget = { ...(model.maintenanceBudget || {}), ...payload.maintenanceBudget };
    if (payload.projectFields && Object.keys(payload.projectFields).length) model.project = { ...(model.project || {}), ...payload.projectFields };
    if (payload.operations && Object.keys(payload.operations).length) model.operations = { ...(model.operations || {}), ...payload.operations };
    state.budgetWarnings = payload.warnings || [];
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast('运营成本预算已导入', 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function annualCostAdjustmentForYear(model, year) {
  const adjustments = model.operations?.annualCostAdjustments || {};
  const item = adjustments[String(year)] || {};
  return {
    leasingFactor: item.leasingFactor == null ? 1 : Number(item.leasingFactor),
    operationsFactor: item.operationsFactor == null ? 1 : Number(item.operationsFactor),
    extraCost: item.extraCost == null ? 0 : Number(item.extraCost),
    note: item.note || '',
  };
}

function renderAnnualCostAdjustmentSection(model) {
  const years = Math.max(1, Math.min(50, Number(model.project.operationYears || 20)));
  const startYear = Number(model.project.startYear || new Date().getFullYear());
  const constructionYears = Math.max(0, Number(model.project.constructionYears || 0));
  const rows = Array.from({ length: years }, (_, index) => {
    const year = index + 1;
    const adjustment = annualCostAdjustmentForYear(model, year);
    const adjusted = adjustment.leasingFactor !== 1 || adjustment.operationsFactor !== 1 || adjustment.extraCost !== 0 || Boolean(adjustment.note);
    return `<tr class="${adjusted ? 'adjusted' : ''}" data-annual-cost-row="${year}">
      <td><strong>Y${year}</strong><small class="table-subnote">${startYear + constructionYears + index}年</small></td>
      <td class="num"><input class="table-input" data-annual-cost-year="${year}" data-annual-cost-field="leasingFactor" data-scale="0.01" type="number" step="1" value="${(adjustment.leasingFactor * 100).toFixed(1)}"></td>
      <td class="num"><input class="table-input" data-annual-cost-year="${year}" data-annual-cost-field="operationsFactor" data-scale="0.01" type="number" step="1" value="${(adjustment.operationsFactor * 100).toFixed(1)}"></td>
      <td class="num"><input class="table-input" data-annual-cost-year="${year}" data-annual-cost-field="extraCost" type="number" step="any" value="${adjustment.extraCost}"></td>
      <td><input class="table-input text-left" data-annual-cost-year="${year}" data-annual-cost-field="note" type="text" value="${escapeHtml(adjustment.note)}" placeholder="例如：招商活动增加、团队扩编"></td>
    </tr>`;
  }).join('');
  return `<div class="form-section budget-section annual-cost-adjustment-section">
    <div class="section-title">年度招商及运营成本调整</div>
    <div class="section-note">默认系数为100%。可按每个运营年度单独调整招商费用和常规运营成本，也可增加或减少一次性成本。土地及物业租赁支出不受这里的统一系数影响。</div>
    ${formulaPanel('年度成本调整公式', '当年招商费用 = 基准招商费用 × 招商费用系数 + 招商费用额外额\n当年常规运营成本 = 基准常规运营成本 × 运营成本系数\n当年运营成本合计 = 调整后常规成本 + 调整后招商费用 + 土地/物业租赁支出 + 年度额外成本', ['IF', 'SUM'], '系数100%表示维持基准；120%表示增加20%；额外成本正数增加、负数减少。')}
    <div class="annual-cost-toolbar"><span>共 <strong>${years}</strong> 个运营年度</span><button type="button" class="btn btn-secondary btn-sm" id="reset-annual-cost-adjustments">全部恢复100%</button></div>
    <div class="data-table-wrap annual-cost-table-wrap">
      <table class="data-table budget-table annual-cost-table">
        <thead><tr><th>运营年</th><th class="num">招商费用系数（%）</th><th class="num">运营成本系数（%）</th><th class="num">额外成本（万元）</th><th>调整说明</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function operatingReferenceCategoryText(reference, category) {
  const values = reference.values;
  const sum = object => Object.values(object || {}).reduce((total, value) => total + Number(value || 0), 0);
  return {
    property: `${fmt(values.propertyOpsCost, 1)} 元/㎡/月`,
    energy: `${fmt(values.energyCost, 1)} 元/㎡/月`,
    staff: `${fmt(reference.headcount)} 人 · 参考人均月薪 ${fmt(values.salaries.length ? values.salaries.reduce((sum, item) => sum + item.avgMonthlySalary, 0) / values.salaries.length : 0)} 元`,
    office: `${fmt(sum(values.officeBudget), 1)} 万元/年`,
    leasing: `${fmt(sum(values.leasingBudget), 1)} 万元/年`,
    marketing: `金额录入 · 初始参考约营业收入的 ${fmtPct(values.marketingRate, 1)}`,
    maintenance: `${fmt(sum(values.maintenanceBudget), 1)} 万元/年 + 资产原值 ${fmtPct(values.repairRate, 1)}`,
    insurance: `资产原值的 ${fmtPct(values.insuranceRate, 2)}`,
    other: `营业收入的 ${fmtPct(values.otherOpexRate, 1)}`,
  }[category] || '—';
}

function renderOperatingReferencePanel(model) {
  const preset = model.operations?.opexPreset || {};
  const standard = preset.standard || 'standard';
  const managementMode = preset.managementMode || 'mixed';
  const categories = preset.categories || Object.fromEntries(OPEX_CATEGORY_OPTIONS.map(item => [item.value, true]));
  const reference = operatingCostReference(model, { standard, managementMode });
  return `<div class="form-section opex-reference-section">
    <div class="section-title">运营成本参考与快速录入</div>
    <div class="section-note">根据项目所在地、商业形态、运营标准和自管/委托模式生成初始参考。勾选需要应用的成本大项，未勾选项目保持当前值。</div>
    <div class="opex-reference-card">
      <div class="opex-reference-head">
        <div><span class="eyebrow">Location operating benchmark</span><h3>${escapeHtml(reference.city.label)} · ${escapeHtml(reference.standard.label)} · ${escapeHtml(reference.management.label)}</h3><p>参考值为内置地区基准，按项目所在地和运营模式修正；应用后仍可在各成本明细中逐项调整。</p></div>
        <div class="opex-reference-controls">
          <select class="select" id="opex-standard-select">${OPEX_STANDARD_OPTIONS.map(item => `<option value="${item.value}" ${item.value === standard ? 'selected' : ''}>${item.label}</option>`).join('')}</select>
          <select class="select" id="opex-management-select">${OPEX_MANAGEMENT_OPTIONS.map(item => `<option value="${item.value}" ${item.value === managementMode ? 'selected' : ''}>${item.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="opex-category-grid">
        ${OPEX_CATEGORY_OPTIONS.map(item => `<label class="opex-category-item ${categories[item.value] !== false ? 'selected' : ''}" data-opex-category-row="${item.value}"><input type="checkbox" data-opex-category="${item.value}" ${categories[item.value] !== false ? 'checked' : ''}><span><strong>${item.label}</strong><small data-opex-reference-value="${item.value}">${operatingReferenceCategoryText(reference, item.value)}</small></span></label>`).join('')}
      </div>
      <div class="opex-reference-foot"><span>参考口径：${escapeHtml(reference.city.label)} · 商业系数 ${reference.formatFactor.toFixed(2)} · 标准系数 ${reference.standard.factor.toFixed(2)}</span><button type="button" class="btn btn-primary btn-sm" id="apply-opex-reference">按勾选项目应用参考值</button></div>
    </div>
  </div>`;
}

function currentOperatingReferenceSelections() {
  return {
    standard: document.getElementById('opex-standard-select')?.value || 'standard',
    managementMode: document.getElementById('opex-management-select')?.value || 'mixed',
    categories: Object.fromEntries([...document.querySelectorAll('[data-opex-category]')].map(input => [input.dataset.opexCategory, input.checked])),
  };
}

function updateOperatingReferenceValues() {
  const selections = currentOperatingReferenceSelections();
  const reference = operatingCostReference(state.current.model, { standard: selections.standard, managementMode: selections.managementMode });
  document.querySelectorAll('[data-opex-reference-value]').forEach(el => {
    el.textContent = operatingReferenceCategoryText(reference, el.dataset.opexReferenceValue);
  });
  const title = document.querySelector('.opex-reference-head h3');
  if (title) title.textContent = `${reference.city.label} · ${reference.standard.label} · ${reference.management.label}`;
  document.querySelectorAll('[data-opex-category-row]').forEach(row => row.classList.toggle('selected', row.querySelector('input')?.checked));
}

function normalizeCentralAcBuildingConfigs(model) {
  const revenues = model.revenues || (model.revenues = {});
  const shops = Array.isArray(model.shops) ? model.shops : [];
  const floors = Array.isArray(model.floors) ? model.floors : [];
  const existing = Array.isArray(revenues.centralAcBuildings)
    ? revenues.centralAcBuildings
    : Object.entries(revenues.centralAcBuildings || {}).map(([building, value]) => ({ building, ...(value || {}) }));
  const byBuilding = new Map(existing.map(item => [String(item?.building || '').trim(), item]).filter(([name]) => name));
  const names = [...new Set([
    ...shops.map(shop => String(shop.building || '1号楼').trim() || '1号楼'),
    ...floors.map(floor => String(floor.building || '1号楼').trim() || '1号楼'),
    ...byBuilding.keys(),
  ])].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  const configs = names.map(building => {
    const current = byBuilding.get(building) || {};
    return {
      building,
      enabled: Boolean(current.enabled),
      fee: current.fee === null || current.fee === undefined ? Number(revenues.centralAcFee || 0) : Number(current.fee || 0),
    };
  });
  revenues.centralAcBuildings = configs;
  return configs;
}

function centralAcBuildingAreas(model) {
  const areas = new Map();
  const shops = Array.isArray(model.shops) ? model.shops : [];
  if (shops.length) {
    for (const shop of shops) {
      const building = String(shop.building || '1号楼').trim() || '1号楼';
      areas.set(building, (areas.get(building) || 0) + rentAreaFor(shop, model));
    }
    return areas;
  }
  for (const floor of model.floors || []) {
    const building = String(floor.building || '1号楼').trim() || '1号楼';
    areas.set(building, (areas.get(building) || 0) + rentAreaFor(floor, model));
  }
  return areas;
}

function renderRevenueAssumptionsSection() {
  const model = state.current.model;
  const formulas = model.formulas || (model.formulas = {});
  const operations = model.operations || (model.operations = {});
  const rentGrowthMode = formulas.rentGrowthMode || 'compound';
  const propertyFeeGrowthMode = formulas.propertyFeeGrowthMode || 'compound';
  const commercialManagementGrowthMode = formulas.commercialManagementGrowthMode || 'compound';
  const centralAcGrowthMode = formulas.centralAcGrowthMode || 'compound';
  const growthOptions = [
    { value: 'none', label: '不递增' },
    { value: 'compound', label: '每年复利递增' },
    { value: 'simple', label: '每年单利递增' },
    { value: 'step', label: '每N年阶梯递增' },
  ];
  const feeGrowthFields = (label, mode, modePath, growthPath, stepYearsPath, stepRatePath) => {
    if (mode === 'step') {
      return `${textField(`${label}递增周期`, stepYearsPath, { type: 'number', unit: '年' })}${textField(`${label}阶梯递增率`, stepRatePath, { type: 'number', unit: '%', scale: 0.01 })}`;
    }
    return textField(`${label}年递增率`, growthPath, { type: 'number', unit: '%', scale: 0.01 });
  };
  const configs = normalizeCentralAcBuildingConfigs(model);
  const areas = centralAcBuildingAreas(model);
  const occupancy = Math.max(0, Number(operations.stableOccupancy ?? 0.95));
  return `<div class="form-section">
    <div class="section-title">出租率、租金增长与租赁条款</div>
    ${formulaPanel('出租率、租金及费用递增公式', '有效出租率 = IF(运营年=1, 首年出租率, IF(运营年<稳定年, 第二年出租率, 稳定出租率))\n每年复利因子 = (1 + 年递增率)^(运营年-1)\n每年单利因子 = 1 + 年递增率 × (运营年-1)\n每N年阶梯因子 = (1 + 阶梯递增率)^INT((运营年-1)÷N)\n租金收入 = 满租月租金 × 12 × 出租率 × 免租系数 × 租金递增因子', ['IF', 'POWER', 'INT', 'SUM'], '租金、物业管理费、商业管理费和中央空调费分别设置增长方式和递增率；阶梯递增示例：每3年递增5%，第1—3年不变，第4年开始上调。')}
    <div class="form-grid">
      ${textField('首年出租率', 'operations.occupancyY1', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('第二年出租率', 'operations.occupancyY2', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('稳定期出租率', 'operations.stableOccupancy', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('稳定期起始运营年', 'operations.stableYear', { type: 'number', unit: '年' })}
      ${textField('首年免租月数', 'operations.rentFreeMonths', { type: 'number', unit: '月' })}
      ${selectField('租金递增方式', 'formulas.rentGrowthMode', growthOptions, { help: '每年复利/单利按年递增；每N年阶梯递增只在周期到达时上调。' })}
      ${rentGrowthMode === 'step'
        ? `${textField('租金递增周期', 'operations.rentStepYears', { type: 'number', unit: '年' })}${textField('租金阶梯递增率', 'operations.rentStepRate', { type: 'number', unit: '%', scale: 0.01 })}`
        : textField('租金年递增率', 'operations.rentGrowth', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('联营销售额年增长率', 'operations.salesGrowth', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('租金收缴率', 'operations.collectionRate', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('续租周期', 'operations.renewalCycle', { type: 'number', unit: '年' })}
      ${textField('租赁保证金月数', 'operations.depositMonths', { type: 'number', unit: '月' })}
    </div>
  </div>
  <div class="form-section">
    <div class="section-title">物业管理费、商业管理费与中央空调费（独立核算）</div>
    <div class="section-note">三类费用分别计算收入、递增和导出明细。物业费与商业管理费默认适用于全部铺位；中央空调费只在下方开启的楼栋收取，也可在铺位明细中用覆盖单价单独调整。</div>
    ${formulaPanel('三项费用收入公式', '物业管理费 = Σ铺位计租面积 × 物业费单价 × 12 × 出租率 × 物业费递增因子\n商业管理费 = Σ铺位计租面积 × 商管费单价 × 12 × 出租率 × 商管费递增因子\n中央空调费 = Σ开启楼栋的铺位计租面积 × 楼栋空调单价 × 12 × 出租率 × 空调费递增因子\n三项费用合计 = 物业管理费 + 商业管理费 + 中央空调费', ['SUM', 'POWER', 'INT', 'IF'], '计租面积按铺位或楼层选择的建筑面积/实用面积口径计算；物业费和商管费可按铺位覆盖，中央空调费可按楼栋开启并设置独立单价。')}
    <div class="form-grid">
      ${textField('首年物业管理费单价', 'revenues.propertyFee', { type: 'number', unit: '元/㎡/月', help: '物业服务合同或租赁合同约定的物业管理费；默认适用于所有铺位' })}
      ${selectField('物业管理费递增方式', 'formulas.propertyFeeGrowthMode', growthOptions, { help: '物业管理费独立递增，不跟随租金或商管费。' })}
      ${feeGrowthFields('物业管理费', propertyFeeGrowthMode, 'formulas.propertyFeeGrowthMode', 'operations.propertyFeeGrowth', 'operations.propertyFeeStepYears', 'operations.propertyFeeStepRate')}
      ${textField('首年商业管理费单价', 'revenues.commercialManagementFee', { type: 'number', unit: '元/㎡/月', help: '商业运营管理服务费；如项目不收可填0' })}
      ${selectField('商业管理费递增方式', 'formulas.commercialManagementGrowthMode', growthOptions, { help: '商业管理费按委托管理合同独立递增。' })}
      ${feeGrowthFields('商业管理费', commercialManagementGrowthMode, 'formulas.commercialManagementGrowthMode', 'operations.commercialManagementGrowth', 'operations.commercialManagementStepYears', 'operations.commercialManagementStepRate')}
      ${textField('默认中央空调使用费单价', 'revenues.centralAcFee', { type: 'number', unit: '元/㎡/月', help: '作为新建楼栋收费配置的参考单价；是否实际收取由下方楼栋开关决定' })}
      ${selectField('中央空调费递增方式', 'formulas.centralAcGrowthMode', growthOptions, { help: '中央空调费按能耗、运维成本或合同约定独立递增。' })}
      ${feeGrowthFields('中央空调费', centralAcGrowthMode, 'formulas.centralAcGrowthMode', 'operations.centralAcGrowth', 'operations.centralAcStepYears', 'operations.centralAcStepRate')}
      ${textField('多经收入占租金比例', 'revenues.otherIncomeRatio', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('停车位数量', 'revenues.parkingSpaces', { type: 'number', unit: '个', optional: true })}
      ${textField('停车月租', 'revenues.parkingMonthly', { type: 'number', unit: '元/位/月', optional: true })}
    </div>
  </div>
  <div class="form-section">
    <div class="section-title">按楼栋设置中央空调收费</div>
    <div class="section-note">只开启实际提供中央空调且向租户收费的楼栋。稳定期月收费按计租面积 × 楼栋空调单价 × 稳定期出租率估算；不收取的楼栋按0核算，并会在铺位明细和导出表显示为0。</div>
    <div class="data-table-wrap" style="max-height:none">
      <table class="data-table">
        <thead><tr><th>楼栋</th><th>是否收取中央空调费</th><th class="num">计租面积（㎡）</th><th class="num">空调费单价（元/㎡/月）</th><th class="num">稳定期月收费（元）</th><th class="num">稳定期年收入（万元）</th><th>说明</th></tr></thead>
        <tbody>
          ${configs.map((config, index) => {
            const area = Number(areas.get(config.building) || 0);
            const fee = config.enabled ? Number(config.fee || 0) : 0;
            const monthly = area * fee * occupancy;
            return `<tr>
              <td><strong>${escapeHtml(config.building)}</strong></td>
              <td><label class="switch-line"><input type="checkbox" data-path="revenues.centralAcBuildings.${index}.enabled" data-type="bool" ${config.enabled ? 'checked' : ''} data-central-ac-toggle="true"><span>${config.enabled ? '收取' : '不收取'}</span></label></td>
              <td class="num">${fmtArea(area)}</td>
              <td class="num"><div class="input-affix compact"><input class="table-input" data-path="revenues.centralAcBuildings.${index}.fee" data-type="number" type="number" step="0.01" value="${Number(config.fee || 0).toFixed(2)}" ${config.enabled ? '' : 'disabled'}><span>元/㎡/月</span></div></td>
              <td class="num"><strong>${fmt(monthly)}</strong></td>
              <td class="num"><strong>${fmt(monthly * 12 / 10000, 2)}</strong></td>
              <td>${config.enabled ? '独立计入中央空调使用费收入' : '该楼栋不产生空调费收入，仍计入物业费和商管费'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="admin-empty">请先在商铺收益页添加楼栋或导入铺位明细。</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="field-help">计算公式：稳定期月收费 = 楼栋计租面积 × 楼栋中央空调单价 × 稳定期出租率；稳定期年收入 = 月收费 × 12 ÷ 10000。首年及第二年实际收入还会按相应出租率和递增因子计算。</div>
  </div>`;
}

function renderPreOpeningCostStep() {
  const model = state.current.model;
  const project = model.project || {};
  const preview = state.preview || state.result;
  const summary = preview?.summary || {};
  const commission = Number(summary.preOpeningCommission || 0);
  const team = Number(project.preOpeningTeamCost || 0);
  const property = Number(project.preOpeningPropertyCost || 0);
  const marketing = Number(project.preOpeningMarketing || 0);
  const other = Number(project.otherPreOpening || 0);
  const total = commission + team + property + marketing + other;
  return `
    <div class="callout">${ICONS.info}<div>本页用于开业前的筹备费用，不包含土地和建设工程。筹备团队、筹备物业、首开招商佣金、筹备营销和其他开办费会进入项目总投资，但不重复计入运营期成本。</div></div>
    <div class="form-section">
      <div class="section-title">筹备期成本参数</div>
      ${formulaPanel('筹备期成本公式', '首开招商佣金 = 满租月租金 × 佣金月数 × 首年出租率 ÷ 10000\n筹备期非工程费用 = 筹备团队成本 + 筹备物业成本 + 首开招商佣金 + 筹备期营销费用 + 其他开办费用\n筹备期投入 = 土地契税 + 建设工程 + 预备费 + 筹备期非工程费用 + 铺底流动资金', ['SUM','IF'], '首开招商佣金和筹备期营销只进入项目总投资；运营期招商和营销预算在下一页单独核算，避免重复。')}
      <div class="form-grid">
        ${textField('首开招商佣金月数', 'operations.commissionMonths', { type: 'number', unit: '月', help: '按满租月租金和首年出租率计算首开招商佣金' })}
        ${textField('筹备招商期', 'project.leasingPeriodMonths', { type: 'number', unit: '月', help: '建设完成后至正式开业之间的招商筹备期，用于资金计划和现金流分期' })}
        ${textField('启动资金安全垫', 'project.startupReserveMonths', { type: 'number', unit: '月', help: '在资金缺口峰值之外额外准备的稳定期运营月数' })}
        ${textField('筹备期团队成本', 'project.preOpeningTeamCost', { type: 'number', unit: '万元', help: '开业前筹备团队工资、社保、招聘培训及差旅等' })}
        ${textField('筹备期物业成本', 'project.preOpeningPropertyCost', { type: 'number', unit: '万元', help: '开业前保安、保洁、工程介入、开荒及物业顾问费用' })}
        ${textField('筹备期营销费用', 'project.preOpeningMarketing', { type: 'number', unit: '万元', help: '开业前品牌发布、招商推广、市场预热及媒体费用' })}
        ${textField('其他前期及开办费用', 'project.otherPreOpening', { type: 'number', unit: '万元', help: '咨询、尽调、筹备办公、证照及其他开办费用' })}
      </div>
    </div>
    <div class="phase-cost-kpis">
      <div><span>首开招商佣金</span><strong data-preopening="commission">${fmt(commission, 2)}</strong><em>万元</em></div>
      <div><span>筹备团队及物业</span><strong data-preopening="team-property">${fmt(team + property, 2)}</strong><em>万元</em></div>
      <div><span>筹备营销及其他</span><strong data-preopening="marketing-other">${fmt(marketing + other, 2)}</strong><em>万元</em></div>
      <div class="highlight"><span>筹备期非工程费用合计</span><strong data-preopening="total">${fmt(total, 2)}</strong><em>万元</em></div>
    </div>
    ${preview?.phaseCostBreakdown?.length ? `<div class="form-section"><div class="section-title">筹备期投入在项目总投资中的位置</div><div class="section-note">以下筹备期投入包含土地、建设工程、装修设备、规费、预备费和本页开办费用，是项目开业前形成的资本投入。</div><div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>筹备期投入项目</th><th class="num">金额（万元）</th><th class="num">占比</th></tr></thead><tbody>${preview.phaseCostBreakdown.filter(item => item.stage === '筹备期').map(item => `<tr><td>${escapeHtml(item.name)}</td><td class="num">${fmt(item.value, 2)}</td><td class="num">${fmtPct(Number(item.value || 0) / Math.max(Number(summary.preOpeningInvestment || 0), 1))}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
  `;
}

function renderOperationCostsStep() {
  const model = state.current.model;
  const staffCostMode = model.operations?.staffCostMode || 'organization';
  const organizationAnnual = propertyServiceAnalysis(model).totalActiveStaffCost;
  return `
    <div class="callout">${ICONS.info}<div>本页只核算进入稳定运营期后的年度成本。筹备期团队、首开招商佣金和筹备营销请在“筹备期成本”页单独录入，系统会自动汇总到阶段成本。</div></div>
    <div class="form-section">
      <div class="section-title">运营期成本参数</div>
      ${formulaPanel('运营成本与NOI公式', '运营成本 = 物业基础运营 + 公共能耗 + 人员及物业服务 + 办公行政 + 招商 + 营销 + 维保 + 保险 + 坏账 + 其他 + 业主租金\nNOI = 不含税营业收入 - 不含税运营成本 - 税费', ['SUM', 'MIN', 'IF'], '所有运营参数均可直接修改；系统会按运营年限自动形成年度成本、NOI和现金流。')}
      <div class="form-grid">
        ${textField('物业运营参考单价', 'operations.propertyOpsCost', { type: 'number', unit: '元/㎡/月', help: '仅在物业基础运营直接金额未填写时用于自动核算' })}
        ${textField('公共能耗参考单价', 'operations.energyCost', { type: 'number', unit: '元/㎡/月', help: '仅在公共能耗直接金额未填写时用于自动核算' })}
        ${selectField('人员成本来源', 'operations.staffCostMode', [{ value: 'organization', label: '按组织架构薪资倒推' }, { value: 'area', label: '按面积快速估算' }], { help: '推荐使用组织架构薪资倒推；面积估算仅用于前期快速判断' })}
        ${staffCostMode === 'area' ? textField('商管团队成本', 'operations.staffCostPerSqm', { type: 'number', unit: '元/㎡/月' }) : `<div class="staff-cost-derived"><span>当前由人力资源与物业服务模式倒推</span><strong data-payroll-summary="stableStaffCost">${fmt(organizationAnnual, 2)} 万元/年</strong><small>含税前工资、单位社保、自营招聘培训及第三方物业服务综合管理费，随岗位和服务模式自动更新</small></div>`}
        ${textField('行政办公参考单价', 'operations.adminCostPerSqm', { type: 'number', unit: '元/㎡/月', help: '办公预算金额合计为0时才使用该参考单价' })}
        ${textField('日常维修参考费率', 'operations.repairRate', { type: 'number', unit: '%', scale: 0.01, help: '仅在未填写日常维修直接金额时使用' })}
        ${textField('保险参考费率', 'operations.insuranceRate', { type: 'number', unit: '%', scale: 0.01, help: '仅在未填写保险直接金额时使用' })}
        ${textField('资本化改造率', 'operations.capexRate', { type: 'number', unit: '%', scale: 0.01 })}
      </div>
    </div>
    ${renderOperatingReferencePanel(state.current.model)}
    ${renderOperatingBudgetImport()}
    ${renderOrganizationSection(state.current.model, state.preview)}
    ${renderPropertyServiceSection(state.current.model, state.preview)}
    ${renderOfficeBudgetSection(state.current.model)}
    ${renderLeasingBudgetSection(state.current.model, state.preview)}
    ${renderMarketingBudgetSection(state.current.model, state.preview)}
    ${renderMaintenanceBudgetSection(state.current.model, state.preview)}
    ${renderAnnualCostAdjustmentSection(state.current.model)}
    ${renderOperatingCostSummary(state.preview)}
  `;
}

function renderTaxProfitStep() {
  return `
    <div class="callout">${ICONS.info}<div>本页只处理税费、融资、折旧和退出假设。项目利润、所得税和现金流会在保存后进入“资本金与回报”页统一展示。</div></div>
    <details class="advanced">
      <summary>税费与属地公共费用（高级）</summary>
      <div class="advanced-body">
        ${formulaPanel('增值税、房产税与所得税公式', '销项税 = Σ[含税收入 ÷（1+税率）× 税率]\n进项税 = MIN(销项税, 可抵扣成本 × 抵扣比例 × 进项税率 ÷（1+进项税率）)\n房产税 = IF(从租, 不含税租金×12%, 房产原值×（1-扣除比例）×1.2%)\n所得税 = MAX(0, 税前利润 - 可结转亏损)×所得税率', ['SUM', 'MIN', 'MAX', 'IF', 'POWER'], '税费口径均可在下方调整；地方政策请以项目属地最新规定为准。')}
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
        ${formulaPanel('融资、折旧、所得税与退出公式', '贷款额 = 总投资 × 债务比例\n利息 =（期初余额 + 当年提款÷2）× 年利率\n年折旧 = 建筑投资÷建筑年限 + 装修投资÷装修年限 + 设备投资÷设备年限\n项目现金流 = NOI - 资本化改造 - 所得税 + 期末退出价值\nNPV = Σ[CFt ÷（1+r）^t]；IRR：NPV(IRR)=0', ['IF', 'SUM', 'MAX', 'POWER', 'NPV', 'IRR'], '折旧年限、亏损结转、还款方式、退出方法和敏感性区间均可在下方“公式参数”中调整。')}
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
    </details>
    <details class="advanced" open>
      <summary>公式参数：折旧、亏损、退出与敏感性（可直接调整）</summary>
      <div class="advanced-body">
        <div class="section-note" style="margin-top:0">这些参数直接改变测算公式，不仅影响显示口径。修改后请保存并重新测算。</div>
        <div class="form-grid">
          ${textField('建筑折旧年限', 'formulas.buildingDepreciationYears', { type: 'number', unit: '年' })}
          ${textField('装修折旧年限', 'formulas.fitoutDepreciationYears', { type: 'number', unit: '年' })}
          ${textField('设备折旧年限', 'formulas.equipmentDepreciationYears', { type: 'number', unit: '年' })}
          ${textField('亏损结转年限', 'formulas.taxLossCarryforwardYears', { type: 'number', unit: '年' })}
          ${selectField('贷款还款方式', 'formulas.loanRepaymentMethod', [{value:'equal_principal',label:'等额本金'},{value:'interest_only',label:'先息后本'}], { help: '等额本金逐年还本；先息后本在贷款期末一次还本' })}
          ${selectField('退出估值方法', 'formulas.exitValueMethod', [{value:'noi_cap',label:'NOI ÷ 资本化率'},{value:'revenue_multiple',label:'营业收入 × 倍数'}], { help: '选择期末退出价值的计算公式' })}
          ${textField('退出收入倍数', 'formulas.exitRevenueMultiple', { type: 'number', unit: '倍', optional: true })}
        </div>
        <div class="section-title" style="margin-top:20px">NPV敏感性矩阵</div>
        <div class="form-grid">
          ${textField('租金系数下限', 'formulas.sensitivityRentMin', { type: 'number', unit: '倍', step: '0.01' })}
          ${textField('租金系数上限', 'formulas.sensitivityRentMax', { type: 'number', unit: '倍', step: '0.01' })}
          ${textField('租金系数步长', 'formulas.sensitivityRentStep', { type: 'number', unit: '倍', step: '0.01' })}
          ${textField('投资系数下限', 'formulas.sensitivityCapexMin', { type: 'number', unit: '倍', step: '0.01' })}
          ${textField('投资系数上限', 'formulas.sensitivityCapexMax', { type: 'number', unit: '倍', step: '0.01' })}
          ${textField('投资系数步长', 'formulas.sensitivityCapexStep', { type: 'number', unit: '倍', step: '0.01' })}
        </div>
        <div class="formula-actions"><button class="btn btn-secondary btn-sm" id="reset-formula-defaults">恢复系统默认公式参数</button></div>
      </div>
    </details>
  `;
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
    return `<div class="empty-state"><div class="new-project-icon">${ICONS.pin}</div><h3>请先给项目做地图定位</h3><p>周边市场分析需要项目经纬度。打开“项目基本条件”页，通过地址自动定位或地图选点后再回来。</p><button class="btn btn-primary" id="go-location-step">${ICONS.pin}<span>去定位项目位置</span></button></div>`;
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
      ${renderMarketDetection(analysis)}
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

function renderMarketDetection(analysis) {
  const score = Number(analysis.detectionScore || 0);
  const rings = analysis.ringStats || [];
  return `<div class="market-detection-stats">
    <div><span>${termLabel('商业POI', '商业类POI')}</span><strong>${fmt(analysis.commercialCount ?? analysis.totalPoi)}</strong></div>
    <div><span>${termLabel('直接竞品')}</span><strong>${fmt(analysis.competitorCount)}</strong></div>
    <div><span>${termLabel('商业锚点')}</span><strong>${fmt(analysis.anchorCount || 0)}</strong></div>
    <div><span>${termLabel('交通配套')}</span><strong>${fmt(analysis.transportCount || 0)}</strong></div>
    <div><span>${termLabel('居住社区')}</span><strong>${fmt(analysis.residentialCount || 0)}</strong></div>
    <div><span>${termLabel('商业侦测评分', '侦测评分')}</span><strong>${fmt(score)}/100</strong></div>
  </div>
  <div class="market-detection-grid">
    <div class="card market-score-card">
      <div class="market-score-ring" style="--score:${score * 3.6}deg"><div><strong>${fmt(score)}</strong><span>/100</span></div></div>
      <div class="market-score-copy"><span class="market-grade">${termLabel('商圈等级', analysis.marketGrade || '待评估')}</span><h3>${termLabel('商业侦测评分', '商业侦测评分')}</h3><p>${escapeHtml(analysis.competitionLevel || '')}</p><small>${termLabel('商业密度', '商业密度')} ${fmt(analysis.densityPerKm2, 1)} 个/平方公里</small></div>
    </div>
    <div class="card market-ring-card">
      <h3>分圈层商业侦测</h3>
      <div class="market-ring-grid">${rings.map(ring => `<div class="market-ring-item"><strong>${escapeHtml(ring.label)}</strong><span>${fmt(ring.commercialCount)} 商业POI</span><span>${fmt(ring.competitorCount)} 直接竞品</span><span>${fmt(ring.transportCount)} 交通配套</span><span>${fmt(ring.residentialCount)} 居住片区</span></div>`).join('')}</div>
    </div>
    <div class="card market-insight-card">
      <h3>侦测结论</h3>
      <ul class="analysis-list">${(analysis.conclusions || []).map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>
      <h4>商业机会</h4>
      <ul class="analysis-list opportunity-list">${(analysis.opportunities || []).map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>
    </div>
  </div>`;
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
      <div class="result-hero-top"><div><span class="result-status">${escapeHtml(s.status)}</span><h2>${escapeHtml(s.projectName || '商业项目')}</h2><p>${escapeHtml(s.location || '')}｜总建筑面积 ${fmtArea(s.grossFloorArea)}㎡｜可租赁面积 ${fmtArea(s.leasableArea)}㎡｜${s.calculationMode === 'preliminary' ? `${fmt(s.floorCount)}个楼层` : `${fmt(s.shopsCount)}个铺位`}</p></div><div style="color:#c9dad5;font-size:var(--fs-10);text-align:right">${s.calculationMode === 'preliminary' ? '初步楼层均价测算' : '一铺一价精细测算'}<br>${new Date().toLocaleDateString('zh-CN')}</div></div>
    </div>
    <div class="kpi-grid">
      ${kpiCard('项目总投资', fmt(s.totalInvestment), '万元', '')}
      ${kpiCard('项目IRR', s.projectIrr == null ? '不适用' : fmtPct(s.projectIrr), '税后融资前', kpiClass(s.projectIrr))}
      ${kpiCard('项目NPV', fmt(s.projectNpv), '万元', kpiClass(s.projectNpv))}
      ${kpiCard('稳定期NOI', fmt(s.stableNoi), '万元/年', kpiClass(s.stableNoi))}
      ${kpiCard('NOI回报率', fmtPct(s.noiYield), 'NOI / 总投资', kpiClass(s.noiYield))}
      ${kpiCard('静态回收期', s.staticPayback == null ? '未回收' : `${fmt(s.staticPayback, 1)}年`, '按项目现金流', '')}
    </div>
    ${renderInvestmentOverviewCard()}
    <div class="dashboard-grid">
      <div class="card"><h3>${fmt(state.result?.annual?.length || state.current?.model?.project?.operationYears || 20)}年营业收入与NOI</h3><div class="chart-wrap"><canvas id="revenue-chart"></canvas></div><div class="legend"><span><i style="background:#1d6b57"></i>营业收入</span><span><i style="background:#d6a84b"></i>NOI</span></div></div>
      <div class="card"><h3>投资构成</h3><div class="donut-wrap"><canvas id="cost-donut"></canvas><div class="donut-legend">${state.result.investmentBreakdown.map((item, i) => `<div class="donut-item"><i style="background:${donutColor(i)}"></i><span>${escapeHtml(item.name)}</span><strong>${fmt(item.value)}万</strong></div>`).join('')}</div></div></div>
    </div>
    ${renderOperatingResultCards()}
    ${renderPhaseCostCard()}
    ${renderFundingPlanCard()}
    ${renderLeverageProfitCard()}
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

function renderInvestmentOverviewCard() {
  const result = state.result;
  const s = result?.summary || {};
  const project = result?.model?.project || {};
  const investmentRows = result?.investmentBreakdown || [];
  const landBuildInvestment = investmentRows
    .filter(item => !['招商及开办', '铺底流动资金'].includes(item.name))
    .reduce((sum, item) => sum + Number(item.value || 0), 0);
  const preparationCost = Number(s.preOpeningTeamCost || 0) + Number(s.preOpeningPropertyCost || 0) + Number(s.preOpeningMarketingCost || 0) + Number(s.preOpeningOtherCost || 0) + Number(s.preOpeningCommission || 0);
  const rightsLabel = PROPERTY_RIGHTS_OPTIONS.find(item => item.value === project.propertyRightsStatus)?.label || '未填写';
  const statusLabel = BUILDING_STATUS_OPTIONS.find(item => item.value === project.buildingStatus)?.label || '未填写';
  const checks = result?.confidenceChecks || [];
  const confidenceScore = Number(s.confidenceScore || 0);
  const confidenceClass = confidenceScore >= 85 ? 'high' : confidenceScore >= 60 ? 'medium' : 'low';
  return `<div class="card investment-overview-card">
    <div class="investment-overview-head"><div><span class="eyebrow">Investment decision overview</span><h3>项目投资判断总览</h3><p>五个问题快速回答：项目条件、建设投入、启动资金、运营利润和整体回报。</p></div><div class="confidence-score ${confidenceClass}"><strong>${fmt(confidenceScore)}</strong><span>/100</span><em>测算数据完备度 · ${escapeHtml(s.confidenceLevel || '偏低')}</em></div></div>
    <div class="investment-overview-grid">
      <div><span>01 项目条件</span><strong>${escapeHtml(s.projectName || '未命名项目')}</strong><small>${escapeHtml(rightsLabel)} · ${escapeHtml(statusLabel)}<br>${fmtArea(s.grossFloorArea)}㎡ / 可租 ${fmtArea(s.leasableArea)}㎡</small></div>
      <div><span>02 土地与建设投入</span><strong>${fmt(landBuildInvestment, 2)} 万元</strong><small>土地、前期、建安、装修、设备和预备费</small></div>
      <div><span>03 筹备与启动资金</span><strong>${fmt(s.recommendedStartupCapital, 2)} 万元</strong><small>筹备期非工程费用 ${fmt(preparationCost, 2)} 万元；资金缺口峰值 ${fmt(s.peakEquityFundingRequirement, 2)} 万元</small></div>
      <div><span>04 开业后运营利润</span><strong>${fmt(s.stableNoi, 2)} 万元/年</strong><small>稳定收入 ${fmt(s.stableRevenue, 2)} 万元；NOI率 ${fmtPct(s.stableNoiMargin)}</small></div>
      <div><span>05 项目整体收益</span><strong>${s.projectIrr == null ? '不适用' : fmtPct(s.projectIrr)}</strong><small>NPV ${fmt(s.projectNpv, 2)} 万元；回收期 ${s.staticPayback == null ? '未回收' : `${fmt(s.staticPayback, 2)}年`}</small></div>
    </div>
    <div class="confidence-check-grid">${checks.map(item => `<div class="${item.complete ? 'complete' : 'pending'}"><span>${item.complete ? '✓' : '!'}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></div></div>`).join('')}</div>
    <div class="overview-disclaimer">完备度表示当前测算数据是否充分，不代表项目必然盈利。正式决策仍需补充合同、市场调研、税务意见、工程概算和融资条件。</div>
  </div>`;
}

function renderLeverageProfitCard() {
  const s = state.result?.summary || {};
  const profitClass = Number(s.equityNetCashProfit || 0) >= 0 ? 'positive' : 'negative';
  return `<div class="card leverage-profit-card">
    <div class="leverage-head"><div><span class="eyebrow">Capital leverage & profit</span><h3>资本金杠杆与整体盈利</h3><p>用自有资本金撬动项目总投资，并区分项目净现金收益与股东资本金净收益。</p></div><div class="leverage-formula-pill">${fmt(s.equityCapital, 2)} 万元资本金 × ${fmt(s.leverageMultiple, 2)} 倍杠杆 → 总投 ${fmt(s.totalInvestment, 2)} 万元</div></div>
    <div class="leverage-kpis">
      <div><span>自有资本金</span><strong>${fmt(s.equityCapital, 2)}</strong><em>万元</em></div>
      <div><span>债务融资</span><strong>${fmt(s.loanAmount, 2)}</strong><em>万元</em></div>
      <div><span>杠杆倍数</span><strong>${fmt(s.leverageMultiple, 2)}</strong><em>倍</em></div>
      <div><span>项目净现金收益</span><strong class="${profitClass}">${fmt(s.projectNetCashProfit, 2)}</strong><em>万元</em></div>
      <div><span>资本金净收益</span><strong class="${profitClass}">${fmt(s.equityNetCashProfit, 2)}</strong><em>万元</em></div>
      <div><span>资本金回报倍数</span><strong>${fmt(s.equityReturnMultiple, 2)}</strong><em>倍</em></div>
      <div><span>资本金净收益率</span><strong class="${profitClass}">${fmtPct(s.equityProfitRate)}</strong><em>全周期现金口径</em></div>
      <div><span>股权IRR</span><strong>${s.equityIrr == null ? '不适用' : fmtPct(s.equityIrr)}</strong><em>融资后</em></div>
    </div>
    <div class="leverage-note">示例理解：若自有资本金300万元、项目总投3亿元，则杠杆倍数为100倍。系统会进一步计算项目整体盈利，以及扣除融资、利息和还款后的资本金净收益。杠杆越高，收益放大和偿债风险也会同时放大。</div>
  </div>`;
}

function renderFundingPlanCard() {
  const result = state.result;
  const s = result?.summary || {};
  const phases = result?.phaseCashFlowSummary || [];
  const monthly = result?.monthlyFundingPlan || [];
  if (!phases.length) return '';
  const breakEvenText = s.cashFlowBreakEvenMonth ? `第 ${s.cashFlowBreakEvenMonth} 个月` : s.cashFlowBreakEvenYear ? `${s.cashFlowBreakEvenYear} 年` : '当前测算期内未转正';
  return `<div class="card funding-plan-card">
    <h3>项目启动资金与阶段现金流</h3>
    <div class="funding-kpis">
      <div class="highlight"><span>建议启动资金</span><strong>${fmt(s.recommendedStartupCapital, 2)}</strong><em>万元</em></div>
      <div><span>项目资金缺口峰值</span><strong>${fmt(s.peakProjectFundingRequirement, 2)}</strong><em>万元</em></div>
      <div><span>资本金缺口峰值</span><strong>${fmt(s.peakEquityFundingRequirement, 2)}</strong><em>万元</em></div>
      <div><span>累计现金流转正</span><strong>${escapeHtml(breakEvenText)}</strong><em>${s.cashFlowBreakEvenMonth ? '按月资金计划' : '按年现金流'}</em></div>
    </div>
    <div class="funding-phase-grid">
      ${phases.map(item => `<div class="funding-phase-item"><strong>${escapeHtml(item.phase)}</strong><span>项目净现金流</span><em>${fmt(item.projectCashFlow, 2)} 万元</em><span>资本金净现金流</span><em>${fmt(item.equityCashFlow, 2)} 万元</em></div>`).join('')}
    </div>
    <div class="section-note">月度资金计划按建设期、筹备招商期和开业首年均匀铺排，用于判断需要提前准备的资金。实际支付节点应按工程合同、招商合同和融资提款计划调整。</div>
    <div class="data-table-wrap funding-monthly-wrap"><table class="data-table funding-monthly-table"><thead><tr><th>月份</th><th>阶段</th><th>日历年</th><th class="num">项目净现金流（万元）</th><th class="num">项目累计现金流（万元）</th><th class="num">资本金净现金流（万元）</th><th class="num">资本金累计现金流（万元）</th></tr></thead><tbody>${monthly.map(row => `<tr><td>第${row.month}月</td><td>${escapeHtml(row.phase || '')}</td><td>${row.calendarYear || ''}</td><td class="num ${row.projectCashFlow < 0 ? 'neg' : 'pos'}">${fmt(row.projectCashFlow, 2)}</td><td class="num ${row.cumulativeProjectCashFlow < 0 ? 'neg' : 'pos'}">${fmt(row.cumulativeProjectCashFlow, 2)}</td><td class="num ${row.equityCashFlow < 0 ? 'neg' : 'pos'}">${fmt(row.equityCashFlow, 2)}</td><td class="num ${row.cumulativeEquityCashFlow < 0 ? 'neg' : 'pos'}">${fmt(row.cumulativeEquityCashFlow, 2)}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
}

function renderPhaseCostCard() {
  const result = state.result;
  const s = result?.summary;
  const rows = result?.phaseCostBreakdown || [];
  if (!rows.length) return '';
  const preparation = rows.filter(item => item.stage === '筹备期');
  const operation = rows.filter(item => item.stage === '运营期');
  const tableRows = (items, total) => items.filter(item => Number(item.value || 0) > 0).map(item => `<tr><td>${escapeHtml(item.name)}</td><td class="num">${fmt(item.value, 2)}万</td><td class="num">${fmtPct(Number(item.value || 0) / Math.max(total, 1))}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-table-cell">暂无数据</td></tr>';
  const prepTotal = Number(s.preOpeningInvestment || 0);
  const operationTotal = Number(s.operationPeriodOperatingCost || 0) + Number(s.operationPeriodTaxes || 0);
  return `<div class="card phase-cost-card">
    <h3>筹备期与运营期成本结构</h3>
    <div class="phase-cost-kpis">
      <div><span>筹备期投入</span><strong>${fmt(prepTotal, 2)}</strong><em>万元</em></div>
      <div><span>运营期经营成本</span><strong>${fmt(s.operationPeriodOperatingCost, 2)}</strong><em>万元</em></div>
      <div><span>运营期税费</span><strong>${fmt(s.operationPeriodTaxes, 2)}</strong><em>万元</em></div>
      <div class="highlight"><span>全周期成本（不含融资）</span><strong>${fmt(s.fullCycleCostExcludingFinancing, 2)}</strong><em>万元</em></div>
    </div>
    <div class="phase-cost-grid">
      <div><div class="subsection-heading"><div><strong>筹备期投入构成</strong><span>土地、工程、装修设备、规费、招商开办及流动资金</span></div></div><table class="data-table"><thead><tr><th>成本项目</th><th class="num">金额</th><th class="num">占比</th></tr></thead><tbody>${tableRows(preparation, prepTotal)}</tbody></table></div>
      <div><div class="subsection-heading"><div><strong>运营期成本构成</strong><span>${fmt(state.result?.annual?.length || 0)}个运营年度累计</span></div></div><table class="data-table"><thead><tr><th>成本项目</th><th class="num">金额</th><th class="num">占比</th></tr></thead><tbody>${tableRows(operation, operationTotal)}</tbody></table></div>
    </div>
    <span class="table-subnote">筹备期投入包含项目总投资及铺底流动资金；运营期成本为各运营年度经营成本与税费合计，不含融资利息。包含融资的现金成本为 ${fmt(s.fullCycleCashCostIncludingFinancing, 2)} 万元。</span>
  </div>`;
}

function renderOperatingResultCards() {
  const result = state.result;
  const s = result.summary;
  const breakdown = result.operatingCostBreakdown || [];
  const total = breakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const organization = result.organizationBreakdown || [];
  const propertyServices = result.propertyServiceBreakdown || [];
  const marketing = result.marketingAllocation || [];
  const openingMarketing = result.openingMarketingAllocation || [];
  return `<div class="dashboard-grid operating-result-grid">
    <div class="card operating-cost-card">
      <h3>年度运营成本构成</h3>
      <div class="operating-result-kpis">
        <div><span>编制人数</span><strong>${fmt(s.stableHeadcount)} 人</strong></div>
        <div><span>企业人员成本</span><strong>${fmt(s.stableStaffCost, 2)} 万/年</strong></div>
        <div><span>办公行政</span><strong>${fmt(s.stableOfficeCost, 1)} 万/年</strong></div>
        <div><span>招商费用</span><strong>${fmt(s.stableLeasingCost, 1)} 万/年</strong></div>
        <div><span>物业管理费收入</span><strong>${fmt(s.stablePropertyManagementIncome, 1)} 万/年</strong></div>
        <div><span>商业管理费收入</span><strong>${fmt(s.stableCommercialManagementIncome, 1)} 万/年</strong></div>
        <div><span>中央空调费收入</span><strong>${fmt(s.stableCentralAcIncome, 1)} 万/年</strong></div>
        <div><span>三项费用合计</span><strong>${fmt(s.stablePropertyFeeIncome, 1)} 万/年</strong></div>
        <div><span>营销费用</span><strong>${fmt(s.stableMarketingCost, 1)} 万/年</strong></div>
        <div><span>维保费用</span><strong>${fmt(s.stableMaintenanceCost, 1)} 万/年</strong></div>
      </div>
      <div class="operating-cost-bars">${breakdown.map((item, i) => `<div class="operating-cost-row"><span>${escapeHtml(item.name)}</span><div><i style="width:${Math.max(2, Number(item.value || 0) / Math.max(total, 1) * 100)}%;background:${donutColor(i)}"></i></div><strong>${fmt(item.value, 1)}</strong><em>${fmtPct(Number(item.value || 0) / Math.max(total, 1))}</em></div>`).join('')}</div>
      <div class="budget-total-line"><span>稳定期运营成本及税费合计</span><strong>${fmt(total, 1)} 万元/年</strong></div>
    </div>
    <div class="card payroll-result-card">
      <h3>组织架构与人员成本</h3>
      <div class="payroll-result-summary">
        <div><span>税前年度工资</span><strong>${fmt(s.annualGrossPayroll, 2)}</strong><em>万元</em></div>
        <div><span>个人社保公积金</span><strong>${fmt(s.annualEmployeeSocialInsurance, 2)}</strong><em>万元</em></div>
        <div><span>个人所得税</span><strong>${fmt(s.annualIndividualIncomeTax, 2)}</strong><em>万元</em></div>
        <div><span>员工实发工资</span><strong>${fmt(s.annualNetPayroll, 2)}</strong><em>万元</em></div>
        <div><span>单位社保公积金</span><strong>${fmt(s.annualEmployerSocialInsurance, 2)}</strong><em>万元</em></div>
        <div><span>实际人员及服务成本</span><strong>${fmt(s.stableStaffCost, 2)}</strong><em>万元</em></div>
      </div>
      <div class="data-table-wrap" style="max-height:520px"><table class="data-table payroll-result-table"><thead><tr><th>部门</th><th>岗位构成</th><th class="num">人数</th><th class="num">税前工资</th><th class="num">个人社保</th><th class="num">个税</th><th class="num">实发</th><th class="num">单位社保</th><th class="num">企业成本</th></tr></thead><tbody>${organization.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${(item.positions || []).map(position => `<span class="tag">${escapeHtml(position.name)}${Number(position.headcount) > 1 ? ` × ${fmt(position.headcount)}` : ''}</span>`).join(' ')}</td><td class="num">${fmt(item.headcount)}</td><td class="num">${fmt(item.grossPayroll, 2)}万</td><td class="num">${fmt(item.employeeSocialInsurance, 2)}万</td><td class="num">${fmt(item.individualIncomeTax, 2)}万</td><td class="num">${fmt(item.netSalary, 2)}万</td><td class="num">${fmt(item.employerSocialInsurance, 2)}万</td><td class="num"><strong>${fmt(item.annualCost, 2)}万</strong></td></tr>`).join('')}</tbody></table></div>
      <span class="table-subnote">工资均为税前应发口径；社保公积金按税前月薪×12个月×配置比例估算；招聘培训费在企业人员成本之外另计。比例与缴费基数必须按项目属地政策复核。</span>
    </div>
  </div>
  ${propertyServices.length ? `<div class="card property-service-result-card">
    <h3>物业服务模式与第三方管理费</h3>
    <div class="property-service-summary">
      <div><span>岗位基础成本</span><strong>${fmt(s.annualServicePositionBaseCost, 2)}</strong><em>万元</em></div>
      <div><span>第三方综合管理费</span><strong>${fmt(s.annualOutsourcedManagementFee, 2)}</strong><em>万元</em></div>
      <div><span>自营招聘培训费</span><strong>${fmt(propertyServices.reduce((sum, item) => sum + Number(item.selfRecruitmentTraining || 0), 0), 2)}</strong><em>万元</em></div>
      <div><span>年度物业服务成本</span><strong>${fmt(s.annualPropertyServiceTotal, 2)}</strong><em>万元</em></div>
      <div class="highlight"><span>实际人员及服务成本</span><strong>${fmt(s.stableStaffCost, 2)}</strong><em>万元</em></div>
    </div>
    <div class="property-service-result-list">${propertyServices.map(item => `<div class="property-service-result-row">
      <div class="service-result-title"><strong>${escapeHtml(item.name)}</strong><span class="tag">${escapeHtml(item.modeLabel)}</span><small>${fmt(item.headcount)}人 · ${(item.positions || []).map(name => escapeHtml(name)).join('、') || '未匹配岗位'}</small></div>
      <div><span>岗位基础成本</span><strong>${fmt(item.basePositionCost, 2)}万</strong></div>
      <div><span>折算比例</span><strong>${fmtPct(item.positionFactor)}</strong></div>
      <div><span>第三方费率</span><strong>${fmtPct(item.managementFeeRate)}</strong></div>
      <div><span>第三方管理费</span><strong>${fmt(item.managementFee, 2)}万</strong></div>
      <div class="highlight"><span>年度服务成本</span><strong>${fmt(item.serviceCost, 2)}万</strong></div>
    </div>`).join('')}</div>
    <span class="table-subnote">自营服务成本含内部招聘培训；第三方常驻按岗位成本加综合管理费；非常驻先按折算比例计算岗位成本再加综合管理费。第三方费率应包含管理费、利润、保险、装备、培训及税费。</span>
  </div>` : ''}
  <div class="card marketing-allocation-card">
    <h3>年度营销推广费用分解</h3>
    <div class="section-note">稳定年常规营销预算 ${fmt(s.annualMarketingBudget || s.stableMarketingCost, 1)} 万元/年；开业首年另加专项 ${fmt(s.openingMarketingItemsCost || 0, 1)} 万元，首年合计 ${fmt(s.firstYearMarketingCost || 0, 1)} 万元。权重由金额自动反算。</div>
    <div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>常规营销类别</th><th class="num">年度金额</th><th class="num">自动权重</th><th>费用内容</th></tr></thead><tbody>${marketing.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td class="num">${fmt(item.amount, 1)}万</td><td class="num"><span class="auto-weight">${fmtPct(item.share)}</span></td><td>${escapeHtml(item.note || '')}</td></tr>`).join('')}</tbody></table></div>
    ${openingMarketing.length ? `<div class="subsection-heading opening-marketing-heading"><div><strong>开业首年专项</strong><span>仅运营第1年发生</span></div></div><div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>开业专项</th><th class="num">首年金额</th><th class="num">占首年营销预算</th><th>费用内容</th></tr></thead><tbody>${openingMarketing.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td class="num">${fmt(item.amount, 1)}万</td><td class="num"><span class="auto-weight">${fmtPct(item.share)}</span></td><td>${escapeHtml(item.note || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </div>`;
}

function renderFloorResultTable() {
  const floors = (state.result?.floors || []).filter(floor => Number(floor.buildingArea || 0) > 0 || Number(floor.leasableArea || 0) > 0);
  if (!floors.length) return '';
  const totalMonthly = floors.reduce((sum, floor) => sum + Number(floor.monthlyRevenue ?? floor.monthlyRent ?? 0), 0);
  return `<div class="card" style="margin-bottom:16px"><h3>楼层收益拆分</h3><div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>楼层</th><th class="num">建筑面积</th><th class="num">可租赁面积</th><th class="num">平均月收益</th><th class="num">满租月收益</th><th class="num">收益占比</th></tr></thead><tbody>${floors.map(floor => `<tr><td><strong>${escapeHtml(floor.name || '未命名')}</strong></td><td class="num">${fmtArea(floor.buildingArea)}</td><td class="num">${fmtArea(floor.leasableArea)}</td><td class="num">${fmt(floor.weightedRent || floor.avgRent, 1)}</td><td class="num">${fmt(floor.monthlyRevenue ?? floor.monthlyRent)}</td><td class="num">${fmtPct(totalMonthly ? (floor.monthlyRevenue ?? floor.monthlyRent) / totalMonthly : 0)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function kpiCard(label, value, unit, cls) {
  return `<div class="kpi-card ${cls}"><div class="label">${termLabel(label)}</div><div class="value">${value}</div><div class="unit">${unit}</div></div>`;
}

function donutColor(i) {
  return ['#103b33', '#1d6b57', '#d6a84b', '#8ea9a1', '#b7a888', '#527c70', '#e4cf9f'][i % 7];
}

function bindStepInputs() {
  document.querySelectorAll('[data-path]').forEach(input => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    if (input.type === 'number') input.addEventListener('blur', () => { input.value = roundDisplayValue(input.value, 2); });
    input.addEventListener(eventName, () => {
      const path = input.dataset.path;
      const type = input.dataset.type;
      const scale = Number(input.dataset.scale || 1);
      let value = input.value;
      if (input.type === 'checkbox') value = input.checked;
      else if (type === 'number') {
        value = value === '' ? 0 : Number(value) * scale;
        if (input.dataset.annualize === 'true') {
          const period = getPath(state.current.model, input.dataset.periodPath || '');
          if (period === 'monthly') value *= 12;
        }
      }
      if (type === 'number' && (['project.gbaOverride', 'project.landArea'].includes(path) || /(?:buildingArea|leasableArea)$/.test(path))) {
        value = roundAreaValue(value);
      }
      if (type === 'boolean' || (path === 'valuation.includeExit')) {
        if (value === 'true') value = true;
        if (value === 'false') value = false;
      }
      const previousCentralAcFee = path === 'revenues.centralAcFee' ? Number(getPath(state.current.model, path) || 0) : null;
      setPath(state.current.model, path, value);
      if (path === 'revenues.centralAcFee' && Array.isArray(state.current.model.revenues?.centralAcBuildings)) {
        state.current.model.revenues.centralAcBuildings.forEach(config => {
          if (!config.enabled && Number(config.fee || 0) === previousCentralAcFee) config.fee = Number(value || 0);
        });
      }
      if (input.dataset.annualize === 'true') {
        const annualizedRow = input.closest('[data-annualized-row]');
        if (annualizedRow) annualizedRow.dataset.annualValue = String(value);
      }
      if (input.dataset.budgetPeriod === 'true' || input.dataset.channelMode === 'true') {
        state.dirty = true;
        state.preview = null;
        renderWorkspace();
        scheduleLivePreview();
        return;
      }
      if (['ownerRent.enabled', 'ownerRent.leaseType', 'ownerRent.landPricingMode', 'ownerRent.propertyPricingMode', 'ownerRent.growthMode', 'formulas.rentGrowthMode', 'formulas.propertyFeeGrowthMode', 'formulas.commercialManagementGrowthMode', 'formulas.centralAcGrowthMode'].includes(path)) {
        state.dirty = true;
        state.preview = null;
        renderWorkspace();
        scheduleLivePreview();
        return;
      }
      if (path.startsWith('revenues.centralAcBuildings.') && path.endsWith('.enabled')) {
        state.dirty = true;
        state.preview = null;
        renderWorkspace();
        scheduleLivePreview();
        return;
      }
      if (path === 'operations.staffCostMode') {
        state.dirty = true;
        state.preview = null;
        renderWorkspace();
        scheduleLivePreview();
        return;
      }
      if (path === 'project.developmentType' || path === 'project.projectType') {
        const reference = applyCostReference(state.current.model);
        toast(`已按${reference.cityLabel} · ${reference.developmentLabel}更新参考造价`, 'success');
        renderWorkspace();
        scheduleLivePreview();
        return;
      }
      const formulaCurrent = input.closest('.field')?.querySelector('.formula-current');
      if (formulaCurrent) formulaCurrent.textContent = `当前：${input.value || '未填写'}`;
      if (path === 'project.location') {
        state.current.model.project.latitude = null;
        state.current.model.project.longitude = null;
        state.current.model.project.locationSource = '';
        if (state.current.model.market) state.current.model.market.lastAnalysis = null;
        state.marketAnalysis = null;
        state.marketError = null;
        applyCostReference(state.current.model);
        refreshCostReferencePreview();
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
    if (/^floors\.\d+\.(building|name)$/.test(input.dataset.path || '')) {
      input.addEventListener('blur', () => {
        const normalized = input.dataset.path.endsWith('.building') ? normalizeBuildingInput(input.value) : normalizeFloorInput(input.value);
        input.value = normalized;
        setPath(state.current.model, input.dataset.path, normalized);
        state.dirty = true;
        updateSaveState();
        scheduleLivePreview();
      });
    }
  });
  bindCostReferenceAction();
  document.getElementById('open-map-picker')?.addEventListener('click', openMapPicker);
  document.getElementById('reset-formula-defaults')?.addEventListener('click', () => {
    state.current.model.formulas = { ...DEFAULT_FORMULAS };
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast('已恢复系统默认公式参数', 'success');
  });
  if (state.step === 2) { bindShopsStep(); bindMarketStep(); }
  if (state.step === 4) bindOperationsBudgets();
  if (state.step === 1) bindCostPresets();
  if (state.step === 6) bindResultsActions();
}

function bindFormulaToolbar() {
  document.getElementById('open-term-glossary')?.addEventListener('click', openTermGlossary);
  document.getElementById('open-function-glossary')?.addEventListener('click', openFunctionGlossary);
  const button = document.getElementById('toggle-all-formulas');
  if (!button) return;
  const cards = () => Array.from(document.querySelectorAll('.inline-formula, .section-formula'));
  let open = false;
  button.addEventListener('click', () => {
    open = !open;
    cards().forEach(card => { card.open = open; });
    button.textContent = open ? '收起全部公式' : '显示全部公式';
  });
}

function updateSaveState() {
  const el = document.getElementById('save-state');
  if (!el) return;
  el.classList.toggle('dirty', state.dirty);
  el.classList.toggle('saved', !state.dirty);
  el.querySelector('span:last-child').textContent = state.dirty ? '有未保存修改' : '已保存';
}

function bindCostPresets() {
  document.querySelectorAll('[data-reference-format]').forEach(btn => btn.addEventListener('click', () => {
    const reference = applyCostReference(state.current.model, { projectType: btn.dataset.referenceFormat }, true);
    toast(`已按${reference.formatLabel}重算参考造价，请根据实际项目调整`, 'success');
  }));
  bindCostReferenceAction();
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
      resultsEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:var(--fs-10)">未找到匹配地址，请尝试更具体的道路或地标名称。</div>';
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
      resultsEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:var(--fs-10)">正在搜索…</div>';
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
      resultsEl.innerHTML = `<div style="padding:12px;color:var(--red);font-size:var(--fs-10)">${escapeHtml(error.message)}</div>`;
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
    applyCostReference(state.current.model);
    state.dirty = true;
    close();
    renderWorkspace();
    scheduleLivePreview();
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
    updateOperatingPreviewDom(result);
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
  const floors = new Map((state.preview.floors || []).map(floor => [buildingFloorKey(floor), floor]));
  document.querySelectorAll('[data-floor-actual]').forEach(el => {
    const floor = floors.get(el.dataset.floorActual);
    if (floor) el.textContent = fmt(floor.weightedRent || floor.avgRent, 1);
  });
  const shops = new Map((state.preview.shops || []).map(shop => [shopRecordKey(shop), shop]));
  document.querySelectorAll('[data-shop-revenue]').forEach(el => {
    const shop = shops.get(el.dataset.shopRevenue);
    if (shop) el.textContent = fmt(shop.monthlyRevenue);
  });
  document.querySelectorAll('[data-shop-base]').forEach(el => {
    const shop = shops.get(el.dataset.shopBase);
    if (shop) el.textContent = fmt(shop.baseRent, 1);
  });
  document.querySelectorAll('[data-shop-unit-rent]').forEach(el => {
    const shop = shops.get(el.dataset.shopUnitRent);
    if (shop) el.textContent = fmt(shop.rent, 2);
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

function ensureFloorsFromShops(model, options = {}) {
  model.floors ||= [];
  const shops = model.shops || [];
  const groups = new Map();
  const categoryRent = Object.fromEntries((model.categories || []).map(cat => [cat.name, Number(cat.rent || 0)]));
  for (const shop of shops) {
    const building = String(shop.building || '1号楼').trim() || '1号楼';
    const name = String(shop.floor || '未分楼层').trim() || '未分楼层';
    const key = `${building}||${name}`;
    if (!groups.has(key)) groups.set(key, { building, name, buildingArea: 0, leasableArea: 0, rentArea: 0, rentValue: 0 });
    const group = groups.get(key);
    const rent = shop.rentOverride == null ? categoryRent[shop.category] || 0 : Number(shop.rentOverride);
    const rentArea = rentAreaFor(shop, model);
    group.buildingArea += Number(shop.buildingArea || 0);
    group.leasableArea += Number(shop.leasableArea || 0);
    group.rentArea += rentArea;
    group.rentValue += rentArea * rent;
  }
  if (options.replace) {
    model.floors = [...groups.values()].map(group => ({
      building: group.building,
      name: group.name,
      rentAreaBasis: 'inherit',
      buildingArea: roundAreaValue(group.buildingArea),
      leasableArea: roundAreaValue(group.leasableArea),
      avgRent: Number((group.rentArea ? group.rentValue / group.rentArea : 0).toFixed(2)),
      salesPerSqmMonth: 0,
      concessionRate: 0,
    }));
    return;
  }
  const existing = new Map((model.floors || []).map(floor => [buildingFloorKey(floor), floor]));
  for (const [key, group] of groups) {
    const avg = group.rentArea ? group.rentValue / group.rentArea : 0;
    const floor = existing.get(key);
    if (floor) {
      if (!Number(floor.buildingArea)) floor.buildingArea = group.buildingArea;
      if (!Number(floor.leasableArea)) floor.leasableArea = group.leasableArea;
      if (!Number(floor.avgRent)) floor.avgRent = Number(avg.toFixed(2));
    } else {
      model.floors.push({ building: group.building, name: group.name, rentAreaBasis: 'inherit', buildingArea: group.buildingArea, leasableArea: group.leasableArea, avgRent: Number(avg.toFixed(2)) });
    }
  }
}

function bindShopsStep() {
  const applyBenchmark = (presetKey, overwrite = false) => {
    const preset = SETTLEMENT_PRESETS[presetKey];
    if (!preset) return;
    const model = state.current.model;
    model.project.projectType = preset.shortLabel;
    applySettlementBenchmark(model, presetKey, { overwrite });
    applyCostReference(model);
    const benchmarkRows = model.categories.map(cat => benchmarkForCategory(model, cat.name));
    const avgSales = benchmarkRows.reduce((sum, rule) => sum + Number(rule.salesPerSqmMonth || 0), 0) / Math.max(benchmarkRows.length, 1);
    const avgRate = benchmarkRows.reduce((sum, rule) => sum + Number(rule.concessionRate || 0), 0) / Math.max(benchmarkRows.length, 1);
    (model.floors || []).forEach(floor => {
      if (overwrite || !Number(floor.salesPerSqmMonth)) floor.salesPerSqmMonth = Number(avgSales.toFixed(0));
      if (overwrite || !Number(floor.concessionRate)) floor.concessionRate = Number(avgRate.toFixed(4));
    });
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast(`已应用${preset.label}，销售与扣点按地区/商业侦测修正；结算方式保持不变`, 'success');
  };
  document.querySelectorAll('[data-settlement-preset]').forEach(btn => btn.addEventListener('click', () => {
    applyBenchmark(btn.dataset.settlementPreset, true);
  }));
  document.querySelectorAll('[data-settlement-current-benchmark]').forEach(btn => btn.addEventListener('click', () => {
    const model = state.current.model;
    applyBenchmark(settlementPresetKeyFor(model), false);
  }));
  document.querySelectorAll('[data-shop-mode]').forEach(btn => btn.addEventListener('click', () => {
    state.current.model.calculationMode = btn.dataset.shopMode;
    if (btn.dataset.shopMode === 'detailed') ensureFloorsFromShops(state.current.model);
    state.preview = null;
    state.dirty = true;
    renderWorkspace();
    scheduleLivePreview();
  }));
  document.getElementById('view-detailed-shops')?.addEventListener('click', () => {
    state.current.model.calculationMode = 'detailed';
    ensureFloorsFromShops(state.current.model, { replace: true });
    state.preview = null;
    state.result = null;
    state.dirty = true;
    renderWorkspace();
    scheduleLivePreview();
  });
  document.getElementById('add-floor')?.addEventListener('click', () => {
    const floors = state.current.model.floors || (state.current.model.floors = []);
    const names = new Set(floors.map(item => buildingFloorKey(item)));
    const building = floors.at(-1)?.building || '1号楼';
    let index = floors.length + 1;
    let name = `${index}F`;
    while (names.has(`${building}||${name}`)) { index += 1; name = `${index}F`; }
    floors.push({ building, name, rentAreaBasis: 'inherit', buildingArea: 0, leasableArea: 0, avgRent: 0, salesPerSqmMonth: 0, concessionRate: 0 });
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
    state.current.model.shops = state.current.model.shops.filter(shop => shopRecordKey(shop) !== btn.dataset.deleteShop);
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
  document.getElementById('shop-page-size')?.addEventListener('change', event => {
    state.shopPageSize = Number(event.target.value) || 100;
    state.shopPage = 1;
    renderWorkspace();
  });
}

async function handleShopImport(file) {
  if (file.size > 20 * 1024 * 1024) return toast('文件不能超过20MB', 'error');
  setBusy(true);
  try {
    const contentBase64 = await fileToBase64(file);
    const payload = await api('/api/import-shops', { method: 'POST', body: { filename: file.name, contentBase64 } });
    state.current.model.calculationMode = 'detailed';
    state.current.model.shops = payload.shops || [];
    state.importWarnings = payload.warnings || [];
    state.rentImportStats = {
      rentColumn: payload.rentColumn || '',
      rentRecognizedCount: Number(payload.rentRecognizedCount || 0),
      rentMissingCount: Number(payload.rentMissingCount || 0),
      total: payload.shops?.length || 0,
      propertyFeeOverrideCount: Number(payload.propertyFeeOverrideCount || 0),
      commercialManagementFeeOverrideCount: Number(payload.commercialManagementFeeOverrideCount || 0),
      centralAcFeeOverrideCount: Number(payload.centralAcFeeOverrideCount || 0),
    };
    state.importHints = payload.projectHints || {};
    applyImportHints(payload.projectHints || {});
    ensureFloorsFromShops(state.current.model, { replace: true });
    state.dirty = true;
    state.shopPage = 1;
    state.preview = null;
    state.result = null;
    renderWorkspace();
    const preview = await runLivePreview();
    if (preview) {
      state.preview = preview;
      state.result = preview;
      renderWorkspace();
    }
    const importedCount = payload.shops?.length || 0;
    const recognizedRentCount = payload.rentRecognizedCount || 0;
    const feeSummary = `物业费覆盖${payload.propertyFeeOverrideCount || 0}个、商管费覆盖${payload.commercialManagementFeeOverrideCount || 0}个、空调费覆盖${payload.centralAcFeeOverrideCount || 0}个`;
    toast(`已导入 ${importedCount} 个铺位，识别 ${recognizedRentCount} 个租金单价；${feeSummary}${importedCount && !recognizedRentCount ? '，请检查租金单价列' : ''}`, importedCount && recognizedRentCount ? 'success' : 'error');
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
  const model = state.current.model;
  const project = model.project;
  const projectHints = hints.project || {};
  const revenueHints = hints.revenues || {};
  const numeric = new Set(['startYear', 'constructionYears', 'gbaOverride', 'landArea', 'landPrice', 'otherPreOpening', 'preOpeningMarketing']);
  for (const [key, value] of Object.entries(projectHints)) {
    if (value === null || value === undefined || value === '') continue;
    if (numeric.has(key)) project[key] = Number(value) || 0;
    else if (['name', 'location', 'projectType', 'developmentType', 'rentAreaBasis'].includes(key)) project[key] = value;
    else if (project[key] === '' || project[key] === null || project[key] === undefined) project[key] = value;
  }
  model.revenues = model.revenues || {};
  for (const key of ['propertyFee', 'commercialManagementFee', 'centralAcFee']) {
    if (revenueHints[key] === null || revenueHints[key] === undefined || revenueHints[key] === '') continue;
    model.revenues[key] = Math.max(0, Number(revenueHints[key]) || 0);
  }
  if (Array.isArray(hints.centralAcBuildings) && hints.centralAcBuildings.length) {
    model.revenues.centralAcBuildings = hints.centralAcBuildings;
  }
  const syncedCount = Object.keys(projectHints).length + Object.keys(revenueHints).length + (hints.centralAcBuildings?.length || 0);
  if (syncedCount) toast('已同步项目信息、三项收费单价和楼栋收费设置', 'success');
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
              <div class="field"><label>楼栋</label><input class="input" name="building" list="building-options" placeholder="例如 1号楼" value="${escapeHtml(editing?.building || '1号楼')}"><datalist id="building-options">${[...new Set([...(m.floors || []).map(floor => floor.building || '1号楼'), ...(m.shops || []).map(shop => shop.building || '1号楼')])].map(name => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist></div>
              <div class="field"><label>楼层</label><input class="input" name="floor" list="floor-options" placeholder="例如 1F" value="${escapeHtml(editing?.floor || '')}"><datalist id="floor-options">${(m.floors || []).map(floor => `<option value="${escapeHtml(floor.name)}"></option>`).join('')}</datalist></div>
              <div class="field"><label>租金核算面积口径</label><select class="select" name="rentAreaBasis">${Object.entries(RENT_BASIS_LABELS).map(([value,label]) => `<option value="${value}" ${((editing?.rentAreaBasis || 'inherit') === value) ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
              <div class="field"><label>建筑面积（㎡）</label><input class="input" name="buildingArea" type="number" step="0.01" required value="${editing ? Number(editing.buildingArea || 0).toFixed(2) : ''}"></div>
              <div class="field"><label>实用面积（套内/租赁面积，㎡）</label><input class="input" name="leasableArea" type="number" step="0.01" required value="${editing ? Number(editing.leasableArea || 0).toFixed(2) : ''}"></div>
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
      id: String(f.get('id')).trim(), building: normalizeBuildingInput(f.get('building')), floor: normalizeFloorInput(f.get('floor')), rentAreaBasis: String(f.get('rentAreaBasis') || 'inherit'), buildingArea: roundAreaValue(f.get('buildingArea')), leasableArea: roundAreaValue(f.get('leasableArea')), category: f.get('category'), status: f.get('status'), rentOverride: f.get('rentOverride') ? Number(f.get('rentOverride')) : null, note: '',
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
    state.step = 6;
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
  const scale = Number(state.fontScale) || 1;
  ctx.font = `${9 * scale}px Arial`;
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
  const scale = Number(state.fontScale) || 1;
  ctx.textAlign = 'center'; ctx.fillStyle = '#103b33'; ctx.font = `600 ${22 * scale}px Arial`;
  ctx.fillText(formatAxis(total), centerX, centerY - 2);
  ctx.fillStyle = '#7a8580'; ctx.font = `${9 * scale}px Arial`; ctx.fillText('万元', centerX, centerY + 15);
}

window.addEventListener('resize', () => {
  if (state.step === 6 && state.current) renderResultCharts();
});

document.addEventListener('click', event => {
  const functionButton = event.target.closest('[data-function]');
  if (functionButton) {
    event.preventDefault();
    openFunctionHelp(functionButton.dataset.function);
    return;
  }
  const termButton = event.target.closest('[data-term]');
  if (termButton) {
    event.preventDefault();
    openTermHelp(termButton.dataset.term);
  }
});

applyFontScale(state.fontScale);
boot();
