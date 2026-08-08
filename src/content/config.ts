import { defineCollection, z } from 'astro:content';

const entries = defineCollection({
  type: 'content',
  schema: z.object({
    kind: z.enum(['article', 'project', 'tool', 'game', 'bookmark', 'media']),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    minutes: z.string().optional(),
    tag: z.string().optional(),
    color: z.enum(['blue', 'yellow', 'pink', 'green']).optional(),
    featured: z.boolean().default(false),
    now: z.boolean().default(false),
    progress: z.number().min(0).max(100).optional(),
    status: z.string().optional(),
    mediaType: z.enum(['book', 'film', 'game']).optional(),
    creator: z.string().optional(),
    year: z.number().int().optional(),
    rating: z.number().min(0).max(5).optional(),
    label: z.string().optional(),
    url: z.string().optional(),
    demoUrl: z.string().optional(),
    area: z.enum(['tiny', 'standalone']).optional(),
    image: z.string().optional(),
    icon: z.enum(['layers', 'type', 'github', 'book-open']).optional(),
    visual: z.enum(['xiaoman', 'tiny', 'rain', 'extension', 'benchmark', 'chicken', 'ogden']).optional()
  })
});

export const collections = { entries };
