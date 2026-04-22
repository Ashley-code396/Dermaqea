"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSearch, Upload, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export default function ExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedPayload, setExtractedPayload] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setExtractedPayload(null);
      setExtractError(null);
      setVerificationResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setExtractedPayload(null);
      setExtractError(null);
      setVerificationResult(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setLoading(true);
    setExtractedPayload(null);
    setExtractError(null);
    setVerificationResult(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/codes/extract-stego`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
         setExtractedPayload(data.extracted);
      } else {
         setExtractError(data.message || data.error || "Failed to extract");
         if (data.extracted) setExtractedPayload(data.extracted);
      }
    } catch (e: any) {
      setExtractError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!extractedPayload) return;

    setVerifying(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/codes/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: extractedPayload }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (e: any) {
      setVerificationResult({ result: "VERIFICATION_ERROR", error: e.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSearch className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-syne)" }}>Extract & Verify</h1>
      </div>
      <p className="text-muted-foreground">
        Upload a packaging image to extract steganographic codes and cryptographically verify them.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <h3 className="font-semibold">Upload Image</h3>
            </CardHeader>
            <CardContent>
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  preview ? "border-primary/50 bg-primary/5" : "border-border bg-accent/50 hover:bg-accent"
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileChange}
                />
                {preview ? (
                  <div className="flex w-full flex-col items-center space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain shadow-md" />
                    <div className="flex gap-4">
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer text-sm font-medium text-primary hover:underline"
                      >
                        Choose another
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer flex-col items-center space-y-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click or drag image to upload</p>
                    <p className="text-xs text-muted-foreground">Supports JPEG, PNG up to 10MB</p>
                  </label>
                )}
              </div>

              <Button
                className="mt-6 w-full"
                disabled={!file || loading}
                onClick={handleExtract}
                style={file && !loading ? { boxShadow: "0 0 16px #3DDC8440" } : undefined}
              >
                {loading ? "Extracting..." : "Extract Data"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {(extractedPayload || extractError) && (
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <h3 className="font-semibold">Extraction Result</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {extractError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 flex gap-2 items-center">
                    <AlertCircle className="h-5 w-5" />
                    <span>{extractError}</span>
                  </div>
                )}
                
                {extractedPayload && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Payload Data</p>
                      <div className="rounded-md bg-background/50 p-3 font-mono text-xs break-all border border-border/50">
                        {extractedPayload.includes('.') ? extractedPayload.substring(0, extractedPayload.lastIndexOf('.')) : extractedPayload}
                      </div>
                    </div>
                    {extractedPayload.includes('.') && (
                      <div className="space-y-1 mt-4">
                        <p className="text-sm font-medium text-muted-foreground">Signature Data</p>
                        <div className="rounded-md bg-background/50 p-3 font-mono text-xs break-all border border-border/50 text-muted-foreground opacity-90 text-[10px]">
                          {extractedPayload.substring(extractedPayload.lastIndexOf('.') + 1)}
                        </div>
                      </div>
                    )}
                    <Button 
                      className="w-full mt-4" 
                      onClick={handleVerify} 
                      disabled={verifying}
                      variant="outline"
                      style={!verifying ? { borderColor: "#3DDC84", color: "#3DDC84" } : undefined}
                    >
                      {verifying ? "Verifying..." : "Verify Signature"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {verificationResult && (
              <Card className={`border ${verificationResult.isValid || verificationResult.result === "AUTHENTIC_PRODUCT" ? "border-primary bg-primary/5" : "border-warning bg-warning/5"}`}>
                 <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    {verificationResult.isValid || verificationResult.result === "AUTHENTIC_PRODUCT" ? (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-warning" />
                    )}
                    <h3 className="font-semibold border-b-0 pb-0">Verification Result</h3>
                 </CardHeader>
                 <CardContent>
                    <Badge className={verificationResult.isValid || verificationResult.result === "AUTHENTIC_PRODUCT" ? "bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-1 px-3" : "border-warning text-warning text-sm py-1 px-3"} variant={verificationResult.isValid || verificationResult.result === "AUTHENTIC_PRODUCT" ? "default" : "outline"}>
                      {verificationResult.result || "INVALID PAYLOAD"}
                    </Badge>
                 </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
