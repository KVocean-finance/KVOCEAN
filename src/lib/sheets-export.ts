import type { ReportingModel, SavedQuarterSnapshot } from "@/lib/validation/report";
import {
  CLASSIFICATION_ENTRIES,
  findEntryByAlias,
  findEntryByCode,
  type ClassificationCatalogGroup
} from "@/lib/validation/defaults";

/**
 * Exact set of metrics to push to the sheet — amount only (no ratio/growth).
 * `label` matches the row.label in report.ts; `header` is what shows in the sheet column.
 * Order here = column order (after KV ID + 회사명 in columns A/B).
 */
export const TARGET_METRICS: Array<{ label: string; header: string }> = [
  { label: "런웨이(E)", header: "런웨이" },
  { label: "EBITDA", header: "EBITDA" },
  { label: "월 평균 지출액", header: "월 평균 지출액" }
];

export const SHEETS_KEY_COLUMNS = ["KV ID", "회사명"] as const;

export type SheetCellValue = string | number | null;

/**
 * KV ID assignment by company name. First occurrence wins for duplicates
 * (e.g. "넵튠" → KV_009 rather than S_KV_009). Trailing whitespace in source
 * names is trimmed.
 *
 * Source of truth: user-maintained list. Update by editing the KV_ID_PAIRS
 * array below.
 */
