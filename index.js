const read_client = require('./read_connection'); //read client
const write_client = require('./write_connection'); //write client
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { getNewSwapObject, getNewOrderObject, getNewMatchedOrder } = require('./helpers');
const { write_last_migration_timestamp, get_last_migration_timestamp } = require("./helpers")


const fs = require('fs');
const { default: knex } = require('knex');
const filePath = './migrated_orders.txt';

async function MigrateDB() {
    let update_date = get_last_migration_timestamp();
    console.log("last-migration-time :", update_date);
    const current_migration_timestamp = new Date().toISOString();
    console.log("current time :", current_migration_timestamp);

    console.log("Migrating database...");

    try {
        // fetching all orders from read db
        let current_orders = await read_client.transaction(async trx => {
            try {

                const getOrders = `
                    SELECT
                    to_jsonb(o) AS order,
                    to_jsonb(initiator_swap) AS initiator_swap,
                    to_jsonb(follower_swap) AS follower_swap
                FROM orders o
                LEFT JOIN atomic_swaps AS initiator_swap
                    ON initiator_swap.id = o.initiator_atomic_swap_id
                LEFT JOIN atomic_swaps AS follower_swap
                    ON follower_swap.id = o.follower_atomic_swap_id
                
                WHERE o.updated_at >= '${update_date}'
                order by o.id 
                `;
                const orderResults = await trx.raw(getOrders);
                console.log("ALL  orders from old db are fetched successfully: ");
                return orderResults.rows;
            } catch (error) {
                console.error("Error fetching orders from db: ", error);
                throw error;
            }
        });
        console.log("Current orders fetched successfully: ");

        console.log("Total orders fetched: ", current_orders.length);
        // batching orders for processing with 500 orders at a time and use insert into with all orders at once
        const batchSize = 500;
        const batches = Math.ceil(current_orders.length / batchSize);
        console.log("Total batches: ", batches);


        // processing orders in batches
        for (let i = 0; i < batches; i++) {
            console.log("Processing batch: ", i + 1, " of ", batches);
            let start = i * batchSize;
            let end = Math.min(start + batchSize, current_orders.length);
            let ordersBatch = current_orders.slice(start, end);
            swapsToInsert = [];
            ordersToInsert = [];
            matchedOrdersToInsert = [];
            orderIdsToWrite = [];
            for (let i = 0; i < ordersBatch.length; i++) {
                let insertData = processOrder(ordersBatch[i].order, ordersBatch[i].initiator_swap, ordersBatch[i].follower_swap);

                // destructuring the insertData object
                let matchedOrder = insertData.newMatchedOrder;
                let createOrder = insertData.newOrder;
                let initiator_swap = insertData.initiator_swap_for_write;
                let follower_swap = insertData.follower_swap_for_write;

                orderIdsToWrite.push(createOrder.create_id);

                if (!isMainNetChain(initiator_swap.chain) || !isMainNetChain(follower_swap.chain)) {
                    console.log("Skipping order with id: ", ordersBatch[i].order.id, " as it is not on mainnet chain");
                    continue;
                }
                matchedOrdersToInsert.push(matchedOrder);
                ordersToInsert.push(createOrder);
                swapsToInsert.push(initiator_swap);
                swapsToInsert.push(follower_swap);
            }

            // updating swaps in write db

            try {
                // inserting swaps into write db
                await write_client("swaps").insert(swapsToInsert).onConflict('swap_id').ignore(); // merge on conflict

                // inserting orders into write db
                await write_client("create_orders").insert(ordersToInsert).onConflict('create_id').ignore(); // merge on conflict

                // inserting matched orders into write db
                await write_client("matched_orders").insert(matchedOrdersToInsert); // merge on conflict


                // write the create_id to a file
                writeToFile(orderIdsToWrite);
            } catch (error) {
                console.error("Error inserting orders into write db: ", error);
                throw error;
            }
        }

        console.log("Database migration completed successfully");


    } catch (e) {
        console.log("Error migrating database: ", e);
    }

    // write_last_migration_timestamp(current_migration_timestamp);

}


function writeToFile(ordersToInsert) {
    const data = ordersToInsert.join('\n');
    fs.appendFileSync(filePath, data + '\n', 'utf8', (err) => {
        if (err) {
            console.error("Error writing to file: ", err);
        } else {
            console.log("Data written to file: ", filePath);
        }
    });
}



function isMainNetChain(chain) {
    // if chain contains "testnet" or "sepolia"
    if (chain.toLowerCase().includes("testnet") || chain.toLowerCase().includes("sepolia")) {
        return false;
    }
    return true;
}

function processOrder(order, initiator_swap, follower_swap) {
    console.log(" procecssing Order with order Id ----: ", order.id);

    // creating a transaction to get the source and destination swaps
    let [initiator_swap_for_write, follower_swap_for_write, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price] = (() => {
        // console.log("order",order);
        // console.log("initiator_swap",initiator_swap);
        // console.log("follower_swap",follower_swap);

        // formating swaps for write db
        let initiator_swap_for_write = getNewSwapObject(initiator_swap, order.secret_hash);
        let follower_swap_for_write = getNewSwapObject(follower_swap, order.secret_hash);

        return [initiator_swap_for_write, follower_swap_for_write, initiator_swap.initiator_address, follower_swap.redeemer_address, initiator_swap.amount, follower_swap.amount, follower_swap.minimum_confirmations, initiator_swap.timelock, initiator_swap.price_by_oracle, follower_swap.price_by_oracle];
    })();

    // formating order to write db  
    let newOrder = getNewOrderObject(order, initiator_source_address, initiator_destination_address, source_amount, destination_amount, minimum_confirmations, timelock, input_token_price, output_token_price);


    // getting matched order to be inserted
    let NewMatchedOrder = getNewMatchedOrder(order, initiator_swap_for_write.swap_id, follower_swap_for_write.swap_id);
    // console.log("Matched Order to be inserted: ", NewMatchedOrder);


    // console.log("matched order",NewMatchedOrder);
    // console.log("order",newOrder);
    // console.log("initiator_swap_for_write",initiator_swap_for_write);
    // console.log("follower_swap_for_write",follower_swap_for_write);
    return {
        newMatchedOrder: NewMatchedOrder,
        newOrder: newOrder,
        initiator_swap_for_write: initiator_swap_for_write,
        follower_swap_for_write: follower_swap_for_write
    }
}
async function main() {
    try {
        await MigrateDB();
    } catch (e) {
        console.log("Error starting migration: ", e);
    }
}

main();
