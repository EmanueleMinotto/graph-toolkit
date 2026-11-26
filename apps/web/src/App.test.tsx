// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App.js';

afterEach(cleanup);

const renderApp = () =>
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );

describe('App', () => {
  it('renders the default graph', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'graph-toolkit' })).toBeTruthy();
    expect(document.querySelectorAll('circle')).toHaveLength(6);
  });

  it('imports text and reports errors', () => {
    renderApp();
    const text = screen.getByLabelText('Graph text');

    fireEvent.change(text, { target: { value: '{"nope":1}' } });
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByRole('alert').textContent).toContain('Invalid');
    fireEvent.click(screen.getByText('Export current'));
    expect((text as HTMLTextAreaElement).value).toContain('"vertices"');
  });
});
