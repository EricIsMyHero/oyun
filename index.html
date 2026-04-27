<!DOCTYPE html>
<html lang="az">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CLASH-A-MANA — Official Codex</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
/* ═══════════════════════════════════════════════════════
   ROOT VARIABLES
═══════════════════════════════════════════════════════ */
:root {
  --bg:          #05070f;
  --bg2:         #080b18;
  --surface:     #0d1124;
  --surface2:    #111629;
  --border:      rgba(90,110,200,0.18);
  --border-glow: rgba(120,140,255,0.35);
  --text:        #e8eeff;
  --muted:       #6a78a8;
  --accent:      #7b9cff;
  --accent2:     #a78bfa;
  --gold:        #e8c95a;
  --gold2:       #f0d878;
  --glow-blue:   rgba(100,140,255,0.4);
  --glow-purple: rgba(167,139,250,0.4);
  --glow-gold:   rgba(232,201,90,0.5);

  --mundane:    #9ca3af;
  --familiar:   #4ade80;
  --arcane:     #a78bfa;
  --relic:      #f87171;
  --ascendant:  #fb923c;
  --apex:       #facc15;
  --ethereal:   #f472b6;

  --font-display: 'Cinzel Decorative', serif;
  --font-head:    'Cinzel', serif;
  --font-body:    'Crimson Text', serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 18px;
  overflow-x: hidden;
  min-height: 100vh;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #2a3060; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* ═══════════════════════════════════════════════════════
   CANVAS PARTICLES
═══════════════════════════════════════════════════════ */
#particle-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
}

/* ═══════════════════════════════════════════════════════
   INTRO / HERO SCREEN
═══════════════════════════════════════════════════════ */
#intro-screen {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 1;
  overflow: hidden;
}

.intro-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(80,100,220,0.25) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(140,80,240,0.2) 0%, transparent 60%),
    radial-gradient(ellipse 50% 50% at 20% 60%, rgba(50,80,200,0.15) 0%, transparent 60%),
    var(--bg);
}

.intro-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(90,110,200,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(90,110,200,0.06) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
}

.intro-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  animation: orb-float 8s ease-in-out infinite;
}
.orb1 { width:500px; height:500px; background:rgba(80,100,220,0.12); top:-100px; left:-100px; animation-delay:0s; }
.orb2 { width:400px; height:400px; background:rgba(140,80,240,0.1); bottom:-80px; right:-80px; animation-delay:-3s; }
.orb3 { width:300px; height:300px; background:rgba(200,150,50,0.08); top:50%; left:60%; animation-delay:-5s; }

@keyframes orb-float {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(30px,-20px) scale(1.05); }
  66% { transform: translate(-20px,30px) scale(0.95); }
}

.intro-content { position: relative; z-index: 2; padding: 40px 20px; max-width: 900px; }

.intro-eyebrow {
  font-family: var(--font-head);
  font-size: 11px;
  letter-spacing: 0.4em;
  color: var(--gold);
  text-transform: uppercase;
  opacity: 0;
  animation: fade-up 1s ease 0.5s forwards;
}

.intro-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 1.05;
  margin: 20px 0 10px;
  background: linear-gradient(135deg, #ffffff 0%, #c0ccff 40%, var(--accent2) 70%, var(--gold) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  opacity: 0;
  animation: fade-up 1s ease 0.9s forwards;
}

.intro-divider {
  width: 200px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  margin: 24px auto;
  opacity: 0;
  animation: fade-up 1s ease 1.2s forwards;
}

.intro-subtitle {
  font-family: var(--font-head);
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  letter-spacing: 0.15em;
  color: var(--muted);
  opacity: 0;
  animation: fade-up 1s ease 1.4s forwards;
}

.intro-story-preview {
  margin: 40px auto;
  max-width: 680px;
  opacity: 0;
  animation: fade-up 1s ease 1.8s forwards;
}

.intro-story-preview p {
  font-size: 1.1rem;
  line-height: 1.8;
  color: rgba(232,238,255,0.75);
  font-style: italic;
}

.intro-cta-group {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  opacity: 0;
  animation: fade-up 1s ease 2.2s forwards;
}

.btn-primary {
  font-family: var(--font-head);
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 16px 40px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: white;
  transition: all 0.3s ease;
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}

.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 0 40px var(--glow-blue), 0 0 80px rgba(100,140,255,0.2); }
.btn-primary:hover::before { opacity: 1; }

.btn-secondary {
  font-family: var(--font-head);
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 16px 40px;
  border: 1px solid rgba(120,140,255,0.3);
  border-radius: 2px;
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  transition: all 0.3s ease;
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}

.btn-secondary:hover { background: rgba(100,140,255,0.1); border-color: var(--accent); transform: translateY(-3px); }

.intro-scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0;
  animation: fade-in 1s ease 3s forwards;
}

.scroll-line {
  width: 1px;
  height: 50px;
  background: linear-gradient(to bottom, var(--accent), transparent);
  animation: scroll-pulse 2s ease infinite;
}

@keyframes scroll-pulse {
  0%,100% { opacity: 0.4; transform: scaleY(1); }
  50% { opacity: 1; transform: scaleY(1.2); }
}

.scroll-text {
  font-family: var(--font-head);
  font-size: 10px;
  letter-spacing: 0.3em;
  color: var(--muted);
  text-transform: uppercase;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ═══════════════════════════════════════════════════════
   MAIN LAYOUT — AFTER INTRO
═══════════════════════════════════════════════════════ */
#site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(5,7,15,0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.nav-logo {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 8px;
  list-style: none;
}

