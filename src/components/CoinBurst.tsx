import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface CoinProps {
  angle: number;
  radius: number;
  delay: number;
  size?: number;
  onDone?: () => void;
}

function Coin({ angle, radius, delay, size = 28, onDone }: CoinProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.2);

  useEffect(() => {
    const rad = (angle * Math.PI) / 180;
    const targetX = Math.cos(rad) * radius;
    const targetY = Math.sin(rad) * radius;

    const done = () => onDone?.();

    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
      withDelay(400, withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })),
    ));

    scale.value = withDelay(delay, withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withDelay(300, withTiming(0.5, { duration: 300 })),
    ));

    tx.value = withDelay(delay, withTiming(targetX, { duration: 700, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(delay, withTiming(targetY, { duration: 700, easing: Easing.out(Easing.quad) }, () => {
      runOnJS(done)();
    }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.coin, style]}>
      <Text style={{ fontSize: size }}>🥇</Text>
    </Animated.View>
  );
}

interface CoinBurstProps {
  visible: boolean;
  /** Number of coins — default 8 */
  count?: number;
  /** Burst radius in dp — default 90 */
  radius?: number;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Extra label shown below (e.g. "+0.001 XAUm") */
  label?: string;
  /** Show "NX" multiplier badge (e.g. 3 → "3×") */
  multiplier?: number;
}

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function CoinBurst({
  visible,
  count = 8,
  radius = 90,
  onComplete,
  label,
  multiplier,
}: CoinBurstProps) {
  if (!visible) return null;

  const angles = ANGLES.slice(0, count);
  let completedCount = 0;
  const handleDone = () => {
    completedCount++;
    if (completedCount >= angles.length) onComplete?.();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        {angles.map((angle, i) => (
          <Coin
            key={angle}
            angle={angle}
            radius={radius}
            delay={i * 30}
            onDone={i === angles.length - 1 ? handleDone : undefined}
          />
        ))}

        {multiplier && multiplier > 1 && (
          <Animated.View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{multiplier}×</Text>
          </Animated.View>
        )}

        {label && (
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
  },
  multiplierBadge: {
    backgroundColor: '#B8860B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    top: -20,
  },
  multiplierText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 1,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -50,
    backgroundColor: '#16213E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  labelText: {
    color: '#B8860B',
    fontWeight: '700',
    fontSize: 16,
  },
});
