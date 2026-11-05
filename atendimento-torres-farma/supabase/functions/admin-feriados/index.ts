/// <reference path="./types.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://balcaotorresfarma.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin)
      ? origin
      : 'https://balcaotorresfarma.netlify.app',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function jsonResponse(body: unknown, request: Request, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const databaseError = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }
    return [
      databaseError.message,
      databaseError.details,
      databaseError.hint,
      databaseError.code ? `Código: ${databaseError.code}` : null,
    ].filter(Boolean).join(' | ') || 'Erro interno.'
  }
  return 'Erro interno.'
}

const deno = (globalThis as any).Deno
const supabaseUrl = deno.env.get('SUPABASE_URL')!
const serviceRoleKey = deno.env.get('SERVICE_ROLE_KEY')!
const adminClient = createClient(supabaseUrl, serviceRoleKey)

const ESCALA_LIMITES = {
  CAIXA: 1,
  BALCONISTA: 2,
  MOTOBOY: 2,
} as const

function horarioPadrao(data?: string | null) {
  const dia = data ? new Date(`${data}T00:00:00`).getDay() : 1
  return dia === 0
    ? { inicio: '08:00', fim: '14:00' }
    : { inicio: '08:00', fim: '20:00' }
}

function validarMembrosEscala(membros: any[] = []) {
  const trabalhando = membros.filter((membro) => membro.situacao === 'TRABALHA')
  for (const tipo of Object.keys(ESCALA_LIMITES) as Array<keyof typeof ESCALA_LIMITES>) {
    const quantidade = trabalhando.filter((membro) => membro.tipo_funcionario === tipo).length
    if (quantidade > ESCALA_LIMITES[tipo]) {
      throw new Error(`A escala não pode ter mais de ${ESCALA_LIMITES[tipo]} ${tipo.toLowerCase()}(s) trabalhando.`)
    }
  }
}

async function validarAdmin(actor: { id?: string }) {
  if (!actor?.id) {
    throw new Error('Usuário não identificado.')
  }

  const { data, error } = await adminClient
    .from('users')
    .select('id, role, ativo')
    .eq('id', actor.id)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  if (!data || data.role !== 'admin') {
    throw new Error('Usuário não autorizado para esta operação.')
  }
  return data
}

