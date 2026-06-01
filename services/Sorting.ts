import type { FileItem, HistoryEntry, SortField, SortDirection } from '../types';

type SortableItem = FileItem | HistoryEntry;

function getFile(item: SortableItem): FileItem {
  return 'file' in item ? (item as HistoryEntry).file : (item as FileItem);
}

function compareString(a: string, b: string, locale: string = 'en'): number {
  return a.localeCompare(b, locale, { sensitivity: 'base' });
}

function compareOptionalNumber(a: number | undefined, b: number | undefined, dir: number): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1 * dir;
  if (b === undefined) return -1 * dir;
  return a - b;
}

export const Sorting = {
  sort<T extends SortableItem>(
    items: T[],
    field: SortField,
    direction: SortDirection,
    locale: string = 'en'
  ): T[] {
    const arr = [...items];
    const dir = direction === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      const fileA = getFile(a);
      const fileB = getFile(b);
      let cmp = 0;

      switch (field) {
        case 'name':
          cmp = compareString(fileA.name, fileB.name, locale);
          break;
        case 'date':
          cmp = compareOptionalNumber(fileA.modifiedAt, fileB.modifiedAt, dir);
          if (cmp === 0) cmp = compareOptionalNumber(fileA.createdAt, fileB.createdAt, dir);
          break;
        case 'size':
          cmp = compareOptionalNumber(fileA.size, fileB.size, dir);
          break;
        case 'type': {
          const typeA = fileA.mimeType || fileA.name.split('.').pop() || '';
          const typeB = fileB.mimeType || fileB.name.split('.').pop() || '';
          cmp = compareString(typeA, typeB);
          break;
        }
        case 'duration':
          cmp = compareOptionalNumber(fileA.duration, fileB.duration, dir);
          break;
        case 'artist':
          cmp = compareString(fileA.artist || '', fileB.artist || '', locale);
          if (cmp === 0) cmp = compareString(fileA.album || '', fileB.album || '', locale);
          break;
        case 'album':
          cmp = compareString(fileA.album || '', fileB.album || '', locale);
          break;
        case 'playCount': {
          const countA = 'playCount' in a ? (a as any).playCount || 0 : 0;
          const countB = 'playCount' in b ? (b as any).playCount || 0 : 0;
          cmp = countA - countB;
          break;
        }
        case 'recentlyPlayed': {
          const dateA = 'lastPlayedAt' in a ? (a as any).lastPlayedAt || 0 : fileA.modifiedAt;
          const dateB = 'lastPlayedAt' in b ? (b as any).lastPlayedAt || 0 : fileB.modifiedAt;
          cmp = compareOptionalNumber(dateA, dateB, dir);
          break;
        }
        case 'newest': {
          const modA = fileA.modifiedAt ?? fileA.createdAt ?? 0;
          const modB = fileB.modifiedAt ?? fileB.createdAt ?? 0;
          cmp = modB - modA;
          break;
        }
      }

      return cmp * dir;
    });

    return arr;
  },
};
