/* eslint-disable prefer-const */
import { BigDecimal, Address, ethereum, Bytes } from '@graphprotocol/graph-ts'
import { Investor, InvestorSnapshot, Transaction } from '../types/schema'
import {
  ZERO_BD,
} from './constants'
import { 
  getEthPriceInUSD,
  getPriceETH,
} from './pricing'
import { ERC20 } from '../types/templates/DotoliFund/ERC20'

export function loadTransaction(event: ethereum.Event): Transaction {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
  }
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
  return transaction as Transaction
}

// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(ZERO_BD)) {
    return ZERO_BD
  } else {
    return amount0.div(amount1)
  }
}

export function getTokensCurrentETH(owner: Address, tokens: Bytes[]): BigDecimal[] {
  let tokensCurrentETH: BigDecimal[] = []
  for (let i=0; i<tokens.length; i++) {
    const balance = ERC20.bind(Address.fromBytes(tokens[i])).balanceOf(owner)
    const amountETH = getPriceETH(Address.fromBytes(tokens[i]), balance)
    tokensCurrentETH.push(amountETH)
  }
  return tokensCurrentETH
}

export function getTokensCurrentUSD(owner: Address, tokens: Bytes[]): BigDecimal[] {
  const ethPriceInUSD = getEthPriceInUSD()
  
  let tokensCurrentUSD: BigDecimal[] = []
  for (let i=0; i<tokens.length; i++) {
    const balance = ERC20.bind(Address.fromBytes(tokens[i])).balanceOf(owner)
    const amountETH = getPriceETH(Address.fromBytes(tokens[i]), balance)
    const deAmountETH = amountETH
    const amountUSD = deAmountETH.times(ethPriceInUSD)
    tokensCurrentUSD.push(amountUSD)
  }
  return tokensCurrentUSD
}