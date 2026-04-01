import type { ActivityItem, Product, Batch, Manufacturer, ScanAlert, QRCode } from "@/types";

export const MOCK_MANUFACTURER: Manufacturer = {
  id: "mfr-1",
  // no hardcoded wallet address here — the app should use the connected wallet when available
  sui_address: "",
  brand_name: "Dermaqea Labs",
  logo_url: "",
  country: "Kenya",
  business_reg_number: "PVT-2024-001234",
  website: "https://dermaqea.com",
  verified: true,
  created_at: "2025-01-15T00:00:00Z",
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    manufacturer_id: "mfr-1",
    sui_object_id: "0xabc123",
    name: "Vitamin C Serum",
    sku: "VC-SERUM-001",
    category: "Serum",
    description: "Potent vitamin C serum for brightening",
    ingredients: [
      { inci_name: "Aqua", concentration: 70, function: "Solvent" },
      { inci_name: "Ascorbic Acid", concentration: 15, function: "Active" },
    ],
    certifications: [],
    images: [],
    status: "approved",
    created_at: "2025-01-20T00:00:00Z",
  },
  {
    id: "prod-2",
    manufacturer_id: "mfr-1",
    name: "Hyaluronic Moisturizer",
    sku: "HA-MOIST-002",
    category: "Moisturizer",
    description: "Deep hydration moisturizer",
    ingredients: [],
    certifications: [],
    images: [],
    status: "pending",
    created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "prod-3",
    manufacturer_id: "mfr-1",
    sui_object_id: "0xretinol123",
    name: "Retinol Night Cream",
    sku: "RET-NIGHT-003",
    category: "Moisturizer",
    description: "Anti-aging retinol cream",
    ingredients: [],
    certifications: [],
    images: [],
    status: "approved",
    created_at: "2024-12-15T00:00:00Z",
  },
];

export const MOCK_BATCHES: Batch[] = [
  {
    id: "batch-1",
    product_id: "prod-1",
    product: MOCK_PRODUCTS[0],
    sui_object_id: "0xbatch447",
    batch_number: "447",
    manufacture_date: "2025-01-10",
    expiry_date: "2026-01-10",
    unit_count: 10000,
    facility: "Nairobi Plant A",
    stolen: false,
    status: "active",
    created_at: "2025-01-10T00:00:00Z",
  },
  {
    id: "batch-2",
    product_id: "prod-1",
    product: MOCK_PRODUCTS[0],
    batch_number: "448",
    manufacture_date: "2025-02-01",
    expiry_date: "2026-02-01",
    unit_count: 5000,
    facility: "Nairobi Plant A",
    stolen: false,
    status: "active",
    created_at: "2025-02-01T00:00:00Z",
  },
];

export const MOCK_QR_CODES: QRCode[] = [
  {
    id: "qr-1",
    batch_id: "batch-1",
    sui_object_id: "0xqr001",
    serial_number: "DQ-447-00001",
    unique_hash: "a1b2c3d4e5",
    status: "scanned",
    scan_count: 3,
    flagged: false,
    first_scan_at: "2025-02-10T12:00:00Z",
    first_scan_location: "Nairobi",
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "qr-2",
    batch_id: "batch-1",
    sui_object_id: "0xqr002",
    serial_number: "DQ-447-00002",
    unique_hash: "f6g7h8i9j0",
    status: "applied",
    scan_count: 0,
    flagged: false,
    applied_at: "2025-01-20T08:00:00Z",
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "qr-3",
    batch_id: "batch-1",
    sui_object_id: "0xqr003",
    serial_number: "DQ-447-00291",
    unique_hash: "k1l2m3n4o5",
    status: "flagged",
    scan_count: 127,
    flagged: true,
    first_scan_at: "2025-01-15T09:00:00Z",
    first_scan_location: "Nairobi",
    created_at: "2025-01-15T00:00:00Z",
  },
];

export const MOCK_VERIFICATION_TIMELINE = [
  { step: "Account Created", done: true, date: "Jan 15, 2025" },
  { step: "Documents Submitted", done: true, date: "Jan 16, 2025" },
  { step: "Dermaqea Review", done: false, inProgress: true, note: "Estimated 2-3 business days" },
  { step: "Verified Manufacturer", done: false },
  { step: "First Product Submission", done: false },
];

export const MOCK_VERIFICATION_DOCS = [
  { type: "Business Registration Certificate", filename: "business_reg.pdf", status: "Verified" as const, uploaded: "Jan 16, 2025", ipfs_hash: "QmX1y2z3..." },
  { type: "FDA Registration", filename: "fda_reg.pdf", status: "Verified" as const, uploaded: "Jan 16, 2025", ipfs_hash: "QmA4b5c6..." },
  { type: "ISO 22716 (GMP)", filename: "iso_gmp.pdf", status: "Pending" as const, uploaded: "Jan 18, 2025", ipfs_hash: "QmD7e8f9..." },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    type: "batch_qr",
    title: "Batch #447 QR codes generated",
    description: "10,000 units",
    timestamp: "2025-02-18T10:30:00Z",
    // removed demo link to avoid prefetching deleted routes in production
    // link: "/batches/batch-1",
    severity: "success",
  },
  {
    id: "2",
    type: "product_approved",
    title: "Product 'Vitamin C Serum' approved by Dermaqea",
    timestamp: "2025-02-15T14:00:00Z",
    // removed demo link to avoid prefetching deleted routes in production
    // link: "/products/prod-1",
    severity: "success",
  },
  {
    id: "3",
    type: "alert",
    title: "QR code DQ-447-00291 scanned 50+ times",
    description: "Possible counterfeit activity",
    timestamp: "2025-02-18T09:15:00Z",
    link: "/analytics",
    severity: "warning",
  },
];

export const MOCK_ALERTS: ScanAlert[] = [
  {
    id: "1",
    serial_number: "DQ-447-00291",
    product_name: "Vitamin C Serum",
    batch_number: "447",
    scan_count: 127,
    cities_count: 8,
    days: 3,
    first_scan: { location: "Nairobi", date: "Jan 15, 2025" },
    latest_scan: { location: "Kampala", date: "Jan 18, 2025" },
    reason: "Scanned 100+ times across multiple cities",
  },
  {
    id: "2",
    serial_number: "DQ-223-00847",
    product_name: "Retinol Night Cream",
    batch_number: "223",
    scan_count: 2,
    cities_count: 2,
    days: 0,
    first_scan: { location: "Nairobi", date: "Jan 18, 2025 10:00" },
    latest_scan: { location: "Lagos", date: "Jan 18, 2025 12:00" },
    reason: "Impossible travel detected - same code scanned 2 hours apart in cities 500km+ apart",
  },
];

export const MOCK_SCAN_DATA = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split("T")[0],
    scans: Math.floor(Math.random() * 200) + 50,
    flagged: Math.floor(Math.random() * 10),
  };
});
