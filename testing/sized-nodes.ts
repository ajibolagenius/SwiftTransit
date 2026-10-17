import type { RenderResult } from '@testing-library/react-native';

type StyleNode = { props: { style?: unknown } };

function matchesHeight(style: unknown, size: number): boolean {
  if (Array.isArray(style)) return style.some((part) => matchesHeight(part, size));
  if (typeof style !== 'object' || style === null) return false;
  const { width, height } = style as { width?: unknown; height?: unknown };
  return height === size && (width === undefined || width === size);
}

/**
 * Counts rendered nodes whose inline style sets the given touch target size.
 * NativeWind classes (h-12 etc.) are not resolved by Jest, so this only sees the pixel
 * constants DESIGN.md fixes outside the spacing scale: the 52 pt button, the 44 pt icon button, the 52 pt FAB.
 */
export function sizedNodes(container: RenderResult['container'], size: number): StyleNode[] {
  return container.queryAll((instance) => matchesHeight(instance.props.style, size)) as StyleNode[];
}
