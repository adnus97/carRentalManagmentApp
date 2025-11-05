'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  getContractHTML,
  downloadContractPDF,
  downloadContractDOCX,
} from '@/api/contracts';
import { toast } from '@/components/ui/toast';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  title?: string;
};

export function ContractDialog({
  open,
  onOpenChange,
  contractId,
  title = 'Contract Preview',
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Inject minimal preview CSS and auto-size iframe height
  const enhancePreview = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !iframe) return;

    // Preview-only: show each .page as a separate sheet with gap BELOW it
    const style = doc.createElement('style');
    style.textContent = `
      @media screen {
        body { background: #e5e7eb; } /* gray canvas behind pages */
        .sheet { padding: 12px 0; }
        .page {
          box-shadow: 0 6px 20px rgba(0,0,0,.15);
          border-radius: 6px;
          background: #fff;
          margin: 0 auto 14px auto; /* bottom-only gap, no padding to avoid covering content */
        }
        /* Keep signature lane area visually clear (actual space is in template) */
        .sign-lane { margin-top: 4mm; margin-bottom: 4mm; }
      }
    `;
    doc.head.appendChild(style);

    const resize = () => {
      const h = Math.max(
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
      );
      iframe.style.height = `${h}px`;
    };

    // Initial sizing after layout
    if (doc.readyState === 'complete') {
      resize();
    } else {
      iframe.onload = () => resize();
      doc.addEventListener('readystatechange', () => {
        if (doc.readyState === 'complete') resize();
      });
    }

    // Resize when images load
    Array.from(doc.images || []).forEach((img) => {
      img.addEventListener('load', resize, { once: true } as any);
      img.addEventListener('error', resize, { once: true } as any);
    });

    // Observe document size changes
    const RZCtor = (window as any).ResizeObserver as
      | (new (cb: ResizeObserverCallback) => ResizeObserver)
      | undefined;

    if (RZCtor) {
      const ro = new RZCtor(() => resize());
      ro.observe(doc.documentElement);
      ro.observe(doc.body);
    } else {
      // Fallback retries
      let n = 0;
      const id = setInterval(() => {
        resize();
        if (++n > 10) clearInterval(id);
      }, 200);
    }
  };

  useEffect(() => {
    if (!open || !contractId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const html = await getContractHTML(contractId);
        if (cancelled) return;
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          enhancePreview();
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            'Failed to load contract';
          setErr(msg);
          toast({ type: 'error', title: 'Error', description: msg });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, contractId]);

  const print = () => iframeRef.current?.contentWindow?.print();

  const handleDownloadPDF = async () => {
    if (!contractId) return;
    try {
      await downloadContractPDF(contractId);
      toast({
        type: 'success',
        title: 'Download Started',
        description: `PDF is being downloaded.`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'Failed to download PDF';
      toast({ type: 'error', title: 'Download Failed', description: msg });
    }
  };

  const handleDownloadDOCX = async () => {
    if (!contractId) return;
    try {
      await downloadContractDOCX(contractId);
      toast({
        type: 'success',
        title: 'Download Started',
        description: `Word document is being downloaded.`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to download Word file';
      toast({ type: 'error', title: 'Download Failed', description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : (err ?? 'Ready')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <span className="text-xs px-2 min-w-[4rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={print}>
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPDF}>
              PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadDOCX}>
              Word
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 bg-muted overflow-auto">
          <div
            className="w-[794px] mx-auto my-4"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: 794, // ~210mm at 96dpi
            }}
          >
            <iframe
              ref={iframeRef}
              title="Contract"
              style={{
                width: 794,
                height: 100, // initial; auto-sized after load
                border: 'none',
                display: 'block',
                background: 'transparent',
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
