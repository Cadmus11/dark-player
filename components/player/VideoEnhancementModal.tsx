import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import {
  MagicWand,
  PaintBrush,
  ImageSquare,
  Sparkle,
  Waveform,
  SunDim,
} from 'phosphor-react-native';
import type { VideoEnhancementSettings, VideoQualityTarget } from '../../types';
import { useTheme } from '../../context/ThemeContext';

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
  const { textColor, mutedColor, cardBg, borderColor: themeBorderColor, isDarkMode } = useTheme();
  const [settings, setSettings] = useState<VideoEnhancementSettings>(currentSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  useEffect(() => {
    if (visible) setSettings(currentSettings);
  }, [visible, currentSettings]);

  const toggleSetting = (
    key: keyof Omit<VideoEnhancementSettings, 'qualityTarget' | 'enabled'>
  ) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key], enabled: true }));
  };

  const setQualityTarget = (target: VideoQualityTarget) => {
    setSettings((prev) => ({
      ...prev,
      qualityTarget: target,
      enabled:
        target !== 'original' ||
        prev.colorEnhancement ||
        prev.sharpening ||
        prev.denoise ||
        prev.hdr,
    }));
  };

  const handleApply = async () => {
    setIsProcessing(true);
    onApply(settings);
    await new Promise((r) => setTimeout(r, 300));
    setIsProcessing(false);
    onClose();
  };

  const hasEnhancements =
    settings.qualityTarget !== 'original' ||
    settings.colorEnhancement ||
    settings.sharpening ||
    settings.denoise ||
    settings.hdr;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        className="flex-1 justify-end bg-black/70"
        onPress={onClose}
        activeOpacity={1}>
        <TouchableOpacity
          className="max-h-[85%] rounded-t-[28px] pb-[40] pt-5"
          style={{ backgroundColor: cardBg }}
          activeOpacity={1}>
          <View className="mb-4 flex-row items-center px-5">
            <MagicWand size={22} color={primaryColor} weight="bold" />
            <Text className="ml-2.5 flex-1 text-lg font-extrabold" style={{ color: textColor }}>
              Video Enhancement
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[15px] font-bold" style={{ color: primaryColor }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            <Text
              className="mb-2.5 text-[11px] font-bold tracking-[1]"
              style={{ color: mutedColor }}>
              QUALITY UPSCALE
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = settings.qualityTarget === opt.target;
                return (
                  <TouchableOpacity
                    key={opt.target}
                    className="min-w-[45%] flex-1 items-center gap-1 rounded-xl border p-3.5"
                    style={{
                      borderColor: isSelected ? primaryColor : themeBorderColor,
                      backgroundColor: isSelected ? `${primaryColor}12` : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    }}
                    onPress={() => setQualityTarget(opt.target)}>
                    <ImageSquare
                      size={20}
                      color={isSelected ? primaryColor : textColor}
                      weight={isSelected ? 'fill' : 'regular'}
                    />
                    <Text
                      className="mt-1 text-[13px] font-bold"
                      style={{ color: isSelected ? primaryColor : textColor }}>
                      {opt.label}
                    </Text>
                    <Text className="text-[10px]" style={{ color: mutedColor }}>
                      {opt.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              className="mb-2.5 mt-5 text-[11px] font-bold tracking-[1]"
              style={{ color: mutedColor }}>
              ENHANCEMENT FILTERS
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                className="w-[47%] items-center gap-1 rounded-xl border p-3.5"
                style={{
                  borderColor: settings.colorEnhancement ? primaryColor : themeBorderColor,
                  backgroundColor: settings.colorEnhancement ? `${primaryColor}12` : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
                onPress={() => toggleSetting('colorEnhancement')}>
                <PaintBrush
                  size={22}
                  color={settings.colorEnhancement ? primaryColor : textColor}
                  weight={settings.colorEnhancement ? 'fill' : 'regular'}
                />
                <Text
                  className="mt-1 text-[13px] font-bold"
                  style={{ color: settings.colorEnhancement ? primaryColor : textColor }}>
                  Color Boost
                </Text>
                <Text className="text-[10px]" style={{ color: mutedColor }}>
                  Enhance vibrance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] items-center gap-1 rounded-xl border p-3.5"
                style={{
                  borderColor: settings.sharpening ? primaryColor : themeBorderColor,
                  backgroundColor: settings.sharpening ? `${primaryColor}12` : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
                onPress={() => toggleSetting('sharpening')}>
                <Sparkle
                  size={22}
                  color={settings.sharpening ? primaryColor : textColor}
                  weight={settings.sharpening ? 'fill' : 'regular'}
                />
                <Text
                  className="mt-1 text-[13px] font-bold"
                  style={{ color: settings.sharpening ? primaryColor : textColor }}>
                  Sharpen
                </Text>
                <Text className="text-[10px]" style={{ color: mutedColor }}>
                  Detail clarity
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] items-center gap-1 rounded-xl border p-3.5"
                style={{
                  borderColor: settings.denoise ? primaryColor : themeBorderColor,
                  backgroundColor: settings.denoise ? `${primaryColor}12` : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
                onPress={() => toggleSetting('denoise')}>
                <Waveform
                  size={22}
                  color={settings.denoise ? primaryColor : textColor}
                  weight={settings.denoise ? 'fill' : 'regular'}
                />
                <Text
                  className="mt-1 text-[13px] font-bold"
                  style={{ color: settings.denoise ? primaryColor : textColor }}>
                  Denoise
                </Text>
                <Text className="text-[10px]" style={{ color: mutedColor }}>
                  Reduce noise
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-[47%] items-center gap-1 rounded-xl border p-3.5"
                style={{
                  borderColor: settings.hdr ? primaryColor : themeBorderColor,
                  backgroundColor: settings.hdr ? `${primaryColor}12` : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}
                onPress={() => toggleSetting('hdr')}>
                <SunDim
                  size={22}
                  color={settings.hdr ? primaryColor : textColor}
                  weight={settings.hdr ? 'fill' : 'regular'}
                />
                <Text
                  className="mt-1 text-[13px] font-bold"
                  style={{ color: settings.hdr ? primaryColor : textColor }}>
                  HDR Tone
                </Text>
                <Text className="text-[10px]" style={{ color: mutedColor }}>
                  Wide dynamic range
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="mb-2.5 mt-5 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
              style={{ backgroundColor: hasEnhancements ? primaryColor : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
              onPress={handleApply}
              disabled={isProcessing || !hasEnhancements}>
              {isProcessing ? (
                <ActivityIndicator size={18} color="#0a0a0a" />
              ) : (
                <>
                  <MagicWand
                    size={18}
                    color={hasEnhancements ? '#0a0a0a' : mutedColor}
                    weight="bold"
                  />
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: hasEnhancements ? '#0a0a0a' : mutedColor }}>
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
