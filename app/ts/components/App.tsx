import { batch, computed, Signal } from '@preact/signals'
import { CSSProperties } from 'preact/compat'
import { Input } from './Input.js'

const repCap = new Signal(200)
const repSupply = new Signal(200)
const repPrice = computed(() => repCap.value / repSupply.value)
const postForkRepValuePercentA = new Signal(100)
const postForkRepValuePercentB = new Signal(0)

const cashCap = new Signal(50)
const cashSupply = new Signal(50)
const cashPrice = computed(() => cashCap.value / cashSupply.value)

const isAttackingA = new Signal(false)
const isAttackingB = new Signal(true)

const auctionEfficiencyPercentA = new Signal(75)
const auctionEfficiencyPercentB = new Signal(0)

const repMigratedPercentA = new Signal(90)
const repMigratedPercentB = new Signal(10)
repMigratedPercentA.subscribe(value => {
	if (value > 100) repMigratedPercentA.value = 100
	if (value + repMigratedPercentB.value > 100) repMigratedPercentB.value = 100 - value
	if (value < 0) repMigratedPercentA.value = 0
})
repMigratedPercentB.subscribe(value => {
	if (value > 100) repMigratedPercentB.value = 100
	if (value + repMigratedPercentA.value > 100) repMigratedPercentA.value = 100 - value
	if (value < 0) repMigratedPercentB.value = 0
})
const repAsleepPercent = computed(() => 100 - (repMigratedPercentA.value + repMigratedPercentB.value))
const repMigratedToA = computed(() => repMigratedPercentA.value * repSupply.value / 100)
const repMigratedToB = computed(() => repMigratedPercentB.value * repSupply.value / 100)
const repUnmigrated = computed(() => repAsleepPercent.value * repSupply.value / 100)
const cashMigratedToA = computed(() => repMigratedPercentA.value * cashSupply.value / 100)
const cashMigratedToB = computed(() => repMigratedPercentB.value * cashSupply.value / 100)
const cashUnmigrated = computed(() => repAsleepPercent.value * cashSupply.value / 100)

const cashNeededInA = computed(() => cashSupply.value - cashMigratedToA.value)
const cashNeededInB = computed(() => cashSupply.value - cashMigratedToB.value)
const cashNeededInEthInA = computed(() => cashNeededInA.value * cashPrice.value)
const cashNeededInEthInB = computed(() => cashNeededInB.value * cashPrice.value)
const postForkRepCapA = computed(() => repCap.value * postForkRepValuePercentA.value / 100)
const postForkRepCapB = computed(() => repCap.value * postForkRepValuePercentB.value / 100)
const auctionFailureA = computed(() => cashNeededInEthInA.value * 100 / auctionEfficiencyPercentA.value >= postForkRepCapA.value)
const auctionFailureB = computed(() => cashNeededInEthInB.value * 100 / auctionEfficiencyPercentB.value >= postForkRepCapB.value)
// derived from:
// mintedRep * ethPerRepAfterMint = cashNeededInEth / autionEfficiency
// mintedRep * dcfInEth / repSupplyAfter = cashNeededInEth / autionEfficiency
// mintedRep * dcfInEth / (migratedRep + mintedRep) = cashNeededInEth / autionEfficiency
// isolate mintedRep
const repMintedInA = computed(() => auctionEfficiencyPercentA.value === 0 || auctionFailureA.value
	? repMigratedToA.value * 1000000
	: (cashNeededInEthInA.value * repMigratedToA.value / (postForkRepCapA.value * auctionEfficiencyPercentA.value / 100 - cashNeededInEthInA.value)))
const repMintedInB = computed(() => auctionEfficiencyPercentB.value === 0 || auctionFailureB.value
	? repMigratedToB.value * 1000000
	: (cashNeededInEthInB.value * repMigratedToB.value / (postForkRepCapB.value * auctionEfficiencyPercentB.value / 100- cashNeededInEthInB.value)))
const cashFromAuctionInA = computed(() => isAttackingA.value ? 0 : repMintedInA.value !== repMigratedToA.value * 1000000 ? cashNeededInA.value : postForkRepCapA.value * auctionEfficiencyPercentA.value / cashPrice.value / 100)
const cashFromAuctionInB = computed(() => isAttackingB.value ? 0 : repMintedInB.value !== repMigratedToB.value * 1000000 ? cashNeededInB.value : postForkRepCapB.value * auctionEfficiencyPercentB.value / cashPrice.value / 100)

