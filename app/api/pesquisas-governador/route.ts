import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const pesquisasVerificadas = [
  {
    instituto: "AtlasIntel / Focus Poder",
    divulgacao: "2026-09-21",
    campo: "15 a 20/09/2026",
    ciro: 48,
    elmano: 48.5,
    outros: 1.5,
    brancosNulos: 1.7,
    indecisos: 0.1,
    margem: "± 2 p.p.",
    amostra: 1815,
    registro: "CE-02298/2026",
    fonte: "O POVO",
    url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/09/21/pesquisa-atlasintel-ceara-traz-elmano-485-e-ciro-gomes-48.html"
  },
  {
    instituto: "Datafolha",
    divulgacao: "2026-09-18",
    campo: "14 a 17/09/2026",
    ciro: 47,
    elmano: 40,
    outros: 3,
    brancosNulos: 6,
    indecisos: 3,
    margem: "± 3 p.p.",
    amostra: 1204,
    registro: "CE-01290/2026",
    fonte: "CNN Brasil",
    url: "https://www.cnnbrasil.com.br/eleicoes/datafolha-ciro-tem-47-no-1o-turno-no-ce-elmano-40/"
  },
  {
    instituto: "Paraná Pesquisas",
    divulgacao: "2026-09-18",
    campo: "15 a 17/09/2026",
    ciro: 47.4,
    elmano: 39.9,
    outros: 2.7,
    brancosNulos: 5.3,
    indecisos: 4.7,
    margem: "± 2,7 p.p.",
    amostra: 1352,
    registro: "CE-04259/2026",
    fonte: "CNN Brasil",
    url: "https://www.cnnbrasil.com.br/eleicoes/parana-pesquisas-ciro-gomes-lidera-cenarios-de-1o-e-2o-turno-no-ceara/"
  },
  {
    instituto: "Real Time Big Data",
    divulgacao: "2026-09-18",
    campo: "14 a 17/09/2026",
    ciro: 42,
    elmano: 47,
    outros: 4,
    brancosNulos: 4,
    indecisos: 3,
    margem: "± 2 p.p.",
    amostra: 1600,
    registro: "CE-04380/2026",
    fonte: "CNN Brasil",
    url: "https://www.cnnbrasil.com.br/eleicoes/real-time-big-data-elmano-tem-47-no-1o-turno-no-ce-ciro-42/"
  }
];

export async function GET() {
  const jar = await cookies();
  const token = process.env.SESSION_TOKEN || "painel-comite-sergio-aguiar-2026";
  if (jar.get("painel_session")?.value !== token) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let noticias: Array<{ titulo: string; fonte: string; data: string; url: string }> = [];
  let monitorOnline = false;

  try {
    const query = encodeURIComponent('"pesquisa" "governador" Ceará 2026 Ciro Elmano');
    const rssUrl = "https://news.google.com/rss/search?q=" + query + "&hl=pt-BR&gl=BR&ceid=BR:pt-419";
    const response = await fetch(rssUrl, {
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 PainelComite/1.0" }
    });

    if (response.ok) {
      noticias = parseRss(await response.text())
        .filter(item => {
          const text = normalizar(item.titulo + " " + item.fonte);
          return text.includes("PESQUISA") &&
            (text.includes("CEARA") || text.includes("CIRO") || text.includes("ELMANO")) &&
            !text.includes("PRESIDENTE") &&
            !text.includes("SENADO");
        })
        .slice(0, 12);
      monitorOnline = true;
    }
  } catch {
    monitorOnline = false;
  }

  return NextResponse.json(
    {
      pesquisas: pesquisasVerificadas,
      noticias,
      monitorOnline,
      atualizadoEm: new Date().toISOString(),
      observacao: "Pesquisas de institutos diferentes podem usar metodologias, amostras e períodos de campo distintos. Compare sempre cada levantamento com sua margem de erro e data."
    },
    {
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
        "pragma": "no-cache",
        "expires": "0"
      }
    }
  );
}

function parseRss(xml: string) {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
  return items.map(match => {
    const bloco = match[1];
    const titulo = decodeXml(capture(bloco, "title"));
    const link = decodeXml(capture(bloco, "link"));
    const pubDate = decodeXml(capture(bloco, "pubDate"));
    const sourceMatch = bloco.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const fonte = sourceMatch ? decodeXml(sourceMatch[1]) : "Google Notícias";
    return { titulo, fonte, data: pubDate, url: link };
  }).filter(item => item.titulo && item.url);
}

function capture(text: string, tag: string) {
  const match = text.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match ? match[1] : "";
}

function decodeXml(value: string) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizar(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
