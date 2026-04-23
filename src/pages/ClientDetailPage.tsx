import { StubPage } from './StubPage';
import { useRoute } from '../router';

export function ClientDetailPage() {
  const route = useRoute();
  return (
    <StubPage
      viewClass="view-client-detail"
      title={`Client · ${route.params.id ?? ''}`}
      summary="Six-tab workspace: Overview · Onboarding · About · Stats · Touchpoints · Notes. Port lands after the Clients directory."
    />
  );
}