async function executarAcao(
  action: string,
  payload: any,
  admin: { id: string },
) {
  if (action === 'CRIAR_FERIADO') {
    const agora = new Date().toISOString()
    return adminClient
      .from('feriados')
      .insert([{
        data: payload.data,
        nome: payload.nome,
        abrangencia: payload.abrangencia,
        natureza: payload.natureza,
        observacao: payload.observacao || null,
        ativo: payload.ativo !== undefined ? payload.ativo : true,
        created_by: admin.id,
        created_at: agora,
        updated_at: agora
      }])
      .select()
      .single()
  }
  if (action === 'ATUALIZAR_FERIADO') {
    const { id, ...updates } = payload
    return adminClient
      .from('feriados')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  }
  if (action === 'DELETAR_FERIADO') {
    const { data: escalas, error: escalasError } = await adminClient
      .from('escalas_feriados')
      .select('id')
      .eq('feriado_id', payload.id)
    if (escalasError) throw escalasError

    const escalaIds = (escalas || []).map((escala: { id: string }) => escala.id)
    if (escalaIds.length) {
      const { error: membrosError } = await adminClient
        .from('escala_feriados_membros')
        .delete()
        .in('escala_id', escalaIds)
      if (membrosError) throw membrosError

      const { error: escalasDeleteError } = await adminClient
        .from('escalas_feriados')
        .delete()
        .in('id', escalaIds)
      if (escalasDeleteError) throw escalasDeleteError
    }

    return adminClient.from('feriados').delete().eq('id', payload.id)
  }
  if (action === 'SALVAR_ESCALA') {
    validarMembrosEscala(payload.membros || [])
    const { data: feriado, error: feriadoError } = await adminClient
      .from('feriados')
      .select('data')
      .eq('id', payload.feriado_id)
      .single()
    if (feriadoError) throw feriadoError
    const padrao = horarioPadrao(feriado.data)
    const horarioInicio = payload.horario_inicio || padrao.inicio
    const horarioFim = payload.horario_fim || padrao.fim
    const { data: existing, error: existingError } = await adminClient
      .from('escalas_feriados')
      .select('id')
      .eq('feriado_id', payload.feriado_id)
      .maybeSingle()
    if (existingError) throw existingError

    let escala
    if (existing) {
      const result = await adminClient
        .from('escalas_feriados')
        .update({
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          status: 'PENDENTE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*, feriados(*)')
        .single()
      if (result.error) throw result.error
      escala = result.data
    } else {
      const result = await adminClient
        .from('escalas_feriados')
        .insert([
          {
            feriado_id: payload.feriado_id,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim,
            status: 'RASCUNHO',
            criada_por: admin.id,
            criada_em: new Date().toISOString(),
          },
        ])
        .select('*, feriados(*)')
        .single()
      if (result.error) throw result.error
      escala = result.data
    }

    const { error: deleteError } = await adminClient
      .from('escala_feriados_membros')
      .delete()
      .eq('escala_id', escala.id)
    if (deleteError) throw deleteError

    if (payload.membros?.length) {
      const membros = payload.membros.map((membro: any) => ({
        escala_id: escala.id,
        tipo_funcionario: membro.tipo_funcionario,
        balconista_id:
          membro.tipo_funcionario === 'BALCONISTA' ||
          membro.tipo_funcionario === 'CAIXA'
            ? membro.balconista_id || membro.id
            : null,
        motoboy_id:
          membro.tipo_funcionario === 'MOTOBOY' ? membro.motoboy_id || membro.id : null,
        situacao: membro.situacao,
        horario_inicio: membro.horario_inicio || horarioInicio,
        horario_fim: membro.horario_fim || horarioFim,
      }))
      const { error: insertError } = await adminClient
        .from('escala_feriados_membros')
        .insert(membros)
      if (insertError) throw insertError
    }
    return { data: escala, error: null }
  }
  if (action === 'CONFIRMAR_ESCALA') {
    return adminClient
      .from('escalas_feriados')
      .update({
        status: 'CONFIRMADA',
        confirmada_por: admin.id,
        confirmada_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .select('*, feriados(*)')
      .single()
  }
  if (action === 'DELETAR_ESCALA') {
    const { data: escala, error: escalaError } = await adminClient
      .from('escalas_feriados')
      .select('status')
      .eq('id', payload.id)
      .single()
    if (escalaError) throw escalaError
    const { error: membrosError } = await adminClient
      .from('escala_feriados_membros')
      .delete()
      .eq('escala_id', payload.id)
    if (membrosError) throw membrosError
    return adminClient.from('escalas_feriados').delete().eq('id', payload.id)
  }
  if (action === 'ATUALIZAR_ESCALA') {
    const { id, credentials: _credentials, ...updates } = payload
    return adminClient
      .from('escalas_feriados')
      .update({
        horario_inicio: updates.horario_inicio,
        horario_fim: updates.horario_fim,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, feriados(*)')
      .single()
  }
  if (action === 'SALVAR_MEMBROS') {
    validarMembrosEscala(payload.membros || [])
    const { error: deleteError } = await adminClient
      .from('escala_feriados_membros')
      .delete()
      .eq('escala_id', payload.escala_id)
    if (deleteError) throw deleteError
    if (!payload.membros?.length) return { data: null, error: null }
    return adminClient.from('escala_feriados_membros').insert(
      payload.membros.map((membro: any) => ({
        ...membro,
        escala_id: payload.escala_id,
        balconista_id:
          membro.tipo_funcionario === 'BALCONISTA' ||
          membro.tipo_funcionario === 'CAIXA'
            ? membro.balconista_id || membro.id
            : null,
        motoboy_id:
          membro.tipo_funcionario === 'MOTOBOY' ? membro.motoboy_id || membro.id : null,
      })),
    )
  }
  throw new Error('Operação administrativa desconhecida.')
}

deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: getCorsHeaders(request) })
  }
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, error: 'Método não permitido.' },
      request,
      405,
    )
  }

  try {
    const { action, payload, actor } = await request.json()
    const admin = await validarAdmin(actor)
    const result = await executarAcao(action, payload || {}, admin)
    if (result.error) throw result.error
    return jsonResponse({ success: true, data: result.data ?? null }, request)
  } catch (error) {
    console.error('Erro na operação administrativa de feriados:', error)
    return jsonResponse(
      {
        success: false,
        error: getErrorMessage(error),
      },
      request,
      400,
    )
  }
})
