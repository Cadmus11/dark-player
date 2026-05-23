import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';

interface FeatureBoundaryProps {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface FeatureBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class FeatureBoundary extends Component<FeatureBoundaryProps, FeatureBoundaryState> {
  constructor(props: FeatureBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FeatureBoundaryState {
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
      return (
        <View className="flex-1 items-center justify-center rounded-2xl bg-[#18181b] p-6">
          <WarningCircle size={32} color="#ef4444" weight="bold" />
          <Text className="mb-1 mt-3 text-base font-bold text-white">
            {this.props.name} Error
          </Text>
          <Text className="mb-4 text-center text-xs text-[#a1a1aa]">
            {this.state.error?.message || 'Something went wrong'}
          </Text>
          <TouchableOpacity
            className="rounded-xl bg-[#C2FC4A] px-4 py-2"
            onPress={this.handleRetry}>
            <Text className="text-xs font-bold text-[#18181b]">Retry</Text>
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
