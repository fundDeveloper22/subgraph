/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts'
import {
    PRICE_ORACLE_ADDRESS,
    WETH9,
    WETH_DECIMAL,
    USDC_DECIMAL,
    ZERO_BD,
    LIQUIDITY_ORACLE_ADDRESS
} from './constants'
import { PriceOracle } from '../types/templates/XXXFund2/PriceOracle'
import { LiquidityOracle  } from '../types/templates/XXXFund2/LiquidityOracle'
import { XXXFund2 } from '../types/templates/XXXFund2/XXXFund2'

export function getPriceETH(token: Address, amountIn: BigInt, weth: Address): BigDecimal {
  const priceOracle = PriceOracle.bind(Address.fromString(PRICE_ORACLE_ADDRESS))
  const tokenPriceInETH = priceOracle.getPriceETH(token, amountIn, weth)
  const deTokenPriceInETH = new BigDecimal(tokenPriceInETH).div(WETH_DECIMAL)
  return deTokenPriceInETH
}

export function getPriceUSD(token: Address, amountIn: BigInt, usd: Address): BigDecimal {
  const priceOracle = PriceOracle.bind(Address.fromString(PRICE_ORACLE_ADDRESS))
  const tokenPriceInUSD = priceOracle.getPriceUSD(token, amountIn, usd)
  const deTokenPriceInUSD = new BigDecimal(tokenPriceInUSD).div(USDC_DECIMAL)
  return deTokenPriceInUSD
}

export function getInvestorTvlETH(fund: Address, investor: Address): BigDecimal {
  const xxxFund2 = XXXFund2.bind(fund)
  const priceOracle = PriceOracle.bind(Address.fromString(PRICE_ORACLE_ADDRESS))
  const liquidityOracle = LiquidityOracle.bind(Address.fromString(LIQUIDITY_ORACLE_ADDRESS))

  let investorTvlETH = ZERO_BD

  // not liquidity volume
  const investorTokens = xxxFund2.getInvestorTokens(investor)
  for (let i=0; i<investorTokens.length; i++) {
    const tokenAddress = investorTokens[i].tokenAddress
    const amount = investorTokens[i].amount
    const amountETH = priceOracle.getPriceETH(tokenAddress, amount, Address.fromString(WETH9))
    const deAmountETH = new BigDecimal(amountETH).div(WETH_DECIMAL)
    investorTvlETH = investorTvlETH.plus(deAmountETH)
  }

  // liquidity volume
  const investorTokenIds = xxxFund2.getPositionTokenIds(investor)
  for (let i=0; i<investorTokenIds.length; i++) {
    const tokenId = investorTokenIds[i]
    const positionTokenAmount = liquidityOracle.getPositionTokenAmount(tokenId)
  
    const token0 = positionTokenAmount.getToken0()
    const token1 = positionTokenAmount.getToken1()
    const amount0 = positionTokenAmount.getAmount0()
    const amount1 = positionTokenAmount.getAmount1()

    const token0VolumeETH = priceOracle.getPriceETH(token0, amount0, Address.fromString(WETH9))
    const token1VolumeETH = priceOracle.getPriceETH(token1, amount1, Address.fromString(WETH9))
    const deVolumeETH = new BigDecimal(token0VolumeETH.plus(token1VolumeETH)).div(WETH_DECIMAL)
    investorTvlETH = investorTvlETH.plus(deVolumeETH)     
  }

  return investorTvlETH
}

export function getManagerFeeTvlETH(fund: Address): BigDecimal {
  const xxxFund2 = XXXFund2.bind(fund)
  const feeTokens = xxxFund2.getFeeTokens()

  let feeTvlETH = ZERO_BD
  for (let i=0; i<feeTokens.length; i++) {
    const token = feeTokens[i]
    const tokenAddress = token.tokenAddress
    const amount = token.amount
    const amountETH = getPriceETH(tokenAddress, amount, Address.fromString(WETH9))
    feeTvlETH = feeTvlETH.plus(amountETH)
  }
  return feeTvlETH
}