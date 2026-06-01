import React, {
  forwardRef,
  useState,
  useCallback,
  useImperativeHandle,
  type ReactNode,
  type Ref,
} from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';

interface BottomSheetModalProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  enablePanDownToClose?: boolean;
  backgroundStyle?: Record<string, any>;
  handleIndicatorStyle?: Record<string, any>;
  backgroundComponent?: () => ReactNode;
}

const BottomSheetModal = forwardRef((props: BottomSheetModalProps, ref: Ref<any>) => {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    present: () => {
      setVisible(true);
    },
    dismiss: () => {
      setVisible(false);
    },
  }));

  const { onDismiss } = props;
  const handleClose = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity className="flex-1" onPress={handleClose} activeOpacity={1} />
        <View
          style={[
            {
              maxHeight: '90%',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 32,
              paddingTop: 16,
              backgroundColor: 'rgba(24,24,27,0.85)',
              overflow: 'hidden',
              ...(isWeb ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
            } as any,
            props.backgroundStyle,
          ]}>
          <View
            style={[
              {
                width: 40,
                height: 4,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
                backgroundColor: '#52525b',
              },
              props.handleIndicatorStyle,
            ]}
          />
          <ScrollView showsVerticalScrollIndicator={false}>{props.children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
});

BottomSheetModal.displayName = 'BottomSheetModal';

const BottomSheetScrollView = ScrollView;

export { BottomSheetModal };
export { BottomSheetScrollView };
export const BottomSheetModalProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
