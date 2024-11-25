const getBlockNumber = require('./get_block');


async function getNewSwapObject(old) {

    let newSwaps = {
        created_at: old.created_at || null, // ensure null for empty or invalid dates
        updated_at: old.updated_at || null,
        deleted_at: old.deleted_at || null,
        swap_id: old.id || null, // ensure null if id is not available
        chain: old.chain || "", // empty string for chain if undefined
        asset: old.asset || "", // empty string for asset if undefined
        initiator: old.initiator_address || "", // empty string for initiator if undefined
        redeemer: old.redeemer_address || "", // empty string for redeemer if undefined
        timelock: old.timelock || 0, // default to 0 if not defined
        amount: old.amount || 0, // default to 0 if not defined
        filled_amount: old.filled_amount || 0, // default to 0 if not defined
        secret_hash: old.secret_hash || "", // empty string if not defined
        secret: old.secret || "", // empty string if not defined
        initiate_tx_hash: old.initiate_tx_hash || "", // empty string if not defined
        redeem_tx_hash: old.redeem_tx_hash || "", // empty string if not defined
        refund_tx_hash: old.refund_tx_hash || "", // empty string if not defined
        initiate_block_number: old.initiate_block_number || 0, // default to 0 if not defined
        required_confirmations: old.minimum_confirmations || 0 // default to 0 if not defined
    };

    // Assign redeem and refund block numbers if the respective transaction hashes are available
    newSwaps.redeem_block_number = newSwaps.redeem_tx_hash ? await getBlockNumber(newSwaps.chain, newSwaps.asset, newSwaps.redeem_tx_hash) : 0;
    newSwaps.refund_block_number = newSwaps.refund_tx_hash ? await getBlockNumber(newSwaps.chain, newSwaps.asset, newSwaps.refund_tx_hash) : 0;

    if (newSwaps.redeem_block_number == "Chain or asset not supported!") newSwaps.redeem_block_number = 0;
    if (newSwaps.refund_block_number == "Chain or asset not supported!") newSwaps.refund_block_number = 0;

    return newSwaps;
}


function getNewOrderObject(old, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price) {

    // console.log("Order Object: ", old);
    let orderpairs = old.order_pair;
    orderpairs = orderpairs.split('-');
    let sourcechain = orderpairs[0].split(':')[0];
    let sourceasset = (orderpairs[0].split(':')[1]) ? orderpairs[0].split(':')[1] : "primary";

    let destinationchain = orderpairs[1].split(':')[0];
    let destinationasset = (orderpairs[1].split(':')[1]) ? orderpairs[1].split(':')[1] : "primary";
    let newOrder = {
        created_at: old.created_at || null, // Handle empty or invalid date values
        updated_at: old.updated_at || null,
        deleted_at: old.deleted_at || null,
        match_attempted_at: null, // Ensure this can be null
        create_id: old.id || "", // Default to empty string if undefined
        block_number: 0, // Default to 0 if not defined
        source_chain: sourcechain || "", // Empty string if undefined
        destination_chain: destinationchain || "", // Empty string if undefined
        source_asset: sourceasset || "", // Empty string if undefined
        destination_asset: destinationasset || "", // Empty string if undefined
        initiator_source_address: initiator_source_address || "",  // Empty string if undefined
        initiator_destination_address: initiator_destination_address || "", // Empty string if undefined
        source_amount: source_amount || 0, // Default to 0 if undefined
        destination_amount: destination_amount || 0, // Default to 0 if undefined
        fee: old.fee || 0, // Default to 0 if undefined
        nonce: old.secret_nonce || 0, // Default to 0 if undefined

        min_destination_confirmations: minimum_confirmations || 0, // Default to 0 if undefined


        timelock: timelock || 0, // Default to 0 if undefined

        secret_hash: old.secret_hash || "", // Empty string if undefined
        additional_data: JSON.stringify({ "input_token_price": input_token_price, "output_token_price": output_token_price }) || "{}" // Empty string if undefined
    };

    // console.log("New Order Object: ", newOrder);

    return newOrder;
}


function getNewMatchedOrder(old, initiator_swap_id, follower_swap_id) {
    let matched_order = {
        created_at: old.created_at || null, // Handle empty or invalid date values
        updated_at: old.updated_at || null,
        deleted_at: old.deleted_at || null,
        create_order_id: old.id || "", // Default to empty string if undefined
        source_swap_id: initiator_swap_id || "", // Default to empty string if undefined
        destination_swap_id: follower_swap_id || "", // Default to empty string if undefined
    }
    // console.log("Matched Order Object: ", matched_order);
    return matched_order;
}


module.exports = { getNewSwapObject, getNewOrderObject, getNewMatchedOrder };