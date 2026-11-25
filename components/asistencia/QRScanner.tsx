'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { validateQrCodePayload } from '@/lib/utils/qrCode';

interface QRScannerProps {
  onScan: (value: string) => void;
}

const READER_ID = 'attendance-qr-reader';
const FILE_READER_ID = 'attendance-qr-file-reader';

export default function QRScanner({ onScan }: QRScannerProps) {
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const handled = useRef(false);

  const acceptPayload = useCallback(
    async (
      decodedText: string,
      scanner?: import('html5-qrcode').Html5Qrcode
    ) => {
      if (handled.current) return;
      const result = validateQrCodePayload(decodedText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      handled.current = true;
      setScanned(true);
      setError('');
      if (scanner?.isScanning) await scanner.stop();
      onScan(result.value);
    },
    [onScan]
  );

  useEffect(() => {
    let disposed = false;
    let scanner: import('html5-qrcode').Html5Qrcode | undefined;
    let startup: Promise<null> | undefined;
    let cleanupPromise: Promise<void> | undefined;

    const cleanup = () => {
      if (cleanupPromise) return cleanupPromise;
      cleanupPromise = (async () => {
        if (!scanner) return;
        if (startup) await startup.then(() => undefined, () => undefined);
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      })();
      return cleanupPromise;
    };

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (disposed) return;

        scanner = new Html5Qrcode(READER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        startup = scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (disposed) return;
            void acceptPayload(decodedText, scanner);
          },
          undefined
        );
        await startup;
        if (disposed) {
          await cleanup();
          return;
        }
        setStarting(false);
      } catch (scannerError) {
        if (disposed) return;
        setStarting(false);
        setError(
          `No se pudo iniciar el lector QR. Verifica los permisos de cámara. ${
            scannerError instanceof Error ? scannerError.message : ''
          }`.trim()
        );
      }
    };

    void startScanner();
    return () => {
      disposed = true;
      void cleanup().catch((cleanupError: unknown) => {
        console.error('No se pudo detener el lector QR:', cleanupError);
      });
    };
  }, [acceptPayload]);

  const scanImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(FILE_READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      const result = await scanner.scanFileV2(file, false);
      await acceptPayload(result.decodedText);
      scanner.clear();
    } catch (scannerError) {
      setError(
        scannerError instanceof Error
          ? `No se pudo leer el código QR de la imagen: ${scannerError.message}`
          : 'No se pudo leer el código QR de la imagen.'
      );
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-3">
      <div id={READER_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-md" />
      <div id={FILE_READER_ID} className="hidden" />
      {starting && (
        <p className="mt-2 text-sm text-gray-600" aria-live="polite">
          Solicitando acceso a la cámara...
        </p>
      )}
      {scanned && (
        <p className="mt-2 text-sm text-green-700" aria-live="polite">
          Código QR leído correctamente.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <label className="mt-3 block text-sm text-gray-700">
        O selecciona una imagen con el código QR
        <input
          type="file"
          accept="image/*"
          onChange={(event) => void scanImage(event)}
          className="mt-1 block w-full text-sm"
          disabled={scanned}
        />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        El código leído se guardará en la asistencia. Selecciona el empleado manualmente.
      </p>
    </div>
  );
}
