export type SignCode = 0 | 1 | 2;

export type LogicConfig = {
  plusOverrideKeywords: string[];
  minusKeywords: string[];
  plusCostKeywords: string[];
  capitalL1Signs: Record<string, boolean>;
  capitalL1Parent: Record<string, string>;
  capitalMemoAccounts: string[];
  pasteSectToParent: Record<string, string>;
  sectionSignOverrides: Record<string, Record<string, SignCode>>;
  /**
   * 검증 합산 규칙(SUMMARY_RULES)에서 부모 항목 lookup 시 사용하는 다른 이름들.
   * 예: paste에 "자본총계"라 적혀있어도 "자본" 부모로 인식.
   * 이전엔 LEGACY_PARENT_GROUPS에 자식 alias와 섞여있었는데,
   * 부모 별칭만 떼어 logicConfig로 옮김 — 1-1 검증 규칙 관리 탭에서 편집 가능.
   */
  parentAliases?: Record<string, string[]>;
};

export type CompanyConfig = {
  industry?: string;
  accountingStandard?: string;
  sectionSignOverrides?: Record<string, Record<string, SignCode>>;
};

export type CompanyConfigs = Record<string, CompanyConfig>;

// 계정트리(분류DB)가 시스템 고정으로 다루는 최상위 합계 항목들 —
// 4. 분류DB 탭의 미분류 수집에서 이 이름들은 분류 대상에서 제외한다.
export const SYSTEM_FIXED_CLASSIFICATION_KEYS = [
  "자산",
  "부채",
  "자본",
  "유동자산",
  "비유동자산",
  "유동부채",
  "비유동부채",
  "매출액",
  "매출원가",
  "영업이익",
  "영업외수익",
  "영업외비용"
] as const;

const SYSTEM_FIXED_CLASSIFICATION_KEY_SET = new Set<string>(SYSTEM_FIXED_CLASSIFICATION_KEYS);

export function isSystemFixedClassificationKey(key: string) {
  return SYSTEM_FIXED_CLASSIFICATION_KEY_SET.has(key.trim());
}

export const LAST_PATCH = "2026-03-19 17:55";

export const RESULT_ORDER = [
  "자산", "유동자산", "비유동자산",
  "부채", "유동부채", "비유동부채",
  "자본", "자본잉여금", "이익잉여금", "미처분이익잉여금",
  "결손금", "미처리결손금",
  "기타포괄손익누계액", "기타자본", "기타자본요소", "자본조정",
  "매출액", "매출원가", "판매비와관리비",
  "영업이익", "영업이익(손실)",
  "영업외수익", "영업외비용",
  "법인세차감전이익", "법인세차감전손실",
  "계속사업당기순이익", "계속사업당기순손실",
  "당기순이익", "당기순손실"
] as const;


export const LOSS_ACCOUNTS = new Set([
  "영업손실",
  "당기순손실",
  "계속사업당기순손실",
  "계속사업당기순이익(손실)",
  "법인세차감전순손실",
  "법인세비용차감전순손실",
  "연속사업손실",
  "법인세차감전손실"
]);

export const SUMMARY_RULES: Array<[string, string, Array<[string, 0 | 1]>]> = [
  ["자산 = 유동자산 + 비유동자산", "자산", [["유동자산", 0], ["비유동자산", 0]]],
  ["자산 = 부채 + 자본", "자산", [["부채", 0], ["자본", 0]]],
  ["부채 = 유동부채 + 비유동부채", "부채", [["유동부채", 0], ["비유동부채", 0]]],
  ["영업이익 = 매출액 − 매출원가 − 판관비", "영업이익", [["매출액", 0], ["매출원가", 1], ["판매비와관리비", 1]]],
  ["법인세차감전이익 = 영업이익 + 영업외수익 − 영업외비용", "법인세차감전이익", [["영업이익", 0], ["영업외수익", 0], ["영업외비용", 1]]],
  ["당기순이익 = 법인세차감전이익 − 법인세등", "당기순이익", [["법인세차감전이익", 0], ["법인세등", 1]]]
];