const preForkMigratorValueA = computed(() => repPrice.value * repMigratedToA.value)
const preForkMigratorValueB = computed(() => repPrice.value * repMigratedToB.value)
const postForkRepSupplyA = computed(() => repMigratedToA.value + repMintedInA.value)
const postForkRepSupplyB = computed(() => repMigratedToB.value + repMintedInB.value)
const postForkRepPriceA = computed(() => postForkRepCapA.value / postForkRepSupplyA.value)
const postForkRepPriceB = computed(() => postForkRepCapB.value / postForkRepSupplyB.value)
const postForkMigratorValueA = computed(() => postForkRepPriceA.value * repMigratedToA.value + (isAttackingA.value ? postForkCashHolderValueA.value : 0))
const postForkMigratorValueB = computed(() => postForkRepPriceB.value * repMigratedToB.value + (isAttackingB.value ? postForkCashHolderValueB.value : 0))
const repMigratorValueChangeA = computed(() => postForkMigratorValueA.value - preForkMigratorValueA.value)
const repMigratorValueChangeB = computed(() => postForkMigratorValueB.value - preForkMigratorValueB.value)

const preForkMigratorValueAsleep = computed(() => repPrice.value * repUnmigrated.value)
const postForkMigratorValueAsleep = computed(() => cashUnmigrated.value * cashPrice.value)
const repMigratorValueChangeAsleep = computed(() => postForkMigratorValueAsleep.value - preForkMigratorValueAsleep.value)

const preForkCashHolderValue = computed(() => cashCap.value)
const postForkCashHolderValueA = computed(() => (cashMigratedToA.value + cashFromAuctionInA.value) * cashPrice.value)
const postForkCashHolderValueB = computed(() => (cashMigratedToB.value + cashFromAuctionInB.value) * cashPrice.value)
// const cashHolderValueChangeA = computed(() => postForkCashHolderValueA.value - preForkCashHolderValue.value)
// const cashHolderValueChangeB = computed(() => postForkCashHolderValueB.value - preForkCashHolderValue.value)
const postForkCashHolderValueCombined = computed(() => (isAttackingA.value ? 0 : postForkCashHolderValueA.value) + (isAttackingB.value ? 0 : postForkCashHolderValueB.value))
const cashHolderValueChangeCombined = computed(() => postForkCashHolderValueCombined.value - preForkCashHolderValue.value)

const auctionParticipantValueBeforeA = computed(() => (auctionEfficiencyPercentA.value === 0 ? 0 : cashFromAuctionInA.value) * cashPrice.value)
const auctionParticipantValueBeforeB = computed(() => (auctionEfficiencyPercentB.value === 0 ? 0 : cashFromAuctionInB.value) * cashPrice.value)
const auctionParticipantValueAfterA = computed(() => repMintedInA.value * postForkRepPriceA.value)
const auctionParticipantValueAfterB = computed(() => repMintedInB.value * postForkRepPriceB.value)
const auctionParticipantGainsA = computed(() => auctionParticipantValueAfterA.value - auctionParticipantValueBeforeA.value)
const auctionParticipantGainsB = computed(() => auctionParticipantValueAfterB.value - auctionParticipantValueBeforeB.value)
const auctionParticipantGainsCombined = computed(() => auctionParticipantGainsA.value + auctionParticipantGainsB.value)

function NumberInput(model: { value: Signal<number>, min?: number, max?: number, style?: CSSProperties }) {
	return <Input type='number' value={model.value} serialize={input => input.toString(10)} sanitize={input => input.replaceAll(/[^\d]/g, '')} tryParse={input => ({ ok: true, value: Number(input) })} min={model.min} max={model.max} style={model.style}/>
}

function PercentInput(model: { value: Signal<number>}) {
	return <span>
		<Input type='range' min={0} max={100} step={1} value={model.value} serialize={input => input.toString(10)} sanitize={input => input.replaceAll(/[^\d]/g, '')} tryParse={input => ({ ok: true, value: Number(input) })}/>
		<NumberInput value={model.value} min={0} max={100} style={{ width: '50px'}}/>
	</span>
}

