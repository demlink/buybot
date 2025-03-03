import { Telegraf, session } from "telegraf"
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { userinfoSchema, chainInfoSchema, openMonitorsSchema } from "./schemas.js"
import { getHiddenData, getMenuMessageId, ifAdmin } from "./tgSystem.js"
import { stringTg, customToFixed, getTokenInfo, getDividerByDecimals, verifyUserMonitors, getProviderByChain, getCoinBalances, getGasPrice, getAmountOut, getWrappedCoinByChain, getCoinNameByChain, getRouterAddressByChain, getExplorerByChain, getAmountIn, editTokenBuyMenu, getBalance, getAddressFromPrivatekey, getSolanaTokenInfo, editSolanaTokenBuyMenu, getRaydiumAmountOut, swapRaydiumExactIn } from "./blockchainSystem.js";
import _ from "lodash";
import mongoose from "mongoose"
import { ethers } from "ethers"
import contractABI from "./abi/contractABI.json" assert { type: "json" }
import BigNumber from "bignumber.js/bignumber.js"; import delugerouter from "./abi/delugerouter.json" assert { type: "json" }
import { base58 } from "ethers/lib/utils.js";

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const token = '6946830740:AAESUww3GYi_hEWXtO6WYhLCgK_DnU5_J2g';
const bot = new Telegraf(token);

// Connection string with username and password
mongoose.connect(`mongodb://mvt:mvt2023password@162.254.37.46:27017/admin`);

bot.use(session());
// Listen for the /start command
bot.start(async(ctx) => {
    if (!await userinfoSchema.exists({ tgid: ctx.message.from.id })) {
        await userinfoSchema.create({ tgid: ctx.message.from.id })
        await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { solanareferral: ctx.startPayload })
    }
    const welcomeMessage = `
👋 Welcome to SolanaBuyBot!
Solana's fastest bot to trade any coin (SPL token), and Delight's official Telegram trading bot.. 

Feel free to explore and use the available commands. If you are just starting out, just type /panel to be able to create and manage multiple wallets.

Your private key and wallet address is provided to you on wallet creation, once you send funds you can clivk refresh to see your current balance and other useful data.

To buy a token just enter a token address
    
Happy chatting!`;

    // Send the welcome message to the user
    ctx.reply(welcomeMessage);
});


async function buySolToken(ctxToAnswer, messageWithInfo, value, usertgid, messageIdWithInfoToChange, numberofwallets) {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: usertgid })
        const splittedMessage = messageWithInfo.text.split(`
`)
        const chain = getHiddenData(messageWithInfo, 0)
        const pairwith = getHiddenData(messageWithInfo, 1)
        const tokendecimals = getHiddenData(messageWithInfo, 2)
        const pair = getHiddenData(messageWithInfo, 3)
        const tokenSymbol = getHiddenData(messageWithInfo, 4).toUpperCase()
        const balance1 = getHiddenData(messageWithInfo, 5)
        const balance2 = getHiddenData(messageWithInfo, 6)
        const balance3 = getHiddenData(messageWithInfo, 7)
        const balance4 = getHiddenData(messageWithInfo, 8)
        const balance5 = getHiddenData(messageWithInfo, 9)
        const balances = [balance1, balance2, balance3, balance4, balance5]
        const coinbalances = await getCoinBalances(userinfo.solanaprivatekeys, 'sol')
    
        let walletsToBuy = []
        for (let x = 0; x < coinbalances.length && walletsToBuy.length != numberofwallets; x++) {
console.log(new BigNumber(coinbalances[x]).toFixed(), new BigNumber(String(ethers.utils.parseUnits(value, 10))).plus(String(ethers.utils.parseUnits('0.008', 10))).toFixed())
            if (new BigNumber(coinbalances[x]).gt(new BigNumber(String(ethers.utils.parseUnits(value, 10))).plus(String(ethers.utils.parseUnits('0.008', 10))))) {
                walletsToBuy.push({ privatekey: userinfo.solanaprivatekeys[x], balance: coinbalances[x] })
}
        }
        const wrappedCoin = new PublicKey('So11111111111111111111111111111111111111112')
        if (walletsToBuy.length !== 0) {
            if (walletsToBuy.length < numberofwallets) {
                await ctxToAnswer.reply(`ℹ️ You have only ${walletsToBuy.length}/${numberofwallets} wallets with enough balance to buy, buying from ${walletsToBuy.length} wallets...`).catch()
            }
            for (let i = 0; i < walletsToBuy.length; i++) {
                const walletToBuy = walletsToBuy[i]
                const amountOut = await getRaydiumAmountOut(wrappedCoin, splittedMessage[2], String(ethers.utils.parseUnits(value, 9)))
                const amountOutMin = new BigNumber(amountOut).dividedBy(100).multipliedBy((100 - Number(userinfo.buyslippage))).toFixed(0)
                const normAmountOutMin = stringTg(customToFixed(new BigNumber(amountOutMin).dividedBy(getDividerByDecimals(tokendecimals)).toFixed()).toLocaleString())
                const signature = await swapRaydiumExactIn(splittedMessage[2], new PublicKey(wrappedCoin), new PublicKey(splittedMessage[1]), String(ethers.utils.parseUnits(value, 9)), amountOutMin, Keypair.fromSecretKey(base58.decode(walletToBuy.privatekey)), userinfo.solanareferral)
                const message = await ctxToAnswer.reply(`🟡 Your transaction sent:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${signature}`)}`, {
                    parse_mode: 'MarkdownV2'
                }).catch()
                try {
                    connection.confirmTransaction({ signature: signature }, 'confirmed').then(async () => {
                        try {
                            await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*
                        
${stringTg(`https://${getExplorerByChain(chain)}/tx/${signature}`)}`, {
                                parse_mode: 'MarkdownV2', reply_markup: {
                                    inline_keyboard: [
                                        [{ text: `OK`, callback_data: 'closemenu' }]
                                    ]
                                }
                            }).catch()
                        } catch { }
                        if (i == walletsToBuy.length - 1) {
                            try {
                                const { address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith } = await getSolanaTokenInfo(splittedMessage[1], userinfo.solanaprivatekeys)
                                editSolanaTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith, undefined)
                                await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                            } catch { }
                        }
                    })
                } catch {
                    try {
                        await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🔴 Your transaction failed:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                        if (i == walletsToBuy.length - 1) {
                            try {
                                const { address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith } = await getSolanaTokenInfo(splittedMessage[1], userinfo.solanaprivatekeys)
                                editSolanaTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith, undefined)
                                await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                            } catch { }
                        }
                    } catch { }
                }
                try {
                    if (ctxToAnswer.callbackQuery) {
                        await ctxToAnswer.answerCbQuery()
                    }
                } catch { }
            }
        } else {
            await ctxToAnswer.reply(`ℹ️ 0 of your wallets have enough ${getCoinNameByChain(chain)} to buy and pay gas fees!`).catch()
            const message = await ctxToAnswer.reply(`📶 Loading your wallets...`).catch()
            return editWalletsSettings(ctxToAnswer, message.message_id)
        }
    } catch (e) { console.log(e) }
}

