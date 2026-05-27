declare module 'react-native-media-meta' {
  interface MediaMetaResult {
    album?: string;
    albumName?: string;
    album_artist?: string;
    artist?: string;
    comment?: string;
    composer?: string;
    creationDate?: string;
    creation_time?: string;
    date?: string;
    duration?: string;
    genre?: string;
    height?: number;
    language?: string;
    lastModifiedDate?: string;
    performer?: string;
    publisher?: string;
    thumb?: string;
    title?: string;
    track?: string;
    width?: number;
    year?: string;
    [key: string]: any;
  }

  interface MediaMetaOptions {
    getThumb?: boolean;
  }

  const MediaMeta: {
    get(path: string, options?: MediaMetaOptions): Promise<MediaMetaResult>;
  };

  export default MediaMeta;
}
