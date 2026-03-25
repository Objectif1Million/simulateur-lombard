import { useState, useMemo, useCallback } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";

/* ── Palette Objectif 1 Million ── */
const C = {
  creme: "#FFF9E9", noir: "#161616", orange: "#F95E01", jaune: "#F9BA39",
  rose: "#F585F1", ciel: "#00A5FA", bleu: "#2D5AFA", muted: "#8a8577",
  border: "#e8e2d4", subtle: "#b5ae9e",
};

const TABS = [
  { id: "compound", label: "Intérêts composés", icon: "📈" },
  { id: "lombard", label: "Simulateur Lombard", icon: "🏦" },
  { id: "emergency", label: "Épargne de précaution", icon: "🛡️" },
  { id: "freedom", label: "Liberté financière", icon: "🎯" },
  { id: "ppa", label: "Pouvoir d'achat", icon: "🌍" },
];

const fmt = (v) => { if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)}k`; return v.toFixed(0); };
const fmtCHF = (v) => `${fmt(v)} CHF`;
const fmtFull = (v) => v.toLocaleString("fr-CH", { maximumFractionDigits: 0 });

const Slider = ({ label, value, onChange, min, max, step, unit, presets, note }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const startEdit = () => { setDraft(String(value)); setEditing(true); };
  const confirm = () => {
    const n = parseFloat(draft.replace(/['']/g, "").replace(",", "."));
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };
  const display = unit === "%" ? `${value}%` : unit === "CHF" ? `${fmtFull(value)} CHF` : unit === "ans" ? `${value} ${value > 1 ? "ans" : "an"}` : unit === "mois" ? `${value} mois` : value;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
        {editing ? (
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={confirm} onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") setEditing(false); }}
            style={{ fontSize: 17, fontWeight: 700, color: C.orange, background: "white", border: `1.5px solid ${C.orange}`, borderRadius: 6, padding: "2px 8px", width: 120, textAlign: "right", outline: "none", fontFamily: "inherit" }}
          />
        ) : (
          <span onClick={startEdit} style={{ fontSize: 17, color: C.noir, fontWeight: 700, cursor: "pointer", borderBottom: `1px dashed ${C.border}`, paddingBottom: 1 }} title="Clique pour éditer">{display}</span>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", height: 5 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: C.subtle }}>{unit === "%" ? `${min}%` : unit === "CHF" ? fmtFull(min) : min}</span>
        <span style={{ fontSize: 10, color: C.subtle }}>{unit === "%" ? `${max}%` : unit === "CHF" ? fmtFull(max) : max}</span>
      </div>
      {presets && (
        <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button key={p.value} onClick={() => onChange(p.value)} style={{
              padding: "3px 10px", fontSize: 10, borderRadius: 20,
              border: value === p.value ? `1.5px solid ${C.orange}` : `1px solid ${C.border}`,
              background: value === p.value ? C.orange + "14" : "transparent",
              color: value === p.value ? C.orange : C.muted, cursor: "pointer",
              fontWeight: value === p.value ? 600 : 400, transition: "all 0.15s",
            }}>{p.label}</button>
          ))}
        </div>
      )}
      {note && <div style={{ fontSize: 10, color: C.subtle, marginTop: 5, fontStyle: "italic" }}>{note}</div>}
    </div>
  );
};

const MetricCard = ({ label, value, sub, accent }) => (
  <div style={{ background: C.creme, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 150, borderTop: `3px solid ${accent || C.border}` }}>
    <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 21, color: accent || C.noir, fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const Panel = ({ title, children }) => (
  <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px 6px", marginBottom: 14 }}>
    <div style={{ fontSize: 10, color: C.orange, textTransform: "uppercase", letterSpacing: 2, marginBottom: 18, fontWeight: 700 }}>{title}</div>
    {children}
  </div>
);

const ChartTooltip = ({ active, payload, formatter }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
      {formatter ? formatter(d, payload) : payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{fmtCHF(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 1: INTÉRÊTS COMPOSÉS
   ═══════════════════════════════════════ */
function CompoundTab() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);

  const data = useMemo(() => {
    const d = []; let total = initial, invested = initial;
    for (let y = 0; y <= years; y++) {
      d.push({ year: y, total: Math.round(total), invested: Math.round(invested), gains: Math.round(total - invested) });
      for (let m = 0; m < 12; m++) { total = total * (1 + rate / 100 / 12) + monthly; invested += monthly; }
    }
    return d;
  }, [initial, monthly, rate, years]);

  const last = data[data.length - 1];
  const multiplier = last.invested > 0 ? (last.total / last.invested).toFixed(1) : "0";

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 310, flexShrink: 0 }}>
        <Panel title="Paramètres">
          <Slider label="Capital initial" value={initial} onChange={setInitial} min={0} max={500000} step={1000} unit="CHF" />
          <Slider label="Versement mensuel" value={monthly} onChange={setMonthly} min={0} max={10000} step={100} unit="CHF" />
          <Slider label="Rendement annuel" value={rate} onChange={setRate} min={0} max={20} step={0.5} unit="%"
            presets={[{ label: "Prudent 4%", value: 4 }, { label: "Modéré 7%", value: 7 }, { label: "Historique 10%", value: 10 }]} />
          <Slider label="Horizon" value={years} onChange={setYears} min={1} max={40} step={1} unit="ans" />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <MetricCard label="Capital final" value={fmtCHF(last.total)} sub={`x${multiplier} sur ton investissement`} accent={C.orange} />
          <MetricCard label="Total investi" value={fmtCHF(last.invested)} sub={`${fmtFull(initial)} initial + ${fmtFull(monthly)}/mois`} accent={C.bleu} />
          <MetricCard label="Gains (intérêts)" value={fmtCHF(last.gains)} sub={`${((last.gains / last.total) * 100).toFixed(0)}% du capital final`} accent={C.jaune} />
        </div>
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 14px 14px 0", marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, paddingLeft: 22, fontWeight: 600 }}>Evolution du capital (CHF)</div>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.orange} stopOpacity={0.2} /><stop offset="100%" stopColor={C.orange} stopOpacity={0.01} /></linearGradient>
                <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.bleu} stopOpacity={0.15} /><stop offset="100%" stopColor={C.bleu} stopOpacity={0.01} /></linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: C.subtle, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fill: C.subtle, fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<ChartTooltip formatter={(d) => (
                <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Année {d.year}</div>
                <div style={{ color: C.orange, fontSize: 12, fontWeight: 700 }}>Total : {fmtCHF(d.total)}</div>
                <div style={{ color: C.bleu, fontSize: 12 }}>Investi : {fmtCHF(d.invested)}</div>
                <div style={{ color: C.jaune, fontSize: 12 }}>Gains : {fmtCHF(d.gains)}</div></div>
              )} />} />
              <Area type="monotone" dataKey="total" stroke={C.orange} fill="url(#gTotal)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="invested" stroke={C.bleu} fill="url(#gInv)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontWeight: 600 }}>Evolution annuelle</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["Année", "Total investi", "Gains", "Capital total"].map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "8px 10px", color: [C.muted, C.bleu, C.jaune, C.orange][i], borderBottom: `2px solid ${C.border}`, fontWeight: 700, fontSize: 10 }}>{h}</th>
            ))}</tr></thead>
            <tbody>{data.filter(d => d.year % (years <= 10 ? 1 : years <= 20 ? 2 : 5) === 0 || d.year === years).map((d, i) => (
              <tr key={i} style={{ background: i % 2 ? `${C.creme}80` : "transparent" }}>
                <td style={{ padding: "7px 10px", color: C.muted, fontSize: 11 }}>{d.year}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: C.bleu, fontSize: 11 }}>{fmtCHF(d.invested)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: C.jaune, fontSize: 11 }}>{fmtCHF(d.gains)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: C.orange, fontSize: 11, fontWeight: 600 }}>{fmtCHF(d.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 2: SIMULATEUR LOMBARD
   ═══════════════════════════════════════ */
const STRATS = { lombard: { name: "Lombard", color: C.orange }, classic: { name: "Classique", color: C.bleu }, sellToLive: { name: "Vendre pour vivre", color: C.rose }, holdOnly: { name: "Hold only", color: C.ciel } };

function LombardTab() {
  const [portfolio, setPortfolio] = useState(50000);
  const [salary, setSalary] = useState(7000);
  const [expenses, setExpenses] = useState(4500);
  const [retAnnual, setRetAnnual] = useState(8);
  const [lombardRate, setLombardRate] = useState(2.5);
  const [ltvTarget, setLtvTarget] = useState(25);
  const [inflation, setInflation] = useState(1);
  const [years, setYears] = useState(10);
  const [active, setActive] = useState(["lombard", "classic", "sellToLive"]);
  const toggle = useCallback((k) => setActive((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]), []);

  const data = useMemo(() => {
    const months = years * 12, retM = retAnnual / 100 / 12, rateM = lombardRate / 100 / 12, d = [];
    let lP = portfolio, lD = 0, lI = 0, cP = portfolio, sP = portfolio, hP = portfolio;
    for (let m = 0; m <= months; m++) {
      const df = Math.pow(1 + inflation / 100, m / 12);
      d.push({ month: m, lombard: (lP-lD-lI)/df, classic: cP/df, sellToLive: Math.max(0,sP)/df, holdOnly: hP/df, lombardDebt: lD+lI, lombardLTV: lP>0?(lD+lI)/lP:0 });
      if (m === months) break;
      const eP = (lP+salary)*(1+retM), eI = lI+(lD+expenses/2)*rateM, room = (ltvTarget/100)*eP-lD-eI;
      const dep = Math.min(expenses, Math.max(0, room)), sal = salary-(expenses-dep);
      lP = lP+sal+(lP+sal)*retM; lD += dep; lI += (lD-dep/2)*rateM;
      const sur = salary-expenses; cP = cP+sur+(cP+sur)*retM; sP = sP+sP*retM-expenses; if(sP<0)sP=0; hP = hP+hP*retM;
    }
    return d;
  }, [portfolio, salary, expenses, retAnnual, lombardRate, ltvTarget, inflation, years]);

  const chartData = useMemo(() => { if (data.length<=120) return data; const s=Math.max(1,Math.floor(data.length/200)); return data.filter((_,i)=>i%s===0||i===data.length-1); }, [data]);
  const last = data[data.length-1], gain = last.lombard-last.classic, gainPct = last.classic>0?((gain/last.classic)*100).toFixed(1):"0";
  const xTick = years<=5?12:years<=15?24:years<=30?60:120;

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 310, flexShrink: 0 }}>
        <Panel title="Portefeuille">
          <Slider label="Valeur initiale" value={portfolio} onChange={setPortfolio} min={0} max={5000000} step={5000} unit="CHF" />
          <Slider label="Salaire net / mois" value={salary} onChange={setSalary} min={0} max={50000} step={250} unit="CHF" />
          <Slider label="Dépenses / mois" value={expenses} onChange={setExpenses} min={0} max={50000} step={250} unit="CHF" />
        </Panel>
        <Panel title="Hypothèses">
          <Slider label="Rendement annuel" value={retAnnual} onChange={setRetAnnual} min={-20} max={50} step={1} unit="%"
            presets={[{label:"Bear -10%",value:-10},{label:"Flat 0%",value:0},{label:"Modéré 5%",value:5},{label:"Central 10%",value:10}]} />
          <Slider label="Taux Lombard" value={lombardRate} onChange={setLombardRate} min={0.5} max={8} step={0.1} unit="%"
            presets={[{label:"SARON 1.5%",value:1.5},{label:"Banque privée 2.5%",value:2.5},{label:"Retail 4%",value:4}]} />
          <Slider label="LTV cible" value={ltvTarget} onChange={setLtvTarget} min={5} max={60} step={1} unit="%" note="% max dette / portefeuille" />
          <Slider label="Inflation" value={inflation} onChange={setInflation} min={0} max={10} step={0.5} unit="%" />
          <Slider label="Horizon" value={years} onChange={setYears} min={1} max={40} step={1} unit="ans" />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <MetricCard label="Lombard" value={fmtCHF(last.lombard)} sub={`${gain>=0?"+":""}${fmtCHF(gain)} vs classique (${gain>=0?"+":""}${gainPct}%)`} accent={C.orange} />
          <MetricCard label="Classique" value={fmtCHF(last.classic)} sub="Surplus investi" accent={C.bleu} />
          <MetricCard label="LTV final" value={`${(last.lombardLTV*100).toFixed(1)}%`} sub={`Dette: ${fmtCHF(last.lombardDebt)}`} accent={last.lombardLTV>0.4?C.rose:last.lombardLTV>0.25?C.jaune:C.orange} />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
          {Object.entries(STRATS).map(([k,s])=>(<button key={k} onClick={()=>toggle(k)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 16px",borderRadius:24,border:active.includes(k)?`1.5px solid ${s.color}`:`1px solid ${C.border}`,background:active.includes(k)?s.color+"12":"transparent",color:active.includes(k)?s.color:C.subtle,cursor:"pointer",fontSize:12,fontWeight:active.includes(k)?600:400,transition:"all 0.2s"}}><div style={{width:8,height:8,borderRadius:"50%",background:active.includes(k)?s.color:C.border}}/>{s.name}</button>))}
        </div>
        <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 14px 14px 0" }}>
          <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,paddingLeft:22,fontWeight:600}}>Patrimoine net réel (ajusté inflation)</div>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{top:10,right:10,left:10,bottom:0}}>
              <defs>{Object.entries(STRATS).map(([k,s])=>(<linearGradient key={k} id={`gl-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity={0.18}/><stop offset="100%" stopColor={s.color} stopOpacity={0.01}/></linearGradient>))}</defs>
              <XAxis dataKey="month" tickFormatter={(m)=>m%xTick===0?`${m/12}`:""} tick={{fill:C.subtle,fontSize:10}} axisLine={{stroke:C.border}} tickLine={false} interval={0}/>
              <YAxis tickFormatter={fmt} tick={{fill:C.subtle,fontSize:10}} axisLine={false} tickLine={false} width={65}/>
              <Tooltip content={<ChartTooltip formatter={(d,payload)=>(<div><div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>Année {Math.floor(d.month/12)}</div>{payload.map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><div style={{width:6,height:6,borderRadius:"50%",background:p.color}}/><span style={{fontSize:12,color:p.color,fontWeight:700}}>{fmtCHF(p.value)}</span></div>))}<div style={{fontSize:10,color:C.subtle,marginTop:4,borderTop:`1px solid ${C.border}`,paddingTop:4}}>LTV: {(d.lombardLTV*100).toFixed(1)}%</div></div>)}/>}/>
              <ReferenceLine y={portfolio} stroke={C.border} strokeDasharray="6 4"/>
              {active.includes("holdOnly")&&<Area type="monotone" dataKey="holdOnly" stroke={STRATS.holdOnly.color} fill="url(#gl-holdOnly)" strokeWidth={1.5} dot={false}/>}
              {active.includes("sellToLive")&&<Area type="monotone" dataKey="sellToLive" stroke={STRATS.sellToLive.color} fill="url(#gl-sellToLive)" strokeWidth={1.5} dot={false}/>}
              {active.includes("classic")&&<Area type="monotone" dataKey="classic" stroke={STRATS.classic.color} fill="url(#gl-classic)" strokeWidth={2} dot={false}/>}
              {active.includes("lombard")&&<Area type="monotone" dataKey="lombard" stroke={STRATS.lombard.color} fill="url(#gl-lombard)" strokeWidth={2.5} dot={false}/>}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 3: ÉPARGNE DE PRÉCAUTION
   ═══════════════════════════════════════ */
