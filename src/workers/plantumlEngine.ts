import { installWorkerDomShims } from './plantumlWorkerShims';

export interface PlantumlEngine {
  renderToString(lines: string[], onSuccess: (svg: string) => void, onError: (message: string) => void): void;
}

export type EngineLoader = () => Promise<PlantumlEngine>;

// @plantuml/core는 자체 스레드를 만들지 않고 호출한 스레드에서 그대로 계산한다.
// 그래서 이 모듈은 Web Worker 안에서만 로드해야 하고, 엔진 내부 상태가 공유되므로
// (README: "serialize renders") 렌더를 한 번에 하나씩 순차 실행한다.
export function createRenderQueue(load: EngineLoader): (source: string) => Promise<string> {
  let chain: Promise<unknown> = Promise.resolve();

  return (source) => {
    const run = async () => {
      const engine = await load();
      return new Promise<string>((resolve, reject) => {
        engine.renderToString(toLines(source), resolve, (message) => reject(new Error(message)));
      });
    };
    const result = chain.then(run, run);
    chain = result.catch(() => undefined);
    return result;
  };
}

// 마크다운 코드펜스에는 @startuml/@enduml을 생략하는 경우가 많아 자동으로 감싼다.
function toLines(source: string): string[] {
  const text = /^\s*@start\w+/m.test(source) ? source : `@startuml\n${source}\n@enduml`;
  return text.split(/\r\n|\r|\n/);
}

// plantuml.js는 전역 Viz(Graphviz)를 참조하므로 반드시 먼저 로드해야 한다. 없으면 엔진이
// 콘솔에 한 줄 남기고 조용히 내장 Smetana 레이아웃으로 폴백해서 눈치채기 어렵다.
// viz-global.js는 UMD라 <script>로 로드하면 globalThis.Viz를 설정하지만, 번들러가 모듈로
// 감싸면 CJS 분기로 빠져 전역이 설정되지 않으므로 export를 직접 전역에 연결한다.
export const loadPlantumlEngine: EngineLoader = async () => {
  const vizModule = (await import('@plantuml/core/viz-global.js')) as { instance?: unknown; default?: unknown };
  const g = globalThis as { Viz?: { instance?: unknown } };
  if (typeof g.Viz?.instance !== 'function') {
    g.Viz = (typeof vizModule.instance === 'function' ? vizModule : vizModule.default) as typeof g.Viz;
  }
  // shim은 viz-global 로드 뒤에 깐다: document가 먼저 생기면 viz-global이 브라우저
  // 전용 분기(document.currentScript)로 빠져 워커 환경에서 URL 오류가 난다.
  installWorkerDomShims();
  return (await import('@plantuml/core')) as unknown as PlantumlEngine;
};
