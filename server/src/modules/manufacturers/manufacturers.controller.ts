import { Body, Controller, Get, Post, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';

@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly svc: ManufacturersService) {}

  @Post()
  async create(@Body() dto: CreateManufacturerDto) {
    const created = await this.svc.create(dto);
    return { data: created };
  }

  @Get()
  async list() {
    const list = await this.svc.findAll();
    return { data: list };
  }

  @Get(':suiWalletAddress')
  async getBySui(@Param('suiWalletAddress') suiWalletAddress: string) {
    const m = await this.svc.findBySuiWalletAddress(suiWalletAddress);
    return { data: m };
  }

  // Upload a verification document for a manufacturer identified by their SUI wallet address.
  // Accepts multipart/form-data with field `file` and optional `docType`.
  @Post(':suiWalletAddress/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads';
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileExt = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('suiWalletAddress') suiWalletAddress: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType?: string,
  ) {
    const created = await this.svc.createDocumentForManufacturerBySui(suiWalletAddress, file, docType ?? 'Unknown');
    return { data: created };
  }
}
