// Manufacturer
export type ManufacturerStatus = "PENDING_REVIEW" | "VERIFIED" | "ACTION_REQUIRED";

export interface Manufacturer {
  id: string;
  sui_address: string;
  brand_name: string;
  logo_url: string;
  country: string;
  business_reg_number: string;
  website: string;
  verified: boolean;
  created_at: string;
}

// Product
export type ProductStatus = "pending" | "approved" | "rejected";

export interface Ingredient {
  inci_name: string;
  concentration?: number;
  function: string;
}

export interface Certification {
  type: string;
  issuer: string;
  cert_number: string;
  issue_date: string;
  expiry_date: string;
  ipfs_hash?: string;
}

export interface Product {
  id: string;
  manufacturer_id: string;
  sui_object_id?: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  ingredients: Ingredient[];
  certifications: Certification[];
  images: string[];
  status: ProductStatus;
  rejection_reason?: string;
  created_at: string;
}

// Batch
export type BatchStatus = "active" | "recalled" | "stolen" | "expired";

export interface Batch {
  id: string;
  product_id: string;
  product?: Product;
  sui_object_id?: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date: string;
  unit_count: number;
  facility: string;
  coa_ipfs_hash?: string;
  stolen: boolean;
  status: BatchStatus;
  created_at: string;
}

// QR Code
export type QRCodeStatus = "generated" | "applied" | "scanned" | "flagged";

export interface QRCode {
  id: string;
  batch_id: string;
  sui_object_id: string;
  serial_number: string;
  unique_hash: string;
  status: QRCodeStatus;
  applied_at?: string;
  first_scan_at?: string;
  first_scan_location?: string;
  scan_count: number;
  flagged: boolean;
  created_at: string;
}

// Activity
export interface ActivityItem {
  id: string;
  type: "batch_qr" | "product_approved" | "product_rejected" | "alert" | "scan";
  title: string;
  description?: string;
  timestamp: string;
  link?: string;
  severity?: "info" | "warning" | "success" | "error";
}

// Analytics
export interface ScanAlert {
  id: string;
  serial_number: string;
  product_name: string;
  batch_number: string;
  scan_count: number;
  cities_count: number;
  days: number;
  first_scan: { location: string; date: string };
  latest_scan: { location: string; date: string };
  reason: string;
}
