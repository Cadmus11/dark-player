# PanResponder → Gesture Handler Migration

## Current State
PanResponder used for:
- Video swipe (next/prev)
- Bottom sheet dismiss
- Music player swipe-down-to-dismiss
- Seek gestures

## Target: react-native-gesture-handler + Reanimated

### Why Migrate
- PanResponder runs on JS thread
- Gesture Handler runs on UI thread (native)
- Reanimated worklets avoid JS bridge
- Better gesture composition (simultaneous, fail, wait)
- Smoother animations at 120fps

### Migration Priority

| Component | Priority | Complexity |
|-----------|----------|------------|
| BottomSheet | High | Low |
| VideoSwipe | High | Low |
| MusicPlayer dismiss | Medium | Low |
| Seek gesture | Low | Medium |
| Brightness/Volume | Low | High |

### Implementation Pattern

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function BottomSheet({ children, onClose }) {
  const translateY = useSharedValue(0);
  const SHEET_HEIGHT = 500;

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 80) {
        onClose();
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

### Migration Steps
1. Wrap app root with `GestureHandlerRootView`
2. Replace PanResponder in BottomSheet first
3. Migrate VideoSwipe (horizontal pan)
4. Migrate MusicPlayer dismiss
5. Add Gesture.Simultaneous for layered controls
6. Remove all PanResponder imports

### Benefits
- Native thread gesture processing
- No JS-thread blocking during drags
- RNGH composable gesture system
- Reanimated shared values for 60fps+ animations
- Better accessibility
