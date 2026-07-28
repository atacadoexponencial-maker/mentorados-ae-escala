import type { NextConfig } from "next";

const ehDev = process.env.NODE_ENV === "development";

// Origem do Supabase (REST, Storage e Realtime) derivada da env do projeto.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigem = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";
const supabaseWs = supabaseOrigem.replace(/^https:/, "wss:");

// O player roda em player-vz-<zona>.tv.pandavideo.com.br e o upload do
// tus-js-client vai direto do navegador para outro host do mesmo domínio.
const panda = "https://*.pandavideo.com.br";

// script-src/style-src ainda precisam de 'unsafe-inline': o Next injeta scripts
// e estilos inline na hidratação. Endurecer isso exige nonce por requisição via
// proxy.ts, o que força renderização dinâmica e quebraria as páginas estáticas
// (/, /login, /recuperar-senha). Fica para uma issue própria — o ganho aqui vem
// das demais diretivas, que fecham clickjacking, injeção de <base>, envio de
// formulário para terceiros e carregamento de plugins.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${ehDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseOrigem}`,
  `media-src 'self' blob: ${panda}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigem} ${supabaseWs} ${panda}`,
  `frame-src ${panda}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O padrão do Next é 1 MB, abaixo do que o app aceita: material de apoio
      // vai até 20 MB, e logo (2 MB) + banner (5 MB) sobem no mesmo formulário.
      // Estourando o limite, o Next recusa antes da action rodar e a tela mostra
      // "A server error occurred", sem chance de dar uma mensagem melhor.
      // Os limites por arquivo estão em LIMITES, em src/lib/upload.ts.
      bodySizeLimit: "22mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Impede que o navegador adivinhe o tipo de um arquivo do bucket
          // público: reforça o Content-Type que src/lib/upload.ts fixa.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // frame-ancestors acima já cobre navegadores atuais; mantido para os
          // que ainda não leem CSP nível 2.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Em dev o host é http://localhost: enviar HSTS aqui fixaria HTTPS no
          // navegador de quem desenvolve.
          ...(ehDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
