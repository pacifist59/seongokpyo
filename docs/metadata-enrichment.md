# 콘텐츠 메타데이터와 공연장 좌표 보정

브라우저는 공개 조회와 사용자 입력만 담당합니다. Spotify, 음반 정보 제공자, 카카오 Local REST API의 비밀 키는 `VITE_` 환경변수나 Cloudflare Pages에 넣지 않습니다.

## 수집 구조

`artists`, `albums`, `songs`는 각각 메타데이터 수집 상태와 출처·갱신 시각을 갖습니다. 새 행은 `metadata_jobs`에 `metadata` 작업을 생성합니다. 공급자별 수집기는 이 대기열을 읽어 이미지, 소개, 발매일, 외부 ID만 갱신합니다. 제목·아티스트명처럼 사용자가 입력한 원본 값은 수집기로 덮어쓰지 않습니다.

`venues`는 주소가 만들어지거나 바뀌면 `geocode` 작업을 생성합니다. 유효한 좌표가 이미 있는 새 공연장은 다시 호출하지 않으며, 주소가 바뀌면 오래된 좌표를 비우고 새 작업을 생성합니다. 주소가 없는 공연장은 `not_available` 상태로 남아 카카오맵 검색 링크를 보여 줍니다.

## 좌표 일괄 보정

1. Supabase SQL Editor 또는 CLI로 저장소의 최신 migrations를 순서대로 적용합니다. 카카오 전환에는 `20260915090000_metadata_enrichment_queue.sql`과 `20260915093000_switch_venue_geocoding_to_kakao.sql`이 모두 필요합니다.
2. Supabase Edge Function `metadata-worker`를 배포합니다.
3. 카카오디벨로퍼스에서 앱을 만들고 **카카오맵 API를 ON**으로 설정합니다. 무료 쿼터가 적용되는 앱인지 먼저 확인하고, 비즈월렛 연결이나 유료 API 사용 설정은 하지 않습니다. 카카오 무료 쿼터는 앱 관리 화면에서 주기적으로 확인합니다.
4. Edge Function Secrets에 아래 값을 설정합니다. 이 값은 절대 Git이나 Cloudflare Pages 환경변수에 넣지 않습니다.

   - `METADATA_WORKER_TOKEN`: 무작위 긴 작업 전용 토큰
   - `KAKAO_REST_API_KEY`: 카카오 Local REST API용 REST API 키
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase가 함수에 기본 제공하는 서버 전용 값이며, 별도 입력하지 않습니다.

5. 좌표가 있는 공연장의 실제 지도 미리보기를 원하면 카카오 JavaScript 키에 운영 도메인을 등록하고 Cloudflare Pages에 `VITE_KAKAO_MAP_JAVASCRIPT_KEY`를 설정합니다. 이 키는 도메인 제한이 전제인 지도 SDK용 공개 키이며 REST API 키와 다릅니다.
6. `supabase functions deploy metadata-worker`로 함수를 배포합니다. 이 워커는 Supabase JWT 대신 `METADATA_WORKER_TOKEN`으로 보호됩니다. 외부 스케줄러 또는 Supabase Cron에서 다음처럼 실행합니다. 한 번에 최대 25건이며 기본값은 10건입니다. 사용자 브라우저나 공개 페이지에서 호출하지 않습니다.

   ```sh
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/metadata-worker?limit=25" \
     -H "x-metadata-worker-token: $METADATA_WORKER_TOKEN"
   ```

7. `metadata_jobs`에서 `failed` 작업의 `last_error`를 확인합니다. 주소를 수정하면 트리거가 새 `pending` 작업을 만들므로 수동으로 반복 호출하지 않아도 됩니다. 쿼터 오류는 당일 자동 반복하지 말고 카카오 개발자 콘솔의 사용량을 확인한 뒤 다음 실행 시 다시 시도합니다.

현재 Edge Function은 검증 가능한 공연장 지오코딩만 구현합니다. `metadata` 작업은 Spotify 등 공급자 선정과 사용 조건 확정 후 별도 서버 전용 수집기로 처리합니다. 이 경계 덕분에 API 키나 공급자 토큰이 번들에 섞이지 않습니다.
