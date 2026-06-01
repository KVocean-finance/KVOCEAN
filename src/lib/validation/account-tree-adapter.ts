/**
 * 계정트리 → 보고서 엔진 어댑터.
 * 새 트리(account-tree.ts)를 기존 엔진이 알아먹는 형식으로 변환한다:
 *   1) buildTreeCatalogLookup: 매칭용 catalogLookup (이름→코드·부호, 섹션 구분)
 *   2) buildTreeKeywordCodeSets: 보고서 묶음(인건비/변동비/…)별 새 코드 집합
 * 이로써 engine.resolveAccountClassification·report 묶음 합산이 옛 시드/결과물DB
 * 없이 트리만으로 동작한다.
 */
import type { CatalogAliasMatch, SignCode } from "./defaults";
import { normalizeAccountName, type AccountTreeRow, type ParsedAccountTree } from "./account-tree";

/**
 * 트리 행 배열(API 캐시에서 받은 것)에서 직접 catalogLookup 빌드.
 * 클라이언트가 ParsedAccountTree 없이 rows만 갖고 있을 때 쓴다.
 */
export function buildTreeCatalogLookupFromRows(rows: AccountTreeRow[]): Map<string, CatalogAliasMatch[]> {
  const map = new Map<string, CatalogAliasMatch[]>();
  for (const r of rows) {
    if (!r.l5 || !r.code) continue; // leaf + 코드 있는 것만 (구조노드·미분류 대기 제외)
    const key = normalizeAccountName(r.l5);
    const cm: CatalogAliasMatch = {
      sign: (r.sign === "-" ? 1 : 0) as SignCode,
      majorCategory: r.l1,
      middleCategory: r.l2,
      smallCategory: r.l3,
      canonicalKey: r.l5,
      groupId: r.code
    };
    const list = map.get(key) ?? [];
    if (!list.some((x) => x.groupId === cm.groupId)) {
      list.push(cm);
      map.set(key, list);
    }
  }
  return map;
}

/** 트리 leaf → catalogLookup(Map<정규화이름, CatalogAliasMatch[]>). groupId = 13자리 코드. */
export function buildTreeCatalogLookup(tree: ParsedAccountTree): Map<string, CatalogAliasMatch[]> {
  const map = new Map<string, CatalogAliasMatch[]>();
  for (const [key, matches] of tree.aliasLookup) {
    for (const m of matches) {
      if (!m.code) continue; // 분류 대기(미분류) 행은 매칭 코드 없음 → 건너뜀
      const cm: CatalogAliasMatch = {
        sign: m.signFlag as SignCode,
        majorCategory: m.l1, // 대분류
        middleCategory: m.l2, // 중분류 — OCR 섹션(유동자산/판관비…)과 매칭되는 구분 힌트
        smallCategory: m.l3, // 소분류
        canonicalKey: m.l5,
        groupId: m.code
      };
      const list = map.get(key) ?? [];
      if (!list.some((x) => x.groupId === cm.groupId)) {
        list.push(cm);
        map.set(key, list);
      }
    }
  }
  return map;
}

// 보고서 묶음 키워드 → 트리 매핑 규칙.
// node = 구조노드명(그 아래 leaf 전부), leafContains = L5명 포함, varFix = 변동/고정.
type KeywordRule = { nodes?: string[]; leafContains?: string[]; varFix?: "변동" | "고정" };
const KEYWORD_RULES: Record<string, KeywordRule> = {
  현금및현금성자산: { nodes: ["현금 및 현금성자산"] },
  매도가능증권: { leafContains: ["매도가능증권"] },
  단기대여금: { nodes: ["단기대여금"] },
  "개발비(자산)": { nodes: ["개발비"] },
  선급금: { nodes: ["선급금"] },
  가수금: { leafContains: ["가수금"] },
  가지급금: { leafContains: ["가지급금"] },
  퇴직급여충당부채: { nodes: ["순확정급여부채"] },
  매출채권: { nodes: ["매출채권 및 기타채권"] },
  차입금: { nodes: ["단기차입금", "장기차입금"] },
  이자비용: { leafContains: ["이자비용"] },
  인건비: { nodes: ["인건비"] },
  연구개발비: { nodes: ["연구개발비"] },
  접대비: { nodes: ["접대비"] },
  복리후생비: { nodes: ["복리후생비"] },
  광고선전비: { nodes: ["광고 및 마케팅비"] },
  지급수수료: { nodes: ["IT인프라 및 지급수수료"] },
  외주용역비: { nodes: ["외주용역비"] },
  임차료: { nodes: ["임차료 및 리스료"] },
  감가상각비계: { nodes: ["감가상각 및 상각비"] },
  재고자산: { nodes: ["재고자산"] },
  당좌자산: { nodes: ["당좌자산"] },
  변동비: { varFix: "변동" },
  고정비: { varFix: "고정" }
};

const PREFIX_LEN = [0, 1, 4, 7, 10] as const;

// 구조노드명 → 코드 prefix들 (이름 같은 노드가 여러 가지면 다수).
function nodePrefixes(tree: ParsedAccountTree, nodeName: string): string[] {
  const key = normalizeAccountName(nodeName);
  const out: string[] = [];
  for (const row of tree.rows) {
    if (row.l5 !== "" || row.code === "") continue; // 구조노드만
    const labels = [row.l1, row.l2, row.l3, row.l4].filter((x) => x);
    const deepest = labels[labels.length - 1] ?? "";
    if (normalizeAccountName(deepest) === key) out.push(row.code.slice(0, PREFIX_LEN[labels.length]));
  }
  return out;
}

/** 보고서 묶음 키워드 → 새 트리 코드(숫자) 집합. report.ts REPORT_KEYWORD_CODE_SETS 대체. */
export function buildTreeKeywordCodeSets(tree: ParsedAccountTree): Record<string, Set<number>> {
  const out: Record<string, Set<number>> = {};
  for (const [keyword, rule] of Object.entries(KEYWORD_RULES)) {
    const codes = new Set<number>();
    if (rule.varFix === "변동") tree.variableCodes.forEach((c) => codes.add(Number(c)));
    if (rule.varFix === "고정") tree.fixedCodes.forEach((c) => codes.add(Number(c)));
    const prefixes = (rule.nodes ?? []).flatMap((n) => nodePrefixes(tree, n));
    for (const row of tree.rows) {
      if (row.l5 === "" || row.code === "") continue; // leaf만
      if (prefixes.some((p) => row.code.startsWith(p))) codes.add(Number(row.code));
      else if ((rule.leafContains ?? []).some((s) => row.l5.includes(s))) codes.add(Number(row.code));
    }
    out[keyword] = codes;
  }
  return out;
}
