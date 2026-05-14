// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WorkspaceErrorBoundary } from '../components/workspace/WorkspaceErrorBoundary';

function MaybeThrow({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }

  return <div>Loaded child</div>;
}

describe('WorkspaceErrorBoundary', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  it('renders a recovery workspace when a child throws', () => {
    render(
      <WorkspaceErrorBoundary title="Viewer" detail="The viewer route failed." resetKey="a">
        <MaybeThrow shouldThrow />
      </WorkspaceErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Viewer unavailable' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeDefined();
  });

  it('recovers when the reset key changes and the child stops throwing', () => {
    const { rerender } = render(
      <WorkspaceErrorBoundary title="Viewer" detail="The viewer route failed." resetKey="a">
        <MaybeThrow shouldThrow />
      </WorkspaceErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Viewer unavailable' })).toBeDefined();

    rerender(
      <WorkspaceErrorBoundary title="Viewer" detail="The viewer route failed." resetKey="b">
        <MaybeThrow shouldThrow={false} />
      </WorkspaceErrorBoundary>,
    );

    expect(screen.getByText('Loaded child')).toBeDefined();
  });
});
