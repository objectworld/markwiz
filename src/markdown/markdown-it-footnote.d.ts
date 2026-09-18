// markdown-it-footnote는 자체 타입 선언이 없고, @types/markdown-it-footnote는
// (지금은 markdown-it이 직접 번들링하는) 예전 @types/markdown-it에 의존해
// 타입이 충돌한다. 우리가 실제로 설치한 markdown-it의 타입을 그대로 재사용해
// 앰비언트 선언만 최소한으로 둔다.
declare module 'markdown-it-footnote' {
  import type { MarkdownIt } from 'markdown-it';

  const footnotePlugin: (md: MarkdownIt) => void;
  export default footnotePlugin;
}
