// Auto-gerado — não editar manualmente.
// Para regenerar: supabase gen types typescript --linked > src/integrations/supabase/types.ts

export type Database = {
  public: {
    Tables: {
      espacos: {
        Row: {
          id: string
          slug: string
          nome_curso: string
          logo_url: string | null
          cor_primaria: string | null
          cor_destaque: string | null
          ativo: boolean
          mentorado_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          nome_curso: string
          logo_url?: string | null
          cor_primaria?: string | null
          cor_destaque?: string | null
          ativo?: boolean
          mentorado_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          nome_curso?: string
          logo_url?: string | null
          cor_primaria?: string | null
          cor_destaque?: string | null
          ativo?: boolean
          mentorado_user_id?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          nome: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          nome?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string | null
          email?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'mentorado' | 'revendedor'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'mentorado' | 'revendedor'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'mentorado' | 'revendedor'
          created_at?: string
        }
      }
      revendedores: {
        Row: {
          id: string
          user_id: string | null
          espaco_id: string
          nome: string | null
          email: string
          whatsapp: string | null
          status: 'ativo' | 'inativo' | 'convite-pendente'
          ultimo_acesso: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          espaco_id: string
          nome?: string | null
          email: string
          whatsapp?: string | null
          status?: 'ativo' | 'inativo' | 'convite-pendente'
          ultimo_acesso?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          espaco_id?: string
          nome?: string | null
          email?: string
          whatsapp?: string | null
          status?: 'ativo' | 'inativo' | 'convite-pendente'
          ultimo_acesso?: string | null
          created_at?: string
        }
      }
      modulos: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          ordem?: number
          created_at?: string
        }
      }
      aulas: {
        Row: {
          id: string
          modulo_id: string
          titulo: string
          descricao: string | null
          panda_video_id: string | null
          capa_url: string | null
          duracao_segundos: number | null
          ordem: number
          publicada: boolean
          created_at: string
        }
        Insert: {
          id?: string
          modulo_id: string
          titulo: string
          descricao?: string | null
          panda_video_id?: string | null
          capa_url?: string | null
          duracao_segundos?: number | null
          ordem?: number
          publicada?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          modulo_id?: string
          titulo?: string
          descricao?: string | null
          panda_video_id?: string | null
          capa_url?: string | null
          duracao_segundos?: number | null
          ordem?: number
          publicada?: boolean
          created_at?: string
        }
      }
      aula_materiais: {
        Row: {
          id: string
          aula_id: string
          nome: string
          url: string
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          aula_id: string
          nome: string
          url: string
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          aula_id?: string
          nome?: string
          url?: string
          ordem?: number
          created_at?: string
        }
      }
      aula_visualizacoes: {
        Row: {
          id: string
          user_id: string | null
          revendedor_id: string | null
          espaco_id: string
          aula_id: string | null
          aula_titulo: string
          segundos_assistidos: number
          ultima_posicao: number
          concluida_em: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          revendedor_id?: string | null
          espaco_id: string
          aula_id?: string | null
          aula_titulo: string
          segundos_assistidos?: number
          ultima_posicao?: number
          concluida_em?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          revendedor_id?: string | null
          espaco_id?: string
          aula_id?: string | null
          aula_titulo?: string
          segundos_assistidos?: number
          ultima_posicao?: number
          concluida_em?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: 'admin' | 'mentorado' | 'revendedor'
    }
  }
}
