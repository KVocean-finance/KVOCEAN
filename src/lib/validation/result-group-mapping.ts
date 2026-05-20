// 보고서 키워드 → 결과물DB 합산 묶음 매핑.
// report.ts의 보고서 카드 합산 path가 쓰는 ClassificationGroups를 결과물DB 기반으로
// 빌드하기 위한 것. 분류DB(시드)는 OCR 매칭/부호용, 결과물DB는 보고서 묶음용.
//
// 매핑 검증: scripts/diff_legacy_vs_resultdb.mjs → scripts/_diff.txt

import { RESULT_CLASSIFICATION, RESULT_BY_GROUP } from "./result-classification";

// 보고서 카드가 합산에 쓰는 키워드 → 결과물DB의 group 이름(들).
// group이 양수/음수로 갈린 묶음은 둘 다 합쳐서 한 키워드로 본다.
const REPORT_KEYWORD_GROUPS: Record<string, string[]> = {
  현금및현금성자산: ["현금및현금성자산"],
  매도가능증권: ["매도가능증권"],
  단기대여금: ["단기대여금"],
  "개발비(자산)": ["개발비(자산)_양수", "개발비(자산)_음수"],
  선급금: ["선급금_양수", "선급금_음수"],
  가수금: ["가수금"],
  가지급금: ["가지급금"],
  퇴직급여충당부채: ["퇴직급여충당부채_양수", "퇴직급여충당부채_음수"],
  매출채권: ["매출채권_양수", "매출채권_음수"],
  차입금: ["차입금_양수", "차입금_음수"],
  이자비용: ["총이자비용"],
  인건비: ["인건비"],
  연구개발비: ["연구개발비"],
  접대비: ["접대비"],
  복리후생비: ["복리후생비"],
  광고선전비: ["광고선전비"],
  지급수수료: ["지급수수료"],
  외주용역비: ["외주용역비"],
  임차료: ["임차료"],
  감가상각비계: ["감가상각비", "무형자산상각비", "사용권자산상각비"]
};

// group 필드가 없는 묶음 — 소분류 자체가 묶음 역할.
// 재고자산은 사용자 엑셀에서 유동자산·비유동자산 양쪽 영역에 같은 소분류로
// 정의돼 있고, 둘 다 재고자산 묶음에 포함하는 것이 사용자 의도.
const REPORT_KEYWORD_SOBUNRYU: Record<string, string[]> = {
  재고자산: ["재고자산"],
  당좌자산: ["당좌자산"]
};

// 보고서 키워드 → 묶음 멤버의 세분류 이름 목록.
export function buildReportKeywordGroups(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [keyword, groupNames] of Object.entries(REPORT_KEYWORD_GROUPS)) {
    const members = new Set<string>();
    for (const groupName of groupNames) {
      const entries = RESULT_BY_GROUP.get(groupName) ?? [];
      if (!entries.length) {
        throw new Error(`result-group-mapping: 결과물DB에 group "${groupName}" 없음 (키워드 "${keyword}")`);
      }
      for (const entry of entries) {
        const name = entry.세분류.trim();
        if (name) members.add(name);
      }
    }
    result[keyword] = Array.from(members);
  }

  for (const [keyword, sobunryuList] of Object.entries(REPORT_KEYWORD_SOBUNRYU)) {
    const members = new Set<string>();
    for (const entry of RESULT_CLASSIFICATION) {
      if (sobunryuList.includes(entry.소분류.trim())) {
        const name = entry.세분류.trim();
        if (name) members.add(name);
      }
    }
    if (!members.size) {
      throw new Error(`result-group-mapping: 소분류 "${sobunryuList.join("/")}" 멤버 없음 (키워드 "${keyword}")`);
    }
    result[keyword] = Array.from(members);
  }

  return result;
}
