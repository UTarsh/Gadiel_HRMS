import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Loader2, MoveHorizontal, MoveVertical, RotateCcw, Upload, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ImageSize = { width: number; height: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

function computeLayout(size: ImageSize, zoom: number, panX: number, panY: number, boxSize: number) {
  const baseScale = Math.max(boxSize / size.width, boxSize / size.height)
  const scale = baseScale * zoom
  const renderWidth = size.width * scale
  const renderHeight = size.height * scale
  const maxPanX = Math.max(0, (renderWidth - boxSize) / 2)
  const maxPanY = Math.max(0, (renderHeight - boxSize) / 2)

  return {
    renderWidth,
    renderHeight,
    offsetX: (panX / 100) * maxPanX,
    offsetY: (panY / 100) * maxPanY,
  }
}

async function buildAdjustedFile(
  sourceUrl: string,
  size: ImageSize,
  zoom: number,
  panX: number,
  panY: number,
  fileName: string,
  outputSize = 1024,
): Promise<File> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to create canvas context')

  const { renderWidth, renderHeight, offsetX, offsetY } = computeLayout(size, zoom, panX, panY, outputSize)
  const left = (outputSize - renderWidth) / 2 + offsetX
  const top = (outputSize - renderHeight) / 2 + offsetY
  ctx.drawImage(img, left, top, renderWidth, renderHeight)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error('Unable to export image'))
        return
      }
      resolve(value)
    }, 'image/png')
  })

  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${baseName}.png`, { type: 'image/png' })
}

interface AdjustableImageUploadProps {
  currentUrl: string | null
  alt: string
  frameSize?: number
  caption?: string
  title: string
  description?: string
  confirmLabel?: string
  onUpload: (file: File) => Promise<void>
}

export function AdjustableImageUpload({
  currentUrl,
  alt,
  frameSize = 208,
  caption,
  title,
  description,
  confirmLabel = 'Upload Photo',
  onUpload,
}: AdjustableImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<ImageSize | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const previewBoxSize = 340
  const previewLayout = useMemo(() => {
    if (!naturalSize) return null
    return computeLayout(naturalSize, zoom, panX, panY, previewBoxSize)
  }, [naturalSize, zoom, panX, panY])

  function resetState() {
    setSelectedFile(null)
    setNaturalSize(null)
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setSaving(false)
  }

  function openPicker() {
    inputRef.current?.click()
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file)
    resetState()
    setSelectedFile(file)
    setSourceUrl(url)
    setOpen(true)
    e.target.value = ''
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setSourceUrl(null)
      resetState()
    }
  }

  async function handleSave() {
    if (!selectedFile || !sourceUrl || !naturalSize) return
    setSaving(true)
    try {
      const adjusted = await buildAdjustedFile(sourceUrl, naturalSize, zoom, panX, panY, selectedFile.name)
      await onUpload(adjusted)
      handleDialogOpenChange(false)
    } catch {
      // Parent callback surfaces the error state; keep the dialog open so the user can retry.
    } finally {
      setSaving(false)
    }
  }

  const frameStyle: CSSProperties = {
    width: frameSize,
    height: frameSize,
    border: '4px solid var(--c-surface)',
    boxShadow: '0 8px 40px rgba(59,130,246,0.18)',
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />

      <button
        type="button"
        onClick={openPicker}
        className="relative group overflow-hidden focus:outline-none rounded-[28px]"
        style={frameStyle}
        title={currentUrl ? 'Adjust photo' : 'Upload photo'}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {alt.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: '28px' }}>photo_camera</span>
          <span className="text-[10px] font-bold text-white mt-1">{currentUrl ? 'Adjust' : 'Upload'}</span>
        </div>
      </button>

      {caption && <p className="text-[9px] font-medium text-center" style={{ color: 'var(--c-t4)' }}>{caption}</p>}

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-[min(92vw,56rem)] rounded-[28px]" style={{ backgroundColor: 'var(--c-card)', border: '1px solid var(--c-border2)' }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--c-t1)' }}>
              {title}
            </DialogTitle>
            {description && <p className="text-sm mt-1" style={{ color: 'var(--c-t3)' }}>{description}</p>}
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] items-start">
            <div className="mx-auto">
              <div
                className="relative overflow-hidden shadow-sm"
                style={{
                  width: 'min(84vw, 340px)',
                  height: 'min(84vw, 340px)',
                  borderRadius: '32px',
                  border: '1px solid var(--c-border2)',
                  backgroundColor: 'var(--c-surface)',
                }}
              >
                {sourceUrl && naturalSize && previewLayout && (
                  <img
                    src={sourceUrl}
                    alt="Preview"
                    onLoad={(e) => setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: previewLayout.renderWidth,
                      height: previewLayout.renderHeight,
                      transform: `translate(calc(-50% + ${previewLayout.offsetX}px), calc(-50% + ${previewLayout.offsetY}px))`,
                    }}
                  />
                )}
                {sourceUrl && !naturalSize && (
                  <img
                    src={sourceUrl}
                    alt="Preview"
                    onLoad={(e) => setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                    className="w-full h-full object-cover"
                  />
                )}
                {!sourceUrl && (
                  <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--c-t3)' }}>
                    No image selected
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border3)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <ZoomIn className="w-4 h-4" style={{ color: '#3B82F6' }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-t3)' }}>Zoom</p>
                </div>
                <input
                  type="range"
                  min={1}
                  max={2}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--c-t3)' }}>
                  <span>Fit</span>
                  <span>Close up</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MoveHorizontal className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-t3)' }}>Horizontal</p>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={panX}
                    onChange={(e) => setPanX(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MoveVertical className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-t3)' }}>Vertical</p>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={panY}
                    onChange={(e) => setPanY(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setZoom(1); setPanX(0); setPanY(0) }}
                className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full"
                style={{ backgroundColor: 'var(--c-surface)', color: '#3B82F6' }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleDialogOpenChange(false)}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-t2)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedFile || !sourceUrl || !naturalSize}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
