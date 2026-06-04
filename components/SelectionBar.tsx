import React from "react";
import { View, Text, TouchableOpacity, Share, Alert } from "react-native";
import {
  Playlist,
  Queue,
  ShareNetwork,
  EyeSlash,
  Lock,
  Trash,
  X,
} from "phosphor-react-native";
import type { FileItem, FileAction } from "../types";
import { useTheme } from "../context/ThemeContext";

interface SelectionBarProps {
  selectedUris: Set<string>;
  selectedFiles: FileItem[];
  onClearSelection: () => void;
  onAction: (action: FileAction, files: FileItem[]) => void;
  primaryColor: string;
}

export function SelectionBar({
  selectedUris,
  selectedFiles,
  onClearSelection,
  onAction,
  primaryColor,
}: SelectionBarProps) {
  const { textColor, isDarkMode, cardBg, borderColor } = useTheme();
  if (selectedUris.size === 0) return null;

  const count = selectedUris.size;

  const handleDelete = () => {
    Alert.alert(
      "Delete Files",
      `Permanently delete ${count} file${count !== 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onAction("delete", selectedFiles),
        },
      ],
    );
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-[30] pt-3"
      style={{
        backgroundColor: cardBg,
        borderTopWidth: 1,
        borderTopColor: borderColor,
      }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onClearSelection}
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
          }}
          accessibilityLabel="Clear selection"
          accessibilityRole="button"
        >
          <X size={18} color={textColor} />
        </TouchableOpacity>
        <Text className="text-sm font-bold" style={{ color: textColor }}>
          {count} selected
        </Text>
        <View className="w-8" />
      </View>
      <View className="flex-row justify-around gap-1">
        <ActionBtn
          icon={<Playlist size={20} color={textColor} />}
          label="Add to"
          onPress={() => onAction("addToPlaylist", selectedFiles)}
          accessibilityLabel="Add to playlist"
        />
        <ActionBtn
          icon={<Queue size={20} color={textColor} />}
          label="Play Next"
          onPress={() => onAction("playNext", selectedFiles)}
          accessibilityLabel="Play next"
        />
        <ActionBtn
          icon={<ShareNetwork size={20} color={textColor} />}
          label="Share"
          onPress={async () => {
            try {
              await Share.share({
                message: selectedFiles.map((f) => f.name).join("\n"),
              });
            } catch {}
          }}
          accessibilityLabel="Share files"
        />
        <ActionBtn
          icon={<EyeSlash size={20} color={textColor} />}
          label="Hide"
          onPress={() => onAction("hide", selectedFiles)}
          accessibilityLabel="Hide files"
        />
        <ActionBtn
          icon={<Lock size={20} color={textColor} />}
          label="Private"
          onPress={() => onAction("moveToPrivate", selectedFiles)}
          accessibilityLabel="Move to private"
        />
        <ActionBtn
          icon={<Trash size={20} color="#ef4444" />}
          label="Delete"
          onPress={handleDelete}
          accessibilityLabel="Delete files"
        />
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { mutedColor } = useTheme();
  return (
    <TouchableOpacity
      className="min-w-[56] items-center gap-1 rounded-xl px-2.5 py-2"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
    >
      {icon}
      <Text className="text-[10px] font-semibold" style={{ color: mutedColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
