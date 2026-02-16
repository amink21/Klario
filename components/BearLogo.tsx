import React from 'react';
import { View } from 'react-native';
import BearSvg from '@/assets/images/bear-png.svg';

const BearComponent = (BearSvg as { default?: unknown })?.default ?? BearSvg;
const isSvgComponent =
  typeof BearComponent === 'function' ||
  (typeof BearComponent === 'object' && BearComponent !== null && typeof (BearComponent as { default?: unknown }).default === 'function');

const SvgBear = isSvgComponent
  ? (BearComponent as React.ComponentType<{ width?: number; height?: number }>)
  : null;

type Props = {
  width: number;
  height: number;
};

/** Uses bear-png.svg everywhere. */
export function BearLogo({ width, height }: Props) {
  if (SvgBear) {
    return <SvgBear width={width} height={height} />;
  }
  return <View style={{ width, height }} />;
}
