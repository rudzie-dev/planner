// ─────────────────────────────────────────────────────────────────────────────
//  PLANNER  ·  Week / Month / Year / Years
//  Supabase: zzusfrkayacwucjfwhcz
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zzusfrkayacwucjfwhcz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dXNmcmtheWFjd3VjamZ3aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MjEyOTcsImV4cCI6MjA4ODQ5NzI5N30.CgQfo-og5jMXjO4izztHMIGsMKfYCKxU9i6xCHhgBnE"
);

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  font:   "'DM Sans', sans-serif",
  dim:    "rgba(255,255,255,0.28)",
  dimmer: "rgba(255,255,255,0.12)",
  faint:  "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  hover:  "rgba(255,255,255,0.07)",
  glass:  "rgba(255,255,255,0.04)",
  p:      { high:"rgba(255,110,110,0.75)", med:"rgba(255,210,90,0.65)", low:"rgba(120,255,160,0.55)" },
};

const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const EMPTY_DB  = {};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
// Returns 0=Mon … 6=Sun for any Date object
function weekdayIdx(date) {
  const d = date.getDay(); // JS: 0=Sun,1=Mon…6=Sat
  return d === 0 ? 6 : d - 1;
}

// Returns array of {y,m,d,name} for Mon–Sun of the week containing `date`
function getWeekDates(date) {
  const idx  = weekdayIdx(date);
  const base = new Date(date);
  base.setDate(date.getDate() - idx);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(base);
    x.setDate(base.getDate() + i);
    return { y: x.getFullYear(), m: x.getMonth() + 1, d: x.getDate(), name: WEEK_DAYS[i] };
  });
}

function getMonthTaskCount(db, year, month) {
  let n = 0;
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) n += (db?.[year]?.[month]?.[d]?.length ?? 0);
  return n;
}
function getMonthDone(db, year, month) {
  let n = 0;
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) n += (db?.[year]?.[month]?.[d]?.filter(t => t.done).length ?? 0);
  return n;
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes meshDrift {
    0%,100% { opacity:1; transform:scale(1) translate(0,0); }
    33%      { opacity:0.7; transform:scale(1.08) translate(2%,1%); }
    66%      { opacity:0.85; transform:scale(0.96) translate(-1%,2%); }
  }

  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  html,body,#root { width:100%; height:100%; overflow:hidden; font-family:'DM Sans',sans-serif; color:#fff; background:#07070d; }
  ::-webkit-scrollbar { display:none; }

  .bg-gradient {
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background: linear-gradient(125deg,
      #07070d 0%,
      #0c0c18 18%,
      #0f0f1e 35%,
      #0a0a14 52%,
      #0d0d1a 68%,
      #080810 85%,
      #07070d 100%
    );
    background-size: 300% 300%;
    animation: gradientShift 34s ease infinite;
  }
  .bg-gradient::before {
    content:'';
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse 90% 70% at 15% 15%, rgba(255,255,255,0.025) 0%, transparent 65%),
      radial-gradient(ellipse 70% 90% at 85% 85%, rgba(255,255,255,0.02) 0%, transparent 65%),
      radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,255,255,0.01) 0%, transparent 75%);
    animation: meshDrift 46s ease-in-out infinite;
  }
  .bg-gradient::after {
    content:'';
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse 60% 40% at 80% 20%, rgba(255,255,255,0.018) 0%, transparent 60%),
      radial-gradient(ellipse 40% 60% at 20% 80%, rgba(255,255,255,0.015) 0%, transparent 60%);
    animation: meshDrift 38s ease-in-out infinite reverse;
  }
