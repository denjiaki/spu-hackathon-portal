import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./ui";

/**
 * Camera-based QR scanner with a graceful fallback: if the device has no
 * camera (or permission is denied), callers still work via manual entry
 * or the demo simulate buttons rendered next to this component.
 */
export default function QrScanner({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const regionId = "qr-scan-region";

  useEffect(() => {
    if (!active) return;
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => onScanRef.current(text),
        () => { /* per-frame decode misses are expected */ },
      )
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not start the camera");
        setActive(false);
      });
    return () => {
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else {
        scanner.clear();
      }
      scannerRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning) return;
    if (paused) scanner.pause(true);
    else scanner.resume();
  }, [paused]);

  return (
    <div className="space-y-2">
      <div id={regionId} className="overflow-hidden rounded-lg bg-black/5" />
      {error && <p className="text-sm text-falcon">Camera unavailable: {error}. Use manual entry below.</p>}
      <Button variant={active ? "outline" : "primary"} onClick={() => { setError(null); setActive(!active); }}>
        {active ? "Stop camera" : "Start camera scanner"}
      </Button>
    </div>
  );
}