.nav-links button {
  font-family: var(--font-head);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 8px 20px;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  background: transparent;
  color: var(--muted);
  transition: all 0.25s ease;
}

.nav-links button:hover,
.nav-links button.active {
  color: var(--text);
  border-color: var(--border-glow);
  background: rgba(100,140,255,0.08);
}

.nav-links button.active { color: var(--accent); }

/* ═══════════════════════════════════════════════════════
   SECTIONS WRAPPER
═══════════════════════════════════════════════════════ */
#main-portal {
  display: none;
}

.section-wrap {
  max-width: 1360px;
  margin: 0 auto;
  padding: 80px 40px;
}

.section-eyebrow {
  font-family: var(--font-head);
  font-size: 10px;
  letter-spacing: 0.5em;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 16px;
}

.section-title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 3rem);
  background: linear-gradient(135deg, #ffffff, var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
}

.section-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, var(--gold) 0%, rgba(120,140,255,0.3) 40%, transparent 100%);
  margin-bottom: 60px;
}

/* ═══════════════════════════════════════════════════════
   LORE SECTION
═══════════════════════════════════════════════════════ */
#lore-section { display: none; }

.lore-intro-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  margin-bottom: 100px;
}

.lore-text-side p {
  font-size: 1.15rem;
  line-height: 1.9;
  color: rgba(232,238,255,0.8);
  margin-bottom: 20px;
}

.lore-highlight-quote {
  border-left: 3px solid var(--gold);
  padding: 20px 28px;
  background: rgba(232,201,90,0.05);
  margin: 30px 0;
  font-style: italic;
  font-size: 1.25rem;
  color: var(--gold2);
  line-height: 1.6;
}

.lore-visual-side {
  position: relative;
}

.lore-faction-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 32px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.lore-faction-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}

.faction-crimson::before { background: linear-gradient(90deg, #dc2626, #991b1b); }
.faction-azure::before   { background: linear-gradient(90deg, #2563eb, #1d4ed8); }

.lore-faction-card:hover { transform: translateX(8px); border-color: var(--border-glow); }

.faction-badge {
  display: inline-block;
  font-family: var(--font-head);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 2px;
  margin-bottom: 12px;
}

.faction-crimson .faction-badge { background: rgba(220,38,38,0.2); color: #fca5a5; border: 1px solid rgba(220,38,38,0.3); }
.faction-azure .faction-badge   { background: rgba(37,99,235,0.2);  color: #93c5fd; border: 1px solid rgba(37,99,235,0.3); }

.faction-name {
  font-family: var(--font-head);
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text);
}

.faction-desc {
  font-size: 1rem;
  color: var(--muted);
  line-height: 1.7;
}

/* Lore Chapters */
.lore-chapters { margin-top: 80px; }

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2px;
  margin-top: 40px;
}

.chapter-card {
  background: var(--surface);
  padding: 40px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chapter-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(100,140,255,0.05), rgba(167,139,250,0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chapter-card:hover::after { opacity: 1; }
.chapter-card:hover { transform: translateY(-4px); }

.chapter-num {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 900;
  color: rgba(100,140,255,0.1);
  line-height: 1;
  margin-bottom: 12px;
}

.chapter-icon {
  font-size: 2rem;
  margin-bottom: 16px;
  display: block;
}

.chapter-title {
  font-family: var(--font-head);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text);
  margin-bottom: 12px;
}

.chapter-text {
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════════════
   CARDS DATABASE SECTION
═══════════════════════════════════════════════════════ */
#cards-section { display: none; }

.db-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.db-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-label {
  font-family: var(--font-head);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  margin-right: 4px;
}

.filter-btn {
  font-family: var(--font-head);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 2px;
  cursor: pointer;
  background: transparent;
  color: var(--muted);
  transition: all 0.2s ease;
}

.filter-btn:hover { border-color: var(--border-glow); color: var(--text); }
.filter-btn.active { background: rgba(100,140,255,0.15); border-color: var(--accent); color: var(--accent); }

.filter-btn[data-rarity="mundane"].active    { border-color: var(--mundane);   color: var(--mundane);   background: rgba(156,163,175,0.1); }
.filter-btn[data-rarity="familiar"].active   { border-color: var(--familiar);  color: var(--familiar);  background: rgba(74,222,128,0.1); }
.filter-btn[data-rarity="arcane"].active     { border-color: var(--arcane);    color: var(--arcane);    background: rgba(167,139,250,0.1); }
.filter-btn[data-rarity="relic"].active      { border-color: var(--relic);     color: var(--relic);     background: rgba(248,113,113,0.1); }
.filter-btn[data-rarity="ascendant"].active  { border-color: var(--ascendant); color: var(--ascendant); background: rgba(251,146,60,0.1); }
.filter-btn[data-rarity="apex"].active       { border-color: var(--apex);      color: var(--apex);      background: rgba(250,204,21,0.1); }
.filter-btn[data-rarity="ethereal"].active   { border-color: var(--ethereal);  color: var(--ethereal);  background: rgba(244,114,182,0.1); }

.search-box {
  position: relative;
}

.search-box input {
  font-family: var(--font-head);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding: 12px 20px 12px 44px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text);
  outline: none;
  width: 280px;
  transition: border-color 0.25s ease;
}

.search-box input:focus { border-color: var(--border-glow); }
.search-box input::placeholder { color: var(--muted); }

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 0.9rem;
}

.db-stats {
  font-family: var(--font-head);
  font-size: 0.8rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.db-stats span { color: var(--accent); font-weight: 600; }

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

/* Card Item */
.card-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  position: relative;
  animation: card-appear 0.4s ease both;
}

@keyframes card-appear {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-item:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: var(--border-glow);
  box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px var(--rarity-glow, rgba(100,140,255,0.2));
}

.card-rarity-bar {
  height: 3px;
  width: 100%;
}

.card-img-wrap {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
  background: linear-gradient(160deg, #0d1124, #111629);
}

.card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card-item:hover .card-img-wrap img { transform: scale(1.1); }

.card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  opacity: 0.15;
}

.card-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5,7,15,0.9) 0%, transparent 60%);
}

.card-mana-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #6096ff, #2a50d0);
  border: 2px solid rgba(120,160,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 0 15px rgba(80,120,255,0.5), inset 0 1px 1px rgba(255,255,255,0.2);
}

.card-body {
  padding: 16px;
}

.card-name {
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: 0.03em;
}

.card-group-tag {
  font-family: var(--font-head);
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
}

.card-mini-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-head);
  font-size: 0.7rem;
  color: var(--muted);
}