async function buyToken(ctxToAnswer, messageWithInfo, value, usertgid, messageIdWithInfoToChange, numberofwallets) {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: usertgid })
        const splittedMessage = messageWithInfo.text.split(`
`)
        const chain = getHiddenData(messageWithInfo, 0)
        const buyGas = getHiddenData(messageWithInfo, 1)
        const sellGas = getHiddenData(messageWithInfo, 2)
        const buyFee = getHiddenData(messageWithInfo, 3)
        const sellFee = getHiddenData(messageWithInfo, 4)
        const pairwith = getHiddenData(messageWithInfo, 5)
        const tokendecimals = getHiddenData(messageWithInfo, 6)
        const pair = getHiddenData(messageWithInfo, 7)
        const isv3pair = getHiddenData(messageWithInfo, 8)
        const fee = getHiddenData(messageWithInfo, 9)
        const tokenSymbol = getHiddenData(messageWithInfo, 10).toUpperCase()
        const maxBuy = getHiddenData(messageWithInfo, 11)
        const maxSell = getHiddenData(messageWithInfo, 12)
        const balance1 = getHiddenData(messageWithInfo, 13)
        const balance2 = getHiddenData(messageWithInfo, 14)
        const balance3 = getHiddenData(messageWithInfo, 15)
        const balance4 = getHiddenData(messageWithInfo, 16)
        const balance5 = getHiddenData(messageWithInfo, 17)
        const balances = [balance1, balance2, balance3, balance4, balance5]
        const chainInfo = await chainInfoSchema.findOne({ chain: chain })
        const provider = getProviderByChain(chain)
        const coinbalances = await getCoinBalances(userinfo.privatekeys, provider)
        const gwei = chainInfo.gwei
        const buyGasPrice = getGasPrice(buyGas, gwei + userinfo.buygwei)
        if (buyFee > userinfo.maxbuytax || sellFee > userinfo.maxselltax) {
            await ctxToAnswer.reply(`ℹ️ According to your settings, your max tax is less than the token tax at the moment. Did you missclicked?`).catch()
            const message = await ctxToAnswer.reply(`📶 Loading your settings...`).catch()
            return editBuySettings(ctxToAnswer, message.message_id)
        }
        let walletsToBuy = []
        for (let x = 0; x < coinbalances.length && walletsToBuy.length != x; x++) {
            if (new BigNumber(coinbalances[x]).gt(new BigNumber(String(ethers.utils.parseEther(value))).plus(buyGasPrice / 10 * 12))) {
                walletsToBuy.push({ privatekey: userinfo.privatekeys[x], balance: coinbalances[x] })
            }
        }
        let tx
        let path
        let fee1
        let fee2
        const wrappedCoin = getWrappedCoinByChain(chain)
        if (pairwith !== '0x0000000000000000000000000000000000000000') {
            path = [wrappedCoin, pairwith, splittedMessage[1]]
            fee1 = 500
            fee2 = fee
        } else {
            path = [wrappedCoin, splittedMessage[1]]
            fee1 = fee
            fee2 = 500
        }
        if (walletsToBuy.length !== 0) {
            if (walletsToBuy.length < numberofwallets) {
                await ctxToAnswer.reply(`ℹ️ You have only ${walletsToBuy.length}/${numberofwallets} wallets with enough balance to buy, buying from ${walletsToBuy.length} wallets...`).catch()
            }
            for (let i = 0; i < walletsToBuy.length; i++) {
                const walletToBuy = walletsToBuy[i]
                const amountOut = await getAmountOut(path, String(ethers.utils.parseEther(value)), isv3pair, fee, chain)
                const amountOutMin = new BigNumber(amountOut).dividedBy(100).multipliedBy((100 - buyFee - Number(userinfo.buyslippage))).toFixed(0)
                const normAmountOutMin = stringTg(customToFixed(new BigNumber(amountOutMin).dividedBy(getDividerByDecimals(tokendecimals)).toFixed()).toLocaleString())
                const signerWallet = new ethers.Wallet(walletToBuy.privatekey, getProviderByChain(chain))
                const signerdelugeRouter = new ethers.Contract(getRouterAddressByChain(chain), delugerouter, signerWallet)
                if (isv3pair !== 'false') {
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV3(fee1, fee2, String(ethers.utils.parseEther(value)), amountOutMin, path, 0, { value: String(ethers.utils.parseEther(value)) }))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletToBuy.balance)) {
                        return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV3(fee1, fee2, String(ethers.utils.parseEther(value)), amountOutMin, path, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.buygwei) * 1000000000).toFixed(0), value: String(ethers.utils.parseEther(value)) })
                } else {
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV2(wrappedCoin, splittedMessage[1], String(ethers.utils.parseEther(value)), amountOutMin, pairwith, 0, { value: String(ethers.utils.parseEther(value)) }))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletToBuy.balance)) {
                        return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV2(wrappedCoin, splittedMessage[1], String(ethers.utils.parseEther(value)), amountOutMin, pairwith, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.buygwei) * 1000000000).toFixed(0), value: String(ethers.utils.parseEther(value)) })
                }
                const message = await ctxToAnswer.reply(`🟡 Your transaction sent:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                    parse_mode: 'MarkdownV2'
                }).catch()
                try {
                    tx.wait().then(async () => {
                        try {
                            await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*
                        
${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                                parse_mode: 'MarkdownV2', reply_markup: {
                                    inline_keyboard: [
                                        [{ text: `OK`, callback_data: 'closemenu' }]
                                    ]
                                }
                            }).catch()
                        } catch { }
                        if (i == walletsToBuy.length - 1) {
                            try {
                                const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
                                editTokenBuyMenu(messageWithInfo.chat.id, messageIdWithInfoToChange, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                                await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                            } catch { }
                        }
                    })
                } catch {
                    try {
                        await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🔴 Your transaction failed:
*Swap ${stringTg(value)} ${getCoinNameByChain(chain)} for at least ${normAmountOutMin} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                        if (i == walletsToBuy.length - 1) {
                            try {
                                const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
                                editTokenBuyMenu(messageWithInfo.chat.id, messageIdWithInfoToChange, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                                await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                            } catch { }
                        }
                    } catch { }
                }
                try {
                    if (ctxToAnswer.callbackQuery) {
                        await ctxToAnswer.answerCbQuery()
                    }
                } catch { }
            }
        } else {
            await ctxToAnswer.reply(`ℹ️ 0 of your wallets have enough ${getCoinNameByChain(chain)} to buy and pay gas fees!`).catch()
            const message = await ctxToAnswer.reply(`📶 Loading your wallets...`).catch()
            return editWalletsSettings(ctxToAnswer, message.message_id)
        }
    } catch (e) { console.log(e) }
}

async function buyExactToken(ctxToAnswer, messageWithInfo, out, usertgid, messageIdWithInfoToChange, numberofwallets) {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: usertgid })
        const splittedMessage = messageWithInfo.text.split(`
`)
        const chain = getHiddenData(messageWithInfo, 0)
        const buyGas = getHiddenData(messageWithInfo, 1)
        const sellGas = getHiddenData(messageWithInfo, 2)
        const buyFee = getHiddenData(messageWithInfo, 3)
        const sellFee = getHiddenData(messageWithInfo, 4)
        const pairwith = getHiddenData(messageWithInfo, 5)
        const tokendecimals = getHiddenData(messageWithInfo, 6)
        const pair = getHiddenData(messageWithInfo, 7)
        const isv3pair = getHiddenData(messageWithInfo, 8)
        const fee = getHiddenData(messageWithInfo, 9)
        const tokenSymbol = getHiddenData(messageWithInfo, 10).toUpperCase()
        const maxBuy = getHiddenData(messageWithInfo, 11)
        const maxSell = getHiddenData(messageWithInfo, 12)
        const balance1 = getHiddenData(messageWithInfo, 13)
        const balance2 = getHiddenData(messageWithInfo, 14)
        const balance3 = getHiddenData(messageWithInfo, 15)
        const balance4 = getHiddenData(messageWithInfo, 16)
        const balance5 = getHiddenData(messageWithInfo, 17)
        const balances = [balance1, balance2, balance3, balance4, balance5]
        const chainInfo = await chainInfoSchema.findOne({ chain: chain })
        const provider = getProviderByChain(chain)
        const coinbalances = await getCoinBalances(userinfo.privatekeys, provider)
        const gwei = chainInfo.gwei
        const buyGasPrice = getGasPrice(buyGas, gwei + userinfo.buygwei)
        if (buyFee > userinfo.maxbuytax || sellFee > userinfo.maxselltax) {
            await ctxToAnswer.reply(`ℹ️ According to your settings, your max tax is less than the token tax at the moment. Did you missclicked?`).catch()
            const message = await ctxToAnswer.reply(`📶 Loading your settings...`).catch()
            return editBuySettings(ctxToAnswer, message.message_id)
        }
        const wrappedCoin = getWrappedCoinByChain(chain)
        let path
        let fee1
        let fee2
        if (pairwith !== '0x0000000000000000000000000000000000000000') {
            path = [wrappedCoin, pairwith, splittedMessage[1]]
            fee1 = 500
            fee2 = fee
        } else {
            path = [wrappedCoin, splittedMessage[1]]
            fee1 = fee
            fee2 = 500
        }
        const amountIn = await getAmountIn(path, out, isv3pair, fee, chain)
        const amountInMax = new BigNumber(amountIn).dividedBy(100).multipliedBy((100 + Number(buyFee) + Number(userinfo.buyslippage))).toFixed(0)
        let walletsToBuy = []
        for (let x = 0; x < coinbalances.length && numberofwallets != numberofwallets; x++) {
            if (new BigNumber(coinbalances[x]).gt(new BigNumber(String(amountInMax)).plus(buyGasPrice / 10 * 12))) {
                walletsToBuy.push({ privatekey: userinfo.privatekeys[x], balance: coinbalances[x] })
            }
        }
        if (walletsToBuy.length !== 0) {
            if (walletsToBuy.length < numberofwallets) {
                await ctxToAnswer.reply(`ℹ️ You have only ${walletsToBuy.length}/${numberofwallets} wallets with enough balance to buy, buying from ${walletsToBuy.length} wallets...`).catch()
            }
            let tx
            for (let i = 0; i < walletsToBuy.length; i++) {
                const walletToBuy = walletsToBuy[i]
                const normAmountInMax = stringTg(customToFixed(new BigNumber(amountInMax).dividedBy(getDividerByDecimals(18)).toFixed()).toLocaleString())
                const normAmountOut = stringTg(customToFixed(new BigNumber(out).dividedBy(getDividerByDecimals(tokendecimals)).toFixed()).toLocaleString())
                const signerWallet = new ethers.Wallet(walletToBuy.privatekey, getProviderByChain(chain))
                const signerdelugeRouter = new ethers.Contract(getRouterAddressByChain(chain), delugerouter, signerWallet)
                if (isv3pair !== 'false') {
                    if (pairwith !== '0x0000000000000000000000000000000000000000') {
                        path = [splittedMessage[1], pairwith, wrappedCoin]
                        fee1 = 500
                        fee2 = fee
                    } else {
                        path = [splittedMessage[1], wrappedCoin]
                        fee1 = fee
                        fee2 = 500
                    }
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV3ExactTokensOut(fee1, fee2, out, path, 0, { value: amountInMax }))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletToBuy.balance)) {
                        return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV3ExactTokensOut(fee1, fee2, out, path, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.buygwei) * 1000000000).toFixed(0), value: amountInMax })
                } else {
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV2ExactTokensOut(wrappedCoin, splittedMessage[1], out, pairwith, 0, { value: amountInMax }))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletToBuy.balance)) {
                        return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV2ExactTokensOut(wrappedCoin, splittedMessage[1], out, pairwith, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.buygwei) * 1000000000).toFixed(0), value: amountInMax })
                }
                const message = await ctxToAnswer.reply(`🟡 Your transaction sent:
*Swap max\\. ${normAmountInMax} ${getCoinNameByChain(chain)} for ${normAmountOut} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                    parse_mode: 'MarkdownV2'
                }).catch()
                try {
                    tx.wait().then(async () => {
                        try {
                            await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
*Swap max\\. ${normAmountInMax} ${getCoinNameByChain(chain)} for ${normAmountOut} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                                parse_mode: 'MarkdownV2', reply_markup: {
                                    inline_keyboard: [
                                        [{ text: `OK`, callback_data: 'closemenu' }]
                                    ]
                                }
                            }).catch()
                        } catch { }
                    })
                } catch {
                    try {
                        await bot.telegram.editMessageText(ctxToAnswer.chat.id, message.message_id, 0, `🔴 Your transaction failed:
*Swap max\\. ${normAmountInMax} ${getCoinNameByChain(chain)} for ${normAmountOut} ${stringTg(tokenSymbol)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                    } catch { }
                }
                try {
                    if (ctxToAnswer.callbackQuery) {
                        await ctxToAnswer.answerCbQuery()
                    }
                } catch { }
            }
            try {
                const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
                editTokenBuyMenu(messageWithInfo.chat.id, messageIdWithInfoToChange, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                await ctx.answerCbQuery('Monitor Successfully Refreshed.')
            } catch { }
        } else {
            await ctxToAnswer.reply(`ℹ️ 0 of your wallets have enough ${getCoinNameByChain(chain)} to buy and pay gas fees!`).catch()
            const message = await ctxToAnswer.reply(`📶 Loading your wallets...`).catch()
            return editWalletsSettings(ctxToAnswer, message.message_id)
        }
    } catch (e) {
        console.log(e)
    }
}


// Edit Menu

async function editWalletsSettings(ctx, messageid) {
    try {
        let id
        try {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.callbackQuery.from.id }
            }
        }
        catch {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.message.from.id }
            }
        }
        if (!await userinfoSchema.exists(id)) {
            await userinfoSchema.create(id)
        }
        const userinfo = await userinfoSchema.findOne(id)
        let explorer = 'etherscan.io'
        let explorername = 'Etherscan'
        let coinsymbol = getCoinNameByChain(userinfo.menuchain)
        let refreshbutton = [{ text: `🟢 Refresh`, callback_data: 'switchtoeth' }]
        let referralbutton = [{ text: 'Refer Friends', callback_data: 'copy_referral' }];
        let switchbutton = [{ text: `🔄 Switch To BNB Chain`, callback_data: 'switchtobnb' }]
        if (userinfo.menuchain === 'bnb') {
            explorer = 'bscscan.com'
            explorername = 'Bscscan'
            refreshbutton = [{ text: `🟢 Refresh`, callback_data: 'switchtobnb' }]
            switchbutton = [{ text: '🔄 Switch To SOL Chain', callback_data: 'switchtosol' }]
        }
        if (userinfo.menuchain === 'sol') {
            explorer = 'solscan.io'
            explorername = 'Solscan'
            refreshbutton = [{ text: `🟢 Refresh`, callback_data: 'switchtosol' }]
            switchbutton = [{ text: '🔄 Switch To ETH Chain', callback_data: 'switchtoeth' }]
        }
        let wallets = '🚫 No wallets found\\.'
        let firstline = []
        let secondline = []
        let thirdline = []
        let fourthline = []
        let fifthline = []
        let privatekeys = userinfo.privatekeys
        if (userinfo.menuchain == 'sol') {
            privatekeys = userinfo.solanaprivatekeys
        }
        for (let i = 0; i < privatekeys.length; i++) {
            const address = getAddressFromPrivatekey(privatekeys[i], userinfo.menuchain)
            const balance = await getBalance(address, userinfo.menuchain)
            if (wallets === '🚫 No wallets found\\.') {
                wallets = ''
            }
            wallets = wallets + `💳 ${i + 1} \\- Balance\\: ${stringTg(balance)} ${coinsymbol} \\| [${explorername}](https://${explorer}/address/${address})
\`${address}\`

`
            if (i == 0) {
                switchbutton.unshift({ text: `🏧 Transfer ${coinsymbol}`, callback_data: 'transfereth' })
            }
            if (i <= 1) {
                firstline.push({ text: `🗑 Delete Wallet ${i + 1}`, callback_data: `isdeletewallet${i + 1}` })
            }
            else if (i > 1 && i <= 3) {
                secondline.push({ text: `🗑 Delete Wallet ${i + 1}`, callback_data: `isdeletewallet${i + 1}` })
            }
            else if (i > 2 && i <= 5) {
                thirdline.push({ text: `🗑 Delete Wallet ${i + 1}`, callback_data: `isdeletewallet${i + 1}` })
            }
        }
        if (messageid) {
            await bot.telegram.editMessageText(ctx.chat.id, messageid, null, `🔐 *All added wallets:*

${wallets}`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        firstline, secondline, thirdline, fourthline, fifthline,
                        [{ text: '📥 Import New Wallet', callback_data: 'importwallet' }, { text: '➕ Generate New Wallet', callback_data: 'generatewallet' }],
                        switchbutton,
                        referralbutton,
                        refreshbutton,
                        [{ text: `🔙 Back`, callback_data: 'edittopanel' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        } else {
            await ctx.editMessageText(`🔐 *All added wallets:*

${wallets}`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        firstline, secondline, thirdline, fourthline, fifthline,
                        [{ text: '📥 Import New Wallet', callback_data: 'importwallet' }, { text: '➕ Generate New Wallet', callback_data: 'generatewallet' }],
                        switchbutton,
                        referralbutton,
                        refreshbutton,
                        [{ text: `🔙 Back`, callback_data: 'edittopanel' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        }
    } catch (e) { console.log(e) }
}

async function editBuySettings(ctx, messageid) {
    try {
        let id
        try {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.callbackQuery.from.id }
            }
        }
        catch {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.message.from.id }
            }
        }
        if (!await userinfoSchema.exists(id)) {
            await userinfoSchema.create(id)
        }
        const userinfo = await userinfoSchema.findOne(id)
        let buygwei = userinfo.buygwei
        let sellgwei = userinfo.sellgwei
        let approvegwei = userinfo.approvegwei
        let buyslippage = userinfo.buyslippage
        let sellslippage = userinfo.sellslippage
        let maxbuytax = userinfo.maxbuytax
        let maxselltax = userinfo.maxselltax
        let numberOfWallets = userinfo.defaultnumberofwallets
        if (messageid) {
            await bot.telegram.editMessageText(ctx.chat.id, messageid, null, `⚙️ *Your Settings:*

ℹ️ *Slippage* \\- Edit the percentage by which you are willing to receive less tokens because of the price increase\\(if you are buying\\) \\/ decrease\\(if you are selling\\) during the processing period of your transaction in blockchain\\.

\`Default Number Of Wallets: ${numberOfWallets} \\| Each buy menu will open initially with that number of wallets

Buy Gwei: Default + ${buygwei} \\| Use it to speed up your buys
Sell Gwei: Default + ${sellgwei} \\| Use it to speed up your sells
Approve Gwei: Default + ${approvegwei} \\| Use it to speed up your approves after buys

Buy Slippage: ${buyslippage}\\%
Sell Slippage: ${sellslippage}\\%

Max Buy Tax: ${maxbuytax}\\% \\| Use this to avoid buying when buy taxes are too high
Max Sell Tax: ${maxselltax}\\% \\| Use this to avoid selling when sell taxes are too high\``, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: `💳 Default Number Of Wallets: ${numberOfWallets}`, callback_data: 'editdefaultnumberofwallets' }],
                        [{ text: `⛽️ Buy Gwei: +${buygwei} Gwei`, callback_data: 'editbuygwei' }, { text: `⛽️ Sell Gwei: +${sellgwei} Gwei`, callback_data: 'editsellgwei' }],
                        [{ text: `⛽️ Approve Gwei: Default + ${approvegwei} Gwei`, callback_data: 'editapprovegwei' }],
                        [{ text: `📛 Max Buy Tax: ${maxbuytax}%`, callback_data: 'editmaxbuytax' }, { text: `📛 Max Sell Tax: ${maxselltax}%`, callback_data: 'editmaxselltax' }],
                        [{ text: `🧊 Buy Slippage: ${buyslippage}%`, callback_data: 'editbuyslippage' }, { text: `🧊 Sell Slippage: ${sellslippage}%`, callback_data: 'editsellslippage' }],
                        [{ text: `🔙 Back`, callback_data: 'edittopanel' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        } else {
            await ctx.editMessageText(`⚙️ *Your Settings:*

*Only number of wallets, buy\\/sell slippage settings apply to the Solana chain\\.*

ℹ️ *Slippage* \\- Edit the percentage by which you are willing to receive less tokens because of the price increase\\(if you are buying\\) \\/ decrease\\(if you are selling\\) during the processing period of your transaction in blockchain\\.
            
\`Default Number Of Wallets: ${numberOfWallets} \\| Each buy menu will open initially with that number of wallets

Buy Gwei: Default + ${buygwei} \\| Use it to speed up your buys
Sell Gwei: Default + ${sellgwei} \\| Use it to speed up your sells
Approve Gwei: Default + ${approvegwei} \\| Use it to speed up your approves after buys

Buy Slippage: ${buyslippage}\\%
Sell Slippage: ${sellslippage}\\%

Max Buy Tax: ${maxbuytax}\\% \\| Use this to avoid buying when buy taxes are too high
Max Sell Tax: ${maxselltax}\\% \\| Use this to avoid selling when sell taxes are too high\``, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: `💳 Default Number Of Wallets: ${numberOfWallets}`, callback_data: 'editdefaultnumberofwallets' }],
                        [{ text: `⛽️ Buy Gwei: +${buygwei} Gwei`, callback_data: 'editbuygwei' }, { text: `⛽️ Sell Gwei: +${sellgwei} Gwei`, callback_data: 'editsellgwei' }],
                        [{ text: `⛽️ Approve Gwei: Default + ${approvegwei} Gwei`, callback_data: 'editapprovegwei' }],
                        [{ text: `📛 Max Buy Tax: ${maxbuytax}%`, callback_data: 'editmaxbuytax' }, { text: `📛 Max Sell Tax: ${maxselltax}%`, callback_data: 'editmaxselltax' }],
                        [{ text: `🧊 Buy Slippage: ${buyslippage}%`, callback_data: 'editbuyslippage' }, { text: `🧊 Sell Slippage: ${sellslippage}%`, callback_data: 'editsellslippage' }],
                        [{ text: `🔙 Back`, callback_data: 'edittopanel' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        }
    } catch (e) { console.log(e) }
}

async function editPanelSettings(ctx, messageid) {
    try {
        let id
        try {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.callbackQuery.from.id }
            }
        }
        catch {
            if (ctx.chat.type === 'private') {
                id = { tgid: ctx.message.from.id }
            }
        }
        if (!await userinfoSchema.exists(id)) {
            await userinfoSchema.create(id)
        }
        if (messageid) {
            await bot.telegram.editMessageText(ctx.chat.id, messageid, null, `🖥️ *Your Settings:*`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚙️ Tx Settings', callback_data: 'edittobuysettings' }],
                        [{ text: '💼 Manage Wallets', callback_data: 'edittomanagewallets' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        } else {
            await ctx.editMessageText(`🖥️ *Your Settings:*`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚙️ Tx Settings', callback_data: 'edittobuysettings' }],
                        [{ text: '💼 Manage Wallets', callback_data: 'edittomanagewallets' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        }
    } catch { }
}




// Edit Menu Actions

bot.action('edittopanel', async (ctx) => {
    try {
        editPanelSettings(ctx)
    } catch { }
}).catch()

bot.action('switchtobnb', async (ctx) => {
    try {
        let id
        if (ctx.chat.type === 'private') {
            id = { tgid: ctx.callbackQuery.from.id }
        }
        const userinfo = await userinfoSchema.findOneAndUpdate(id, { menuchain: 'bnb' })
        await userinfoSchema.findOneAndUpdate(id, { menuchain: 'bnb' })
        if (userinfo.menuchain == 'bnb') {
            editWalletsSettings(ctx)
            await ctx.answerCbQuery('Refreshed')
        } else {
            editWalletsSettings(ctx)
        }
    } catch (e) { console.log(e) }
}).catch()

bot.action('switchtoeth', async (ctx) => {
    try {
        let id
        if (ctx.chat.type === 'private') {
            id = { tgid: ctx.callbackQuery.from.id }
        }
        const userinfo =await userinfoSchema.findOneAndUpdate(id, { menuchain: 'eth' })
        if (userinfo.menuchain == 'eth') {
            editWalletsSettings(ctx)
            await ctx.answerCbQuery('Refreshed')
        } else {
            editWalletsSettings(ctx)
        }
    } catch (e) { }
}).catch()

bot.action('switchtosol', async (ctx) => {
    try {
        let id
        if (ctx.chat.type === 'private') {
            id = { tgid: ctx.callbackQuery.from.id }
        }
        const userinfo = await userinfoSchema.findOneAndUpdate(id, { menuchain: 'sol' })
        if (userinfo.menuchain == 'sol') {
            editWalletsSettings(ctx)
            await ctx.answerCbQuery('Refreshed')
        } else {
            editWalletsSettings(ctx)
        }
    } catch (e) { console.log(e)}
}).catch()

bot.action('switchtosell', async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const message = ctx.callbackQuery.message
        const chain = getHiddenData(message, 0)
        if (chain !== 'sol') {
            if (!userinfo.solanaprivatekeys) {
                await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
            }
            const splittedMessage = message.text.split(`
`)
            const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
            editTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, true)

        } else {
            if (!userinfo.privatekeys) {
                await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
            }
            const splittedMessage = message.text.split(`
`)
            const { address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith } = await getSolanaTokenInfo(splittedMessage[1], userinfo.solanaprivatekeys)
            editSolanaTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith, true)
        }
        await ctx.answerCbQuery('Monitor Successfully Refreshed.')
    } catch (e) { console.log(e) }
}).catch()

bot.action('switchtobuy', async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const message = ctx.callbackQuery.message
        const chain = getHiddenData(message, 0)
        if (chain !== 'sol') {
            if (!userinfo.solanaprivatekeys) {
                await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
            }
            const splittedMessage = message.text.split(`
`)
            const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
            editTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, false)

        } else {
            if (!userinfo.privatekeys) {
                await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
            }
            const splittedMessage = message.text.split(`
`)
            const { address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith } = await getSolanaTokenInfo(splittedMessage[1], userinfo.solanaprivatekeys)
            editSolanaTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith, false)
        }
        await ctx.answerCbQuery('Monitor Successfully Refreshed.')
    } catch (e) { console.log(e) }
}).catch()

bot.action('changenumberofwallets', async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
        const numberOfWallets = Number(text.substring(text.length - 1))
        let newNumberOfWallets
        if (userinfo.privatekeys.length > numberOfWallets) {
            newNumberOfWallets = numberOfWallets + 1
        } else {
            newNumberOfWallets = 1
        }
        let keyboard = ctx.callbackQuery.message.reply_markup.inline_keyboard
        keyboard.shift()
        keyboard.unshift([{ text: `💳 Wallets To Buy: ${newNumberOfWallets}`, callback_data: 'changenumberofwallets' }])
        await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard })
    } catch (e) { console.log(e) }
}).catch()

