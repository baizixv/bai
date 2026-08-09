export type MediaType = 'book' | 'screen' | 'music' | 'game';
export type MediaTone = 'blue' | 'yellow' | 'pink' | 'green';

export const formatMediaTitle = (title: string, mediaType?: MediaType): string =>
  mediaType === 'book' ? `《${title}》` : title;

export const getMediaTone = (tone?: MediaTone): MediaTone => tone ?? 'blue';

export const formatWordCount = (count?: number): string | undefined => {
  if (!count) return undefined;
  if (count >= 10_000) return `约 ${Math.round(count / 10_000)} 万字`;
  return `${count.toLocaleString('zh-CN')} 字`;
};