.mini-stat-icon { font-size: 0.75rem; }
.mini-stat-val  { color: var(--text); font-weight: 600; }

.card-rarity-tag {
  position: absolute;
  bottom: 12px;
  right: 12px;
  font-family: var(--font-head);
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid currentColor;
  opacity: 0.7;
}

/* Rarity colors */
.r-mundane   { --rarity-color: var(--mundane);   }
.r-familiar  { --rarity-color: var(--familiar);  }
.r-arcane    { --rarity-color: var(--arcane);    }
.r-relic     { --rarity-color: var(--relic);     }
.r-ascendant { --rarity-color: var(--ascendant); }
.r-apex      { --rarity-color: var(--apex);      }
.r-ethereal  { --rarity-color: var(--ethereal);  }

.card-item .card-rarity-bar  { background: var(--rarity-color); }
.card-item .card-rarity-tag  { color: var(--rarity-color); }
.card-item:hover { --rarity-glow: color-mix(in srgb, var(--rarity-color) 30%, transparent); }

/* No results */
.no-results {
  grid-column: 1/-1;
  text-align: center;
  padding: 80px 20px;
  color: var(--muted);
  font-family: var(--font-head);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

/* ═══════════════════════════════════════════════════════
   CARD DETAIL MODAL
═══════════════════════════════════════════════════════ */
#modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

#modal-overlay.open {
  opacity: 1;
  pointer-events: all;
}

.modal-box {
  background: var(--surface2);
  border: 1px solid var(--border-glow);
  border-radius: 4px;
  max-width: 860px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: grid;
  grid-template-columns: 280px 1fr;
  transform: translateY(20px) scale(0.97);
  transition: transform 0.3s ease;
}

#modal-overlay.open .modal-box {
  transform: translateY(0) scale(1);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 2px;
  background: var(--surface);
  color: var(--muted);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
}

.modal-close:hover { border-color: var(--border-glow); color: var(--text); }

.modal-img-col {
  position: relative;
  background: linear-gradient(160deg, #0a0e1e, #0d1124);
  overflow: hidden;
}

.modal-img-col img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.modal-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  opacity: 0.1;
  min-height: 300px;
}

.modal-img-gradient {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: linear-gradient(to right, transparent, var(--surface2));
}

.modal-img-rarity {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.modal-content-col { padding: 40px 40px 40px 32px; }

.modal-rarity-badge {
  display: inline-block;
  font-family: var(--font-head);
  font-size: 0.65rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 2px;
  margin-bottom: 12px;
  border: 1px solid currentColor;
}

.modal-card-name {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 900;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.2;
}

.modal-card-group {
  font-family: var(--font-head);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 24px;
}

.modal-section-label {
  font-family: var(--font-head);
  font-size: 0.65rem;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 12px;
  margin-top: 24px;
}

.stat-bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 48px;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.stat-label-sm {
  font-family: var(--font-head);
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.stat-bar-track {
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  width: 0;
}

.stat-val-sm {
  font-family: var(--font-head);
  font-size: 0.8rem;
  color: var(--text);
  text-align: right;
  font-weight: 600;
}

.modal-trait-box {
  background: rgba(100,140,255,0.05);
  border: 1px solid rgba(100,140,255,0.15);
  border-left: 3px solid var(--accent);
  padding: 14px 16px;
  border-radius: 2px;
  font-size: 1rem;
  color: rgba(232,238,255,0.85);
  line-height: 1.6;
}

.modal-story-box {
  background: rgba(232,201,90,0.04);
  border: 1px solid rgba(232,201,90,0.12);
  border-left: 3px solid var(--gold);
  padding: 14px 16px;
  border-radius: 2px;
  font-style: italic;
  font-size: 1rem;
  color: rgba(232,238,255,0.7);
  line-height: 1.7;
}

.modal-lore-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  font-family: var(--font-head);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
}
.modal-lore-link:hover { color: var(--gold); border-color: rgba(232,201,90,0.3); }

/* ═══════════════════════════════════════════════════════
   SPELLS SECTION
═══════════════════════════════════════════════════════ */
#spells-section { display: none; }

.spells-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.spell-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: card-appear 0.4s ease both;
}

.spell-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
}

.spell-legendary::before { background: linear-gradient(90deg, var(--apex), var(--ascendant)); }
.spell-epic::before       { background: linear-gradient(90deg, var(--arcane), var(--ethereal)); }
.spell-common::before     { background: linear-gradient(90deg, var(--mundane), var(--familiar)); }
.spell-rare::before     { background: linear-gradient(90deg, var(--familiar), var(--arcane)); }

