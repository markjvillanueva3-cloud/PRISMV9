// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { RouteStageFallback, getRouteLoadingMeta } from '../components/workspace/RouteStageFallback';

describe('RouteStageFallback', () => {
  it('resolves explicit workspace labels for key routes', () => {
    expect(getRouteLoadingMeta('/ppg').title).toBe('Post Processor Generator');
    expect(getRouteLoadingMeta('/viewer').title).toBe('3D Viewer');
    expect(getRouteLoadingMeta('/parts-library').title).toBe('Parts Library');
    expect(getRouteLoadingMeta('/customer-portal').title).toBe('Customer Portal');
  });

  it('uses academy-specific messaging for lesson routes', () => {
    expect(getRouteLoadingMeta('/learning/academy/course-1/lesson-2').title).toBe('Academy Lesson');
  });

  it('renders a polished loading stage for the current route', () => {
    render(
      <MemoryRouter initialEntries={['/ppg']}>
        <RouteStageFallback />
      </MemoryRouter>,
    );

    expect(screen.getByText('Streaming workspace')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Loading Post Processor Generator' })).toBeDefined();
  });
});
