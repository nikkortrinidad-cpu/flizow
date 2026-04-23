import { useRoute } from '../router';
import { OverviewPage } from '../pages/OverviewPage';
import { ClientsSplit } from '../pages/ClientsSplit';
import { BoardPage } from '../pages/BoardPage';
import { OpsPage } from '../pages/OpsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { WipPage } from '../pages/WipPage';
import { TemplatesPage } from '../pages/TemplatesPage';

export function PageShell() {
  const route = useRoute();

  switch (route.name) {
    case 'overview':         return <OverviewPage />;
    // Clients list and client detail share one layout (`.clients-split-wrapper`).
    // Keeping them under a single component means the list pane never
    // unmounts when the user clicks into a detail row — scroll state,
    // filters, and search all stay put.
    case 'clients':          return <ClientsSplit />;
    case 'client-detail':    return <ClientsSplit />;
    case 'board':            return <BoardPage />;
    case 'ops':              return <OpsPage />;
    case 'analytics':        return <AnalyticsPage />;
    case 'wip':              return <WipPage />;
    case 'templates':        return <TemplatesPage />;
    case 'template-detail':  return <TemplatesPage />;
    default:                 return <OverviewPage />;
  }
}