`;

// ─── SHARED UI ────────────────────────────────────────────────────────────────
// ─── BACKGROUND ───────────────────────────────────────────────────────────────
function GradientBg() {
  return <div className="bg-gradient"/>;
}

function Panel({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "rgba(255,255,255,0.038)",
      border: "1px solid rgba(255,255,255,0.09)",
      backdropFilter: "blur(40px) saturate(160%)",
      WebkitBackdropFilter: "blur(40px) saturate(160%)",
      borderRadius: 18,
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>

      {children}
    </div>
  );
}

function Lbl({ children, style = {} }) {
  return (
    <div style={{
      fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
      color:T.dim, fontWeight:500, fontFamily:T.font, marginBottom:12, ...style,
    }}>{children}</div>
  );
}

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width:26, height:26, borderRadius:7, border:`1px solid ${T.border}`,
      background:T.faint, color:T.dim, fontSize:14, cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:T.font, transition:"all 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = T.hover; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = T.faint; e.currentTarget.style.color = T.dim; }}
    >{children}</button>
  );
}

function ViewLayer({ children, visible }) {
  return (
    <div style={{
      position:"absolute", inset:0,
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1)" : "scale(0.94)",
      transition: "opacity 0.36s ease, transform 0.36s ease",
      pointerEvents: visible ? "auto" : "none",
      zIndex: visible ? 1 : 0,
    }}>
      {children}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen() {
  const [loading, setLoading] = useState(null);

  async function signIn(provider) {
    setLoading(provider);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.error("OAuth error:", err);
      setLoading(null);
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center", background:"#000",
    }}>
      <GradientBg/>
      <Panel style={{ padding:"44px 48px", width:340, zIndex:1, textAlign:"center" }}>
        <div style={{ fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", color:T.dim, marginBottom:28, fontFamily:T.font }}>Planner</div>
        <div style={{ fontSize:28, fontWeight:300, color:"#fff", fontFamily:T.font, letterSpacing:"-0.02em", lineHeight:1, marginBottom:8 }}>Welcome back</div>
        <div style={{ fontSize:12, color:T.dim, fontFamily:T.font, marginBottom:36 }}>Sign in to access your planner</div>
        {[
          { p:"google", label:"Continue with Google", icon:"G" },
          { p:"github", label:"Continue with GitHub",  icon:"⌥" },
        ].map(({ p, label, icon }) => (
          <button key={p} onClick={() => signIn(p)} style={{
            width:"100%", padding:"12px 20px", marginBottom:10, borderRadius:11,
            background:T.hover, border:`1px solid ${T.border}`,
            color:loading===p ? T.dim : "rgba(255,255,255,0.78)",
            fontSize:13, fontFamily:T.font, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = T.hover}
          >
            <span style={{ fontWeight:600, fontSize:14, opacity:0.6 }}>{icon}</span>
            {loading === p ? "Redirecting…" : label}
          </button>
        ))}
      </Panel>
    </div>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
const VIEWS = ["Week","Month","Year","Years"];

function TopBar({ view, setView, user, onSignOut, cursor }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"2px 2px 6px" }}>
      <span style={{ fontSize:12, fontWeight:500, color:"rgba(255,255,255,0.75)", fontFamily:T.font }}>Planner</span>

      <div style={{ display:"flex", gap:2, background:T.faint, border:`1px solid ${T.border}`, borderRadius:10, padding:3 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:"5px 14px", borderRadius:8, border:"none", cursor:"pointer",
            background: view===v ? "rgba(255,255,255,0.1)" : "transparent",
            color: view===v ? "rgba(255,255,255,0.85)" : T.dim,
            fontSize:11, fontFamily:T.font, fontWeight:view===v?500:400, transition:"all 0.18s",
          }}>{v}</button>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:10, color:T.dimmer, fontFamily:T.font, letterSpacing:"0.12em", textTransform:"uppercase" }}>{cursor}</span>
        {user && (
          <button onClick={onSignOut} style={{
            fontSize:10, color:T.dimmer, background:"none", border:`1px solid ${T.border}`,
            borderRadius:7, padding:"4px 10px", cursor:"pointer", fontFamily:T.font, transition:"all 0.15s",
          }}>Sign out</button>
        )}
      </div>
    </div>
  );
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:11, padding:"9px 10px", borderRadius:9,
        background: hov ? T.hover : "transparent", cursor:"pointer", transition:"background 0.14s",
      }}
    >
      <div style={{
        width:14, height:14, borderRadius:4, flexShrink:0,
        border: `1.5px solid ${task.done ? "transparent" : "rgba(255,255,255,0.2)"}`,
        background: task.done ? "rgba(255,255,255,0.78)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
      }}>
        {task.done && <span style={{ fontSize:8, color:"#000", fontWeight:700, lineHeight:1 }}>✓</span>}
      </div>
      <span style={{
        flex:1, fontSize:12, fontFamily:T.font, fontWeight:400,
        color: task.done ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.72)",
        textDecoration: task.done ? "line-through" : "none", transition:"color 0.18s",
      }}>{task.title}</span>
      <div style={{ width:5, height:5, borderRadius:"50%", background:T.p[task.priority], flexShrink:0, opacity:task.done?0.3:1 }}/>
    </div>
  );
}

// ─── ADD TASK ─────────────────────────────────────────────────────────────────
function AddTask({ dateObj, onAdd, userId }) {
  const [open, setOpen]   = useState(false);
  const [val, setVal]     = useState("");
  const [prio, setPrio]   = useState("med");

  async function submit() {
    const title = val.trim();
    if (!title) return;
    const dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2,"0")}-${String(dateObj.d).padStart(2,"0")}`;
    const optimisticId = `opt-${Date.now()}`;
    // Immediately show in UI
    onAdd({ id:optimisticId, title, priority:prio, done:false, date:dateStr });
    setVal(""); setOpen(false);
    // Persist
    const { data, error } = await supabase
      .from("tasks")
      .insert([{ title, priority:prio, done:false, date:dateStr, user_id:userId }])
      .select().single();
    if (error) { console.error("Insert error:", error); return; }
    // Replace optimistic id with real uuid
    onAdd({ id:data.id, title, priority:prio, done:false, date:dateStr, _replaceId:optimisticId });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width:"100%", marginTop:10, padding:"9px 12px", borderRadius:9,
      border:`1px dashed ${T.border}`, background:"transparent",
      color:T.dimmer, fontSize:11, fontFamily:T.font, cursor:"pointer",
      textAlign:"left", transition:"all 0.15s", letterSpacing:"0.04em",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.18)"; e.currentTarget.style.color=T.dim; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.dimmer; }}
    >+ Add task</button>
  );

  return (
    <div style={{ marginTop:10, background:T.faint, border:`1px solid ${T.border}`, borderRadius:11, padding:"12px 14px" }}>
      <input
        value={val} onChange={e => setVal(e.target.value)} autoFocus
        placeholder="Task name…"
        onKeyDown={e => { if (e.key==="Enter") submit(); if (e.key==="Escape") setOpen(false); }}
        style={{ width:"100%", background:"none", border:"none", outline:"none", color:"rgba(255,255,255,0.8)", fontSize:12, fontFamily:T.font, marginBottom:10 }}
      />
      <div style={{ display:"flex", gap:6, justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["high","med","low"].map(p => (
            <button key={p} onClick={() => setPrio(p)} style={{
              padding:"3px 9px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontFamily:T.font,
              background: prio===p ? "rgba(255,255,255,0.12)" : T.faint,
              color: prio===p ? T.p[p] : T.dimmer, transition:"all 0.15s",
            }}>{p}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => setOpen(false)} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.border}`, background:"none", color:T.dimmer, fontSize:11, fontFamily:T.font, cursor:"pointer" }}>Cancel</button>
          <button onClick={submit} style={{ padding:"4px 10px", borderRadius:7, border:"none", background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)", fontSize:11, fontFamily:T.font, cursor:"pointer" }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── RING CHART ───────────────────────────────────────────────────────────────
function RingChart({ pct, size = 82 }) {
  const R = size / 2 - 6;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={R} fill="none"
          stroke="rgba(255,255,255,0.72)" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - C * pct / 100}
          style={{ transition:"stroke-dashoffset 0.85s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:16, fontWeight:300, color:"#fff", fontFamily:T.font }}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ db, setDb, userId }) {
  // Anchor to today — stable across renders
  const today      = useMemo(() => new Date(), []);
  const todayIdx   = useMemo(() => weekdayIdx(today), [today]);
  const weekDates  = useMemo(() => getWeekDates(today), [today]);

  const [active, setActive] = useState(todayIdx);
  const lockRef  = useRef(false);
  const dragRef  = useRef(null);
  const wrapRef  = useRef(null);

  // ── Local task state — completely decoupled from db after first load ──
  const tasksRef   = useRef([]);     // source of truth for callbacks
  const loadedKey  = useRef(null);   // which day is currently loaded
  const [localTasks, _setLocal] = useState([]);

  const setTasks = useCallback((arr) => {
    tasksRef.current = arr;
    _setLocal([...arr]);
  }, []);

  // Load tasks for the active day — only when day actually changes
  useEffect(() => {
    const wd  = weekDates[active];
    const key = `${wd.y}-${wd.m}-${wd.d}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    const tasks = db?.[wd.y]?.[wd.m]?.[wd.d] ?? [];
    setTasks([...tasks]);
  }, [active, weekDates]); // db intentionally excluded — toggles must not be overwritten

  // Load from Supabase when db populates after auth — but never overwrite
  // local state after user has interacted (toggles, adds)
  const dbLoaded = useRef(false);
  useEffect(() => {
    if (dbLoaded.current) return;
    // Don't fire on empty db — wait for real data
    if (Object.keys(db).length === 0) return;
    dbLoaded.current = true;
    const wd  = weekDates[active];
    const key = `${wd.y}-${wd.m}-${wd.d}`;
    loadedKey.current = key; // allow the day-change effect to also see this as loaded
    const tasks = db?.[wd.y]?.[wd.m]?.[wd.d] ?? [];
    setTasks([...tasks]);
  }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(async (id) => {
    const prev = tasksRef.current;
    const task = prev.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks(prev.map(t => t.id === id ? { ...t, done: newDone } : t));
    const { error } = await supabase.from("tasks").update({ done: newDone }).eq("id", id);
    if (error) { console.error("Toggle error:", error); setTasks(prev); }
  }, [setTasks]);

  // ── Add task ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback((task) => {
    const current = tasksRef.current;
    if (task._replaceId) {
      setTasks(current.map(t => t.id === task._replaceId ? { ...task, _replaceId:undefined } : t));
    } else {
      setTasks([...current, task]);
    }
    // Lock dbLoaded so the db update below doesn't trigger a reload from db
    dbLoaded.current = true;
    // Update db so Month/Year views reflect the new task
    setDb(prev => {
      const t = task._replaceId ? { ...task, _replaceId:undefined } : task;
      const [y,m,d] = t.date.split("-").map(Number);
      const next = { ...prev };
      if (!next[y]) next[y] = {};
      if (!next[y][m]) next[y][m] = {};
      const day = [...(next[y]?.[m]?.[d] ?? [])];
      if (task._replaceId) {
        const idx = day.findIndex(x => x.id === task._replaceId);
        if (idx >= 0) day[idx] = t; else day.push(t);
      } else {
        day.push(t);
      }
      next[y][m][d] = day;
      return next;
    });
  }, [setDb, setTasks]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const go = useCallback((dir) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setTimeout(() => { lockRef.current = false; }, 500);
    setActive(a => Math.max(0, Math.min(6, a + dir)));
  }, []);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const fn = e => { e.preventDefault(); go(e.deltaY > 0 ? 1 : -1); };
    el.addEventListener("wheel", fn, { passive:false });
    return () => el.removeEventListener("wheel", fn);
  }, [go]);

  const activeDateObj = weekDates[active];
  const done  = localTasks.filter(t => t.done).length;
  const total = localTasks.length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const STEP  = 168;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1.65fr", gridTemplateRows:"1fr auto auto", gap:10, height:"100%" }}>

      {/* ── Carousel ── */}
      <Panel style={{ gridRow:"1/4", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <Lbl>This Week</Lbl>
          <span style={{ fontSize:9, color:T.dimmer, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:T.font, marginBottom:12 }}>{active+1}/7</span>
        </div>

        <div ref={wrapRef}
          style={{ flex:1, position:"relative", overflow:"hidden", cursor:"ns-resize" }}
          onMouseDown={e => { dragRef.current = e.clientY; }}
          onMouseUp={e => {
            if (dragRef.current === null) return;
            const dy = dragRef.current - e.clientY;
            if (Math.abs(dy) > 28) go(dy > 0 ? 1 : -1);
            dragRef.current = null;
          }}
          onTouchStart={e => { dragRef.current = e.touches[0].clientY; }}
          onTouchEnd={e => {
            if (dragRef.current === null) return;
            const dy = dragRef.current - e.changedTouches[0].clientY;
            if (Math.abs(dy) > 28) go(dy > 0 ? 1 : -1);
            dragRef.current = null;
          }}
        >
          <div style={{ position:"absolute", inset:0, padding:"0 16px" }}>
            {weekDates.map((wd, i) => {
              const offset = i - active;
              const abs    = Math.abs(offset);
              if (abs > 2) return null;
              const isActive = offset === 0;
              const ty       = offset * STEP;
              const scale    = isActive ? 1 : abs===1 ? 0.89 : 0.78;
              const op       = isActive ? 1 : abs===1 ? 0.42 : 0.17;
              const blr      = isActive ? 0 : abs===1 ? 3 : 8;
              // For the active day use localTasks so toggles are reflected; other days read db
              const dayTasks = isActive ? localTasks : (db?.[wd.y]?.[wd.m]?.[wd.d] ?? []);
              const dayDone  = dayTasks.filter(t => t.done).length;
              const dayPct   = dayTasks.length ? Math.round(dayDone / dayTasks.length * 100) : 0;
              const isToday  = i === todayIdx;
              return (
                <div key={wd.name}
                  onClick={!isActive ? () => setActive(i) : undefined}
                  style={{
                    position:"absolute", left:0, right:0, top:"50%", marginTop:-64, height:128,
                    padding:"16px 20px", borderRadius:14,
                    border:`1px solid ${isActive?"rgba(255,255,255,0.13)":"rgba(255,255,255,0.04)"}`,
                    background: isActive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                    backdropFilter: isActive ? "blur(40px)" : "none",
                    WebkitBackdropFilter: isActive ? "blur(40px)" : "none",
                    boxShadow: isActive ? "0 20px 60px rgba(0,0,0,0.4)" : "none",
                    transform:`translateY(${ty}px) scale(${scale})`,
                    opacity:op, filter:blr ? `blur(${blr}px)` : "none",
                    zIndex:10 - abs,
                    transition:"all 0.46s cubic-bezier(0.34,1.15,0.64,1)",
                    cursor: !isActive ? "pointer" : "default",
                    willChange:"transform,opacity,filter",
                  }}
                >
                  
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", color: isToday && isActive ? "rgba(255,255,255,0.6)" : T.dim, fontFamily:T.font, fontWeight:500, marginBottom:5 }}>
                        {wd.name}{isToday ? " · Today" : ""}
                      </div>
                      <div style={{ fontSize:36, fontWeight:300, lineHeight:1, color:"#fff", fontFamily:T.font, letterSpacing:"-0.02em" }}>
                        {String(wd.d).padStart(2,"0")}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, marginTop:2 }}>
                        <span style={{ fontSize:10, color:T.dimmer, fontFamily:T.font }}>{dayDone}/{dayTasks.length}</span>
                        <div style={{ width:32, height:2, borderRadius:1, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${dayPct}%`, background:"rgba(255,255,255,0.65)", borderRadius:1, transition:"width 0.5s" }}/>
                        </div>
                      </div>
                    )}
                  </div>
                  {isActive && localTasks.length > 0 && (
                    <div style={{ display:"flex", gap:4, marginTop:12, flexWrap:"wrap" }}>
                      {localTasks.slice(0,3).map((t, ti) => (
                        <div key={ti} style={{
                          fontSize:10, padding:"3px 9px", borderRadius:20, fontFamily:T.font,
                          background: t.done ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
                          color: t.done ? T.dimmer : T.dim,
                          textDecoration: t.done ? "line-through" : "none",
                        }}>{t.title}</div>
                      ))}
                      {localTasks.length > 3 && <div style={{ fontSize:10, color:T.dimmer, fontFamily:T.font, padding:"3px 6px" }}>+{localTasks.length - 3}</div>}
                    </div>
                  )}
                  {isActive && localTasks.length === 0 && (
                    <div style={{ fontSize:10, color:T.dimmer, fontFamily:T.font, marginTop:12 }}>No tasks yet</div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:52, background:"linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)", pointerEvents:"none", zIndex:20 }}/>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:52, background:"linear-gradient(to top,rgba(0,0,0,0.5),transparent)", pointerEvents:"none", zIndex:20 }}/>
        </div>

        {/* dots */}
        <div style={{ padding:"12px 20px", display:"flex", gap:4, justifyContent:"center" }}>
          {weekDates.map((_, i) => (
            <div key={i} onClick={() => setActive(i)} style={{
              height:3, borderRadius:2, cursor:"pointer",
              width: i===active ? 18 : 3,
              background: i===active ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.14)",
              transition:"all 0.28s ease",
            }}/>
          ))}
        </div>
      </Panel>

      {/* ── Task list ── */}
      <Panel style={{ padding:"18px 20px", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <Lbl>{activeDateObj.name}, {activeDateObj.d} {MONTHS[activeDateObj.m-1]}</Lbl>
          <span style={{ fontSize:9, color:T.dimmer, fontFamily:T.font, letterSpacing:"0.12em", marginBottom:12 }}>{done}/{total}</span>
        </div>
        {localTasks.length === 0
          ? <div style={{ fontSize:12, color:T.dimmer, fontFamily:T.font, padding:"12px 0" }}>No tasks — add one below</div>
          : localTasks.map(t => <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)}/>)
        }
        <AddTask dateObj={activeDateObj} onAdd={handleAdd} userId={userId}/>
      </Panel>

      {/* ── Progress ring ── */}
      <Panel style={{ padding:"18px 20px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between" }}>
        <Lbl>Today</Lbl>
        <RingChart pct={pct}/>
        <span style={{ fontSize:10, color:T.dimmer, fontFamily:T.font }}>{done} of {total}</span>
      </Panel>

      {/* ── Week mini bars ── */}
      <Panel style={{ padding:"18px 20px" }}>
        <Lbl>Week</Lbl>
        <div style={{ display:"flex", gap:5, alignItems:"flex-end", height:36 }}>
          {weekDates.map((wd, i) => {
            const tasks = i===active ? localTasks : (db?.[wd.y]?.[wd.m]?.[wd.d] ?? []);
            const p     = tasks.length ? Math.round(tasks.filter(t=>t.done).length / tasks.length * 100) : 0;
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }}>
                <div style={{ width:"100%", flex:1, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                  <div style={{
                    width:"100%", borderRadius:3,
                    background: i===active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)",
                    height:`${Math.max(p, tasks.length?8:0)}%`,
                    transition:`height 0.7s ease ${i*50}ms`,
                  }}/>
                </div>
                <span style={{ fontSize:8, fontFamily:T.font, color:i===active?"rgba(255,255,255,0.6)":T.dimmer, fontWeight:i===active?600:400 }}>{wd.name[0]}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthView({ db, setDb, focusDate, setFocusDate, userId }) {
  const [y, setY]         = useState(focusDate.year);
  const [m, setM]         = useState(focusDate.month);
  const [selected, setSel] = useState(focusDate.day);

  const today = useMemo(() => new Date(), []);
  const tD = today.getDate(), tM = today.getMonth()+1, tY = today.getFullYear();

  const firstDay  = new Date(y, m-1, 1).getDay();
  const daysCount = new Date(y, m, 0).getDate();
  const startPad  = firstDay===0 ? 6 : firstDay - 1;
  const cells     = Array.from({ length: startPad + daysCount }, (_, i) => i < startPad ? null : i - startPad + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  // Selected day tasks — with local toggle support
  const selTasksRaw  = db?.[y]?.[m]?.[selected] ?? [];
  const selKey       = `${y}-${m}-${selected}`;
  const [selTasks, setSelTasks] = useState([...selTasksRaw]);
  const selRef = useRef([]);
  useEffect(() => { selRef.current = selTasksRaw; setSelTasks([...selTasksRaw]); }, [selKey, db]);

  const toggleSel = useCallback(async (id) => {
    const prev    = selRef.current;
    const task    = prev.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    const updated = prev.map(t => t.id===id ? {...t,done:newDone} : t);
    selRef.current = updated; setSelTasks([...updated]);
    const { error } = await supabase.from("tasks").update({ done:newDone }).eq("id", id);
    if (error) { selRef.current = prev; setSelTasks([...prev]); }
  }, []);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:10, height:"100%" }}>
      <Panel style={{ padding:"18px 20px", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <Lbl style={{ marginBottom:0 }}>{MONTHS[m-1]} {y}</Lbl>
          <div style={{ display:"flex", gap:6 }}>
            <NavBtn onClick={() => { if(m===1){setM(12);setY(y-1);}else setM(m-1); }}>‹</NavBtn>
            <NavBtn onClick={() => { if(m===12){setM(1);setY(y+1);}else setM(m+1); }}>›</NavBtn>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
            <div key={d} style={{ textAlign:"center", fontSize:9, color:T.dimmer, fontFamily:T.font, letterSpacing:"0.1em", paddingBottom:6 }}>{d}</div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, flex:1 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i}/>;
            const tasks   = db?.[y]?.[m]?.[d] ?? [];
            const isToday = d===tD && m===tM && y===tY;
            const isSel   = d===selected;
            return (
              <div key={i}
                onClick={() => { setSel(d); setFocusDate({ year:y, month:m, day:d }); }}
                style={{
                  borderRadius:10, padding:"8px 6px 6px",
                  background: isSel ? "rgba(255,255,255,0.09)" : isToday ? "rgba(255,255,255,0.04)" : T.faint,
                  border:`1px solid ${isSel?"rgba(255,255,255,0.16)":isToday?"rgba(255,255,255,0.1)":T.border}`,
                  cursor:"pointer", transition:"all 0.15s",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:6, minHeight:52,
                }}
                onMouseEnter={e => { if(!isSel) e.currentTarget.style.background = T.hover; }}
                onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = isToday?"rgba(255,255,255,0.04)":T.faint; }}
              >
                <span style={{ fontSize:11, fontFamily:T.font, fontWeight:isToday?600:300, color:isToday?"#fff":isSel?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.55)" }}>{d}</span>
                {tasks.length > 0 && (
                  <div style={{ display:"flex", gap:2, flexWrap:"wrap", justifyContent:"center" }}>
                    {tasks.slice(0,4).map((t, ti) => (
                      <div key={ti} style={{ width:5, height:5, borderRadius:"50%", background: t.done?"rgba(255,255,255,0.2)":T.p[t.priority] }}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Day detail panel */}
      <Panel style={{ padding:"18px 18px", overflow:"auto", display:"flex", flexDirection:"column" }}>
        {selected ? (
          <>
            <Lbl>{selected} {MONTHS[m-1]}</Lbl>
            {selTasks.length === 0
              ? <div style={{ fontSize:12, color:T.dimmer, fontFamily:T.font }}>No tasks</div>
              : selTasks.map(t => <TaskRow key={t.id} task={t} onToggle={() => toggleSel(t.id)}/>)
            }
            <AddTask dateObj={{ y, m, d:selected }} userId={userId} onAdd={(task) => {
              const upd = task._replaceId
                ? selRef.current.map(t => t.id===task._replaceId ? {...task,_replaceId:undefined} : t)
                : [...selRef.current, task];
              selRef.current = upd; setSelTasks([...upd]);
              setDb(prev => {
                const t = task._replaceId ? {...task,_replaceId:undefined} : task;
                const next = {...prev};
                if (!next[y]) next[y]={};
                if (!next[y][m]) next[y][m]={};
                const day = [...(next[y]?.[m]?.[selected]??[])];
                if (task._replaceId) { const idx=day.findIndex(x=>x.id===task._replaceId); if(idx>=0)day[idx]=t;else day.push(t); }
                else day.push(t);
                next[y][m][selected] = day;
                return next;
              });
            }}/>
          </>
        ) : (
          <div style={{ fontSize:12, color:T.dimmer, fontFamily:T.font }}>Select a day</div>
        )}
      </Panel>
    </div>
  );
}

// ─── YEAR VIEW ────────────────────────────────────────────────────────────────
function YearView({ db, focusDate, setFocusDate, setView }) {
  const [y, setY] = useState(focusDate.year);
  const today     = useMemo(() => new Date(), []);
  const tM = today.getMonth()+1, tY = today.getFullYear();

  const maxCount = useMemo(() => {
    let mx = 1;
    for (let m = 1; m <= 12; m++) mx = Math.max(mx, getMonthTaskCount(db, y, m));
    return mx;
  }, [db, y]);

  return (
    <Panel style={{ padding:"22px 24px", height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <Lbl style={{ marginBottom:0 }}>{y}</Lbl>
        <div style={{ display:"flex", gap:6 }}>
          <NavBtn onClick={() => setY(y-1)}>‹</NavBtn>
          <NavBtn onClick={() => setY(y+1)}>›</NavBtn>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, flex:1 }}>
        {MONTHS.map((mn, i) => {
          const m     = i + 1;
          const count = getMonthTaskCount(db, y, m);
          const done  = getMonthDone(db, y, m);
          const pct   = count ? Math.round(done/count*100) : 0;
          const barH  = count ? Math.max(Math.round(count/maxCount*100), 6) : 0;
          const isNow = m===tM && y===tY;
          return (
            <div key={m}
              onClick={() => { setFocusDate({ year:y, month:m, day:1 }); setView("Month"); }}
              style={{
                borderRadius:13, padding:"14px 14px 12px",
                background: isNow ? "rgba(255,255,255,0.07)" : T.faint,
                border:`1px solid ${isNow?"rgba(255,255,255,0.14)":T.border}`,
                cursor:"pointer", transition:"all 0.15s",
                display:"flex", flexDirection:"column", gap:10,
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background=isNow?"rgba(255,255,255,0.07)":T.faint; e.currentTarget.style.borderColor=isNow?"rgba(255,255,255,0.14)":T.border; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <span style={{ fontSize:11, fontFamily:T.font, color:isNow?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.45)", fontWeight:isNow?500:300 }}>{mn}</span>
                <span style={{ fontSize:9, color:T.dimmer, fontFamily:T.font }}>{pct}%</span>
              </div>
              <div style={{ flex:1, display:"flex", alignItems:"flex-end" }}>
                <div style={{ width:"100%", height:40, borderRadius:4, background:"rgba(255,255,255,0.05)", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", borderRadius:4, background:isNow?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)", height:`${barH}%`, transition:"height 0.7s ease" }}/>
                </div>
              </div>
              <div style={{ fontSize:9, color:T.dimmer, fontFamily:T.font }}>{count} tasks</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── YEARS VIEW ───────────────────────────────────────────────────────────────
function YearsView({ db, focusDate, setFocusDate, setView }) {
  const thisY  = new Date().getFullYear();
  const decade = Math.floor(thisY / 10) * 10;
  const years  = Array.from({ length:12 }, (_, i) => decade - 1 + i);

  const maxCount = useMemo(() => {
    let mx = 1;
    years.forEach(y => {
      let n = 0;
      for (let m=1; m<=12; m++) n += getMonthTaskCount(db, y, m);
      mx = Math.max(mx, n);
    });
    return mx;
  }, [db]);

  return (
    <Panel style={{ padding:"22px 24px", height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ marginBottom:24 }}>
        <Lbl style={{ marginBottom:4 }}>{decade}s</Lbl>
        <div style={{ fontSize:9, color:T.dimmer, fontFamily:T.font, letterSpacing:"0.1em" }}>Click a year to drill in</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, flex:1 }}>
        {years.map(y => {
          let total=0; for(let m=1;m<=12;m++) total+=getMonthTaskCount(db,y,m);
          let done=0;  for(let m=1;m<=12;m++) done+=getMonthDone(db,y,m);
          const pct  = total ? Math.round(done/total*100) : 0;
          const barH = total ? Math.max(Math.round(total/maxCount*100), 4) : 0;
          const isNow = y === thisY;
          const isFut = y > thisY;
          return (
            <div key={y}
              onClick={() => { if(isFut) return; setFocusDate({ year:y, month:1, day:1 }); setView("Year"); }}
              style={{
                borderRadius:13, padding:"14px 12px 12px",
                background: isNow ? "rgba(255,255,255,0.07)" : T.faint,
                border:`1px solid ${isNow?"rgba(255,255,255,0.14)":T.border}`,
                cursor: isFut ? "default" : "pointer",
                opacity: isFut ? 0.35 : 1,
                transition:"all 0.15s",
                display:"flex", flexDirection:"column", gap:10,
              }}
              onMouseEnter={e => { if(!isFut){ e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.14)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background=isNow?"rgba(255,255,255,0.07)":T.faint; e.currentTarget.style.borderColor=isNow?"rgba(255,255,255,0.14)":T.border; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <span style={{ fontSize:12, fontFamily:T.font, fontWeight:isNow?500:300, color:isNow?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.4)" }}>{y}</span>
                {!isFut && <span style={{ fontSize:9, color:T.dimmer, fontFamily:T.font }}>{pct}%</span>}
              </div>
              <div style={{ flex:1, display:"flex", alignItems:"flex-end" }}>
                <div style={{ width:"100%", height:52, borderRadius:4, background:"rgba(255,255,255,0.04)", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                  {!isFut && <div style={{ width:"100%", borderRadius:4, background:isNow?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.22)", height:`${barH}%`, transition:"height 0.7s ease" }}/>}
                </div>
              </div>
              {!isFut && <div style={{ fontSize:9, color:T.dimmer, fontFamily:T.font }}>{total} tasks</div>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,   setUser]   = useState(null);
  const [authed, setAuthed] = useState(false);
  const [view,   setView]   = useState("Week");
  const [db,     setDb]     = useState(EMPTY_DB);

  const now = useMemo(() => new Date(), []);
  const [focusDate, setFocusDate] = useState({
    year: now.getFullYear(), month: now.getMonth()+1, day: now.getDate(),
  });

  // Auth — listen for session on load and on OAuth redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (session) { setUser(session.user); setAuthed(true); }
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) { setUser(session.user); setAuthed(true); }
      else         { setUser(null); setAuthed(false); setDb(EMPTY_DB); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load all tasks from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    supabase.from("tasks").select("*").then(({ data, error }) => {
      if (error) { console.error("Tasks fetch:", error); return; }
      if (!data || data.length === 0) return; // stay on empty db
      const built = {};
      data.forEach(t => {
        const [y, m, d] = t.date.split("-").map(Number);
        if (!built[y])     built[y]     = {};
        if (!built[y][m])  built[y][m]  = {};
        if (!built[y][m][d]) built[y][m][d] = [];
        built[y][m][d].push({ id:t.id, title:t.title, priority:t.priority, done:t.done, date:t.date });
      });
      setDb(built);
    });
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setAuthed(false); setDb(EMPTY_DB);
  }

  const cursorStr =
    view === "Year"  ? `${focusDate.year}` :
    view === "Years" ? `${Math.floor(focusDate.year/10)*10}s` :
    `${MONTHS[focusDate.month-1]} ${focusDate.year}`;

  if (!authed) return (
    <>
      <style>{CSS}</style>
      <GradientBg/>
      <AuthScreen/>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <GradientBg/>
      <div style={{
        position:"relative", zIndex:1,
        display:"grid", gridTemplateRows:"auto 1fr",
        gap:12, width:"100vw", height:"100vh", padding:18,
      }}>
        <TopBar view={view} setView={setView} user={user} onSignOut={signOut} cursor={cursorStr}/>
        <div style={{ position:"relative", minHeight:0 }}>
          <ViewLayer visible={view==="Week"}>
            <WeekView db={db} setDb={setDb} userId={user?.id}/>
          </ViewLayer>
          <ViewLayer visible={view==="Month"}>
            <MonthView db={db} setDb={setDb} focusDate={focusDate} setFocusDate={setFocusDate} userId={user?.id}/>
          </ViewLayer>
          <ViewLayer visible={view==="Year"}>
            <YearView db={db} focusDate={focusDate} setFocusDate={setFocusDate} setView={setView}/>
          </ViewLayer>
          <ViewLayer visible={view==="Years"}>
            <YearsView db={db} focusDate={focusDate} setFocusDate={setFocusDate} setView={setView}/>
          </ViewLayer>
        </div>
      </div>
    </>
  );
}
