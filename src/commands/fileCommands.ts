import { parseMarkdown } from '../markdown/parser';
import { getPlatform } from '../platform';
import { getDocumentState, setDocumentState } from './documentState';
import { registerCommand } from './registry';
import { getMarkdown, syncSourceText } from './viewCommands';

registerCommand('file.new', (editor) => {
  editor.commands.clearContent(true);
  setDocumentState({ path: null, name: 'untitled.md' });
  syncSourceText(editor);
});

registerCommand('file.open', async (editor) => {
  const platform = await getPlatform();
  const opened = await platform.openFile();
  if (!opened) return false;

  const doc = parseMarkdown(editor.schema, opened.content);
  editor.commands.setContent(doc.toJSON());
  setDocumentState({ path: opened.path, name: opened.name });
  syncSourceText(editor);
});

registerCommand('file.save', async (editor) => {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const current = getDocumentState();

  if (!current.path) {
    const saved = await platform.saveFileAs(markdown, current.name);
    if (saved) setDocumentState(saved);
    return;
  }

  await platform.saveFile(current.path, markdown);
});

registerCommand('file.saveAs', async (editor) => {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const saved = await platform.saveFileAs(markdown, getDocumentState().name);
  if (saved) setDocumentState(saved);
});
