module dermaqea::product;

use sui::event;
use sui::table::{Self, Table};
use sui::clock::{Self, Clock};
use dermaqea::serial_registry::{Self,SerialRegistry};
use std::string::String;
use dermaqea::admin::MinterCap;




const ENotAuthorized: u64 = 0;
const EDuplicateSerialNumber: u64 = 1;
const EProductExpired: u64 = 2;
const EProductFlagged: u64 = 3;
const EProductCounterfeit: u64 = 4;
const EInvalidStatus: u64 = 5;



const STATUS_ACTIVE: u8 = 0;
const STATUS_SOLD: u8 = 1;
const STATUS_FLAGGED: u8 = 2;
const STATUS_COUNTERFEIT: u8 = 3;


// One physical skincare product unit ↔ one on-chain digital twin.
public struct ProductTwin has key, store {
    id: UID,
    brand_wallet: address,
    product_name: String,
    serial_number: vector<u8>,
    batch_number: vector<u8>,
    manufacture_date: u64,
    expiry_date: u64,
    metadata_hash: vector<u8>,
    verification_count: u64,
    status: u8,
    current_owner: address,
}


public struct ProductMinted has copy, drop {
    product_id: address,
    brand_wallet: address,
    serial_number: vector<u8>,
    batch_number: vector<u8>,
    expiry_date: u64,
    minted_at: u64,
}

public struct ProductVerified has copy, drop {
    product_id: address,
    verifier: address,
    verification_count: u64,
    status: u8,
    verified_at: u64,
}

public struct CounterfeitAttempted has copy, drop {
    /// The address that was scanned but produced no valid object.
    /// Because the object won't exist, callers must pass the attempted ID.
    attempted_id: address,
    scanner: address,
    attempted_at: u64,
}

public struct ProductStatusUpdated has copy, drop {
    product_id: address,
    old_status: u8,
    new_status: u8,
    updated_by: address,
    updated_at: u64,
}

public struct OwnershipTransferred has copy, drop {
    product_id: address,
    from: address,
    to: address,
    transferred_at: u64,
}
#[allow(lint(self_transfer))]
public(package) fun mint_product(
    _cap: &MinterCap,
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
    let now = clock::timestamp_ms(clock);

    
    assert!(expiry_date > now, EProductExpired);

    assert!(
        !serial_registry::has_serial(registry, &serial_number),
        EDuplicateSerialNumber,
    );
    let twin = ProductTwin {
        id: object::new(ctx),
        brand_wallet,
        product_name,
        serial_number,
        batch_number,
        metadata_hash,
        manufacture_date,
        expiry_date,
        verification_count: 0,
        status: STATUS_ACTIVE,
        current_owner: ctx.sender(),
    };
   

    let product_id = object::uid_to_address(&twin.id);

    
    serial_registry::add_serial(registry, twin.serial_number, product_id);

    event::emit(ProductMinted {
        product_id,
        brand_wallet,
        serial_number: twin.serial_number,
        batch_number: twin.batch_number,
        expiry_date,
        minted_at: now,
    });

    transfer::transfer(twin, ctx.sender());
}


public fun verify_product(
    twin: &mut ProductTwin,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock::timestamp_ms(clock);

    // Reject flagged / counterfeit products.
    assert!(twin.status != STATUS_FLAGGED, EProductFlagged);
    assert!(twin.status != STATUS_COUNTERFEIT, EProductCounterfeit);

    // Enforce expiry.
    assert!(twin.expiry_date > now, EProductExpired);

    twin.verification_count = twin.verification_count + 1;

    event::emit(ProductVerified {
        product_id: object::uid_to_address(&twin.id),
        verifier: ctx.sender(),
        verification_count: twin.verification_count,
        status: twin.status,
        verified_at: now,
    });
}

/// Emitted by the frontend/backend when a scanned object ID does not exist
/// (object not found on RPC). The backend calls this entry to record the
/// attempt on-chain for audit purposes.
entry fun report_counterfeit_attempt(
    attempted_id: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    event::emit(CounterfeitAttempted {
        attempted_id,
        scanner: ctx.sender(),
        attempted_at: clock::timestamp_ms(clock),
    });
}

// ─── Status Management (Minter / Admin operations) ───────────────────────────

/// Flag or mark a product as counterfeit. Requires MinterCap.
public fun update_status(
    _cap: &MinterCap,
    twin: &mut ProductTwin,
    new_status: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(new_status <= STATUS_COUNTERFEIT, EInvalidStatus);
    let old_status = twin.status;
    twin.status = new_status;

    event::emit(ProductStatusUpdated {
        product_id: object::uid_to_address(&twin.id),
        old_status,
        new_status,
        updated_by: ctx.sender(),
        updated_at: clock::timestamp_ms(clock),
    });
}


/// Transfer product ownership (e.g. retail sale: brand → consumer).
/// Only the current owner can initiate transfer.
public fun transfer_ownership(
    twin: &mut ProductTwin,
    new_owner: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == twin.current_owner, ENotAuthorized);

    let old_owner = twin.current_owner;
    twin.current_owner = new_owner;

    // Mark as sold on first transfer away from brand wallet.
    if (twin.status == STATUS_ACTIVE) {
        twin.status = STATUS_SOLD;
    };

    event::emit(OwnershipTransferred {
        product_id: object::uid_to_address(&twin.id),
        from: old_owner,
        to: new_owner,
        transferred_at: clock::timestamp_ms(clock),
    });
}

// ─── Read-Only Accessors (for PTBs / off-chain indexers) ─────────────────────

public fun product_id(twin: &ProductTwin): address {
    object::uid_to_address(&twin.id)
}
public fun brand_wallet(twin: &ProductTwin): address { twin.brand_wallet }
public fun product_name(twin: &ProductTwin): &String { &twin.product_name }
public fun serial_number(twin: &ProductTwin): &vector<u8> { &twin.serial_number }
public fun batch_number(twin: &ProductTwin): &vector<u8> { &twin.batch_number }
public fun manufacture_date(twin: &ProductTwin): u64 { twin.manufacture_date }
public fun expiry_date(twin: &ProductTwin): u64 { twin.expiry_date }
public fun metadata_hash(twin: &ProductTwin): &vector<u8> { &twin.metadata_hash }
public fun verification_count(twin: &ProductTwin): u64 { twin.verification_count }
public fun status(twin: &ProductTwin): u8 { twin.status }
public fun current_owner(twin: &ProductTwin): address { twin.current_owner }



