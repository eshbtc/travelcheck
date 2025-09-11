import React from 'react'
import { AppShell } from '../../src/components/layout/AppShell'
import { AuthGuard } from '../../src/components/layout/AuthGuard'

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <AuthGuard>{children}</AuthGuard>
    </AppShell>
  )
}
