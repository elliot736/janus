import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../loading';

describe('LoadingState', () => {
  it('renders default loading message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeDefined();
  });

  it('renders spinner element', () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});
