const fs = require('fs');

function getAlchemyKey() {
    if (!process.env.ALCHEMY_API_KEY) {
        throw new Error("ALCHEMY_API_KEY environment variable is not set");
    }
    return process.env.ALCHEMY_API_KEY;
}


async function getBlockNumber(chain, asset, txid) {

    console.log("Chain:", chain, "Asset:", asset, "TxID:", txid);
    let url;
    let blockNumber;

    // Check if it's Bitcoin or Bitcoin Testnet
    if (chain === "bitcoin") {
        // Bitcoin Mainnet
        url = `https://mempool.space/api/tx/${txid}`;
    } else if (chain === "bitcoin_testnet") {
        // Bitcoin Testnet
        url = `https://mempool.space/testnet/api/tx/${txid}`;
    }
    // Check if it's Ethereum, Sepolia, or Arbitrum
    else if (chain === "ethereum" || chain === "ethereum_sepolia" || chain === "ethereum_arbitrum") {
        let alchemyApiKey = getAlchemyKey();
        let apiUrl = `https:///eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;  // Default to Ethereum Mainnet

        if (chain === "ethereum_sepolia") {
            apiUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`; // Sepolia Network
        } else if (chain === "ethereum_arbitrum") {
            apiUrl = `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`; // Arbitrum Network - Using Alchemy's RPC endpoint
        }

        // Ethereum (Mainnet, Sepolia, Arbitrum)
        url = apiUrl;
        const params = {
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [txid],
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
                agent: new require('https').Agent({ keepAlive: true }),
            });

            const data = await response.json();
            if (data.result) {
                // console.log("Transaction Data:", data.result);
                if (chain == "ethereum_arbitrum") {
                    blockNumber = parseInt(data.result.l1BlockNumber, 16); // Convert hex to decimal
                } else {
                    blockNumber = parseInt(data.result.blockNumber, 16); // Convert hex to decimal
                }
                return blockNumber;
            }
        } catch (error) {
            console.error("Chain:", chain, "Asset:", asset, "TxID:", txid);
            console.error(`Error fetching ${chain}:${asset} with transid ${txid}:`, error);
            fs.appendFileSync('errors.logs', `Error fetching ${chain}:${asset} with transid ${txid}: ${error}\n`);
        }
    }

    // Make the request to the appropriate endpoint (for Bitcoin)
    if (url && (chain === "bitcoin" || chain === "bitcoin_testnet")) {
        try {
            const response = await fetch(url, {
                agent: new require('https').Agent({ keepAlive: true }),
            });
            const data = await response.json();
            // console.log("Transaction Data:", data);
            blockNumber = data.status.block_height; // Get the block number for Bitcoin
            return blockNumber;
        } catch (error) {
            console.error("Chain:", chain, "Asset:", asset, "TxID:", txid);
            console.error(`Error fetching ${chain}:${asset} with transid ${txid}:`, error);
            fs.appendFileSync('errors.logs', `Error fetching ${chain}:${asset} with transid ${txid}: ${error}\n`);
        }
    }

    // Default case if no matching chain found
    console.error("Chain:", chain, "Asset:", asset, "TxID:", txid);
    return "Chain or asset not supported!";

}

module.exports = getBlockNumber;



// (async () => {
//     const transactions = [
//         ["ethereum_sepolia", "0x130Ff59B75a415d0bcCc2e996acAf27ce70fD5eF", "11ef58b4992f019738aacbbb08b63ea5b65c637cd2baf83d569f8c17aa5572b6"],
//         // ["ethereum_arbitrum", "0x203DAC25763aE783Ad532A035FfF33d8df9437eE", "0xffff141d0d9f08036d823927b0ade5d30f235c0c249ea059d2e18518d6b80d21"],
//         // ["bitcoin", "primary", "fffc90034102314b79ab509dc6fb2c1ccf08e7daefb64b83e186b28eb4c0dfff"],
//         // ["bitcoin_testnet", "primary", "fffbcb38d20d3e946577013daa432c302ca4061551b586b3d052d94f34616285"],
//         // ["ethereum_arbitrum", "0x4F4Ef08bC134258b7D09FfFdF5DE096353f376F1", "0xfe855fe97e60c2b2237e604b354caf66fa10773b8676974038735664f5b9aede"],
//         // ["ethereum", "0x45Fb0001329072896A7Bcb448E81A6404053BB2F", "0xefb29a0850a724c0874c4c0b3e3d967b709455165463c234b2e705f66e927000"],
//         // ["ethereum", "0xA5E38d098b54C00F10e32E51647086232a9A0afD", "0xfffed19851ff2587a195a3188dcfab4ee22f2589872e45ee2fdc00c411297ca1"],
//     ];

//     // const transactions = [
//     //     ["bitcoin_testnet", "primary", "0xffa086a120505aaca91202113b4aff3e84744a4da1646d169458b57d01823fe2"]
//     // ];

//     for (const [chain, asset, txid] of transactions) {
//         if (txid) {
//             const blockNumber = await getBlockNumber(chain, asset, txid);
//             console.log(`Chain: ${chain}, Asset: ${asset}, TxID: ${txid}, Block Number: ${blockNumber}`);
//         } else {
//             console.log(`Chain: ${chain}, Asset: ${asset}, TxID: Not provided`);
//         }
//     }
// })();





