import { memo } from 'react';
import type { Page } from '../model';

export const PageThumbnail = memo(function PageThumbnail({ page, index, active, onClick }: { page: Page; index: number; active: boolean; onClick: () => void }) {
  return <button className={`page-item ${active ? 'is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
    <span className="page-preview" aria-hidden="true">
      {page.background ? <img src={page.background} alt="" /> : <svg viewBox={`0 0 794 ${page.height}`}>
        <defs><pattern id={`dots-${page.id}`} width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="3" fill="#d3d8ce" /></pattern></defs>
        <rect width="794" height={page.height} fill={`url(#dots-${page.id})`} />
        {page.template ? <><text x="70" y="175" fontSize="45" fontFamily="Lora" fill="#35483c">The chain rule</text><text x="70" y="290" fontSize="50" fontFamily="Caveat" fill="#35483c">f(x) = sin(x² + 1)</text><text x="70" y="450" fontSize="50" fontFamily="Caveat" fill="#35483c">f′(x) = cos(x² + 1)</text></> : null}
        {page.strokes.filter(s => s.tool === 'pen').map(s => <polyline key={s.id} points={s.points.reduce((text, n, i) => `${text}${i % 2 ? ',' : ' '}${n}`, '')} fill="none" stroke={s.color} strokeWidth={s.width + 1} strokeLinecap="round" />)}
      </svg>}
      <span className="page-index">{String(index + 1).padStart(2, '0')}</span>
    </span>
    <span className="page-title">{page.title}</span>
    <span className="page-detail">{page.template ? 'Guided example' : page.background ? 'Imported document' : 'Blank page'}</span>
  </button>;
});