bot.action('editdefaultnumberofwallets', async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
        const numberOfWallets = Number(text.substring(text.length - 1))
        let newNumberOfWallets
        if (userinfo.privatekeys.length > numberOfWallets) {
            newNumberOfWallets = numberOfWallets + 1
        } else {
            newNumberOfWallets = 1
        }
        await userinfoSchema.findOneAndUpdate({ tgid: ctx.callbackQuery.from.id }, { defaultnumberofwallets: newNumberOfWallets })
        editBuySettings(ctx)
    } catch (e) { console.log(e) }
}).catch()

bot.action('edittomanagewallets', async (ctx) => {
    try {
        editWalletsSettings(ctx)
    } catch { }
}).catch()

bot.action('edittobuysettings', async (ctx) => {
    try {
        editBuySettings(ctx)
    } catch { }
}).catch()

bot.action('editwalletssettings', async (ctx) => {
    try {
        editWalletsSettings(ctx)
    } catch { }
}).catch()




const soldata3 = [{ name: `buysoltoken1`, value: '0.01' }, { name: `buysoltoken2`, value: '0.5' }, { name: `buysoltoken3`, value: '1' }, { name: `buysoltoken4`, value: '2' }, { name: `buysoltoken5`, value: '5' }, { name: `buysoltoken6`, value: '10' }]

