import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'profile' });

interface ProfileState {
  name: string;
  avatarUri: string | null;
  setName: (name: string) => void;
  setAvatarUri: (uri: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: storage.getString('name') ?? 'User',
  avatarUri: storage.getString('avatarUri') ?? null,
  setName: (name: string) => {
    storage.set('name', name);
    set({ name });
  },
  setAvatarUri: (uri: string | null) => {
    if (uri) storage.set('avatarUri', uri);
    else storage.delete('avatarUri');
    set({ avatarUri: uri });
  },
}));
