import { useEffect } from 'react'

interface ThemeProviderProps {
  theme: 'dark' | 'light'
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}