for (let i = 0; i < soldata3.length; i++) {
    bot.action(soldata3[i].name, async (ctx) => {
        try {
            const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
            const numberOfWallets = Number(text.substring(text.length - 1))
            buySolToken(ctx, ctx.callbackQuery.message, soldata3[i].value, ctx.callbackQuery.from.id, ctx.callbackQuery.message.message_id, Number(numberOfWallets))
        } catch (e) { console.log(e) }
    })
}

const data3 = [{ name: `buytoken1`, value: '0.05' }, { name: `buytoken2`, value: '0.1' }, { name: `buytoken3`, value: '0.3' }, { name: `buytoken4`, value: '0.5' }, { name: `buytoken5`, value: '1' }, { name: `buytoken6`, value: '3' }]

for (let i = 0; i < data3.length; i++) {
    bot.action(data3[i].name, async (ctx) => {
        try {
            const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
            const numberOfWallets = Number(text.substring(text.length - 1))
            buyToken(ctx, ctx.callbackQuery.message, data3[i].value, ctx.callbackQuery.from.id, ctx.callbackQuery.message.message_id, Number(numberOfWallets))
        } catch (e) { console.log(e) }
    })
}

bot.action(`buyxeth`, async (ctx) => {
    try {
        const splittedMessage = ctx.callbackQuery.message.text.split(`
`)
        const chain = getHiddenData(ctx.callbackQuery.message, 0)
        const buyGas = getHiddenData(ctx.callbackQuery.message, 1)
        const sellGas = getHiddenData(ctx.callbackQuery.message, 2)
        const buyFee = getHiddenData(ctx.callbackQuery.message, 3)
        const sellFee = getHiddenData(ctx.callbackQuery.message, 4)
        const pairwith = getHiddenData(ctx.callbackQuery.message, 5)
        const tokendecimals = getHiddenData(ctx.callbackQuery.message, 6)
        const pair = getHiddenData(ctx.callbackQuery.message, 7)
        const isv3pair = getHiddenData(ctx.callbackQuery.message, 8)
        const fee = getHiddenData(ctx.callbackQuery.message, 9)
        const tokenSymbol = getHiddenData(ctx.callbackQuery.message, 10)
        const maxBuy = getHiddenData(ctx.callbackQuery.message, 11)
        const maxSell = getHiddenData(ctx.callbackQuery.message, 12)
        const balance1 = getHiddenData(ctx.callbackQuery.message, 13)
        const balance2 = getHiddenData(ctx.callbackQuery.message, 14)
        const balance3 = getHiddenData(ctx.callbackQuery.message, 15)
        const balance4 = getHiddenData(ctx.callbackQuery.message, 16)
        const balance5 = getHiddenData(ctx.callbackQuery.message, 17)
        const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
        const numberofwallets = Number(text.substring(text.length - 1))
        await ctx.reply(`[​](https://${chain}.com/)[​](https://${buyGas}.com/)[​](https://${sellGas}.com/)[​](https://${buyFee}.com/)[​](https://${sellFee}.com/)[​](https://${pairwith}.com/)[​](https://${tokendecimals}.com/)[​](https://${pair}.com/)[​](https://${isv3pair}.com/)[​](https://${fee}.com/)[​](https://${tokenSymbol}.com/)[​](https://${maxBuy}.com/)[​](https://${maxSell}.com/)[​](https://${balance1}.com/)[​](https://${balance2}.com/)[​](https://${balance3}.com/)[​](https://${balance4}.com/)[​](https://${balance5}.com/)[​](https://${ctx.callbackQuery.message.message_id}.com/)[​](https://${numberofwallets}.com/)⚙️ *Buy Exact ETH\\/BNB\ With ${numberofwallets} Wallet*
\`${splittedMessage[1]}\`

To proceed, enter the amount of ETH\\/BNB will be spent on the buy\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
        await ctx.answerCbQuery().catch()
    } catch (e) { console.log(e) }
})

bot.action(`buymax`, async (ctx) => {
    try {
        const maxBuy = getHiddenData(ctx.callbackQuery.message, 11)
        const tokendecimals = getHiddenData(ctx.callbackQuery.message, 6)
        const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
        const numberofwallets = Number(text.substring(text.length - 1))
        const out = new BigNumber(maxBuy).multipliedBy(getDividerByDecimals(tokendecimals)).minus(1).toFixed(0)
        buyExactToken(ctx, ctx.callbackQuery.message, out, ctx.callbackQuery.from.id, ctx.callbackQuery.message.message_id, Number(numberofwallets))
        await ctx.answerCbQuery().catch()
    } catch (e) { console.log(e) }
})

bot.action(`buyxtokens`, async (ctx) => {
    try {
        const splittedMessage = ctx.callbackQuery.message.text.split(`
`)
        const chain = getHiddenData(ctx.callbackQuery.message, 0)
        const buyGas = getHiddenData(ctx.callbackQuery.message, 1)
        const sellGas = getHiddenData(ctx.callbackQuery.message, 2)
        const buyFee = getHiddenData(ctx.callbackQuery.message, 3)
        const sellFee = getHiddenData(ctx.callbackQuery.message, 4)
        const pairwith = getHiddenData(ctx.callbackQuery.message, 5)
        const tokendecimals = getHiddenData(ctx.callbackQuery.message, 6)
        const pair = getHiddenData(ctx.callbackQuery.message, 7)
        const isv3pair = getHiddenData(ctx.callbackQuery.message, 8)
        const fee = getHiddenData(ctx.callbackQuery.message, 9)
        const tokenSymbol = getHiddenData(ctx.callbackQuery.message, 10)
        const maxBuy = getHiddenData(ctx.callbackQuery.message, 11)
        const maxSell = getHiddenData(ctx.callbackQuery.message, 12)
        const balance1 = getHiddenData(ctx.callbackQuery.message, 13)
        const balance2 = getHiddenData(ctx.callbackQuery.message, 14)
        const balance3 = getHiddenData(ctx.callbackQuery.message, 15)
        const balance4 = getHiddenData(ctx.callbackQuery.message, 16)
        const balance5 = getHiddenData(ctx.callbackQuery.message, 17)
        const text = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][0].text
        const numberofwallets = Number(text.substring(text.length - 1))
        await ctx.reply(`[​](https://${chain}.com/)[​](https://${buyGas}.com/)[​](https://${sellGas}.com/)[​](https://${buyFee}.com/)[​](https://${sellFee}.com/)[​](https://${pairwith}.com/)[​](https://${tokendecimals}.com/)[​](https://${pair}.com/)[​](https://${isv3pair}.com/)[​](https://${fee}.com/)[​](https://${tokenSymbol}.com/)[​](https://${maxBuy}.com/)[​](https://${maxSell}.com/)[​](https://${balance1}.com/)[​](https://${balance2}.com/)[​](https://${balance3}.com/)[​](https://${balance4}.com/)[​](https://${balance5}.com/)[​](https://${ctx.callbackQuery.message.message_id}.com/)[​](https://${numberofwallets}.com/)⚙️ *Buy Exact Tokens With ${numberofwallets} Wallet*
\`${splittedMessage[1]}\`

To proceed, enter the number of tokens you intend to buy \\(can be in \\% of supply\\)\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
        await ctx.answerCbQuery().catch()
    } catch (e) { console.log(e) }
})

const data4 = [{ name: `sellwallet125`, wallet: 0, percent: 25 }, { name: `sellwallet150`, wallet: 0, percent: 50 }, { name: `sellwallet175`, wallet: 0, percent: 75 }, { name: `sellwallet1100`, wallet: 0, percent: 100 },
{ name: `sellwallet225`, wallet: 1, percent: 25 }, { name: `sellwallet250`, wallet: 1, percent: 50 }, { name: `sellwallet275`, wallet: 1, percent: 75 }, { name: `sellwallet2100`, wallet: 1, percent: 100 },
{ name: `sellwallet325`, wallet: 2, percent: 25 }, { name: `sellwallet350`, wallet: 2, percent: 50 }, { name: `sellwallet375`, wallet: 2, percent: 75 }, { name: `sellwallet3100`, wallet: 2, percent: 100 },
{ name: `sellwallet425`, wallet: 3, percent: 25 }, { name: `sellwallet450`, wallet: 3, percent: 50 }, { name: `sellwallet475`, wallet: 3, percent: 75 }, { name: `sellwallet4100`, wallet: 3, percent: 100 },
{ name: `sellwallet525`, wallet: 4, percent: 25 }, { name: `sellwallet550`, wallet: 4, percent: 50 }, { name: `sellwallet575`, wallet: 4, percent: 75 }, { name: `sellwallet5100`, wallet: 4, percent: 100 },]

for (let i = 0; i < data4.length; i++) {
    bot.action(data4[i].name, async (ctx) => {
        try {
            const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
            const splittedMessage = ctx.callbackQuery.message.text.split(`
`)
            const chain = getHiddenData(ctx.callbackQuery.message, 0)
            const buyGas = getHiddenData(ctx.callbackQuery.message, 1)
            const sellGas = getHiddenData(ctx.callbackQuery.message, 2)
            const buyFee = getHiddenData(ctx.callbackQuery.message, 3)
            const sellFee = getHiddenData(ctx.callbackQuery.message, 4)
            const pairwith = getHiddenData(ctx.callbackQuery.message, 5)
            const tokendecimals = getHiddenData(ctx.callbackQuery.message, 6)
            const pair = getHiddenData(ctx.callbackQuery.message, 7)
            const isv3pair = getHiddenData(ctx.callbackQuery.message, 8)
            const fee = getHiddenData(ctx.callbackQuery.message, 9)
            const tokenSymbol = getHiddenData(ctx.callbackQuery.message, 10)
            const maxBuy = getHiddenData(ctx.callbackQuery.message, 11)
            const maxSell = getHiddenData(ctx.callbackQuery.message, 12)
            const balance1 = getHiddenData(ctx.callbackQuery.message, 13)
            const balance2 = getHiddenData(ctx.callbackQuery.message, 14)
            const balance3 = getHiddenData(ctx.callbackQuery.message, 15)
            const balance4 = getHiddenData(ctx.callbackQuery.message, 16)
            const balance5 = getHiddenData(ctx.callbackQuery.message, 17)
            const balances = [balance1, balance2, balance3, balance4, balance5]
            const tokensToSell = new BigNumber(balances[data4[i].wallet]).dividedBy(100).multipliedBy(data4[i].percent).toFixed(0)
            const chainInfo = await chainInfoSchema.findOne({ chain: chain })
            const provider = getProviderByChain(chain)
            if (buyFee > userinfo.maxbuytax || sellFee > userinfo.maxselltax) {
                await ctx.reply(`ℹ️ According to your settings, your max tax is less than the token tax at the moment. Did you missclicked?`).catch()
                const message = await ctx.reply(`📶 Loading your settings...`).catch()
                return editBuySettings(ctx, message.message_id)
            }
            let walletToSell = { privatekey: userinfo.privatekeys[data4[i].wallet], balance: 0 }
            let signerWallet = new ethers.Wallet(walletToSell.privatekey, getProviderByChain(chain))
            walletToSell.balance = Number(String(await provider.getBalance(signerWallet.address)))
            const gwei = chainInfo.gwei
            const sellGasPrice = getGasPrice(sellGas, gwei + userinfo.sellgwei)
            if (new BigNumber(walletToSell.balance).gt(Number(sellGasPrice) / 10 * 12)) {
                let tx
                let path
                let fee1
                let fee2
                const wrappedCoin = getWrappedCoinByChain(chain)
                if (pairwith !== '0x0000000000000000000000000000000000000000') {
                    path = [splittedMessage[1], pairwith, wrappedCoin]
                    fee1 = 500
                    fee2 = fee
                } else {
                    path = [splittedMessage[1], wrappedCoin]
                    fee1 = fee
                    fee2 = 500
                }
                const amountOut = await getAmountOut(path, tokensToSell, isv3pair, fee, chain)
                const amountOutMin = new BigNumber(amountOut).dividedBy(100).multipliedBy((100 - sellFee - Number(userinfo.sellslippage))).toFixed(0)
                const normAmountOutMin = stringTg(customToFixed(new BigNumber(amountOutMin).dividedBy(getDividerByDecimals(18)).toFixed()).toLocaleString())
                const normAmountIn = stringTg(customToFixed(new BigNumber(tokensToSell).dividedBy(getDividerByDecimals(tokendecimals)).toFixed()).toLocaleString())
                const signerdelugeRouter = new ethers.Contract(getRouterAddressByChain(chain), delugerouter, signerWallet)
                if (isv3pair !== 'false') {
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV3(fee1, fee2, tokensToSell, amountOutMin, path, 0))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletToSell.balance)) {
                        return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV3(fee1, fee2, tokensToSell, amountOutMin, path, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.sellgwei) * 1000000000).toFixed(0) })
                } else {
                    const estimate = String(await signerdelugeRouter.estimateGas.tradeV2(splittedMessage[1], wrappedCoin, tokensToSell, amountOutMin, pairwith, 0))
                    if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.sellgwei).toFixed(0))).gt(walletToSell.balance)) {
                        return await ctx.reply(`🔴 Not enough funds on your wallet #${data4[i].wallet + 1} to send the sell transaction, please top up your wallet and try again.`).catch()
                    }
                    tx = await signerdelugeRouter.tradeV2(splittedMessage[1], wrappedCoin, tokensToSell, amountOutMin, pairwith, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.sellgwei) * 1000000000).toFixed(0) })
                }
                const message = await ctx.reply(`🟡 Your transaction sent:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                    parse_mode: 'MarkdownV2'
                }).catch()
                try {
                    tx.wait().then(async () => {
                        try {
                            await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                                parse_mode: 'MarkdownV2', reply_markup: {
                                    inline_keyboard: [
                                        [{ text: `OK`, callback_data: 'closemenu' }]
                                    ]
                                }
                            }).catch()
                            const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
                            editTokenBuyMenu(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                            await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                        } catch { }
                    })
                } catch {
                    try {
                        await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🔴 Your transaction failed:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                    } catch { }
                }

                await ctx.answerCbQuery().catch()
            } else {
                await ctx.reply(`ℹ️ Your wallets don't have enough to pay gas fee!`).catch()
                const message = await ctx.reply(`📶 Loading your wallets...`).catch()
                return editWalletsSettings(ctx, message.message_id)
            }
        } catch (e) { console.log(e) }
    })
}

