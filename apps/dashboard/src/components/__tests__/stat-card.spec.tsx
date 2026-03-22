import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../stat-card';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowUp: ({ className }: { className: string }) =>
    React.createElement('svg', { 'data-testid': 'arrow-up', className }),
  ArrowDown: ({ className }: { className: string }) =>
    React.createElement('svg', { 'data-testid': 'arrow-down', className }),
}));

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Requests" value={1234} />);
    expect(screen.getByText('Total Requests')).toBeDefined();
    expect(screen.getByText('1234')).toBeDefined();
  });

  it('renders string value', () => {
    render(<StatCard title="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('shows positive change with ArrowUp', () => {
    render(<StatCard title="Requests" value={100} change={12} changeLabel="vs last week" />);
    expect(screen.getByTestId('arrow-up')).toBeDefined();
    expect(screen.getByText('12%')).toBeDefined();
    expect(screen.getByText('vs last week')).toBeDefined();
  });

  it('shows negative change with ArrowDown', () => {
    render(<StatCard title="Blocks" value={50} change={-8} />);
    expect(screen.getByTestId('arrow-down')).toBeDefined();
    expect(screen.getByText('8%')).toBeDefined();
  });

  it('does not render change indicator when change is undefined', () => {
    render(<StatCard title="Score" value={42} />);
    expect(screen.queryByTestId('arrow-up')).toBeNull();
    expect(screen.queryByTestId('arrow-down')).toBeNull();
  });

  it('treats zero change as positive', () => {
    render(<StatCard title="Score" value={42} change={0} />);
    expect(screen.getByTestId('arrow-up')).toBeDefined();
    expect(screen.getByText('0%')).toBeDefined();
  });
});
