export class CreateBatchDto {
  productId!: string;
  batchNumber!: string;
  manufacturedAt?: string;
  expiresAt?: string;
}