.spell-item:hover { transform: translateY(-4px); border-color: var(--border-glow); }

.spell-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.spell-name {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.spell-energy-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-head);
  font-size: 0.75rem;
  color: #a78bfa;
  background: rgba(167,139,250,0.1);
  border: 1px solid rgba(167,139,250,0.2);
  padding: 4px 10px;
  border-radius: 20px;
}

.spell-rarity-tag {
  font-family: var(--font-head);
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.spell-rarity-legendary { color: var(--apex); }
.spell-rarity-epic      { color: var(--arcane); }
.spell-rarity-common    { color: var(--mundane); }
.spell-rarity-rare      { color: var(--familiar); }

.spell-treat {
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 16px;
}

.spell-stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.spell-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 2px;
}

.spell-stat-label {
  font-family: var(--font-head);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.spell-stat-val {
  font-family: var(--font-head);
  font-size: 0.85rem;
  color: var(--text);
  font-weight: 600;
}

/* ═══════════════════════════════════════════════════════
   INFO / CODEX SECTION
═══════════════════════════════════════════════════════ */
#info-section { display: none; }

.codex-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 40px;
  align-items: start;
}

.codex-nav {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.codex-nav-btn {
  font-family: var(--font-head);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px 16px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  background: transparent;
  color: var(--muted);
  text-align: left;
  transition: all 0.2s ease;
  border-left: 2px solid transparent;
}

.codex-nav-btn:hover { color: var(--text); background: rgba(255,255,255,0.03); }
.codex-nav-btn.active { color: var(--accent); background: rgba(100,140,255,0.08); border-left-color: var(--accent); }

.codex-content { min-height: 400px; }

.codex-entry {
  display: none;
}
.codex-entry.visible { display: block; }

.codex-heading {
  font-family: var(--font-display);
  font-size: 1.8rem;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--text), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.codex-para {
  font-size: 1.05rem;
  color: rgba(232,238,255,0.8);
  line-height: 1.9;
  margin-bottom: 20px;
}

.codex-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.codex-list-item {
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.codex-list-item strong {
  font-family: var(--font-head);
  font-size: 0.85rem;
  color: var(--accent);
  display: block;
  margin-bottom: 6px;
  letter-spacing: 0.05em;
}

.codex-list-item span {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.group-card {
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.group-card:hover { transform: translateY(-3px); border-color: var(--border-glow); }

.group-icon {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.group-name {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.group-desc {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 14px;
  line-height: 1.6;
}

.group-members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-tag {
  font-family: var(--font-head);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  padding: 3px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--muted);
}

/* ═══════════════════════════════════════════════════════
   FADE-IN ON SCROLL
═══════════════════════════════════════════════════════ */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible { opacity: 1; transform: none; }

/* ═══════════════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .lore-intro-block { grid-template-columns: 1fr; gap: 40px; }
  .modal-box { grid-template-columns: 1fr; }
  .modal-img-col { min-height: 220px; }
  .modal-img-gradient { display: none; }
  .codex-layout { grid-template-columns: 1fr; }
  .codex-nav { position: static; flex-direction: row; flex-wrap: wrap; }
  .section-wrap { padding: 60px 20px; }
  #site-nav { padding: 0 20px; }
}
</style>
</head>
<body>

<!-- Particles -->
<canvas id="particle-canvas"></canvas>

<!-- ═══ INTRO HERO ═══ -->
<section id="intro-screen">
  <div class="intro-bg"></div>
  <div class="intro-grid"></div>
  <div class="intro-orb orb1"></div>
  <div class="intro-orb orb2"></div>
  <div class="intro-orb orb3"></div>

  <div class="intro-content">
    <p class="intro-eyebrow">Official Lore Codex &amp; Card Database</p>
    <h1 class="intro-title">Clash-A-Mana</h1>
    <div class="intro-divider"></div>
    <p class="intro-subtitle">Stagnantia: The Tale of the Endless Cycle</p>

    <div class="intro-story-preview">
      <p>The year is 2467. Humanity has reached the pinnacle of technological advancement — yet is spiritually exhausted. To combat mass stagnation, a ruthless project was launched. You are a card. You are a soldier. You are entertainment.</p>
    </div>

    <div class="intro-cta-group">
      <button class="btn-primary" id="explore-btn">Explore Cards</button>
      <button class="btn-secondary" id="lore-btn">Read the Lore</button>
    </div>
  </div>

  <div class="intro-scroll-hint">
    <div class="scroll-line"></div>
    <span class="scroll-text">Scroll</span>
  </div>
</section>

<!-- ═══ MAIN PORTAL ═══ -->
<div id="main-portal">

  <!-- Nav -->
  <nav id="site-nav">
    <div class="nav-logo" id="nav-logo">CAM</div>
    <ul class="nav-links">
      <li><button class="nav-btn" data-section="lore">Lore</button></li>
      <li><button class="nav-btn" data-section="cards">Cards</button></li>
      <li><button class="nav-btn" data-section="spells">Spells</button></li>
      <li><button class="nav-btn" data-section="info">Codex</button></li>
    </ul>
  </nav>

  <!-- LORE SECTION -->
  <section id="lore-section">
    <div class="section-wrap">
      <p class="section-eyebrow reveal">Chapter I — The World of Stagnantia</p>
      <h2 class="section-title reveal">The Endless Cycle</h2>
      <div class="section-divider reveal"></div>

      <div class="lore-intro-block reveal">
        <div class="lore-text-side">
          <p>The year is 2467. Humanity has reached the pinnacle of technological advancement, but is spiritually exhausted. Diseases have been cured, resource problems solved. However, this perfection has brought about a great curse — a period of stagnation in Stagnantia. People no longer enjoy anything or create anything new.</p>
          <p>To combat this mass feeling of boredom, a ruthless project is launched: <strong>Clash-A-Mana.</strong> Scientists discovered reality-warping portals that bring beings from different times and dimensions — ancient knights, robots of the future, mythological monsters, and wild beasts — into the arena.</p>
          <div class="lore-highlight-quote">"The only way to freedom is not to win the game, but to destroy the system itself."</div>
          <p>You are dealt digital cards. These cards are the only way to control the beings brought through portals. You have only one objective — destroy the opponent tower and be free. But freedom is a lie they tell you.</p>
        </div>

        <div class="lore-visual-side">
          <div class="lore-faction-card faction-crimson">
            <span class="faction-badge">Ruling Class</span>
            <div class="faction-name">⚔ The Crimson Crown</div>
            <p class="faction-desc">The world's rulers and the wealthy. Architects of Stagnantia who live in comfort. For them, life is just a control panel. They watch the battles as entertainment, always from above.</p>
          </div>
          <div class="lore-faction-card faction-azure">
            <span class="faction-badge">Working Class</span>
            <div class="faction-name">🌊 The Azure Core</div>
            <p class="faction-desc">The rest of society — the working class, ordinary people. They are the cogs in the system created by the Crimson Crown. The Azure Core is always struggling, but this struggle never lifts them to the upper class.</p>
          </div>
        </div>
      </div>

      <!-- Chapters -->
      <div class="lore-chapters">
        <p class="section-eyebrow reveal">World Codex</p>
        <h2 class="section-title reveal">Lore Archives</h2>

        <div class="chapter-grid reveal">
          <div class="chapter-card">
            <div class="chapter-num">01</div>
            <span class="chapter-icon">🌍</span>
            <div class="chapter-title">The World of Stagnantia</div>
            <p class="chapter-text">A dystopian 2467 where perfection became a curse. Technological utopia gave rise to spiritual emptiness, and from that void — Clash-A-Mana was born.</p>
          </div>
          <div class="chapter-card">
            <div class="chapter-num">02</div>
            <span class="chapter-icon">🔮</span>
            <div class="chapter-title">The Mana Portals</div>
            <p class="chapter-text">Reality-warping gateways that tear through time and dimension, dragging warriors, monsters, and mythological entities into the arena against their will.</p>
          </div>
          <div class="chapter-card">
            <div class="chapter-num">03</div>
            <span class="chapter-icon">⚡</span>
            <div class="chapter-title">The Clash System</div>
            <p class="chapter-text">Giant symmetrical arenas house the battles. Red castle for the Crimson Crown, blue for the Azure Core. Destroy the enemy tower — but freedom is always one battle away.</p>
          </div>
          <div class="chapter-card">
            <div class="chapter-num">04</div>
            <span class="chapter-icon">🃏</span>
            <div class="chapter-title">The Card Wielders</div>
            <p class="chapter-text">Kidnapped from the Azure Core, forced to fight. Each card wielder controls beings through digital mana bonds — strategy is survival, not sport.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CARDS SECTION -->
  <section id="cards-section">
    <div class="section-wrap">
      <div class="db-header">
        <div>
          <p class="section-eyebrow">Entity Registry</p>
          <h2 class="section-title">Card Database</h2>
          <div class="db-stats">Showing <span id="card-count">0</span> entities</div>
        </div>
        <div class="db-controls">
          <div class="filter-row">
            <span class="filter-label">Rarity</span>
            <button class="filter-btn active" data-rarity="all">All</button>
            <button class="filter-btn" data-rarity="mundane">Mundane</button>
            <button class="filter-btn" data-rarity="familiar">Familiar</button>
            <button class="filter-btn" data-rarity="arcane">Arcane</button>
            <button class="filter-btn" data-rarity="relic">Relic</button>
            <button class="filter-btn" data-rarity="ascendant">Ascendant</button>
            <button class="filter-btn" data-rarity="apex">Apex</button>
            <button class="filter-btn" data-rarity="ethereal">Ethereal</button>
          </div>
          <div class="filter-row">
            <div class="search-box">
              <span class="search-icon">⌕</span>
              <input type="text" id="card-search" placeholder="Search entities...">
            </div>
          </div>
        </div>
      </div>

      <div class="cards-grid" id="cards-grid">
        <div class="no-results">Loading entity registry...</div>
      </div>
    </div>
  </section>

  <!-- SPELLS SECTION -->
  <section id="spells-section">
    <div class="section-wrap">
      <div class="db-header">
        <div>
          <p class="section-eyebrow">Arcane Arsenal</p>
          <h2 class="section-title">Spell Archive</h2>
          <div class="db-stats">Showing <span id="spell-count">0</span> spells</div>
        </div>
        <div class="db-controls">
          <div class="filter-row">
            <span class="filter-label">Rarity</span>
            <button class="filter-btn spell-filter active" data-filter="all">All</button>
            <button class="filter-btn spell-filter" data-filter="legendary">Legendary</button>
            <button class="filter-btn spell-filter" data-filter="epic">Epic</button>
            <button class="filter-btn spell-filter" data-filter="rare">Rare</button>
            <button class="filter-btn spell-filter" data-filter="common">Common</button>
          </div>
          <div class="filter-row">
            <span class="filter-label">Type</span>
            <button class="filter-btn spell-type active" data-type="all">All</button>
            <button class="filter-btn spell-type" data-type="normal">Normal</button>
            <button class="filter-btn spell-type" data-type="building">Building</button>
          </div>
        </div>
      </div>
      <div class="spells-grid" id="spells-grid">
        <div class="no-results">Loading arcane archive...</div>
      </div>
    </div>
  </section>

  <!-- INFO / CODEX SECTION -->
  <section id="info-section">
    <div class="section-wrap">
      <p class="section-eyebrow">Game Mechanics</p>
      <h2 class="section-title">The Codex</h2>
      <div class="section-divider"></div>

      <div class="codex-layout">
        <nav class="codex-nav" id="codex-nav"></nav>
        <div class="codex-content" id="codex-content"></div>
      </div>
    </div>
  </section>

</div>

<!-- ═══ CARD DETAIL MODAL ═══ -->
<div id="modal-overlay">
  <div class="modal-box" id="modal-box">
    <button class="modal-close" id="modal-close">✕</button>
    <div class="modal-img-col" id="modal-img-col">
      <div class="modal-img-rarity" id="modal-img-rarity"></div>
      <img id="modal-img" src="" alt="" style="display:none">
      <div class="modal-img-placeholder" id="modal-placeholder">⚔</div>
      <div class="modal-img-gradient"></div>
    </div>
    <div class="modal-content-col" id="modal-content">
      <!-- filled by JS -->
    </div>
  </div>
</div>

<script>
/* ═══════════════════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.15,
      dy: -Math.random() * 0.2 - 0.05,
      a: Math.random() * 0.6 + 0.1,
      hue: Math.random() < 0.6 ? 225 : (Math.random() < 0.5 ? 260 : 45)
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc((p.x % W + W) % W, (p.y % H + H) % H, p.r, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.a})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.y < -5) p.y = H + 5;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ═══════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════ */
const GITHUB_BASE = 'https://raw.githubusercontent.com/EricIsMyHero/oyun/main/assets';

const introScreen = document.getElementById('intro-screen');
const mainPortal  = document.getElementById('main-portal');
const sections = {
  lore:   document.getElementById('lore-section'),
  cards:  document.getElementById('cards-section'),
  spells: document.getElementById('spells-section'),
  info:   document.getElementById('info-section'),
};

let currentSection = null;
let allCards = [];
let allSpells = [];
let infoData = null;
let groupsData = null;
let activeRarity = 'all';
let activeSpellRarity = 'all';
let activeSpellType = 'all';

function showPortal(section) {
  introScreen.style.display = 'none';
  mainPortal.style.display = 'block';
  switchSection(section);
}

function switchSection(name) {
  currentSection = name;
  Object.values(sections).forEach(s => s.style.display = 'none');
  if (sections[name]) sections[name].style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
  });

  if (name === 'cards')  initCards();
  if (name === 'spells') initSpells();
  if (name === 'info')   initInfo();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  initReveal();
}

document.getElementById('explore-btn').addEventListener('click', () => showPortal('cards'));
document.getElementById('lore-btn').addEventListener('click',    () => showPortal('lore'));
document.getElementById('nav-logo').addEventListener('click', () => {
  mainPortal.style.display = 'none';
  introScreen.style.display = 'flex';
  window.scrollTo({ top: 0 });
});

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

/* ═══════════════════════════════════════════════════════
   CARD IMAGE URL
═══════════════════════════════════════════════════════ */
function getCardImg(card) {
  const group = (card.group || '').toLowerCase().replace(/\s+/g,'-');
  const name  = (card.name  || '').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  if (group) return `${GITHUB_BASE}/${group}/${name}.jpg`;
  return `${GITHUB_BASE}/${name}.jpg`;
}

/* ═══════════════════════════════════════════════════════
   CARDS
═══════════════════════════════════════════════════════ */
const RARITY_FILES = ['mundane','familiar','arcane','relic','ascendant','apex','ethereal'];

async function initCards() {
  if (allCards.length === 0) {
    try {
      const results = await Promise.all(
        RARITY_FILES.map(r => fetch(`rarity/${r}.json`).then(res => res.ok ? res.json() : []).catch(() => []))
      );
      allCards = results.flat();
    } catch(e) {
      document.getElementById('cards-grid').innerHTML = '<div class="no-results">Could not load card data.</div>';
      return;
    }
  }
  renderCards();
  setupCardFilters();
}

function setupCardFilters() {
  document.querySelectorAll('.filter-btn[data-rarity]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn[data-rarity]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRarity = btn.dataset.rarity;
      renderCards();
    };
  });
  const search = document.getElementById('card-search');
  search.oninput = () => renderCards();
}

function renderCards() {
  const grid   = document.getElementById('cards-grid');
  const search = document.getElementById('card-search').value.toLowerCase().trim();
  const count  = document.getElementById('card-count');

  let filtered = allCards;
  if (activeRarity !== 'all') filtered = filtered.filter(c => (c.rarity||'').toLowerCase() === activeRarity);
  if (search) filtered = filtered.filter(c => (c.name||'').toLowerCase().includes(search));

  count.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No entities found matching your filters.</div>';
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((card, i) => {
    const el = createCardEl(card, i);
    grid.appendChild(el);
  });
}

function getRarityEmoji(r) {
  const map = { mundane:'⚙', familiar:'🌿', arcane:'🔮', relic:'📿', ascendant:'🔥', apex:'👑', ethereal:'✨' };
  return map[(r||'').toLowerCase()] || '⚔';
}

function createCardEl(card, idx) {
  const rarity = (card.rarity || 'mundane').toLowerCase();
  const stats  = card.stats || {};
  const imgUrl = getCardImg(card);

  const el = document.createElement('div');
  el.className = `card-item r-${rarity}`;
  el.style.animationDelay = `${idx * 0.04}s`;

  const mana = stats.mana !== undefined ? stats.mana : '?';

  el.innerHTML = `
    <div class="card-rarity-bar"></div>
    <div class="card-img-wrap">
      <img src="${imgUrl}" alt="${card.name}" loading="lazy"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='none'; this.parentElement.querySelector('.card-img-placeholder').style.display='flex';">
      <div class="card-img-overlay"></div>
      <div class="card-img-placeholder" style="display:none">${getRarityEmoji(rarity)}</div>
      <div class="card-mana-badge">${mana}</div>
    </div>
    <div class="card-body">
      <div class="card-name">${card.name || 'Unknown'}</div>
      <div class="card-group-tag">${card.group || 'Stagnantia'}</div>
      <div class="card-mini-stats">
        ${stats.health  !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">❤</span><span class="mini-stat-val">${stats.health}</span></div>` : ''}
        ${stats.damage  !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">⚔</span><span class="mini-stat-val">${stats.damage}</span></div>` : ''}
        ${stats.shield  !== undefined ? `<div class="mini-stat"><span class="mini-stat-icon">🛡</span><span class="mini-stat-val">${stats.shield}</span></div>` : ''}
      </div>
    </div>
    <div class="card-rarity-tag">${card.rarity || ''}</div>
  `;

  el.addEventListener('click', () => openModal(card));
  return el;
}

/* ═══════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════ */
const modal = document.getElementById('modal-overlay');
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openModal(card) {
  const rarity  = (card.rarity || 'mundane').toLowerCase();
  const stats   = card.stats || {};
  const imgUrl  = getCardImg(card);
  const rarColor = getComputedStyle(document.documentElement).getPropertyValue(`--${rarity}`).trim() || '#7b9cff';

  // Image
  const img     = document.getElementById('modal-img');
  const pholder = document.getElementById('modal-placeholder');
  img.src = imgUrl;
  img.style.display = 'block';
  pholder.style.display = 'none';
  img.onerror = () => { img.style.display='none'; pholder.style.display='flex'; };

  document.getElementById('modal-img-rarity').style.background = `linear-gradient(90deg, ${rarColor}, transparent)`;

  // Build stat bars
  const statDefs = [
    { key:'health',  label:'Health',  icon:'❤', max:5000, color:'#f87171' },
    { key:'shield',  label:'Shield',  icon:'🛡', max:3000, color:'#60a5fa' },
    { key:'damage',  label:'Damage',  icon:'⚔', max:500,  color:'#fb923c' },
    { key:'sps',     label:'DPS',     icon:'💥', max:300,  color:'#f472b6' },
    { key:'mana',    label:'Mana',    icon:'🔮', max:10,   color:'#a78bfa' },
    { key:'speed',   label:'Speed',   icon:'⚡', max:500,  color:'#4ade80' },
    { key:'range',   label:'Range',   icon:'🎯', max:3000, color:'#fbbf24' },
  ];

  const statBars = statDefs.filter(s => stats[s.key] !== undefined).map(s => {
    const raw  = parseFloat((stats[s.key]||'').toString().replace(/[^0-9.]/g,'')) || 0;
    const pct  = Math.min(100, (raw / s.max) * 100);
    return `
      <div class="stat-bar-row">
        <div class="stat-label-sm">${s.icon} ${s.label}</div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct}%;background:${s.color};box-shadow:0 0 8px ${s.color}60"></div>
        </div>
        <div class="stat-val-sm">${stats[s.key]}</div>
      </div>
    `;
  }).join('');

  const trait = card.trait || card.note || null;
  const story = card.story && card.story !== '-' ? card.story : null;

  document.getElementById('modal-content').innerHTML = `
    <span class="modal-rarity-badge" style="color:${rarColor};border-color:${rarColor}40;background:${rarColor}15">${card.rarity || ''}</span>
    <div class="modal-card-name">${card.name || 'Unknown'}</div>
    <div class="modal-card-group">✦ ${card.group || 'Stagnantia'} ✦</div>

    ${statBars ? `<div class="modal-section-label">Combat Statistics</div>${statBars}` : ''}

    ${trait ? `
      <div class="modal-section-label">Ability</div>
      <div class="modal-trait-box">${trait}</div>
    ` : ''}

    ${story ? `
      <div class="modal-section-label">Lore</div>
      <div class="modal-story-box">${story}</div>
    ` : ''}

    <button class="modal-lore-link">✦ This entity belongs to the ${card.group || 'Stagnantia'} faction</button>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.stat-bar-fill').forEach(bar => {
      bar.style.width = bar.style.width; // trigger reflow
    });
  }, 50);
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════
   SPELLS