bot.action(`sellallwallets`, async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const splittedMessage = ctx.callbackQuery.message.text.split(`
`)
        const chain = getHiddenData(ctx.callbackQuery.message, 0)
        const buyGas = getHiddenData(ctx.callbackQuery.message, 1)
        const sellGas = getHiddenData(ctx.callbackQuery.message, 2)
        const buyFee = getHiddenData(ctx.callbackQuery.message, 3)
        const sellFee = getHiddenData(ctx.callbackQuery.message, 4)
        const pairwith = getHiddenData(ctx.callbackQuery.message, 5)
        const tokendecimals = getHiddenData(ctx.callbackQuery.message, 6)
        const pair = getHiddenData(ctx.callbackQuery.message, 7)
        const isv3pair = getHiddenData(ctx.callbackQuery.message, 8)
        const fee = getHiddenData(ctx.callbackQuery.message, 9)
        const tokenSymbol = getHiddenData(ctx.callbackQuery.message, 10)
        const maxBuy = getHiddenData(ctx.callbackQuery.message, 11)
        const maxSell = getHiddenData(ctx.callbackQuery.message, 12)
        const balance1 = getHiddenData(ctx.callbackQuery.message, 13)
        const balance2 = getHiddenData(ctx.callbackQuery.message, 14)
        const balance3 = getHiddenData(ctx.callbackQuery.message, 15)
        const balance4 = getHiddenData(ctx.callbackQuery.message, 16)
        const balance5 = getHiddenData(ctx.callbackQuery.message, 17)
        const balances = [balance1, balance2, balance3, balance4, balance5]
        const chainInfo = await chainInfoSchema.findOne({ chain: chain })
        const provider = getProviderByChain(chain)
        if (buyFee > userinfo.maxbuytax || sellFee > userinfo.maxselltax) {
            await ctx.reply(`ℹ️ According to your settings, your max tax is less than the token tax at the moment. Did you missclicked?`).catch()
            const message = await ctx.reply(`📶 Loading your settings...`).catch()
            return editBuySettings(ctx, message.message_id)
        }
        const gwei = chainInfo.gwei
        const sellGasPrice = Number(getGasPrice(sellGas, gwei + userinfo.sellgwei)) / 10 * 12
        const coinName = getCoinNameByChain(chain)
        let walletsToCheckBalance = userinfo.privatekeys
        let walletsToSell = []
        for (let i = 0; i < walletsToCheckBalance.length; i++) {
            if (balances[i] == 0) continue
            let signerWallet = new ethers.Wallet(walletsToCheckBalance[i], getProviderByChain(chain))
            const balance = Number(String(await provider.getBalance(signerWallet.address)))
            if (balance > sellGasPrice) {
                walletsToSell.push({ balance: balance, privatekey: walletsToCheckBalance[i], toSell: balances[i] })
            } else {
                const dif = new BigNumber(balance).minus(sellGasPrice).plus(1000000000000000).toFixed(0)
                const topup = ethers.utils.parseUnits(dif, 'wei')
                await ctx.reply(`Your wallet #${i + 1} has not enough ${coinName} balance to send transaction, please top it up with ${topup} ${coinName} to be sure it is enough to pay gas fees.`).catch()
            }
        }
        for (let i = 0; i < walletsToSell.length; i++) {
            const signerWallet = new ethers.Wallet(walletsToSell[i].privatekey, getProviderByChain(chain))
            const tokensToSell = walletsToSell[i].toSell
            let tx
            let path
            let fee1
            let fee2
            const wrappedCoin = getWrappedCoinByChain(chain)
            if (pairwith !== '0x0000000000000000000000000000000000000000') {
                path = [splittedMessage[1], pairwith, wrappedCoin]
                fee1 = 500
                fee2 = fee
            } else {
                path = [splittedMessage[1], wrappedCoin]
                fee1 = fee
                fee2 = 500
            }
            const amountOut = await getAmountOut(path, tokensToSell, isv3pair, fee, chain)
            const amountOutMin = new BigNumber(amountOut).dividedBy(100).multipliedBy((100 - sellFee - Number(userinfo.sellslippage))).toFixed(0)
            const normAmountOutMin = stringTg(customToFixed(new BigNumber(amountOutMin).dividedBy(getDividerByDecimals(18)).toFixed()).toLocaleString())
            const normAmountIn = stringTg(customToFixed(new BigNumber(tokensToSell).dividedBy(getDividerByDecimals(tokendecimals)).toFixed()).toLocaleString())
            const signerdelugeRouter = new ethers.Contract(getRouterAddressByChain(chain), delugerouter, signerWallet)
            if (isv3pair !== 'false') {
                const estimate = String(await signerdelugeRouter.estimateGas.tradeV3(fee1, fee2, tokensToSell, amountOutMin, path, 0))
                if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.buygwei).toFixed(0))).gt(walletsToSell[i].balance)) {
                    return await ctxToAnswer.reply(`🔴 Not enough funds on your wallet #${i + 1} to send the buy transaction, please top up your wallet and try again.`).catch()
                }
                tx = await signerdelugeRouter.tradeV3(fee1, fee2, tokensToSell, amountOutMin, path, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.sellgwei) * 1000000000).toFixed(0) })
            } else {
                const estimate = String(await signerdelugeRouter.estimateGas.tradeV2(splittedMessage[1], wrappedCoin, tokensToSell, amountOutMin, pairwith, 0))
                if (new BigNumber(getGasPrice(Number(Number(estimate) / 10 * 12).toFixed(0), Number(chainInfo.gwei + userinfo.sellgwei).toFixed(0))).gt(walletsToSell[i].balance)) {
                    return await ctx.reply(`🔴 Not enough funds on your wallet #${data4[i].wallet + 1} to send the sell transaction, please top up your wallet and try again.`).catch()
                }
                tx = await signerdelugeRouter.tradeV2(splittedMessage[1], wrappedCoin, tokensToSell, amountOutMin, pairwith, 0, { gasLimit: Number(Number(estimate) / 10 * 12).toFixed(0), gasPrice: Number((chainInfo.gwei + userinfo.sellgwei) * 1000000000).toFixed(0) })
            }
            const message = await ctx.reply(`🟡 Your transaction sent:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                parse_mode: 'MarkdownV2'
            }).catch()
            try {
                tx.wait().then(async () => {
                    try {
                        await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                        const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(splittedMessage[1], userinfo.privatekeys)
                        editTokenBuyMenu(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                        await ctx.answerCbQuery('Monitor Successfully Refreshed.')
                    } catch { }
                })

            } catch {
                try {
                    await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🔴 Your transaction failed:
*Swap ${normAmountIn} ${stringTg(tokenSymbol)} for at least ${normAmountOutMin} ${getCoinNameByChain(chain)}\\.*

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                        parse_mode: 'MarkdownV2', reply_markup: {
                            inline_keyboard: [
                                [{ text: `OK`, callback_data: 'closemenu' }]
                            ]
                        }
                    }).catch()
                } catch { }
            }
        }
        await ctx.answerCbQuery().catch()
    } catch (e) { console.log(e) }
})

for (let i = 0; i < 5; i++) {
    bot.action(`sellwallet${i + 1}`, async (ctx) => {
        try {
            await ctx.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: `Sell 25% Of Wallet`, callback_data: `sellwallet${i + 1}25` }, { text: `Sell 50% Of Wallet`, callback_data: `sellwallet${i + 1}50` }],
                    [{ text: `Sell 75% Of Wallet`, callback_data: `sellwallet${i + 1}75` }, { text: `Sell 100% Of Wallet`, callback_data: `sellwallet${i + 1}100` }],
                    [{ text: `🔙 Back`, callback_data: `switchtosell` }]
                ]
            }).catch()
        } catch { }
    })
}

for (let i = 0; i < 5; i++) {
    bot.action(`deletewallet${i + 1}`, async (ctx) => {
        try {
            const chain = getHiddenData(ctx.callbackQuery.message, 0)
            if (chain == 'sol') {
                let id = { tgid: ctx.callbackQuery.from.id }
                const wallets = await userinfoSchema.findOne(id)
                wallets.solanaprivatekeys.splice(i, 1)
                await wallets.save()
            } else {
                let id = { tgid: ctx.callbackQuery.from.id }
                const wallets = await userinfoSchema.findOne(id)
                wallets.privatekeys.splice(i, 1)
                await wallets.save()
            }
            editWalletsSettings(ctx)
        } catch { }
    })
}

for (let i = 0; i < 5; i++) {
    bot.action(`isdeletewallet${i + 1}`, async (ctx) => {
        try {
            const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
            let chainstext
            if (userinfo.menuchain == 'sol') {
                chainstext = 'SOL'
            }
            else if (userinfo.menuchain == 'eth') {
                chainstext = 'ETH\\(and BNB\\)'
            } else if (userinfo.menuchain == 'bnb') {
                chainstext = 'BNB\\(and ETH\\)'
            }
            await ctx.editMessageText(`[​](https://${userinfo.menuchain}.com/)🗑 Are you sure you want to delete *Wallet \\#${i}* on *${chainstext}* chain\\?

ℹ️ Don\\'t delete wallet if you haven\\'t saved all private keys or you have money in some wallet in bot\\.`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: '🗑 Yes, I\'m Sure', callback_data: `deletewallet${i + 1}` }, { text: `🔙 Back`, callback_data: 'editwalletssettings' }]
                    ]
                }
            }).catch()
        } catch { }
    })
}

for (let i = 0; i < 5; i++) {
    bot.action(`fromwallet${i + 1}`, async (ctx) => {
        try {
            const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
            const chain = getHiddenData(ctx.callbackQuery.message, 0)
            let coinsymbol = getCoinNameByChain(chain)
            let firstline = []
            let secondline = []
            let thirdline = []
            let fourthline = []
            let fifthline = []
            let privatekeys = userinfo.privatekeys
            if (chain == 'sol') {
                privatekeys = userinfo.solanaprivatekeys
            }
            for (let x = 0; x < privatekeys.length; x++) {
                if (x == i) continue
                if (x <= 1) {
                    firstline.push({ text: `💳 To Wallet ${x + 1}`, callback_data: `towallet${x + 1}` })
                }
                else if (x > 1 && x <= 3) {
                    secondline.push({ text: `💳 To Wallet ${x + 1}`, callback_data: `towallet${x + 1}` })
                }
                else if (x > 2 && x <= 5) {
                    thirdline.push({ text: `💳 To Wallet ${x + 1}`, callback_data: `towallet${x + 1}` })
                }
            }
            await ctx.editMessageText(`[​](https://${i}.com/)[​](https://${chain}.com/)⬆️ *Transfer ${coinsymbol} To Wallet*

\`Wallet ${i + 1} \\=\\> Wallet \\?\`

Choose which wallet ${coinsymbol} will be sent to\\.`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        firstline, secondline, thirdline, fourthline, fifthline,
                        [{ text: `💳 Other Wallet`, callback_data: `tootherwallet` }],
                        [{ text: `🔙 Cancel`, callback_data: 'closemenu' }]
                    ]
                }
            }).catch()
        } catch (e) { console.log(e) }
    })
}

