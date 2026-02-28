module dermaqea::admin;

public struct AdminCap has key{
    id: UID,

}
public struct MinterCap has key, store {
    id: UID,
}

public(package) fun create_admin_cap(ctx: &mut TxContext){
    let admin_cap = AdminCap { id: object::new(ctx) };

     transfer::transfer(admin_cap, ctx.sender());
    
}

public fun issue_minter_cap(
    _: &AdminCap,
    recipient: address,
    ctx: &mut TxContext,
) {
    let cap = MinterCap { id: object::new(ctx) };
    transfer::transfer(cap, recipient);
}

public fun revoke_minter_cap(_: &AdminCap, cap: MinterCap) {
    let MinterCap { id } = cap;
    object::delete(id);
}