═══════════════════════════════════════════════════════ */
async function initSpells() {
  if (allSpells.length === 0) {
    try {
      const res = await fetch('data/spells.json');
      allSpells = await res.json();
    } catch(e) {
      document.getElementById('spells-grid').innerHTML = '<div class="no-results">Could not load spell data.</div>';
      return;
    }
  }
  renderSpells();
  setupSpellFilters();
}

function setupSpellFilters() {
  document.querySelectorAll('.spell-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.spell-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSpellRarity = btn.dataset.filter;
      renderSpells();
    };
  });
  document.querySelectorAll('.spell-type').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.spell-type').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSpellType = btn.dataset.type;
      renderSpells();
    };
  });
}

function renderSpells() {
  const grid  = document.getElementById('spells-grid');
  const count = document.getElementById('spell-count');

  let filtered = allSpells;
  if (activeSpellRarity !== 'all') filtered = filtered.filter(s => (s.rarity||'').toLowerCase() === activeSpellRarity);
  if (activeSpellType   !== 'all') filtered = filtered.filter(s => (s.type||'').toLowerCase() === activeSpellType.toLowerCase());

  count.textContent = filtered.length;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No spells found matching your filters.</div>';
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((spell, i) => {
    const el = createSpellEl(spell, i);
    grid.appendChild(el);
  });
}

