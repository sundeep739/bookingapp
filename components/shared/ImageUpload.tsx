"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

/**
 * Lets the user pick an image from their device. The image is resized and
 * compressed client-side to a small JPEG data URL (no external storage needed),
 * then handed back via onChange so it can be saved to the DB.
 */
export default function ImageUpload({
  value,
  onChange,
  fallback,
  rounded = "rounded-2xl",
  size = 80,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  fallback?: React.ReactNode;
  rounded?: string;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) { setError("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Image must be under 8MB"); return; }
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 320);
      onChange(dataUrl);
    } catch {
      setError("Could not process that image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`${rounded} object-cover w-full h-full`} />
        ) : (
          <div className={`${rounded} w-full h-full overflow-hidden`}>{fallback}</div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Change photo"
        >
          {busy ? <Loader2 size={13} className="animate-spin text-gray-500" /> : <Camera size={13} className="text-gray-600" />}
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Upload photo
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, up to 8MB.</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

function resizeToDataUrl(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > max) { height = (height * max) / width; width = max; }
        else if (height > max) { width = (width * max) / height; height = max; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
