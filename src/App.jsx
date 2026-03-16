import { useState, useMemo, useCallback } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";

/* ── Objectif 1 Million palette ── */
const C = {
  creme: "#FFF9E9",
  noir: "#161616",
  orange: "#F95E01",
  jaune: "#F9BA39",
  rose: "#F585F1",
  ciel: "#00A5FA",
  bleu: "#2D5AFA",
  muted: "#8a8577",
  border: "#e8e2d4",
  subtle: "#b5ae9e",
};

const STRATEGIES = {
  lombard: { name: "Lombard", color: C.orange, desc: "Salaire 100% investi, dépenses par crédit" },
  classic: { name: "Classique", color: C.bleu, desc: "Surplus investi (salaire - dépenses)" },
  sellToLive: { name: "Vendre pour vivre", color: C.rose, desc: "Vente d'actifs pour les dépenses" },
  holdOnly: { name: "Hold only", color: C.ciel, desc: "Portefeuille existant, aucun ajout" },
};

const fmt = (v) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return v.toFixed(0);
};
const fmtCHF = (v) => `${fmt(v)} CHF`;

const Slider = ({ label, value, onChange, min, max, step, unit, presets, note }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, letterSpacing: 0.3 }}>{label}</span>
      <span style={{ fontSize: 17, color: C.noir, fontWeight: 700 }}>
        {unit === "%" ? `${value}%` : unit === "CHF" ? `${value.toLocaleString("fr-CH")} CHF` : unit === "ans" ? `${value} ${value > 1 ? "ans" : "an"}` : value}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", cursor: "pointer", height: 5 }}
    />
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
      <span style={{ fontSize: 10, color: C.subtle }}>{unit === "%" ? `${min}%` : unit === "CHF" ? min.toLocaleString("fr-CH") : min}</span>
      <span style={{ fontSize: 10, color: C.subtle }}>{unit === "%" ? `${max}%` : unit === "CHF" ? max.toLocaleString("fr-CH") : max}</span>
    </div>
    {presets && (
      <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
        {presets.map((p) => (
          <button key={p.value} onClick={() => onChange(p.value)}
            style={{
              padding: "3px 10px", fontSize: 10, borderRadius: 20,
              border: value === p.value ? `1.5px solid ${C.orange}` : `1px solid ${C.border}`,
              background: value === p.value ? C.orange + "14" : "transparent",
              color: value === p.value ? C.orange : C.muted,
              cursor: "pointer", fontWeight: value === p.value ? 600 : 400,
              transition: "all 0.15s",
            }}
          >{p.label}</button>
        ))}
      </div>
    )}
    {note && <div style={{ fontSize: 10, color: C.subtle, marginTop: 5, fontStyle: "italic" }}>{note}</div>}
  </div>
);

const MetricCard = ({ label, value, sub, accent }) => (
  <div style={{
    background: C.creme, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "14px 16px", flex: 1, minWidth: 150,
    borderTop: `3px solid ${accent || C.border}`,
  }}>
    <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 21, color: accent || C.noir, fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const StrategyToggle = ({ strategies, active, onToggle }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
    {Object.entries(strategies).map(([key, s]) => (
      <button key={key} onClick={() => onToggle(key)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 16px", borderRadius: 24,
          border: active.includes(key) ? `1.5px solid ${s.color}` : `1px solid ${C.border}`,
          background: active.includes(key) ? s.color + "12" : "transparent",
          color: active.includes(key) ? s.color : C.subtle,
          cursor: "pointer", fontSize: 12, fontWeight: active.includes(key) ? 600 : 400,
          transition: "all 0.2s",
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: active.includes(key) ? s.color : C.border,
          boxShadow: active.includes(key) ? `0 0 6px ${s.color}50` : "none",
        }} />
        {s.name}
      </button>
    ))}
  </div>
);

