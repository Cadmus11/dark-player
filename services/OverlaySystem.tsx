import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { View, Text, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../context/ThemeContext';

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
        low: 0,
        medium: 1,
        high: 2,
        critical: 3,
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
          onRequestClose={() => overlay.dismissable && dismissOverlay(overlay.id)}>
          <View
            style={{
              flex: 1,
              zIndex: 1000 + index,
              elevation: 10 + index,
            }}>
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

function SheetBackground({ isDark }: { isDark: boolean }) {
  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={{
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
      }}>
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? 'rgba(24,24,27,0.85)' : 'rgba(255,255,255,0.85)',
        }}
      />
    </BlurView>
  );
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const prevVisible = useRef(visible);
  const { isDarkMode, textColor, mutedColor } = useTheme();

  useEffect(() => {
    if (visible && !prevVisible.current) {
      bottomSheetModalRef.current?.present();
    } else if (!visible && prevVisible.current) {
      bottomSheetModalRef.current?.dismiss();
    }
    prevVisible.current = visible;
  }, [visible]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['50%']}
      onDismiss={onClose}
      enablePanDownToClose
      backgroundComponent={() => <SheetBackground isDark={isDarkMode} />}
      handleIndicatorStyle={{
        backgroundColor: mutedColor,
        width: 40,
        height: 4,
      }}>
      {title ? (
        <View className="mb-2 px-5 pt-2">
          <Text className="text-center text-lg font-extrabold" style={{ color: textColor }}>
            {title}
          </Text>
        </View>
      ) : null}
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
