import { StubPage } from './StubPage';
import { useRoute } from '../router';

export function TemplatesPage() {
  const route = useRoute();
  const detailId = route.params.id;
  return (
    <StubPage
      viewClass="view-templates"
      title={detailId ? `Template · ${detailId}` : 'Service templates'}
      summary="Split-view library of 5 service templates (Web Design, SEO, Content, Brand, Paid Media). Ships with current content; managers' SOPs drop in when they arrive."
    />
  );
}
