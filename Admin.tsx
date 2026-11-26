import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Data } from './lib'

type M = { t: 'ok' | 'err'; m: string } | null
type Run = (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => Promise<boolean>

export default function Admin({ data }: { data: Data }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('')
  const [tab, setTab] = useState<'pts' | 'juegos' | 'cursos'>('pts')
  const [msg, setMsg] = useState<M>(null)
  const [cursoId, setCursoId] = useState(''); const [juegoId, setJuegoId] = useState(''); const [puntos, setPuntos] = useState('')
  const [nj, setNj] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session))
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setIsAdmin(null); return }
    supabase.from('administradores').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data: d }) => setIsAdmin(!!d))
  }, [session])

  const run: Run = async (p, ok) => {
    const { error } = await p
    setMsg(error ? { t: 'err', m: 'Error: ' + error.message } : { t: 'ok', m: ok })
    if (!error) data.reload()
    return !error
  }
  async function login(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setMsg(error ? { t: 'err', m: 'Usuario o contraseña incorrectos.' } : null)
  }
  function save(e: FormEvent) {
    e.preventDefault()
    const n = Number(puntos)
    if (!cursoId || !juegoId) return setMsg({ t: 'err', m: 'Elegí un curso y un juego.' })
    if (puntos.trim() === '' || !Number.isInteger(n) || n < 0) return setMsg({ t: 'err', m: 'Los puntos deben ser un número entero igual o mayor a 0.' })
    run(supabase.from('puntuaciones').upsert({ curso_id: +cursoId, juego_id: +juegoId, puntos: n }, { onConflict: 'curso_id,juego_id' }), 'Puntuación guardada.')
  }
  function pick(c: string, j: string) {
    setCursoId(c); setJuegoId(j)
    const p = data.punts.find(x => String(x.curso_id) === c && String(x.juego_id) === j)
    setPuntos(p ? String(p.puntos) : '')
  }

  if (session === undefined) return <p>Cargando…</p>
  if (!session) return (
    <form className="panel" onSubmit={login}>
      <h2>🔒 Ingreso de organizadores</h2>
      {msg && <p className={'msg ' + msg.t}>{msg.m}</p>}
      <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} required />
      <button className="btn">Ingresar</button>
    </form>
  )
  if (isAdmin === null) return <p>Verificando permisos…</p>
  if (!isAdmin) return <div className="panel"><p className="msg err">Tu usuario no está autorizado como organizador.</p><button className="btn" onClick={() => supabase.auth.signOut()}>Salir</button></div>

  const nombreC = (id: number) => data.cursos.find(c => c.id === id)?.nombre
  const nombreJ = (id: number) => data.juegos.find(j => j.id === id)?.nombre

  return (
    <div className="panel">
      <div className="row"><h2>⚙️ Panel de organizadores</h2><button className="btn sec" onClick={() => supabase.auth.signOut()}>Salir</button></div>
      <div className="tabs">
        {(['pts', 'juegos', 'cursos'] as const).map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setMsg(null) }}>{t === 'pts' ? 'Puntuaciones' : t === 'juegos' ? 'Juegos' : 'Cursos'}</button>)}
      </div>
      {msg && <p className={'msg ' + msg.t}>{msg.m}</p>}

      {tab === 'pts' && <>
        <form onSubmit={save} className="form">
          <select value={cursoId} onChange={e => pick(e.target.value, juegoId)}><option value="">Curso…</option>{data.cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
          <select value={juegoId} onChange={e => pick(cursoId, e.target.value)}><option value="">Juego…</option>{data.juegos.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>
          <input type="number" min={0} step={1} placeholder="Puntos" value={puntos} onChange={e => setPuntos(e.target.value)} />
          <button className="btn">Guardar</button>
        </form>
        <p className="hint">Si el curso y el juego ya tienen puntos, se muestran y al guardar se corrigen (no se duplican).</p>
        <table><thead><tr><th>Curso</th><th>Juego</th><th>Pts</th><th></th></tr></thead><tbody>
          {data.punts.map(p => <tr key={p.id}><td>{nombreC(p.curso_id)}</td><td>{nombreJ(p.juego_id)}</td><td>{p.puntos}</td>
            <td className="r"><button className="lnk" onClick={() => pick(String(p.curso_id), String(p.juego_id))}>Editar</button>{' '}
              <button className="lnk del" onClick={() => confirm('¿Borrar esta puntuación? El juego quedará Pendiente para ese curso.') && run(supabase.from('puntuaciones').delete().eq('id', p.id), 'Puntuación eliminada.')}>Borrar</button></td></tr>)}
          {!data.punts.length && <tr><td colSpan={4}>Todavía no hay resultados cargados.</td></tr>}
        </tbody></table>
      </>}

      {tab === 'juegos' && <>
        <form className="form" onSubmit={async e => {
          e.preventDefault()
          if (!nj.nombre.trim()) return setMsg({ t: 'err', m: 'Escribí un nombre.' })
          if (await run(supabase.from('juegos').insert({ nombre: nj.nombre.trim(), descripcion: nj.descripcion.trim() || null, orden: data.juegos.length + 1 }), 'Juego creado.')) setNj({ nombre: '', descripcion: '' })
        }}>
          <input placeholder="Nombre del juego nuevo" value={nj.nombre} onChange={e => setNj({ ...nj, nombre: e.target.value })} />
          <input placeholder="Descripción (opcional)" value={nj.descripcion} onChange={e => setNj({ ...nj, descripcion: e.target.value })} />
          <button className="btn">Crear</button>
        </form>
        {data.juegos.map(j => <JuegoRow key={j.id} j={j} run={run} />)}
      </>}

      {tab === 'cursos' && data.cursos.map(c => <CursoRow key={c.id} c={c} run={run} />)}
    </div>
  )
}

function JuegoRow({ j, run }: { j: { id: number; nombre: string; descripcion: string | null }; run: Run }) {
  const [n, setN] = useState(j.nombre); const [d, setD] = useState(j.descripcion ?? '')
  return <div className="form"><input value={n} onChange={e => setN(e.target.value)} /><input value={d} placeholder="Descripción" onChange={e => setD(e.target.value)} />
    <button className="btn sec" onClick={() => n.trim() && run(supabase.from('juegos').update({ nombre: n.trim(), descripcion: d.trim() || null }).eq('id', j.id), 'Juego actualizado.')}>Guardar</button>
    <button className="btn del" onClick={() => confirm('¿Eliminar el juego y todas sus puntuaciones?') && run(supabase.from('juegos').delete().eq('id', j.id), 'Juego eliminado.')}>Eliminar</button></div>
}
function CursoRow({ c, run }: { c: { id: number; nombre: string }; run: Run }) {
  const [n, setN] = useState(c.nombre)
  return <div className="form"><input value={n} onChange={e => setN(e.target.value)} />
    <button className="btn sec" onClick={() => n.trim() && run(supabase.from('cursos').update({ nombre: n.trim() }).eq('id', c.id), 'Curso actualizado.')}>Guardar</button></div>
}
