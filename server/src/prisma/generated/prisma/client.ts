


import * as process from 'node:process'
import * as path from 'node:path'

import * as runtime from "@prisma/client/runtime/client"
import * as $Enums from "./enums.js"
import * as $Class from "./internal/class.js"
import * as Prisma from "./internal/prismaNamespace.js"

export * as $Enums from './enums.js'
export * from "./enums.js"
/**
 * ## Prisma Client
 * 
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Manufacturers
 * const manufacturers = await prisma.manufacturer.findMany()
 * ```
 * 
 * Read more in our [docs](https://pris.ly/d/client).
 */
export const PrismaClient = $Class.getPrismaClientClass()
export type PrismaClient<LogOpts extends Prisma.LogLevel = never, OmitOpts extends Prisma.PrismaClientOptions["omit"] = Prisma.PrismaClientOptions["omit"], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = $Class.PrismaClient<LogOpts, OmitOpts, ExtArgs>
export { Prisma }

/**
 * Model Manufacturer
 * 
 */
export type Manufacturer = Prisma.ManufacturerModel
/**
 * Model Product
 * 
 */
export type Product = Prisma.ProductModel
/**
 * Model Batch
 * 
 */
export type Batch = Prisma.BatchModel
/**
 * Model ProductTwin
 * 
 */
export type ProductTwin = Prisma.ProductTwinModel
/**
 * Model SerialRegistry
 * 
 */
export type SerialRegistry = Prisma.SerialRegistryModel
/**
 * Model QrCode
 * 
 */
export type QrCode = Prisma.QrCodeModel
/**
 * Model ScanLog
 * 
 */
export type ScanLog = Prisma.ScanLogModel
/**
 * Model SecurityAlert
 * 
 */
export type SecurityAlert = Prisma.SecurityAlertModel
/**
 * Model Admin
 * 
 */
export type Admin = Prisma.AdminModel
