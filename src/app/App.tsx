import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Inspector } from "../components/layout/Inspector";
import { StatusBar } from "../components/layout/StatusBar";
import { TopBar } from "../components/layout/TopBar";
import { ImageWorkspace } from "../components/preview/ImageWorkspace";
import { getClipboardImage, importImageFile, readObjectUrlBytes } from "../features/import/importImage";
import { formatPalette, type PaletteExportFormat } from "../features/palette/exportPalette";
import { cutoutPreviewUrl, exportCutout, extractPalette, removeBackground, writeTextFile } from "../lib/tauri/commands";
import { useAppStore } from "../store/useAppStore";

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const {
    image,
    removal,
    viewMode,
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
    setPalette,
    setPaletteSource,
    setPaletteCount,
    zoomIn,
    zoomOut,
    resetZoom,
    clearImage,
  } = useAppStore();

  useEffect(() => () => useAppStore.getState().clearImage(), []);

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
      setRemoval(await removeBackground(bytes));
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
        filters: [{ name: "PNG image", extensions: ["png"] }],
      });
      if (!destination) return;
      await exportCutout(removal.cutoutPath, destination);
      setOperation("success", "Cutout exported");
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
      const bytes = await readObjectUrlBytes(image.sourceUrl);
      const cutoutPath = paletteSource === "subject" ? removal?.cutoutPath : undefined;
      setPalette(await extractPalette(bytes, paletteSource, paletteCount, cutoutPath));
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
      setOperation("success", "Palette exported");
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
  const showCutout = viewMode === "cutout" && Boolean(removal);

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
          previewSrc={showCutout && removal ? cutoutPreviewUrl(removal.cutoutPath) : undefined}
          previewAlt={showCutout ? `Cutout of ${image?.fileName}` : undefined}
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
        />
      </div>
      <StatusBar image={image} status={operationStatus} message={message} />
    </div>
  );
}
