/**
 * 계정트리 (구글시트 KVocean_계정트리_v2) 파서·검증·조회.
 *
 * 이 모듈이 분류의 **단일 소스**다 — 기존 classification-seed / result-classification /
 * result-group-mapping 3겹을 대체한다. 시트 행(문자열 2차원 배열)을 받아:
 *   1) 검증 (코드형식·중복·계층·부모·부호·차대·이름충돌)
 *   2) 조회 인덱스 (이름→코드·부호, 코드→계층, 변동/고정 코드셋, 구조노드명)
 * 을 만든다.
 *
 * 계정코드 13자리 = 계층 인코딩: L1(1) + L2(3) + L3(3) + L4(3) + L5(3).
 * 구조노드는 끝 3자리가 000. 묶음은 코드 prefix 절단으로 유도한다.
 */

export type VarFix = "변동" | "고정" | "";

export type AccountTreeRow = {
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  l5: string;
  sign: "+" | "-" | "";
  code: string; // 13자리. 분류 대기(미분류) 행은 빈 문자열.
  debitCredit: string; // 차변 | 대변
  varFix: VarFix;
  rowIndex: number; // 시트 행번호 (1-base, 헤더=1) — 미분류 append·디버깅용
};

export type AccountTreeMatch = {
  code: string;
  signFlag: 0 | 1; // +→0, -→1 (engine signFlag와 동일 의미)
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  l5: string;
  varFix: VarFix;
  pending: boolean; // 코드 없는 분류 대기 행
};

export type TreeIssueKind =
  | "code_format"
  | "code_duplicate"
  | "code_hierarchy"
  | "missing_parent"
  | "sign_invalid"
  | "debit_credit_invalid"
  | "name_collision";

export type TreeIssue = { kind: TreeIssueKind; code: string; detail: string };

export type ParsedAccountTree = {
  rows: AccountTreeRow[];
  aliasLookup: Map<string, AccountTreeMatch[]>; // 정규화 leaf명 → 매치(충돌 시 2개+)
  codeToRow: Map<string, AccountTreeRow>;
  structuralNames: Set<string>; // 정규화 L1~L4 (섹션/헤더 판정용)
  variableCodes: Set<string>;
  fixedCodes: Set<string>;
  errors: TreeIssue[];
  warnings: TreeIssue[];
  stats: { total: number; leaves: number; structural: number; pending: number };
};

const HEADER_MAP: Record<string, keyof AccountTreeRow> = {
  L1: "l1",
  L2: "l2",
  L3: "l3",
  L4: "l4",
  L5: "l5",
  부호: "sign",
  계정코드: "code",
  차대구분: "debitCredit",
  변동고정: "varFix"
};

