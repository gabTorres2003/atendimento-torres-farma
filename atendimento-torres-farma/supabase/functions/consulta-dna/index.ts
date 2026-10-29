/// <reference path="./types.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Gateway servidor-a-servidor entre o Atendimento (Balcão) e o backend do
 * Cotação, que é quem acessa o DNA/Firebird em modo leitura.
 *
 * O navegador nunca recebe credencial do Cotação nem do DNA. As credenciais
 * da integração ficam nos secrets desta função:
 *   COTACAO_API_URL
 *   COTACAO_INTEGRACAO_USUARIO
 *   COTACAO_INTEGRACAO_PIN
 *
 * Operações permitidas nesta versão (somente leitura, sem dados pessoais):
 *   - produto por código interno/EAN;
 *   - pesquisa por descrição ou princípio ativo, com lista curta.
 */

const allowedOrigins = new Set([
  'https://balcaotorresfarma.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const TERMO_CODIGO_VALIDO = /^[0-9A-Za-z]{1,20}$/
const TIPOS_TEXTO = new Set(['descricao', 'principio'])
const TEXTO_VALIDO = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'ºª+\-/()]{1,39}$/u
const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIMEOUT_MS = 8000
const VALIDADE_TOKEN_MS = 30 * 60 * 1000

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

const deno = (globalThis as any).Deno
const supabaseUrl = deno.env.get('SUPABASE_URL')!
const serviceRoleKey = deno.env.get('SERVICE_ROLE_KEY')!
const adminClient = createClient(supabaseUrl, serviceRoleKey)

const cotacaoUrl = (deno.env.get('COTACAO_API_URL') || '').replace(/\/+$/, '')
const cotacaoUsuario = deno.env.get('COTACAO_INTEGRACAO_USUARIO') || ''
const cotacaoPin = deno.env.get('COTACAO_INTEGRACAO_PIN') || ''

let tokenCache = { token: '', expiraEm: 0 }

/** Valida que o solicitante é um usuário ativo do Balcão. */
async function validarUsuario(actor: { id?: string }) {
  if (!actor?.id || !UUID_VALIDO.test(actor.id)) {
    throw new Error('Usuário não identificado.')
  }

  const { data, error } = await adminClient
    .from('users')
    .select('id')
    .eq('id', actor.id)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Usuário não autorizado.')
  return data
}

/** Obtém (e reutiliza) o JWT do usuário de integração no backend do Cotação. */
async function obterTokenCotacao() {
  if (tokenCache.token && Date.now() < tokenCache.expiraEm) {
    return tokenCache.token
  }

  const resposta = await fetch(`${cotacaoUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cotacaoUsuario, pin: cotacaoPin }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!resposta.ok) {
    throw new Error('Falha ao autenticar no Cotação.')
  }

  const dados = await resposta.json()
  if (!dados?.token) {
    throw new Error('Resposta de autenticação do Cotação inválida.')
  }

  tokenCache = {
    token: dados.token,
    expiraEm: Date.now() + VALIDADE_TOKEN_MS,
  }
  return dados.token
}

async function consultarProduto(termo: string, tipoTexto?: string) {
  let token = await obterTokenCotacao()

  const params = new URLSearchParams({ q: termo })
  if (tipoTexto) params.set('tipo', tipoTexto)
  const rota = tipoTexto
    ? `${cotacaoUrl}/api/integracao-balcao/produtos/pesquisa?${params}`
    : `${cotacaoUrl}/api/integracao-balcao/produtos?${params}`

  const executar = (bearer: string) =>
    fetch(rota, {
      headers: { Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

  let resposta = await executar(token)

  // Token expirado/rotacionado: descarta o cache e tenta uma única vez.
  if (resposta.status === 401) {
    tokenCache = { token: '', expiraEm: 0 }
    token = await obterTokenCotacao()
    resposta = await executar(token)
  }

  return resposta
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
    if (!cotacaoUrl || !cotacaoUsuario || !cotacaoPin) {
      return jsonResponse(
        {
          success: false,
          error: 'Integração com o Cotação não configurada no servidor.',
        },
        request,
        503,
      )
    }

    const { termo, tipo, actor } = await request.json()
    await validarUsuario(actor)

    const tipoTexto = typeof tipo === 'string' ? tipo.trim().toLowerCase() : ''
    const pesquisaTexto = TIPOS_TEXTO.has(tipoTexto)

    let valor = String(termo || '').trim()

    if (pesquisaTexto) {
      valor = valor.replace(/\s+/g, ' ')
      if (valor.length < 2 || valor.length > 40 || !TEXTO_VALIDO.test(valor)) {
        return jsonResponse(
          {
            success: false,
            error: 'Informe de 2 a 40 caracteres, usando apenas letras, números e espaços.',
          },
          request,
          400,
        )
      }
    } else if (!TERMO_CODIGO_VALIDO.test(valor)) {
      return jsonResponse(
        {
          success: false,
          error: 'Informe apenas letras ou números (até 20 caracteres).',
        },
        request,
        400,
      )
    }

    const resposta = await consultarProduto(
      valor,
      pesquisaTexto ? tipoTexto : undefined,
    )

    if (resposta.status === 404) {
      return pesquisaTexto
        ? jsonResponse({ success: true, resultados: [], truncado: false }, request)
        : jsonResponse({ success: true, encontrado: false }, request)
    }

    if (resposta.status === 400) {
      let mensagem = 'Pesquisa inválida. Refine o termo.'
      try {
        const corpoErro = await resposta.json()
        if (corpoErro?.mensagem) mensagem = String(corpoErro.mensagem)
      } catch {
        // resposta sem corpo JSON: usa mensagem padrão
      }
      return jsonResponse({ success: false, error: mensagem }, request, 400)
    }

    if (resposta.status === 503) {
      return jsonResponse(
        {
          success: false,
          indisponivel: true,
          error: 'Consulta ao DNA indisponível. Tente novamente em instantes.',
        },
        request,
        503,
      )
    }

    if (!resposta.ok) {
      return jsonResponse(
        { success: false, error: 'Não foi possível consultar o produto.' },
        request,
        502,
      )
    }

    if (pesquisaTexto) {
      const dados = await resposta.json()
      return jsonResponse(
        {
          success: true,
          resultados: Array.isArray(dados?.resultados) ? dados.resultados : [],
          truncado: Boolean(dados?.truncado),
        },
        request,
      )
    }

    const produto = await resposta.json()
    return jsonResponse({ success: true, encontrado: true, produto }, request)
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : 'Erro interno na consulta.'
    const status = mensagem.startsWith('Usuário') ? 403 : 502

    // Não registra termo, nome de usuário ou dados de produto no log.
    console.error('Falha na consulta de produto ao Cotação/DNA.')
    return jsonResponse(
      {
        success: false,
        error:
          status === 403
            ? mensagem
            : 'Não foi possível concluir a consulta. Tente novamente.',
      },
      request,
      status,
    )
  }
})
