// 소스 코드 모드에서 막 돌아왔거나 다이어그램을 막 고친 직후에는 NodeView(코드 블록, 다이어그램)와 다이어그램 SVG가 아직
// DOM에 없을 수 있다. 인쇄/HTML 내보내기가 그 상태를 그대로 가져가면 빈 블록이 나오므로 그려질 때까지 잠깐 기다린다.

const POLL_MS = 50;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// 소스가 있는데 아직 그림도 오류도 없는 다이어그램이 남아 있는가(렌더링 대기 중)
export function hasPendingDiagrams(root: HTMLElement): boolean {
  return [...root.querySelectorAll('.markwiz-diagram')].some((diagram) => {
    const source = diagram.querySelector('.markwiz-diagram-source')?.textContent ?? '';
    if (!source.trim()) return false;
    return !diagram.querySelector('.markwiz-diagram-svg svg') && !diagram.querySelector('.markwiz-diagram-error');
  });
}

// settle: 에디터 내용을 막 바꿨다면(소스 모드에서 복귀) React가 NodeView를 그릴 시간을 한 번 더 준다.
export async function waitForRender(root: HTMLElement, options: { settle?: boolean; timeoutMs?: number } = {}): Promise<void> {
  const { settle = false, timeoutMs = 5000 } = options;
  if (settle) await sleep(POLL_MS);
  const deadline = Date.now() + timeoutMs;
  while (hasPendingDiagrams(root) && Date.now() < deadline) await sleep(POLL_MS);
}
