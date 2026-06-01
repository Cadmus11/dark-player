import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation(): AppNavigationProp {
  return useNavigation<AppNavigationProp>();
}