export function App(_: {}) {
	return <main>
		<div id='inputs' style={{display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)'}}>
			<label>
				<span>Augur DCF:</span>
				<NumberInput value={repCap}/>
			</label>
			<label>
				<span>REP Supply:</span>
				<NumberInput value={repSupply}/>
			</label>
			<label>
				<span>REP Price:</span>
				<span>{repPrice.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Cap:</span>
				<NumberInput value={cashCap}/>
			</label>
			<label>
				<span>CASH Supply:</span>
				<NumberInput value={cashSupply}/>
			</label>
			<label>
				<span>CASH Price:</span>
				<span>{cashPrice.value.toFixed(3)}</span>
			</label>
			<label>
				<span>Universe A is Attack:</span>
				<input type='checkbox' checked={isAttackingA} onChange={value => isAttackingA.value = value.currentTarget.checked}/>
			</label>
			<label>
				<span>Universe B is Attack:</span>
				<input type='checkbox' checked={isAttackingB} onChange={value => isAttackingB.value = value.currentTarget.checked}/>
			</label>
			<label>
				<span>Augur DCF % A:</span>
				<PercentInput value={postForkRepValuePercentA}/>
			</label>
			<label>
				<span>Augur DCF % B:</span>
				<PercentInput value={postForkRepValuePercentB}/>
			</label>
			<label>
				<span>Auction Efficiency A:</span>
				<PercentInput value={auctionEfficiencyPercentA}/>
			</label>
			<label>
				<span>Auction Efficiency B:</span>
				<PercentInput value={auctionEfficiencyPercentB}/>
			</label>
			<label>
				<span>REP Migration % A:</span>
				<PercentInput value={repMigratedPercentA}/>
			</label>
			<label>
				<span>REP Migration % B:</span>
				<PercentInput value={repMigratedPercentB}/>
			</label>
			<label>
				<span>REP Unmigrated %:</span>
				<span>{repAsleepPercent.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrated to A:</span>
				<span>{repMigratedToA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrated to B:</span>
				<span>{repMigratedToB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Unmigrated:</span>
				<span>{repUnmigrated.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Migrated to A:</span>
				<span>{cashMigratedToA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Migrated to B:</span>
				<span>{cashMigratedToB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Unmigrated:</span>
				<span>{cashUnmigrated.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Needed in A:</span>
				<span>{cashNeededInA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Needed in B:</span>
				<span>{cashNeededInB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Received A:</span>
				<span>{cashFromAuctionInA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Received B:</span>
				<span>{cashFromAuctionInB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Minted in A:</span>
				<span>{repMintedInA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Minted in B:</span>
				<span>{repMintedInB.value.toFixed(3)}</span>
			</label>
		</div>
		<hr style={{width:'100%'}}/>
		<div id='outcomes' style={{display: 'grid', gridTemplateColumns: 'auto auto auto auto auto auto', gridTemplateRows: '0', marginTop: '-0.25em'}}>
			<label style={{visibility:'hidden'}}>
				<span>Placeholder for Sizing:</span>
				<span>-{(repCap.value > cashCap.value ? repCap.value : cashCap.value).toFixed(3)}</span>
				<span>-</span>
				<span>-{(repCap.value > cashCap.value ? repCap.value : cashCap.value).toFixed(3)}</span>
				<span>=</span>
				<span>-{(repCap.value > cashCap.value ? repCap.value : cashCap.value).toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrator Change in A:</span>
				<span style={{justifyContent: 'right'}}>{postForkMigratorValueA.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{justifyContent: 'right'}}>{preForkMigratorValueA.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeA.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrator Change in B:</span>
				<span style={{justifyContent: 'right'}}>{postForkMigratorValueB.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{justifyContent: 'right'}}>{preForkMigratorValueB.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeB.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrator Change Unmigrated:</span>
				<span style={{justifyContent: 'right'}}>{postForkMigratorValueAsleep.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{justifyContent: 'right'}}>{preForkMigratorValueAsleep.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeAsleep.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeAsleep.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Change for Traders:</span>
				<span style={{justifyContent: 'right'}}>{postForkCashHolderValueCombined.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{justifyContent: 'right'}}>{preForkCashHolderValue.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: cashHolderValueChangeCombined.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{cashHolderValueChangeCombined.value.toFixed(3)}</span>
			</label>
			<label>
				<span>Auction Participant Change:</span>
				<span style={{justifyContent: 'right'}}>{(auctionParticipantValueAfterA.value + auctionParticipantValueAfterB.value).toFixed(3)}</span>
				<span>-</span>
				<span style={{justifyContent: 'right'}}>{(auctionParticipantValueBeforeB.value + auctionParticipantValueBeforeA.value).toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: auctionParticipantGainsCombined.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{auctionParticipantGainsCombined.value.toFixed(3)}</span>
			</label>
		</div>
		<div style={{ margin: '10px' }}>
			<span>
				<button style={{ borderColor: 'green' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 100
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 75
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 95
					repMigratedPercentB.value = 5
				})}>Happy Path</button>
				<button style={{ borderColor: 'green' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 100
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 75
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 5
					repMigratedPercentB.value = 95
				})}>Suicidal Whale</button>
				<button style={{ borderColor: 'green' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 100
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 75
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 5
					repMigratedPercentB.value = 15
				})}>Sleepy Rep</button>
				<button style={{ borderColor: 'green' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 50
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 75
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 5
					repMigratedPercentB.value = 95
				})}>DCF Harmed</button>
			</span>
			<span>
				<button style={{ borderColor: 'red' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 100
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 5
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 5
					repMigratedPercentB.value = 95
				})}>Weak Auction</button>
				<button style={{ borderColor: 'red' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = false
					postForkRepValuePercentA.value = 50
					postForkRepValuePercentB.value = 50
					auctionEfficiencyPercentA.value = 75
					auctionEfficiencyPercentB.value = 75
					repMigratedPercentA.value = 50
					repMigratedPercentB.value = 50
				})}>Contentious Market</button>
				<button style={{ borderColor: 'red' }} onClick={() => batch(() => {
					isAttackingA.value = false
					isAttackingB.value = true
					postForkRepValuePercentA.value = 0
					postForkRepValuePercentB.value = 0
					auctionEfficiencyPercentA.value = 0
					auctionEfficiencyPercentB.value = 0
					repMigratedPercentA.value = 5
					repMigratedPercentB.value = 95
				})}>All Auctions Fail</button>
			</span>
		</div>
	</main>
}