for (let i = 0; i < 5; i++) {
    bot.action(`towallet${i + 1}`, async (ctx) => {
        try {
            await ctx.deleteMessage().catch()
            const from = getHiddenData(ctx.callbackQuery.message, 0)
            const chain = getHiddenData(ctx.callbackQuery.message, 1)
            let coinsymbol = getCoinNameByChain(chain)
            await ctx.reply(`[​](https://${from}.com/)[​](https://${i}.com/)[​](https://${chain}.com/)⬆️ *Transfer Amount*

\`Wallet ${Number(from) + 1} \\=\\> Wallet ${i + 1}\`

Reply to this message with ${coinsymbol} amount\\.`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    force_reply: true
                }, disable_web_page_preview: true
            }).catch()
        } catch (e) { console.log(e) }
    })
}

bot.action(`tootherwallet`, async (ctx) => {
    try {
        await ctx.deleteMessage().catch()
        const from = getHiddenData(ctx.callbackQuery.message, 0)
        const chain = getHiddenData(ctx.callbackQuery.message, 1)
        let coinsymbol = getCoinNameByChain(chain)
        await ctx.reply(`[​](https://${from}.com/)[​](https://${chain}.com/)⬆️ *Transfer To Other Wallet*

\`Wallet ${Number(from) + 1} \\=\\> Wallet \\?\`

Reply to this message with the wallet to which ${coinsymbol} will be sent\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch (e) { console.log(e) }
})

async function transfer(ctx, privatekey, to, amount, chain, textForMessage) {
    try {
        if (chain == 'sol') {
            const wallet = Keypair.fromSecretKey(base58.decode(privatekey))
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(to),
                    lamports: new BigNumber(LAMPORTS_PER_SOL).multipliedBy(amount).toNumber(),
                }),
            );
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [wallet]
            )
            const message = await ctx.reply(`🟡 Your transaction sent:
\`${stringTg(textForMessage)}\`

${stringTg(`https://${getExplorerByChain(chain)}/tx/${signature}`)}`, {
                parse_mode: 'MarkdownV2'
            }).catch()
            try {
                connection.confirmTransaction({ signature: signature }, 'confirmed').then(async () => {
                    try {
                        await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
\`${stringTg(textForMessage)}\`
            
${stringTg(`https://${getExplorerByChain(chain)}/tx/${signature}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                    } catch { }
                })
            } catch {
                try {
                    await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🔴 Your transaction failed:
\`${stringTg(textForMessage)}\`

${stringTg(`https://${getExplorerByChain(chain)}/tx/${signature}`)}`, {
                        parse_mode: 'MarkdownV2', reply_markup: {
                            inline_keyboard: [
                                [{ text: `OK`, callback_data: 'closemenu' }]
                            ]
                        }
                    }).catch()
                } catch { }
            }
        } else {
            const wallet = new ethers.Wallet(privatekey, getProviderByChain(chain))
            const chainInfo = await chainInfoSchema.findOne({ chain: chain })
            const tx = await wallet.sendTransaction({
                to: to,
                value: ethers.utils.parseEther(amount),
                gasPrice: ethers.utils.parseUnits(String(chainInfo.gwei), 'gwei')
            })
            const message = await ctx.reply(`🟡 Your transaction sent:
\`${stringTg(textForMessage)}\`

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                parse_mode: 'MarkdownV2'
            }).catch()
            try {
                tx.wait().then(async () => {
                    try {
                        await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🟢 Your transaction succeed:
\`${stringTg(textForMessage)}\`
            
${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                            parse_mode: 'MarkdownV2', reply_markup: {
                                inline_keyboard: [
                                    [{ text: `OK`, callback_data: 'closemenu' }]
                                ]
                            }
                        }).catch()
                    } catch { }
                })
            } catch {
                try {
                    await bot.telegram.editMessageText(ctx.chat.id, message.message_id, 0, `🔴 Your transaction failed:
\`${stringTg(textForMessage)}\`

${stringTg(`https://${getExplorerByChain(chain)}/tx/${tx.hash}`)}`, {
                        parse_mode: 'MarkdownV2', reply_markup: {
                            inline_keyboard: [
                                [{ text: `OK`, callback_data: 'closemenu' }]
                            ]
                        }
                    }).catch()
                } catch { }
            }
        }
    } catch (e) { console.log(e) }
}



