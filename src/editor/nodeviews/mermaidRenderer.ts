import mermaid from 'mermaid';

let initialized = false;

// mermaid.initialize()는 프로세스당 한 번만 호출해야 한다 (여러 다이어그램
// 인스턴스가 각자 다시 초기화하면 내부 설정이 계속 리셋된다).
function ensureInitialized(): void {
  if (initialized) return;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  initialized = true;
}

let counter = 0;

// render() 호출마다 고유 id가 필요하다 (동일 id 재사용 시 mermaid 내부
// 캐시가 이전 렌더링과 충돌해 상태가 꼬인다).
function nextId(): string {
  counter += 1;
  return `markwiz-mermaid-${counter}`;
}

export async function renderMermaid(source: string): Promise<string> {
  ensureInitialized();
  const { svg } = await mermaid.render(nextId(), source);
  return svg;
}
