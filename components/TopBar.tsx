import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function TopBar() {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/lumora-circle.png')} style={styles.avatar} />
      <Text style={styles.username}>Lumora</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
});
