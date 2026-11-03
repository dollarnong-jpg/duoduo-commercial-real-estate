import './backend.js?v=20261103-static12';
await window.__duoduoBackendReady;

const APP_VERSION = '1.2.1';
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

const DEFAULT_FORMULAS = {
  rentGrowthMode: 'compound',
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

const FIELD_FORMULAS = {
  'project.gbaOverride': { title: '总建筑面积', formula: '总建筑面积 = 手动总建筑面积；若为0，则 = 商铺建筑面积 ×（1 + 公区系数）', functions: ['IF', 'SUM'], role: '作为建安、装修、设备、预备费和单位投资指标的计算基数。' },
  'project.commonAreaFactor': { title: '公区分摊系数', formula: '总建筑面积 = 商铺建筑面积合计 ×（1 + 公共部位及设备房分摊系数）', functions: ['SUM'], role: '提高该系数会增加总建筑面积，进而增加按面积计取的建设投资。' },
  'project.landArea': { title: '占地面积与土地使用税', formula: '城镇土地使用税 = 占地面积 × 单位土地税额 ÷ 10000', functions: ['ROUND'], role: '仅影响城镇土地使用税，不影响土地价款。' },
  'project.landPrice': { title: '土地价款与契税', formula: '土地取得成本 = 土地价款 + 土地价款 × 契税率', functions: ['SUM'], role: '土地价款同时进入项目总投资和融资基数。' },
  'project.otherPreOpening': { title: '其他前期及开办费用', formula: '项目总投资 = 土地及契税 + 建设工程 + 预备费 + 招商开办 + 流动资金', functions: ['SUM'], role: '该金额直接计入招商及开办投资。' },
  'project.preOpeningMarketing': { title: '筹备期营销费用', formula: '招商及开办 = 招商佣金 + 筹备期营销费用 + 其他前期费用', functions: ['SUM'], role: '该金额直接计入项目总投资。' },
  'project.contingencyRate': { title: '预备费', formula: '预备费 = 直接工程费 × 预备费费率', functions: ['SUM', 'ROUND'], role: '直接工程费包括前期、建安、公共配套、装修、设备和其他工程。' },
  'project.constructionYears': { title: '建设期与贷款提款', formula: '总测算期 = 建设期 + 运营期；建设期按0.55、0.45比例提款', functions: ['SUM', 'INDEX'], role: '建设期影响首笔经营年度、利息资本化与现金流时点。' },
  'project.operationYears': { title: '运营期与NPV', formula: '总测算期 = 建设期 + 运营期；NPV = Σ[CFt ÷（1+r）^t]', functions: ['SUM', 'POWER', 'NPV'], role: '延长运营期会改变累计现金流和退出价值时点。' },
  'project.revenueModel': { title: '项目计租方式', formula: '纯租金 = 保底；纯扣点 = 扣点；取高 = MAX(保底, 扣点)', functions: ['IF', 'MAX'], role: '该选择是项目默认结算方式，各业态可单独覆盖。' },
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
  'operations.rentGrowth': { title: '租金增长', formula: '复利：租金 ×（1 + 增长率）^（运营年 - 1）；单利：租金 ×［1 + 增长率 ×（运营年 - 1）］', functions: ['POWER', 'IF'], role: '增长方式可在“公式参数”中选择复利或单利。' },
  'operations.salesGrowth': { title: '联营销售额增长', formula: '联营扣点收入 = 销售基数 × 扣点率 × 销售额增长因子', functions: ['POWER', 'MAX'], role: '仅影响联营扣点收入；纯租金模式不产生此项。' },
  'operations.collectionRate': { title: '租金收缴率', formula: '坏账损失 = 不含税营业收入 ×（1 - 租金收缴率）', functions: ['SUM'], role: '收缴率越低，运营成本和现金流压力越大。' },
  'operations.renewalCycle': { title: '续租周期', formula: '续租佣金年度 = 运营年 MOD 续租周期 = 0', functions: ['MOD', 'IF'], role: '用于测算续租佣金和招商费用发生时点。' },
  'operations.commissionMonths': { title: '首开招商佣金', formula: '首开招商佣金 = 月租金 × 招商佣金月数 × 首年出租率', functions: ['SUM'], role: '该费用计入项目总投资中的招商及开办。' },
  'operations.renewalCommissionMonths': { title: '续租佣金', formula: '续租佣金 = 月租金 × 续租佣金月数 × 当年出租率', functions: ['MOD', 'IF'], role: '按续租周期进入运营期现金流。' },
  'operations.depositMonths': { title: '租赁保证金', formula: '租赁保证金 = 月租金 × 保证金月数', functions: ['SUM'], role: '作为招商期现金流入和期末退还的参考。' },
  'revenues.propertyFee': { title: '物业管理费收入', formula: '物业费收入 = 可租赁面积 × 物业费单价 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '按可租赁面积计取，并计算物业费增值税。' },
  'revenues.otherIncomeRatio': { title: '多经收入', formula: '多经收入 = 租金收入 × 多经收入占比', functions: ['SUM'], role: '包含广告、场地、多经点位等收入。' },
  'revenues.parkingSpaces': { title: '停车收入', formula: '停车收入 = 车位数 × 停车月租 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '与停车月租共同决定停车收入。' },
  'revenues.parkingMonthly': { title: '停车月租', formula: '停车收入 = 车位数 × 停车月租 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '与停车位数量共同决定停车收入。' },
  'operations.propertyOpsCost': { title: '物业运营成本', formula: '物业运营成本 = 总建筑面积 × 单价 × 12 × 运营爬坡系数 ÷ 10000', functions: ['SUM'], role: '进入运营成本、NOI和铺底流动资金估算。' },
  'operations.energyCost': { title: '公共能耗', formula: '公共能耗 = 总建筑面积 × 能耗单价 × 12 × 出租率 ÷ 10000', functions: ['SUM'], role: '按出租率联动，空置率越高能耗成本越低。' },
  'operations.staffCostPerSqm': { title: '商管团队成本', formula: '商管团队成本 = 总建筑面积 × 团队成本单价 × 12 × 爬坡系数 ÷ 10000', functions: ['SUM'], role: '进入运营成本和NOI。' },
  'operations.adminCostPerSqm': { title: '行政办公成本', formula: '行政办公成本 = 总建筑面积 × 行政成本单价 × 12 × 爬坡系数 ÷ 10000', functions: ['SUM'], role: '进入运营成本和NOI。' },
  'operations.marketingRate': { title: '年度营销费用', formula: '营销费用 = 不含税营业收入 × 营销费用率', functions: ['SUM'], role: '与筹备期营销费用分开计算。' },
  'operations.repairRate': { title: '维修改造费', formula: '维修改造费 =（建安 + 装修 + 设备 + 其他工程 + 预备费）× 维修改造费率 × 爬坡系数', functions: ['SUM'], role: '用于年度运营成本。' },
  'operations.insuranceRate': { title: '保险费用', formula: '保险费用 =（建安 + 装修 + 设备 + 其他工程）× 保险费率', functions: ['SUM'], role: '用于年度运营成本。' },
  'operations.capexRate': { title: '资本化改造', formula: '资本化改造 = 不含税租金收入 × 资本化改造率', functions: ['SUM'], role: '作为项目现金流中的年度资本开支扣除项。' },
  'operations.otherOpexRate': { title: '其他运营费用', formula: '其他运营费用 = 不含税营业收入 × 其他运营费用率', functions: ['SUM'], role: '进入运营成本和NOI。' },
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
  'organization.socialInsuranceRate': { title: '社保公积金比例', formula: '部门年成本 = 人数 × 月薪 ×（12 + 年终奖月数）×（1 + 社保公积金比例）', functions: ['SUM'], role: '社保公积金比例越高，年度人员成本越高。' },
  'organization.annualBonusMonths': { title: '年终奖月数', formula: '年度薪资月数 = 12 + 年终奖月数', functions: ['SUM'], role: '影响年度工资总额和人员成本。' },
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
  'marketingBudget.useFixedAnnual': { title: '营销预算方式', formula: 'IF(固定预算, 固定年度预算, 营业收入 × 营销费用率)', functions: ['IF'], role: '决定营销预算按固定金额还是营业收入比例生成。' },
  'marketingBudget.fixedAnnual': { title: '固定年度营销预算', formula: '固定预算模式下：年度营销预算 = 固定年度预算', functions: ['IF'], role: '仅在固定年度预算模式下启用。' },
  'marketingBudget.contingencyRate': { title: '营销机动预备', formula: '机动预备 = 年度营销预算 × 机动预备比例', functions: ['SUM'], role: '预留临时活动、媒体补位和不可预见支出。' },
  'maintenanceBudget.elevatorAnnual': { title: '电梯维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '按电梯维保合同计入年度维保成本。' },
  'maintenanceBudget.hvacAnnual': { title: '暖通空调维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '按暖通维保合同计入年度维保成本。' },
  'maintenanceBudget.fireAnnual': { title: '消防维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '包括消防设施检测、维保和年检。' },
  'maintenanceBudget.landscapeAnnual': { title: '景观绿化养护', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '包括室内外绿植、景观和水景养护。' },
  'maintenanceBudget.otherAnnual': { title: '其他专项维保', formula: '专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他', functions: ['SUM'], role: '用于未单列的专项维保支出。' },
};
const FUNCTION_DEFINITIONS = {
  'IF': { syntax: 'IF(条件, 条件成立时的值, 条件不成立时的值)', meaning: '条件判断函数。系统先判断条件，再选择对应的计算结果。', example: 'IF(运营年=1, 首年出租率, 稳定期出租率)', note: '调整出租率、稳定年或计租方式时，首先会检查 IF 的条件和边界。' },
  'SUM': { syntax: 'SUM(数值1, 数值2, …) 或 Σ', meaning: '把多个分项金额或比率相加，形成合计。', example: '项目总投资 = SUM(土地, 工程, 装修, 预备费, 开办费, 流动资金)', note: '漏项会直接造成投资或收入低估；新增费用时应检查是否已纳入对应 SUM。' },
  'MAX': { syntax: 'MAX(数值1, 数值2, …)', meaning: '取多个数值中的最大值，常用于保底与扣点取高、零值下限。', example: '月收益 = MAX(保底月租金, 联营扣点月收入)', note: '如果希望保底条款优先，确保保底收入被正确录入；取高模式不会同时重复计算两项收入。' },
  'MIN': { syntax: 'MIN(数值1, 数值2, …)', meaning: '取多个数值中的最小值，常用于进项税抵扣上限、条件溢价封顶。', example: '进项税 = MIN(销项税, 可抵扣进项税估算)', note: 'MIN 的上限值如果设得过低，会压低抵扣或溢价；应核对税法上限和项目招商政策。' },
  'POWER': { syntax: 'POWER(底数, 指数)', meaning: '乘幂函数，用于复利增长和折现计算。', example: '第n年租金 = 首年租金 × POWER(1+增长率, n)', note: '复利增长前低后高；如果项目租约采用固定递增额，应切换为单利或直接按租约录入。' },
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
    how: '先确定出租率和租金增长，再按面积、业态系数、铺位条件计算租金；同步计算物业费、停车和多经收入。运营成本按面积、单价、出租率和爬坡系数计算，最后得到NOI和年度现金流。',
    adjust: '出租率按招商计划，租金按市场样本和租约递增，运营成本按物业预算。建议每次只调整一个变量，并比较NPV敏感性结果；若NPV对租金最敏感，应优先优化首层租金和招商组合。'
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
    how: '先确定部门和编制人数，再按平均月薪 ×（12+年终奖月数）×（1+社保公积金比例）计算部门年度成本，汇总后加入招聘培训费。保安、保洁、物业工程和运营团队分别计算。',
    adjust: '按定编定岗方案填写人数和岗位平均月薪，社保公积金按项目属地政策设置。先确定是否需要自管、外包或混合模式，再比较人员成本对NOI和现金流的影响。'
  },
  office: {
    how: '将办公室租金、水电通讯、IT软件、办公用品、差旅招待和其他行政费用逐项相加，形成年度办公行政成本。',
    adjust: '优先使用年度行政预算或已签合同。办公室租金和人员编制、办公面积要匹配；系统软件和IT费用应与数字化运营计划一致。'
  },
  leasing: {
    how: '年度招商费用由渠道代理费、招商活动、招商物料、招商差旅、平台系统和其他费用相加；续租佣金按续租周期另行计算。',
    adjust: '按招商策略和渠道政策填写。首开招商佣金、年度招商费用和续租佣金要分开，避免重复计算；招商预算应与开业率、出租率和租户结构目标匹配。'
  },
  marketing: {
    how: '先按“营业收入×营销费用率”或固定年度预算确定营销总额，再预留机动预备，最后按渠道权重归一化分配到品牌公关、媒体、活动、会员数字和物料美陈。',
    adjust: '开业期可提高媒体投放和活动占比，稳定期提高会员数字和品牌公关占比。权重会自动归一化，但渠道预算应与年度推广计划和KPI一致。'
  },
  maintenance: {
    how: '日常维修按资产原值×维修费率计提；电梯、暖通、消防、景观等专项维保按年度合同金额相加，两者共同形成维保成本。',
    adjust: '日常维修费率通常按资产原值的0.5%–2%设置；专项维保优先按合同、报价和年检要求填写。新开业项目可适当提高首年维修预算。'
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
  if (path.includes('rentGrowthMode')) return FORMULA_GUIDES.operations;
  if (path.includes('loanRepaymentMethod')) return FORMULA_GUIDES.finance;
  if (path.includes('exitValueMethod') || path.includes('exitRevenueMultiple')) return FORMULA_GUIDES.valuation;
  if (path.startsWith('organization.')) return FORMULA_GUIDES.organization;
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
  budgetWarnings: [],
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
          ${isLogin ? `<div class="auth-demo"><span class="version-badge">v${APP_VERSION}</span>首次使用可直接体验：账号 <strong>demo</strong>，密码 <strong>demo1234</strong>。<button type="button" id="fill-demo">一键填入</button></div>` : ''}
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
        <div class="panel-body">${state.step < 4 ? `<div class="formula-toolbar"><div><span class="fx-chip">ƒ</span><strong>公式就在对应数据下方</strong><small>点击任一项查看计算式、函数和参数作用</small></div><div class="formula-toolbar-actions"><button class="btn btn-ghost btn-sm" id="open-function-glossary">函数说明</button><button class="btn btn-ghost btn-sm" id="toggle-all-formulas">显示全部公式</button></div></div>` : ''}${renderStep()}</div>
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
  bindFormulaToolbar();
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
    <select class="select" data-path="${path}" data-type="text">
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
    ${formulaPanel('工程投资与流动资金公式', '分项工程投资 = 总建筑面积 × 分项单价 ÷ 10000\n直接工程费 = 前期 + 建安 + 公共配套 + 装修 + 设备 + 其他工程\n预备费 = 直接工程费 × 预备费率\n铺底流动资金 = 稳定运营成本估算 × 铺底比例', ['SUM', 'ROUND', 'MAX'], '金额单位均为万元；修改任一单价后，投资、折旧、税费和现金流会联动更新。')}
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
    ${formulaPanel('楼层收益公式', '楼层满租月收益 = 可租赁面积 × 楼层均价\n联营扣点月收益 = 可租赁面积 × 销售基数 × 扣点率\n实际加权收益 = 楼层月收益合计 ÷ 可租赁面积', ['SUM', 'MAX', 'IF'], '调整楼层均价、面积、销售基数或扣点率后，系统会实时更新。')}
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
      ${formulaPanel('一铺一价与联营扣点公式', '保底月收入 = 租赁面积 × 楼层均价 × 业态系数 ×（1 + 位置条件溢价）\n联营扣点月收入 = 租赁面积 × 月销售基数 × 扣点率\n纯租金 = 保底；纯扣点 = 扣点；取高 = MAX(保底, 扣点)', ['MAX', 'IF', 'SUM'], '条件溢价合计最高40%；铺位填写租金覆盖值时，以覆盖值优先。')}
      <div class="data-table-wrap" style="max-height:none"><table class="data-table category-rules-table"><thead><tr><th>业态</th><th>结算方式</th><th class="num">保底租金（元/㎡/月）</th><th class="num">销售基数（元/㎡/月）</th><th class="num">扣点率</th><th class="num">业态系数</th></tr></thead><tbody>
        ${(m.categories || []).map((cat, i) => `<tr><td><strong>${escapeHtml(cat.name)}</strong></td><td><select class="table-select" data-path="categories.${i}.revenueMode" data-type="text"><option value="inherit" ${cat.revenueMode === 'inherit' ? 'selected' : ''}>继承项目</option><option value="rent" ${cat.revenueMode === 'rent' ? 'selected' : ''}>纯租金</option><option value="concession" ${cat.revenueMode === 'concession' ? 'selected' : ''}>纯联营扣点</option><option value="guarantee_or_concession" ${cat.revenueMode === 'guarantee_or_concession' ? 'selected' : ''}>保底与扣点取高</option></select></td><td class="num"><input class="table-input" data-path="categories.${i}.rent" data-type="number" type="number" step="any" value="${cat.rent ?? 0}"></td><td class="num"><input class="table-input" data-path="categories.${i}.salesPerSqmMonth" data-type="number" type="number" step="any" value="${cat.salesPerSqmMonth ?? 0}"></td><td class="num"><input class="table-input" data-path="categories.${i}.concessionRate" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(cat.concessionRate || 0) * 100).toFixed(1)}"></td><td class="num"><input class="table-input" data-path="categories.${i}.factor" data-type="number" type="number" step="any" value="${cat.factor ?? 1}"></td></tr>`).join('')}
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


function organizationAnnualCost(department, organization) {
  const headcount = Number(department.headcount || 0);
  const salary = Number(department.avgMonthlySalary || 0);
  const social = Number(organization.socialInsuranceRate || 0);
  const bonusMonths = Number(organization.annualBonusMonths || 0);
  return headcount * salary * (12 + bonusMonths) * (1 + social) / 10000;
}

function renderOperatingBudgetImport() {
  return `<div class="form-section budget-import-section">
    <div class="section-title">Excel 运营成本预算导入</div>
    <div class="section-note">可下载标准模板，填写基础参数、组织架构、办公预算、招商预算、营销渠道和维保预算后一次性导入。</div>
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
  const departments = organization.departments || (organization.departments = []);
  const previewMap = new Map((preview?.organizationBreakdown || []).map((item, index) => [index, item]));
  const headcount = departments.reduce((sum, dept) => sum + Number(dept.headcount || 0), 0);
  const annualCost = departments.reduce((sum, dept) => sum + organizationAnnualCost(dept, organization), 0);
  return `<div class="form-section budget-section">
    <div class="section-title">组织架构与人员成本</div>
    <div class="section-note">按部门、编制人数、平均月薪、社保公积金、年终奖和招聘培训测算年度人员成本；保安、保洁、物业工程和运营团队分别体现。</div>
    ${formulaPanel('组织架构人员成本公式', '部门年成本 = 编制人数 × 平均月薪 ×（12 + 年终奖月数）×（1 + 社保公积金比例）÷10000\n年度人员成本 = Σ各部门年成本 + 招聘培训费\n招聘培训费 = 年度工资成本 × 招聘培训费率', ['SUM', 'ROUND'], '先按定编定岗填写人数和月薪，再按项目所在地社保政策调整；招商、运营、市场、物业、保安和保洁应分别设置。')}
    <div class="form-grid">
      ${textField('社保公积金综合比例', 'organization.socialInsuranceRate', { type: 'number', unit: '%', scale: 0.01 })}
      ${textField('年终奖月数', 'organization.annualBonusMonths', { type: 'number', unit: '月' })}
      ${textField('招聘培训费率', 'organization.recruitmentTrainingRate', { type: 'number', unit: '%', scale: 0.01 })}
    </div>
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table"><thead><tr><th>部门</th><th class="num">编制人数</th><th class="num">平均月薪（元）</th><th class="num">年度成本（万元）</th><th>岗位/职责说明</th><th></th></tr></thead><tbody>
        ${departments.map((dept, i) => `<tr>
          <td><input class="table-input text-left" data-path="organization.departments.${i}.name" data-type="text" value="${escapeHtml(dept.name || '')}"></td>
          <td class="num"><input class="table-input" data-path="organization.departments.${i}.headcount" data-type="number" type="number" step="1" value="${dept.headcount ?? 0}"></td>
          <td class="num"><input class="table-input" data-path="organization.departments.${i}.avgMonthlySalary" data-type="number" type="number" step="100" value="${dept.avgMonthlySalary ?? 0}"></td>
          <td class="num"><strong>${fmt(previewMap.get(i)?.annualCost ?? organizationAnnualCost(dept, organization), 1)}</strong></td>
          <td><input class="table-input text-left" data-path="organization.departments.${i}.note" data-type="text" value="${escapeHtml(dept.note || '')}"></td>
          <td><button class="btn btn-ghost btn-sm" type="button" data-remove-department="${i}">${ICONS.trash}</button></td>
        </tr>`).join('') || '<tr><td colspan="6" class="empty-table-cell">尚未设置部门</td></tr>'}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><button class="btn btn-secondary btn-sm" id="add-department" type="button">${ICONS.plus}<span>新增部门</span></button><span>合计编制 <strong>${fmt(headcount)}</strong> 人｜年度人员成本 <strong>${fmt(annualCost, 1)}</strong> 万元</span></div>
  </div>`;
}

function renderOfficeBudgetSection(model) {
  return `<div class="form-section budget-section">
    <div class="section-title">办公及行政费用</div>
    <div class="section-note">按年度固定预算录入，不按面积粗略估算；包括办公室租金、水电通讯、IT软件、办公用品、差旅招待等。</div>
    ${formulaPanel('办公及行政费用公式', '办公行政成本 = 办公室租金 + 水电通讯 + IT软件 + 办公用品 + 差旅招待 + 其他办公费用', ['SUM'], '优先按年度行政预算或已签合同填写；调整后直接进入运营成本和NOI。')}
    <div class="form-grid">
      ${textField('办公室租金', 'officeBudget.officeRentAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('水电及通讯费', 'officeBudget.utilitiesAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('IT及软件服务', 'officeBudget.itSoftwareAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('办公用品', 'officeBudget.officeSuppliesAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('差旅及业务招待', 'officeBudget.travelEntertainmentAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('其他办公费用', 'officeBudget.otherAnnual', { type: 'number', unit: '万元/年' })}
    </div>
  </div>`;
}

function renderLeasingBudgetSection(model) {
  return `<div class="form-section budget-section">
    <div class="section-title">年度招商费用预算</div>
    <div class="section-note">首开招商佣金在投资测算中单列；本区域用于年度招商渠道、活动、物料、差旅和平台费用。</div>
    ${formulaPanel('年度招商费用公式', '招商费用 = 渠道代理费 + 招商活动 + 招商物料 + 招商差旅 + 招商平台系统 + 其他\n运营期续租佣金按“月租金 × 续租佣金月数 × 当年出租率”另计', ['SUM','MOD','IF'], '按招商计划和渠道政策填写；续租佣金在运营期周期性发生，避免与年度固定招商预算重复。')}
    <div class="form-grid">
      ${textField('渠道及代理费', 'leasingBudget.channelFeeAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('招商活动', 'leasingBudget.eventsAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('招商物料', 'leasingBudget.materialsAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('招商差旅', 'leasingBudget.travelAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('招商平台及系统', 'leasingBudget.platformAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('其他招商费用', 'leasingBudget.otherAnnual', { type: 'number', unit: '万元/年' })}
    </div>
  </div>`;
}

function renderMarketingBudgetSection(model, preview) {
  const marketing = model.marketingBudget || (model.marketingBudget = {});
  const channels = marketing.channels || (marketing.channels = []);
  const allocation = preview?.marketingAllocation || [];
  const allocationMap = new Map(allocation.map(item => [item.name, item.amount]));
  const totalAmount = Number(preview?.summary?.stableMarketingCost || 0);
  return `<div class="form-section budget-section">
    <div class="section-title">年度营销推广费用及分解</div>
    <div class="section-note">年度营销总额可按营业收入比例自动生成，也可切换为固定年度预算；再按品牌、媒体、活动、会员数字和物料美陈分解。</div>
    ${formulaPanel('年度营销预算分解公式', '年度营销预算 = IF(使用固定预算, 固定年度预算, 不含税营业收入 × 营销费用率)\n渠道预算 = (年度营销预算 - 机动预备) × 渠道权重 ÷ 权重合计\n机动预备 = 年度营销预算 × 预备比例', ['IF','SUM','ROUND'], '先确定年度营销总额，再调整渠道权重；权重会自动归一化，不要求严格合计100%。')}
    <div class="form-grid">
      ${selectField('年度预算方式', 'marketingBudget.useFixedAnnual', [{value:'false',label:'按营业收入比例'},{value:'true',label:'固定年度预算'}])}
      ${textField('固定年度营销预算', 'marketingBudget.fixedAnnual', { type: 'number', unit: '万元/年', optional: true })}
      ${textField('营销机动预备比例', 'marketingBudget.contingencyRate', { type: 'number', unit: '%', scale: 0.01 })}
    </div>
    <div class="data-table-wrap budget-table-wrap">
      <table class="data-table budget-table"><thead><tr><th>营销渠道</th><th class="num">权重</th><th class="num">实际占比</th><th class="num">预算金额（万元）</th><th>费用内容</th><th></th></tr></thead><tbody>
        ${channels.map((channel, i) => `<tr>
          <td><input class="table-input text-left" data-path="marketingBudget.channels.${i}.name" data-type="text" value="${escapeHtml(channel.name || '')}"></td>
          <td class="num"><input class="table-input" data-path="marketingBudget.channels.${i}.weight" data-type="number" data-scale="0.01" type="number" step="any" value="${(Number(channel.weight || 0) * 100).toFixed(1)}"></td>
          <td class="num">${fmtPct((allocation.find(item => item.name === channel.name)?.share) || 0)}</td>
          <td class="num"><strong>${fmt(allocationMap.get(channel.name) || 0, 1)}</strong></td>
          <td><input class="table-input text-left" data-path="marketingBudget.channels.${i}.note" data-type="text" value="${escapeHtml(channel.note || '')}"></td>
          <td><button class="btn btn-ghost btn-sm" type="button" data-remove-marketing-channel="${i}">${ICONS.trash}</button></td>
        </tr>`).join('') || '<tr><td colspan="6" class="empty-table-cell">尚未设置营销渠道</td></tr>'}
      </tbody></table>
    </div>
    <div class="budget-toolbar"><button class="btn btn-secondary btn-sm" id="add-marketing-channel" type="button">${ICONS.plus}<span>新增营销渠道</span></button><span>测算年度营销预算 <strong>${fmt(totalAmount, 1)}</strong> 万元</span></div>
  </div>`;
}

function renderMaintenanceBudgetSection(model) {
  return `<div class="form-section budget-section">
    <div class="section-title">日常维保与专项维修</div>
    <div class="section-note">日维修费率按建安、装修、设备等资产原值计提；电梯、暖通、消防、景观等专项维保按年度合同或预算单列。</div>
    ${formulaPanel('维保费用公式', '日常维修 = 资产原值 × 维修费率 × 运营爬坡系数\n专项维保 = 电梯 + 暖通 + 消防 + 景观 + 其他\n维保合计 = 日常维修 + 专项维保', ['SUM','ROUND'], '日常维修费率建议按资产原值的0.5%–2%设置；专项维保优先按已签合同或维保报价填写。')}
    <div class="form-grid">
      ${textField('电梯维保', 'maintenanceBudget.elevatorAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('暖通空调维保', 'maintenanceBudget.hvacAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('消防维保', 'maintenanceBudget.fireAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('景观绿化养护', 'maintenanceBudget.landscapeAnnual', { type: 'number', unit: '万元/年' })}
      ${textField('其他专项维保', 'maintenanceBudget.otherAnnual', { type: 'number', unit: '万元/年' })}
    </div>
  </div>`;
}

function renderOperatingCostSummary(preview) {
  const breakdown = preview?.operatingCostBreakdown || [];
  const total = breakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!breakdown.length) return '';
  return `<div class="form-section budget-section">
    <div class="section-title">年度运营成本核算结果</div>
    <div class="section-note">按稳定运营年汇总，金额单位：万元/年。每项成本可在上方直接调整。</div>
    <div class="operating-cost-bars">
      ${breakdown.map((item, i) => `<div class="operating-cost-row"><span>${escapeHtml(item.name)}</span><div><i style="width:${Math.max(2, Number(item.value || 0) / Math.max(total, 1) * 100)}%;background:${donutColor(i)}"></i></div><strong>${fmt(item.value, 1)}</strong><em>${fmtPct(Number(item.value || 0) / Math.max(total, 1))}</em></div>`).join('')}
    </div>
    <div class="budget-total-line"><span>稳定期运营成本及税费合计</span><strong>${fmt(total, 1)} 万元/年</strong></div>
  </div>`;
}

function bindOperationsBudgets() {
  const model = state.current.model;
  const budgetFile = document.getElementById('budget-file');
  document.getElementById('download-budget-template')?.addEventListener('click', () => downloadFile('/api/templates/operating-budget', '商业地产运营成本预算导入模板.xlsx'));
  document.getElementById('choose-budget-file')?.addEventListener('click', () => budgetFile.click());
  budgetFile?.addEventListener('change', () => budgetFile.files[0] && importOperatingBudget(budgetFile.files[0]));
  document.getElementById('add-department')?.addEventListener('click', () => {
    model.organization ||= { socialInsuranceRate: 0.28, annualBonusMonths: 1, recruitmentTrainingRate: 0.02, departments: [] };
    model.organization.departments ||= [];
    model.organization.departments.push({ name: '新增部门', headcount: 1, avgMonthlySalary: 8000, note: '' });
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  });
  document.querySelectorAll('[data-remove-department]').forEach(btn => btn.addEventListener('click', () => {
    model.organization.departments.splice(Number(btn.dataset.removeDepartment), 1);
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
  document.getElementById('add-marketing-channel')?.addEventListener('click', () => {
    model.marketingBudget ||= { useFixedAnnual: false, fixedAnnual: 0, contingencyRate: 0.05, channels: [] };
    model.marketingBudget.channels ||= [];
    model.marketingBudget.channels.push({ name: '新增渠道', weight: 0.1, note: '' });
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  });
  document.querySelectorAll('[data-remove-marketing-channel]').forEach(btn => btn.addEventListener('click', () => {
    model.marketingBudget.channels.splice(Number(btn.dataset.removeMarketingChannel), 1);
    state.dirty = true; renderWorkspace(); scheduleLivePreview();
  }));
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
    if (payload.officeBudget && Object.keys(payload.officeBudget).length) model.officeBudget = { ...(model.officeBudget || {}), ...payload.officeBudget };
    if (payload.leasingBudget && Object.keys(payload.leasingBudget).length) model.leasingBudget = { ...(model.leasingBudget || {}), ...payload.leasingBudget };
    if (payload.marketingBudget) {
      model.marketingBudget = { ...(model.marketingBudget || {}), ...payload.marketingBudget };
      if (!payload.marketingBudget.channels?.length) model.marketingBudget.channels = model.marketingBudget.channels || [];
    }
    if (payload.maintenanceBudget && Object.keys(payload.maintenanceBudget).length) model.maintenanceBudget = { ...(model.maintenanceBudget || {}), ...payload.maintenanceBudget };
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

function renderOperationsStep() {
  return `
    <div class="callout">${ICONS.info}<div>如果暂时没有详细运营预算，可保留系统参考值。系统会自动形成20年现金流、税费和投资收益。</div></div>
    <div class="form-section">
      <div class="section-title">租金与出租率</div>
      ${formulaPanel('出租率、租金增长与收入公式', '有效出租率 = IF(运营年=1, 首年出租率, IF(运营年<稳定年, 第二年出租率, 稳定出租率))\n首年免租系数 = 1 - 免租月数 ÷ 12\n租金收入 = 满租月租金 × 12 × 出租率 × 免租系数 × 增长因子', ['IF', 'POWER', 'SUM'], '首年出租率、稳定出租率、免租月数和增长率均可直接调整。')}
      <div class="form-grid">
        ${textField('首年出租率', 'operations.occupancyY1', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('第二年出租率', 'operations.occupancyY2', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('稳定期出租率', 'operations.stableOccupancy', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('稳定期起始运营年', 'operations.stableYear', { type: 'number', unit: '年' })}
        ${textField('首年免租月数', 'operations.rentFreeMonths', { type: 'number', unit: '月' })}
        ${textField('租金年增长率', 'operations.rentGrowth', { type: 'number', unit: '%', scale: 0.01 })}
        ${selectField('租金增长方式', 'formulas.rentGrowthMode', [{value:'compound',label:'复利增长'},{value:'simple',label:'单利增长'}], { help: '复利：租金×(1+g)^n；单利：租金×(1+g×n)' })}
        ${textField('联营销售额年增长率', 'operations.salesGrowth', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('租金收缴率', 'operations.collectionRate', { type: 'number', unit: '%', scale: 0.01 })}
        ${textField('续租周期', 'operations.renewalCycle', { type: 'number', unit: '年' })}
        ${textField('租赁保证金月数', 'operations.depositMonths', { type: 'number', unit: '月' })}
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">收入与运营成本</div>
      ${formulaPanel('收入、运营成本与NOI公式', '营业收入 = 租金收入 + 物业费 + 多经收入 + 停车收入\n运营成本 = 物业 + 能耗 + 商管 + 行政 + 营销 + 维修 + 保险 + 坏账 + 其他\nNOI = 不含税营业收入 - 不含税运营成本 - 税费', ['SUM', 'MAX', 'MIN'], '所有运营参数均可直接修改，结果会联动更新。')}
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
    ${renderOperatingBudgetImport()}
    ${renderOrganizationSection(state.current.model, state.preview)}
    ${renderOfficeBudgetSection(state.current.model)}
    ${renderLeasingBudgetSection(state.current.model)}
    ${renderMarketingBudgetSection(state.current.model, state.preview)}
    ${renderMaintenanceBudgetSection(state.current.model)}
    ${renderOperatingCostSummary(state.preview)}
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
    ${renderOperatingResultCards()}
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

function renderOperatingResultCards() {
  const result = state.result;
  const s = result.summary;
  const breakdown = result.operatingCostBreakdown || [];
  const total = breakdown.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const organization = result.organizationBreakdown || [];
  const marketing = result.marketingAllocation || [];
  return `<div class="dashboard-grid operating-result-grid">
    <div class="card operating-cost-card">
      <h3>年度运营成本构成</h3>
      <div class="operating-result-kpis">
        <div><span>编制人数</span><strong>${fmt(s.stableHeadcount)} 人</strong></div>
        <div><span>人员成本</span><strong>${fmt(s.stableStaffCost, 1)} 万/年</strong></div>
        <div><span>办公行政</span><strong>${fmt(s.stableOfficeCost, 1)} 万/年</strong></div>
        <div><span>招商费用</span><strong>${fmt(s.stableLeasingCost, 1)} 万/年</strong></div>
        <div><span>营销费用</span><strong>${fmt(s.stableMarketingCost, 1)} 万/年</strong></div>
        <div><span>维保费用</span><strong>${fmt(s.stableMaintenanceCost, 1)} 万/年</strong></div>
      </div>
      <div class="operating-cost-bars">${breakdown.map((item, i) => `<div class="operating-cost-row"><span>${escapeHtml(item.name)}</span><div><i style="width:${Math.max(2, Number(item.value || 0) / Math.max(total, 1) * 100)}%;background:${donutColor(i)}"></i></div><strong>${fmt(item.value, 1)}</strong><em>${fmtPct(Number(item.value || 0) / Math.max(total, 1))}</em></div>`).join('')}</div>
      <div class="budget-total-line"><span>稳定期运营成本及税费合计</span><strong>${fmt(total, 1)} 万元/年</strong></div>
    </div>
    <div class="card">
      <h3>组织架构与人员成本</h3>
      <div class="data-table-wrap" style="max-height:420px"><table class="data-table"><thead><tr><th>部门</th><th class="num">人数</th><th class="num">平均月薪</th><th class="num">年度成本</th></tr></thead><tbody>${organization.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong><small class="table-subnote">${escapeHtml(item.note || '')}</small></td><td class="num">${fmt(item.headcount)}</td><td class="num">${fmt(item.avgMonthlySalary)}</td><td class="num">${fmt(item.annualCost, 1)}万</td></tr>`).join('')}</tbody></table></div>
    </div>
  </div>
  <div class="card marketing-allocation-card">
    <h3>年度营销推广费用分解</h3>
    <div class="data-table-wrap" style="max-height:none"><table class="data-table"><thead><tr><th>渠道</th><th class="num">权重</th><th class="num">实际占比</th><th class="num">年度预算</th><th>费用内容</th></tr></thead><tbody>${marketing.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td class="num">${item.weight ? fmtPct(item.weight) : '—'}</td><td class="num">${fmtPct(item.share)}</td><td class="num">${fmt(item.amount, 1)}万</td><td>${escapeHtml(item.note || '')}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
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
      const formulaCurrent = input.closest('.field')?.querySelector('.formula-current');
      if (formulaCurrent) formulaCurrent.textContent = `当前：${input.value || '未填写'}`;
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
  document.getElementById('reset-formula-defaults')?.addEventListener('click', () => {
    state.current.model.formulas = { ...DEFAULT_FORMULAS };
    state.dirty = true;
    state.preview = null;
    renderWorkspace();
    scheduleLivePreview();
    toast('已恢复系统默认公式参数', 'success');
  });
  if (state.step === 2) bindShopsStep();
  if (state.step === 3) bindOperationsBudgets();
  if (state.step === 1) bindCostPresets();
  if (state.step === 4) bindMarketStep();
  if (state.step === 5) bindResultsActions();
}

function bindFormulaToolbar() {
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

document.addEventListener('click', event => {
  const functionButton = event.target.closest('[data-function]');
  if (functionButton) {
    event.preventDefault();
    openFunctionHelp(functionButton.dataset.function);
  }
});

boot();
