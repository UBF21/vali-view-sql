import type { DbType } from './palettes'
import { THEMES, PAL_DARK, PAL_LIGHT } from './palettes'
import { buildSVG } from './svg'
import { animate, clearAll } from './anim'

export type { DbType }

export interface PlayOptions {
  dbType?: DbType
  onComplete?: () => void
  muted?: boolean
  dark?: boolean
}

function injectCSS() {
  if (document.getElementById('sqla-css')) return
  const s = document.createElement('style')
  s.id = 'sqla-css'
  s.textContent = [
    '@keyframes sqla-scan{0%{top:0;opacity:.95}85%{opacity:.6}100%{top:100%;opacity:0}}',
    '@keyframes sqla-node{0%{opacity:0;transform:scale(.76) translateY(12px);filter:blur(8px)}55%{opacity:1;transform:scale(1.04) translateY(-2px);filter:blur(0)}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}}',
    '@keyframes sqla-edge{to{stroke-dashoffset:0}}',
    '@keyframes sqla-kw{0%{opacity:0;transform:translateY(14px) scale(.88)}22%{opacity:1;transform:translateY(0)}72%{opacity:.75;transform:translateY(-7px)}100%{opacity:0;transform:translateY(-20px)}}',
    '@keyframes sqla-flash{0%,100%{filter:brightness(1)}50%{filter:brightness(1.9)}}',
    '@keyframes sqla-glow{0%,100%{opacity:.025}50%{opacity:.06}}',
    '@keyframes sqla-dot{0%{r:0;opacity:0}60%{r:6;opacity:1}100%{r:4.5;opacity:.85}}',
  ].join('')
  document.head.appendChild(s)
}

function buildOverlayHTML(scan: string): string {
  return [
    `<div style="position:absolute;inset:0;pointer-events:none;z-index:10;background:repeating-linear-gradient(0deg,transparent 0px,transparent 3px,${scan} 3px,${scan} 4px);"></div>`,
    '<div class="sqla-scan" style="position:absolute;left:0;right:0;height:2px;top:0;z-index:20;display:none;pointer-events:none;"></div>',
    '<div class="sqla-kw" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:15;"></div>',
  ].join('')
}

export function play(container: HTMLElement, opts: PlayOptions = {}) {
  const { dbType = 'postgresql', onComplete = () => {}, muted = true, dark = true } = opts
  injectCSS()
  clearAll()
  const theme = THEMES[dbType] ?? THEMES.postgresql
  const pal   = dark ? PAL_DARK : PAL_LIGHT
  container.querySelectorAll('.sqla-overlay').forEach(o => o.remove())
  container.style.position = 'relative'
  const overlay = document.createElement('div')
  overlay.className = 'sqla-overlay'
  overlay.style.cssText = `position:absolute;inset:0;z-index:200;overflow:hidden;background:${pal.bg};`
  overlay.innerHTML = buildOverlayHTML(pal.scan) + buildSVG(theme, pal)
  container.appendChild(overlay)
  animate(overlay as HTMLDivElement, theme, muted, onComplete)
}

export function stop() {
  clearAll()
  document.querySelectorAll('.sqla-overlay').forEach(o => o.remove())
}