const KV_ID_PAIRS: Array<[kvId: string, companyName: string]> = [
  ["KV_000", "미띵스"],
  ["KV_001", "왓챠"],
  ["KV_002", "위시링크"],
  ["KV_003", "엠버스"],
  ["KV_004", "그린몬스터"],
  ["KV_005", "VINGLE"],
  ["KV_006", "키즈노트"],
  ["KV_007", "핀콘"],
  ["KV_008", "비테이브랩"],
  ["KV_009", "넵튠"],
  ["KV_010", "드라이어드"],
  ["KV_011", "두나무"],
  ["KV_012", "PERFECT SUNDAY"],
  ["KV_013", "오올블루"],
  ["KV_014", "넥스트에이지"],
  ["KV_015", "위브랩"],
  ["KV_016", "발컨"],
  ["KV_017", "시드페이퍼"],
  ["KV_018", "두바퀴소프트"],
  ["KV_019", "헬스브리즈"],
  ["KV_020", "바이박스"],
  ["KV_021", "체리벅스"],
  ["KV_022", "레드사하라스튜디오"],
  ["KV_023", "바이어스코리아"],
  ["KV_024", "QURYON"],
  ["KV_025", "루닛"],
  ["KV_026", "코쿤게임즈"],
  ["KV_027", "STRATIO"],
  ["KV_028", "다이닝코드"],
  ["KV_029", "디바인랩"],
  ["KV_030", "유비파이"],
  ["KV_031", "짜이서울"],
  ["KV_032", "TEAMBLIND"],
  ["KV_033", "모네상스"],
  ["KV_034", "블랙비어드"],
  ["KV_035", "컴패니멀스"],
  ["KV_036", "에이삼삼스튜디오"],
  ["KV_037", "코코모"],
  ["KV_038", "슈프림게임즈"],
  ["KV_039", "어바웃타임"],
  ["KV_040", "비트루브"],
  ["KV_041", "스탠다임"],
  ["KV_042", "브랫빌리지"],
  ["KV_043", "애플파이스튜디오"],
  ["KV_044", "솔버"],
  ["KV_045", "플레이메이커스튜디오"],
  ["KV_046", "데이블"],
  ["KV_047", "원에이엠"],
  ["KV_048", "FUNNER"],
  ["KV_049", "컬쳐히어로"],
  ["KV_050", "팝조이"],
  ["KV_051", "BITFINDER"],
  ["KV_052", "BINARY VR"],
  ["KV_053", "솔트랩"],
  ["KV_054", "라우드코퍼레이션"],
  ["KV_055", "텍스트팩토리"],
  ["KV_056", "멋집"],
  ["KV_057", "어피니티"],
  ["KV_058", "워시온"],
  ["KV_059", "모모"],
  ["KV_060", "오비이랩"],
  ["KV_061", "컨버전연구소"],
  ["KV_062", "너드게임즈"],
  ["KV_063", "모아이게임즈"],
  ["KV_064", "시웨이브"],
  ["KV_065", "SEERSLAB"],
  ["KV_066", "브이에이트"],
  ["KV_067", "시프트업"],
  ["KV_068", "엘라엘커머스"],
  ["KV_069", "플레이하드"],
  ["KV_070", "YTEAMS"],
  ["KV_071", "닥터키친"],
  ["KV_072", "와탭랩스"],
  ["KV_073", "PLAYSNAK"],
  ["KV_074", "OING"],
  ["KV_075", "TIMETREE"],
  ["KV_076", "베이비프렌즈"],
  ["KV_077", "이브이알스튜디오"],
  ["KV_078", "핑거플러스"],
  ["KV_079", "한국신용데이터"],
  ["KV_080", "당근마켓"],
  ["KV_081", "INTELON OPTICS"],
  ["KV_082", "코드스쿼드"],
  ["KV_083", "엑소시스템즈"],
  ["KV_084", "페르세우스"],
  ["KV_085", "51GIF"],
  ["KV_086", "ALCACRUZ"],
  ["KV_087", "청연"],
  ["KV_088", "더널리"],
  ["KV_089", "원더스"],
  ["KV_090", "운칠기삼"],
  ["KV_091", "브룩허스트거라지"],
  ["KV_092", "미니스쿨"],
  ["KV_093", "스튜디오8"],
  ["KV_094", "래블업"],
  ["KV_095", "BAYES HOLDING"],
  ["KV_096", "스켈터랩스"],
  ["KV_097", "토룩"],
  ["KV_098", "휴마트컴퍼니"],
  ["KV_099", "캐스팅엔"],
  ["KV_100", "딥벨리데이션"],
  ["KV_101", "위클리셔츠0529"],
  ["KV_102", "KOODING"],
  ["KV_103", "엔투스튜디오"],
  ["KV_104", "슈가힐"],
  ["KV_105", "테이블매니저"],
  ["KV_106", "코클리어닷에이아이"],
  ["KV_107", "에이치앤씨게임즈"],
  ["KV_108", "지오인터넷"],
  ["KV_109", "바움디자인시스템즈"],
  ["KV_110", "밥게임즈"],
  ["KV_111", "그렙"],
  ["KV_112", "마스오토"],
  ["KV_113", "OKHOME"],
  ["KV_114", "앤유"],
  ["KV_115", "브런트"],
  ["KV_116", "플랫포스"],
  ["KV_117", "코드박스"],
  ["KV_118", "RESTREAM"],
  ["KV_119", "스와치온"],
  ["KV_120", "리플에이아이"],
  ["KV_121", "더클로젯컴퍼니"],
  ["KV_122", "루니미디어"],
  ["KV_123", "티밸류와이즈"],
  ["KV_124", "ATLAS ROBOTICS"],
  ["KV_125", "로지스팟홀딩스"],
  ["KV_126", "겟차"],
  ["KV_127", "포휠즈"],
  ["KV_128", "홀릭스팩토리"],
  ["KV_129", "라프텔"],
  ["KV_130", "카사코리아"],
  ["KV_131", "자란다"],
  ["KV_132", "엑스트라이버"],
  ["KV_133", "업라이즈"],
  ["KV_134", "레티널"],
  ["KV_135", "어썸레이"],
  ["KV_136", "리메세"],
  ["KV_137", "페이레터"],
  ["KV_138", "플렉시코퍼레이션"],
  ["KV_139", "SPATIAL SYSTEMS"],
  ["KV_140", "스윗코리아"],
  ["KV_141", "트래블월렛"],
  ["KV_142", "소셜빈"],
  ["KV_143", "아이네블루메"],
  ["KV_144", "오픈더테이블"],
  ["KV_145", "아이헤이트플라잉버그스"],
  ["KV_146", "TECTUS"],
  ["KV_147", "스마트레이더시스템"],
  ["KV_148", "액스"],
  ["KV_149", "펜브코퍼레이션"],
  ["KV_150", "버핏서울"],
  ["KV_151", "마카롱팩토리"],
  ["KV_152", "리턴제로"],
  ["KV_153", "MINERVA PROJECT"],
  ["KV_154", "셀렉트스타"],
  ["KV_155", "웨이브코퍼레이션"],
  ["KV_156", "FYUSION"],
  ["KV_157", "벨루가브루어리"],
  ["KV_158", "남의집"],
  ["KV_159", "콥틱"],
  ["KV_160", "허닭"],
  ["KV_161", "브이로거"],
  ["KV_162", "BLUESPACE AI"],
  ["KV_163", "세컨신드롬"],
  ["KV_164", "하이퍼하이어"],
  ["KV_165", "온다"],
  ["KV_166", "홈즈컴퍼니"],
  ["KV_167", "리메이크디지털"],
  ["KV_168", "세나클"],
  ["KV_169", "더기프팅컴퍼니"],
  ["KV_170", "스낵포"],
  ["KV_171", "IMPRESSIVO"],
  ["KV_172", "컨슈머브릿지"],
  ["KV_173", "ENUMA"],
  ["KV_174", "비지피웍스"],
  ["KV_175", "문리버"],
  ["KV_176", "LASE INNOVATION"],
  ["KV_177", "세컨핸즈"],
  ["KV_178", "리벨리온 합병전"],
  ["KV_179", "스파이더랩"],
  ["KV_180", "딜리헙"],
  ["KV_181", "테크타카"],
  ["KV_182", "모라이"],
  ["KV_183", "라이브하이브"],
  ["KV_184", "플랭"],
  ["KV_185", "위힐드"],
  ["KV_186", "에이슬립"],
  ["KV_187", "뉴튠"],
  ["KV_188", "왈"],
  ["KV_189", "레몬베이스"],
  ["KV_190", "라포랩스"],
  ["KV_191", "뉴닉"],
  ["KV_192", "믹서"],
  ["KV_193", "키노라이츠"],
  ["KV_194", "삼십구도씨"],
  ["KV_195", "뉴로티엑스"],
  ["KV_196", "이모코그"],
  ["KV_197", "딥메트릭스"],
  ["KV_198", "비즈니스캔버스"],
  ["KV_199", "리콘랩스"],
  ["KV_200", "THUMB TECHNOLOGIES"],
  ["KV_201", "홉스"],
  ["KV_202", "티제이랩스"],
  ["KV_203", "플로틱"],
  ["KV_204", "외식인"],
  ["KV_205", "씨드앤"],
  ["KV_206", "루먼랩"],
  ["KV_207", "커널로그"],
  ["KV_208", "고이장례연구소"],
  ["KV_209", "워키도기"],
  ["KV_210", "MARKET STADIUM"],
  ["KV_211", "프릿지크루"],
  ["KV_212", "알피"],
  ["KV_213", "아루"],
  ["KV_214", "제이앤피메디"],
  ["KV_215", "룬샷컴퍼니"],
  ["KV_216", "타임앤코"],
  ["KV_217", "프라이데이즈랩"],
  ["KV_218", "메이코더스"],
  ["KV_219", "키보코"],
  ["KV_220", "프리베노틱스"],
  ["KV_221", "브이에이게임즈"],
  ["KV_222", "프로이드"],
  ["KV_223", "커스토먼트"],
  ["KV_224", "모요"],
  ["KV_225", "LIKELION"],
  ["KV_226", "아티피셜소사이어티"],
  ["KV_227", "유머스트알앤디"],
  ["KV_228", "LINQALPHA"],
  ["KV_229", "에이슨"],
  ["KV_230", "가지랩"],
  ["KV_231", "메디르"],
  ["KV_232", "PRIMUS LABS"],
  ["KV_233", "탤런트리"],
  ["KV_234", "메딜리티"],
  ["KV_235", "21세기전파상"],
  ["KV_236", "위플로"],
  ["KV_237", "뉴웨이브커머스"],
  ["KV_238", "원지랩스"],
  ["KV_239", "노틸러스"],
  ["KV_240", "코넥티브"],
  ["KV_241", "액트노바"],
  ["KV_242", "비블"],
  ["KV_243", "에이에프아이"],
  ["KV_244", "벙커키즈"],
  ["KV_245", "버그홀"],
  ["KV_246", "P4H GLOBAL"],
  ["KV_247", "뉴로엑스티"],
  ["KV_248", "보살핌"],
  ["KV_249", "하이로컬"],
  ["KV_250", "포트래이"],
  ["KV_251", "메디띵스"],
  ["KV_252", "M3TA"],
  ["KV_253", "CONTORO"],
  ["KV_254", "드리모"],
  ["KV_255", "포필러스"],
  ["KV_256", "폴스타게임즈"],
  ["KV_257", "RUNBEAR"],
  ["KV_258", "오믈렛"],
  ["KV_259", "트리거스"],
  ["F_KV_106", "COCHL"],
  ["F_KV_130", "KASA"],
  ["F_KV_140", "SWIT TECHNOLOGIES"],
  ["F_KV_112", "MARS AUTO"],
  ["F_KV_113", "오케이홈"],
  ["F_KV_217", "FRIDAYS LAB"],
  ["S_KV_088", "젤라또랩"],
  ["S_KV_071", "프레시지"],
  ["S_KV_022", "크래프톤"],
  ["S_KV_125", "로지스팟"],
  ["S_KV_045", "마운드미디어"],
  ["F_KV_030", "UVIFY"],
  ["F_KV_024", "큐리온코리아"],
  ["S_KV_058", "세탁"],
  ["S_KV_009", "넵튠"],
  ["S_KV_105", "글로벌푸드테크"],
  ["KV_260", "스퀴즈비츠"],
  ["KV_261", "비비드헬스"],
  ["KV_262", "샌디플로어"],
  ["KV_263", "지피유엔"],
  ["KV_264", "스트림스튜디오"],
  ["KV_265", "와들"],
  ["KV_267", "알버스"],
  ["KV_266", "에이지프리"],
  ["F_KV_108", "MAGELANG"],
  ["F_KV_242", "BEEBLE"],
  ["KV_268", "MAGNENDO"],
  ["KV_269", "파파러웨이"],
  ["KV_270", "TRILLION"],
  ["KV_271", "KOMPASS DIAGNOSTICS"],
  ["KV_272", "23세기아이들"],
  ["KV_273", "테이밍랩"],
  ["KV_274", "FS2"],
  ["S_KV_178", "리벨리온"],
  ["KV_275", "바인드"],
  ["KV_276", "CONFIG INTELLIGENCE"],
  ["KV_277", "텍트그룹"],
  ["KV_278", "오큐티"],
  ["KV_279", "TZAFON"],
  ["KV_280", "라스트스프링"],
  ["KV_281", "OLIGO"],
  ["KV_282", "솔버엑스"],
  ["KV_283", "홈앤코"],
  ["KV_284", "브랜드지놈"],
  ["KV_285", "CUTBACK"],
  ["KV_286", "컨포트랩"],
  ["KV_287", "플로우닉스"],
  ["KV_288", "DALUS AI"],
  ["KV_289", "바이버스"],
  ["KV_290", "NAVION ENERGY"],
  ["KV_291", "APOLLO STUDIO"],
  ["KV_292", "예지엑스"],
  ["KV_293", "디마프"],
  ["KV_294", "Tunable Biosystems"],
  ["KV_295", "세미에이아이"],
  ["KV_296", "탭제로"],
  ["KV_297", "VITAL ROBOTICS"],
  ["KV_298", "PENCEIVE TECHNOLOGIES"],
  ["KV_299", "티냅스"],
  ["KV_300", "엔크레더블"]
];