function simulate(params) {
  const { portfolio, salary, expenses, retAnnual, lombardRate, ltvTarget, inflation, years } = params;
  const months = years * 12;
  const retM = retAnnual / 100 / 12;
  const rateM = lombardRate / 100 / 12;
  const data = [];
  let lP = portfolio, lDebt = 0, lInt = 0;
  let cP = portfolio, sP = portfolio, hP = portfolio;

  for (let m = 0; m <= months; m++) {
    const deflator = Math.pow(1 + inflation / 100, m / 12);
    data.push({
      month: m,
      lombard: (lP - lDebt - lInt) / deflator,
      classic: cP / deflator,
      sellToLive: Math.max(0, sP) / deflator,
      holdOnly: hP / deflator,
      lombardRaw: lP - lDebt - lInt,
      classicRaw: cP,
      lombardDebt: lDebt + lInt,
      lombardLTV: lP > 0 ? (lDebt + lInt) / lP : 0,
    });
    if (m === months) break;

    const lEstPortf = (lP + salary) * (1 + retM);
    const lEstInt = lInt + (lDebt + expenses / 2) * rateM;
    const lMaxAllowed = (ltvTarget / 100) * lEstPortf;
    const lRoom = lMaxAllowed - lDebt - lEstInt;
    const lDepLomb = Math.min(expenses, Math.max(0, lRoom));
    const lSalInv = salary - (expenses - lDepLomb);
    lP = lP + lSalInv + (lP + lSalInv) * retM;
    lDebt += lDepLomb;
    lInt += (lDebt - lDepLomb / 2) * rateM;

    const surplus = salary - expenses;
    cP = cP + surplus + (cP + surplus) * retM;
    sP = sP + sP * retM - expenses;
    if (sP < 0) sP = 0;
    hP = hP + hP * retM;
  }
  return data;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const yr = Math.floor(d.month / 12);
  const mo = d.month % 12;
  return (
    <div style={{
      background: "white", border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>
        Année {yr}{mo > 0 ? `, mois ${mo}` : ""}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{fmtCHF(p.value)}</span>
        </div>
      ))}
      {d.lombardLTV !== undefined && (
        <div style={{ fontSize: 10, color: C.subtle, marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 5 }}>
          LTV: {(d.lombardLTV * 100).toFixed(1)}% &nbsp;|&nbsp; Dette: {fmtCHF(d.lombardDebt)}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [portfolio, setPortfolio] = useState(106463);
  const [salary, setSalary] = useState(16250);
  const [expenses, setExpenses] = useState(11000);
  const [retAnnual, setRetAnnual] = useState(10);
  const [lombardRate, setLombardRate] = useState(2.5);
  const [ltvTarget, setLtvTarget] = useState(25);
  const [inflation, setInflation] = useState(1);
  const [years, setYears] = useState(10);
  const [activeStrategies, setActiveStrategies] = useState(["lombard", "classic", "sellToLive"]);

  const toggleStrategy = useCallback((key) => {
    setActiveStrategies((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }, []);

  const data = useMemo(
    () => simulate({ portfolio, salary, expenses, retAnnual, lombardRate, ltvTarget, inflation, years }),
    [portfolio, salary, expenses, retAnnual, lombardRate, ltvTarget, inflation, years]
  );

  const chartData = useMemo(() => {
    if (data.length <= 120) return data;
    const step = Math.max(1, Math.floor(data.length / 200));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  const last = data[data.length - 1];
  const gain = last.lombard - last.classic;
  const gainPct = last.classic > 0 ? ((gain / last.classic) * 100).toFixed(1) : "0";

  const yearlyData = useMemo(() => data.filter((d) => d.month % 12 === 0), [data]);

  const xTickInterval = years <= 5 ? 12 : years <= 15 ? 24 : years <= 30 ? 60 : 120;

  return (
    <div style={{ minHeight: "100vh", background: C.creme, color: C.noir, fontFamily: "'DM Sans', -apple-system, sans-serif", padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', -apple-system, sans-serif; }
        input[type="range"] {
          -webkit-appearance: none; appearance: none;
          background: ${C.border}; border-radius: 10px; outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: ${C.orange}; cursor: pointer;
          box-shadow: 0 0 0 3px ${C.creme}, 0 0 0 5px ${C.orange}30;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 3px ${C.creme}, 0 0 0 6px ${C.orange}50;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      <div style={{ padding: "32px 36px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: C.orange,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.creme, fontWeight: 800, fontSize: 16,
          }}>L</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Simulateur Lombard</h1>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "6px 0 28px", maxWidth: 660, lineHeight: 1.6 }}>
          Comparez 4 stratégies de gestion de patrimoine. Tous les montants en CHF réels, corrigés de l'inflation.
        </p>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 36px 48px", display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Controls */}
        <div style={{ width: 310, flexShrink: 0 }}>
          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px 6px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.orange, textTransform: "uppercase", letterSpacing: 2, marginBottom: 18, fontWeight: 700 }}>Portefeuille</div>
            <Slider label="Valeur initiale" value={portfolio} onChange={setPortfolio} min={10000} max={5000000} step={5000} unit="CHF" />
            <Slider label="Salaire net / mois" value={salary} onChange={setSalary} min={0} max={50000} step={250} unit="CHF" />
            <Slider label="Dépenses / mois" value={expenses} onChange={setExpenses} min={1000} max={50000} step={250} unit="CHF" />
          </div>
          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px 6px" }}>
            <div style={{ fontSize: 10, color: C.orange, textTransform: "uppercase", letterSpacing: 2, marginBottom: 18, fontWeight: 700 }}>Hypothèses</div>
            <Slider label="Rendement annuel" value={retAnnual} onChange={setRetAnnual} min={-20} max={50} step={1} unit="%"
              presets={[{ label: "Bear -10%", value: -10 },{ label: "Flat 0%", value: 0 },{ label: "Modéré 5%", value: 5 },{ label: "Central 10%", value: 10 },{ label: "Bull 20%", value: 20 }]} />
            <Slider label="Taux Lombard" value={lombardRate} onChange={setLombardRate} min={0.5} max={8} step={0.1} unit="%"
              presets={[{ label: "SARON 1.5%", value: 1.5 },{ label: "Banque privée 2.5%", value: 2.5 },{ label: "Retail 4%", value: 4 }]} />
            <Slider label="LTV cible" value={ltvTarget} onChange={setLtvTarget} min={5} max={60} step={1} unit="%"
              presets={[{ label: "Prudent 15%", value: 15 },{ label: "Optimal 25%", value: 25 },{ label: "Agressif 40%", value: 40 }]}
              note="% max de dette / portefeuille" />
            <Slider label="Inflation" value={inflation} onChange={setInflation} min={0} max={10} step={0.5} unit="%"
              presets={[{ label: "CH 1%", value: 1 },{ label: "EU 2.5%", value: 2.5 },{ label: "US 5%", value: 5 }]} />
            <Slider label="Horizon" value={years} onChange={setYears} min={1} max={40} step={1} unit="ans" />
          </div>
        </div>

        {/* Output */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <MetricCard label="Lombard" value={fmtCHF(last.lombard)}
              sub={`${gain >= 0 ? "+" : ""}${fmtCHF(gain)} vs classique (${gain >= 0 ? "+" : ""}${gainPct}%)`}
              accent={C.orange} />
            <MetricCard label="Classique" value={fmtCHF(last.classic)} sub="Surplus investi" accent={C.bleu} />
            <MetricCard label="LTV final" value={`${(last.lombardLTV * 100).toFixed(1)}%`}
              sub={`Dette: ${fmtCHF(last.lombardDebt)}`}
              accent={last.lombardLTV > 0.4 ? C.rose : last.lombardLTV > 0.25 ? C.jaune : C.orange} />
          </div>

          <StrategyToggle strategies={STRATEGIES} active={activeStrategies} onToggle={toggleStrategy} />

          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 14px 14px 0", marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, paddingLeft: 22, fontWeight: 600 }}>
              Patrimoine net réel (CHF, ajusté inflation)
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  {Object.entries(STRATEGIES).map(([key, s]) => (
                    <linearGradient key={key} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month"
                  tickFormatter={(m) => m % xTickInterval === 0 ? `${m / 12}` : ""}
                  tick={{ fill: C.subtle, fontSize: 10, fontFamily: "'DM Mono', monospace" }}
                  axisLine={{ stroke: C.border }} tickLine={false} interval={0}
                  label={{ value: "Années", position: "insideBottomRight", offset: -4, style: { fill: C.subtle, fontSize: 10 } }}
                />
                <YAxis tickFormatter={fmt}
                  tick={{ fill: C.subtle, fontSize: 10, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false} tickLine={false} width={65} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={portfolio} stroke={C.border} strokeDasharray="6 4" />
                {activeStrategies.includes("holdOnly") && <Area type="monotone" dataKey="holdOnly" stroke={STRATEGIES.holdOnly.color} fill="url(#g-holdOnly)" strokeWidth={1.5} dot={false} animationDuration={600} />}
                {activeStrategies.includes("sellToLive") && <Area type="monotone" dataKey="sellToLive" stroke={STRATEGIES.sellToLive.color} fill="url(#g-sellToLive)" strokeWidth={1.5} dot={false} animationDuration={600} />}
                {activeStrategies.includes("classic") && <Area type="monotone" dataKey="classic" stroke={STRATEGIES.classic.color} fill="url(#g-classic)" strokeWidth={2} dot={false} animationDuration={600} />}
                {activeStrategies.includes("lombard") && <Area type="monotone" dataKey="lombard" stroke={STRATEGIES.lombard.color} fill="url(#g-lombard)" strokeWidth={2.5} dot={false} animationDuration={600} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, overflowX: "auto" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontWeight: 600 }}>
              Evolution annuelle (patrimoine net réel)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: C.muted, borderBottom: `2px solid ${C.border}`, fontWeight: 600, fontSize: 10 }}>Année</th>
                  {Object.entries(STRATEGIES).map(([key, s]) => (
                    <th key={key} style={{ textAlign: "right", padding: "8px 10px", color: s.color, borderBottom: `2px solid ${C.border}`, fontWeight: 700, fontSize: 10 }}>{s.name}</th>
                  ))}
                  <th style={{ textAlign: "right", padding: "8px 10px", color: C.orange, borderBottom: `2px solid ${C.border}`, fontWeight: 700, fontSize: 10 }}>Delta L-C</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((d, i) => {
                  const delta = d.lombard - d.classic;
                  return (
                    <tr key={i} style={{ background: i % 2 ? `${C.creme}80` : "transparent" }}>
                      <td style={{ padding: "7px 10px", color: C.muted, fontWeight: 500, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.month / 12}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.orange, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600 }}>{fmtCHF(d.lombard)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.bleu, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtCHF(d.classic)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.rose, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtCHF(d.sellToLive)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: C.ciel, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{fmtCHF(d.holdOnly)}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: delta >= 0 ? C.orange : C.rose, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                        {delta >= 0 ? "+" : ""}{fmtCHF(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, color: C.subtle, lineHeight: 1.7, margin: 0 }}>
              Simulation indicative. Ne constitue pas un conseil en investissement. Le crédit Lombard comporte des risques (margin call, liquidation forcée). Portefeuille diversifié en base CHF.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
