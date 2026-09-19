// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createRenderQueue, loadPlantumlEngine, type PlantumlEngine } from './plantumlEngine';

describe('createRenderQueue', () => {
  it('wraps source without @startuml so markdown fences can omit it', async () => {
    const renderToString = vi.fn<PlantumlEngine['renderToString']>((_lines, ok) => ok('<svg/>'));
    const render = createRenderQueue(async () => ({ renderToString }));

    await render('Alice -> Bob : hi');

    expect(renderToString.mock.calls[0][0]).toEqual(['@startuml', 'Alice -> Bob : hi', '@enduml']);
  });

  it('keeps sources that already declare @start...', async () => {
    const renderToString = vi.fn<PlantumlEngine['renderToString']>((_lines, ok) => ok('<svg/>'));
    const render = createRenderQueue(async () => ({ renderToString }));

    await render('@startmindmap\n* root\n@endmindmap');

    expect(renderToString.mock.calls[0][0]).toEqual(['@startmindmap', '* root', '@endmindmap']);
  });

  it('runs renders strictly one at a time (the engine shares internal state)', async () => {
    let active = 0;
    let maxActive = 0;
    const engine: PlantumlEngine = {
      renderToString(_lines, ok) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => {
          active -= 1;
          ok('<svg/>');
        }, 10);
      },
    };
    const render = createRenderQueue(async () => engine);

    await Promise.all([render('a'), render('b'), render('c')]);

    expect(maxActive).toBe(1);
  });

  it('rejects with the engine message and keeps serving later renders', async () => {
    const engine: PlantumlEngine = {
      renderToString(lines, ok, fail) {
        if (lines.join('\n').includes('BROKEN')) fail('Syntax Error?');
        else ok('<svg/>');
      },
    };
    const render = createRenderQueue(async () => engine);

    await expect(render('BROKEN')).rejects.toThrow('Syntax Error?');
    await expect(render('fine')).resolves.toBe('<svg/>');
  });
});

describe('real @plantuml/core engine', () => {
  it('lays out with the real Graphviz (Viz) engine instead of silently falling back to Smetana', async () => {
    (globalThis as { location?: unknown }).location ??= new URL('http://localhost/');
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas ??= class {
      getContext() {
        return { font: '', measureText: (text: string) => ({ width: text.length * 7 }) };
      }
    };
    const messages: string[] = [];
    const originalInfo = console.info;
    const originalLog = console.log;
    console.info = (...args: unknown[]) => void messages.push(args.join(' '));
    console.log = (...args: unknown[]) => void messages.push(args.join(' '));
    try {
      const render = createRenderQueue(loadPlantumlEngine);
      const svg = await render('class Editor\nclass Node\nEditor --> Node');
      expect(svg).toContain('Editor');
    } finally {
      console.info = originalInfo;
      console.log = originalLog;
    }

    const viz = (globalThis as { Viz?: { instance?: unknown } }).Viz;
    expect(typeof viz?.instance).toBe('function');
    expect(messages.join('\n')).not.toMatch(/falling back to the Smetana/i);
  }, 60000);

  it('renders a sequence diagram to SVG and reports syntax errors', async () => {
    // Web Worker 전역에는 location이 있다. Node에는 없어서 viz-global.js가
    // require("url") 분기로 빠지므로, 워커 환경을 흉내 내기 위해 채워 준다.
    (globalThis as { location?: unknown }).location ??= new URL('http://localhost/');
    // Node에는 OffscreenCanvas가 없으므로 글자 수 기반의 가짜 canvas로 측정을 흉내 낸다.
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas ??= class {
      getContext() {
        return { font: '', measureText: (text: string) => ({ width: text.length * 7 }) };
      }
    };
    const render = createRenderQueue(loadPlantumlEngine);

    const svg = await render('Alice -> Bob : Hello');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Alice');

    const errorSvgOrThrow = await render('this is not plantuml {{{').then(
      (result) => result,
      (error: Error) => error,
    );
    // PlantUML은 문법 오류도 에러 메시지가 그려진 SVG로 돌려주거나 onError로 알린다.
    // 어느 쪽이든 정상 SVG(다이어그램)로 렌더링되어서는 안 된다.
    const text = errorSvgOrThrow instanceof Error ? errorSvgOrThrow.message : errorSvgOrThrow;
    expect(text.toLowerCase()).toMatch(/error|syntax/);
  }, 60000);
});
