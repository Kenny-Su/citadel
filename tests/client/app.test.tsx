import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../test-utils/render-app';
import { App } from '../../src/client/App';

describe('App shell', () => {
  it('renders the join form and presence panel', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Citadel Chat' })).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a display name')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Online users' })).toBeInTheDocument();
  });
});
