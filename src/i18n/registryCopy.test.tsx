import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  getToolAvailability,
  getToolPrivacyNotice,
  TOOL_RELEASE_REGISTRY,
  type ToolId,
} from '../config/featureRegistry';
import DataEgressNotice from '../components/privacy/DataEgressNotice';
import ToolAvailabilityGate from '../components/tools/ToolAvailabilityGate';
import Limitations from '../pages/Limitations';
import { useToolsStore } from '../store/toolsStore';
import { availabilityCopyAr, privacyNoticesAr } from './locales/registry.ar';
import { availabilityCopy, privacyNotice } from './registryCopy';

const TOOL_IDS = Object.keys(TOOL_RELEASE_REGISTRY) as ToolId[];
const figures = (text: string) => (text.match(/\d+(?:\.\d+)*/g) ?? []).sort();
// The Arabic forms of the blanket promises release copy must never make.
const ABSOLUTE_LOCAL_CLAIMS_AR = [/لا تغادر/, /لن تغادر/, /لا يغادر/, /لا تُرسل أي/, /بأمان تام/];

describe('registry sentences in Arabic', () => {
  afterEach(() => {
    useToolsStore.setState({ locale: 'en' });
  });

  it('translates every sentence of every tool', () => {
    for (const toolId of TOOL_IDS) {
      const { support, limitation } = getToolAvailability(toolId);
      const ar = availabilityCopyAr[toolId];
      expect(ar.support, toolId).not.toBe(support);
      expect(ar.limitation, toolId).not.toBe(limitation);
      expect(ar.support, toolId).toMatch(/[؀-ۿ]/);
      expect(ar.limitation, toolId).toMatch(/[؀-ۿ]/);
    }
  });

  it('keeps the figures of the English release record', () => {
    for (const toolId of TOOL_IDS) {
      const { support, limitation } = getToolAvailability(toolId);
      const ar = availabilityCopyAr[toolId];
      expect(figures(ar.support), toolId).toEqual(figures(support));
      expect(figures(ar.limitation), toolId).toEqual(figures(limitation));
    }
  });

  it('makes no blanket local-only promise', () => {
    const sentences = [
      ...Object.values(availabilityCopyAr).flatMap((copy) => [copy.support, copy.limitation]),
      ...Object.values(privacyNoticesAr),
    ];
    for (const sentence of sentences) {
      for (const claim of ABSOLUTE_LOCAL_CLAIMS_AR) expect(sentence).not.toMatch(claim);
    }
  });

  it('still names the network destination of the disabled AI tools', () => {
    expect(privacyNoticesAr['optional-network']).toContain('Google Gemini');
    expect(privacyNoticesAr['optional-network']).toContain('موافقة صريحة');
  });

  it('serves the registry English unchanged in the English locale', () => {
    for (const toolId of TOOL_IDS) {
      const { support, limitation } = getToolAvailability(toolId);
      expect(availabilityCopy('en', toolId)).toMatchObject({ support, limitation });
      expect(privacyNotice('en', toolId)).toBe(getToolPrivacyNotice(toolId));
    }
  });

  it('renders the translated notice, gate and Limitations page', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(
      <MemoryRouter>
        <DataEgressNotice toolId="merge-pdf" />
        <ToolAvailabilityGate toolId="split-pdf" toolName="Split">
          <p>workflow</p>
        </ToolAvailabilityGate>
        <Limitations />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(privacyNoticesAr['local-only'], { exact: false })[0]).toBeInTheDocument();
    expect(screen.getByTestId('tool-limitation-alert')).toHaveTextContent(
      availabilityCopyAr['split-pdf'].limitation,
    );
    expect(screen.getByText(availabilityCopyAr['sign-pdf'].limitation, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(getToolAvailability('sign-pdf').limitation)).not.toBeInTheDocument();
  });
});
