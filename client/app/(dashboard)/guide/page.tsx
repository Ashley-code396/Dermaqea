"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, ShieldCheck, Printer, Users, CheckCircle2 } from "lucide-react";

export default function GuidePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-semibold mb-2">The Consumer Experience</h2>
        <p className="text-muted-foreground max-w-3xl">
          Learn how Dermaqea&#39;s invisible steganographic signatures translate seamlessly to an intuitive and engaging verification experience for your retail consumers.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Printer className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>1. Print the Stego-Files</CardTitle>
            <CardDescription>Zero packaging redesigns required.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you generate packaging units in the dashboard, the system embeds an invisible cryptographic signature directly into your uploaded artwork using Discrete Cosine Transformation (DCT). You download the ZIP file and simply print the resulting images onto your packaging boxes natively. Your designers never need to make space for QR codes or NFC chips.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-blue-500" />
            </div>
            <CardTitle>2. The Consumer Scans</CardTitle>
            <CardDescription>A frictionless user interaction.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instead of manually verifying complex codes, your customer downloads the Dermaqea mobile app and simply points their smartphone camera at any side of your printed product box. The app&#39;s computer vision algorithms automatically detect the invisible steganographic patterns embedded within the physical packaging structure.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle>3. Cryptographic Authenticity</CardTitle>
            <CardDescription>Trustless off-chain verification.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                As soon as the mobile app extracts the payload from the image, it performs an instant verification against your Enoki wallet signature. 
                Because the signature is mathematically tied to your registered brand profile, the mobile app instantly confirms the item is 100% authentic without requiring a constant blockchain connection.
              </p>
              
              <ul className="space-y-3 mt-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Counterfeiters cannot forge your cryptographic signature.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Photocopying structural noise degrades the payload, invalidating fakes natively.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">No aesthetic tradeoffs — your brand artwork remains pristine.</span>
                </li>
              </ul>
            </div>
            
            <div className="flex-1 bg-muted rounded-xl p-6 flex flex-col items-center justify-center border text-center">
               <div className="relative">
                 <Smartphone className="w-24 h-24 text-muted-foreground/50 mx-auto" />
                 <ShieldCheck className="w-10 h-10 text-green-500 absolute -bottom-2 -right-2 bg-background rounded-full border-4 border-background" />
               </div>
               <h4 className="font-semibold mt-4">Dermaqea Mobile Companion</h4>
               <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">Allows end-users to scan products instantly via the camera.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="pt-8 border-t">
         <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl p-6">
           <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shadow-sm shrink-0">
             <Users className="w-6 h-6 text-primary" />
           </div>
           <div>
             <h3 className="font-semibold text-lg">Informing your customers</h3>
             <p className="text-sm text-muted-foreground mt-1">
               We recommend displaying a small badge or instruction on the back of your packaging: <i>&#34;Scan front artwork with the Dermaqea app to verify authenticity.&#34;</i>
             </p>
           </div>
         </div>
      </div>
    </div>
  );
}
