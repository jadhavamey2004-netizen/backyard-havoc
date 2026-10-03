export function mapClientToLogicalCoordinates(clientX, clientY, rect, width = 960, height = 540) {
  const rectWidth = Number.isFinite(rect?.width) && rect.width > 0 ? rect.width : 1;
  const rectHeight = Number.isFinite(rect?.height) && rect.height > 0 ? rect.height : 1;
  const left = Number.isFinite(rect?.left) ? rect.left : 0;
  const top = Number.isFinite(rect?.top) ? rect.top : 0;
  return {
    x: (clientX - left) * (width / rectWidth),
    y: (clientY - top) * (height / rectHeight)
  };
}
