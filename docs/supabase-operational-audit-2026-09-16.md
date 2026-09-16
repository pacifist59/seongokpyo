# Supabase 운영 안정성 감사 — 2026-09-16

이 문서는 `pacifist59/seongokpyo`의 다음 작업을 다른 컴퓨터나 새 Codex 작업에서 그대로 이어가기 위한 감사 기록이다. 작업을 재개할 때 이 문서와 `docs/metadata-enrichment.md`를 먼저 읽는다.

## 결론

핵심 RLS 권한 경계는 운영 DB에서 통과했다. 롤백 전용 A/B 행동 테스트로 작성자 소유권, 계정별 비공개 데이터 격리, 익명 쓰기 차단, revision/activity 기록 동작을 확인했다. 테스트용 행은 최종 예외로 전부 롤백했고, 실행 후 감사 잔여물은 0개였다.

다만 정식 서비스 전에 우선 처리할 운영 위험이 두 가지 있다.

1. 생성·수정 activity 기록이 RPC 트랜잭션 밖의 브라우저 요청이라 누락될 수 있다.
2. `/setlist/:id/edit`를 직접 열거나 새로고침하면 Cloudflare redirect가 `/setlists/new.html`을 제공하여 수정 화면이 등록 화면으로 바뀐다.

## 검증 결과

| 범위 | 결과 | 근거 |
| --- | --- | --- |
| 익명 댓글 작성 | PASS | `anon`에 INSERT 권한 없음, 행동 테스트에서 `42501` 차단 |
| 익명 북마크 | PASS | `anon`에 INSERT 권한 없음, 행동 테스트에서 `42501` 차단 |
| 익명 삭제 RPC | PASS | `anon`/`public` EXECUTE 없음, 행동 테스트에서 `42501` 차단 |
| 작성자 A 수정 | PASS | A가 `replace_setlist` 실행, revision 1개 생성 확인 |
| 작성자 A 삭제 | PASS | A가 `delete_setlist` 실행, `true` 반환 및 deleted activity 보존 확인 |
| 작성자 B의 A 수정·삭제 | PASS | 직접 UPDATE/DELETE 영향 행 0개, 두 RPC 모두 `42501` |
| 관람 기록 격리 | PASS | A fixture를 B 역할에서 조회했을 때 0개 |
| 북마크 격리 | PASS | A fixture를 B 역할에서 조회했을 때 0개 |
| 댓글 계정 구분 | PASS(설계 주의) | 댓글 본문은 공개 조회가 의도된 정책. B의 마이페이지 조건 `user_id = B`에는 A 댓글 0개이며 수정도 0개 |
| revision 격리 | PASS | A revision을 B 역할에서 조회했을 때 0개 |
| activity 격리 | PASS | A activity를 B 역할에서 조회했을 때 0개 |
| 실제 revision/activity 기록 | PASS | 운영 DB에 revision 1, created activity 1, edited activity 1 존재 |
| migration file ↔ CLI history | PASS | 로컬 4개와 원격 history 4개 버전이 정확히 일치 |
| 익명 브라우저 흐름 | PASS | 댓글 작성 안내와 북마크 클릭 모두 로그인 화면으로 연결 |
| Supabase Security Advisor | PARTIAL | 오류 0, 경고 48. 대부분 공개 아카이브용 GraphQL 조회 경고이나 별도 함수 노출 1건 존재 |
| Supabase Performance Advisor | PASS | 오류 0, 경고 0, 정보성 제안 13 |

### 운영 행 수 — 감사 전후 동일

| 항목 | 개수 |
| --- | ---: |
| setlists | 2 |
| setlist_revisions | 1 |
| activity: created | 1 |
| activity: edited | 1 |
| activity: deleted | 0 |
| attendances | 0 |
| bookmarks | 0 |
| comments | 1 |
| `RLS audit %` 잔여 아티스트 | 0 |

운영의 attendances/bookmarks는 현재 0개라 기존 실제 계정 간 혼합 여부를 표본으로 비교할 수는 없었다. 대신 실제 운영 정책을 A/B 역할로 실행하는 롤백 fixture 테스트로 격리를 검증했다.

## 발견 사항과 우선순위

### High — 생성·수정 activity가 원자적이지 않음

`create_setlist`/`replace_setlist` RPC가 성공한 뒤 프런트엔드가 별도 INSERT로 activity를 기록한다. 두 번째 요청 실패는 `console.warn`만 남기므로 선곡표는 저장됐는데 활동 기록은 빠질 수 있다. 현재 운영 데이터도 setlist 2개에 created activity 1개다. 기존 데이터가 기능 도입 전 생성됐을 가능성은 있지만, 현재 구조가 앞으로도 같은 누락을 허용한다.

다음 작업에서는 created/edited activity INSERT를 각각 `create_setlist`와 `replace_setlist` RPC 내부로 옮겨 동일 트랜잭션으로 묶는다. 프런트엔드의 `recordActivity` 호출은 제거한다. RPC 내부 snapshot에는 최소한 setlist/concert/songs를 넣고, pgTAP과 롤백 행동 테스트를 갱신한다.

### High — 직접 수정 URL과 새로고침이 등록 화면으로 바뀜

운영에서 `/setlist/<id>/edit`를 직접 열었을 때 `/setlists/new`로 바뀌었다. 원인은 `public/_redirects`의 다음 규칙이다.

```text
/setlist/:id/edit /setlists/new.html 200
```

SPA 내부에서 작성자가 수정 링크를 누를 때는 동작할 수 있지만 직접 접근·새로고침·인증 후 복귀가 등록 모드가 된다. 수정 URL도 `index.html` 또는 해당 수정 경로용 셸로 보내되 브라우저 주소와 `id`가 유지되도록 고쳐야 한다.

