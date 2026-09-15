# 콘텐츠 메타데이터와 공연장 좌표 보정

브라우저는 공개 조회와 사용자 입력만 담당합니다. Spotify, 음반 정보 제공자, 네이버 지오코딩의 비밀 키는 `VITE_` 환경변수나 Cloudflare Pages에 넣지 않습니다.

## 수집 구조

`artists`, `albums`, `songs`는 각각 메타데이터 수집 상태와 출처·갱신 시각을 갖습니다. 새 행은 `metadata_jobs`에 `metadata` 작업을 생성합니다. 공급자별 수집기는 이 대기열을 읽어 이미지, 소개, 발매일, 외부 ID만 갱신합니다. 제목·아티스트명처럼 사용자가 입력한 원본 값은 수집기로 덮어쓰지 않습니다.

`venues`는 주소가 만들어지거나 바뀌면 `geocode` 작업을 생성합니다. 주소가 없는 공연장은 `not_available` 상태로 남아 지도 대신 외부 지도 검색 링크를 보여 줍니다.

## 좌표 일괄 보정

1. Supabase SQL Editor 또는 CLI로 `20260915090000_metadata_enrichment_queue.sql`을 적용합니다.
2. Supabase Edge Function `metadata-worker`를 배포합니다.
3. Edge Function Secrets에 아래 값을 설정합니다. 이 값은 절대 Git이나 Cloudflare Pages 환경변수에 넣지 않습니다.

   - `METADATA_WORKER_TOKEN`: 무작위 긴 작업 전용 토큰
   - `NAVER_GEOCODING_CLIENT_ID`, `NAVER_GEOCODING_CLIENT_SECRET`: 네이버 Cloud 지오코딩 API 자격 증명
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Edge Function의 서버 전용 값

4. `supabase functions deploy metadata-worker`로 함수를 배포합니다. 외부 스케줄러 또는 Supabase Cron에서 다음처럼 실행합니다. 사용자 브라우저나 공개 페이지에서 호출하지 않습니다.

   ```sh
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/metadata-worker?limit=25" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "x-metadata-worker-token: $METADATA_WORKER_TOKEN"
   ```

5. `metadata_jobs`에서 `failed` 작업의 `last_error`를 확인한 뒤 주소를 고치고, 해당 행의 상태를 `pending`으로 되돌려 재시도합니다.

현재 Edge Function은 검증 가능한 공연장 지오코딩만 구현합니다. `metadata` 작업은 Spotify 등 공급자 선정과 사용 조건 확정 후 별도 서버 전용 수집기로 처리합니다. 이 경계 덕분에 API 키나 공급자 토큰이 번들에 섞이지 않습니다.