export const DEFAULT_LOGIC_CONFIG: LogicConfig = {
  plusOverrideKeywords: ["정부보조금이익", "국고보조금이익", "대손상각비", "대손비용", "대손충당금전입액", "국고보조금반환", "정부보조금반환", "보조금반환", "기타포괄손익누계액"],
  minusKeywords: ["누계액", "충당금", "대손", "정부보조금", "국고보조금", "국가보조금", "현할차", "할인차금", "전환권조정", "신주인수권조정", "매출차감", "손상차손누계", "감가상각누계"],
  plusCostKeywords: ["외주용역비", "외주비", "용역비", "인건비", "급여", "상여금", "퇴직급여", "임차료", "지급임차료", "광고선전비", "판촉비", "여비교통비", "출장비", "통신비", "소모품비", "사무용품비", "보험료", "수선비", "유지보수비", "접대비", "복리후생비", "교육훈련비", "연구비", "지급수수료", "수수료비용", "운반비", "배송비"],
  capitalL1Signs: {
    자본금: true,
    자본잉여금: true,
    자본조정: true,
    기타포괄손익누계액: true,
    기타자본요소: true,
    결손금: false,
    이익잉여금: true,
    이익잉여금결손금: true,
    미처리결손금: false,
    미처분이익잉여금: true
  },
  capitalL1Parent: {
    이익잉여금결손금: "이익잉여금",
    미처리결손금: "결손금",
    미처분이익잉여금: "이익잉여금",
    이익잉여금: "결손금"
  },
  capitalMemoAccounts: ["당기순손실", "당기순이익", "당기순손익", "당기순이익(손실)", "당기순이익(당기순손실)", "연결당기순이익", "연결당기순손실", "미처리결손금"],
  pasteSectToParent: {
    유동자산: "유동자산",
    비유동자산: "비유동자산",
    유동부채: "유동부채",
    비유동부채: "비유동부채",
    매출액: "매출액",
    판매비와관리비: "판매비와관리비",
    판관비: "판매비와관리비",
    영업외수익: "영업외수익",
    영업외비용: "영업외비용"
  },
  parentAliases: {
    자본: ["자본", "자본총계", "총자본"],
    영업이익: ["영업이익", "영업이익(손실)"],
    판매비와관리비: ["판매비와관리비", "판관비", "판매관리비", "판매비및관리비", "판매비와관리비합계"],
    영업외수익: ["영업외수익", "기타수익", "영업외수익합계", "금융수익"],
    이자비용: ["이자비용", "총이자비용", "금융비용"],
    영업비용: ["판매비와관리비", "판관비", "영업비용"],
    당기순이익: ["당기순이익", "당기순이익(손실)", "당기순손익", "연결당기순이익", "당기순이익(당기순손실)", "당기순손실"],
    법인세차감전이익: ["법인세차감전이익", "법인세차감전순이익", "법인세비용차감전순이익", "세전계속사업이익", "법인세차감전이익(손실)", "법인세비용차감전순이익(손실)", "법인세비용차감전계속사업이익", "법인세차감전손실", "법인세차감전순손실", "법인세비용차감전순손실"],
    법인세등: ["법인세등", "법인세 등", "법인세비용", "법인세비용(수익)", "법인세수익", "계속사업법인세비용", "당기법인세비용", "이연법인세비용", "법인세환급"],
    계속사업당기순이익: ["당기순이익", "당기순손실", "당기순이익(손실)", "당기순손익", "계속사업당기순이익", "계속사업당기순손실", "계속사업당기순이익(손실)"],
    결손금: ["결손금", "미처리결손금"],
    이익잉여금: ["이익잉여금", "미처분이익잉여금", "이익잉여금결손금"]
  },
  sectionSignOverrides: {
    비유동부채: { 퇴직연금운용자산: 1, 사외적립자산: 1 },
    유동부채: { 퇴직연금운용자산: 1, 사외적립자산: 1 },
    영업외수익: { 국고보조금: 0, 정부보조금: 0, 국가보조금: 0, 충당금환입: 0 }
  }
};

export const DEFAULT_COMPANY_CONFIGS: CompanyConfigs = {};

export const COMPANY_LABELS = ["회사명", "회사", "법인명", "company", "Company"];

export type CatalogAliasMatch = {
  sign: SignCode;
  majorCategory: string;
  middleCategory: string;
  smallCategory: string;
  canonicalKey: string;
  groupId: string;
};
