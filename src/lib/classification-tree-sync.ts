/**
 * 계정트리 동기화 서버 유틸.
 * 시트 → 검증 → 캐시(app_config.classification_tree) 흐름의 시트 읽기·캐시 직렬화 부분.
 * 검증·조회 로직 자체는 account-tree.ts (parseAccountTree)에 있다.
 */
import { getTreeSheetsConfig } from "@/lib/google-sheets";
import { parseAccountTree, type ParsedAccountTree } from "@/lib/validation/account-tree";

export type ClassificationTreeCache = {
  values: string[][]; // 검증 통과한 시트 스냅샷 (last-good). 앱은 이걸 parseAccountTree로 복원.
  syncedAt: string;
  syncedBy: string | null;
  stats: ParsedAccountTree["stats"];
  warningCount: number;
};

/** 트리 시트(통합 탭) 전체를 읽어 문자열 2차원 배열로 반환. */
export async function readTreeSheetValues(): Promise<string[][]> {
  const config = getTreeSheetsConfig();
  if (!config) {
    throw new Error("구글시트 서비스계정 설정이 없습니다 (GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY).");
  }
  const res = await config.sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.tabName}!A1:I`
  });
  return (res.data.values ?? []) as string[][];
}

/** 검증 통과한 트리 + 시트값으로 캐시 객체를 만든다. */
export function buildTreeCache(values: string[][], tree: ParsedAccountTree, syncedBy: string | null, syncedAt: string): ClassificationTreeCache {
  return {
    values,
    syncedAt,
    syncedBy,
    stats: tree.stats,
    warningCount: tree.warnings.length
  };
}

/** 캐시(또는 갓 읽은 시트값)에서 조회 가능한 트리를 복원. */
export function treeFromCache(cache: Pick<ClassificationTreeCache, "values">): ParsedAccountTree {
  return parseAccountTree(cache.values);
}
