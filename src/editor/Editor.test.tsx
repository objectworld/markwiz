import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Editor } from './Editor';

describe('Editor', () => {
  it('renders the initial content', async () => {
    render(<Editor />);

    expect(await screen.findByRole('heading', { name: 'Markwiz' })).toBeInTheDocument();
    expect(screen.getByText('굵게')).toBeInTheDocument();
  });
});
