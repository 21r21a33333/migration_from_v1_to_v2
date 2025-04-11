const fs = require('fs');


// TODO - UPDATE THIS WITH THE LATEST CHAIN NAMES
function getLatestChainName(oldChainName) {
    // create a map of chain names to their latest chain names
    const chainMap = {
        "ethereum_arbitrum": "arbitrum",
    };

    if (oldChainName in chainMap) {
        return chainMap[oldChainName];
    }
    return oldChainName; // return the original name if not found in the map
}
function getAmountIfFilled(redeem_tx_hash, amount) {
    (redeem_tx_hash) ? amount : 0; // return 0 if redeem_tx_hash is not available
}

 function getNewSwapObject(old,secret_hash) {

    let newSwaps = {
        created_at: old.created_at || null, // ensure null for empty or invalid dates
        updated_at: old.updated_at || null,
        deleted_at: old.deleted_at || null,
        swap_id: old.on_chain_identifier || "", // ensure null if id is not available
        chain: getLatestChainName(old.chain) || "", // empty string for chain if undefined
        asset: old.asset || "", // empty string for asset if undefined
        initiator: old.initiator_address || "", // empty string for initiator if undefined
        redeemer: old.redeemer_address || "", // empty string for redeemer if undefined
        timelock: old.timelock || 0, // default to 0 if not defined
        amount: old.amount || 0, // default to 0 if not defined
        filled_amount: old.filled_amount|| getAmountIfFilled(old.redeem_tx_hash,old.amount) || 0, // default to 0 if not defined
        secret_hash: secret_hash || "", // empty string if not defined
        secret: old.secret || "", // empty string if not defined
        initiate_tx_hash: old.initiate_tx_hash || "", // empty string if not defined
        redeem_tx_hash: old.redeem_tx_hash || "", // empty string if not defined
        refund_tx_hash: old.refund_tx_hash || "", // empty string if not defined
        initiate_block_number: old.initiate_block_number || 0, // default to 0 if not defined
        required_confirmations: old.minimum_confirmations || 0,// default to 0 if not defined
        current_confirmations: old.current_confirmations || 0, // default to 0 if not defined
    };

    // Assign redeem and refund block numbers if the respective transaction hashes are available
    newSwaps.redeem_block_number = newSwaps.redeem_tx_hash ? old.initiate_block_number + old.minimum_confirmations + 1 : 0; // Default to 0 if not defined : 0;
    newSwaps.refund_block_number = newSwaps.refund_tx_hash ? old.initiate_block_number + old.timelock + 1 : 0; // Default to 0 if not defined : 0;

    return newSwaps;
}



function getUserIdFrom(initiator_source_address, initiator_destination_address) {
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (ethAddressRegex.test(initiator_source_address)) {
            return initiator_source_address;
        } else if (ethAddressRegex.test(initiator_destination_address)) {
            return initiator_destination_address;
        } else {
            return ""; // Return empty string if no valid Ethereum address is found
        }
}



function getNewOrderObject(old, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price) {

    // console.log("Order Object: ", old);
    let orderpairs = old.order_pair;
    orderpairs = orderpairs.split('-');
    let sourcechain = orderpairs[0].split(':')[0];
    let sourceasset = (orderpairs[0].split(':')[1]) ? orderpairs[0].split(':')[1] : "primary";

    let destinationchain = orderpairs[1].split(':')[0];
    let destinationasset = (orderpairs[1].split(':')[1]) ? orderpairs[1].split(':')[1] : "primary";
    let bitcoin_optional_recipient = old.user_btc_wallet_address || ""; // Default to empty string if undefined
    additional_data = JSON.stringify({ "input_token_price": input_token_price, "output_token_price": output_token_price}); // Default to empty string if undefined
    if (bitcoin_optional_recipient) {
        additional_data = JSON.stringify({ "bitcoin_optional_recipient": bitcoin_optional_recipient ,"input_token_price": input_token_price, "output_token_price": output_token_price});
    } 
    
    let newOrder = {
        created_at: old.created_at || null, // Handle empty or invalid date values
        updated_at: old.updated_at || null,
        deleted_at: old.deleted_at || null,
        match_attempted_at: null, // Ensure this can be null
        create_id: old.id || "", // Default to empty string if undefined
        block_number: 0, // Default to 0 if not defined
        source_chain: getLatestChainName(sourcechain) || "", // Empty string if undefined
        destination_chain: getLatestChainName(destinationchain) || "", // Empty string if undefined
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

        additional_data: additional_data || "{}", // Empty string if undefined
        user_id: getUserIdFrom(initiator_source_address,initiator_destination_address) || "", // Empty string if undefined
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




function write_last_migration_timestamp(current_migration_timestamp) {
    // writing current updated_migration timestamp to file
    const configPath = './config.json';

    let config = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    config.last_updated_at = current_migration_timestamp;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

}

function get_last_migration_timestamp(current_migration_timestamp) {
    // writing current updated_migration timestamp to file
    const configPath = './config.json';
    let config = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (config.last_updated_at) {
        console.log(config.last_updated_at);
        return config.last_updated_at;
    }
    else {
        throw new Error("last_updated not found");
    }
}


module.exports = { getNewSwapObject, getNewOrderObject, getNewMatchedOrder, write_last_migration_timestamp, get_last_migration_timestamp };

