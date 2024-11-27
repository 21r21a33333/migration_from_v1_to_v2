
const { getNewSwapObject, getNewOrderObject, getNewMatchedOrder } = require('./helpers');

async function processOrder(order, trx, read_client) {
    console.log(" procecssing Order with order Id ----: ", order.id);
    // creating a transaction to get the source and destination swaps
    let [initiator_swap_for_write, follower_swap_for_write, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price] = await read_client.transaction(async readtrx => {


        // fetching source and destination swaps from read db
        let intitiator_swap = await readtrx.raw(`select * from atomic_swaps where id = ${order.initiator_atomic_swap_id}`);
        let follower_swap = await readtrx.raw(`select * from atomic_swaps where id = ${order.follower_atomic_swap_id}`);

        intitiator_swap = intitiator_swap.rows[0];
        follower_swap = follower_swap.rows[0];


        // formating swaps for write db
        let initiator_swap_for_write = await getNewSwapObject(intitiator_swap);
        let follower_swap_for_write = await getNewSwapObject(follower_swap);

        return [initiator_swap_for_write, follower_swap_for_write, intitiator_swap.initiator_address, follower_swap.redeemer_address, intitiator_swap.amount, follower_swap.amount, follower_swap.minimum_confirmations, intitiator_swap.timelock, intitiator_swap.price_by_oracle, follower_swap.price_by_oracle];
    });



    try {
        // inserting/updating swaps to write db

        // let writing_initiator_swap = await trx.insert(initiator_swap_for_write).into('swaps_test');
        const writing_initiator_swap = await trx('swaps_test')
            .insert(initiator_swap_for_write)
            .onConflict('swap_id') // Specify the unique column
            .merge(); // Merge will update conflicting rows with the new values
        console.log("source swap inserted successfully with swap id: ", initiator_swap_for_write.swap_id);

        // let writing_follower_swap = await trx.insert(follower_swap_for_write).into('swaps_test');
        const writing_follower_swap = await trx('swaps_test')
            .insert(follower_swap_for_write)
            .onConflict('swap_id') // Specify the unique column
            .merge(); // Merge will update conflicting rows with the new values
        console.log("destination swap inserted successfully with swap id: ", follower_swap_for_write.swap_id);

    } catch (error) {
        console.error("Error inserting swaps to write db: ", error);
        throw error;
    }

    // formating order to write db  
    let newOrder = getNewOrderObject(order, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price);

    try {
        // inserting order to write db  
        // let writing_order = await trx.insert(newOrder).into('create_orders_test');
        const writing_order = await trx('create_orders_test')
            .insert(newOrder)
            .onConflict('create_id') // Specify the unique column
            .merge(); // Merge will update conflicting rows with the new values
        console.log("Order inserted successfully: with order id: ", order.id);
    }
    catch (error) {
        console.error("Error inserting order to write db: ", error);
        throw error;
    }

    // getting matched order to be inserted
    let NewMatchedOrder = getNewMatchedOrder(order, initiator_swap_for_write.swap_id, follower_swap_for_write.swap_id);
    // console.log("Matched Order to be inserted: ", NewMatchedOrder);

    try {
        // inserting matched order to write db
        // let writing_matched_order = await trx.insert(NewMatchedOrder).into('matched_orders_test');
        let writing_matched_order = await trx('matched_orders_test')
            .insert(NewMatchedOrder)
            .onConflict('create_order_id') // Specify the unique column
            .merge(); // Merge will update conflicting rows with the new values
        console.log("Matched Order with id ", order.id, " inserted successfully: ");
    }
    catch (error) {
        console.error("Error inserting matched order to write db: ", error);
        throw error;
    }

}

module.exports = processOrder;