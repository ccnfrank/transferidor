import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import { HELP, LANGUAGES, type Lang } from './i18n'

const VIEW = 500 // metade do lado do viewBox
const R = 470 // raio externo do disco
const RING = 30 // largura da borda externa, usada para mover a janela
const ARROW_TIP_R = R - 2 // ponta da seta vermelha, na borda do transferidor
const PLANE_R = 100 // distância do centro até o centro do avião
const DISK_OPACITY = 0.6 // fundo com 40% de transparência
const FONT = 'Helvetica Neue, Arial, sans-serif'

const APP_NAME = 'Transferidor Virtual'
const APP_VERSION = '0.7'
const GITHUB_URL = 'https://github.com/ccnfrank'
const GITHUB_HANDLE = 'github.com/ccnfrank'
const GITHUB_MARK =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'

// Grau 0 = norte, sentido horário. Retorna coordenadas do SVG.
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return { x: r * Math.sin(a), y: -r * Math.cos(a) }
}

const normalize = (deg: number) => ((deg % 360) + 360) % 360

// Diferença entre dois ângulos no intervalo (-180, 180]
const signedDelta = (a: number, b: number) => {
  let d = normalize(a - b)
  if (d > 180) d -= 360
  return d
}

const tickPath = (include: (deg: number) => boolean, length: number) => {
  let d = ''
  for (let deg = 0; deg < 360; deg++) {
    if (!include(deg)) continue
    const outer = polar(deg, R)
    const inner = polar(deg, R - length)
    d += `M${outer.x.toFixed(2)} ${outer.y.toFixed(2)}L${inner.x.toFixed(2)} ${inner.y.toFixed(2)}`
  }
  return d
}

const TICKS = {
  major: tickPath((d) => d % 10 === 0, 30),
  mid: tickPath((d) => d % 5 === 0 && d % 10 !== 0, 18),
  minor: tickPath((d) => d % 5 !== 0, 8),
}

const DEGREE_LABELS = Array.from({ length: 36 }, (_, i) => i * 10)

const CARDINALS = [
  { text: 'N', deg: 0 },
  { text: 'NE', deg: 45 },
  { text: 'E', deg: 90 },
  { text: 'SE', deg: 135 },
  { text: 'S', deg: 180 },
  { text: 'SW', deg: 225 },
  { text: 'W', deg: 270 },
  { text: 'NW', deg: 315 },
]

// Setas de referência (x, ponto de origem y, ponta y)
const ARROWS = [
  { x: -245, from: 0, to: -255 },
  { x: -125, from: 0, to: -330 },
  { x: 0, from: -150, to: -345 },
  { x: 125, from: 0, to: -335 },
  { x: 250, from: 0, to: -260 },
]

// Linhas curtas abaixo da linha de base
const LOWER_LINES = [
  { x: -242, y1: 165, y2: 250 },
  { x: -118, y1: 165, y2: 320 },
  { x: 128, y1: 160, y2: 320 },
  { x: 252, y1: 160, y2: 245 },
]

const PLANE_PATH =
  'M0,-60 C4,-60 6,-50 6,-40 L6,-12 L50,8 L50,18 L6,8 L6,40 L20,50 L20,58 L0,52 L-20,58 L-20,50 L-6,40 L-6,8 L-50,18 L-50,8 L-6,-12 L-6,-40 C-6,-50 -4,-60 0,-60 Z'

type DragState = { startAngle: number; startRotation: number }

