import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const token = process.env.SESSION_TOKEN || "painel-comite-sergio-aguiar-2026";
  if (jar.get("painel_session")?.value !== token) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url = process.env.TSE_RESULTS_URL;
  if (!url) {
    return NextResponse.json({
      rows: [],
      source: "demo",
      updatedAt: new Date().toISOString(),
      message: "Aguardando endpoint oficial de resultados 2026",
    });
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Fonte oficial indisponível");

    const payload: any = await response.json();
    const candidates = payload.cand || payload.candidatos || [];
    const candidate = candidates.find(
      (item: any) =>
        [item.n, item.numero, item.nrCandidato].some(
          (number: any) => String(number).replace(/\D/g, "") === "40888",
        ) ||
        String(item.nm || item.nome || "")
          .toUpperCase()
          .includes("SERGIO AGUIAR"),
    );

    const votes = Number(candidate?.vap || candidate?.votos || candidate?.qtVotos || 0);

    return NextResponse.json({
      rows: [
        {
          section: "TSE",
          location: "Total oficial",
          municipality: payload.muni || payload.municipio || "Ceará",
          votes,
          federalVotes: 0,
          eligible: Number(payload.e || payload.eleitores || 0),
          checked: votes > 0,
        },
      ],
      source: "tse",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      rows: [],
      source: "demo",
      updatedAt: new Date().toISOString(),
      message: "Fonte oficial temporariamente indisponível",
    });
  }
}
