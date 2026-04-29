import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { formatFileSize } from '../services/FileService';

type ImageViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'ImageViewer'>;

const { width, height } = Dimensions.get('window');

export function ImageViewerScreen({ navigation, route }: ImageViewerScreenProps) {
  const { file } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image source={{ uri: file.uri }} style={styles.image} resizeMode="contain" />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {file.name}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.infoText}>{file.size && formatFileSize(file.size)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  image: { width, height },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: 15,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 28, color: '#ffffff' },
  title: { flex: 1, fontSize: 16, color: '#ffffff', textAlign: 'center', marginHorizontal: 10 },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 15,
  },
  infoText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
});
