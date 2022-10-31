/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address, ethereum } from '@graphprotocol/graph-ts'
import { Position, Pool } from '@uniswap/v3-sdk'
import { Transaction } from '../types/schema'
import {
    PRICEORACLE_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    WETH9,
    USDC,
    WETH_INT,
    WETH_DECIMAL,
    USDC_DECIMAL,
    ZERO_BD,
    ONE_BD,
    ADDRESS_ZERO
} from './constants'
import { PriceOracle } from '../types/templates/XXXFund2/PriceOracle'
import { NonfungiblePositionManager } from '../types/templates/XXXFund2/NonfungiblePositionManager'
import { XXXFund2 } from '../types/templates/XXXFund2/XXXFund2'

export function getPriceETH(token: Address, amountIn: BigInt, weth: Address): BigDecimal {
    const priceOracle = PriceOracle.bind(Address.fromString(PRICEORACLE_ADDRESS))
    const tokenPriceInETH = priceOracle.getPriceETH(token, amountIn, weth)
    const deTokenPriceInETH = new BigDecimal(tokenPriceInETH).div(WETH_DECIMAL)
    return deTokenPriceInETH
}

export function getPriceUSD(token: Address, amountIn: BigInt, usd: Address): BigDecimal {
    const priceOracle = PriceOracle.bind(Address.fromString(PRICEORACLE_ADDRESS))
    const tokenPriceInUSD = priceOracle.getPriceUSD(token, amountIn, usd)
    const deTokenPriceInUSD = new BigDecimal(tokenPriceInUSD).div(USDC_DECIMAL)
    return deTokenPriceInUSD
}

export function getInvestorTvlETH(fund: Address, investor: Address): BigDecimal {
    const priceOracle = PriceOracle.bind(Address.fromString(PRICEORACLE_ADDRESS))
    const nonfungiblePositionManager = NonfungiblePositionManager.bind(Address.fromString(NONFUNGIBLE_POSITION_MANAGER_ADDRESS))
    const xxxFund2 = XXXFund2.bind(fund)

    const investorTvlETH = ZERO_BD

    // not liquidity volume
    const investorTokens = xxxFund2.getInvestorTokens(investor)
    for (let i=0; i<investorTokens.length; i++) {
        const token = investorTokens[i]
        const tokenAddress = token.tokenAddress
        const amount = token.amount
        const tokenVolumeETH = priceOracle.getPriceETH(tokenAddress, amount, Address.fromString(WETH9))
        const deTokenVolumeETH = BigDecimal.fromString(tokenVolumeETH.toString())
        investorTvlETH.plus(deTokenVolumeETH)
    }

    // liquidity volume
    const investorTokenIds = xxxFund2.getPositionTokenIds(investor)
    for (let i=0; i<investorTokenIds.length; i++) {
        const tokenId = investorTokenIds[i]
        const positionInfo = nonfungiblePositionManager.positions(tokenId)
        const token0 = positionInfo.getToken0()
        const token1 = positionInfo.getToken1()
        const feeAmount = positionInfo.getFee()
        const liquidity = positionInfo.getLiquidity()
        const tickLower = positionInfo.getTickLower()
        const tickUpper = positionInfo.getTickUpper()
        
        //get token amount , token address
        //get price of token

        // construct Position from details returned
        const [poolState, pool] = usePool(token0 ?? undefined, token1 ?? undefined, feeAmount)
        const position = new Position({ pool, liquidity: liquidity.toString(), tickLower, tickUpper })

        const tokenVolumeETH = priceOracle.getPriceETH(tokenAddress, amount, Address.fromString(WETH9))
        const deTokenVolumeETH = BigDecimal.fromString(tokenVolumeETH.toString())
        investorTvlETH.plus(deTokenVolumeETH)
    }

    return investorTvlETH.div(WETH_DECIMAL)
}

export function getManagerFeeTvlETH(fund: Address): BigDecimal {
    const priceOracle = PriceOracle.bind(Address.fromString(PRICEORACLE_ADDRESS))
    const xxxFund2 = XXXFund2.bind(fund)
    const feeTokens = xxxFund2.getFeeTokens()

    const feeTvlETH = ZERO_BD
    for (let i=0; i<feeTokens.length; i++) {
        const token = feeTokens[i]
        const tokenAddress = token.tokenAddress
        const amount = token.amount
        const tokenVolumeETH = priceOracle.getPriceETH(tokenAddress, amount, Address.fromString(WETH9))
        const deTokenVolumeETH = BigDecimal.fromString(tokenVolumeETH.toString())
        feeTvlETH.plus(deTokenVolumeETH)
    }
    return feeTvlETH.div(WETH_DECIMAL)
}