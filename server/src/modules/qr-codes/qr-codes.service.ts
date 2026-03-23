import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return QR payloads for the serials in a batch.
   * Payload shape: { sui_object_id, serial_number, batch_number, payload_hash }
   */
  async getQrPayloadsForBatch(batchId: string) {
    const b = await this.prisma.batch.findUnique({ where: { id: batchId }, include: { product: true, serials: true } });
    if (!b) throw new NotFoundException(`Batch ${batchId} not found`);

    const objectId = (b.product as any)?.objectId ?? null;
    const batchNumber = b.batchNumber;

    const payloads = [] as Array<Record<string, any>>;

    for (const s of (b.serials ?? [])) {
      const serialId = (s as any).id;
      const serialNumber = s.serialNumber;

      // Build canonical payload string. Use empty string for missing objectId.
      const payloadStr = `${objectId ?? ''}|${serialNumber}|${batchNumber}`;

      // Compute SHA-256 hash to use as a compact unique payload identifier.
      const hash = createHash('sha256').update(payloadStr).digest('hex');

      // If the DB doesn't already have a payloadHash for this serial, persist it.
      if (!((s as any).payloadHash)) {
        try {
          await this.prisma.serialRegistry.update({ where: { id: serialId }, data: { payloadHash: hash } });
        } catch (e) {
          // Non-fatal: if update fails, continue and return the computed hash.
        }
      }

      payloads.push({
        sui_object_id: objectId,
        serial_number: serialNumber,
        batch_number: batchNumber,
        payload: payloadStr,
        payload_hash: (s as any).payloadHash ?? hash,
      });
    }

    return payloads;
  }
}
