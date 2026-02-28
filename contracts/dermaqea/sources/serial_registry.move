module dermaqea::serial_registry;
use sui::table::{Self,Table};


public struct SerialRegistry has key{
    id: UID,
    serials: Table<vector<u8>, address>,
}

public fun init_serial_registry(ctx: &mut TxContext){
    let serial_registry = SerialRegistry { 
        id: object::new(ctx), 
        serials: table::new(ctx)
        };

        transfer::share_object(serial_registry);
}