// Cria usuários de teste para verificação local do login por papel.
// Rodar com: node --env-file=.env scripts/seed-usuarios-teste.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SENHA_TESTE = 'Teste@2026'

async function garantirUsuario(email, nome) {
  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA_TESTE,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (!error) return criado.user
  // Já existe: busca pelo e-mail
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existente = lista?.users.find((u) => u.email === email)
  if (!existente) throw new Error(`Não foi possível criar nem encontrar ${email}: ${error.message}`)
  return existente
}

async function garantirPapel(userId, role) {
  const { error } = await admin.from('user_roles').upsert(
    { user_id: userId, role },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  )
  if (error) throw new Error(`Papel ${role}: ${error.message}`)
}

const { data: espaco, error: espacoErro } = await admin
  .from('espacos')
  .select('id, slug')
  .eq('slug', 'joao-atacados')
  .single()
if (espacoErro) throw new Error(`Espaço joao-atacados não encontrado: ${espacoErro.message}`)

// 1. Admin (equipe)
const usuarioAdmin = await garantirUsuario('admin.teste@atacadoexponencial.com.br', 'Admin Teste')
await garantirPapel(usuarioAdmin.id, 'admin')

// 2. Mentorado dono do joao-atacados
const usuarioMentorado = await garantirUsuario('mentorado.teste@joaoatacados.com.br', 'João Teste')
await garantirPapel(usuarioMentorado.id, 'mentorado')
await admin.from('espacos').update({ mentorado_user_id: usuarioMentorado.id }).eq('id', espaco.id)

// 3. Revendedora ativa do joao-atacados
const usuarioRev = await garantirUsuario('revendedora.teste@gmail.com', 'Fernanda Teste')
await garantirPapel(usuarioRev.id, 'revendedor')
const { error: revErro } = await admin.from('revendedores').upsert(
  {
    user_id: usuarioRev.id,
    espaco_id: espaco.id,
    nome: 'Fernanda Teste',
    email: 'revendedora.teste@gmail.com',
    status: 'ativo',
  },
  { onConflict: 'espaco_id,email' }
)
if (revErro) throw new Error(`Revendedora: ${revErro.message}`)

console.log('Seed concluído. Usuários de teste (senha: %s):', SENHA_TESTE)
console.log('  admin.teste@atacadoexponencial.com.br  → admin')
console.log('  mentorado.teste@joaoatacados.com.br    → mentorado (joao-atacados)')
console.log('  revendedora.teste@gmail.com            → revendedora ativa (joao-atacados)')
