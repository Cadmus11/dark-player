import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  MagicWand,
  CheckCircle,
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
      <TouchableOpacity className="flex-1 bg-black/70 justify-end" onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          className="rounded-t-[28px] pt-5 pb-[40] max-h-[85%]"
          style={{ backgroundColor: '#18181b' }}
          activeOpacity={1}
        >
          <View className="flex-row items-center px-5 mb-4">
            <MagicWand size={22} color={primaryColor} weight="bold" />
            <Text className="flex-1 text-lg font-extrabold text-white ml-2.5">Video Enhancement</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[15px] font-bold" style={{ color: primaryColor }}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            {ffmpegAvailable === false && (
              <View className="flex-row items-center gap-2 p-3 rounded-xl mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                <WarningCircle size={16} color={primaryColor} />
                <Text className="text-xs flex-1 font-medium" style={{ color: primaryColor }}>
                  Install ffmpeg-kit for full enhancement: npm install ffmpeg-kit-react-native
                </Text>
              </View>
            )}

            <Text className="text-[11px] font-bold tracking-[1] mb-2.5" style={{ color: '#a1a1aa' }}>QUALITY UPSCALE</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = settings.qualityTarget === opt.target;
                return (
                  <TouchableOpacity
                    key={opt.target}
                    className="flex-1 min-w-[45%] p-3.5 rounded-xl border items-center gap-1"
                    style={{
                      borderColor: isSelected ? primaryColor : '#27272a',
                      backgroundColor: isSelected ? `${primaryColor}12` : '#1a1a1e',
                    }}
                    onPress={() => setQualityTarget(opt.target)}
                  >
                    <ImageSquare size={20} color={isSelected ? primaryColor : '#e4e4e7'} weight={isSelected ? 'fill' : 'regular'} />
                    <Text className="text-[13px] font-bold mt-1" style={{ color: isSelected ? primaryColor : '#e4e4e7' }}>
                      {opt.label}
                    </Text>
                    <Text className="text-[10px]" style={{ color: '#71717a' }}>{opt.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[11px] font-bold tracking-[1] mb-2.5 mt-5" style={{ color: '#a1a1aa' }}>ENHANCEMENT FILTERS</Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                className="w-[47%] p-3.5 rounded-xl border items-center gap-1"
                style={{
                  borderColor: settings.colorEnhancement ? primaryColor : '#27272a',
                  backgroundColor: settings.colorEnhancement ? `${primaryColor}12` : '#1a1a1e',
                }}
                onPress={() => toggleSetting('colorEnhancement')}
              >
                <PaintBrush size={22} color={settings.colorEnhancement ? primaryColor : '#e4e4e7'} weight={settings.colorEnhancement ? 'fill' : 'regular'} />
                <Text className="text-[13px] font-bold mt-1" style={{ color: settings.colorEnhancement ? primaryColor : '#e4e4e7' }}>
                  Color Boost
                </Text>
                <Text className="text-[10px]" style={{ color: '#71717a' }}>Enhance vibrance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] p-3.5 rounded-xl border items-center gap-1"
                style={{
                  borderColor: settings.sharpening ? primaryColor : '#27272a',
                  backgroundColor: settings.sharpening ? `${primaryColor}12` : '#1a1a1e',
                }}
                onPress={() => toggleSetting('sharpening')}
              >
                <Sparkle size={22} color={settings.sharpening ? primaryColor : '#e4e4e7'} weight={settings.sharpening ? 'fill' : 'regular'} />
                <Text className="text-[13px] font-bold mt-1" style={{ color: settings.sharpening ? primaryColor : '#e4e4e7' }}>
                  Sharpen
                </Text>
                <Text className="text-[10px]" style={{ color: '#71717a' }}>Detail clarity</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] p-3.5 rounded-xl border items-center gap-1"
                style={{
                  borderColor: settings.denoise ? primaryColor : '#27272a',
                  backgroundColor: settings.denoise ? `${primaryColor}12` : '#1a1a1e',
                }}
                onPress={() => toggleSetting('denoise')}
              >
                <Waveform size={22} color={settings.denoise ? primaryColor : '#e4e4e7'} weight={settings.denoise ? 'fill' : 'regular'} />
                <Text className="text-[13px] font-bold mt-1" style={{ color: settings.denoise ? primaryColor : '#e4e4e7' }}>
                  Denoise
                </Text>
                <Text className="text-[10px]" style={{ color: '#71717a' }}>Reduce noise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] p-3.5 rounded-xl border items-center gap-1"
                style={{
                  borderColor: settings.hdr ? primaryColor : '#27272a',
                  backgroundColor: settings.hdr ? `${primaryColor}12` : '#1a1a1e',
                }}
                onPress={() => toggleSetting('hdr')}
              >
                <SunDim size={22} color={settings.hdr ? primaryColor : '#e4e4e7'} weight={settings.hdr ? 'fill' : 'regular'} />
                <Text className="text-[13px] font-bold mt-1" style={{ color: settings.hdr ? primaryColor : '#e4e4e7' }}>
                  HDR Tone
                </Text>
                <Text className="text-[10px]" style={{ color: '#71717a' }}>Wide dynamic range</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl mt-5 mb-2.5"
              style={{ backgroundColor: hasEnhancements ? primaryColor : '#27272a' }}
              onPress={handleApply}
              disabled={isProcessing || !hasEnhancements}
            >
              {isProcessing ? (
                <ActivityIndicator size={18} color="#0a0a0a" />
              ) : (
                <>
                  <MagicWand size={18} color={hasEnhancements ? '#0a0a0a' : '#71717a'} weight="bold" />
                  <Text className="text-[15px] font-bold" style={{ color: hasEnhancements ? '#0a0a0a' : '#71717a' }}>
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