function EmergencyTab() {
  const [monthlyExp, setMonthlyExp] = useState(4500);
  const [targetMonths, setTargetMonths] = useState(6);
  const [currentSavings, setCurrentSavings] = useState(5000);
  const [monthlySaving, setMonthlySaving] = useState(500);

  const target = monthlyExp * targetMonths;
  const remaining = Math.max(0, target - currentSavings);
  const monthsToGoal = monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : Infinity;
  const progress = Math.min(100, (currentSavings / target) * 100);

  const milestones = [
    { label: "1'000 CHF (urgence)", value: 1000 },
    { label: `${fmtFull(monthlyExp)} (1 mois)`, value: monthlyExp },
    { label: `${fmtFull(monthlyExp * 3)} (3 mois)`, value: monthlyExp * 3 },
    { label: `${fmtFull(target)} (${targetMonths} mois)`, value: target },
  ];

  const data = useMemo(() => {
    const d = []; let bal = currentSavings;
    for (let m = 0; m <= Math.min(monthsToGoal + 6, 60); m++) {
      d.push({ month: m, balance: Math.min(bal, target), target });
      bal += monthlySaving;
    }
    return d;
  }, [currentSavings, monthlySaving, target, monthsToGoal]);

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 310, flexShrink: 0 }}>
        <Panel title="Ta situation">
          <Slider label="Dépenses mensuelles" value={monthlyExp} onChange={setMonthlyExp} min={1000} max={20000} step={250} unit="CHF" />
          <Slider label="Objectif (en mois)" value={targetMonths} onChange={setTargetMonths} min={1} max={12} step={1} unit="mois"
            presets={[{ label: "3 mois (minimum)", value: 3 }, { label: "6 mois (idéal)", value: 6 }]} />
          <Slider label="Épargne actuelle" value={currentSavings} onChange={setCurrentSavings} min={0} max={200000} step={500} unit="CHF" />
          <Slider label="Épargne mensuelle" value={monthlySaving} onChange={setMonthlySaving} min={0} max={5000} step={50} unit="CHF" />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <MetricCard label="Objectif" value={`${fmtFull(target)} CHF`} sub={`${targetMonths} mois de dépenses`} accent={C.orange} />
          <MetricCard label="Il te reste" value={remaining > 0 ? `${fmtFull(remaining)} CHF` : "Objectif atteint"} sub={remaining > 0 && monthlySaving > 0 ? `~${monthsToGoal} mois à ${fmtFull(monthlySaving)}/mois` : ""} accent={remaining > 0 ? C.bleu : C.orange} />
          <MetricCard label="Progression" value={`${progress.toFixed(0)}%`} accent={progress >= 100 ? C.orange : progress >= 50 ? C.jaune : C.rose} />
        </div>
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontWeight: 600 }}>Paliers</div>
          {milestones.map((m, i) => {
            const pct = Math.min(100, (currentSavings / m.value) * 100);
            const done = currentSavings >= m.value;
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: done ? C.orange : C.muted, fontWeight: done ? 600 : 400 }}>{done ? "✓ " : ""}{m.label}</span>
                  <span style={{ fontSize: 11, color: C.subtle }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: done ? C.orange : C.jaune, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>
        {remaining > 0 && monthlySaving > 0 && (
          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 14px 14px 0" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, paddingLeft: 22, fontWeight: 600 }}>Trajectoire vers l'objectif</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs><linearGradient id="gEm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.orange} stopOpacity={0.2} /><stop offset="100%" stopColor={C.orange} stopOpacity={0.01} /></linearGradient></defs>
                <XAxis dataKey="month" tick={{ fill: C.subtle, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} label={{ value: "Mois", position: "insideBottomRight", offset: -4, style: { fill: C.subtle, fontSize: 10 } }} />
                <YAxis tickFormatter={fmt} tick={{ fill: C.subtle, fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                <ReferenceLine y={target} stroke={C.orange} strokeDasharray="6 4" />
                <Area type="monotone" dataKey="balance" stroke={C.orange} fill="url(#gEm)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 4: LIBERTÉ FINANCIÈRE
   ═══════════════════════════════════════ */
function FreedomTab() {
  const [portfolio, setPortfolio] = useState(50000);
  const [monthlyInvest, setMonthlyInvest] = useState(2500);
  const [monthlyExp, setMonthlyExp] = useState(4500);
  const [rate, setRate] = useState(8);
  const [withdrawRate, setWithdrawRate] = useState(4);
  const [inflation, setInflation] = useState(1);

  const fireTarget = (monthlyExp * 12) / (withdrawRate / 100);

  const result = useMemo(() => {
    const d = []; let p = portfolio, fy = null;
    for (let y = 0; y <= 50; y++) {
      const rt = fireTarget * Math.pow(1 + inflation / 100, y);
      const free = p >= rt;
      if (free && fy === null) fy = y;
      d.push({ year: y, portfolio: Math.round(p), target: Math.round(rt), free });
      p = (p + monthlyInvest * 12) * (1 + rate / 100);
    }
    return { data: d, freedomYear: fy };
  }, [portfolio, monthlyInvest, rate, fireTarget, inflation]);

  const { data: chartData, freedomYear } = result;

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 310, flexShrink: 0 }}>
        <Panel title="Ta situation">
          <Slider label="Portefeuille actuel" value={portfolio} onChange={setPortfolio} min={0} max={2000000} step={5000} unit="CHF" />
          <Slider label="Investissement mensuel" value={monthlyInvest} onChange={setMonthlyInvest} min={0} max={10000} step={100} unit="CHF" />
          <Slider label="Dépenses mensuelles" value={monthlyExp} onChange={setMonthlyExp} min={1000} max={20000} step={250} unit="CHF" />
        </Panel>
        <Panel title="Hypothèses">
          <Slider label="Rendement annuel" value={rate} onChange={setRate} min={0} max={15} step={0.5} unit="%"
            presets={[{ label: "Prudent 5%", value: 5 }, { label: "Modéré 7%", value: 7 }, { label: "Historique 10%", value: 10 }]} />
          <Slider label="Taux de retrait" value={withdrawRate} onChange={setWithdrawRate} min={2} max={6} step={0.5} unit="%"
            presets={[{ label: "Prudent 3%", value: 3 }, { label: "Standard 4%", value: 4 }, { label: "Agressif 5%", value: 5 }]}
            note="Règle des 4% : tu retires 4% par an sans épuiser ton capital" />
          <Slider label="Inflation" value={inflation} onChange={setInflation} min={0} max={5} step={0.5} unit="%" />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <MetricCard label="Ton FIRE number" value={fmtCHF(fireTarget)} sub={`${fmtFull(monthlyExp * 12)} CHF/an ÷ ${withdrawRate}%`} accent={C.orange} />
          <MetricCard label="Liberté financière dans" value={freedomYear !== null && freedomYear <= 50 ? `${freedomYear} ans` : "> 50 ans"} sub={freedomYear !== null && freedomYear <= 50 ? `Vers ${new Date().getFullYear() + freedomYear}` : "Ajuste tes paramètres"} accent={freedomYear !== null && freedomYear <= 50 ? (freedomYear <= 10 ? C.orange : freedomYear <= 20 ? C.jaune : C.bleu) : C.rose} />
          <MetricCard label="Progression" value={`${Math.min(100, (portfolio / fireTarget) * 100).toFixed(0)}%`} sub={`${fmtCHF(portfolio)} / ${fmtCHF(fireTarget)}`} accent={C.bleu} />
        </div>
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 14px 14px 0", marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, paddingLeft: 22, fontWeight: 600 }}>Portefeuille vs objectif FIRE (CHF)</div>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData.slice(0, freedomYear !== null ? Math.min(freedomYear + 10, 50) : 50)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs><linearGradient id="gFP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.orange} stopOpacity={0.2} /><stop offset="100%" stopColor={C.orange} stopOpacity={0.01} /></linearGradient></defs>
              <XAxis dataKey="year" tick={{ fill: C.subtle, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} label={{ value: "Années", position: "insideBottomRight", offset: -4, style: { fill: C.subtle, fontSize: 10 } }} />
              <YAxis tickFormatter={fmt} tick={{ fill: C.subtle, fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<ChartTooltip formatter={(d) => (
                <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Année {d.year}</div>
                <div style={{ color: C.orange, fontSize: 12, fontWeight: 700 }}>Portefeuille : {fmtCHF(d.portfolio)}</div>
                <div style={{ color: C.rose, fontSize: 12 }}>Objectif FIRE : {fmtCHF(d.target)}</div>
                <div style={{ color: d.free ? C.orange : C.subtle, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{d.free ? "Libre !" : `${((d.portfolio / d.target) * 100).toFixed(0)}% de l'objectif`}</div></div>
              )} />} />
              {freedomYear !== null && <ReferenceLine x={freedomYear} stroke={C.orange} strokeDasharray="4 4" />}
              <Area type="monotone" dataKey="target" stroke={C.rose} fill="none" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
              <Area type="monotone" dataKey="portfolio" stroke={C.orange} fill="url(#gFP)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontWeight: 600 }}>Sensibilité : quand es-tu libre ?</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>
              <th style={{ textAlign: "left", padding: "8px 10px", color: C.muted, borderBottom: `2px solid ${C.border}`, fontSize: 10, fontWeight: 600 }}>Investissement</th>
              {[4, 6, 8, 10].map(r => (<th key={r} style={{ textAlign: "center", padding: "8px 10px", color: C.bleu, borderBottom: `2px solid ${C.border}`, fontSize: 10, fontWeight: 600 }}>Rdt {r}%</th>))}
            </tr></thead>
            <tbody>
              {[500, 1000, 1500, 2000, 2500, 3000, 4000, 5000].map((inv, i) => (
                <tr key={i} style={{ background: i % 2 ? `${C.creme}80` : "transparent" }}>
                  <td style={{ padding: "7px 10px", color: C.muted, fontSize: 11 }}>{fmtFull(inv)} CHF/mois</td>
                  {[4, 6, 8, 10].map(r => {
                    let p = portfolio, yr = null;
                    for (let y = 1; y <= 50; y++) { p = (p + inv * 12) * (1 + r / 100); if (p >= fireTarget * Math.pow(1 + inflation / 100, y)) { yr = y; break; } }
                    return (<td key={r} style={{ padding: "7px 10px", textAlign: "center", fontSize: 11, fontWeight: inv === monthlyInvest ? 700 : 400, color: yr && yr <= 15 ? C.orange : yr && yr <= 25 ? C.jaune : C.subtle }}>{yr ? `${yr} ans` : "> 50"}</td>);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB 5: POUVOIR D'ACHAT
   ═══════════════════════════════════════ */
const PPA_COUNTRIES = [
  { name: "Norvège", flag: "🇳🇴", region: "Europe", city: "Oslo", ratio: 0.88 },
  { name: "Danemark", flag: "🇩🇰", region: "Europe", city: "Copenhague", ratio: 0.83 },
  { name: "Islande", flag: "🇮🇸", region: "Europe", city: "Reykjavik", ratio: 0.82 },
  { name: "Luxembourg", flag: "🇱🇺", region: "Europe", city: "Luxembourg", ratio: 0.78 },
  { name: "Royaume-Uni", flag: "🇬🇧", region: "Europe", city: "Londres", ratio: 0.68 },
  { name: "France", flag: "🇫🇷", region: "Europe", city: "Paris", ratio: 0.63 },
  { name: "Allemagne", flag: "🇩🇪", region: "Europe", city: "Munich", ratio: 0.60 },
  { name: "Pays-Bas", flag: "🇳🇱", region: "Europe", city: "Amsterdam", ratio: 0.65 },
  { name: "Espagne", flag: "🇪🇸", region: "Europe", city: "Madrid", ratio: 0.47 },
  { name: "Italie", flag: "🇮🇹", region: "Europe", city: "Milan", ratio: 0.50 },
  { name: "Portugal", flag: "🇵🇹", region: "Europe", city: "Lisbonne", ratio: 0.38 },
  { name: "Pologne", flag: "🇵🇱", region: "Europe", city: "Varsovie", ratio: 0.32 },
  { name: "Hongrie", flag: "🇭🇺", region: "Europe", city: "Budapest", ratio: 0.30 },
  { name: "USA (NYC)", flag: "🇺🇸", region: "Amériques", city: "New York", ratio: 0.75 },
  { name: "USA (Miami)", flag: "🇺🇸", region: "Amériques", city: "Miami", ratio: 0.60 },
  { name: "Canada", flag: "🇨🇦", region: "Amériques", city: "Toronto", ratio: 0.53 },
  { name: "Mexique", flag: "🇲🇽", region: "Amériques", city: "Mexico City", ratio: 0.27 },
  { name: "Colombie", flag: "🇨🇴", region: "Amériques", city: "Bogotá", ratio: 0.22 },
  { name: "Brésil", flag: "🇧🇷", region: "Amériques", city: "São Paulo", ratio: 0.26 },
  { name: "Singapour", flag: "🇸🇬", region: "Asie-Pacifique", city: "Singapour", ratio: 0.68 },
  { name: "Australie", flag: "🇦🇺", region: "Asie-Pacifique", city: "Sydney", ratio: 0.63 },
  { name: "Japon", flag: "🇯🇵", region: "Asie-Pacifique", city: "Tokyo", ratio: 0.52 },
  { name: "Corée du Sud", flag: "🇰🇷", region: "Asie-Pacifique", city: "Séoul", ratio: 0.48 },
  { name: "Thaïlande", flag: "🇹🇭", region: "Asie-Pacifique", city: "Bangkok", ratio: 0.25 },
  { name: "Vietnam", flag: "🇻🇳", region: "Asie-Pacifique", city: "Hô-Chi-Minh", ratio: 0.20 },
  { name: "Philippines", flag: "🇵🇭", region: "Asie-Pacifique", city: "Manille", ratio: 0.20 },
  { name: "Émirats Arabes", flag: "🇦🇪", region: "Moyen-Orient / Afrique", city: "Dubaï", ratio: 0.58 },
  { name: "Maroc", flag: "🇲🇦", region: "Moyen-Orient / Afrique", city: "Marrakech", ratio: 0.22 },
  { name: "Afrique du Sud", flag: "🇿🇦", region: "Moyen-Orient / Afrique", city: "Cape Town", ratio: 0.23 },
];

const PPA_REGIONS = ["Tous", "Europe", "Amériques", "Asie-Pacifique", "Moyen-Orient / Afrique"];

function PPATab() {
  const [budget, setBudget] = useState(10000);
  const [region, setRegion] = useState("Tous");
  const [sort, setSort] = useState("ratio-asc");
  const [view, setView] = useState("cost");

  const swissFire = budget * 12 * 25;

  const filtered = PPA_COUNTRIES
    .filter((c) => region === "Tous" || c.region === region)
    .sort((a, b) => {
      if (sort === "ratio-asc") return a.ratio - b.ratio;
      if (sort === "ratio-desc") return b.ratio - a.ratio;
      return a.name.localeCompare(b.name);
    });

  const getCat = (ratio) => {
    if (ratio >= 0.75) return { label: "Comparable", bg: C.border, text: C.noir };
    if (ratio >= 0.50) return { label: "Modéré", bg: C.jaune + "30", text: "#856404" };
    if (ratio >= 0.30) return { label: "Significatif", bg: C.ciel + "25", text: "#084298" };
    return { label: "Très avantageux", bg: C.orange + "20", text: C.orange };
  };

  const fmtM = (val) => { if (val >= 1e6) return `${(val / 1e6).toFixed(2).replace(".", "'")} M CHF`; return `${Math.round(val / 1000)}k CHF`; };
  const fmtBudget = (val) => val.toLocaleString("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });

  return (
    <div>
      {/* Budget slider */}
      <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <Slider label="Ton budget mensuel en Suisse" value={budget} onChange={setBudget} min={2000} max={30000} step={500} unit="CHF" />
      </div>

      {/* Toggle cost / FIRE */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 99, overflow: "hidden", width: "fit-content" }}>
        {[["cost", "Coût mensuel"], ["fire", "Capital FIRE (règle des 4%)"]].map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={{
            padding: "8px 20px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: view === k ? C.noir : "white", color: view === k ? C.creme : C.muted, transition: "all .15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Swiss FIRE banner */}
      {view === "fire" && (
        <div style={{ background: C.noir, color: C.creme, borderRadius: 14, padding: "16px 22px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, marginBottom: 4 }}>Ton capital FIRE en Suisse</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{fmtM(swissFire)}</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, maxWidth: 280, lineHeight: 1.6 }}>
            {fmtBudget(budget)}/mois x 12 x 25<br />Vois ci-dessous combien tu économises en changeant de pays.
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        {PPA_REGIONS.map((r) => (
          <button key={r} onClick={() => setRegion(r)} style={{
            padding: "6px 14px", borderRadius: 99,
            border: region === r ? `1.5px solid ${C.orange}` : `1px solid ${C.border}`,
            background: region === r ? C.orange + "14" : "transparent",
            color: region === r ? C.orange : C.muted, fontSize: 11, fontWeight: region === r ? 600 : 400,
            cursor: "pointer", transition: "all .15s",
          }}>{r}</button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
          marginLeft: "auto", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
          fontSize: 11, color: C.muted, background: "white", cursor: "pointer",
        }}>
          <option value="ratio-asc">Moins cher d'abord</option>
          <option value="ratio-desc">Plus cher d'abord</option>
          <option value="alpha">Alphabétique</option>
        </select>
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {filtered.map((c) => {
          const equiv = Math.round(budget * c.ratio / 100) * 100;
          const savings = budget - equiv;
          const fire = equiv * 12 * 25;
          const fireSavings = swissFire - fire;
          const cat = getCat(c.ratio);
          const barW = Math.round(c.ratio * 100);
          const barColor = c.ratio >= 0.75 ? C.rose : c.ratio >= 0.50 ? C.jaune : c.ratio >= 0.30 ? C.ciel : C.orange;

          return (
            <div key={c.name + c.city} style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 20 }}>{c.flag}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2, color: C.noir }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.subtle }}>{c.city}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5, padding: "3px 8px", borderRadius: 99, background: cat.bg, color: cat.text, whiteSpace: "nowrap" }}>{cat.label}</span>
              </div>
              <div>
                {view === "cost" ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.noir, lineHeight: 1 }}>{fmtBudget(equiv)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{savings > 0 ? `Tu économises ${fmtBudget(savings)} / mois` : "Coût similaire à la Suisse"}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.noir, lineHeight: 1 }}>{fmtM(fire)}</div>
                    <div style={{ fontSize: 11, color: C.orange, marginTop: 2, fontWeight: 600 }}>{fireSavings > 0 ? `${fmtM(fireSavings)} de moins qu'en Suisse` : "Similaire à la Suisse"}</div>
                    <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>{fmtBudget(equiv)}/mois · 4% rule</div>
                  </>
                )}
              </div>
              <div style={{ background: C.border, borderRadius: 99, height: 4, overflow: "hidden" }}>
                <div style={{ width: `${barW}%`, height: "100%", borderRadius: 99, background: barColor, transition: "width .4s ease" }} />
              </div>
              <div style={{ fontSize: 10, color: C.subtle, textAlign: "right", marginTop: -6 }}>{Math.round(c.ratio * 100)}% du coût suisse</div>
            </div>
          );
        })}
      </div>

      {/* Methodology */}
      <div style={{ marginTop: 24, padding: "14px 18px", background: "white", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
        <strong style={{ color: C.noir, display: "block", marginBottom: 4 }}>Méthodologie</strong>
        Ratios calculés à partir des indices de coût de la vie Numbeo (Q1 2025) et des données PPP de l'OCDE. Ils reflètent un panier moyen incluant logement, alimentation, transport, loisirs. Les chiffres sont des estimations indicatives.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState("compound");
  const Content = { compound: CompoundTab, lombard: LombardTab, emergency: EmergencyTab, freedom: FreedomTab, ppa: PPATab }[tab];
  
  return (
    <div style={{ minHeight: "100vh", background: C.creme, color: C.noir, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', -apple-system, sans-serif; }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: ${C.border}; border-radius: 10px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${C.orange}; cursor: pointer; box-shadow: 0 0 0 3px ${C.creme}, 0 0 0 5px ${C.orange}30; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
      <div style={{ padding: "28px 36px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.creme, fontWeight: 800, fontSize: 11 }}>O1M</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Boîte à outils</h1>
          </div>
          <a href="https://objectif1m.substack.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: C.noir, borderRadius: 20, textDecoration: "none", color: C.creme, fontSize: 12, fontWeight: 600 }}>Objectif 1 Million</a>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              border: "none", borderBottom: tab === t.id ? `3px solid ${C.orange}` : "3px solid transparent",
              background: "transparent", color: tab === t.id ? C.noir : C.muted,
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 24 }} />
      </div>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 36px 48px" }}>
        <Content />
        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 10, color: C.subtle, lineHeight: 1.7, margin: 0 }}>Simulations indicatives. Ne constituent pas un conseil en investissement. Les performances passées ne préjugent pas des performances futures.</p>
        </div>
      </div>
    </div>
  );
}
