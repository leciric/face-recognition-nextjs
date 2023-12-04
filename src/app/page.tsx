import { LoadModels } from '@/components/load-models'

export default function Home() {
  return (
    <>
      <header className="flex h-14 items-center justify-center border-b border-border">
        <strong>Face training and matching</strong>
      </header>

      <main className="p-4">
        <LoadModels></LoadModels>
      </main>
    </>
  )
}
