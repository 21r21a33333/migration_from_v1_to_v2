const read_client = require('./read_connection'); //read client
const write_client = require('./write_connection'); //write client
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const processOrder = require('./worker');



function getStartDate() {
    if (!process.env.UPDATE_AFTER) {
        throw new Error("UPDATE_AFTER not found");
    }
    let start_date = process.env.UPDATE_AFTER;
    return start_date;
}

async function MigrateDB() {
    let start_date = getStartDate();

    console.log("Migrating database...");
    try {
        // fetching all orders from read db
        let current_orders = await read_client.transaction(async trx => {
            try {
                const getOrders = `
                    select * from orders
                    where created_at >= '${start_date}'
                    order by id 
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
        // starting write transaction from here
        await write_client.transaction(async trx => {
            // await Promise.all(current_orders.map(order => processOrder(order)));
            if (isMainThread) {
                const numThreads = 6;
                const ordersPerThread = Math.ceil(current_orders.length / numThreads);
                const promises = [];

                for (let i = 0; i < numThreads; i++) {
                    const start = i * ordersPerThread;
                    const end = start + ordersPerThread;
                    const ordersChunk = current_orders.slice(start, end);

                    promises.push(new Promise((resolve, reject) => {
                        const worker = new Worker(__filename, {
                            workerData: { ordersChunk }
                        });

                        worker.on('message', resolve);
                        worker.on('error', reject);
                        worker.on('exit', (code) => {
                            if (code !== 0) {
                                reject(new Error(`Worker stopped with exit code ${code}`));
                            }
                        });
                    }));
                }

                await Promise.all(promises);
            } else {
                await write_client.transaction(async trx => {
                    for (let order of workerData.ordersChunk) {
                        await processOrder(order, trx, read_client);
                    }
                    parentPort.postMessage('done');
                }).catch(error => {
                    console.error("Error in worker transaction: ", error);
                    parentPort.postMessage('error');
                });
            }

        });

        console.log("Database migration completed successfully");


    } catch (e) {
        console.log("Error migrating database: ", e);
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