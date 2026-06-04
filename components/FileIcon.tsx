import React from "react";
import { VideoCamera, MusicNote, Folder, File } from "phosphor-react-native";
import type { FileType } from "../types";

const fileTypeMap: Record<string, React.ElementType> = {
  video: VideoCamera,
  audio: MusicNote,
  folder: Folder,
  other: File,
};

interface FileIconProps {
  type?: FileType;
  size?: number;
  color?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

export function FileIcon({
  type,
  size = 22,
  color,
  weight = "regular",
}: FileIconProps) {
  if (type && fileTypeMap[type]) {
    const Icon = fileTypeMap[type];
    return <Icon size={size} color={color} weight={weight} />;
  }
  const Icon = File;
  return <Icon size={size} color={color} weight={weight} />;
}