// Commands

bot.command(['panel', 'Panel'], async (ctx) => {
    try {
        const message = ctx.message
        await ctx.deleteMessage().catch()
        if (ctx.chat.type === 'private') {
            if (!await userinfoSchema.exists({ tgid: message.from.id })) {
                await userinfoSchema.create({ tgid: message.from.id })
            }
            await ctx.reply(`🖥️ *Your Settings:*`, {
                parse_mode: 'MarkdownV2', reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚙️ Tx Settings', callback_data: 'edittobuysettings' }],
                        [{ text: '💼 Manage Wallets', callback_data: 'edittomanagewallets' }]
                    ]
                }, disable_web_page_preview: true
            }).catch()
        }
    } catch (e) { console.log(e) }
}).catch()

bot.action('generatewallet', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        if (info.menuchain == 'sol') {
            if (info.solanaprivatekeys.length >= 5) {
                return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
            }
            const wallet = Keypair.generate()
            await userinfoSchema.findOneAndUpdate({ tgid: ctx.callbackQuery.from.id }, { $push: { solanaprivatekeys: base58.encode(wallet.secretKey) } })
            await ctx.reply(`🔑 Your generated wallet private key\\: \`${base58.encode(wallet.secretKey)}\`

ℹ️ Keep it in a safe place and don't tell or show it to anyone\\.`, { parse_mode: 'MarkdownV2', }).catch()
        } else {
            if (info.privatekeys.length >= 5) {
                return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
            }
            const newWallet = ethers.Wallet.createRandom({ extraEntropy: 65194326 })
            await userinfoSchema.findOneAndUpdate({ tgid: ctx.callbackQuery.from.id }, { $push: { privatekeys: newWallet.privateKey } })
            await ctx.reply(`🔑 Your generated wallet private key\\: \`${newWallet.privateKey}\`

ℹ️ Keep it in a safe place and don't tell or show it to anyone\\.`, { parse_mode: 'MarkdownV2', }).catch()
        }
        editWalletsSettings(ctx)
    } catch { }
}).catch()

bot.action('copy_referral', async (ctx) => {
    try {
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        const privateKey = userinfo.solanaprivatekeys[0]
        const wallet = Keypair.fromSecretKey(base58.decode(privateKey))
    const message = `
Referrals!

Your Solana reflink: https://t.me/solbuyxbot?start=${wallet.publicKey.toString()}

Refer your friends and earn 10% of their fees forever!
    
Happy Referring!`;
    ctx.reply(message);
    } catch (error) {
        console.log(error)
    }
    
})

