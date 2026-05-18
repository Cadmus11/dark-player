import React from 'react';
import {
  FileText, FilePdf, FileDoc, FileXls, FilePpt, FileTxt,
  Image, VideoCamera, MusicNote, Folder, File, BookOpen,
} from 'phosphor-react-native';
import type { FileType, DocumentSubType } from '../types';

const fileTypeMap: Record<string, React.ElementType> = {
  image: Image,
  video: VideoCamera,
  audio: MusicNote,
  document: FileText,
  folder: Folder,
  other: File,
};

const docTypeMap: Record<string, React.ElementType> = {
  pdf: FilePdf,
  word: FileDoc,
  excel: FileXls,
  powerpoint: FilePpt,
  text: FileTxt,
  epub: BookOpen,
};

interface FileIconProps {
  type?: FileType;
  docSubType?: DocumentSubType;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export function FileIcon({ type, docSubType, size = 22, color = '#ffffff', weight = 'regular' }: FileIconProps) {
  if (docSubType && docTypeMap[docSubType]) {
    const Icon = docTypeMap[docSubType];
    return <Icon size={size} color={color} weight={weight} />;
  }
  if (type && fileTypeMap[type]) {
    const Icon = fileTypeMap[type];
    return <Icon size={size} color={color} weight={weight} />;
  }
  const Icon = File;
  return <Icon size={size} color={color} weight={weight} />;
}
