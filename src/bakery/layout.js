// Shared presentation rules. No game state lives in the renderer.
function showcaseLayout(count) {
  const columns = count <= 1 ? 1 : count <= 3 ? count : count <= 9 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(count / columns));
  return {columns, rows, visibleRows: Math.min(rows, 3), width: count <= 1 ? 35 : count === 2 ? 64 : 100};
}
globalThis.BakeryLayout = Object.freeze({showcase:showcaseLayout,palette:Object.freeze({
  cream:0xffe6bc,wood:0xb96f3d,edge:0x834827,lightWood:0xe6a35e,
  pink:0xd98d89,wall:0xe9b69b,gold:0xf5c25b,cocoa:0x71432e,glass:0xd5eff2})});
