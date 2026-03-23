module dermaqea::serial_registry;

use sui::table::{Self, Table};

// Now store serials per-brand: mapping brand_address -> (serial_number -> product_id)
public struct SerialRegistry has key {
    id: UID,
    serials: Table<address, Table<vector<u8>, address>>,
}

public fun init_serial_registry(ctx: &mut TxContext) {
    let serial_registry = SerialRegistry {
        id: object::new(ctx),
        serials: table::new(ctx),
    };

    transfer::share_object(serial_registry);
}

// Check whether the given brand_wallet has already registered the serial number.
public fun has_serial(registry: &SerialRegistry, brand: address, serial: &vector<u8>): bool {
    if (!table::contains(&registry.serials, brand)) {
        return false
    };
    let inner = table::borrow(&registry.serials, brand);
    table::contains(inner, *serial)
}

// Add a serial for a specific brand. Requires TxContext to create an inner table on demand.
public fun add_serial(registry: &mut SerialRegistry, brand: address, serial: vector<u8>, owner: address, ctx: &mut TxContext) {
    // Ensure the brand entry exists
    if (!table::contains(&registry.serials, brand)) {
        let inner = table::new(ctx);
        table::add(&mut registry.serials, brand, inner);
    };

    let inner_mut = table::borrow_mut(&mut registry.serials, brand);
    table::add(inner_mut, serial, owner);
}
