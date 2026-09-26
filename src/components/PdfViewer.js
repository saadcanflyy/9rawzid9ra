import { useState, useRef, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button, Skeleton, EmptyState } from '../design-system/ui'

// Same worker the upload flow already ships in public/pdfjs (pdfjs-dist 5.4.296,
// which is exactly what react-pdf 10.4.1 expects -- a mismatch throws
// "API version does not match Worker version" at runtime). Served from our own
// origin, so `worker-src 'self' blob:` in vercel.json already covers it.
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs/pdf.worker.min.mjs`

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const STEP = 0.25


/**
 * In-app PDF preview.
 *
 * Replaces a `docs.google.com/viewer` iframe that our own CSP blocked
 * (frame-src allows only challenges.cloudflare.com), so the preview rendered as
 * an empty box in production. Rendering locally also stops every document URL
 * being handed to Google.
 *
 * Fit-to-width is the default and the zoom baseline: scale 1 means exactly the
 * container width, so nothing overflows sideways until the reader chooses to
 * zoom. Pinch still works because the page sets no user-scalable=no.
 */
export default function PdfViewer({ url, onDownload, downloadLabel = 'Télécharger' }) {
  const wrapRef = useRef(null)
  const [fitWidth, setFitWidth] = useState(0)
  const [scale, setScale] = useState(1)
  const [numPages, setNumPages] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)

  // Track the container so the page always starts fitted, including on rotate.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setFitWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onLoad = useCallback(({ numPages: n }) => { setNumPages(n); setError(null) }, [])
  const onError = useCallback((e) => setError(e?.message || 'unknown'), [])

  const zoom = (d) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + d).toFixed(2))))
  const go = (d) => setPage((p) => Math.min(numPages || 1, Math.max(1, p + d)))

  if (error) {
    return (
      <div className="qz-pdf">
        <EmptyState icon="alert" title="Aperçu indisponible" action={
          <Button variant="secondary" as="a" href={url} target="_blank" rel="noreferrer">Ouvrir dans un onglet</Button>
        }>
          <p className="t-body qz-muted">Le document n'a pas pu être affiché ici. Tu peux quand même l'ouvrir ou le télécharger.</p>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="qz-pdf">
      <div className="qz-pdf__stage" ref={wrapRef}>
        <Document
          file={url}
          onLoadSuccess={onLoad}
          onLoadError={onError}
          loading={<div className="qz-pdf__loading"><Skeleton height={420} /></div>}
          error={<div className="qz-pdf__loading"><Skeleton height={420} /></div>}
        >
          {fitWidth > 0 && (
            <Page
              pageNumber={page}
              width={Math.round(fitWidth * scale)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={<div className="qz-pdf__loading"><Skeleton height={420} /></div>}
            />
          )}
        </Document>
      </div>

      {/* Sticky so the download button stays under the thumb on a long document. */}
      <div className="qz-pdf__bar">
        <div className="qz-pdf__group">
          <Button variant="ghost" size="sm" iconOnly icon="up" aria-label="Page précédente"
            disabled={page <= 1} onClick={() => go(-1)} />
          <span className="t-mono qz-pdf__count">{page} / {numPages || '—'}</span>
          <Button variant="ghost" size="sm" iconOnly icon="down" aria-label="Page suivante"
            disabled={!numPages || page >= numPages} onClick={() => go(1)} />
        </div>

        <div className="qz-pdf__group">
          <Button variant="ghost" size="sm" iconOnly icon="minus" aria-label="Dézoomer"
            disabled={scale <= MIN_SCALE} onClick={() => zoom(-STEP)} />
          <span className="t-mono qz-pdf__count">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" iconOnly icon="plus" aria-label="Zoomer"
            disabled={scale >= MAX_SCALE} onClick={() => zoom(STEP)} />
          <Button variant="ghost" size="sm" onClick={() => setScale(1)} disabled={scale === 1}>Ajuster</Button>
        </div>

        <Button variant="primary" size="sm" icon="download" onClick={onDownload}>{downloadLabel}</Button>
      </div>
    </div>
  )
}
