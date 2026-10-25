import { Suspense, lazy } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AppRoutes, ToolRoute } from './App';
import { TOOL_CATEGORIES } from './constants/tools';
import { TOOL_RELEASE_REGISTRY, getToolAvailability, type ToolId } from './config/featureRegistry';
import {
  TOOL_ALIAS_REDIRECTS,
  TOOL_COMPONENTS,
  TOOL_ROUTES,
  toolAliasPath,
  toolAliasTarget,
  toolRoutePath,
  type ToolRouteDefinition,
} from './config/toolRoutes';
import { renderWithProviders } from './tests/utils';

const catalogTools = TOOL_CATEGORIES.flatMap((category) => category.tools);
const catalogIds = catalogTools.map((tool) => tool.id);
const registryIds = Object.keys(TOOL_RELEASE_REGISTRY) as ToolId[];

/** Renders the real route table at `path` through the shared test providers. */
function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return renderWithProviders(<AppRoutes />);
}

describe('generated tool route table', () => {
  it('lists the same tools as the catalog and the release registry', () => {
    expect(
      new Set(catalogIds).size,
      'the catalog lists a tool twice',
    ).toBe(catalogIds.length);
    expect(
      [...catalogIds].sort(),
      'catalog and registry must list the same tool ids',
    ).toEqual([...registryIds].sort());
  });

  it('has a lazy component for every registry tool and no extra entries', () => {
    expect(Object.keys(TOOL_COMPONENTS).sort()).toEqual([...registryIds].sort());
    for (const toolId of registryIds) {
      expect(TOOL_COMPONENTS[toolId], `${toolId} has no lazy component`).toBeTruthy();
    }
  });

  it('generates exactly one route per catalog tool, in catalog order', () => {
    expect(TOOL_ROUTES.map((route) => route.toolId)).toEqual(catalogIds);
    expect(
      new Set(TOOL_ROUTES.map((route) => route.path)).size,
      'two tools generated the same route path',
    ).toBe(TOOL_ROUTES.length);
  });

  it('takes the path, name and component from the catalog', () => {
    for (const tool of catalogTools) {
      const route = TOOL_ROUTES.find((candidate) => candidate.toolId === tool.id);
      if (!route) throw new Error(`no route generated for ${tool.id}`);
      expect(route.path).toBe(`tools/${tool.id}`);
      expect(route.path).toBe(toolRoutePath(tool.id));
      expect(route.name).toBe(tool.name);
      expect(route.Component).toBe(TOOL_COMPONENTS[tool.id]);
    }
  });

  it('keeps the legacy redirects data-driven and pointing at real tool routes', () => {
    expect(TOOL_ALIAS_REDIRECTS.map((alias) => `${alias.from} -> ${alias.to}`)).toEqual([
      'redact-pdf -> blackout-pdf',
      'unlock-pdf -> decrypt-pdf',
    ]);

    const routePaths = TOOL_ROUTES.map((route) => route.path);
    for (const alias of TOOL_ALIAS_REDIRECTS) {
      expect(
        routePaths,
        `${alias.from} must not shadow a generated tool route`,
      ).not.toContain(toolAliasPath(alias));
      expect(registryIds, `${alias.to} is not a registered tool`).toContain(alias.to);
      expect(routePaths, `${alias.to} has no generated route`).toContain(
        toolRoutePath(alias.to),
      );
      expect(toolAliasTarget(alias)).toBe(`/tools/${alias.to}`);
    }
  });
});

describe('generated tool routes', () => {
  it('resolves a generated /tools/<id> URL through the availability gate', async () => {
    renderAt('/tools/compress-pdf');

    expect(
      await screen.findByRole('heading', { level: 1, name: /this tool is unavailable/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tool-limitation')).toHaveTextContent(
      getToolAvailability('compress-pdf').limitation,
    );
  });

  it('redirects a legacy alias URL to its current tool route', async () => {
    renderAt('/tools/redact-pdf');

    await waitFor(() => expect(window.location.pathname).toBe('/tools/blackout-pdf'));
    expect(
      await screen.findByRole('heading', { level: 1, name: /this tool is unavailable/i }),
    ).toBeInTheDocument();
  });

  it('still sends unknown URLs to NotFound', async () => {
    renderAt('/tools/not-a-real-tool');

    expect(
      await screen.findByRole('heading', { name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it('wraps a tool element in the tool error boundary', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = lazy(() =>
      Promise.resolve({
        default: () => {
          throw new Error('boom');
        },
      }),
    );
    const route: ToolRouteDefinition = {
      toolId: 'merge-pdf',
      name: 'Merge PDF',
      path: toolRoutePath('merge-pdf'),
      Component: Boom,
    };

    renderWithProviders(
      <Suspense fallback={null}>
        <ToolRoute route={route} />
      </Suspense>,
    );

    expect(await screen.findByText(/Merge PDF encountered an error/i)).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