### Medium — 삭제하면 revision 이력이 사라짐

`setlist_revisions.setlist_id`는 `ON DELETE CASCADE`다. 수정 직후 revision 생성은 원자적으로 정상 작동하지만 선곡표 삭제 시 revision은 전부 제거된다. 반면 `setlist_activity.setlist_id`는 `ON DELETE SET NULL`이라 deleted activity가 남는다.

revision을 감사 이력으로 쓸 계획이면 nullable `setlist_id`, 원본 setlist UUID 별도 저장, snapshot 보존 방식으로 변경한다. 단순 복구 보조 데이터라면 현재 동작을 문서화한다.

### Medium — migration history는 일치하지만 운영 schema drift가 있음

원격 migration history와 파일은 아래 4개로 일치한다.

- `20260913044834_initial_schema`
- `20260913053908_service_engagement_features`
- `20260915090000_metadata_enrichment_queue`
- `20260915093000_switch_venue_geocoding_to_kakao`

하지만 운영 DB에는 migration 파일에 없는 활성 event trigger `ensure_rls`와 `public.rls_auto_enable()`이 있다. 함수는 `SECURITY DEFINER`, owner `postgres`, `anon`과 `authenticated` 모두 EXECUTE가 true다. 함수의 목적은 public schema에 생성되는 표에 RLS를 자동 활성화하는 것이고 직접 RPC로 쓸 함수는 아니다.

다음 migration에서 기능을 유지하되 최소한 아래 권한을 명시적으로 회수하고, 가능하면 함수를 `private` schema로 옮긴다.

```sql
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
```

적용 전에 event trigger가 이동된 함수 OID를 계속 가리키는지 로컬에서 검증한다. 운영에서 임의로 drop하지 않는다.

### Low — Security Advisor의 나머지 경고

- 공개 아카이브 테이블/뷰가 anon GraphQL schema에 보인다는 경고는 현재 제품 요구와 일치한다. 비공개 표인 attendances, bookmarks, revisions, activity, metadata_jobs는 공개 조회 대상이 아니다.
- `citext`가 public schema에 설치됐다는 경고는 즉시 장애 요인은 아니다. 다음 큰 schema 정리 때 extensions schema 이동을 검토한다.
- Leaked Password Protection은 꺼져 있다. 현재 로그인 UI가 Google OAuth와 이메일 OTP만 사용하므로 즉시 영향은 작지만 향후 비밀번호 로그인을 추가한다면 먼저 활성화한다.

## 재현 가능한 테스트

운영 롤백 행동 테스트는 `supabase/audits/operational_rls_rollback_audit.sql`에 있다. Supabase SQL Editor에서 **파일 전체를 한 번에** 실행한다.

성공하면 SQL Editor가 실패처럼 보이면서 아래 문구를 출력한다. 이것이 의도된 성공 신호이며 그 예외 때문에 fixture가 전부 롤백된다.

```text
AUDIT_PASS: all fixtures rolled back; no production rows changed
```

`AUDIT_FAIL:`로 시작하면 해당 권한 경계가 실패한 것이다. 성공 또는 실패 어느 쪽이든 단일 DO 문 전체가 예외로 끝나므로 fixture는 커밋되지 않는다.

정적 pgTAP 테스트에는 익명 북마크/RPC 권한과 민감 테이블 RLS 활성화 검사를 추가했다. 로컬 실행에는 Docker가 필요하다.

```powershell
pnpm install --frozen-lockfile
pnpm supabase start
pnpm supabase test db --local
```

이번 컴퓨터에는 Docker가 설치되어 있지 않아 로컬 pgTAP은 실행하지 못했다. 운영 행동 테스트는 별도로 통과했다.

이번 감사 커밋의 일반 검증 결과는 다음과 같다.

- `pnpm lint`: 통과
- `pnpm typecheck`: 통과
- Vite client build와 SSR bundle build: 통과
- 전체 `pnpm build`: 현재 터미널에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`가 없어 prerender 데이터 수집 단계에서 중단. 코드 컴파일 오류는 아님

## 다른 컴퓨터에서 이어가기

```powershell
git clone https://github.com/pacifist59/seongokpyo.git
cd seongokpyo
pnpm install --frozen-lockfile
pnpm supabase login
pnpm supabase link --project-ref yyjghcsnomwvqwpaojug
pnpm supabase migration list --linked
```

DB 비밀번호나 API 키는 문서·Git·명령 기록에 넣지 않는다. 필요한 경우 PowerShell 세션에서만 `SUPABASE_DB_PASSWORD`를 설정한다. Supabase Edge Function Secret의 `KAKAO_REST_API_KEY`, `METADATA_WORKER_TOKEN`과 Cloudflare의 `VITE_KAKAO_MAP_JAVASCRIPT_KEY`도 Git에 넣지 않는다.

## 다음 작업 순서

1. activity 기록을 create/replace RPC 내부로 이동하고 회귀 테스트 추가
2. 직접 수정 URL redirect 수정 및 로그인 후 원래 edit URL 복귀 E2E
3. `rls_auto_enable()` 권한 회수 migration 작성·로컬 검증·배포
4. revision 삭제 보존 정책 결정
5. disposable 실제 계정 2개로 브라우저 A/B E2E 수행
6. 사용자가 요청한 공연장 이름 검색 → 카카오 실제 장소 선택 UX 구현

실제 계정 2개 E2E는 테스트 계정과 이메일 수신 권한이 없고 운영 데이터 변경 금지 조건이 있어 이번 감사에서는 수행하지 않았다. DB 역할 기반 행동 테스트가 동일한 RLS 경계를 검증했다.
