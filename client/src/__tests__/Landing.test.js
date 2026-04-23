import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../pages/Landing';

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing page', () => {
  beforeEach(() => localStorage.clear());

  test('renders AYASA brand name', () => {
    renderLanding();
    // Multiple elements may contain "AYASA" — confirm at least one exists
    expect(screen.getAllByText(/ayasa/i).length).toBeGreaterThan(0);
  });

  test('renders CTA link when not logged in', () => {
    renderLanding();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href') || '');
    expect(hrefs.some((h) => h.includes('register') || h.includes('login'))).toBe(true);
  });

  test('renders navigation links', () => {
    renderLanding();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });
});
