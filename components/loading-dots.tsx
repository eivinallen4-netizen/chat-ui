export function LoadingDots() {
  return (
    <div className="flex items-end justify-center gap-1.5">
      <div
        className="w-2.5 h-2.5 bg-primary rounded-full"
        style={{
          animation: 'bounce-dots 1.4s ease-in-out infinite',
          animationDelay: '0ms',
        }}
      />
      <div
        className="w-2.5 h-2.5 bg-primary rounded-full"
        style={{
          animation: 'bounce-dots 1.4s ease-in-out infinite',
          animationDelay: '200ms',
        }}
      />
      <div
        className="w-2.5 h-2.5 bg-primary rounded-full"
        style={{
          animation: 'bounce-dots 1.4s ease-in-out infinite',
          animationDelay: '400ms',
        }}
      />
    </div>
  )
}
