import { registerCommand } from './registry';
import { getViewState, setViewState, showNotice } from './viewState';
import { t } from '../i18n/i18n';

// 찾기/바꾸기는 화면에 그려진 문서(미리보기)에서 동작한다. 소스 모드의 textarea는 브라우저/웹뷰 자체의 찾기를 쓴다.
function openFind(replace: boolean): boolean {
  if (getViewState().sourceMode) {
    showNotice(t('notice.findSourceMode'));
    return false;
  }
  setViewState({ find: { replace, token: (getViewState().find?.token ?? 0) + 1 } });
  return true;
}

registerCommand('edit.find', () => openFind(false));
registerCommand('edit.replace', () => openFind(true));
