export default function AnimatedBackground() {
  return (
    <div className="mesh-gradient" aria-hidden="true">
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-cyan-500/6 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}
