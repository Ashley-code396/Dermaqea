module dermaqea::admin;

public struct AdminCap has key{
    id: UID,

}

public(package) fun create_admin_cap(ctx: &mut TxContext){
    let admin_cap = AdminCap { id: object::new(ctx) };

     transfer::transfer(admin_cap, ctx.sender());
    
}