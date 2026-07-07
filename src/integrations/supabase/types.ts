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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
