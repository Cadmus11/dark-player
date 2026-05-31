import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, Appearance } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, errorInfo.componentStack);
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
          className="flex-1 items-center justify-center p-8"
          style={{ backgroundColor: isDark ? '#18181b' : '#f4f4f5' }}>
          <WarningCircle size={48} color="#ef4444" weight="bold" />
          <Text
            className="mb-2 mt-4 text-xl font-bold"
            style={{ color: isDark ? '#ffffff' : '#18181b' }}>
            Something went wrong
          </Text>
          <Text
            className="mb-6 text-center text-sm leading-5"
            style={{ color: isDark ? '#a1a1aa' : '#71717a' }}
            numberOfLines={3}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: isDark ? '#C2FC4A' : '#F97316' }}
            onPress={this.handleRetry}>
            <Text
              className="text-[15px] font-bold"
              style={{ color: isDark ? '#18181b' : '#ffffff' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
