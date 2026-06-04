import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, Appearance } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';
import { THEME_PRESETS } from '../types';
import { getThemeSettings } from '../services/StorageService';

interface FeatureBoundaryProps {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface FeatureBoundaryState {
  hasError: boolean;
  error: Error | null;
  accentColor: string;
}

export class FeatureBoundary extends Component<FeatureBoundaryProps, FeatureBoundaryState> {
  constructor(props: FeatureBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, accentColor: '#8B5CF6' };
  }

  async componentDidMount() {
    try {
      const settings = await getThemeSettings();
      const preset = THEME_PRESETS.find((t) => t.key === (settings?.colorThemeKey || 'obsidian'));
      if (preset) this.setState({ accentColor: preset.accent });
    } catch {}
  }

  static getDerivedStateFromError(error: Error): Partial<FeatureBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isDark = Appearance.getColorScheme() === 'dark';
      return (
        <View
          className="flex-1 items-center justify-center rounded-2xl p-6"
          style={{ backgroundColor: isDark ? '#18181b' : '#f4f4f5' }}>
          <WarningCircle size={32} color="#ef4444" weight="bold" />
          <Text
            className="mb-1 mt-3 text-base font-bold"
            style={{ color: isDark ? '#ffffff' : '#18181b' }}>
            {this.props.name} Error
          </Text>
          <Text
            className="mb-4 text-center text-xs"
            style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
            {this.state.error?.message || 'Something went wrong'}
          </Text>
          <TouchableOpacity
            className="rounded-xl px-4 py-2"
            style={{ backgroundColor: this.state.accentColor }}
            onPress={this.handleRetry}>
            <Text className="text-xs font-bold" style={{ color: isDark ? '#18181b' : '#ffffff' }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export function VideoBoundary(props: { children: ReactNode; fallback?: ReactNode }) {
  return <FeatureBoundary name="Video" {...props} />;
}

export function ImageBoundary(props: { children: ReactNode; fallback?: ReactNode }) {
  return <FeatureBoundary name="Image" {...props} />;
}

export function PlayerBoundary(props: { children: ReactNode; fallback?: ReactNode }) {
  return <FeatureBoundary name="Player" {...props} />;
}

export function DocumentBoundary(props: { children: ReactNode; fallback?: ReactNode }) {
  return <FeatureBoundary name="Document" {...props} />;
}
