# 선곡표 공개 런칭 체크리스트

현재 운영 주소: `https://probable-memory-98c.pages.dev`

## 1. 런칭 전 콘텐츠·정책

- [ ] 실제 운영자 이름 또는 운영 주체를 개인정보처리방침에 추가
- [ ] 개인정보처리방침과 이용약관을 법률 검토 후 확정
- [ ] GitHub Issues 대신 전용 문의 이메일 또는 문의 폼으로 교체
- [ ] 공개 댓글·공연 기록의 신고/삭제 처리 기준 확정
- [ ] 샘플·중복·오류 공연 기록 정리
- [ ] 주요 아티스트·공연장·페스티벌·선곡표 최소 콘텐츠 확보

현재 구현된 경로:

- `/privacy` 개인정보처리방침
- `/terms` 이용약관
- `/contact` 문의·오류 제보

## 2. 도메인 구매와 Cloudflare 연결

1. 원하는 도메인을 등록기관에서 구매한다.
2. Cloudflare Pages 프로젝트 `seongokpyo`의 Custom domains에서 도메인을 추가한다.
3. 등록기관 DNS를 Cloudflare로 위임하거나 Cloudflare가 안내하는 CNAME을 추가한다.
4. HTTPS 인증서가 Active인지 확인한다.
5. Cloudflare Pages Production 환경변수를 갱신한다.

```text
VITE_SITE_URL=https://구매한도메인
VITE_ANALYTICS_ENABLED=true
VITE_GA_MEASUREMENT_ID=G-실제측정ID
```

6. 재배포 후 다음 주소가 새 도메인을 가리키는지 확인한다.

- `/robots.txt`
- `/sitemap.xml`
- `/privacy`
- 대표 선곡표 상세 URL
- `share-card.png`

## 3. pages.dev canonical·redirect 정책

도메인 연결 전에는 `https://probable-memory-98c.pages.dev`를 canonical로 유지한다. 도메인 연결 후에는 `VITE_SITE_URL`을 새 도메인으로 바꾸고 재배포한다.

정식 런칭 후 최종 정책은 다음과 같다.

- 새 도메인: 200 응답, canonical과 OG URL의 기준 주소
- `pages.dev`: Cloudflare Redirect Rule 또는 별도 Worker로 새 도메인에 host-level 301
- preview deployment: 검색 색인 금지, 외부 공유 금지
- `/setlist/:id/edit`: 로그인/작성자 확인을 위해 SPA rewrite하지만 canonical·sitemap에는 포함하지 않음
- `/login`, `/mypage`, `/setlists/new`, `/about/setup`: `noindex, follow`

Pages의 `_redirects` 파일만으로는 host별 `pages.dev → 새 도메인` 301을 완전히 처리할 수 없으므로 Cloudflare Redirect Rules에서 별도로 설정한다. 설정 후 `curl -I https://probable-memory-98c.pages.dev/`로 `Location`과 301을 확인한다.

## 4. Google Search Console

1. [Google Search Console](https://search.google.com/search-console)에 접속한다.
2. 새 도메인 연결 후 Domain property를 추가하고 DNS TXT로 소유권을 인증한다.
3. `https://구매한도메인/sitemap.xml`을 Sitemap 메뉴에 제출한다.
4. 대표 홈·선곡표·아티스트·공연장 URL을 URL 검사에서 확인한다.
5. canonical, 색인 가능 여부, 모바일 사용성 오류를 확인한다.

## 5. Naver Search Advisor

1. [Naver Search Advisor](https://searchadvisor.naver.com/)에서 새 도메인을 등록한다.
2. HTML 파일 또는 DNS로 사이트 소유권을 인증한다.
3. `https://구매한도메인/robots.txt`를 확인하고 사이트맵을 제출한다.
4. 대표 URL 수집 요청 후 색인·검색 노출 상태를 확인한다.

## 6. 분석 도구

GA4를 사용할 때만 Cloudflare Pages Production에 아래 환경변수를 설정한다.

```text
VITE_ANALYTICS_ENABLED=true
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

분석 스크립트는 기본적으로 비활성화되어 있고, 라우트별 page view만 전송한다. 도메인·정책이 확정되기 전에는 `false`로 둔다. GA4 DebugView에서 홈, 검색, 상세, 로그인 페이지 이동이 기록되는지 확인한다.

## 7. 공유 카드·favicon 검수

- [ ] `share-card.png`가 1200×630 PNG인지 확인
- [ ] 홈과 대표 상세 URL의 `og:title`, `og:description`, `og:image`, `og:url` 확인
- [ ] Twitter/X 카드가 큰 이미지 카드로 표시되는지 확인
- [ ] KakaoTalk·Slack·Discord 링크 미리보기 확인
- [ ] `/favicon.svg`가 라이트·다크 브라우저 탭에서 식별 가능한지 확인
- [ ] 공유 이미지에 개인정보·저작권 문제가 있는 이미지가 없는지 확인

검증 명령:

```powershell
pnpm verify:seo https://구매한도메인
```

## 8. 실제 모바일 기기 검수

- [ ] iPhone Safari 375px: 홈, 검색, 상세, 댓글, 로그인
- [ ] Android Chrome 360px 또는 412px: 동일 흐름
- [ ] 모바일 메뉴 열기·닫기와 뒤로가기
- [ ] 공연장 지도 좌표 표시 및 Kakao fallback 링크
- [ ] 공유 버튼과 링크 복사
- [ ] 폼 키보드 입력, 곡 autocomplete 선택, 등록·수정
- [ ] 다크 모드와 시스템 모드
- [ ] 320px 폭에서 가로 스크롤 없음
- [ ] 화면 확대 200%에서 핵심 버튼 접근 가능

## 9. 최종 런칭 판정

- [ ] Supabase Security Advisor 오류 0
- [ ] RLS 롤백 감사 통과
- [ ] migration history와 저장소 파일 일치
- [ ] metadata-worker 인증·Kakao REST secret 확인
- [ ] GA4/Search Console/Naver 속성 확인
- [ ] 도메인 HTTPS·canonical·301 확인
- [ ] 모바일 실제 기기 검수 완료
- [ ] 문의 경로에서 테스트 문의를 받고 응답 가능
- [ ] 배포 커밋과 복구 방법 기록
