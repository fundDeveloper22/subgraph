import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  FundCreated,
  OwnerChanged,
  Subscribe as SubscribeEvent,
} from './types/XXXFactory/XXXFactory'
import { 
  Factory,
  Fund,
  Investor,
  Subscribe
} from "./types/schema"
import { 
  FACTORY_ADDRESS,
  FACTORY_OWNER,
  SWAP_ROUTER_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  ONE_BI,
  ADDRESS_ZERO
} from './utils/constants'
import { fundSnapshot, investorSnapshot, xxxfund2Snapshot } from "./utils/snapshots"
import { loadTransaction } from "./utils"
import { XXXFund2 as FundTemplate } from './types/templates'

export function handleFundCreated(event: FundCreated): void {
  // load factory
  let factory = Factory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new Factory(FACTORY_ADDRESS)
    factory.fundCount = ONE_BI
    factory.investorCount = ONE_BI
    factory.whitelistTokens = []
    factory.swapRouter = ADDRESS_ZERO
    factory.managerFee = ZERO_BI
    factory.totalVolumeETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.owner = Address.fromString(ADDRESS_ZERO)
  }

  let fund = new Fund(event.params.fund.toHexString().toUpperCase())
  fund.address = event.params.fund
  fund.createdAtTimestamp = event.block.timestamp
  fund.createdAtBlockNumber = event.block.number
  fund.manager = event.params.manager
  fund.investorCount = ONE_BI
  fund.principalETH = ZERO_BD
  fund.principalUSD = ZERO_BD
  fund.volumeETH = ZERO_BD
  fund.volumeUSD = ZERO_BD
  fund.profitETH = ZERO_BD
  fund.profitUSD = ZERO_BD
  fund.profitRatioETH = ZERO_BD
  fund.profitRatioUSD = ZERO_BD
  fund.feeVolumeETH = ZERO_BD
  fund.feeVolumeUSD = ZERO_BD

  const investorID = 
    event.params.fund.toHexString().toUpperCase()
    + '-' 
    + event.params.manager.toHexString().toUpperCase()
  let investor = Investor.load(investorID)
  
  if (investor === null) {
    investor = new Investor(investorID)
    investor.createdAtTimestamp = event.block.timestamp
    investor.createdAtBlockNumber = event.block.number
    investor.fund = event.params.fund
    investor.manager = event.params.manager
    investor.investor = event.params.manager
    investor.principalETH = ZERO_BD
    investor.principalUSD = ZERO_BD
    investor.volumeETH = ZERO_BD
    investor.volumeUSD = ZERO_BD
    investor.profitETH = ZERO_BD
    investor.profitUSD = ZERO_BD
    investor.profitRatioETH = ZERO_BD
    investor.profitRatioUSD = ZERO_BD
  }
  investor.save()
  fund.save()
  // create the tracked contract based on the template
  FundTemplate.create(event.params.fund)
  factory.save()
  investorSnapshot(
    event.params.fund,
    event.params.manager,
    event.params.manager,
    'NEWFUND',
    event
  )
  fundSnapshot(
    event.params.fund,
    event.params.manager,
    'NEWFUND',
    event
  )
  xxxfund2Snapshot(event)

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.createFund(...)
  // - contract.getFundByManager(...)
  // - contract.getManagerFee(...)
  // - contract.getSwapRouterAddress(...)
  // - contract.getWhiteListTokens(...)
  // - contract.isSubscribed(...)
  // - contract.isWhiteListToken(...)
  // - contract.owner(...)
  // - contract.subscribedFunds(...)
}

export function handleOwnerChanged(event: OwnerChanged): void {
  let factory = Factory.load(FACTORY_ADDRESS)
  if (!factory) return
  
  factory.owner = event.params.newOwner
  factory.save()
  xxxfund2Snapshot(event)
}

export function handleSubscribe(event: SubscribeEvent): void {
  let factory = Factory.load(FACTORY_ADDRESS)
  if (!factory) return

  factory.investorCount = factory.investorCount.plus(ONE_BI)

  let fund = Fund.load(event.params.fund.toHexString().toUpperCase())
  if (fund !== null) {
    fund.investorCount = fund.investorCount.plus(ONE_BI)

    const subscribeID = 
      event.params.fund.toHexString().toUpperCase() 
      + '-'
      + event.params.investor.toHexString().toUpperCase()
    let subscribe = new Subscribe(subscribeID)

    let transaction = loadTransaction(event)
    subscribe.transaction = transaction.id
    subscribe.timestamp = transaction.timestamp
    subscribe.fund = event.params.fund
    subscribe.investor = event.params.investor
    subscribe.origin = event.transaction.from
    subscribe.logIndex = event.logIndex

    const investorID = 
      event.params.fund.toHexString().toUpperCase() 
      + '-' 
      + event.params.investor.toHexString().toUpperCase()
    let investor = Investor.load(investorID)

    if (investor === null) {
      investor = new Investor(investorID)
      investor.createdAtTimestamp = event.block.timestamp
      investor.createdAtBlockNumber = event.block.number
      investor.fund = event.params.fund
      investor.manager = event.params.manager
      investor.investor = event.params.investor
      investor.principalETH = ZERO_BD
      investor.principalUSD = ZERO_BD
      investor.volumeETH = ZERO_BD
      investor.volumeUSD = ZERO_BD
      investor.profitETH = ZERO_BD
      investor.profitUSD = ZERO_BD
      investor.profitRatioETH = ZERO_BD
      investor.profitRatioUSD = ZERO_BD
    }
    investor.save()
    subscribe.save()
    fund.save()
    factory.save()
    investorSnapshot(
      event.params.fund,
      event.params.manager,
      event.params.investor,
      transaction.id,
      event
    )
    fundSnapshot(
      event.params.fund,
      event.params.manager,
      transaction.id,
      event
    )
    xxxfund2Snapshot(event)
  }
}