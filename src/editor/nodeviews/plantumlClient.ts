import type { PlantumlRequest, PlantumlResponse } from '../../workers/plantuml.worker';
import { sanitizeSvg } from './sanitizeSvg';

interface Pending {
  resolve: (svg: string) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function failAll(error: Error): void {
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}

// 워커는 문서에서 plantuml 코드블록이 처음 렌더링될 때 비로소 만들어진다.
// 워커 안에서 @plantuml/core(약 8MB)를 동적 import하므로, plantuml 블록이 없는
// 문서에서는 이 코드도 엔진도 전혀 내려받지 않는다.
function getWorker(): Worker {
  if (worker) return worker;

  const created = new Worker(new URL('../../workers/plantuml.worker.ts', import.meta.url), { type: 'module' });
  created.onmessage = (event: MessageEvent<PlantumlResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if ('error' in event.data) request.reject(new Error(event.data.error));
    else request.resolve(event.data.svg);
  };
  created.onerror = (event) => {
    failAll(new Error(event.message || 'PlantUML worker failed'));
    created.terminate();
    worker = null;
  };
  worker = created;
  return created;
}

export async function renderPlantuml(source: string): Promise<string> {
  const svg = await new Promise<string>((resolve, reject) => {
    const id = (nextId += 1);
    pending.set(id, { resolve, reject });
    const request: PlantumlRequest = { id, source };
    getWorker().postMessage(request);
  });
  return sanitizeSvg(svg);
}
