import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const configured = !!url && !!key
export const supabase = createClient(url || 'http://localhost:54321', key || 'sin-configurar')

export type Curso = { id: number; nombre: string; orden: number }
export type Juego = { id: number; nombre: string; descripcion: string | null; orden: number }
export type Punt = { id: number; curso_id: number; juego_id: number; puntos: number; updated_at: string }
export type Data = { cursos: Curso[]; juegos: Juego[]; punts: Punt[]; loading: boolean; error: string | null; reload: () => void }

export function useData(): Data {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [juegos, setJuegos] = useState<Juego[]>([])
  const [punts, setPunts] = useState<Punt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!configured) { setError('Falta configurar Supabase (.env).'); setLoading(false); return }
    const [c, j, p] = await Promise.all([
      supabase.from('cursos').select('*').order('orden'),
      supabase.from('juegos').select('*').order('orden').order('id'),
      supabase.from('puntuaciones').select('*'),
    ])
    const err = c.error || j.error || p.error
    if (err) setError('No se pudieron cargar los datos: ' + err.message)
    else { setCursos(c.data as Curso[]); setJuegos(j.data as Juego[]); setPunts(p.data as Punt[]); setError(null) }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
    if (!configured) return
    const ch = supabase.channel('cambios')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => reload())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [reload])

  return { cursos, juegos, punts, loading, error, reload }
}

// Totales siempre calculados desde las puntuaciones; empates comparten posición (1,1,3...)
export function ranking(cursos: Curso[], punts: Punt[]) {
  const rows = cursos
    .map(curso => ({ curso, total: punts.filter(p => p.curso_id === curso.id).reduce((s, p) => s + p.puntos, 0) }))
    .sort((a, b) => b.total - a.total || a.curso.orden - b.curso.orden)
  const out: { curso: Curso; total: number; pos: number }[] = []
  rows.forEach((r, i) => out.push({ ...r, pos: i > 0 && r.total === rows[i - 1].total ? out[i - 1].pos : i + 1 }))
  return out
}
