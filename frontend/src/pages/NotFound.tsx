export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-deep)] px-6">
      <div className="text-center space-y-6 animate-slide-up">
        <div className="relative inline-block">
          <p className="font-hud text-[8rem] font-black leading-none text-white/5 select-none">404</p>
          <p className="absolute inset-0 font-hud text-[8rem] font-black leading-none gradient-text select-none blur-sm opacity-60">404</p>
          <p className="absolute inset-0 font-hud text-[8rem] font-black leading-none gradient-text select-none">404</p>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Page not found</h1>
          <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
            This arena doesn&apos;t exist. The URL might be wrong or the battle may have ended.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { window.location.href = '/'; }}
          className="btn-primary"
        >
          ⚔ Back to the Arena
        </button>
      </div>
    </main>
  );
}
