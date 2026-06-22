import type { Theme } from './palettes'
import { KEYWORDS, KW_POS, ROWS_CNT, EDGE_D } from './palettes'

const _T: ReturnType<typeof setTimeout>[] = []
export const go = (fn: () => void, ms: number) => { _T.push(setTimeout(fn, ms)) }
export const clearAll = () => { _T.forEach(clearTimeout); _T.length = 0 }
const $el = (id: string) => document.getElementById(id)

let _ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (!_ctx) try { _ctx = new AudioContext() } catch { /* no audio */ }
  return _ctx
}

export function beep(muted: boolean, freq = 600, dur = 0.04, vol = 0.022) {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(freq * 0.45, ctx.currentTime + dur)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.start(); o.stop(ctx.currentTime + dur + 0.01)
  } catch { /* ignore */ }
}

function setStatus(txt: string) {
  const el = $el('sqla-status')
  if (el) el.textContent = txt
}

interface AnimCtx { c: string; muted: boolean }

function spawnKeyword(layer: Element, word: string, i: number, ctx: AnimCtx) {
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'absolute', left: `${KW_POS[i][0]}%`, top: `${KW_POS[i][1]}%`,
    fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', fontWeight: '600',
    color: ctx.c, textShadow: `0 0 14px ${ctx.c}99`, pointerEvents: 'none',
    animation: 'sqla-kw 1.5s ease forwards', whiteSpace: 'nowrap', userSelect: 'none',
  })
  el.textContent = word
  layer.appendChild(el)
  beep(ctx.muted, 450 + Math.random() * 280, 0.028, 0.018)
  go(() => el.remove(), 1600)
}

function typewriter(id: string, tnEl: Element, muted: boolean) {
  tnEl.textContent = ''
  let i = 0
  function tick() {
    if (i > id.length) return
    tnEl.textContent = id.slice(0, i) + (i < id.length ? '▋' : '')
    i++
    beep(muted, 680 + Math.random() * 220, 0.024, 0.011)
    go(tick, 54)
  }
  go(tick, 170)
}

function rowCounter(id: string, rowEl: Element) {
  const target = ROWS_CNT[id] ?? 0
  let cnt = 0
  const step = Math.max(1, Math.ceil(target / 22))
  function rtick() {
    cnt = Math.min(cnt + step, target)
    rowEl.textContent = `~${cnt.toLocaleString()} rows`
    if (cnt < target) go(rtick, 40)
  }
  go(rtick, 210)
}

function showNode(id: string, muted: boolean) {
  const nd = $el(`sqla-node-${id}`) as HTMLElement | null
  if (!nd) return
  nd.style.animation = 'none'
  void nd.offsetWidth
  nd.style.opacity = '1'
  nd.style.animation = 'sqla-node .58s cubic-bezier(0.16,1,0.3,1) forwards'
  const halo = $el(`sqla-halo-${id}`) as HTMLElement | null
  if (halo) halo.style.opacity = '0.065'
  beep(muted, 400 + Math.random() * 200, 0.07, 0.022)
  const tnEl = $el(`sqla-tn-${id}`)
  if (tnEl) typewriter(id, tnEl, muted)
  const rowEl = $el(`sqla-rows-${id}`)
  if (rowEl) rowCounter(id, rowEl)
  setStatus(`Building: ${id}...`)
}

function applyEdgeAnim(el: Element, opacity: string) {
  const s = (el as HTMLElement).style
  s.opacity = opacity; s.animation = 'none'
  void (el as HTMLElement).offsetWidth
  s.animation = 'sqla-edge .9s cubic-bezier(0.4,0,0.2,1) forwards'
}

function showEdge(i: number, muted: boolean) {
  const edge = $el(`sqla-e${i}`), glow = $el(`sqla-eg${i}`), dot = $el(`sqla-edot-${i}`)
  if (edge) applyEdgeAnim(edge, '1')
  if (glow) applyEdgeAnim(glow, '0.28')
  if (dot) go(() => { (dot as HTMLElement).style.opacity = '1'; (dot as HTMLElement).style.animation = 'sqla-dot .4s cubic-bezier(0.34,1.56,0.64,1) forwards' }, 920)
  beep(muted, 160 + i * 45, 0.38, 0.016)
}

