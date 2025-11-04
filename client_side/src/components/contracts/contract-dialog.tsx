'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getContractHTML, downloadContractPDF } from '@/api/contracts';
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

  useEffect(() => {
    if (!open || !contractId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const html = await getContractHTML(contractId);
        if (cancelled) return;
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
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

  const handleDownload = async () => {
    if (!contractId) return;
    try {
      await downloadContractPDF(contractId);
      toast({
        type: 'success',
        title: 'Download Started',
        description: `Contract ${contractId} is being downloaded.`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'Failed to download PDF';
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
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              Download PDF
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 bg-muted overflow-auto">
          <div
            className="w-[794px] mx-auto my-4 bg-white shadow"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: 794, // ~210mm at 96dpi
            }}
          >
            {/* Height large enough for 2 pages */}
            <iframe
              ref={iframeRef}
              title="Contract"
              style={{
                width: 794,
                height: 1600,
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
