import { AnimatePresence, motion } from "framer-motion";
import { usePyodideStore } from "../../stores/pyodideStore";

export function PyodideLoader() {
  const { status, progressMessage, error } = usePyodideStore();
  const isVisible = status !== "ready";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {status === "error" ? (
            <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
              <div className="text-semantic-fail text-4xl">⚠</div>
              <h2 className="text-text-primary text-xl font-semibold">
                Failed to initialize Python runtime
              </h2>
              <p className="text-text-secondary text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors"
              >
                Reload
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-accent text-4xl font-bold tracking-tight">
                  VULCAN
                </span>
                <span className="text-text-tertiary text-xs tracking-widest uppercase">
                  Welded Joint Calculator
                </span>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="h-0.5 w-full bg-border-subtle rounded overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <p className="text-text-secondary text-sm text-center min-h-[1.25rem]">
                  {progressMessage}
                </p>
              </div>

              <p className="text-text-tertiary text-xs text-center">
                Python runtime loads once and is cached by your browser
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
