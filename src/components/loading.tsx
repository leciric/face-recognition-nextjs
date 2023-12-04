import { RotateCw } from 'lucide-react'

interface LoadingProps {
  isLoading: boolean
  title: string
}

export function Loading({ isLoading, title }: LoadingProps) {
  if (!isLoading) return null

  return (
    <div className="absolute left-0 top-0 z-60 h-screen w-screen">
      <div className=" flex h-full w-full flex-col items-center justify-center gap-2 bg-white/20 p-4 backdrop-blur-sm">
        <RotateCw className="animate-spin"></RotateCw>
        <span className="text-base font-semibold ">{title}</span>
      </div>
    </div>
  )
}
