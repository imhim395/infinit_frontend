import { useState, useRef, useEffect } from "react";

const COLORS = { purple: "#A682FF", violet: "#715AFF", blue: "#5887FF", sky: "#55C1FF", dark: "#102E4A" };
const API_BASE = "http://127.0.0.1:8000";
const HISTORY_STORAGE_KEY = "infinit-chat-history";
const XP_STORAGE_KEY = "infinit-xp";
const STREAK_STORAGE_KEY = "infinit-streak";
const SAVED_ANSWERS_KEY = "infinit-saved-answers";
const GRADE_STORAGE_KEY = "infinit-grade";
const MODEL_VERSIONS = [
  { id: "v1", label: "Infinit V1", description: "Bare prompt, no system instructions" },
  { id: "v2", label: "Infinit V2", description: "Full system prompt, paragraph responses" },
  { id: "v3", label: "Infinit V3", description: "RAG with context injection from Chroma DB" },
  { id: "v4", label: "Infinit V4", description: "Fine-tuned Mathstral + RAG + Web Search" },
];
const STARTER_QUESTIONS_BY_GRADE = {
  k3: [
    "Why is the sky blue?", "Why do leaves fall off trees?", "How do fish breathe?",
    "Why does it rain?", "What is inside a volcano?", "How do butterflies fly?",
  ],
  "46": [
    "How do volcanoes erupt?", "How does the brain work?", "How do plants make food?",
    "What causes earthquakes?", "Why do we need sleep?", "How does electricity work?",
  ],
  "78": [
    "What are black holes?", "How does DNA work?", "What is quantum mechanics?",
    "How does photosynthesis produce energy?", "What causes climate change?", "How do vaccines work?",
  ],
};

const globalMouse = { x: -9999, y: -9999, inside: false };
function useMouse() {
  useEffect(() => {
    const onMove = (e) => { globalMouse.x = e.clientX; globalMouse.y = e.clientY; globalMouse.inside = true; };
    const onLeave = () => { globalMouse.inside = false; };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => { window.removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); };
  }, []);
}

const CursorLayer = () => {
  const orbRef = useRef(null), dotRef = useRef(null), rafRef = useRef(null);
  const pos = useRef({ x: -200, y: -200 }), scale = useRef(1), opacity = useRef(0);
  useEffect(() => {
    document.documentElement.style.cursor = "none";
    const dotPos = { x: -200, y: -200 };
    const loop = () => {
      const m = globalMouse;
      pos.current.x += (m.x - pos.current.x) * 0.11;
      pos.current.y += (m.y - pos.current.y) * 0.11;
      dotPos.x += (m.x - dotPos.x) * 0.32;
      dotPos.y += (m.y - dotPos.y) * 0.32;
      opacity.current += ((m.inside ? 1 : 0) - opacity.current) * 0.08;
      const hovered = document.querySelectorAll(":hover");
      let isInteractive = false;
      hovered.forEach(el => { if (["button", "a", "textarea", "input"].includes(el.tagName.toLowerCase())) isInteractive = true; });
      scale.current += ((isInteractive ? 1.9 : 1) - scale.current) * 0.1;
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${pos.current.x - 28}px, ${pos.current.y - 28}px) scale(${scale.current})`;
        orbRef.current.style.opacity = opacity.current * 0.18;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotPos.x - 2}px, ${dotPos.y - 2}px)`;
        dotRef.current.style.opacity = opacity.current * 0.7;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); document.documentElement.style.cursor = ""; };
  }, []);
  return (
    <>
      <div ref={orbRef} style={{ position: "fixed", top: 0, left: 0, width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle,rgba(166,130,255,1) 0%,rgba(88,135,255,0.6) 40%,transparent 70%)", mixBlendMode: "screen", pointerEvents: "none", zIndex: 99999, willChange: "transform,opacity" }} />
      <div ref={dotRef} style={{ position: "fixed", top: 0, left: 0, width: 4, height: 4, borderRadius: "50%", background: "rgba(200,190,255,0.9)", pointerEvents: "none", zIndex: 99999, willChange: "transform,opacity" }} />
    </>
  );
};

