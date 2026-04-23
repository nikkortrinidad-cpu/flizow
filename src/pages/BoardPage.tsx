import { StubPage } from './StubPage';
import { useRoute } from '../router';

export function BoardPage() {
  const route = useRoute();
  return (
    <StubPage
      viewClass="view-board"
      title={`Service board · ${route.params.id ?? ''}`}
      summary="Kanban board for a service: columns, swimlanes, drag-and-drop, WIP limits. Ported when we wire up the real data layer."
    />
  );
}
