import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function parseCSV(text: string) {
  const split = (line: string) =>
    line
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((value) => value.replace(/^"|"$/g, "").trim());

  const all = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).map(split);
  const headerRow = all.findIndex((row) =>
    row.some((value) => value.toLocaleLowerCase("pt-BR").includes("seção")),
  );
  const rawHeader = headerRow >= 0 ? all[headerRow] : all[0] || [];
  const rows = all.slice((headerRow >= 0 ? headerRow : 0) + 1);
  const header = rawHeader.map((value) => value.toLocaleLowerCase("pt-BR"));
  const find = (...names: string[]) =>
    header.findIndex((item) => names.some((name) => item.includes(name)));

  const code = find("cod. ibge", "cod ibge");
  const section = find("seção", "secao");
  const location = find("local");
  const city = find("município", "municipio", "cidade");
  const eligible = find("aptos");
  const candidate = find("sergio aguiar", "sérgio aguiar", "sergio");
  const federal = find("roger");
  const checked = find("check", "verificação", "verificacao");

  const candidateConfig = [
    { key: "romeu", name: "Romeu", number: "40.777", office: "Estadual" },
    { key: "james", name: "James Bel", number: "44.111", office: "Estadual" },
    { key: "mosesFilho", name: "Moses Filho", number: "44.444", office: "Estadual" },
    { key: "euvaldete", name: "Euvaldete", number: "45.455", office: "Estadual" },
    { key: "zeAirton", name: "Zé Airton", number: "13.33", office: "Federal" },
    { key: "yury", name: "Yury do Paredão", number: "15.15", office: "Federal" },
    { key: "tainah", name: "Tainah Marinho", number: "40.77", office: "Federal" },
    { key: "mosesRodrigues", name: "Moses Rodrigues", number: "44.44", office: "Federal" },
    { key: "dayany", name: "Dayany do Capitão", number: "44.45", office: "Federal" },
  ];

  const candidateIndexes = Object.fromEntries(
    candidateConfig.map((item) => [item.key, find(item.name.toLocaleLowerCase("pt-BR"))]),
  );

  const data = rows
    .filter(
      (row) =>
        section >= 0 &&
        row[section] &&
        !row[section].toLocaleLowerCase("pt-BR").includes("total"),
    )
    .map((row) => ({
      ibgeCode: code >= 0 ? row[code] : "",
      section: row[section],
      location: location >= 0 ? row[location] || "—" : "—",
      municipality: city >= 0 ? row[city] || "Camocim" : "Camocim",
      eligible:
        eligible >= 0 ? Number((row[eligible] || "0").replace(/\D/g, "")) || 0 : 0,
      votes:
        candidate >= 0
          ? Number((row[candidate] || "0").replace(/\./g, "").replace(",", ".")) || 0
          : 0,
      federalVotes:
        federal >= 0
          ? Number((row[federal] || "0").replace(/\./g, "").replace(",", ".")) || 0
          : 0,
      checked: checked >= 0 ? /^(true|sim|x|1)$/i.test(row[checked] || "") : false,
      candidateVotes: Object.fromEntries(
        candidateConfig.map((item) => {
          const index = candidateIndexes[item.key];
          return [
            item.key,
            index >= 0
              ? Number((row[index] || "0").replace(/\./g, "").replace(",", ".")) || 0
              : 0,
          ];
        }),
      ),
    }));

  return {
    rows: data,
    candidateMeta: candidateConfig,
    federalCandidate: federal >= 0 ? rawHeader[federal].trim() || "ROGER 4044" : "ROGER 4044",
  };
}

export async function GET() {
  const jar = await cookies();
  const token = process.env.SESSION_TOKEN || "painel-comite-sergio-aguiar-2026";
  if (jar.get("painel_session")?.value !== token) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url =
    process.env.SHEET_CSV_URL ||
    "https://docs.google.com/spreadsheets/d/1LEDAYbRLuSSCVrUEnud_ONbY7-biZAzZ44ExAmmE_uc/export?format=csv&gid=1993398234";

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Planilha indisponível");
    const parsed = parseCSV(await response.text());
    return NextResponse.json({
      ...parsed,
      source: "sheet",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      rows: [],
      federalCandidate: "ROGER 4044",
      candidateMeta: [],
      source: "demo",
      updatedAt: new Date().toISOString(),
      message: "Planilha indisponível. Compartilhe como: qualquer pessoa com o link — leitor.",
    });
  }
}
