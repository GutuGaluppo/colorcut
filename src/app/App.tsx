import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Inspector } from "../components/layout/Inspector";
import { StatusBar } from "../components/layout/StatusBar";
import { TopBar } from "../components/layout/TopBar";
import { ImageWorkspace } from "../components/preview/ImageWorkspace";
import { Toast } from "../components/ui/Toast";
import { getClipboardImage, importImageFile, readObjectUrlBytes } from "../features/import/importImage";
import { formatPalette, type PaletteExportFormat } from "../features/palette/exportPalette";
import {
  cacheSourceImage,
  cutoutPreviewUrl,
  exportCutout,
  exportPaletteImage,
  extractPalette,
  removeBackground,
  writeTextFile,
} from "../lib/tauri/commands";
import { useAppStore } from "../store/useAppStore";

function fileNameOf(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const {
    image,
    removal,
    viewMode,
    sliderPosition,
    palette,
    paletteSource,
    paletteCount,
    operationStatus,
    message,
    previewBackground,
    zoom,
    setImage,
    setOperation,
    setPreviewBackground,
    setRemoval,
    setViewMode,
    setSliderPosition,
    setPalette,
    setPaletteSource,
    setPaletteCount,
    zoomIn,
    zoomOut,
    resetZoom,
    clearImage,
  } = useAppStore();

  useEffect(() => () => useAppStore.getState().clearImage(), []);

  useEffect(() => {
    const shouldNotify = operationStatus === "error" || (operationStatus === "success" && message.startsWith("Exported "));
    setToast(shouldNotify ? { tone: operationStatus as "success" | "error", message } : null);
  }, [message, operationStatus]);

  async function loadFile(file?: File) {
    if (!file) return;
    setOperation("processing", "Loading image…");
    try {
      setImage(await importImageFile(file));
    } catch (error) {
      const message = error instanceof Error ? error.message : "The image could not be opened.";
      setOperation("error", message);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  }

  async function handlePaste() {
    setOperation("processing", "Reading clipboard…");
    try {
      await loadFile(await getClipboardImage());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clipboard image unavailable.";
      setOperation("error", message);
    }
  }

  async function handleRemoveBackground() {
    if (!image) return;
    setOperation("processing", "Removing background…");
    try {
      const bytes = await readObjectUrlBytes(image.sourceUrl);
      const sourcePath = await cacheSourceImage(bytes);
      setRemoval(await removeBackground(sourcePath));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Background removal failed.";
      setOperation("error", message);
    }
  }

  async function handleExport() {
    if (!removal || !image) return;
    try {
      const suggestedName = `${image.fileName.replace(/\.[^./]+$/, "")}-cutout.png`;
      const destination = await save({
        defaultPath: suggestedName,
        filters: [
          { name: "PNG image", extensions: ["png"] },
          { name: "WebP image", extensions: ["webp"] },
        ],
      });
      if (!destination) return;
      await exportCutout(removal.cutoutPath, destination);
      setOperation("success", `Exported ${fileNameOf(destination)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setOperation("error", message);
    }
  }

  async function handleExtractPalette() {
    if (!image) return;
    if (paletteSource === "subject" && !removal) return;
    setOperation("processing", "Extracting palette…");
    try {
      const cutoutPath = paletteSource === "subject" ? removal?.cutoutPath : undefined;
      const sourcePath =
        paletteSource === "original"
          ? await cacheSourceImage(await readObjectUrlBytes(image.sourceUrl))
          : undefined;
      setPalette(await extractPalette(paletteSource, paletteCount, sourcePath, cutoutPath));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Palette extraction failed.";
      setOperation("error", message);
    }
  }

  async function handleExportPalette(format: PaletteExportFormat) {
    if (!palette) return;
    try {
      const destination = await save({
        defaultPath: `palette.${format}`,
        filters: [{ name: format.toUpperCase(), extensions: [format] }],
      });
      if (!destination) return;
      await writeTextFile(formatPalette(palette, format), destination);
      setOperation("success", `Exported ${fileNameOf(destination)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setOperation("error", message);
    }
  }

  async function handleExportPaletteImage() {
    if (!palette) return;
    try {
      const destination = await save({
        defaultPath: "palette.png",
        filters: [{ name: "PNG image", extensions: ["png"] }],
      });
      if (!destination) return;
      await exportPaletteImage(
        palette.colors.map((color) => color.rgb),
        destination,
      );
      setOperation("success", `Exported ${fileNameOf(destination)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setOperation("error", message);
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void loadFile(event.dataTransfer.files?.[0]);
  }

  const isProcessing = operationStatus === "processing";
  const canRemoveBackground = Boolean(image) && !isProcessing;
  const canExport = Boolean(removal) && !isProcessing;
  const canExtractPalette = Boolean(image) && !isProcessing && (paletteSource === "original" || Boolean(removal));
  const cutoutSrc = removal ? cutoutPreviewUrl(removal.cutoutPath) : undefined;

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInput}
        tabIndex={-1}
      />
      <TopBar
        canRemoveBackground={canRemoveBackground}
        canExtractPalette={canExtractPalette}
        canExport={canExport}
        onOpen={() => fileInputRef.current?.click()}
        onPaste={() => void handlePaste()}
        onRemoveBackground={() => void handleRemoveBackground()}
        onExtractPalette={() => void handleExtractPalette()}
        onExport={() => void handleExport()}
      />
      <div className="app-content">
        <ImageWorkspace
          image={image}
          cutoutSrc={cutoutSrc}
          viewMode={viewMode}
          sliderPosition={sliderPosition}
          onSliderPositionChange={setSliderPosition}
          background={previewBackground}
          zoom={zoom}
          isDragging={isDragging}
          isProcessing={isProcessing}
          processingMessage={message}
          onOpen={() => fileInputRef.current?.click()}
          onClear={clearImage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        />
        <Inspector
          image={image}
          removal={removal}
          viewMode={viewMode}
          isProcessing={isProcessing}
          canRemoveBackground={canRemoveBackground}
          background={previewBackground}
          onBackgroundChange={setPreviewBackground}
          onViewModeChange={setViewMode}
          onRemoveBackground={() => void handleRemoveBackground()}
          palette={palette}
          paletteSource={paletteSource}
          paletteCount={paletteCount}
          canExtractPalette={canExtractPalette}
          onPaletteSourceChange={setPaletteSource}
          onPaletteCountChange={setPaletteCount}
          onExtractPalette={() => void handleExtractPalette()}
          onExportPalette={(format) => void handleExportPalette(format)}
          onExportPaletteImage={() => void handleExportPaletteImage()}
        />
      </div>
      {toast && <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />}
      <StatusBar image={image} status={operationStatus} message={message} />
    </div>
  );
}
