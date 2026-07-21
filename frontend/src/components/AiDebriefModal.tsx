import React from 'react';

function parseMarkdownToElements(markdown: string) {
  return markdown.split('\n').map((line, i) => {
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="text-lg font-black text-white mt-6 mb-2 flex items-center gap-2">
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-xl font-black text-white mt-8 mb-3">
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} className="text-sm text-slate-300 ml-4 list-disc mb-1">
          {line.replace('- ', '')}
        </li>
      );
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-sm text-slate-300 mb-1 leading-relaxed">
        {line}
      </p>
    );
  });
}

export function AiDebriefModal({
  debrief,
  onClose,
  loading
}: {
  debrief: string | null;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.15)] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-black text-white">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Post-Battle AI Debrief</h2>
              <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase">Powered by Groq</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-2"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <span className="text-4xl animate-bounce">🤔</span>
              <p className="text-indigo-300 font-semibold animate-pulse text-sm">Analyzing submissions...</p>
            </div>
          ) : debrief ? (
            <div className="prose prose-invert prose-indigo max-w-none">
              {parseMarkdownToElements(debrief)}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              No debrief available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary px-6 py-2 text-sm shadow-lg shadow-indigo-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
