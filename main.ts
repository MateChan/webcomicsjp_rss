import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import * as xml from "https://deno.land/x/xml@2.1.3/mod.ts";
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";

type Item = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  content?: string;
  enclosure?: {
    "@url"?: string;
    "@length"?: number;
    "@type"?: string;
  };
};

const parser = new DOMParser();
const app = new Hono();

app.get("/:listId", async (c) => {
  const { listId } = c.req.param();
  const items: Item[] = [];
  const listUrl = `https://webcomics.jp/mylist/${listId}`;
  for (let p = 1;; p++) {
    const res = await fetch(`${listUrl}?p=${p}`);
    if (res.status !== 200) break;
    const text = await res.text();
    const document = parser.parseFromString(text, "text/html");
    const entries = document?.getElementsByClassName("entry");
    entries?.forEach((entry) => {
      const thumbEl = entry.getElementsByClassName("entry-thumb").at(0);
      const imgEl = thumbEl?.getElementsByTagName("img").at(0);
      const enclosure = {
        "@url": imgEl?.getAttribute("src") ?? undefined,
        "@length": 0,
        "@type": "image/jpeg",
      };
      const titleEl = entry.getElementsByClassName("entry-title").at(0);
      const title = titleEl?.innerText.trim();
      const link = titleEl?.getElementsByTagName("a")[0].getAttribute("href") ??
        undefined;
      const pubDate = entry.getElementsByClassName("entry-date").at(0)
        ?.innerText.trim();
      const content = entry.getElementsByClassName("entry-text").at(0)
        ?.innerText.trim();
      items.push({ title, link, guid: link, pubDate, content, enclosure });
    });
    const isLastPage = Boolean(
      document?.getElementsByClassName("paer-next-nolink").at(0),
    );
    if (isLastPage) break;
  }
  return c.text(xml.stringify({
    xml: {
      "@version": "1.0",
      "@encoding": "utf-8",
    },
    rss: {
      "@version": "2.0",
      channel: {
        title: "Web漫画アンテナ マイリスト",
        link: listUrl,
        description: `リストID: "${listId}"`,
        item: items,
      },
    },
  }));
});

Deno.serve(app.fetch);