function createSpellEl(spell, idx) {
  const rarity = (spell.rarity || 'common').toLowerCase();
  const stats  = spell.stats || {};
  const el = document.createElement('div');
  el.className = `spell-item spell-${rarity}`;
  el.style.animationDelay = `${idx * 0.04}s`;

  const statPairs = [
    ['DMG', stats.damageToCard],
    ['Castle', stats.damageToCastle],
    ['Range', stats.range],
    ['Energy', stats.energy],
  ].filter(([,v]) => v && v !== '-');

  el.innerHTML = `
    <div class="spell-top">
      <div>
        <div class="spell-rarity-tag spell-rarity-${rarity}">${spell.rarity || ''} · ${spell.type || ''}</div>
        <div class="spell-name">${spell.name || 'Unknown'}</div>
      </div>
      ${stats.energy ? `<div class="spell-energy-badge">⚡ ${stats.energy}</div>` : ''}
    </div>
    ${spell.treat ? `<p class="spell-treat">${spell.treat}</p>` : ''}
    <div class="spell-stats-row">
      ${statPairs.map(([l,v]) => `
        <div class="spell-stat">
          <span class="spell-stat-label">${l}</span>
          <span class="spell-stat-val">${v}</span>
        </div>
      `).join('')}
    </div>
  `;
  return el;
}