function runScanBeam(overlay: HTMLDivElement, c: string, muted: boolean) {
  const s = overlay.querySelector<HTMLElement>('.sqla-scan')
  if (!s) return
  s.style.background = `linear-gradient(90deg,transparent,${c} 40%,${c} 60%,transparent)`
  s.style.boxShadow = `0 0 18px 5px ${c}`
  s.style.display = 'block'; void s.offsetWidth
  s.style.animation = 'sqla-scan .8s linear forwards'
  beep(muted, 280, 0.35, 0.014)
  go(() => (s.style.display = 'none'), 950)
}

function runKeywords(overlay: HTMLDivElement, ctx: AnimCtx) {
  const layer = overlay.querySelector('.sqla-kw')
  if (!layer) return
  setStatus('Parsing SQL keywords...')
  KEYWORDS.forEach((word, i) => go(() => spawnKeyword(layer, word, i, ctx), i * 115))
}

function activateHub(muted: boolean) {
  const hub = $el('sqla-hub-dot') as HTMLElement | null
  const ring = $el('sqla-hub-ring') as HTMLElement | null
  if (hub) hub.style.opacity = '0.9'
  if (ring) ring.style.opacity = '0.4'
  setStatus('Connecting tables...')
  beep(muted, 200, 0.18, 0.018)
}

function addParticle(svg: Element, i: number) {
  const ns = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(ns, 'g'); g.classList.add('sqla-particle')
  const dot = document.createElementNS(ns, 'circle')
  dot.setAttribute('r', '2.8'); dot.setAttribute('fill', 'var(--sqla-c)'); dot.setAttribute('filter', 'url(#sqla-f2)')
  const am = document.createElementNS(ns, 'animateMotion')
  am.setAttribute('dur', `${1.55 + i * 0.28}s`); am.setAttribute('repeatCount', 'indefinite')
  const mp = document.createElementNS(ns, 'mpath')
  mp.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#sqla-e${i}`)
  mp.setAttribute('href', `#sqla-e${i}`)
  am.appendChild(mp); g.appendChild(dot); g.appendChild(am); svg.appendChild(g)
}

function doFlash(muted: boolean) {
  document.querySelectorAll<HTMLElement>('[id^="sqla-node-"]').forEach(nd => {
    nd.style.animation = 'sqla-flash .4s ease'
    go(() => (nd.style.animation = ''), 460)
  })
  ;[880, 1100, 1320].forEach((f, i) => go(() => beep(muted, f, 0.18, 0.025), i * 110))
}

function fadeOut(overlay: HTMLDivElement, onComplete: () => void) {
  overlay.style.transition = 'opacity .5s ease'
  overlay.style.opacity = '0'
  go(() => { overlay.remove(); onComplete() }, 540)
}

export function animate(overlay: HTMLDivElement, theme: Theme, muted: boolean, onComplete: () => void) {
  const ctx: AnimCtx = { c: theme.color, muted }
  go(() => runScanBeam(overlay, ctx.c, muted), 80)
  go(() => runKeywords(overlay, ctx), 230)
  go(() => showNode('orders', muted), 480)
  go(() => showNode('customers', muted), 700)
  go(() => showNode('order_items', muted), 900)
  go(() => showNode('products', muted), 1080)
  go(() => showNode('categories', muted), 1240)
  go(() => activateHub(muted), 860)
  go(() => showEdge(0, muted), 880)
  go(() => showEdge(1, muted), 1060)
  go(() => showEdge(2, muted), 1245)
  go(() => showEdge(3, muted), 1405)
  go(() => { [0,1,2,3].forEach(i => { const e=$el(`sqla-el${i}`); if(e)(e as HTMLElement).style.opacity='1' }); setStatus('Diagram ready ✓') }, 1700)
  go(() => { const s=$el('sqla-svg'); if(s) EDGE_D.forEach((_,i)=>go(()=>addParticle(s,i),i*280)) }, 1760)
  go(() => doFlash(muted), 2160)
  go(() => fadeOut(overlay, onComplete), 2960)
}