export const COMPANY_TO_KV_ID: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [id, name] of KV_ID_PAIRS) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    // First-occurrence wins so plain KV_NNN beats S_/F_ prefixes for the same company name.
    if (!map.has(trimmed)) {
      map.set(trimmed, id);
    }
  }
  return map;
})();

function lookupKvId(companyName: string): string {
  const trimmed = (companyName ?? "").trim();
  return COMPANY_TO_KV_ID.get(trimmed) ?? "";
}

export function buildHeaderRow(): string[] {
  return [...SHEETS_KEY_COLUMNS, ...TARGET_METRICS.map((m) => m.header)];
}

/**
 * Build rows for ONE quarter.
 * Each row = one company. Columns = [KV ID, 회사명, 런웨이, EBITDA, 월 평균 지출액].
 * Companies with no data for this quarter are skipped.
 */
export function buildQuarterRows(args: {
  quarterKey: string;
  companyReports: Map<string, ReportingModel>;
}): SheetCellValue[][] {
  const rows: SheetCellValue[][] = [];
  const companyNames = Array.from(args.companyReports.keys()).sort((a, b) => a.localeCompare(b, "ko"));

  for (const companyName of companyNames) {
    const report = args.companyReports.get(companyName)!;
    const period = report.periods.find((p) => p.key === args.quarterKey);
    if (!period) continue;

    const labelLookup = new Map<string, ReportingModel["finalSections"][number]["rows"][number]>();
    for (const section of report.finalSections) {
      for (const row of section.rows) {
        if (!labelLookup.has(row.label)) {
          labelLookup.set(row.label, row);
        }
      }
    }

    const row: SheetCellValue[] = [lookupKvId(companyName), companyName];
    for (const metric of TARGET_METRICS) {
      const metricRow = labelLookup.get(metric.label);
      if (!metricRow) {
        row.push(null);
        continue;
      }
      const value = metricRow.amounts[period.key];
      row.push(value ?? null);
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Distinct quarters across all reports. Sorted newest-first (largest key first).
 */
export function collectDistinctQuarters(reports: ReportingModel[]): Array<{ key: string; label: string }> {
  const map = new Map<string, string>();
  for (const report of reports) {
    for (const period of report.periods) {
      if (!map.has(period.key)) {
        map.set(period.key, period.label || period.key);
      }
    }
  }
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Sanitize a quarter key into a valid Google Sheets tab name.
 * Sheets forbids \ / ? * [ ] : and limits to 100 chars.
 */
export function toSheetTabName(quarterKey: string): string {
  const cleaned = quarterKey.replace(/[\\/?*\[\]:]/g, "_").trim();
  return cleaned.slice(0, 100) || "Sheet";
}

// ===========================================================================
// 분류DB 시트 빌더 — 5단계 트리 + 코드 + 부호 + 출처
// ===========================================================================

export const CLASSIFICATION_DB_TAB_NAME = "분류DB";
export const CLASSIFICATION_DB_HEADERS = [
  "코드", "대분류", "중분류", "소분류", "세분류", "항목명", "부호", "출처"
] as const;

/** Sentinel code for unclassified rows so they sort to the bottom. */
const UNCLASSIFIED_CODE = 9999999;

export type AccountSource = {
  companyName: string;
  quarterLabel: string;
};

export type AccountOccurrence = {
  accountName: string;
  sources: AccountSource[];
};

/**
 * Convert "YYYY-MM-DD" → "YYMM" (e.g. "2025-12-31" → "2512").
 * Falls back to the trimmed original when unparseable.
 */
function formatQuarterYYMM(label: string): string {
  const trimmed = (label ?? "").trim();
  const match = /^(\d{4})-(\d{2})/.exec(trimmed);
  if (!match) return trimmed;
  return `${match[1].slice(2)}${match[2]}`;
}

function formatSourceCell(sources: AccountSource[]): string {
  return sources
    .map((s) => `${s.companyName}${formatQuarterYYMM(s.quarterLabel)}`)
    .join(", ");
}

function normalizeLookup(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * Build the 분류DB tab payload.
 *
 * - When `catalog` is provided: rows mirror the runtime catalog (so 분류DB 탭
 *   화면의 편집사항 — alias 이동/추가 — 이 시트에도 그대로 반영). 이 경로가
 *   사용자가 보고 있는 표와 동일.
 * - When `catalog` is omitted: falls back to seed-only rows. (호환용 / 카탈로그
 *   로드 전 호출 대비)
 *
 * 마지막으로 OCR 계정명 중 어디에도 매칭 안 된 것은 미분류 행으로 추가.
 */
export function buildClassificationDbTab(
  accountOccurrences: AccountOccurrence[],
  catalog?: ClassificationCatalogGroup[]
): { tabName: string; headers: string[]; rows: SheetCellValue[][] } {
  // Group occurrences by normalized account name for lookup.
  const occurrencesByName = new Map<string, AccountSource[]>();
  for (const occ of accountOccurrences) {
    const key = normalizeLookup(occ.accountName);
    if (!key) continue;
    const existing = occurrencesByName.get(key) ?? [];
    existing.push(...occ.sources);
    occurrencesByName.set(key, existing);
  }

  const matchedAliasKeys = new Set<string>();
  const rows: SheetCellValue[][] = [];

  if (catalog && catalog.length) {
    // Catalog-driven rows — mirrors ClassificationTableViewInner의
    // buildClassificationTableRows: catalog 그룹별로 seed에서 대/중/소/세 찾고,
    // canonicalKey + group.aliases 합쳐 행 생성. seed-wins 규칙으로 중복 alias
    // 가 다른 seed home에 속하면 스킵.
    const seenRowKeys = new Set<string>();
    for (const group of catalog) {
      const code = parseInt(group.groupId, 10);
      if (!Number.isFinite(code)) continue;
      const seed = findEntryByCode(code);
      if (!seed) continue;
      // '+ → 시트가 수식으로 오해해 #ERROR! 뜨는 거 막기 위한 텍스트 강제 prefix.
      const signLabel = seed.sign === 1 ? "−" : "'+";
      const aliasList: string[] = [seed.세분류, ...group.aliases];
      for (const alias of aliasList) {
        const aliasKey = normalizeLookup(alias);
        if (!aliasKey) continue;
        const seedHome = findEntryByAlias(alias);
        if (seedHome && seedHome.code !== seed.code) continue;
        const rowKey = `${code}::${aliasKey}`;
        if (seenRowKeys.has(rowKey)) continue;
        seenRowKeys.add(rowKey);
        matchedAliasKeys.add(aliasKey);
        const sources = occurrencesByName.get(aliasKey) ?? [];
        rows.push([
          seed.code,
          seed.대분류,
          seed.중분류,
          seed.소분류,
          seed.세분류,
          alias,
          signLabel,
          formatSourceCell(sources)
        ]);
      }
    }
  } else {
    // Seed-driven rows (fallback)
    for (const entry of CLASSIFICATION_ENTRIES) {
      // '+ → 시트가 수식으로 오해해 #ERROR! 뜨는 거 막기 위한 텍스트 강제 prefix.
      const signLabel = entry.sign === 1 ? "−" : "'+";
      const aliases = entry.aliases.length ? entry.aliases : [entry.세분류];
      for (const alias of aliases) {
        const aliasKey = normalizeLookup(alias);
        matchedAliasKeys.add(aliasKey);
        const sources = occurrencesByName.get(aliasKey) ?? [];
        rows.push([
          entry.code,
          entry.대분류,
          entry.중분류,
          entry.소분류,
          entry.세분류,
          alias,
          signLabel,
          formatSourceCell(sources)
        ]);
      }
    }
  }

  // 미분류 — OCR 계정명 중 위 행들과 매칭 안 된 것
  for (const [normKey, sources] of occurrencesByName.entries()) {
    if (matchedAliasKeys.has(normKey)) continue;
    const accountName = sources[0]
      ? accountOccurrences.find((o) => normalizeLookup(o.accountName) === normKey)?.accountName ?? ""
      : "";
    rows.push([
      UNCLASSIFIED_CODE,
      "", "", "미분류", "", accountName, "",
      formatSourceCell(sources)
    ]);
  }

  // Sort: 코드 ASC (미분류는 9999999로 자동 맨 밑), then 항목명
  rows.sort((a, b) => {
    const codeA = typeof a[0] === "number" ? a[0] : 0;
    const codeB = typeof b[0] === "number" ? b[0] : 0;
    if (codeA !== codeB) return codeA - codeB;
    return String(a[5] ?? "").localeCompare(String(b[5] ?? ""), "ko");
  });

  return {
    tabName: CLASSIFICATION_DB_TAB_NAME,
    headers: [...CLASSIFICATION_DB_HEADERS],
    rows
  };
}

/**
 * Mirror helper: lookup which seed entry an account would land in, if any.
 * Re-exported so callers don't need to import findEntryByAlias directly.
 */
export function lookupClassification(accountName: string) {
  return findEntryByAlias(accountName);
}

// ===========================================================================
// 분류DB 재설정 시트 — 저장된 스냅샷의 cat(=section) + accountName + signFlag
// 을 그대로 읽어 대분류/중분류/항목명/부호 를 채운다. 시드 룩업 없음.
//
// 저장된 row 한 줄에 [signFlag, section, accountName] 이 들어있고:
//   - 중분류 = section (예: "유동자산", "매출액", "판매비와관리비")
//   - 항목명 = accountName (예: "현금및현금성자산", "직원급여")
//   - 대분류 = section 그룹 매핑 (자산/부채/자본/손익)
//
// 재무상태표·손익계산서 cat 행들은 상위 소계라서 시트에서 제외.
// ===========================================================================

export const CLASSIFICATION_DB_RESET_TAB_NAME = "분류DB_재설정";
export const CLASSIFICATION_DB_RESET_HEADERS = [
  "코드", "대분류", "중분류", "소분류", "세분류", "항목명", "부호", "출처"
] as const;

// section → 대분류 매핑. 시드 컨벤션을 따라:
//   BS는 통합 (유동/비유동 → 자산·부채), P&L은 섹션 그대로 (매출액/매출원가/
//   판관비/영업외수익/영업외비용 각각 별도 대분류).
// "기타" 는 OCR 카테고리 행에서 자본 leaf 항목들(자본금/주식발행초과금/
//   기타포괄손익누계액/미처리결손금 등) 위에 붙는 컨벤션 → 자본으로 본다.
// 회사명/날짜 같은 메타 컬럼은 buildStatementRows 단계에서 이미 걸러져
//   스냅샷 row에 안 들어옴.
const SECTION_TO_MAJOR_CATEGORY: Record<string, string> = {
  "유동자산": "자산",
  "비유동자산": "자산",
  "유동부채": "부채",
  "비유동부채": "부채",
  "기타": "자본",
  "매출액": "매출액",
  "매출원가": "매출원가",
  "판매비와관리비": "판관비",
  "판관비": "판관비",
  "영업비용": "판관비",
  "영업외수익": "영업외수익",
  "영업외비용": "영업외비용"
};

type ResetEntry = {
  accountName: string;
  대분류: string;
  중분류: string;
  signFlag: 0 | 1;
  sources: AccountSource[];
};

export function buildClassificationDbResetTab(
  savedDatasets: SavedQuarterSnapshot[]
): { tabName: string; headers: string[]; rows: SheetCellValue[][] } {
  // 같은 항목명이 여러 회사·분기에 나오면 한 행으로 묶고 출처만 누적.
  // 첫 등장의 section / signFlag 를 그대로 사용 (사용자가 시트에서 수정 가능).
  const byName = new Map<string, ResetEntry>();
  for (const dataset of savedDatasets) {
    for (const row of dataset.adjustedStatementRows) {
      const name = (row.accountName ?? "").trim();
      const section = (row.section ?? "").trim();
      if (!name || !section) continue;
      // 재무상태표·손익계산서 cat = 상위 소계 행 (자산/부채/자본/유동자산/...
      // 같은 합계 항목). 분류DB의 분류 대상이 아니므로 제외.
      const major = SECTION_TO_MAJOR_CATEGORY[section];
      if (!major) continue;

      const source = { companyName: dataset.companyName, quarterLabel: dataset.quarterLabel };
      const existing = byName.get(name);
      if (existing) {
        const dup = existing.sources.some(
          (s) => s.companyName === source.companyName && s.quarterLabel === source.quarterLabel
        );
        if (!dup) existing.sources.push(source);
      } else {
        byName.set(name, {
          accountName: name,
          대분류: major,
          중분류: section,
          signFlag: row.signFlag,
          sources: [source]
        });
      }
    }
  }

  const rows: SheetCellValue[][] = [];
  for (const entry of byName.values()) {
    // '+ → 시트가 수식으로 오해해 #ERROR! 뜨는 거 막기 위한 텍스트 강제 prefix.
    const signLabel = entry.signFlag === 1 ? "−" : "'+";
    rows.push([
      "",            // 코드 — 비움 (사용자가 새 분류 작업하며 채움)
      entry.대분류,
      entry.중분류,
      "",            // 소분류 — 비움
      "",            // 세분류 — 비움
      entry.accountName,
      signLabel,
      formatSourceCell(entry.sources)
    ]);
  }

  // 대분류 → 중분류 → 항목명 순 정렬. 대분류·중분류는 회계 표 순서를
  // 따른다 (가나다 순이 아님). 목록에 없는 값은 맨 뒤로.
  // 헤더: [코드(0), 대분류(1), 중분류(2), 소분류(3), 세분류(4), 항목명(5), 부호(6), 출처(7)]
  const MAJOR_ORDER = ["자산", "부채", "자본", "매출액", "매출원가", "판관비", "영업외수익", "영업외비용"];
  const MIDDLE_ORDER = ["유동자산", "비유동자산", "유동부채", "비유동부채", "기타", "매출액", "매출원가", "판매비와관리비", "영업외수익", "영업외비용"];
  const rankOf = (list: string[], v: string) => {
    const i = list.indexOf(v);
    return i === -1 ? list.length : i;
  };
  rows.sort((a, b) => {
    const aMajor = String(a[1] ?? "");
    const bMajor = String(b[1] ?? "");
    const majorDiff = rankOf(MAJOR_ORDER, aMajor) - rankOf(MAJOR_ORDER, bMajor);
    if (majorDiff !== 0) return majorDiff;
    const aMid = String(a[2] ?? "");
    const bMid = String(b[2] ?? "");
    const midDiff = rankOf(MIDDLE_ORDER, aMid) - rankOf(MIDDLE_ORDER, bMid);
    if (midDiff !== 0) return midDiff;
    return String(a[5] ?? "").localeCompare(String(b[5] ?? ""), "ko");
  });

  return {
    tabName: CLASSIFICATION_DB_RESET_TAB_NAME,
    headers: [...CLASSIFICATION_DB_RESET_HEADERS],
    rows
  };
}
