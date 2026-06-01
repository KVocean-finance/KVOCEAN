-- 계정트리(구글시트 단일 소스)의 검증 통과본 캐시.
-- "분류DB 동기화" 버튼이 시트를 읽어 검증한 뒤, 통과한 스냅샷을 여기에 저장한다.
-- 앱은 이 캐시(last-good)에서 분류를 읽어 빠르고, 시트 장애·편집 중에도 안전하다.
-- classification_tree = { values, syncedAt, syncedBy, stats, warningCount }
alter table public.app_config
  add column if not exists classification_tree jsonb,
  add column if not exists classification_tree_synced_at timestamptz,
  add column if not exists classification_tree_synced_by text;
