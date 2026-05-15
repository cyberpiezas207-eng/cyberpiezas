// =============================================================================
// CloudinaryUpload - Version UNSIGNED (sin necesitar env vars en backend)
// =============================================================================
// REEMPLAZAR archivo: client/src/components/CloudinaryUpload.tsx
//
// Usa upload preset UNSIGNED de Cloudinary.
// No requiere variables de entorno en el backend.
// Solo necesita el cloud name (PUBLICO) y el preset name.
// =============================================================================

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Upload, X } from "lucide-react";

// =============================================================================
// CONFIGURACION - Aqui defines tu cuenta de Cloudinary
// =============================================================================
// Estos valores son PUBLICOS (aparecen en URLs de imagenes).
// Puedes hardcodearlos sin problema de seguridad.
// =============================================================================

const CLOUDINARY_CLOUD_NAME = "ds32jsifc";
const CLOUDINARY_UPLOAD_PRESET = "tarima_upload";

// =============================================================================

interface CloudinaryUploadProps {
  onUploaded: (url: string) => void;
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  folder?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CloudinaryUpload({
  onUploaded,
  multiple = false,
  maxSizeMB = 10,
  label = "Subir foto",
  variant = "primary",
  folder = "tarima",
  icon,
  size = "md",
  className = "",
}: CloudinaryUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const uploadOneFile = async (file: File): Promise<string | null> => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast.error(
        file.name + " es muy pesado (" + sizeMB.toFixed(1) + "MB). Maximo: " + maxSizeMB + "MB",
      );
      return null;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(file.name + " no es una imagen");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    return new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener("load", () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
            resolve(response.secure_url as string);
          } else {
            console.error("Cloudinary error:", response);
            toast.error("Error subiendo: " + (response.error?.message || "Desconocido"));
            resolve(null);
          }
        } catch (err) {
          toast.error("Error procesando respuesta");
          resolve(null);
        }
      });
      xhr.addEventListener("error", () => {
        toast.error("Error de red subiendo " + file.name);
        resolve(null);
      });
      xhr.open(
        "POST",
        "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload",
      );
      xhr.send(formData);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setTotalFiles(files.length);
    setCurrentFile(0);
    setProgress(0);

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      setCurrentFile(i + 1);
      setProgress(0);
      const url = await uploadOneFile(files[i]);
      if (url) {
        onUploaded(url);
        successCount++;
      }
    }

    setUploading(false);
    setProgress(0);
    setCurrentFile(0);
    setTotalFiles(0);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "Foto subida"
          : successCount + " fotos subidas",
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-fuchsia-500/30",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white",
    ghost: "bg-slate-100 hover:bg-slate-200 text-slate-700",
  };

  const sizeStyles = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className={
          "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed " +
          variantStyles[variant] +
          " " +
          sizeStyles[size] +
          " " +
          className
        }
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {totalFiles > 1
                ? "Subiendo " + currentFile + " de " + totalFiles + " (" + progress + "%)"
                : "Subiendo... " + progress + "%"}
            </span>
          </>
        ) : (
          <>
            {icon || <Camera className="w-4 h-4" />}
            <span>{label}</span>
          </>
        )}
      </button>
    </>
  );
}

// ============================================================================
// Dropzone GRANDE para galerias
// ============================================================================

export function CloudinaryUploadDropzone({
  onUploaded,
  multiple = true,
  maxSizeMB = 10,
  folder = "tarima",
}: {
  onUploaded: (url: string) => void;
  multiple?: boolean;
  maxSizeMB?: number;
  folder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const handleClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const uploadOneFile = async (file: File): Promise<string | null> => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast.error(file.name + " es muy pesado (" + sizeMB.toFixed(1) + "MB)");
      return null;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(file.name + " no es una imagen");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    return new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
            resolve(response.secure_url as string);
          } else {
            console.error("Cloudinary error:", response);
            toast.error("Error: " + (response.error?.message || "Desconocido"));
            resolve(null);
          }
        } catch {
          toast.error("Error procesando");
          resolve(null);
        }
      });
      xhr.addEventListener("error", () => {
        toast.error("Error de red");
        resolve(null);
      });
      xhr.open(
        "POST",
        "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload",
      );
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    setTotalFiles(files.length);
    setCurrentFile(0);
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      setCurrentFile(i + 1);
      setProgress(0);
      const url = await uploadOneFile(files[i]);
      if (url) {
        onUploaded(url);
        successCount++;
      }
    }
    setUploading(false);
    setProgress(0);
    setCurrentFile(0);
    setTotalFiles(0);
    if (successCount > 0) {
      toast.success(successCount === 1 ? "Foto subida" : successCount + " fotos subidas");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) await handleFiles(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await handleFiles(files);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        disabled={uploading}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={
          "relative rounded-2xl border-2 border-dashed transition-all p-8 text-center cursor-pointer " +
          (dragActive
            ? "border-fuchsia-500 bg-fuchsia-50"
            : uploading
            ? "border-slate-300 bg-slate-50 cursor-not-allowed"
            : "border-slate-300 bg-slate-50 hover:border-fuchsia-400 hover:bg-fuchsia-50/30")
        }
      >
        {uploading ? (
          <div>
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-fuchsia-500 animate-spin" />
            <p className="font-bold text-slate-900">
              Subiendo {currentFile} de {totalFiles}
            </p>
            <div className="mt-3 max-w-xs mx-auto bg-slate-200 rounded-full overflow-hidden h-2">
              <div
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-full transition-all"
                style={{ width: progress + "%" }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{progress}%</p>
          </div>
        ) : (
          <div>
            <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <p className="font-bold text-slate-900">
              {multiple ? "Sube fotos desde tu celular" : "Sube una foto"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {multiple ? "Tap aqui o arrastra fotos" : "Tap aqui para elegir"}
            </p>
            <p className="text-[10px] text-slate-400 mt-3">
              JPG, PNG, WebP - max {maxSizeMB}MB por foto
            </p>
          </div>
        )}
      </div>
    </>
  );
}
