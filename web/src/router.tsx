import { createRootRoute, createRoute, createRouter, Outlet, useNavigate } from '@tanstack/react-router';
import { ApiError } from './api/ApiError';
import { BoardPage } from './board/BoardPage';
import { FeaturePanel } from './board/FeaturePanel';
import { GatePage } from './gate/GatePage';
import { SettingsPage } from './settings/SettingsPage';
import { PageShell } from './shell/PageShell';
import { StatePanel } from './shell/StatePanel';
import { WorkloadPage } from './workload/WorkloadPage';

const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <PageShell>
      <StatePanel error={new ApiError(404, 'not_found', 'There is no page at this address.')} />
    </PageShell>
  ),
});

// One layout for "/" and "/f/$id", so opening and closing a panel keeps the board and its filters.
const board = createRoute({ getParentRoute: () => root, id: 'board', component: BoardPage });

const stages = createRoute({ getParentRoute: () => board, path: '/', component: () => null });

const feature = createRoute({
  getParentRoute: () => board,
  path: '/f/$id',
  component: function FeatureRoute() {
    const { id } = feature.useParams();
    const navigate = useNavigate();
    return <FeaturePanel featureKey={id} onClose={() => navigate({ to: '/' })} />;
  },
});

const workload = createRoute({ getParentRoute: () => root, path: '/workload', component: WorkloadPage });

const settings = createRoute({ getParentRoute: () => root, path: '/settings', component: SettingsPage });

const gate = createRoute({
  getParentRoute: () => root,
  path: '/gate/$project/$gate',
  component: function GateRoute() {
    const { project, gate: id } = gate.useParams();
    return <GatePage project={project} gate={id} />;
  },
});

export const routeTree = root.addChildren([board.addChildren([stages, feature]), workload, settings, gate]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
