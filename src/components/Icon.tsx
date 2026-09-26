import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'target' | 'rocket' | 'music' | 'mic' | 'back' | 'play' | 'speaker' | 'trophy' | 'wave' | 'retry' | 'check'

const PATHS: Record<IconName, ReactNode> = {
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2c3 2.5 4.5 6 4.5 10l-2 4h-5l-2-4C7.5 8 9 4.5 12 2z" />
      <circle cx="12" cy="9.5" r="1.8" />
      <path d="M7.5 12 5 15l2.5 1M16.5 12l2.5 3-2.5 1M10.5 19.5 12 22l1.5-2.5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  speaker: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9.5 18h5" />
    </>
  ),
  wave: <path d="M2 12h2l2-6 3 12 3-15 3 18 3-12 2 3h2" />,
  retry: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v5h5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
}

export function Icon({ name, size = 24, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
