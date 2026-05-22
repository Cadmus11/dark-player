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
        <View className="flex-1 justify-center items-center bg-[#18181b] p-8">
          <WarningCircle size={48} color="#ef4444" weight="bold" />
          <Text className="text-xl font-bold text-white mt-4 mb-2">Something went wrong</Text>
          <Text className="text-sm text-[#a1a1aa] text-center mb-6 leading-5" numberOfLines={3}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity className="bg-[#C2FC4A] px-6 py-3 rounded-xl" onPress={this.handleRetry}>
            <Text className="text-[15px] font-bold text-[#18181b]">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
