"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, UploadCloud, X, ZoomIn, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { extractReceiptInfo, ExtractReceiptInfoOutput } from "@/ai/flows/extract-receipt-info";
import { Skeleton } from "@/components/ui/skeleton";

export default function SnapBillPage() {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptInfo, setReceiptInfo] = useState<ExtractReceiptInfoOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isUploading) {
      timer = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
      }, 200);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isUploading]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setReceiptInfo(null);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }

      setImagePreviewUrl(null);
      setIsUploading(true);
      setProgress(10);

      setTimeout(() => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          setProgress(100);
          const dataUri = reader.result as string;
          setTimeout(() => {
            setImagePreviewUrl(dataUri);
            setIsUploading(false);
            setIsProcessing(true);
            extractReceiptInfo({ photoDataUri: dataUri })
              .then(info => {
                setReceiptInfo(info);
              })
              .catch(err => {
                console.error(err);
                setError("Could not analyze receipt. Please try again.");
              })
              .finally(() => {
                setIsProcessing(false);
              });
          }, 500);
        };
        reader.readAsDataURL(file);
      }, 1500);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleRetake = () => {
    setImagePreviewUrl(null);
    setReceiptInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    triggerFileSelect();
  };

  const handleRemove = () => {
    setImagePreviewUrl(null);
    setReceiptInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary font-headline">
            SnapBill
          </h1>
          <p className="text-muted-foreground mt-2">
            Capture and manage your receipts with a single snap.
          </p>
        </header>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="text-primary" />
              Upload Receipt
            </CardTitle>
            <CardDescription>
              Use your phone's camera to snap a photo of your receipt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="aspect-[4/3] w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden bg-muted/20">
              {imagePreviewUrl && !isUploading ? (
                <>
                  <Image
                    src={imagePreviewUrl}
                    alt="Receipt preview"
                    fill
                    className="object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white h-12 w-12 hover:bg-white/20"
                        >
                          <ZoomIn className="h-6 w-6" />
                          <span className="sr-only">Zoom in</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[90vh] p-0 border-0">
                        <Image
                          src={imagePreviewUrl}
                          alt="Receipt preview"
                          fill
                          className="object-contain rounded-lg"
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              ) : isUploading ? (
                <div className="w-full px-8 flex flex-col items-center gap-4">
                  <p className="text-sm font-medium text-primary">
                    Uploading your receipt...
                  </p>
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-4 flex flex-col items-center">
                  <Camera className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <h3 className="font-semibold text-foreground">
                    No Receipt Uploaded
                  </h3>
                  <p className="text-sm">
                    Your captured receipt will appear here.
                  </p>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
              id="receipt-upload"
              aria-label="Upload receipt"
            />

            <div className="mt-6">
              {!imagePreviewUrl || isUploading ? (
                <Button
                  className="w-full"
                  onClick={triggerFileSelect}
                  disabled={isUploading || isProcessing}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : isProcessing ? "Analyzing..." : "Take Photo"}
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleRetake} variant="outline" disabled={isProcessing}>
                    <Camera className="mr-2 h-4 w-4" />
                    Retake
                  </Button>
                  <Button onClick={handleRemove} variant="destructive" disabled={isProcessing}>
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(isProcessing || receiptInfo) && (
          <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="text-primary" />
                Receipt Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              ) : receiptInfo?.isReceipt && receiptInfo.total !== undefined ? (
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    ${receiptInfo.total.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  This does not appear to be a receipt, or the total could not be determined.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