const BackgroundLightField = () => {
  const ref = useRef(null), rafRef = useRef(null), pos = useRef({ x: 50, y: 30 });
  useEffect(() => {
    const loop = () => {
      pos.current.x += ((globalMouse.x / window.innerWidth) * 100 - pos.current.x) * 0.025;
      pos.current.y += ((globalMouse.y / window.innerHeight) * 100 - pos.current.y) * 0.025;
      if (ref.current) ref.current.style.background = `radial-gradient(ellipse 70% 55% at ${pos.current.x}% ${pos.current.y}%,rgba(113,90,255,0.07) 0%,rgba(85,135,255,0.04) 40%,transparent 100%)`;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, willChange: "background" }} />;
};

const MagneticButton = ({ children, onClick, animDelay = "0s" }) => {
  const ref = useRef(null), rafRef = useRef(null);
  const vel = useRef({ x: 0, y: 0 }), disp = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const loop = () => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const dx = globalMouse.x - cx, dy = globalMouse.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let tx = 0, ty = 0;
      if (dist < 90 && globalMouse.inside) { const pull = Math.pow(1 - dist / 90, 1.5) * 6; tx = (dx / dist) * pull; ty = (dy / dist) * pull; }
      vel.current.x += (tx - disp.current.x) * 0.18; vel.current.y += (ty - disp.current.y) * 0.18;
      vel.current.x *= 0.72; vel.current.y *= 0.72;
      disp.current.x += vel.current.x; disp.current.y += vel.current.y;
      el.style.transform = `translate(${disp.current.x}px,${disp.current.y}px)`;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <button ref={ref} onClick={onClick} className="magnetic-chip" style={{ animationDelay: animDelay, willChange: "transform" }}>{children}</button>;
};

const GlassCard = ({ children, isUser, isError }) => {
  const ref = useRef(null), rafRef = useRef(null), tilt = useRef({ rx: 0, ry: 0 }), sweep = useRef(50);
  useEffect(() => {
    if (isUser) return;
    const el = ref.current; if (!el) return;
    const loop = () => {
      const rect = el.getBoundingClientRect();
      const dx = globalMouse.x - (rect.left + rect.width / 2), dy = globalMouse.y - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      let trx = 0, tryVal = 0, tsweep = 50;
      if (dist < 340 && globalMouse.inside) { const t = 1 - dist / 340; trx = -(dy / rect.height) * 2.5 * t; tryVal = (dx / rect.width) * 2.5 * t; tsweep = (Math.atan2(dy, dx) / Math.PI) * 50 + 50; }
      tilt.current.rx += (trx - tilt.current.rx) * 0.08; tilt.current.ry += (tryVal - tilt.current.ry) * 0.08;
      sweep.current += (tsweep - sweep.current) * 0.06;
      if (el) { el.style.transform = `perspective(800px) rotateX(${tilt.current.rx}deg) rotateY(${tilt.current.ry}deg)`; el.style.setProperty("--sweep", `${sweep.current}%`); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isUser]);
  return (
    <div ref={ref} className={isUser ? "" : "glass-card"} style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isUser ? `linear-gradient(135deg,${COLORS.violet},${COLORS.blue})` : isError ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.04)", border: isUser ? "none" : isError ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(88,135,255,0.1)", backdropFilter: "blur(8px)", fontSize: 14, lineHeight: 1.7, fontWeight: 600, whiteSpace: "pre-wrap", color: isUser ? "white" : isError ? "#fca5a5" : "rgba(255,255,255,0.88)", boxShadow: isUser ? "0 3px 16px rgba(113,90,255,0.25)" : "none", willChange: "transform", transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
};

const AmbientField = () => {
  const ref = useRef(null), rafRef = useRef(null), pos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const loop = () => {
      pos.current.x += (((globalMouse.x / window.innerWidth) - 0.5) * -18 - pos.current.x) * 0.04;
      pos.current.y += (((globalMouse.y / window.innerHeight) - 0.5) * -12 - pos.current.y) * 0.04;
      if (ref.current) ref.current.style.transform = `translate(${pos.current.x}px,${pos.current.y}px)`;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return (
    <div style={{ position: "absolute", inset: "-5%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div ref={ref} style={{ width: "110%", height: "110%", backgroundImage: "radial-gradient(circle,rgba(88,135,255,0.18) 1px,transparent 1px)", backgroundSize: "36px 36px", opacity: 0.22, willChange: "transform" }} />
    </div>
  );
};

const InfinitLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#A682FF" strokeWidth="5" fill="none" transform="rotate(-35 50 50)" />
    <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#5887FF" strokeWidth="5" fill="none" transform="rotate(35 50 50)" />
    <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#55C1FF" strokeWidth="3" fill="none" opacity="0.4" transform="rotate(-35 50 50)" />
  </svg>
);

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: `linear-gradient(135deg,${COLORS.violet},${COLORS.sky})`, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
  </div>
);

const ChevronIcon = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ModelSelector = ({ selected, onChange, models }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedModel = models.find(m => m.id === selected);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 4, background: open ? "rgba(88,135,255,0.12)" : "rgba(88,135,255,0.06)", border: `1px solid ${open ? "rgba(88,135,255,0.35)" : "rgba(88,135,255,0.15)"}`, borderRadius: 8, padding: "4px 9px", color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "'Nunito',sans-serif", fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap" }}>
        {selectedModel?.label}<ChevronIcon open={open} />
      </button>
      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: "#0d2339", border: "1px solid rgba(88,135,255,0.2)", borderRadius: 10, overflow: "hidden", minWidth: 210, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeUp 0.12s ease-out", zIndex: 100 }}>
          {models.map((m, idx) => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "9px 12px", background: m.id === selected ? "rgba(88,135,255,0.12)" : "transparent", border: "none", borderBottom: idx < models.length - 1 ? "1px solid rgba(88,135,255,0.07)" : "none", color: m.id === selected ? COLORS.sky : "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 700, textAlign: "left", transition: "background 0.1s" }}
              onMouseEnter={e => { if (m.id !== selected) e.currentTarget.style.background = "rgba(88,135,255,0.07)"; }}
              onMouseLeave={e => { if (m.id !== selected) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: m.id === selected ? COLORS.sky : "rgba(88,135,255,0.3)" }} />
              <div>
                <div>{m.label}</div>
                {m.description && <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1, color: m.id === selected ? "rgba(85,193,255,0.55)" : "rgba(255,255,255,0.3)" }}>{m.description}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const formatMessage = (text) => {
  const footerIdx = text.indexOf("\n\n---\n");
  const mainText = footerIdx >= 0 ? text.slice(0, footerIdx) : text;
  const footerText = footerIdx >= 0 ? text.slice(footerIdx + 6) : null;

  // Extract hands-on experiment suggestion into its own card
  const experimentPatterns = [
    /\*?\*?try this at home[:\*]?\*?\*?([\s\S]+?)(?=\n\n|\n\*\*|$)/i,
    /\*?\*?hands[- ]on (experiment|activity)[:\*]?\*?\*?([\s\S]+?)(?=\n\n|\n\*\*|$)/i,
    /\*?\*?experiment[:\*]?\*?\*?([\s\S]+?)(?=\n\n|\n\*\*|$)/i,
    /\*?\*?activity[:\*]?\*?\*?([\s\S]+?)(?=\n\n|\n\*\*|$)/i,
    /\*?\*?you can try[:\*]?\*?\*?([\s\S]+?)(?=\n\n|\n\*\*|$)/i,
  ];
  let experimentText = null, cleanMainText = mainText;
  for (const pat of experimentPatterns) {
    const m = mainText.match(pat);
    if (m) {
      experimentText = (m[1] || m[2] || "").trim();
      cleanMainText = mainText.replace(m[0], "").trim();
      break;
    }
  }

  const renderText = (t) => {
    const lines = t.split("\n");
    return lines.map((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return (
        <span key={li}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color: COLORS.sky, fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
            if (part.startsWith("*") && part.endsWith("*")) return <em key={i} style={{ color: COLORS.purple }}>{part.slice(1, -1)}</em>;
            return <span key={i}>{part}</span>;
          })}
          {li < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  let confidence = null, sourceType = null, references = [];
  if (footerText) {
    const confMatch = footerText.match(/\*\*Confidence:\*\*\s*(\w+)/);
    const srcMatch = footerText.match(/\*\*Source:\*\*\s*(.+)/);
    const refMatches = [...footerText.matchAll(/- \[([^\]]+)\]\(([^)]+)\)/g)];
    if (confMatch) confidence = confMatch[1].toLowerCase();
    if (srcMatch) sourceType = srcMatch[1].trim();
    references = refMatches.map(m => ({ title: m[1], url: m[2] }));
  }

  const confColor = { high: "#4ade80", medium: "#facc15", low: "#f87171" }[confidence] || "rgba(255,255,255,0.3)";
  const isWebSearch = sourceType && sourceType.includes("Web Search");

  return (
    <div>
      <div>{renderText(cleanMainText)}</div>
      {experimentText && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(85,193,255,0.06)", border: "1px solid rgba(85,193,255,0.2)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>Lab:</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.sky, letterSpacing: "0.06em", marginBottom: 3 }}>TRY IT YOURSELF</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{experimentText}</div>
          </div>
        </div>
      )}
      {(confidence || references.length > 0) && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(88,135,255,0.1)", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {confidence && (
              <span style={{ fontSize: 10, fontWeight: 700, color: confColor, background: confColor + "18", border: "1px solid " + confColor + "40", borderRadius: 100, padding: "2px 8px" }}>
                {confidence} confidence
              </span>
            )}
            {isWebSearch ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.sky, background: "rgba(85,193,255,0.08)", border: "1px solid rgba(85,193,255,0.25)", borderRadius: 100, padding: "2px 8px" }}>
                web search
              </span>
            ) : sourceType ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "2px 8px" }}>
                knowledge base
              </span>
            ) : null}
          </div>
          {references.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
              {references.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: COLORS.sky, opacity: 0.65, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.65"}>
                  ↗ {ref.title || ref.url}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  // Strip footer from copy text
  const cleanText = text.includes("\n\n---\n") ? text.slice(0, text.indexOf("\n\n---\n")) : text;
  const copy = () => { navigator.clipboard.writeText(cleanText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  return (
    <button onClick={copy} style={{ background: "none", border: "none", padding: "2px 6px", borderRadius: 6, color: copied ? "rgba(85,193,255,0.9)" : "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "'Nunito',sans-serif", fontWeight: 700, transition: "color 0.15s" }}>
      {copied ? "copied" : "copy"}
    </button>
  );
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100vh;overflow:hidden;}
  body{font-family:'Nunito',sans-serif;background:#102E4A;color:white;cursor:none;}
  button,a,input,textarea{cursor:none!important;}
  input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.25);}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  .message-bubble{animation:fadeUp 0.25s ease-out both;}
  .magnetic-chip{animation:fadeUp 0.35s ease-out both;border:1px solid rgba(88,135,255,0.22);background:transparent;color:rgba(255,255,255,0.55);padding:7px 15px;border-radius:100px;font-size:13px;font-family:'Nunito',sans-serif;font-weight:600;white-space:nowrap;transition:border-color 0.2s,color 0.2s,background 0.2s;}
  .magnetic-chip:hover{border-color:rgba(85,193,255,0.4);color:rgba(255,255,255,0.9);background:rgba(85,193,255,0.06);transform:scale(1.02)!important;}
  .glass-card{position:relative;overflow:hidden;}
  .glass-card::before{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 0%,transparent calc(var(--sweep,50%) - 18%),rgba(255,255,255,0.02) var(--sweep,50%),transparent calc(var(--sweep,50%) + 18%),transparent 100%);pointer-events:none;border-radius:inherit;}
  .send-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;transition:background 0.2s,border-color 0.2s,transform 0.15s;flex-shrink:0;align-self:center;}
  .send-btn:hover:not(:disabled){background:rgba(113,90,255,0.3);border-color:rgba(113,90,255,0.5);transform:scale(1.06);}
  .send-btn:disabled{opacity:0.25;}
  .stop-btn{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.22);border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:center;transition:background 0.2s,border-color 0.2s,transform 0.15s;}
  .stop-btn:hover{background:rgba(239,68,68,0.16);border-color:rgba(239,68,68,0.7);transform:scale(1.04);}
  .stop-btn-square{width:12px;height:12px;border-radius:3px;background:rgba(239,68,68,0.9);}
  .icon-btn{background:transparent;border:1px solid rgba(88,135,255,0.2);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color 0.2s,background 0.2s;align-self:center;}
  .icon-btn:hover:not(:disabled){border-color:rgba(85,193,255,0.35);background:rgba(85,193,255,0.05);}
  .icon-btn.active{border-color:rgba(85,193,255,0.4);background:rgba(85,193,255,0.08);}
  .input-field{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(88,135,255,0.15);border-radius:14px;padding:13px 140px 13px 16px;color:white;font-family:'Nunito',sans-serif;font-size:14px;font-weight:600;outline:none;transition:border-color 0.2s,background 0.2s;resize:none;min-height:50px;max-height:120px;line-height:1.5;overflow-y:auto;}
  .input-field:focus{border-color:rgba(88,135,255,0.32);background:rgba(88,135,255,0.05);}
  .mode-btn{border-radius:8px;padding:5px 10px;font-size:11px;font-family:'Nunito',sans-serif;font-weight:700;transition:all 0.15s;white-space:nowrap;align-self:center;}
  .history-panel{position:absolute;top:0;left:0;bottom:0;width:260px;background:#0c1e30;border-right:1px solid rgba(88,135,255,0.12);z-index:50;display:flex;flex-direction:column;animation:slideIn 0.2s ease-out;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(88,135,255,0.18);border-radius:4px;}
`;

const GradeSelector = ({ selected, onChange }) => {
  const grades = [
    { id: "k3", label: "K–3", icon: "K" },
    { id: "46", label: "4–6", icon: "4" },
    { id: "78", label: "7–8", icon: "7" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {grades.map(g => (
        <button key={g.id} onClick={() => onChange(g.id)}
          style={{ background: selected === g.id ? "rgba(113,90,255,0.2)" : "transparent", border: `1px solid ${selected === g.id ? "rgba(113,90,255,0.5)" : "rgba(88,135,255,0.18)"}`, borderRadius: 8, padding: "4px 9px", fontSize: 10, fontFamily: "'Nunito',sans-serif", fontWeight: 700, color: selected === g.id ? COLORS.purple : "rgba(255,255,255,0.3)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 3 }}>
          <span>{g.icon}</span>{g.label}
        </button>
      ))}
    </div>
  );
};

const XPBar = ({ xp, streak }) => {
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {streak > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 100, padding: "2px 8px" }}>
          <span style={{ fontSize: 12 }}>Streak:</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#facc15" }}>{streak}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)" }}>Lv{level}</span>
        <div style={{ width: 48, height: 4, background: "rgba(88,135,255,0.15)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg,${COLORS.violet},${COLORS.sky})`, borderRadius: 100, transition: "width 0.4s ease-out" }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(88,135,255,0.4)" }}>{xp}xp</span>
      </div>
    </div>
  );
};

