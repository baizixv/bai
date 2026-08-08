export type MediaType = 'book' | 'film' | 'game';
export type MediaTone = 'blue' | 'yellow' | 'pink' | 'green';

export const formatMediaTitle = (title: string, mediaType?: MediaType): string =>
  mediaType === 'book' ? `《${title}》` : title;

export const getMediaTone = (tone?: MediaTone): MediaTone => tone ?? 'blue';
