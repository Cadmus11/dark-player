import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { formatFileSize } from '../services/FileService';
import { Sorting } from '../services/Sorting';

type ImageViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'ImageViewer'>;

const { width, height } = Dimensions.get('window');

export function ImageViewerScreen({ navigation, route }: ImageViewerScreenProps) {
  const { file } = route.params;
  const { images } = useFiles();

  const sortedImages = useMemo(() => {
    return Sorting.sort(images, 'name', 'asc');
  }, [images]);

  const startIndex = useMemo(
    () => Math.max(0, sortedImages.findIndex((img) => img.uri === file.uri)),
    [sortedImages, file.uri]
  );

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (startIndex > 0) {
      scrollRef.current?.scrollTo({ x: startIndex * width, animated: false });
    }
  }, [startIndex]);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }, []);

  const currentFile = sortedImages[currentIndex];

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= sortedImages.length) return;
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  }, [sortedImages.length]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.scrollView}
        contentOffset={{ x: startIndex * width, y: 0 }}
        bounces={false}
      >
        {sortedImages.map((img) => (
          <View key={img.uri} style={styles.page}>
            <Image source={{ uri: img.uri }} style={styles.image} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {currentFile?.name ?? file.name}
          </Text>
          <View style={{ width: 44, alignItems: 'flex-end' }}>
            <Text style={styles.counter}>{currentIndex + 1}/{sortedImages.length}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex <= 0 && { opacity: 0.3 }]}
            onPress={() => goTo(currentIndex - 1)}
            disabled={currentIndex <= 0}
          >
            <CaretLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.infoText}>
            {currentFile?.size ? formatFileSize(currentFile.size) : ''}
          </Text>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex >= sortedImages.length - 1 && { opacity: 0.3 }]}
            onPress={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= sortedImages.length - 1}
          >
            <CaretRight size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  scrollView: { flex: 1 },
  page: { width, height },
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
  title: { flex: 1, fontSize: 16, color: '#ffffff', textAlign: 'center', marginHorizontal: 10 },
  counter: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 15,
  },
  navBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
});
