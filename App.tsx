import { useEffect, useState } from 'react'
import { ranking, useData } from './lib'
import Admin from './Admin'

const medal = (p: number) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏅')

export default function App() {
  const data = useData()
  const [hash, setHash] = useState(window.location.hash)
  const [sel, setSel] = useState<number | null>(null)
  useEffect(() => { const f = () => setHash(window.location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const rank = ranking(data.cursos, data.punts)
  const detalle = rank.find(r => r.curso.id === sel)

  return (
    <>
      <header className="top">
        <img src="/escudo.png" alt="Escudo Instituto Contardo Ferrini" className="escudo" onError={e => (e.currentTarget.style.visibility = 'hidden')} />
        <div><h1>ESTUDIANTINA 2027</h1><small>Instituto Contardo Ferrini · Río Primero</small></div>
        <nav><a href="#/">🏆 Ranking</a><a href="#/juegos">🎮 Juegos</a><a href="#/admin">🔒 Organizadores</a></nav>
      </header>
      <main>
        {hash === '#/admin' ? <Admin data={data} /> : (
          <>
            {data.error && <p className="msg err">{data.error}</p>}
            {data.loading && <p>Cargando…</p>}
            {hash !== '#/juegos' && (
              <section>
                <h2>⭐ Ranking general</h2>
                <p className="intro">¡Bienvenidos a la Estudiantina 2027! Seguí en vivo la competencia entre los seis cursos. Tocá un curso para ver sus puntos en cada juego.</p>
                <div className="cards">
                  {rank.map(r => (
                    <button key={r.curso.id} className={'card' + (sel === r.curso.id ? ' on' : '')} onClick={() => setSel(sel === r.curso.id ? null : r.curso.id)}>
                      <span className="pos">{medal(r.pos)} {r.pos}.º puesto</span>
                      <strong>{r.curso.nombre}</strong>
                      <span className="pts">{r.total} pts</span>
                    </button>
                  ))}
                </div>
                {detalle && (
                  <div className="detalle">
                    <h3>{detalle.curso.nombre} — {detalle.total} puntos — {detalle.pos}.º puesto</h3>
                    <table><tbody>
                      {data.juegos.map(j => {
                        const p = data.punts.find(x => x.curso_id === detalle.curso.id && x.juego_id === j.id)
                        return <tr key={j.id}><td>{j.nombre}</td><td className="r">{p ? `${p.puntos} puntos` : <em className="pend">Pendiente</em>}</td></tr>
                      })}
                      <tr className="tot"><td>Total acumulado</td><td className="r">{detalle.total} puntos</td></tr>
                    </tbody></table>
                  </div>
                )}
              </section>
            )}
            {hash === '#/juegos' && (
              <section>
                <h2>🎮 Juegos</h2>
                <div className="cards">
                  {data.juegos.map(j => {
                    const hay = data.punts.some(p => p.juego_id === j.id)
                    return <div key={j.id} className="card"><strong>{j.nombre}</strong>{j.descripcion && <span>{j.descripcion}</span>}
                      <span className={'badge ' + (hay ? 'ok' : 'wait')}>{hay ? '✅ Con resultados' : '⏳ Pendiente'}</span></div>
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
