import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

type Entry = CollectionEntry<"entries">;

const urlFor = (entry: Entry): string => {
  const id = entry.id.replace(/\.md$/, "");
  const { kind } = entry.data;
  if (kind === "game") return `/games/${id}/`;
  if (kind === "article") return `/articles/${id}/`;
  if (kind === "idea") return `/ideas/${id}/`;
  if (kind === "project") return `/projects/${id}/`;
  if (kind === "tool") return entry.data.demoUrl ?? "/tools/";
  if (kind === "bookmark") return entry.data.url ?? "/library/";
  if (kind === "media") return entry.data.url ?? "/library/";
  return "/";
};

export const GET: APIRoute = async () => {
  const entries = await getCollection("entries");
  const items = entries
    .filter((entry) => entry.data.kind !== "idea-version")
    .map((entry) => ({
      id: entry.id,
      kind: entry.data.kind,
      title: entry.data.title,
      description: entry.data.description,
      tag: entry.data.tag ?? "",
      label: entry.data.label ?? "",
      creator: entry.data.creator ?? "",
      status: entry.data.status ?? "",
      date: entry.data.date.toISOString().slice(0, 10),
      url: urlFor(entry),
      body: entry.body.slice(0, 500),
    }));
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
};
