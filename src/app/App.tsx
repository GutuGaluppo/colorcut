import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Inspector } from "../components/layout/Inspector";
import { StatusBar } from "../components/layout/StatusBar";
import { TopBar } from "../components/layout/TopBar";
import { ImageWorkspace } from "../components/preview/ImageWorkspace";
import { getClipboardImage, importImageFile } from "../features/import/importImage";
import { useAppStore } from "../store/useAppStore";

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const {
    image,
    operationStatus,
    message,
    previewBackground,
    setImage,
    setOperation,
    setPreviewBackground,
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
      <TopBar hasImage={Boolean(image)} onOpen={() => fileInputRef.current?.click()} onPaste={() => void handlePaste()} />
      <div className="app-content">
        <ImageWorkspace
          image={image}
          background={previewBackground}
          isDragging={isDragging}
          onOpen={() => fileInputRef.current?.click()}
          onClear={clearImage}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        />
        <Inspector image={image} background={previewBackground} onBackgroundChange={setPreviewBackground} />
      </div>
      <StatusBar image={image} status={operationStatus} message={message} />
    </div>
  );
}

