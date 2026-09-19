// @plantuml/core는 타입 선언을 제공하지 않는다. 실제 사용하는 표면(renderToString)은
// plantumlEngine.ts의 PlantumlEngine 인터페이스로 좁혀서 쓴다.
declare module '@plantuml/core';
declare module '@plantuml/core/viz-global.js';