const BookmarkButton = ({ message, question, onSave, saved }) => {
  return (
    <button onClick={() => onSave(message, question)}
      style={{ background: "none", border: "none", padding: "2px 6px", borderRadius: 6, color: saved ? COLORS.purple : "rgba(255,255,255,0.2)", fontSize: 12, transition: "color 0.15s", fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}
      title={saved ? "Bookmarked" : "Bookmark this answer"}>
      {saved ? "Saved" : "Save"}
    </button>
  );
};

export default function App() {
  useMouse();

  const WELCOME_MSG = { role: "assistant", content: "Hello, explorer. I'm **Infinit** — your science companion. Ask me anything about the universe, nature, the human body, space, or any science topic you're curious about. There are no bad questions here." };
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedModel, setSelectedModel] = useState("v4");
  const [serverStatus, setServerStatus] = useState("checking");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastQuestion, setLastQuestion] = useState(null);
  const [chatMode, setChatMode] = useState("normal"); // normal | quiz | socratic | hint
  const [gradeLevel, setGradeLevel] = useState("46"); // k3 | 46 | 78
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const messagesEndRef = useRef(null), inputRef = useRef(null);
  const fileInputRef = useRef(null), historyRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) setHistory(parsedHistory);
      }
      const savedXP = localStorage.getItem(XP_STORAGE_KEY);
      if (savedXP) setXp(parseInt(savedXP, 10) || 0);

      // Streak logic: check if last visit was yesterday or today
      const streakData = localStorage.getItem(STREAK_STORAGE_KEY);
      if (streakData) {
        const { count, date } = JSON.parse(streakData);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (date === today) setStreak(count);
        else if (date === yesterday) setStreak(count); // will increment on first question
        // else streak broken, stays at 0
      }

      const savedAnswersRaw = localStorage.getItem(SAVED_ANSWERS_KEY);
      if (savedAnswersRaw) setSavedAnswers(JSON.parse(savedAnswersRaw) || []);

      const savedGrade = localStorage.getItem(GRADE_STORAGE_KEY);
      if (savedGrade) setGradeLevel(savedGrade);
    } catch {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  // Circular favicon — draws the Infinit logo onto a canvas with a circular clip
  useEffect(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Circular clip mask
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Dark background fill (matches Infinit's dark color)
    ctx.fillStyle = "#102E4A";
    ctx.fillRect(0, 0, size, size);

    // Draw the Infinit SVG logo onto the canvas via Image
    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#A682FF" stroke-width="5" fill="none" transform="rotate(-35 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#5887FF" stroke-width="5" fill="none" transform="rotate(35 50 50)" />
        <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#55C1FF" stroke-width="3" fill="none" opacity="0.4" transform="rotate(-35 50 50)" />
      </svg>`;
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const faviconUrl = canvas.toDataURL("image/png");
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = faviconUrl;
    };
    img.src = url;
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  useEffect(() => { localStorage.setItem(XP_STORAGE_KEY, String(xp)); }, [xp]);
  useEffect(() => { localStorage.setItem(SAVED_ANSWERS_KEY, JSON.stringify(savedAnswers.slice(0, 50))); }, [savedAnswers]);
  useEffect(() => { localStorage.setItem(GRADE_STORAGE_KEY, gradeLevel); }, [gradeLevel]);

  useEffect(() => { fetch(`${API_BASE}/models`).then(r => r.ok ? setServerStatus("online") : setServerStatus("offline")).catch(() => setServerStatus("offline")); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => { const el = inputRef.current; if (!el) return; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }, [input]);

  useEffect(() => {
    const handler = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveSession = (msgs) => {
    if (msgs.length <= 1) return;
    const session = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: msgs.find(m => m.role === "user")?.content?.slice(0, 40) || "Chat",
      messages: msgs,
      model: selectedModel,
      created_at: new Date().toISOString(),
    };
    setHistory(prev => [session, ...prev].slice(0, 30));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    const formData = new FormData(); formData.append("file", file);
    try { const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData }); const data = await res.json(); setUploadedFile({ name: file.name, text: data.text }); } catch { setUploadedFile(null); }
    setIsUploading(false); e.target.value = "";
  };

  const sendMessage = async (text) => {
    const question = text || input.trim(); if (!question || isLoading) return;
    const fileContent = uploadedFile?.text || "", fileLabel = uploadedFile ? ` [${uploadedFile.name}]` : "";
    setUploadedFile(null);
    setShowWelcome(false);
    setLastQuestion(question);
    setMessages(prev => [...prev, { role: "user", content: question + fileLabel }]);
    setInput("");
    setIsLoading(true);
    const startTime = Date.now();
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true, model: selectedModel, mode: chatMode }]);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ question, model: selectedModel, file_content: fileContent, mode: chatMode, grade_level: gradeLevel })
      });
      if (!res.ok) throw new Error();
      const reader = res.body.getReader(), decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: full, streaming: true, model: selectedModel, mode: chatMode }; return u; });
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: full, model: selectedModel, elapsed, mode: chatMode, question }; saveSession(u); return u; });
      // Award XP + update streak
      setXp(prev => prev + 10);
      const today = new Date().toDateString();
      const streakRaw = localStorage.getItem(STREAK_STORAGE_KEY);
      if (streakRaw) {
        const { count, date } = JSON.parse(streakRaw);
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newCount = (date === today) ? count : (date === yesterday ? count + 1 : 1);
        setStreak(newCount);
        localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
      } else {
        setStreak(1);
        localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ count: 1, date: today }));
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages(prev => {
          const u = [...prev];
          const last = u[u.length - 1];
          if (last?.role === "assistant") u[u.length - 1] = { ...last, streaming: false, aborted: true };
          return u;
        });
      } else {
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `Could not reach the server at ${API_BASE}.`, error: true }; return u; });
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const stopResponse = () => {
    if (!isLoading || !abortControllerRef.current) return;
    abortControllerRef.current.abort();
  };

  const bookmarkAnswer = (msg, question) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSavedAnswers(prev => {
      const already = prev.find(s => s.content === msg.content);
      if (already) return prev.filter(s => s.content !== msg.content); // toggle off
      return [{ id, content: msg.content, question: msg.question || question || "", model: msg.model, created_at: new Date().toISOString() }, ...prev].slice(0, 50);
    });
  };

  const isBookmarked = (msg) => savedAnswers.some(s => s.content === msg.content);

  const regenerate = async () => { if (!lastQuestion || isLoading) return; setMessages(prev => prev.slice(0, -2)); await sendMessage(lastQuestion); };
  const clearChat = () => { setMessages([WELCOME_MSG]); setInput(""); setShowWelcome(true); setLastQuestion(null); setChatMode("normal"); };
  const loadSession = (session) => {
    setMessages(session.messages);
    setSelectedModel(session.model);
    setLastQuestion(session.messages.filter(m => m.role === "user").at(-1)?.content ?? null);
    setShowWelcome(false);
    setShowHistory(false);
  };
  const deleteSession = (id, e) => { e.stopPropagation(); setHistory(prev => prev.filter(s => s.id !== id)); };
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const statusColor = { online: "#4ade80", offline: "#f87171", checking: "#facc15" }[serverStatus];

  const toggleMode = (m) => setChatMode(prev => prev === m ? "normal" : m);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <CursorLayer />
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", position: "relative", overflow: "hidden", background: `radial-gradient(ellipse at 15% 0%,rgba(113,90,255,0.1) 0%,transparent 50%),radial-gradient(ellipse at 85% 100%,rgba(85,193,255,0.06) 0%,transparent 50%),${COLORS.dark}` }}>
        <AmbientField />
        <BackgroundLightField />

        {/* Sidebar — History + Saved Answers */}
        {(showHistory || showSaved) && (
          <div ref={historyRef} className="history-panel">
            <div style={{ padding: "20px 16px 0", borderBottom: "1px solid rgba(88,135,255,0.1)", display: "flex", gap: 0 }}>
              <button onClick={() => { setShowHistory(true); setShowSaved(false); }}
                style={{ flex: 1, background: "none", border: "none", borderBottom: showHistory ? `2px solid ${COLORS.sky}` : "2px solid transparent", paddingBottom: 10, fontSize: 11, fontWeight: 700, color: showHistory ? COLORS.sky : "rgba(255,255,255,0.3)", transition: "color 0.15s" }}>
                HISTORY
              </button>
              <button onClick={() => { setShowSaved(true); setShowHistory(false); }}
                style={{ flex: 1, background: "none", border: "none", borderBottom: showSaved ? `2px solid ${COLORS.purple}` : "2px solid transparent", paddingBottom: 10, fontSize: 11, fontWeight: 700, color: showSaved ? COLORS.purple : "rgba(255,255,255,0.3)", transition: "color 0.15s" }}>
                SAVED
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {showHistory && (
                <>
                  {history.length === 0 && <div style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No saved chats yet</div>}
                  {history.map(session => (
                    <div key={session.id} onClick={() => loadSession(session)} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 4, transition: "background 0.15s", position: "relative" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(88,135,255,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 20 }}>{session.title}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{new Date(session.created_at).toLocaleDateString()} · {session.model}</div>
                      <button onClick={e => deleteSession(session.id, e)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 14, padding: "2px 4px", borderRadius: 4, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "rgba(239,68,68,0.7)"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>×</button>
                    </div>
                  ))}
                </>
              )}
              {showSaved && (
                <>
                  {savedAnswers.length === 0 && <div style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No bookmarks yet — tap Save on any answer</div>}
                  {savedAnswers.map(sa => (
                    <div key={sa.id} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 4, border: "1px solid rgba(166,130,255,0.12)", position: "relative" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.purple, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sa.question || "Saved answer"}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{sa.content.replace(/\*\*/g, "").slice(0, 120)}...</div>
                      <button onClick={() => setSavedAnswers(prev => prev.filter(s => s.id !== sa.id))}
                        style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 13, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "rgba(239,68,68,0.7)"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>×</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative", zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setShowHistory(true); setShowSaved(false); }} className={`icon-btn${showHistory ? " active" : ""}`} style={{ width: 30, height: 30, marginRight: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                <path d="M3.05 11a9 9 0 1 0 .5-3.5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 4v4h4" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <InfinitLogo size={30} />
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, background: `linear-gradient(135deg,${COLORS.purple},${COLORS.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>infinit</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontWeight: 600, marginTop: -1, letterSpacing: "0.04em" }}>science explorer</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GradeSelector selected={gradeLevel} onChange={setGradeLevel} />
            <XPBar xp={xp} streak={streak} />
            {!showWelcome && <button onClick={clearChat} style={{ background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", transition: "color 0.15s", padding: "4px 8px", borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>clear</button>}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{serverStatus}</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 20px 8px", display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>
          {showWelcome && (
            <div style={{ animation: "fadeIn 0.4s ease-out", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 24, paddingBottom: 40 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <InfinitLogo size={56} />
                <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 26, background: `linear-gradient(135deg,${COLORS.purple},${COLORS.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>infinit</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Ask anything about science</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontWeight: 600 }}>
                  Grade {gradeLevel === "k3" ? "K–3" : gradeLevel === "46" ? "4–6" : "7–8"} · change in the top right
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", maxWidth: 600 }}>
                {(STARTER_QUESTIONS_BY_GRADE[gradeLevel] || STARTER_QUESTIONS_BY_GRADE["46"]).map((q, i) => (
                  <MagneticButton key={i} onClick={() => sendMessage(q)} animDelay={`${i * 0.06}s`}>{q}</MagneticButton>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontWeight: 600, letterSpacing: "0.04em" }}>Shift+Enter for new line · Enter to send</div>
            </div>
          )}

          {!showWelcome && messages.map((msg, i) => (
            <div key={i} className="message-bubble" style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: 10, maxWidth: 700, width: "100%", margin: "0 auto", animationDelay: `${i * 0.02}s` }}>
              {msg.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(113,90,255,0.15)", border: "1px solid rgba(88,135,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <InfinitLogo size={16} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <GlassCard isUser={msg.role === "user"} isError={msg.error}>
                  <>
                    {formatMessage(msg.content)}
                    {msg.streaming && <span style={{ display: "inline-block", width: 2, height: 13, background: COLORS.sky, marginLeft: 2, verticalAlign: "middle", animation: "bounce 0.8s ease-in-out infinite" }} />}
                  </>
                </GlassCard>
                {msg.role === "assistant" && !msg.streaming && msg.content && !msg.error && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, paddingLeft: 2 }}>
                    {msg.model && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontWeight: 700 }}>{MODEL_VERSIONS.find(m => m.id === msg.model)?.label || msg.model}</span>}
                    {msg.mode && msg.mode !== "normal" && (
                      <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, color: msg.mode === "quiz" ? COLORS.purple : msg.mode === "hint" ? "#facc15" : COLORS.sky }}>
                        {msg.mode}
                      </span>
                    )}
                    {msg.elapsed && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontWeight: 600 }}>{msg.elapsed}s</span>}
                    <CopyButton text={msg.content} />
                    <BookmarkButton message={msg} question={msg.question} onSave={bookmarkAnswer} saved={isBookmarked(msg)} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: 700, width: "100%", margin: "0 auto", animation: "fadeUp 0.25s ease-out" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(113,90,255,0.12)", border: "1px solid rgba(88,135,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <InfinitLogo size={16} />
              </div>
              <div style={{ padding: "11px 15px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(88,135,255,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <TypingDots />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>{MODEL_VERSIONS.find(m => m.id === selectedModel)?.label}</span>
                </div>
              </div>
            </div>
          )}

          {!isLoading && lastQuestion && messages.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <button onClick={regenerate} style={{ background: "none", border: "1px solid rgba(88,135,255,0.15)", borderRadius: 100, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(88,135,255,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(88,135,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                ↺ regenerate
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 20px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative", zIndex: 10, flexShrink: 0 }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            {uploadedFile && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(85,193,255,0.07)", border: "1px solid rgba(85,193,255,0.22)", borderRadius: 100, padding: "3px 10px", marginBottom: 7, fontSize: 11, color: "rgba(85,193,255,0.8)", fontWeight: 700 }}>
                {uploadedFile.name}
                <button onClick={() => setUploadedFile(null)} style={{ background: "none", border: "none", color: "rgba(85,193,255,0.5)", fontSize: 13, lineHeight: 1, padding: "0 0 0 2px" }}>×</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: "none" }} onChange={handleFileUpload} />

              {/* Attach */}
              <button className={`icon-btn${uploadedFile ? " active" : ""}`} disabled={isLoading || isUploading} onClick={() => fileInputRef.current?.click()}>
                {isUploading
                  ? <div style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid rgba(85,193,255,0.3)", borderTop: "1.5px solid #55C1FF", animation: "spin 0.8s linear infinite" }} />
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={uploadedFile ? "#55C1FF" : "rgba(255,255,255,0.45)"} strokeWidth="2" strokeLinecap="round" /></svg>
                }
              </button>

              {/* Textarea */}
              <div style={{ flex: 1, position: "relative" }}>
                <textarea ref={inputRef} className="input-field" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask any science question..." rows={1} disabled={isLoading} />
                <div style={{ position: "absolute", right: 10, bottom: 9 }}>
                  <ModelSelector selected={selectedModel} onChange={setSelectedModel} models={MODEL_VERSIONS} />
                </div>
              </div>

              {/* Mode toggles */}
              <button className="mode-btn" onClick={() => toggleMode("quiz")}
                style={{ background: chatMode === "quiz" ? "rgba(166,130,255,0.18)" : "transparent", border: `1px solid ${chatMode === "quiz" ? "rgba(166,130,255,0.45)" : "rgba(88,135,255,0.2)"}`, color: chatMode === "quiz" ? COLORS.purple : "rgba(255,255,255,0.3)" }}
                title="Quiz mode: generates 3 multiple-choice questions">
                quiz
              </button>
              <button className="mode-btn" onClick={() => toggleMode("socratic")}
                style={{ background: chatMode === "socratic" ? "rgba(85,193,255,0.12)" : "transparent", border: `1px solid ${chatMode === "socratic" ? "rgba(85,193,255,0.45)" : "rgba(88,135,255,0.2)"}`, color: chatMode === "socratic" ? COLORS.sky : "rgba(255,255,255,0.3)" }}
                title="Guide mode: Socratic questions to help you think it through">
                guide
              </button>
              <button className="mode-btn" onClick={() => toggleMode("hint")}
                style={{ background: chatMode === "hint" ? "rgba(250,204,21,0.12)" : "transparent", border: `1px solid ${chatMode === "hint" ? "rgba(250,204,21,0.45)" : "rgba(88,135,255,0.2)"}`, color: chatMode === "hint" ? "#facc15" : "rgba(255,255,255,0.3)" }}
                title="Hint mode: one clue to nudge you forward without giving the answer">
                hint
              </button>

              {/* Send / Stop */}
              {isLoading ? (
                <button className="stop-btn" onClick={stopResponse}>
                  <div className="stop-btn-square" />
                </button>
              ) : (
                <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || isLoading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M5 12l7-7 7 7" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.13)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {chatMode !== "normal" && (
                <span style={{ color: chatMode === "quiz" ? COLORS.purple : chatMode === "hint" ? "#facc15" : COLORS.sky, fontWeight: 700, opacity: 0.8 }}>
                  {chatMode === "quiz" ? "quiz mode" : chatMode === "hint" ? "hint mode" : "guide mode"} ·
                </span>
              )}
              infinit is experimental — answers may not always be accurate — made for curious K–8 learners
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
