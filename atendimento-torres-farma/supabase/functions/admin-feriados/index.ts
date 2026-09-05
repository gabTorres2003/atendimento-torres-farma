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

async function validarAdmin(credentials: { login?: string; pin?: string }) {
  if (!credentials?.login || !credentials?.pin) {
    throw new Error('Credenciais administrativas ausentes.')
  }

  const { data, error } = await adminClient
    .from('users')
    .select('id, role, ativo')
    .ilike('login', credentials.login.trim())
    .eq('pin', credentials.pin)
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
    return adminClient.from('feriados').delete().eq('id', payload.id)
  }
  if (action === 'SALVAR_ESCALA') {
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
          horario_inicio: payload.horario_inicio || null,
          horario_fim: payload.horario_fim || null,
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
            horario_inicio: payload.horario_inicio || null,
            horario_fim: payload.horario_fim || null,
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
          membro.tipo_funcionario === 'MOTOBOY' ? membro.motoboy_id : null,
        situacao: membro.situacao,
        horario_inicio: membro.horario_inicio || null,
        horario_fim: membro.horario_fim || null,
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
    if (escala.status === 'CONFIRMADA') {
      throw new Error(
        'Escalas confirmadas fazem parte do histórico e não podem ser excluídas.',
      )
    }
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
    const { action, payload, credentials } = await request.json()
    const admin = await validarAdmin(credentials)
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
