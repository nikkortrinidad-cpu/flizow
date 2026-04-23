import { useRoute } from '../router';
import { OverviewPage } from '../pages/OverviewPage';
import { ClientsPage } from '../pages/ClientsPage';
import { ClientDetailPage } from '../pages/ClientDetailPage';
import { BoardPage } from '../pages/BoardPage';
import { OpsPage } from '../pages/OpsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { WipPage } from '../pages/WipPage';
import { TemplatesPage } from '../pages/TemplatesPage';

export function PageShell() {
  const route = useRoute();

  switch (route.name) {
    case 'overview':         return <OverviewPage />;
    case 'clients':          return <ClientsPage />;
    case 'client-detail':    return <ClientDetailPage />;
    case 'board':            return <BoardPage />;
    case 'ops':              return <OpsPage />;
    case 'analytics':        return <AnalyticsPage />;
    case 'wip':              return <WipPage />;
    case 'templates':        return <TemplatesPage />;
    case 'template-detail':  return <TemplatesPage />;
    default:                 return <OverviewPage />;
  }
}
