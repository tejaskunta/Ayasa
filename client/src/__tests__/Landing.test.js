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
    expect(screen.getByText(/ayasa/i)).toBeInTheDocument();
  });

  test('renders CTA link when not logged in', () => {
    renderLanding();
    // Should have at least one link pointing to register or login
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
