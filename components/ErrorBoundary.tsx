import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
      return (
        <View className="flex-1 items-center justify-center bg-[#18181b] p-8">
          <WarningCircle size={48} color="#ef4444" weight="bold" />
          <Text className="mb-2 mt-4 text-xl font-bold text-white">Something went wrong</Text>
          <Text className="mb-6 text-center text-sm leading-5 text-[#a1a1aa]" numberOfLines={3}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            className="rounded-xl bg-[#C2FC4A] px-6 py-3"
            onPress={this.handleRetry}>
            <Text className="text-[15px] font-bold text-[#18181b]">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
