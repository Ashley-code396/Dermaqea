module dermaqea::serial_registry;

use sui::table::{Self, Table};

public struct SerialRegistry has key {
    id: UID,
    serials: Table<vector<u8>, address>,
}

public fun init_serial_registry(ctx: &mut TxContext) {
    let serial_registry = SerialRegistry {
        id: object::new(ctx),
        serials: table::new(ctx),
    };

    transfer::share_object(serial_registry);
}

public fun has_serial(registry: &SerialRegistry, serial: &vector<u8>): bool {
    table::contains(&registry.serials, *serial)
}

public fun add_serial(registry: &mut SerialRegistry, serial: vector<u8>, owner: address) {
    table::add(&mut registry.serials, serial, owner);
}
