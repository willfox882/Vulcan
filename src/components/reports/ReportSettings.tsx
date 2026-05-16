import { useRef } from "react";
import { useUIStore } from "../../stores/uiStore";

interface Props {
  onClose: () => void;
}

export function ReportSettings({ onClose }: Props) {
  const { reportSettings, setReportSettings } = useUIStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReportSettings({ logoDataUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #3f3f46",
          borderRadius: 8,
          padding: 24,
          width: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fafafa" }}>
          Report Settings
        </div>

        {(
          [
            ["companyName", "Company Name"],
            ["engineerName", "Engineer Name"],
            ["projectRef", "Project Reference"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa" }}>{label}</span>
            <input
              type="text"
              value={reportSettings[key]}
              onChange={(e) => setReportSettings({ [key]: e.target.value })}
              style={{
                background: "#0a0a0a",
                border: "1px solid #3f3f46",
                borderRadius: 4,
                padding: "4px 8px",
                color: "#fafafa",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </label>
        ))}

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Logo (PNG/JPG)</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: 4,
                color: "#a1a1aa",
                cursor: "pointer",
              }}
            >
              Choose file
            </button>
            {reportSettings.logoDataUrl && (
              <>
                <img
                  src={reportSettings.logoDataUrl}
                  alt="logo preview"
                  style={{ height: 28, objectFit: "contain" }}
                />
                <button
                  onClick={() => setReportSettings({ logoDataUrl: null })}
                  style={{
                    fontSize: "10px",
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleLogoUpload}
          />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "5px 14px",
              fontSize: "12px",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: 4,
              color: "#a1a1aa",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
