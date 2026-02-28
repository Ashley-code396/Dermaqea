"use client";

import React, { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

type Item = {
  manufacture_date: string; // ISO date or timestamp string
  expiry_date: string; // ISO date or timestamp string
};

type FormValues = {
  brand_wallet?: string;
  product_name: string;
  items: Item[];
};

export default function NewProductPage() {
  const MOCK_CONNECTED_ADDRESS = "0x111122223333444455556666777788889999AAAa";

  const form = useForm<FormValues>({
    defaultValues: { product_name: "", items: [{ manufacture_date: "", expiry_date: "" }] },
  });

  const { control, handleSubmit, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const [prepared, setPrepared] = useState<any>(null);
  const [attachedFileInfo, setAttachedFileInfo] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const onSubmit = (values: FormValues) => {
    // prepare arrays for Move call
    const manufacture_dates = values.items.map((i) => {
      // try parse as ISO date -> epoch seconds
      const d = Date.parse(i.manufacture_date);
      return Number.isNaN(d) ? 0 : Math.floor(d / 1000);
    });
    const expiry_dates = values.items.map((i) => {
      const d = Date.parse(i.expiry_date);
      return Number.isNaN(d) ? 0 : Math.floor(d / 1000);
    });

    const payload = {
      // NOTE: `cap`, `registry`, and `clock` are resources/objects and must be provided when constructing
      // the actual transaction. This UI prepares the pure arguments (brand, product_name and vectors).
      brand_wallet: MOCK_CONNECTED_ADDRESS,
      product_name: values.product_name,
      manufacture_dates,
      expiry_dates,
      // The CSV/XLSX file will be parsed on the backend for serial_number and batch_number.
      attached_file_name: attachedFile?.name ?? null,
    };

    setPrepared(payload);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    setAttachedFile(file);
    setAttachedFileInfo(`${file.name} (${Math.round(file.size / 1024)} KB)`);
  };

  // Generate and download a small CSV template matching the Move function requirements
  const generateAndDownloadTemplate = () => {
    const headers = ["serial_number", "batch_number", "metadata_hash", "manufacture_date", "expiry_date"];
    const exampleRows = [
      ["SN0001", "BATCH-A", "QmExampleHash1", "2026-01-01", "2027-01-01"],
      ["SN0002", "BATCH-A", "QmExampleHash2", "2026-02-01", "2027-02-01"],
    ];

    const csv = [headers.join(",")].concat(exampleRows.map((r) => r.join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dermaqea-products-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 ml-4 md:ml-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Submit New Product (batch)</h2>
        <Button variant="outline" asChild>
          <Link href="/products">Back</Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Brand wallet (connected)</FormLabel>
                <FormControl>
                  <Input
                    value={MOCK_CONNECTED_ADDRESS}
                    readOnly
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  />
                </FormControl>
                <FormDescription>The currently connected wallet address will be used as the brand owner on-chain.</FormDescription>
              </FormItem>

              <FormItem>
                <FormLabel>Product name</FormLabel>
                <FormControl>
                  <Input
                    {...register("product_name", { required: true })}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  />
                </FormControl>
                <FormDescription>The product name (reused for every item in the batch).</FormDescription>
              </FormItem>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-2 rounded-md border border-slate-100/60 bg-slate-50/40 p-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <p className="font-medium">CSV requirements</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The CSV/XLSX must include the following columns (headers):
                          </p>
                          <ul className="mt-2 ml-4 list-disc text-xs text-muted-foreground">
                            <li><strong>serial_number</strong> — the unique item serial (required)</li>
                            <li><strong>batch_number</strong> — the batch id (required)</li>
                            <li><strong>metadata_hash</strong> — IPFS/content hash (optional)</li>
                            <li><strong>manufacture_date</strong> — YYYY-MM-DD (required)</li>
                            <li><strong>expiry_date</strong> — YYYY-MM-DD (required)</li>
                          </ul>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={generateAndDownloadTemplate}>Download CSV template</Button>
                          <Button size="sm" variant="ghost" onClick={() => alert('Example: serial_number,batch_number,metadata_hash,manufacture_date,expiry_date\nSN0001,BATCH-A,QmExample,2026-01-01,2027-01-01')}>
                            View example
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-sm">Upload serials (CSV, XLSX, PDF)</label>
                      <input
                        type="file"
                        accept=".csv,.xls,.xlsx,.pdf"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                        className="mt-1 block w-full rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                      />
                      {attachedFileInfo && <p className="text-xs text-muted-foreground mt-1">{attachedFileInfo}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Batch items</h3>
                  <Button size="sm" type="button" onClick={() => append({ manufacture_date: "", expiry_date: "" })}>
                    Add Item
                  </Button>
                </div>
                {fields.map((field, idx) => (
                  <Card key={field.id} className="p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <label className="block text-sm">Manufacture date</label>
                        <Input type="date" {...register(`items.${idx}.manufacture_date` as const)} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700" />
                      </div>
                      <div>
                        <label className="block text-sm">Expiry date</label>
                        <Input type="date" {...register(`items.${idx}.expiry_date` as const)} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700" />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit">Prepare Payload</Button>
                <Button variant="outline" type="button" onClick={() => {
                  form.reset();
                  setPrepared(null);
                }}>
                  Reset
                </Button>
              </div>
            </form>
          </Form>

          {prepared && (
            <div className="mt-6">
              <h4 className="font-medium">Prepared payload</h4>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-sm">{JSON.stringify(prepared, null, 2)}</pre>
              <p className="text-sm text-muted-foreground mt-2">
                NOTE: To actually submit this to the chain you must supply the MinterCap and SerialRegistry objects
                (resources) and construct a TransactionBlock that calls the Move function
                <code>dermaqea::dermaqea::batch_mint_new_products</code>. Use the wallet sign-and-execute hooks from
                <code>@mysten/dapp-kit</code>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
