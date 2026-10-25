/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Editor from './pages/Editor';
import { EditorProvider } from './contexts/EditorContext';
import { useToolsStore } from './store/toolsStore';
import { directionFor } from './i18n';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import OnboardingTour from './components/onboarding/OnboardingTour';
import ToolAvailabilityGate from './components/tools/ToolAvailabilityGate';
import {
  TOOL_ALIAS_REDIRECTS,
  TOOL_ROUTES,
  toolAliasPath,
  toolAliasTarget,
  type ToolRouteDefinition,
} from './config/toolRoutes';

const Limitations = lazy(() => import('./pages/Limitations'));

/**
 * Wraps one generated tool route in the shared error boundary and availability
 * gate. `name` and `toolId` come from the route definition (catalog + registry),
 * so this component has no per-tool knowledge.
 */
export function ToolRoute({ route }: { route: ToolRouteDefinition }) {
  const { Component, name, toolId } = route;
  return (
    <ToolErrorBoundary toolName={name}>
      <ToolAvailabilityGate toolId={toolId} toolName={name}>
        <Component />
      </ToolAvailabilityGate>
    </ToolErrorBoundary>
  );
}

/**
 * All application routes. Tool routes are generated from the catalog and registry
 * (`src/config/toolRoutes.ts`) instead of being listed by hand here (backlog #15).
 * Exported so tests can render the real route table with a router of their choosing.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="editor" element={<Editor />} />
          <Route path="limitations" element={<Limitations />} />
          {TOOL_ROUTES.map((route) => (
            <Route key={route.toolId} path={route.path} element={<ToolRoute route={route} />} />
          ))}
          {TOOL_ALIAS_REDIRECTS.map((alias) => (
            <Route
              key={alias.from}
              path={toolAliasPath(alias)}
              element={<Navigate to={toolAliasTarget(alias)} replace />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/**
 * Mirrors the active locale onto <html> so `dir="rtl"` and `lang="ar"` reach
 * the browser, assistive technology and CSS in one place.
 */
function DocumentLanguage() {
  const locale = useToolsStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = directionFor(locale);
  }, [locale]);

  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <DocumentLanguage />
      <EditorProvider>
        <ToastContainer />
        <OnboardingTour />
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </EditorProvider>
    </ToastProvider>
  );
}
