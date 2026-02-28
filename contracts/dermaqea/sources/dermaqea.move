module dermaqea::dermaqea;

use dermaqea::admin;
use dermaqea::serial_registry;
use sui::package;

public struct DERMAQEA has drop {}

fun init(otw: DERMAQEA, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);
    admin::create_admin_cap(ctx);

    serial_registry::init_serial_registry(ctx);
}
