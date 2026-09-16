import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

function LegalLayout({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="section page-section legal-page">
    <Link className="back-link" to="/">← 홈</Link>
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p className="legal-updated">시행일: 2026년 9월 16일 · 서비스가 정식 출시되기 전 공개 초안입니다.</p>
    <div className="legal-content">{children}</div>
  </section>;
}

export function PrivacyPage() {
  return <LegalLayout eyebrow="Privacy policy" title="개인정보처리방침">
    <p>선곡표(이하 “서비스”)는 공연의 선곡표를 기록하고 검색하는 아카이브입니다. 이 방침은 서비스가 어떤 정보를 수집하고 왜 사용하는지 설명합니다.</p>
    <h2>1. 수집하는 정보</h2>
    <ul>
      <li>로그인 시 인증 제공자가 전달하는 이메일 또는 계정 식별자</li>
      <li>이용자가 직접 입력하는 닉네임, 공연 기록, 곡 목록, 댓글</li>
      <li>이용자가 저장하는 관람 기록과 북마크</li>
      <li>서비스 운영에 필요한 접속·오류 정보와 선택적으로 활성화되는 분석 정보</li>
    </ul>
    <h2>2. 이용 목적</h2>
    <p>계정 인증, 이용자별 기록·댓글·북마크 제공, 공개 아카이브 운영, 오류 대응과 서비스 개선을 위해 사용합니다. 관람 기록과 북마크는 계정별로 분리해 보관하며 공개하지 않습니다. 댓글과 공연 기록은 서비스 화면에 공개될 수 있습니다.</p>
    <h2>3. 보관과 삭제</h2>
    <p>서비스 운영에 필요한 기간 동안 보관하며, 이용자가 삭제할 수 있는 기록은 삭제 요청에 따라 처리합니다. 계정 삭제나 개인정보 열람·정정·삭제 요청은 <Link to="/contact">문의 경로</Link>를 이용해 주세요.</p>
    <h2>4. 외부 서비스</h2>
    <p>인증·데이터베이스는 Supabase, Google 로그인은 Google, 지도 미리보기는 Kakao, 곡 검색 링크는 YouTube 등 외부 서비스와 연동될 수 있습니다. 외부 링크를 열면 해당 서비스의 정책이 적용됩니다. 분석은 환경변수로 명시적으로 활성화한 경우에만 Google Analytics 4가 로드됩니다.</p>
    <h2>5. 변경</h2>
    <p>서비스 변경이나 법령 변경에 따라 이 방침을 수정할 수 있으며, 변경 시 이 페이지의 시행일을 갱신합니다.</p>
  </LegalLayout>;
}

export function TermsPage() {
  return <LegalLayout eyebrow="Terms of service" title="이용약관">
    <p>이 약관은 선곡표가 제공하는 공연 기록·검색 서비스의 이용 조건을 정합니다.</p>
    <h2>1. 서비스 이용</h2>
    <p>누구나 공개 공연 기록을 열람할 수 있으며, 기록 등록·수정·댓글·북마크 등 일부 기능은 로그인 후 이용할 수 있습니다. 서비스는 사전 고지 후 기능이나 운영 방식을 변경할 수 있습니다.</p>
    <h2>2. 이용자 콘텐츠</h2>
    <p>이용자는 자신이 입력한 공연 정보와 댓글에 대해 필요한 권리를 보유해야 하며, 사실과 다른 정보·타인의 권리를 침해하는 자료·불법적인 자료를 등록하면 안 됩니다. 공개 기록은 다른 이용자가 검색하고 열람할 수 있습니다.</p>
    <h2>3. 수정과 신고</h2>
    <p>작성자는 자신의 선곡표를 수정·삭제할 수 있습니다. 잘못된 기록이나 권리 침해를 발견하면 <Link to="/contact">문의 경로</Link>로 URL과 사유를 알려 주세요.</p>
    <h2>4. 금지 행위</h2>
    <p>자동화된 과도한 요청, 계정 도용, 권한 우회, 서비스 장애 유발, 스팸·광고·괴롭힘·불법 콘텐츠 등록을 금지합니다. 필요한 경우 관련 콘텐츠를 숨기거나 삭제하고 계정 이용을 제한할 수 있습니다.</p>
    <h2>5. 책임의 범위</h2>
    <p>선곡표는 이용자 제공 정보의 정확성을 보증하지 않습니다. 외부 서비스, 네트워크, 저장 장애 등 서비스가 통제하기 어려운 사유로 인한 손해에 대해서는 관련 법령이 허용하는 범위에서 책임을 제한합니다.</p>
  </LegalLayout>;
}

export function ContactPage() {
  return <LegalLayout eyebrow="Contact" title="문의와 오류 제보">
    <p>공연 기록 수정 요청, 개인정보 관련 요청, 지도·로그인 오류는 아래 GitHub Issues에 남겨 주세요.</p>
    <p><a className="button button-primary" href="https://github.com/pacifist59/seongokpyo/issues" target="_blank" rel="noreferrer">GitHub Issues 열기 ↗</a></p>
    <div className="legal-callout"><strong>개인정보를 공개 이슈에 적지 마세요.</strong><p>이메일 주소, 로그인 정보, 전화번호 등 민감한 정보는 이슈 본문에 입력하지 말고, 먼저 제목에 “개인정보 요청”이라고 표시해 주세요. 정식 도메인 연결 후 전용 문의 이메일로 교체할 예정입니다.</p></div>
    <h2>문의에 포함하면 좋은 정보</h2>
    <ul><li>문제가 발생한 페이지 URL</li><li>재현 절차와 기대한 결과</li><li>사용한 기기와 브라우저</li><li>오류 화면의 개인정보를 가린 캡처</li></ul>
  </LegalLayout>;
}