bot.action('importwallet', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        if (info.menuchain == 'sol') {
            if (info.solanaprivatekeys.length >= 5) {
                return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
            }
        } else {
            if (info.privatekeys.length >= 5) {
                return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
            }
        }
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*📥 Import Wallet*

To import a wallet\\, reply to this message with a private key\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('transfereth', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const userinfo = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        let coinsymbol = getCoinNameByChain(userinfo.menuchain)
        let firstline = []
        let secondline = []
        let thirdline = []
        let fourthline = []
        let fifthline = []
        let privatekeys = userinfo.privatekeys
        if (userinfo.menuchain == 'sol') {
            privatekeys = userinfo.solanaprivatekeys
        }
        for (let i = 0; i < privatekeys.length; i++) {
            if (i <= 1) {
                firstline.push({ text: `💳 From Wallet ${i + 1}`, callback_data: `fromwallet${i + 1}` })
            }
            else if (i > 1 && i <= 3) {
                secondline.push({ text: `💳 From Wallet ${i + 1}`, callback_data: `fromwallet${i + 1}` })
            }
            else if (i > 2 && i <= 5) {
                thirdline.push({ text: `💳 From Wallet ${i + 1}`, callback_data: `fromwallet${i + 1}` })
            }
        }
        await ctx.reply(`[​](https://${userinfo.menuchain}.com/)⬆️ *Transfer ${coinsymbol} From Wallet*

Choose which wallet ${coinsymbol} will be sent from\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                inline_keyboard: [
                    firstline, secondline, thirdline, fourthline, fifthline,
                    [{ text: `🔙 Cancel`, callback_data: 'closemenu' }]
                ]
            }, disable_web_page_preview: true
        }).catch()
    } catch (e) { console.log(e) }
}).catch()

bot.action('editbuygwei', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*⛽️ Edit Buy Gwei*

To edit buy gwei\\, reply to this message with a number that will be added to the default gwei on the network to speed up the transaction\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editsellgwei', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*⛽️ Edit Sell Gwei*

To edit sell gwei\\, reply to this message with a number that will be added to the default gwei on the network to speed up the transaction\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editapprovegwei', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*⛽️ Edit Approve Gwei*

To edit approve gwei\\, reply to this message with a number that will be added to the default gwei on the network to speed up the transaction\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editbuyslippage', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*🧊 Edit Buy Slippage*

To edit buy slippage\\, reply to this message with a number in % to be used as slippage in buy transactions\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editmaxbuytax', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*📛 Edit Max Buy Tax*

To edit max buy tax\\, reply to this message with a number in % to be used as the maximum allowable buy tax\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editmaxselltax', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*📛 Edit Max Sell Tax*

To edit max sell tax\\, reply to this message with a number in % to be used as the maximum allowable sell tax\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()

bot.action('editsellslippage', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            return
        }
        await ctx.answerCbQuery().catch()
        const info = await userinfoSchema.findOne({ tgid: ctx.callbackQuery.from.id })
        await ctx.reply(`[​](https://${ctx.callbackQuery.message.message_id}.com/)*🧊 Edit Sell Slippage*

To edit sell slippage\\, reply to this message with a number in % to be used as slippage in sell transactions\\.`, {
            parse_mode: 'MarkdownV2', reply_markup: {
                force_reply: true
            }, disable_web_page_preview: true
        }).catch()
    } catch { }
}).catch()




// BuyBot Actions

bot.action('closemenu', async (ctx) => {
    try {
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            if (!await ifAdmin(ctx)) {
                return
            }
        }
        await ctx.deleteMessage().catch()
    } catch { }
}).catch()



bot.on('text', async (ctx) => {
    try {
        const isAdmin = await ifAdmin(ctx)
        const message = ctx.message
        let text = message.text
        let id
        if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
            if (!isAdmin) {
                return
            }
            id = { tgid: ctx.message.chat.id }
        }
        else if (ctx.chat.type === 'private') {
            const userinfo = await userinfoSchema.findOne({ tgid: ctx.message.from.id })
            id = { adminid: ctx.message.from.id }
            if (message?.reply_to_message?.from?.username === 'solbuyxbot') {
                if (message.reply_to_message.text.startsWith('​📥 Import Wallet')) {
                    let privatekey
                    const userinfo = await userinfoSchema.findOne({ tgid: ctx.message.from.id })
                    if (text.length === 64) {
                        privatekey = '0x' + text
                        if (userinfo.privatekeys.length >= 5) {
                            return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
                        }
                        for (let i = 0; i < userinfo.privatekeys.length; i++) {
                            if (userinfo.privatekeys[i] === privatekey) {
                                return await ctx.reply('❗️ This wallet has already been imported.').catch()
                            }
                        }
                        await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { $push: { privatekeys: privatekey } })
                    } else if (text.length === 66 && text.startsWith('0x')) {
                        privatekey = text
                        if (userinfo.privatekeys.length >= 5) {
                            return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
                        }
                        for (let i = 0; i < userinfo.privatekeys.length; i++) {
                            if (userinfo.privatekeys[i] === privatekey) {
                                return await ctx.reply('❗️ This wallet has already been imported.').catch()
                            }
                        }
                        await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { $push: { privatekeys: privatekey } })
                    } else if (text.length > 85 && text.length < 91 && !text.startsWith('0x')) {
                        try {
                            Keypair.fromSecretKey(base58.decode(text))
                            privatekey = text
                            if (userinfo.solanaprivatekeys.length >= 5) {
                                return await ctx.reply('❗️ Maximum number of wallets: 5.').catch()
                            }
                            for (let i = 0; i < userinfo.solanaprivatekeys.length; i++) {
                                if (userinfo.solanaprivatekeys[i] === privatekey) {
                                    return await ctx.reply('❗️ This wallet has already been imported.').catch()
                                }
                            }
                            await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { $push: { solanaprivatekeys: privatekey } })
                        } catch {
                            return await ctx.reply('❗️ Incorrect privatekey format.').catch()
                        }
                    } else {
                        return await ctx.reply('❗️ Incorrect privatekey format.').catch()
                    }
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editWalletsSettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​⛽️ Edit Buy Gwei')) {
                    if (Number(text) > 1000 || Number(text) < 0) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { buygwei: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​⛽️ Edit Sell Gwei')) {
                    if (Number(text) > 100 || Number(text) < 0) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { sellgwei: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​⛽️ Edit Approve Gwei')) {
                    if (Number(text) > 100 || Number(text) < 0) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { approvegwei: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​🧊 Edit Buy Slippage')) {
                    if (Number(text) > 100 || Number(text) < 1) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { buyslippage: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​🧊 Edit Sell Slippage')) {
                    if (Number(text) > 100 || Number(text) < 1) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { sellslippage: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​📛 Edit Max Buy Tax')) {
                    if (Number(text) > 99 || Number(text) < 1) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { maxbuytax: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​📛 Edit Max Sell Tax')) {
                    if (Number(text) > 99 || Number(text) < 1) {
                        return
                    }
                    await userinfoSchema.findOneAndUpdate({ tgid: ctx.message.from.id }, { maxselltax: Number(text) })
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    editBuySettings(ctx, getMenuMessageId(ctx))
                } else if (message.reply_to_message.text.startsWith('​​​​​​​​​​​​​​​​​​​​⚙️ Buy Exact ETH/BNB')) {
                    if (Number(text) < 0.0001) return
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    const numberOfWallets = getHiddenData(message.reply_to_message, 19)
                    const idToChange = getHiddenData(message.reply_to_message, 18)
                    buyToken(ctx, message.reply_to_message, String(text), ctx.message.from.id, idToChange, Number(numberOfWallets))
                } else if (message.reply_to_message.text.startsWith('​​​​​​​​​​​​​​​​​​​​⚙️ Buy Exact Tokens')) {
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    let out
                    if (text.endsWith('%')) {
                        text = text.substring(0, text.length - 1)
                        const splittedMessage = message.reply_to_message.text.split(`
`)
                        const chain = getHiddenData(message.reply_to_message, 0)
                        const token = new ethers.Contract(splittedMessage[1], contractABI, getProviderByChain(chain))
                        const supply = String(await token.totalSupply())
                        out = new BigNumber(supply).dividedBy(100).multipliedBy(text).toFixed(0)
                    } else {
                        const tokendecimals = getHiddenData(message.reply_to_message, 6)
                        out = new BigNumber(text).multipliedBy(getDividerByDecimals(tokendecimals)).toFixed(0)
                    }
                    const numberOfWallets = getHiddenData(message.reply_to_message, 19)
                    const idToChange = getHiddenData(message.reply_to_message, 18)
                    buyExactToken(ctx, message.reply_to_message, out, ctx.message.from.id, idToChange, Number(numberOfWallets))
                } else if (message.reply_to_message.text.startsWith('​​⬆️ Transfer To Other Wallet')) {
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    if ((text.length < 32 || text.length > 45) && (!text.startsWith('0x') || text.length !== 42)) return await ctx.reply('❗️ Incorrect address\\.', { parse_mode: 'MarkdownV2' }).catch()
                    const from = getHiddenData(ctx.message.reply_to_message, 0)
                    const chain = getHiddenData(ctx.message.reply_to_message, 1)
                    let coinsymbol = getCoinNameByChain(chain)
                    const to = text
                    ctx.session = to
                    await ctx.reply(`[​](https://${from}.com/)[​](https://${to}.com)[​](https://${chain}.com/)⬆️ *Transfer Amount*

\`Wallet ${Number(from) + 1} \\=\\> ${to}\`
                    
Reply to this message with ${coinsymbol} amount\\.`, {
                        parse_mode: 'MarkdownV2', reply_markup: {
                            force_reply: true
                        }, disable_web_page_preview: true
                    }).catch()
                } else if (message.reply_to_message.text.startsWith('​​​⬆️ Transfer Amount')) {
                    if (Number(text) > 1000 || Number(text) <= 0) {
                        return
                    }
                    await ctx.deleteMessage(message.reply_to_message.message_id).catch()
                    await ctx.deleteMessage().catch()
                    const from = getHiddenData(ctx.message.reply_to_message, 0)
                    const to = getHiddenData(ctx.message.reply_to_message, 1)
                    const chain = getHiddenData(ctx.message.reply_to_message, 2)
                    const coinsymbol = getCoinNameByChain(chain)
                    let privatekey = userinfo.privatekeys[from]
                    if (chain == 'sol') {
                        privatekey = userinfo.solanaprivatekeys[from]
                    }
                    let toaddress
                    let toAddressText
                    if (chain == 'sol') {
                        if (String(to).length < 32) {
                            const wallet = Keypair.fromSecretKey(base58.decode(userinfo.solanaprivatekeys[to]))
                            toaddress = wallet.publicKey.toString()
                            toAddressText = `Wallet ${Number(to) + 1}`
                        } else {
                            toaddress = ctx.session
                            toAddressText = ctx.session
                        }
                    } else {
                        if (String(to).length != 42) {
                            const wallet = new ethers.Wallet(userinfo.privatekeys[to])
                            toaddress = wallet.address
                            toAddressText = `Wallet ${Number(to) + 1}`
                        } else {
                            toaddress = to
                            toAddressText = to
                        }
                    }
                    const textForMessage = `Transfer ${text} ${coinsymbol} from Wallet ${Number(from) + 1} to ${toAddressText}.`
                    await transfer(ctx, privatekey, toaddress, text, chain, textForMessage)
                }
            } else {
                if (text.startsWith('0x') && text.length === 42) {
                    if (!await userinfoSchema.exists({ tgid: ctx.message.from.id })) {
                        await userinfoSchema.create({ tgid: ctx.message.from.id })
                    }
                    const userinfo = await userinfoSchema.findOne({ tgid: ctx.message.from.id })
                    if (!userinfo.privatekeys) {
                        await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
                    } else {
                        const message = await ctx.reply('📶 Loading token info...').catch()
                        await ctx.pinChatMessage(message.message_id)
                        const { address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee } = await getTokenInfo(text, userinfo.privatekeys)
                        editTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, contractBalance, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, maxBuy, maxSell, buyFee, sellFee, buyGas, sellGas, gwei, pairwith, isv3pair, fee, undefined)
                        verifyUserMonitors(message.chat.id)
                        let chain
                        if (gwei == 3) {
                            chain = 'bnb'
                        } else {
                            chain = 'eth'
                        }
                        await openMonitorsSchema.create({ tokenaddress: address, chain: chain, chatid: message.chat.id, messageid: message.message_id, openedat: Date.now(), userid: ctx.message.from.id })
                    }
                }else if (text.length > 32 && text.length < 45) {
                    if (!await userinfoSchema.exists({ tgid: ctx.message.from.id })) {
                        await userinfoSchema.create({ tgid: ctx.message.from.id })
                    }
                    const userinfo = await userinfoSchema.findOne({ tgid: ctx.message.from.id })
                    if (!userinfo.solanaprivatekeys) {
                        await ctx.reply('❗️ You need to add at least 1 wallet to buy tokens.').catch()
                    } else {
                        const message = await ctx.reply('📶 Loading token info...').catch()
                        await ctx.pinChatMessage(message.message_id)
                        const { address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith } = await getSolanaTokenInfo(text, userinfo.solanaprivatekeys)
                        editSolanaTokenBuyMenu(message.chat.id, message.message_id, address, pair, name, symbol, balances, price, coinprice, tokendecimals, coindecimals, coinsymbol, explorer, chart, totalSupply, pairwith, undefined)
                        verifyUserMonitors(message.chat.id)
                        await openMonitorsSchema.create({ tokenaddress: address, chain: 'sol', chatid: message.chat.id, messageid: message.message_id, openedat: Date.now(), userid: ctx.message.from.id })
                    }
                }
            }
        }
    } catch (e) { console.log(e) }
}).catch()

bot.launch({ dropPendingUpdates: true }).catch()