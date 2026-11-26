import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { ApiError } from './api/ApiError';
import { GatePage } from './gate/GatePage';
import { SettingsPage } from './settings/SettingsPage';
import { PageShell } from './shell/PageShell';
import { StatePanel } from './shell/StatePanel';

const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <PageShell>
      <StatePanel error={new ApiError(404, 'not_found', 'There is no page at this address.')} />
    </PageShell>
  ),
});

const settings = createRoute({ getParentRoute: () => root, path: '/settings', component: SettingsPage });

const gate = createRoute({
  getParentRoute: () => root,
  path: '/gate/$project/$gate',
  component: function GateRoute() {
    const { project, gate: id } = gate.useParams();
    return <GatePage project={project} gate={id} />;
  },
});

export const router = createRouter({ routeTree: root.addChildren([settings, gate]) });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
