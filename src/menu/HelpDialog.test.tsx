import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import { HelpDialog, resolveReadmeLink, slugifyHeading } from './HelpDialog';

function Harness({ onEditor }: { onEditor: (editor: Editor) => void }) {
  const editor = useEditor({ extensions: editorExtensions, content: '<p>본문</p>', immediatelyRender: false });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  return <EditorContent editor={editor} />;
}

async function openHelp() {
  let editor!: Editor;
  render(<Harness onEditor={(instance) => (editor = instance)} />);
  await waitFor(() => expect(editor).toBeTruthy());
  render(<HelpDialog editor={editor} onClose={() => undefined} />);
  const dialog = await screen.findByRole('dialog', { name: '도움말' });
  await waitFor(() => expect(dialog.querySelector('h1')?.textContent).toBe('Markwiz'));
  return dialog;
}

const link = (dialog: HTMLElement, text: string) =>
  [...dialog.querySelectorAll('a')].find((candidate) => candidate.textContent === text)!;

afterEach(() => vi.restoreAllMocks());

describe('slugifyHeading', () => {
  it('follows the GitHub heading anchor rules', () => {
    expect(slugifyHeading('릴리즈 노트')).toBe('릴리즈-노트');
    expect(slugifyHeading('PDF / Word로 내보내기')).toBe('pdf--word로-내보내기');
    expect(slugifyHeading('Exporting to PDF / Word')).toBe('exporting-to-pdf--word');
  });
});

describe('resolveReadmeLink', () => {
  it('resolves the other README and in-page anchors, and ignores everything else', () => {
    expect(resolveReadmeLink('README.en.md')).toEqual({ kind: 'readme', language: 'en', anchor: undefined });
    expect(resolveReadmeLink('README.md')).toEqual({ kind: 'readme', language: 'ko', anchor: undefined });
    expect(resolveReadmeLink('README.en.md#release-notes')).toEqual({ kind: 'readme', language: 'en', anchor: 'release-notes' });
    expect(resolveReadmeLink('#%EB%A6%B4%EB%A6%AC%EC%A6%88-%EB%85%B8%ED%8A%B8')).toEqual({ kind: 'anchor', id: '릴리즈-노트' });
    expect(resolveReadmeLink('LICENSE')).toBeNull();
    expect(resolveReadmeLink('src/commands/keymap.json')).toBeNull();
  });
});

describe('HelpDialog links', () => {
  it('switches to the English README when the English link is clicked, and back with the Korean link', async () => {
    const dialog = await openHelp();
    expect(dialog).toHaveTextContent('README.md');
    expect(dialog).toHaveTextContent('Typora 스타일의 WYSIWYG');

    fireEvent.click(link(dialog, 'English'));
    await waitFor(() => expect(dialog).toHaveTextContent('A Typora-style WYSIWYG Markdown editor'));
    expect(dialog).toHaveTextContent('README.en.md');

    fireEvent.click(link(dialog, '한국어'));
    await waitFor(() => expect(dialog).toHaveTextContent('Typora 스타일의 WYSIWYG'));
    expect(dialog).toHaveTextContent('README.md');
  });

  it('prevents the webview from navigating on a repository-relative link', async () => {
    const dialog = await openHelp();
    const anchor = link(dialog, 'GNU Lesser General Public License v2.1');
    const notPrevented = fireEvent.click(anchor); // preventDefault되면 false
    expect(notPrevented).toBe(false);
  });

  it('scrolls to the heading an in-page anchor link points at', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const dialog = await openHelp();

    fireEvent.click(link(dialog, '릴리즈 노트'));

    expect(scrollIntoView).toHaveBeenCalled();
    const target = scrollIntoView.mock.contexts[0] as HTMLElement;
    expect(target.textContent).toBe('릴리즈 노트');
  });

  it('leaves external links alone', async () => {
    const dialog = await openHelp();
    const external = [...dialog.querySelectorAll('a')].find((candidate) => candidate.getAttribute('href')?.startsWith('https://'))!;
    expect(fireEvent.click(external)).toBe(true);
  });
});
