import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CaretLeft, PencilSimple, Trash } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useProfileStore } from '../stores/profileStore';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { name: savedName, avatarUri: savedAvatar, setName, setAvatarUri } = useProfileStore();
  const { primaryColor } = useTheme();

  const [editingName, setEditingName] = useState(savedName);
  const [hasChanges, setHasChanges] = useState(false);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [setAvatarUri]);

  const removeImage = useCallback(() => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAvatarUri(null) },
    ]);
  }, [setAvatarUri]);

  const saveName = useCallback(() => {
    const trimmed = editingName.trim();
    if (trimmed.length === 0) {
      Alert.alert('Invalid Name', 'Name cannot be empty.');
      return;
    }
    setName(trimmed);
    setHasChanges(false);
  }, [editingName, setName]);

  return (
    <ScreenLayout noTopBar>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
            {savedAvatar ? (
              <Image source={{ uri: savedAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}25` }]}>
                <Text style={[styles.avatarInitials, { color: primaryColor }]}>
                  {(savedName || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: primaryColor }]}>
              <PencilSimple size={14} color="#ffffff" weight="bold" />
            </View>
          </TouchableOpacity>
          {savedAvatar && (
            <TouchableOpacity onPress={removeImage} style={styles.removeBtn}>
              <Trash size={16} color="#ef4444" />
              <Text style={styles.removeText}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput
            style={[styles.input, { borderColor: `${primaryColor}30`, color: '#ffffff' }]}
            value={editingName}
            onChangeText={(t) => { setEditingName(t); setHasChanges(true); }}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={30}
          />
        </View>

        {hasChanges && (
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={saveName}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoText}>
          <Text style={styles.infoTextContent}>
            Your profile is stored locally on this device only.
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 20 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 36, fontWeight: '700' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#06060B' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  removeText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  fieldSection: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#18181b' },
  infoText: { marginTop: 'auto', paddingBottom: 40, alignItems: 'center' },
  infoTextContent: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
