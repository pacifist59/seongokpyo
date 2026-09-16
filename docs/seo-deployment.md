# 공개 페이지 SEO와 배포

`pnpm build`는 Vite 클라이언트를 빌드한 뒤 기존 React 화면을 서버에서 렌더링합니다. 별도의 공개 UI를 복제하지 않습니다. `dist`에는 홈/목록/통계와 Supabase 공개 뷰에서 조회되는 아티스트·공연장·페스티벌·선곡표별 HTML, robots.txt, sitemap.xml이 생성됩니다.

## 환경변수와 배포

- 기존 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 사용합니다. 공개 조회 권한만 사용하며 세션/개인 기록은 사전 렌더링하지 않습니다.
- `VITE_SITE_URL` 기본값은 현재 운영 주소 `https://probable-memory-98c.pages.dev`입니다. 도메인 이전 시 이 값을 변경하고 재배포합니다. 미리보기 주소도 canonical은 운영 주소를 가리킵니다.
- 분석은 `VITE_ANALYTICS_ENABLED=true`와 `VITE_GA_MEASUREMENT_ID=G-...`를 함께 설정한 경우에만 로드됩니다. 활성화 전 개인정보처리방침과 Search Console 속성을 먼저 확인합니다.
- Cloudflare Pages 빌드 명령: `pnpm build`, 출력 디렉터리: `dist`.
- 공개 데이터 조회 실패 시 빌드를 실패시켜 불완전한 사이트맵으로 기존 배포가 교체되지 않게 합니다.
- `_redirects`는 실제 HTML/robots/sitemap 파일을 우선 제공하고, `/setlist/:id/edit`만 `/index.html`로 rewrite해 주소와 `id`를 유지합니다. 편집 화면은 React가 로그인과 작성자 권한을 확인합니다.
- 로그인·마이페이지·등록·설정은 초기 HTML에서 noindex이며 sitemap에서 제외합니다. 검색봇이 noindex를 읽을 수 있도록 robots.txt로 차단하지 않습니다.

## 데이터 갱신 범위

HTML·사이트맵·SNS 미리보기는 **빌드 시점의 공개 데이터**입니다. 브라우저는 로드 후 기존 API로 다시 조회합니다. 새 기록을 만들거나 수정/삭제한 뒤에는 재배포해야 초기 HTML과 사이트맵에도 반영됩니다. 새 기록은 재배포 전에도 브라우저에서 조회할 수 있지만 최초 공유 정보는 홈 기본값입니다. 실시간 기여가 늘어나면 빌드 훅 또는 요청 시 렌더링을 도입합니다. 비밀 배포 훅을 브라우저에 넣으면 안 됩니다.

공유 이미지는 1200×630 PNG입니다. 아티스트 이미지가 제공되면 해당 이미지, 그 외에는 브랜드 기본 카드를 사용합니다. 검색결과 노출이나 외부 서비스의 미리보기 캐시 갱신을 보장하지는 않습니다. 개인정보처리방침·이용약관·문의 페이지도 공개 정적 페이지로 생성됩니다.

## 검증

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:seo
pnpm verify:seo https://probable-memory-98c.pages.dev
curl -i https://probable-memory-98c.pages.dev/robots.txt
curl -i https://probable-memory-98c.pages.dev/sitemap.xml
```

검증 스크립트는 sitemap의 모든 공개 URL의 초기 HTML, canonical, OG/Twitter 중복 여부, 공개 본문, private noindex, PNG 크기를 확인합니다. URL을 전달하면 HTTP 상태와 Content-Type도 검사합니다. 로그인 계정 변경이나 DB 쓰기를 수행하지 않습니다.
