import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState, EmptyState } from '../error-state';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className: string }) =>
    React.createElement('svg', { 'data-testid': 'alert-icon', className }),
}));

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByTestId('alert-icon')).toBeDefined();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Failed" onRetry={onRetry} />);
    const button = screen.getByText('Try Again');
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Failed" />);
    expect(screen.queryByText('Try Again')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('renders default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data found.')).toBeDefined();
  });

  it('renders custom message', () => {
    render(<EmptyState message="No sites yet" />);
    expect(screen.getByText('No sites yet')).toBeDefined();
  });
});