/* ═══════════════════════════════════════════════════════
   INFO / CODEX
═══════════════════════════════════════════════════════ */
async function initInfo() {
  const nav     = document.getElementById('codex-nav');
  const content = document.getElementById('codex-content');
  if (nav.children.length > 0) return;

  try {
    const [infoRes, groupRes] = await Promise.all([
      fetch('data/info.json'),
      fetch('data/groups.json'),
    ]);
    infoData   = await infoRes.json();
    groupsData = await groupRes.json();
  } catch(e) { return; }

  const entries = [...(infoData.sections || [])];
  const navItems = entries.map((s, i) => ({label: s.heading, idx: i}));

  navItems.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'codex-nav-btn' + (item.idx === 0 ? ' active' : '');
    btn.textContent = item.label;
    btn.onclick = () => {
      document.querySelectorAll('.codex-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.codex-entry').forEach(e => e.classList.remove('visible'));
      content.querySelector(`[data-idx="${item.idx}"]`)?.classList.add('visible');
    };
    nav.appendChild(btn);
  });

  // Groups button
  const grpBtn = document.createElement('button');
  grpBtn.className = 'codex-nav-btn';
  grpBtn.textContent = 'Factions';
  grpBtn.onclick = () => {
    document.querySelectorAll('.codex-nav-btn').forEach(b => b.classList.remove('active'));
    grpBtn.classList.add('active');
    document.querySelectorAll('.codex-entry').forEach(e => e.classList.remove('visible'));
    content.querySelector('[data-idx="groups"]')?.classList.add('visible');
  };
  nav.appendChild(grpBtn);

  // Render entries
  content.innerHTML = '';
  entries.forEach((sec, i) => {
    const div = document.createElement('div');
    div.className = 'codex-entry' + (i === 0 ? ' visible' : '');
    div.dataset.idx = i;

    const listHTML = (sec.list||[]).map(item => {
      const parts = item.split(' - ');
      return parts.length > 1
        ? `<li class="codex-list-item"><strong>${parts[0]}</strong><span>${parts.slice(1).join(' - ')}</span></li>`
        : `<li class="codex-list-item"><span>${item}</span></li>`;
    }).join('');

    div.innerHTML = `
      <h3 class="codex-heading">${sec.heading}</h3>
      <p class="codex-para">${sec.content}</p>
      ${listHTML ? `<ul class="codex-list">${listHTML}</ul>` : ''}
    `;
    content.appendChild(div);
  });

  // Groups entry
  const grpDiv = document.createElement('div');
  grpDiv.className = 'codex-entry';
  grpDiv.dataset.idx = 'groups';
  grpDiv.innerHTML = `
    <h3 class="codex-heading">Factions &amp; Groups</h3>
    <p class="codex-para">The entities of Stagnantia are organized into factions, each with unique lore and combat roles.</p>
    <div class="groups-grid">
      ${(groupsData||[]).map(g => `
        <div class="group-card" style="border-top: 2px solid ${g.color || 'var(--accent)'}">
          <div class="group-icon">
            <i class="fa-solid ${g.icon || 'fa-shield'}" style="color:${g.color || 'var(--accent)'}"></i>
          </div>
          <div class="group-name" style="color:${g.color || 'var(--accent)'}">${g.name}</div>
          <p class="group-desc">${g.description}</p>
          <div class="group-members">
            ${(g.members||[]).map(m => `<span class="member-tag">${m}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  content.appendChild(grpDiv);
}

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════════════ */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

// Init reveal on page load for any visible elements
initReveal();
</script>

<!-- Font Awesome for group icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</body>
</html>
