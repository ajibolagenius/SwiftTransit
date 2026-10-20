// Jest stub: react-native-svg renders native views that jsdom/test-renderer cannot host.
import { View } from 'react-native';

export const SvgXml = View;
export const SvgUri = View;
export const Svg = View;
export default { SvgXml, SvgUri, Svg };
