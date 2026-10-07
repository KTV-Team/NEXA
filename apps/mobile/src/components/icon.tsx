import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@nexa/design-tokens';

export type IconName =
  | 'back'
  | 'eye'
  | 'eye-off'
  | 'check'
  | 'lock'
  | 'alert'
  | 'mail'
  | 'plus'
  | 'calendar'
  | 'clock'
  | 'repeat';

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'back' && <Path d="m15 18-6-6 6-6" />}
      {(name === 'eye' || name === 'eye-off') && (
        <>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <Circle cx={12} cy={12} r={3} />
          {name === 'eye-off' && <Path d="m3 3 18 18" />}
        </>
      )}
      {name === 'check' && <Path d="m5 12 4 4L19 6" />}
      {name === 'lock' && (
        <>
          <Rect x={5} y={10} width={14} height={11} rx={2} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        </>
      )}
      {name === 'alert' && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7v6m0 4h.01" />
        </>
      )}
      {name === 'mail' && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} />
          <Path d="m3 7 9 6 9-6" />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" />}
      {name === 'calendar' && (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} />
          <Path d="M16 3v4M8 3v4M3 10h18" />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7v5l3 2" />
        </>
      )}
      {name === 'repeat' && (
        <>
          <Path d="m17 2 4 4-4 4" />
          <Path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" />
          <Path d="M21 13v2a3 3 0 0 1-3 3H3" />
        </>
      )}
    </Svg>
  );
}
