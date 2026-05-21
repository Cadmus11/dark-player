import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  MagicWand,
  CheckCircle,
  Spinner,
  WarningCircle,
  DownloadSimple,
  PaintBrush,
  ImageSquare,
  Sparkle,
  Waveform,
  SunDim,
} from 'phosphor-react-native';
import type { VideoEnhancementSettings, VideoQualityTarget } from '../../types';
import { VideoEnhancementService } from '../../services/VideoEnhancementService';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentSettings: VideoEnhancementSettings;
  onApply: (settings: VideoEnhancementSettings) => void;
  fileUri: string;
  primaryColor: string;
}

const QUALITY_OPTIONS: { target: VideoQualityTarget; label: string; description: string }[] = [
  { target: 'original', label: 'Original', description: 'No upscaling' },
  { target: 'hd', label: 'HD (720p)', description: '1280 × 720' },
  { target: 'fullhd', label: 'Full HD (1080p)', description: '1920 × 1080' },
  { target: '4k', label: '4K (2160p)', description: '3840 × 2160' },
];

export function VideoEnhancementModal({
  visible,
  onClose,
  currentSettings,
  onApply,
  fileUri,
  primaryColor,
}: Props) {
  const [settings, setSettings] = useState<VideoEnhancementSettings>(currentSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    VideoEnhancementService.isAvailable().then(setFfmpegAvailable);
  }, []);

  useEffect(() => {
    if (visible) setSettings(currentSettings);
  }, [visible, currentSettings]);

  const toggleSetting = (key: keyof Omit<VideoEnhancementSettings, 'qualityTarget' | 'enabled'>) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key], enabled: true }));
  };

  const setQualityTarget = (target: VideoQualityTarget) => {
    setSettings((prev) => ({ ...prev, qualityTarget: target, enabled: target !== 'original' || prev.colorEnhancement || prev.sharpening || prev.denoise || prev.hdr }));
  };

  const handleApply = async () => {
    setIsProcessing(true);
    onApply(settings);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    onClose();
  };

  const hasEnhancements = settings.qualityTarget !== 'original' || settings.colorEnhancement || settings.sharpening || settings.denoise || settings.hdr;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={[styles.content, { backgroundColor: '#18181b' }]} activeOpacity={1}>
          <View style={styles.header}>
            <MagicWand size={22} color={primaryColor} weight="bold" />
            <Text style={[styles.title, { color: '#ffffff' }]}>Video Enhancement</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeBtn, { color: primaryColor }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {ffmpegAvailable === false && (
              <View style={[styles.warningBanner, { backgroundColor: `${primaryColor}15` }]}>
                <WarningCircle size={16} color={primaryColor} />
                <Text style={[styles.warningText, { color: primaryColor }]}>
                  Install ffmpeg-kit for full enhancement: npm install ffmpeg-kit-react-native
                </Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: '#a1a1aa' }]}>QUALITY UPSCALE</Text>
            <View style={styles.qualityGrid}>
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = settings.qualityTarget === opt.target;
                return (
                  <TouchableOpacity
                    key={opt.target}
                    style={[
                      styles.qualityCard,
                      isSelected && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` },
                    ]}
                    onPress={() => setQualityTarget(opt.target)}
                  >
                    <ImageSquare size={20} color={isSelected ? primaryColor : '#e4e4e7'} weight={isSelected ? 'fill' : 'regular'} />
                    <Text style={[styles.qualityLabel, isSelected && { color: primaryColor }, { color: '#e4e4e7' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.qualityDesc, { color: '#71717a' }]}>{opt.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: '#a1a1aa', marginTop: 20 }]}>ENHANCEMENT FILTERS</Text>
            <View style={styles.filtersGrid}>
              <TouchableOpacity
                style={[styles.filterCard, settings.colorEnhancement && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` }]}
                onPress={() => toggleSetting('colorEnhancement')}
              >
                <PaintBrush size={22} color={settings.colorEnhancement ? primaryColor : '#e4e4e7'} weight={settings.colorEnhancement ? 'fill' : 'regular'} />
                <Text style={[styles.filterLabel, settings.colorEnhancement && { color: primaryColor }, { color: '#e4e4e7' }]}>
                  Color Boost
                </Text>
                <Text style={[styles.filterDesc, { color: '#71717a' }]}>Enhance vibrance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterCard, settings.sharpening && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` }]}
                onPress={() => toggleSetting('sharpening')}
              >
                <Sparkle size={22} color={settings.sharpening ? primaryColor : '#e4e4e7'} weight={settings.sharpening ? 'fill' : 'regular'} />
                <Text style={[styles.filterLabel, settings.sharpening && { color: primaryColor }, { color: '#e4e4e7' }]}>
                  Sharpen
                </Text>
                <Text style={[styles.filterDesc, { color: '#71717a' }]}>Detail clarity</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterCard, settings.denoise && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` }]}
                onPress={() => toggleSetting('denoise')}
              >
                <Waveform size={22} color={settings.denoise ? primaryColor : '#e4e4e7'} weight={settings.denoise ? 'fill' : 'regular'} />
                <Text style={[styles.filterLabel, settings.denoise && { color: primaryColor }, { color: '#e4e4e7' }]}>
                  Denoise
                </Text>
                <Text style={[styles.filterDesc, { color: '#71717a' }]}>Reduce noise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterCard, settings.hdr && { borderColor: primaryColor, backgroundColor: `${primaryColor}12` }]}
                onPress={() => toggleSetting('hdr')}
              >
                <SunDim size={22} color={settings.hdr ? primaryColor : '#e4e4e7'} weight={settings.hdr ? 'fill' : 'regular'} />
                <Text style={[styles.filterLabel, settings.hdr && { color: primaryColor }, { color: '#e4e4e7' }]}>
                  HDR Tone
                </Text>
                <Text style={[styles.filterDesc, { color: '#71717a' }]}>Wide dynamic range</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: hasEnhancements ? primaryColor : '#27272a' }]}
              onPress={handleApply}
              disabled={isProcessing || !hasEnhancements}
            >
              {isProcessing ? (
                <ActivityIndicator size={18} color="#0a0a0a" />
              ) : (
                <>
                  <MagicWand size={18} color={hasEnhancements ? '#0a0a0a' : '#71717a'} weight="bold" />
                  <Text style={[styles.applyText, { color: hasEnhancements ? '#0a0a0a' : '#71717a' }]}>
                    {hasEnhancements ? 'Apply Enhancement' : 'Select enhancement options'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', marginLeft: 10 },
  closeBtn: { fontSize: 15, fontWeight: '700' },
  body: { paddingHorizontal: 20 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: { fontSize: 12, flex: 1, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#1a1a1e',
    alignItems: 'center',
    gap: 4,
  },
  qualityLabel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  qualityDesc: { fontSize: 10 },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#1a1a1e',
    alignItems: 'center',
    gap: 4,
  },
  filterLabel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  filterDesc: { fontSize: 10 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  applyText: { fontSize: 15, fontWeight: '700' },
});
