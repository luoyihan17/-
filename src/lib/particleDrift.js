// Distance to transparent pixels in the raster mask, measured in square rings.
// Two passes run only when the text is resampled, never in the animation loop.
export function buildDriftClearance(pixels, width, height) {
  const distances = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (pixels[i * 4 + 3] <= 100) continue;
    distances[i] = x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1
      : 1 + Math.min(distances[i - 1], distances[i - width - 1], distances[i - width], distances[i - width + 1]);
  }
  for (let y = height - 2; y >= 1; y--) for (let x = width - 2; x >= 1; x--) {
    const i = y * width + x;
    if (distances[i]) distances[i] = Math.min(distances[i], 1 + Math.min(distances[i + 1], distances[i + width - 1], distances[i + width], distances[i + width + 1]));
  }
  return distances;
}