export default function Transferidor() {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<DragState | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Arrasto do transferidor pelo miolo (move o disco dentro da janela)
  const moveRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(true)
  // Direção da seta vermelha na tela (0 = norte), segue o mouse
  const [arrowDeg, setArrowDeg] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  // Idioma do texto de ajuda no painel de informações
  const [lang, setLang] = useState<Lang>('pt')
  const help = HELP[lang]

  // Setas ← e → giram o transferidor (Shift = passo de 10°); Esc fecha o painel de informações
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfoOpen(false)
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const direction = e.key === 'ArrowRight' ? 1 : -1
      setRotation((r) => r + direction * step)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const geometry = (svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect()
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      radius: (rect.width / 2) * (R / VIEW),
    }
  }

  // Ângulo do ponteiro em relação ao centro (0 = norte, sentido horário)
  const pointerAngle = (clientX: number, clientY: number, cx: number, cy: number) =>
    (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI

  // Mantém o transferidor inteiro dentro da janela ao arrastá-lo
  const clampOffset = (x: number, y: number) => {
    const wrap = wrapRef.current
    if (!wrap) return { x, y }
    const rect = wrap.getBoundingClientRect()
    const baseLeft = rect.left - offset.x
    const baseTop = rect.top - offset.y
    return {
      x: Math.min(Math.max(x, -baseLeft), window.innerWidth - baseLeft - rect.width),
      y: Math.min(Math.max(y, -baseTop), window.innerHeight - baseTop - rect.height),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const { cx, cy, radius } = geometry(svg)
    const distance = Math.hypot(e.clientX - cx, e.clientY - cy)
    const onRing = distance >= radius * ((R - RING) / R)

    // Option + arrasto em qualquer ponto move a janela inteira
    if (e.altKey) {
      if ('__TAURI_INTERNALS__' in window) {
        void getCurrentWindow().startDragging()
      }
      return
    }

    if (distance > radius) return

    // Miolo: arrasta o transferidor pela janela
    if (!onRing) {
      moveRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y }
      svg.setPointerCapture(e.pointerId)
      setDragging(true)
      return
    }

    // Borda externa gira o transferidor
    drag.current = {
      startAngle: pointerAngle(e.clientX, e.clientY, cx, cy),
      startRotation: rotation,
    }
    svg.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const { cx, cy } = geometry(svg)
    const angle = pointerAngle(e.clientX, e.clientY, cx, cy)
    setArrowDeg(angle)

    const move = moveRef.current
    if (move) {
      setOffset(
        clampOffset(move.originX + e.clientX - move.startX, move.originY + e.clientY - move.startY),
      )
      return
    }

    const current = drag.current
    if (!current) return
    setRotation(current.startRotation + signedDelta(angle, current.startAngle))
  }

  const endDrag = () => {
    drag.current = null
    moveRef.current = null
    setDragging(false)
  }

  const openGithub = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if ('__TAURI_INTERNALS__' in window) {
      void openUrl(GITHUB_URL)
    } else {
      window.open(GITHUB_URL, '_blank', 'noopener')
    }
  }

  // Grau do mostrador que está sob a seta (a seta é fixa na tela, o mostrador gira)
  const readout = Math.round(normalize(arrowDeg - rotation)) % 360

  // Seta vermelha: do centro até a borda, na direção do mouse
  const arrowBase = polar(arrowDeg, ARROW_TIP_R - 16)
  const arrowTip = polar(arrowDeg, ARROW_TIP_R)
  const a = (arrowDeg * Math.PI) / 180
  const headHalfWidth = 6
  const headPerpX = Math.cos(a) * headHalfWidth
  const headPerpY = Math.sin(a) * headHalfWidth
  const arrowHead = `${arrowTip.x},${arrowTip.y} ${arrowBase.x - headPerpX},${arrowBase.y - headPerpY} ${arrowBase.x + headPerpX},${arrowBase.y + headPerpY}`
  const planePos = polar(arrowDeg, PLANE_R)

  return (
    <div className="stage">
      <div
        className="dial-wrap"
        ref={wrapRef}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <svg
          ref={svgRef}
          viewBox={`-${VIEW} -${VIEW} ${VIEW * 2} ${VIEW * 2}`}
          className={dragging ? 'dial dragging' : 'dial'}
          role="img"
          aria-label="Transferidor de navegação. Arraste a borda para girar e o miolo para mover."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <g transform={`rotate(${rotation})`}>
            {/* Disco com fundo semitransparente */}
            <circle
              r={R}
              fill="#ffffff"
              fillOpacity={DISK_OPACITY}
              stroke="#111"
              strokeWidth={2}
            />
            <circle r={R - 30} fill="none" stroke="#111" strokeWidth={1} />

            {/* Graduação */}
            <path d={TICKS.major} stroke="#111" strokeWidth={1.8} />
            <path d={TICKS.mid} stroke="#111" strokeWidth={1.2} />
            <path d={TICKS.minor} stroke="#111" strokeWidth={0.6} />

            {/* Graus a cada 10 */}
            {DEGREE_LABELS.map((deg) => {
              const p = polar(deg, 408)
              return (
                <text
                  key={deg}
                  transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${deg})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={22}
                  fontFamily={FONT}
                  fill="#111"
                >
                  {deg === 0 ? 360 : deg}
                </text>
              )
            })}

            {/* Rosa dos ventos */}
            {CARDINALS.map(({ text, deg }) => {
              const p = polar(deg, 368)
              return (
                <text
                  key={text}
                  transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${deg})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={text.length === 1 ? 24 : 18}
                  fontWeight={700}
                  fontFamily={FONT}
                  fill="#111"
                >
                  {text}
                </text>
              )
            })}

            {/* Linha de base e eixo central */}
            <path d="M-440 0 L440 0" stroke="#111" strokeWidth={1.5} />
            <path d="M0 0 L0 440" stroke="#111" strokeWidth={1.5} />

            {/* Setas e linhas de referência */}
            {ARROWS.map(({ x, from, to }) => (
              <g key={x}>
                <path d={`M${x} ${from} L${x} ${to + 18}`} stroke="#111" strokeWidth={2} />
                <polygon
                  points={`${x},${to} ${x - 9},${to + 20} ${x + 9},${to + 20}`}
                  fill="#111"
                />
              </g>
            ))}
            {LOWER_LINES.map(({ x, y1, y2 }) => (
              <path key={x} d={`M${x} ${y1} L${x} ${y2}`} stroke="#111" strokeWidth={1.2} />
            ))}
          </g>

          {/* Seta vermelha e avião: ficam fixos na tela e seguem o mouse */}
          <g pointerEvents="none">
            <line
              x1={0}
              y1={0}
              x2={arrowBase.x}
              y2={arrowBase.y}
              stroke="#e10600"
              strokeWidth={1.5}
            />
            <polygon points={arrowHead} fill="#e10600" />

            <g transform={`translate(${planePos.x.toFixed(2)} ${planePos.y.toFixed(2)}) rotate(${arrowDeg.toFixed(2)}) scale(0.9)`}>
              <path d={PLANE_PATH} fill="#e10600" stroke="#7a0000" strokeWidth={1} />
            </g>
          </g>

          <circle r={12} fill="#111" pointerEvents="none" />
          <circle r={5} fill="#ddd" pointerEvents="none" />

          {/* Mostrador do ângulo, logo acima da marca 360 */}
          <g pointerEvents="none">
            <rect x={-44} y={-498} width={88} height={26} rx={8} fill="#ffffff" fillOpacity={0.9} />
            <text
              x={0}
              y={-485}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={22}
              fontWeight={600}
              fontFamily={FONT}
              fill="#111"
            >
              {readout}°
            </text>
          </g>
        </svg>

        {/* Botão de informações, abaixo do mostrador do ângulo */}
        <button
          type="button"
          className="round-button info-button"
          aria-label="Informações"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((isOpen) => !isOpen)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx={12} cy={6.8} r={1.8} fill="currentColor" />
            <rect x={10.6} y={10} width={2.8} height={8.4} rx={1.4} fill="currentColor" />
          </svg>
        </button>

        {infoOpen && (
          <div className="info-panel" role="dialog" aria-label="Sobre o aplicativo">
            <button
              type="button"
              className="info-close"
              aria-label="Fechar"
              onClick={() => setInfoOpen(false)}
            >
              ×
            </button>
            <h2 className="info-title">{APP_NAME}</h2>
            <p>
              {help.version} {APP_VERSION}
            </p>
            <p>
              Powered by ®<span className="info-author">Christianfrank</span>
            </p>
            <div className="lang-switch" role="group" aria-label="Idioma">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                >
                  {label}
                </button>
              ))}
            </div>
            <h3 className="info-section">{help.heading}</h3>
            <ul className="info-help">
              {help.items.map(({ label, text }) => (
                <li key={label}>
                  <strong>{label}</strong> {text}
                </li>
              ))}
            </ul>
            <a href={GITHUB_URL} className="info-github" onClick={openGithub}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={GITHUB_MARK} fill="currentColor" />
              </svg>
              {GITHUB_HANDLE}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
