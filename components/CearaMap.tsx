"use client";

import { useEffect, useMemo, useState } from "react";

type Row = { municipality: string; votes: number; ibgeCode?: string };
type Feature = {
  properties: { codarea: string; nome: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any };
};

const W = 520;
const H = 570;
const P = 18;

const rings = (feature: Feature): number[][][] =>
  feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();

export default function CearaMap({
  rows,
  selected,
  onSelect,
}: {
  rows: Row[];
  selected: string;
  onSelect: (city: string) => void;
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/Alefim/PAINEL-COMITE-SERGIO-AGUIAR/main/dashboard-apuracao-2026/public/ceara-municipios.geojson",
    )
      .then((response) => response.json())
      .then((geojson) => setFeatures(geojson.features || []))
      .catch(() => setFeatures([]));
  }, []);

  const byCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.ibgeCode) {
        map.set(row.ibgeCode, (map.get(row.ibgeCode) || 0) + row.votes);
      }
    }
    return map;
  }, [rows]);

  const bounds = useMemo(() => {
    const points = features.flatMap((feature) => rings(feature).flat());
    if (!points.length) return [-41.5, -7.9, -37.1, -2.7];
    return [
      Math.min(...points.map((point) => point[0])),
      Math.min(...points.map((point) => point[1])),
      Math.max(...points.map((point) => point[0])),
      Math.max(...points.map((point) => point[1])),
    ];
  }, [features]);

  const path = (feature: Feature) =>
    rings(feature)
      .map(
        (ring) =>
          ring
            .map(([x, y], index) => {
              const px = P + ((x - bounds[0]) / (bounds[2] - bounds[0])) * (W - P * 2);
              const py = H - P - ((y - bounds[1]) / (bounds[3] - bounds[1])) * (H - P * 2);
              return `${index ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`;
            })
            .join("") + "Z",
      )
      .join("");

  const max = Math.max(1, ...Array.from(byCode.values()));
  const active = hover ? features.find((feature) => feature.properties.codarea === hover) : null;
  const activeVotes = active ? byCode.get(active.properties.codarea) || 0 : 0;

  const color = (feature: Feature) => {
    const votes = byCode.get(feature.properties.codarea) || 0;
    const ratio = votes / max;
    if (feature.properties.nome === selected) return "#ffb020";
    if (!ratio) return "#0b6689";
    if (ratio > 0.66) return "#18d8d2";
    if (ratio > 0.33) return "#1ca0aa";
    return "#197998";
  };

  return (
    <div className="real-map">
      {!features.length && <div className="map-loading">Carregando mapa do Ceará…</div>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa dos municípios do Ceará">
        {features.map((feature) => (
          <path
            key={feature.properties.codarea}
            d={path(feature)}
            fill={color(feature)}
            className="municipality"
            onMouseEnter={() => setHover(feature.properties.codarea)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(feature.properties.nome)}
          >
            <title>
              {feature.properties.nome}: {byCode.get(feature.properties.codarea) || 0} votos
            </title>
          </path>
        ))}
      </svg>
      {active && (
        <div className="map-tooltip">
          <b>{active.properties.nome}</b>
          <span>{activeVotes.toLocaleString("pt-BR")} votos</span>
        </div>
      )}
      <div className="map-scale">
        <span>0</span>
        <i />
        <span>{max.toLocaleString("pt-BR")} votos</span>
      </div>
    </div>
  );
}
