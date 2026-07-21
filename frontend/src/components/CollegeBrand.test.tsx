// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CollegeCrest, getCollegeBrand, getCollegeSurfaceStyle } from './CollegeBrand';

describe('college branding', () => {
  it('returns the seeded brand for a known college', () => {
    const brand = getCollegeBrand('Rivergate University');

    expect(brand.shortName).toBe('Rivergate');
    expect(brand.nickname).toBe('Tideguard');
  });

  it('falls back to the Apex brand for unknown colleges', () => {
    const brand = getCollegeBrand('Unknown Academy');

    expect(brand.shortName).toBe('Apex');
    expect(brand.nickname).toBe('Vanguard');
  });

  it('renders a crest label when requested and exposes themed surface styles', () => {
    const style = getCollegeSurfaceStyle('Summit School of Computing');
    render(<CollegeCrest collegeName="Summit School of Computing" withLabel size={64} />);

    expect(screen.getByText('Ascendants')).toBeInTheDocument();
    expect(screen.getByText('Summit')).toBeInTheDocument();
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(style.boxShadow).toContain('rgba');
  });
});
