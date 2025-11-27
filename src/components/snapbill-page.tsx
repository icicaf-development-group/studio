"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, UploadCloud, X, ZoomIn, Wallet, User, List } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type LineItemWithId = NonNullable<ExtractReceiptInfoOutput['items']>[0] & { id: number };

export default function SnapBillPage() {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptInfo, setReceiptInfo] = useState<ExtractReceiptInfoOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [unselectedItems, setUnselectedItems] = useState<LineItemWithId[]>([]);
  const [myItems, setMyItems] = useState<LineItemWithId[]>([]);
  const [personalTotal, setPersonalTotal] = useState<number>(0);
  
  const { toast } = useToast();

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
  
  useEffect(() => {
    const total = myItems.reduce((sum, item) => sum + (item?.amount || 0), 0);
    setPersonalTotal(total);
  }, [myItems]);

  const resetState = () => {
    setImagePreviewUrl(null);
    setReceiptInfo(null);
    setError(null);
    setUnselectedItems([]);
    setMyItems([]);
    setIsUploading(false);
    setIsProcessing(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState();

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select a valid image file.",
      });
      return;
    }
    
    setIsUploading(true);
    setProgress(10);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      
      setProgress(100);
      setTimeout(() => {
        setImagePreviewUrl(dataUri);
        setIsUploading(false);
        setIsProcessing(true);

        extractReceiptInfo({ photoDataUri: dataUri })
          .then(info => {
            if (info.isReceipt) {
              setReceiptInfo(info);
              const itemsWithId = (info.items || []).map((item, index) => ({...item, id: index}));
              setUnselectedItems(itemsWithId);
            } else {
               toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "This does not appear to be a receipt.",
              });
              setReceiptInfo(null);
            }
          })
          .catch(err => {
            console.error(err);
            setError("Could not analyze receipt. Please try again.");
             toast({
                variant: "destructive",
                title: "Analysis Error",
                description: "Could not analyze the receipt. Please try again.",
              });
          })
          .finally(() => {
            setIsProcessing(false);
          });
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleRetake = () => {
    resetState();
    triggerFileSelect();
  };

  const handleRemove = () => {
    resetState();
  };
  
  const handleSelectItem = (itemToSelect: LineItemWithId) => {
    setMyItems(prev => [...prev, itemToSelect].sort((a,b) => a.id - b.id));
    setUnselectedItems(prev => prev.filter(item => item.id !== itemToSelect.id));
  };

  const handleDeselectItem = (itemToDeselect: LineItemWithId) => {
    setUnselectedItems(prev => [...prev, itemToDeselect].sort((a,b) => a.id - b.id));
    setMyItems(prev => prev.filter(item => item.id !== itemToDeselect.id));
  };
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toFixed(2)}`;
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg">
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
                <List className="text-primary" />
                Receipt Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-8 w-1/2" />
                  </div>
                   <Separator />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-5/6" />
                  </div>
                </div>
              ) : receiptInfo?.isReceipt ? (
                <>
                  {(unselectedItems.length > 0) ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Qty.</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unselectedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Checkbox 
                                  id={`item-${item.id}`}
                                  onCheckedChange={() => handleSelectItem(item)}
                                  checked={false}
                                />
                              </TableCell>
                              <TableCell>{item.quantity || '-'}</TableCell>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : myItems.length === 0 ? (
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(receiptInfo.total)}</span>
                      </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      All items have been assigned.
                    </p>
                  )}
                  <Separator className="my-4"/>
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span className="text-primary flex items-center gap-2"><Wallet/>Total</span>
                    <span className="text-primary">{formatCurrency(receiptInfo.total)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  This does not appear to be a receipt, or the details could not be determined.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {myItems.length > 0 && (
           <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="text-accent" />
                My Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Qty.</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myItems.map((item) => (
                      <TableRow key={`selected-${item.id}`}>
                        <TableCell>
                           <Checkbox 
                            id={`my-item-${item.id}`}
                            onCheckedChange={() => handleDeselectItem(item)}
                            checked={true}
                          />
                        </TableCell>
                        <TableCell>{item.quantity || '-'}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-accent flex items-center gap-2"><User/>My Total</span>
                <span className="text-accent">{formatCurrency(personalTotal)}</span>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
