import { Platform } from 'react-native';
import { Text, TextProps } from './Themed';

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
