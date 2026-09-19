import { createRenderQueue, loadPlantumlEngine } from './plantumlEngine';

export interface PlantumlRequest {
  id: number;
  source: string;
}

export type PlantumlResponse = { id: number; svg: string } | { id: number; error: string };

const render = createRenderQueue(loadPlantumlEngine);

self.onmessage = async (event: MessageEvent<PlantumlRequest>) => {
  const { id, source } = event.data;
  try {
    const response: PlantumlResponse = { id, svg: await render(source) };
    self.postMessage(response);
  } catch (error) {
    const response: PlantumlResponse = { id, error: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};
