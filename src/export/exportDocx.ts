import type { Editor } from '@tiptap/core';
import { getDocumentState } from '../commands/documentState';
import { showNotice } from '../commands/viewState';
import { t } from '../i18n/i18n';
import { getPlatform } from '../platform';
import { collectRasterImages } from './collectImages';
import { convertDocument, createConvertContext } from './docxConvert';

const DOCX_FILTER = { name: 'Word Document', extensions: ['docx'] };

function suggestedDocxName(): string {
  const { name } = getDocumentState();
  return `${name.replace(/\.(md|markdown)$/i, '')}.docx`;
}

export async function exportDocx(editor: Editor): Promise<void> {
  const [images, docx] = await Promise.all([collectRasterImages(editor), import('docx')]);
  const ctx = createConvertContext(docx, images);
  const { blocks, numberingConfigs } = convertDocument(editor.state.doc, ctx);

  const doc = new docx.Document({
    title: getDocumentState().name,
    numbering: numberingConfigs.length ? { config: numberingConfigs } : undefined,
    footnotes: Object.keys(ctx.footnotes).length ? ctx.footnotes : undefined,
    sections: [{ children: blocks }],
  });

  // 브라우저(Blob.arrayBuffer)와 Tauri 둘 다에서 쓸 수 있게 Packer 결과를 Uint8Array로 통일한다.
  const blob = await docx.Packer.toBlob(doc);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const platform = await getPlatform();
  const saved = await platform.saveBinaryFileAs(bytes, suggestedDocxName(), DOCX_FILTER);
  if (saved) showNotice(t('notice.docxSaved', { name: saved.name }));
}
