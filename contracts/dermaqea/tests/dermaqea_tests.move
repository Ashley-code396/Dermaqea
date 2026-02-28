
#[test_only]
module dermaqea::dermaqea_tests;
#[test_only]
use sui::test_scenario::{Self as ts};
#[test_only]
use sui::clock as sui_clock;

#[test]
fun mint_and_verify() {
    let admin    = @0xAD;
    let brand    = @0xBB;
    let consumer = @0xCC;

    let mut scenario = ts::begin(admin);
    { ts::next_tx(&mut scenario, admin); init(ts::ctx(&mut scenario)); };

    // ── mint ──
    {
        ts::next_tx(&mut scenario, admin);
        let cap          = ts::take_from_sender<MinterCap>(&scenario);
        let mut registry = ts::take_shared<SerialRegistry>(&scenario);
        let clock        = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        mint_product(
            &cap, &mut registry,
            brand,
            b"HydraGlow Serum",
            b"SN-001",
            b"BATCH-2025-A",
            1_000_000,
            9_999_999_999_999,
            b"abc123hash",
            consumer,
            &clock,
            ts::ctx(&mut scenario),
        );

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    // ── verify ──
    {
        ts::next_tx(&mut scenario, consumer);
        let mut twin = ts::take_from_sender<ProductTwin>(&scenario);
        let clock    = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        verify_product(&mut twin, &clock, ts::ctx(&mut scenario));

        assert_eq!(twin.verification_count, 1);
        assert_eq!(twin.status, ProductStatus::Active);

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, twin);
    };

    ts::end(scenario);
}

#[test]
fun transfer_sets_sold_status() {
    let admin    = @0xAD;
    let brand    = @0xBB;
    let consumer = @0xCC;

    let mut scenario = ts::begin(admin);
    { ts::next_tx(&mut scenario, admin); init(ts::ctx(&mut scenario)); };

    {
        ts::next_tx(&mut scenario, admin);
        let cap          = ts::take_from_sender<MinterCap>(&scenario);
        let mut registry = ts::take_shared<SerialRegistry>(&scenario);
        let clock        = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        mint_product(
            &cap, &mut registry, brand,
            b"Glow Toner", b"SN-T01", b"BATCH-B",
            500, 9_999_999_999_999, b"hashT", brand,
            &clock, ts::ctx(&mut scenario),
        );

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    {
        ts::next_tx(&mut scenario, brand);
        let mut twin = ts::take_from_sender<ProductTwin>(&scenario);
        let clock    = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        transfer_ownership(&mut twin, consumer, &clock, ts::ctx(&mut scenario));

        assert_eq!(twin.status, ProductStatus::Sold);
        assert_eq!(twin.current_owner, consumer);

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, twin);
    };

    ts::end(scenario);
}

#[test]
fun minter_can_flag_product() {
    let admin    = @0xAD;
    let consumer = @0xCC;

    let mut scenario = ts::begin(admin);
    { ts::next_tx(&mut scenario, admin); init(ts::ctx(&mut scenario)); };

    {
        ts::next_tx(&mut scenario, admin);
        let cap          = ts::take_from_sender<MinterCap>(&scenario);
        let mut registry = ts::take_shared<SerialRegistry>(&scenario);
        let clock        = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        mint_product(
            &cap, &mut registry, admin,
            b"Night Cream", b"SN-NC01", b"BATCH-C",
            100, 9_999_999_999_999, b"hashNC", consumer,
            &clock, ts::ctx(&mut scenario),
        );

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    {
        ts::next_tx(&mut scenario, consumer);
        let mut twin = ts::take_from_sender<ProductTwin>(&scenario);
        let cap      = ts::take_from_address<MinterCap>(&scenario, admin);
        let clock    = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        update_status(&cap, &mut twin, ProductStatus::Flagged, &clock, ts::ctx(&mut scenario));

        assert_eq!(twin.status, ProductStatus::Flagged);

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, twin);
        ts::return_to_address(admin, cap);
    };

    ts::end(scenario);
}

#[test]
fun duplicate_serial_rejected() {
    let admin = @0xAD;
    let brand = @0xBB;

    let mut scenario = ts::begin(admin);
    { ts::next_tx(&mut scenario, admin); init(ts::ctx(&mut scenario)); };

    {
        ts::next_tx(&mut scenario, admin);
        let cap          = ts::take_from_sender<MinterCap>(&scenario);
        let mut registry = ts::take_shared<SerialRegistry>(&scenario);
        let clock        = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        mint_product(
            &cap, &mut registry, brand,
            b"Product A", b"SN-DUP", b"BATCH-1",
            1_000, 9_999_999_999_999, b"hash1", brand,
            &clock, ts::ctx(&mut scenario),
        );

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    // Second mint with same serial — must abort with EDuplicateSerialNumber.
    {
        ts::next_tx(&mut scenario, admin);
        let cap          = ts::take_from_sender<MinterCap>(&scenario);
        let mut registry = ts::take_shared<SerialRegistry>(&scenario);
        let clock        = sui_clock::create_for_testing(ts::ctx(&mut scenario));

        let did_not_abort = std::macros::try_abort!(
            mint_product(
                &cap, &mut registry, brand,
                b"Product B", b"SN-DUP", b"BATCH-2",
                1_000, 9_999_999_999_999, b"hash2", brand,
                &clock, ts::ctx(&mut scenario),
            )
        );
        assert_eq!(did_not_abort, false);

        sui_clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}