// engine.ts normalizeLookupKeyLocal 과 동일 정규화 — 두 곳을 항상 함께 수정할 것.
export function normalizeAccountName(s: string): string {
  return (s ?? "").replace(/[\s_\-.\/\\()\[\]·•'"]+/g, "").toLowerCase();
}

function codeSegments(code: string): [string, string, string, string, string] {
  return [code.slice(0, 1), code.slice(1, 4), code.slice(4, 7), code.slice(7, 10), code.slice(10, 13)];
}

export function depthOf(r: Pick<AccountTreeRow, "l1" | "l2" | "l3" | "l4" | "l5">): number {
  return [r.l1, r.l2, r.l3, r.l4, r.l5].filter((x) => x && x.trim()).length;
}

/** 코드 prefix를 깊이 d까지 남기고 나머지를 0으로 채운 "부모/롤업 키". */
export function rollupCode(code: string, depth: number): string {
  const seg = codeSegments(code);
  for (let i = depth; i < 5; i++) seg[i] = i === 0 ? "0" : "000";
  return seg.join("");
}

function blank(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseAccountTree(values: string[][]): ParsedAccountTree {
  const errors: TreeIssue[] = [];
  const warnings: TreeIssue[] = [];

  const header = values[0] ?? [];
  const colIndex: Partial<Record<keyof AccountTreeRow, number>> = {};
  header.forEach((h, i) => {
    const key = HEADER_MAP[blank(h)];
    if (key) colIndex[key] = i;
  });

  const rows: AccountTreeRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const raw = values[i] ?? [];
    const get = (k: keyof AccountTreeRow) => (colIndex[k] !== undefined ? blank(raw[colIndex[k] as number]) : "");
    const row: AccountTreeRow = {
      l1: get("l1"),
      l2: get("l2"),
      l3: get("l3"),
      l4: get("l4"),
      l5: get("l5"),
      sign: (get("sign") as AccountTreeRow["sign"]) || "",
      code: get("code"),
      debitCredit: get("debitCredit"),
      varFix: (get("varFix") as VarFix) || "",
      rowIndex: i + 1 // 시트 1-base (헤더 = 1행)
    };
    // 완전 빈 행은 건너뜀
    if (!row.l1 && !row.code && !row.l5) continue;
    rows.push(row);
  }

  const codeToRow = new Map<string, AccountTreeRow>();
  const aliasLookup = new Map<string, AccountTreeMatch[]>();
  const structuralNames = new Set<string>();
  const variableCodes = new Set<string>();
  const fixedCodes = new Set<string>();
  const leafNameSeen = new Map<string, string[]>(); // 정규화 leaf명 → 코드들 (충돌 탐지)

  let leaves = 0;
  let structural = 0;
  let pending = 0;

  // 1차 통과 — 행 검증 + 코드 인덱스
  for (const row of rows) {
    const isLeaf = row.l5 !== "";
    const isPending = row.code === "";

    // 구조노드명 수집
    for (const name of [row.l1, row.l2, row.l3, row.l4]) {
      if (name) structuralNames.add(normalizeAccountName(name));
    }

    if (isPending) {
      pending++;
    } else {
      // 코드 형식
      if (!/^\d{13}$/.test(row.code)) {
        errors.push({ kind: "code_format", code: row.code, detail: `${row.l1}>${row.l2}>${row.l3}>${row.l4}>${row.l5}` });
        continue;
      }
      // 코드 중복
      if (codeToRow.has(row.code)) {
        errors.push({ kind: "code_duplicate", code: row.code, detail: `${codeToRow.get(row.code)!.l5} ↔ ${row.l5}` });
      } else {
        codeToRow.set(row.code, row);
      }
      // 코드 ↔ 계층 깊이 일치
      const depth = depthOf(row);
      const seg = codeSegments(row.code);
      let bad = false;
      for (let i = 0; i < 5; i++) {
        const isZero = i === 0 ? seg[i] === "0" : seg[i] === "000";
        if (i < depth ? isZero : !isZero) bad = true;
      }
      if (bad) errors.push({ kind: "code_hierarchy", code: row.code, detail: `depth=${depth} seg=${seg.join(".")} (${row.l5 || row.l4})` });
    }

    if (isLeaf) {
      leaves++;
      if (!isPending && row.sign !== "+" && row.sign !== "-") {
        errors.push({ kind: "sign_invalid", code: row.code, detail: `${row.l5} 부호='${row.sign}'` });
      }
      // 변동/고정 코드셋
      if (!isPending) {
        if (row.varFix === "변동") variableCodes.add(row.code);
        else if (row.varFix === "고정") fixedCodes.add(row.code);
      }
      // 이름 충돌 추적
      const key = normalizeAccountName(row.l5);
      const arr = leafNameSeen.get(key) ?? [];
      arr.push(row.code || "(미분류)");
      leafNameSeen.set(key, arr);
      // 조회 인덱스
      const match: AccountTreeMatch = {
        code: row.code,
        signFlag: row.sign === "-" ? 1 : 0,
        l1: row.l1,
        l2: row.l2,
        l3: row.l3,
        l4: row.l4,
        l5: row.l5,
        varFix: row.varFix,
        pending: isPending
      };
      const matches = aliasLookup.get(key) ?? [];
      matches.push(match);
      aliasLookup.set(key, matches);
    } else {
      structural++;
    }

    // 차대구분
    if (row.debitCredit && row.debitCredit !== "차변" && row.debitCredit !== "대변") {
      errors.push({ kind: "debit_credit_invalid", code: row.code, detail: `${row.l5 || row.l4} 차대='${row.debitCredit}'` });
    }
  }

  // 2차 통과 — 부모 존재 검증 (코드 있는 행만)
  for (const row of rows) {
    if (row.code === "" || !/^\d{13}$/.test(row.code)) continue;
    const depth = depthOf(row);
    if (depth <= 1) continue;
    const parent = rollupCode(row.code, depth - 1);
    if (!codeToRow.has(parent)) {
      errors.push({ kind: "missing_parent", code: row.code, detail: `${row.l5 || row.l4} → 부모 ${parent} 없음` });
    }
  }

  // 이름 충돌 → 경고 (서로 다른 코드에 같은 정규화 이름)
  for (const [name, codes] of leafNameSeen) {
    const uniq = Array.from(new Set(codes));
    if (uniq.length > 1) {
      warnings.push({ kind: "name_collision", code: uniq.join(","), detail: name });
    }
  }

  return {
    rows,
    aliasLookup,
    codeToRow,
    structuralNames,
    variableCodes,
    fixedCodes,
    errors,
    warnings,
    stats: { total: rows.length, leaves, structural, pending }
  };
}

/**
 * OCR 계정명 → 트리 매치. 섹션명으로 충돌(유동/비유동 등)을 가른다.
 * engine.resolveAccountClassification 의 새 백엔드.
 */
export function matchAccount(
  tree: ParsedAccountTree,
  name: string,
  sectionName?: string
): AccountTreeMatch | null {
  const candidates = tree.aliasLookup.get(normalizeAccountName(name));
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1 || !sectionName) return candidates[0];
  const hint = normalizeAccountName(sectionName);
  return (
    candidates.find((c) => normalizeAccountName(c.l2) === hint) ??
    candidates.find((c) => normalizeAccountName(c.l1) === hint) ??
    candidates.find((c) => normalizeAccountName(c.l3) === hint) ??
    candidates.find((c) => normalizeAccountName(c.l4) === hint) ??
    candidates[0]
  );
}
