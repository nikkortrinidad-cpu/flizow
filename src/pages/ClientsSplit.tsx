import { useLayoutEffect } from 'react';
import { useRoute } from '../router';
import { ClientsPage } from './ClientsPage';
import { ClientDetailPage } from './ClientDetailPage';

/**
 * Master-detail wrapper for the Clients area. The mockup ships both panes
 * inside a single `.clients-split-wrapper` element and keys the layout off
 * `body[data-active-view]` — present that attribute for the whole time we
 * stay on either the list or the detail route so the CSS can flip the
 * flex layout on/off cleanly.
 *
 * Keeping this component stateless-on-top of the router means the list
 * pane doesn't unmount when you click into a client — no scroll reset, no
 * wasted re-fetch of the list when you come back.
 */
export function ClientsSplit() {
  const route = useRoute();
  const activeView = route.name === 'client-detail' ? 'client-detail' : 'clients';

  useLayoutEffect(() => {
    // Use useLayoutEffect so the attribute lands before the browser
    // paints — otherwise the wrapper flashes `display: none` for one
    // frame because the CSS default hides .clients-split-wrapper until
    // body[data-active-view] names an active clients view.
    document.body.setAttribute('data-active-view', activeView);
    return () => {
      // Only clear if we still own the current value — guards against a
      // later route having already swapped it to something else.
      if (document.body.getAttribute('data-active-view') === activeView) {
        document.body.removeAttribute('data-active-view');
      }
    };
  }, [activeView]);

  return (
    <div className="clients-split-wrapper">
      <ClientsPage />
      <ClientDetailPage />
    </div>
  );
}
