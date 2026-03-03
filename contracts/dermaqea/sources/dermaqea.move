module dermaqea::dermaqea;

use dermaqea::admin::{Self, MinterCap};
use dermaqea::serial_registry::{Self, SerialRegistry};
use sui::package;
use sui::clock::Clock;
use std::string::String;
use dermaqea::product;


public struct DERMAQEA has drop {}

fun init(otw: DERMAQEA, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);
    admin::create_admin_cap(ctx);

    serial_registry::init_serial_registry(ctx);
}


public fun mint_new_product(
        cap: &MinterCap,
        registry: &mut SerialRegistry,
        brand_wallet: address,
        product_name: String,
        serial_number: vector<u8>,
        batch_number: vector<u8>,
        metadata_hash: vector<u8>,
        manufacture_date: u64,
        expiry_date: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        product::mint_product(
            cap,
            registry,
            brand_wallet,
            product_name,
            serial_number,
            batch_number,
            metadata_hash,
            manufacture_date,
            expiry_date,
            clock,
            ctx,
        );
    }

public fun batch_mint_new_products(
    cap: &MinterCap,
    registry: &mut SerialRegistry,
    brand_wallet: address,
    product_name: String,                 
    serial_numbers: vector<vector<u8>>,   
    batch_numbers: vector<vector<u8>>,
    metadata_hashes: vector<vector<u8>>,
    manufacture_dates: vector<u64>,
    expiry_dates: vector<u64>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let len = vector::length(&serial_numbers);
    // assert all other vectors have same len ...

    let mut i = 0;
    while (i < len) {
       
        product::mint_product(
            cap,
            registry,
            brand_wallet,
            product_name,      // reused for every item
            serial_numbers[i],
            batch_numbers[i],
            metadata_hashes[i],
            manufacture_dates[i],
            expiry_dates[i],
            clock,
            ctx,
        );

        i = i + 1;
    };
}


