export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body style={{ background: '#0b0d10', color: '#e8eaed', fontFamily: 'system-ui', padding: 24 }}>{children}</body></html>;
}
