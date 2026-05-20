'use client'

export function RepoLink() {
  return (
    <a
      href="https://github.com/maslakovSaveliy/rkn-tycoon"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Исходники на GitHub"
      title="Исходники на GitHub"
      className="fixed bottom-2 left-3 z-[60] opacity-50 hover:opacity-100 text-rkn-dim hover:text-rkn-fg transition-opacity"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.71 0-1.26.45-2.29 1.18-3.1-.12-.3-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.06.74.81 1.18 1.84 1.18 3.1 0 4.44-2.7 5.41-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
      </svg>
    </a>
  )
}
