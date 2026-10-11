import { render } from '@testing-library/react-native';

const mockMapProps = jest.fn();

jest.mock('@maplibre/maplibre-react-native', () => ({
  Map: (props: Record<string, unknown>) => {
    mockMapProps(props);
    return props.children;
  },
  Camera: () => null,
}));
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
    EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
  },
}));

const useColorScheme = jest.spyOn(require('react-native'), 'useColorScheme');

import { AppMap } from '@/components/app-map';

describe('AppMap', () => {
  beforeEach(() => mockMapProps.mockClear());

  // covers: AC-7
  it('uses the OpenFreeMap Positron style in light mode', async () => {
    useColorScheme.mockReturnValue('light');
    await render(<AppMap />);
    expect(mockMapProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ mapStyle: 'https://tiles.openfreemap.org/styles/positron' }),
    );
  });

  // covers: AC-7
  it('uses the OpenFreeMap Dark style in dark mode', async () => {
    useColorScheme.mockReturnValue('dark');
    await render(<AppMap />);
    expect(mockMapProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ mapStyle: 'https://tiles.openfreemap.org/styles/dark' }),
    );
  });

  it('keeps the OpenStreetMap attribution visible', async () => {
    useColorScheme.mockReturnValue('light');
    await render(<AppMap />);
    expect(mockMapProps).toHaveBeenLastCalledWith(expect.objectContaining({ attribution: true }));
  });
});
