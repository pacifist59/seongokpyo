import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export function NotFoundPage() {
  return <section className="section page-section"><EmptyState title="페이지를 찾을 수 없어요" description="주소가 바뀌었거나 존재하지 않는 페이지입니다." action={<Link className="button button-primary" to="/">홈으로</Link>} /></section>;
}
