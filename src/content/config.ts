import { defineCollection, z } from 'astro:content';

const entries = defineCollection({
  type: 'content',
  schema: z.object({
    kind: z.enum(['article', 'project', 'tool', 'game', 'bookmark']),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    minutes: z.string().optional(),
    tag: z.string().optional(),
    color: z.enum(['blue', 'yellow', 'pink', 'green']).optional(),
    featured: z.boolean().default(false),
    label: z.string().optional(),
    url: z.string().optional(),
    image: z.string().optional(),
    icon: z.enum(['layers', 'type', 'github', 'book-open']).optional(),
    visual: z.enum(['xiaoman', 'tiny', 'rain', 'extension', 'benchmark']).optional()
  })
});

export const collections = { entries };
