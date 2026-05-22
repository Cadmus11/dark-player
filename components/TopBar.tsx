import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useProfileStore } from '../stores/profileStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TopBar() {
  const { name, avatarUri } = useProfileStore();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={require('../assets/app.png')} style={styles.logo} />
        <Text style={styles.brandName}>Lumora</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>{(name || 'U')[0].toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(194, 252, 74, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C2FC4A',
  },
});
