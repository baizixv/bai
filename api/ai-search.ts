// Vercel serverless function: DeepSeek-powered site search.
// The API key lives in the DEEPSEEK_API_KEY environment variable and is never
// shipped to the browser. Locally, run `vercel dev` after `vercel env pull`.

export const config = { maxDuration: 60 };

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `你是「白子诩·数字花园」的 AI 搜索助手。这是白子诩的个人网站，收录文章、想法、项目、工具、游戏、外链与媒体条目。
回答要求：
- 用中文回答，简洁、口语化，3-6 句以内
- 优先基于给出的站内内容回答；内容不足以回答时如实说明
- 最后一行列出最相关的站内条目，格式：条目名 + 链接`;

const json = (payload: unknown, status: number): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  let query = "";
  try {
    const body = await request.json();
    query = String(body?.query ?? "").trim().slice(0, 200);
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  if (!query) return json({ error: "empty query" }, 400);

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return json({ error: "server missing key" }, 500);

  // Pull relevant entries from the static index to keep the prompt small.
  let context = "";
  try {
    const indexUrl = new URL("/search-index.json", request.url);
    const index = (await fetch(indexUrl).then((res) => res.json())) as Array<Record<string, string>>;
    const q = query.toLowerCase();
    const matches = index
      .filter((entry) =>
        [entry.title, entry.description, entry.tag, entry.label, entry.body]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);
    context = matches
      .map((entry) => `【${entry.kind}】${entry.title}\n${entry.description}\n${(entry.body ?? "").slice(0, 300)}\n链接：${entry.url}`)
      .join("\n\n");
  } catch {
    // Index unavailable; answer from general knowledge.
  }

  const deepseek = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: context
            ? `用户问题：${query}\n\n站内相关内容：\n${context}`
            : `用户问题：${query}\n（站内没有找到相关内容，请如实说明）`,
        },
      ],
    }),
  });

  if (!deepseek.ok || !deepseek.body) {
    return json({ error: `deepseek ${deepseek.status}` }, 502);
  }
  return new Response(deepseek.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
