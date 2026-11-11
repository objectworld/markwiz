import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiagramDialog } from './DiagramDialog';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" style="max-width: 200px"><text>Hi</text></svg>';

function setup() {
  const onClose = vi.fn();
  render(<DiagramDialog svg={SVG} title="Mermaid 다이어그램" onClose={onClose} />);
  const dialog = screen.getByRole('dialog', { name: 'Mermaid 다이어그램' });
  const body = dialog.querySelector('[tabindex="-1"]') as HTMLElement;
  const diagramSvg = () => body.querySelector('svg') as SVGElement;
  return { onClose, dialog, body, diagramSvg };
}

describe('DiagramDialog', () => {
  it('shows the diagram at 100% (jsdom has no layout, so it cannot fit to the window)', () => {
    const { diagramSvg } = setup();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(diagramSvg().style.width).toBe('200px');
    expect(diagramSvg().style.height).toBe('100px');
    // 다이어그램 자체의 max-width 같은 스타일에 눌리지 않아야 한다.
    expect(diagramSvg().style.maxWidth).toBe('none');
  });

  it('zooms with the buttons independently of the document', () => {
    const { diagramSvg } = setup();
    fireEvent.click(screen.getByRole('button', { name: '확대' }));
    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(diagramSvg().style.width).toBe('250px');

    fireEvent.click(screen.getByRole('button', { name: '축소' }));
    fireEvent.click(screen.getByRole('button', { name: '축소' }));
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(diagramSvg().style.width).toBe('160px');

    fireEvent.click(screen.getByText('80%'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('zooms with Ctrl+wheel but lets the plain wheel scroll', () => {
    const { body } = setup();

    const plain = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    body.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(screen.getByText('100%')).toBeInTheDocument();

    const ctrl = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
    act(() => {
      body.dispatchEvent(ctrl);
    });
    expect(ctrl.defaultPrevented).toBe(true);
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('is limited to 10%..800%', () => {
    setup();
    for (let i = 0; i < 40; i += 1) fireEvent.click(screen.getByRole('button', { name: '확대' }));
    expect(screen.getByText('800%')).toBeInTheDocument();
    for (let i = 0; i < 60; i += 1) fireEvent.click(screen.getByRole('button', { name: '축소' }));
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('closes with Escape, the close button, and a click on the backdrop', () => {
    const { onClose, dialog } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.mouseDown(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when the dialog itself is clicked', () => {
    const { onClose, dialog } = setup();
    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
