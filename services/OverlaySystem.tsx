import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';

type OverlayPriority = 'low' | 'medium' | 'high' | 'critical';

interface Overlay {
  id: string;
  component: ReactNode;
  priority: OverlayPriority;
  dismissable: boolean;
  onDismiss?: () => void;
}

interface PortalHostContextType {
  showOverlay: (
    id: string,
    component: ReactNode,
    options?: { priority?: OverlayPriority; dismissable?: boolean; onDismiss?: () => void }
  ) => void;
  dismissOverlay: (id: string) => void;
  dismissAll: () => void;
}

const PortalHostContext = createContext<PortalHostContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  const showOverlay = useCallback(
    (
      id: string,
      component: ReactNode,
      options?: { priority?: OverlayPriority; dismissable?: boolean; onDismiss?: () => void }
    ) => {
      const priorityMap: Record<OverlayPriority, number> = {
        low: 0, medium: 1, high: 2, critical: 3,
      };
      const newOverlay: Overlay = {
        id,
        component,
        priority: options?.priority || 'medium',
        dismissable: options?.dismissable ?? true,
        onDismiss: options?.onDismiss,
      };
      setOverlays((prev) => {
        const filtered = prev.filter((o) => o.id !== id);
        filtered.push(newOverlay);
        filtered.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
        return filtered;
      });
    },
    []
  );

  const dismissOverlay = useCallback((id: string) => {
    setOverlays((prev) => {
      const overlay = prev.find((o) => o.id === id);
      overlay?.onDismiss?.();
      return prev.filter((o) => o.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    setOverlays((prev) => {
      prev.forEach((o) => o.onDismiss?.());
      return [];
    });
  }, []);

  return (
    <PortalHostContext.Provider value={{ showOverlay, dismissOverlay, dismissAll }}>
      {children}
      {overlays.map((overlay, index) => (
        <Modal
          key={overlay.id}
          visible
          transparent
          animationType="fade"
          onRequestClose={() => overlay.dismissable && dismissOverlay(overlay.id)}
        >
          <View
            style={{
              flex: 1,
              zIndex: 1000 + index,
              elevation: 10 + index,
            }}
          >
            {overlay.component}
          </View>
        </Modal>
      ))}
    </PortalHostContext.Provider>
  );
}

export function usePortalHost() {
  const ctx = useContext(PortalHostContext);
  if (!ctx) throw new Error('usePortalHost must be used within OverlayProvider');
  return ctx;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SheetConfig {
  onClose: () => void;
  isVisible: boolean;
}

export function useSheetGesture({ onClose, isVisible }: SheetConfig) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const prevVisible = useRef(isVisible);

  if (isVisible && !prevVisible.current) {
    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }
  prevVisible.current = isVisible;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(SCREEN_HEIGHT);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start(() => translateY.setValue(SCREEN_HEIGHT));
      },
    })
  ).current;

  return { translateY, panHandlers: pan.panHandlers };
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { translateY, panHandlers } = useSheetGesture({ onClose, isVisible: visible });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/70">
        <TouchableOpacity
          className="flex-1"
          onPress={() => {
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onClose();
              translateY.setValue(SCREEN_HEIGHT);
            });
          }}
          activeOpacity={1}
        />
        <Animated.View style={{ transform: [{ translateY }] }} {...panHandlers}>
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[70%] rounded-t-3xl bg-zinc-900 pb-8 pt-5"
          >
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-500" />
            {title ? (
              <View className="mb-2 px-5">
                <Text className="text-center text-lg font-extrabold text-white">
                  {title}
                </Text>
              </View>
            ) : null}
            {children}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
