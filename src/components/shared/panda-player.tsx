'use client'

// Player do Panda Video (padrão portado da essenciademenina).
// O rastreamento por postMessage é ligado na issue 81.
export function PandaPlayer({ videoId }: { videoId: string }) {
  const pullZone = process.env.NEXT_PUBLIC_PANDA_PULL_ZONE ?? ''
  const src = videoId.startsWith('http')
    ? videoId
    : `https://player-vz-${encodeURIComponent(pullZone)}.tv.pandavideo.com.br/embed/?v=${encodeURIComponent(videoId.trim())}`

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border bg-black"
      style={{ aspectRatio: '16 / 9' }}
    >
      <iframe
        src={src}
        title="Player da aula"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  )
}
