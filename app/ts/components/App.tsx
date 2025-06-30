import { computed, Signal } from '@preact/signals'
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
const repMintedInA = computed(() => auctionEfficiencyPercentA.value === 0 ? 0 : (cashNeededInA.value * cashPrice.value * 100 / auctionEfficiencyPercentA.value) / repPrice.value)
const repMintedInB = computed(() => auctionEfficiencyPercentB.value === 0 ? 0 : (cashNeededInB.value * cashPrice.value * 100 / auctionEfficiencyPercentB.value) / repPrice.value)

const preForkMigratorValueA = computed(() => repPrice.value * repMigratedToA.value)
const preForkMigratorValueB = computed(() => repPrice.value * repMigratedToB.value)
const postForkRepSupplyA = computed(() => repMigratedToA.value + repMintedInA.value)
const postForkRepSupplyB = computed(() => repMigratedToB.value + repMintedInB.value)
const postForkRepPriceA = computed(() => repCap.value * postForkRepValuePercentA.value / postForkRepSupplyA.value / 100)
const postForkRepPriceB = computed(() => repCap.value * postForkRepValuePercentB.value / postForkRepSupplyB.value / 100)
const postForkMigratorValueA = computed(() => postForkRepPriceA.value * repMigratedToA.value + (isAttackingA.value ? postForkCashHolderValueA.value : 0))
const postForkMigratorValueB = computed(() => postForkRepPriceB.value * repMigratedToB.value + (isAttackingB.value ? postForkCashHolderValueB.value : 0))
const repMigratorValueChangeA = computed(() => postForkMigratorValueA.value - preForkMigratorValueA.value)
const repMigratorValueChangeB = computed(() => postForkMigratorValueB.value - preForkMigratorValueB.value)

const preForkMigratorValueAsleep = computed(() => repPrice.value * repUnmigrated.value)
const postForkMigratorValueAsleep = computed(() => cashUnmigrated.value * cashPrice.value)
const repMigratorValueChangeAsleep = computed(() => postForkMigratorValueAsleep.value - preForkMigratorValueAsleep.value)

const preForkCashHolderValue = computed(() => cashSupply.value * cashPrice.value)
const postForkCashHolderValueA = computed(() => (auctionEfficiencyPercentA.value === 0 ? cashMigratedToA.value : cashSupply.value) * cashPrice.value)
const postForkCashHolderValueB = computed(() => (auctionEfficiencyPercentB.value === 0 ? cashMigratedToB.value : cashSupply.value) * cashPrice.value)
// const cashHolderValueChangeA = computed(() => postForkCashHolderValueA.value - preForkCashHolderValue.value)
// const cashHolderValueChangeB = computed(() => postForkCashHolderValueB.value - preForkCashHolderValue.value)
const postForkCashHolderValueCombined = computed(() => (isAttackingA.value ? 0 : postForkCashHolderValueA.value) + (isAttackingB.value ? 0 : postForkCashHolderValueB.value))
const cashHolderValueChangeCombined = computed(() => postForkCashHolderValueCombined.value - preForkCashHolderValue.value)

const auctionParticipantValueBeforeA = computed(() => (auctionEfficiencyPercentA.value === 0 ? 0 : cashNeededInA.value) * cashPrice.value)
const auctionParticipantValueBeforeB = computed(() => (auctionEfficiencyPercentB.value === 0 ? 0 : cashNeededInB.value) * cashPrice.value)
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
				<span style={{textAlign: 'right'}}>{postForkMigratorValueA.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{textAlign: 'right'}}>{preForkMigratorValueA.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeA.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeA.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrator Change in B:</span>
				<span style={{textAlign: 'right'}}>{postForkMigratorValueB.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{textAlign: 'right'}}>{preForkMigratorValueB.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeB.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeB.value.toFixed(3)}</span>
			</label>
			<label>
				<span>REP Migrator Change Unmigrated:</span>
				<span style={{textAlign: 'right'}}>{postForkMigratorValueAsleep.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{textAlign: 'right'}}>{preForkMigratorValueAsleep.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: repMigratorValueChangeAsleep.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{repMigratorValueChangeAsleep.value.toFixed(3)}</span>
			</label>
			<label>
				<span>CASH Change for Traders:</span>
				<span style={{textAlign: 'right'}}>{postForkCashHolderValueCombined.value.toFixed(3)}</span>
				<span>-</span>
				<span style={{textAlign: 'right'}}>{preForkCashHolderValue.value.toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: cashHolderValueChangeCombined.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{cashHolderValueChangeCombined.value.toFixed(3)}</span>
			</label>
			<label>
				<span>Auction Participant Change:</span>
				<span style={{textAlign: 'right'}}>{(auctionParticipantValueAfterA.value + auctionParticipantValueAfterB.value).toFixed(3)}</span>
				<span>-</span>
				<span style={{textAlign: 'right'}}>{(auctionParticipantValueBeforeB.value + auctionParticipantValueBeforeA.value).toFixed(3)}</span>
				<span>=</span>
				<span style={{ color: auctionParticipantGainsCombined.value >= 0 ? 'Olive' : 'Red', textAlign: 'right'}}>{auctionParticipantGainsCombined.value.toFixed(3)}</span>
			</label>
		</div>
	</main>
}
