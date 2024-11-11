require("dotenv").config();
const { Transaction, VersionedTransaction, sendAndConfirmTransaction, Connection, Keypair, PublicKey} = require('@solana/web3.js')
const { NATIVE_MINT, getAssociatedTokenAddress } = require('@solana/spl-token')
const axios = require('axios'); // or import axios, { AxiosInstance } if creating an instance
const { API_URLS, ROUTER, TOKEN_PROGRAM_ID, SOLANA_CLUSTER_URL, ApiV3PoolInfoStandardItemCpmm, CpmmKeys, CpmmRpcData, CurveCalculator, SwapCompute} = require('@raydium-io/raydium-sdk-v2');
const bs58 = require('bs58'); // Ensure bs58 is also imported




const main = async () => {


    const num = Math.floor(Math.random() * 5) + 1
    let secretKey

    if(num == 1){
       secretKey = process.env.BOT1_PK
    }
    if(num == 2){
        secretKey = process.env.BOT2_PK
    }
    if(num == 3){
        secretKey = process.env.BOT3_PK
    }
    if(num == 4){
        secretKey = process.env.BOT4_PK
    }
    if(num == 5){
        secretKey = process.env.BOT5_PK
    }


    const owner = Keypair.fromSecretKey(bs58.decode(`${secretKey}`))
    const connection = new Connection('https://api.mainnet-beta.solana.com/')

    //swap params
    const inputMint = new PublicKey("So11111111111111111111111111111111111111112"); // SOL Mint address
    const outputMint = new PublicKey("HuxPgokUry2Xw9wmS6NAvJC9tJRvVG7Gizz8S1aTpump");
    const amount = 0.001 * 10 ** 9
    const slippage = 20
    const txVersion = 'V0'
    const isInputSol = true
    const isOutputSol = true


    // Set up token accounts for input (SOL) and output (the token you're receiving)
    const inputTokenAcc = await getAssociatedTokenAddress(inputMint, owner.publicKey);
    const outputTokenAcc = await getAssociatedTokenAddress(outputMint, owner.publicKey);

    const { data: swapResponse } = await axios.get(
      `${
        API_URLS.SWAP_HOST
      }/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
        slippage * 100}&txVersion=${txVersion}`
    ) // Use the UR

    const swapTransactions  = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: "1000000",
      swapResponse,
      txVersion,
      wallet: owner.publicKey.toBase58(),
      wrapSol: isInputSol,
      unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
      inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
      outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
    })

    console.log("swapTransactions data:", swapTransactions.data);

    const allTxBuf = swapTransactions.data.data.map((tx) => Buffer.from(tx.transaction, 'base64'))
    const allTransactions = allTxBuf.map((txBuf) =>
      txVersion === "V0" ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    )
  
    
    let idx = 0
    if (!txVersion == "V0") {
      for (const tx of allTransactions) {
        console.log(`${++idx} transaction sending...`)
        const transaction = tx
        transaction.sign(owner)
        const txId = await sendAndConfirmTransaction(connection, transaction, [owner], { skipPreflight: true })
        console.log(`${++idx} transaction confirmed, txId: ${txId}`)
      }
    } else {
      for (const tx of allTransactions) {
        idx++
        const transaction = tx
        transaction.sign([owner])
        const txId = await connection.sendTransaction(transaction, { skipPreflight: true })
        const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
          commitment: 'finalized',
        })
        console.log(`${idx} transaction sending..., txId: ${txId}`)
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: txId,
          },
          'confirmed'
        )
        console.log(`${idx} transaction confirmed`)
      }
    }


}

main()
setInterval(main, 600000)