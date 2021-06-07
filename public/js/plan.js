import {
	welcome,
	getData,
	getFilter,
	generateUI,
	idToTitle,
	groupToID,
} from "./utils.js"

const state = {
	SR50: [],
	SR100: [],
	PE50: [],
	PE100: [],
}

const compatibility_table = {
	SR50: {
		SR50: true,
		SR100: true,
		PE50: true,
		PE100: true,
	},
	SR100: {
		SR50: false,
		SR100: true,
		PE50: false,
		PE100: true,
	},
	PE50: {
		SR50: false,
		SR100: false,
		PE50: true,
		PE100: true,
	},
	PE100: {
		SR50: false,
		SR100: false,
		PE50: false,
		PE100: true,
	},
}

function loadData() {
	$(".pool").remove()
	getData("plan")
}

function placePools(runtype) {
	var { error, pools } = JSON.parse(localStorage.getItem("lims-requests"))
	pools = pools
		.filter(
			(pool) => pool.run + pool.read === runtype && pool.multiplex > 0
		)
		.reverse()

	const formatted_pools = formatPools(pools)

	const plan = recursivePlacement(
		formatted_pools[0],
		formatted_pools.slice(1),
		[]
	)
	for (const pool of plan) {
		for (const id of pool.ids) {
			$(`#${id}`).appendTo(`#${runtype} .run-plan`)
		}
	}
	updateState()
}

function formatPools(pools) {
	const formatted_pools = new Array()

	var isFirstHalf = false
	for (const pool of pools) {
		var ids = [groupToID(pool.group)]
		var size = pool.lanes

		if (pool.lanes === 0.5 || isFirstHalf) {
			const next_half = findNextHalf(pools.slice(pools.indexOf(pool)) + 1)
			if (next_half === null) continue
			ids.push(groupToID(next_half.group))
			size = 1
		}
		isFirstHalf = pool.lanes === 0.5 ? !isFirstHalf : isFirstHalf

		formatted_pools.push({
			ids: ids,
			size: size,
		})
	}
	return formatted_pools
}

function findNextHalf(pools) {
	for (const pool of pools) {
		if (pool.lanes === 0.5) {
			return pool
		}
	}
	return null
}

function recursivePlacement(pool, pools, plan) {
	const new_plan = plan.slice()
	new_plan.push(pool)
	const new_plan_size = planSize(new_plan)

	if (new_plan_size > 8) {
		return plan
	}

	if (pools.length === 0 || new_plan_size === 8) {
		return new_plan
	}

	var max = new_plan_size
	var best_plan = new_plan
	for (let i = 0; i < pools.length; i++) {
		const next_plan = recursivePlacement(
			pools[i],
			pools.slice(i + 1),
			new_plan
		)
		const next_plan_size = planSize(next_plan)
		if (next_plan_size > max) {
			best_plan = next_plan
			max = next_plan_size
		}
	}
	return best_plan
}

function planSize(plan) {
	return plan.reduce((lanes_used, pool) => lanes_used + pool.size, 0)
}

function resetRun(runtype) {
	$(`#${runtype}-pools .run-plan .pool`).appendTo("#pools")
	const pools = $("#pools .pool")
		.detach()
		.sort((a, b) => $(a).data("order") - $(b).data("order"))

	$("#pools").append(pools)
}

function spiked() {
	const url = new URL(window.location.href)
	return !!url.searchParams.get("spike")
}

function generatePlanners() {
	const filter = getFilter()
	const requestedRuns = Object.keys(filter).filter(
		(runtype) => filter[runtype]
	)
	for (const runtype of requestedRuns) {
		let run_width = "6"
		let col_width = "12"
		if (spiked()) {
			run_width = "12"
			col_width = "6"
		}

		$("#runs > .row").append(
			`<div id="${runtype}" class="row col-${run_width} mb-5"></div>`
		)

		$(`#runs #${runtype}`).append(`
			<div id="${runtype}-pools" class="col-${col_width} pools-col">
				<h4 class="text-center mb-3">${idToTitle(runtype)}</h4>
				<div class="run-container">
					<div class="run-ui"></div>
					<div class="run-plan" data-runtype="${runtype}"></div>
				</div>
			</div>
		`)

		if (spiked()) {
			$("#spikes-title, #spikes").removeClass("d-none")
			$(`#runs #${runtype}`).addClass("spiked")
			$(`#runs #${runtype}`).append(`
				<div id="${runtype}-spikes" class="col-6 spikes-col">
					<h4 class="text-center mb-3">${runtype} Spikes</h4>
					<div class="run-container" data-runtype="${runtype}">
					</div>
				</div>
			`)
		}

		$(`#runs #${runtype}`).append(
			`<div class="col-12 text-center d-flex justify-content-between">
				<button id="export-${runtype}" class="btn btn-primary run-btn">Export run</button>
				<button id="auto-${runtype}" class="btn btn-success run-btn">Place pools</button>
				<button id="reset-${runtype}" class="btn btn-danger run-btn">Reset</button>
			</div>`
		)
		$(`#export-${runtype}`).click((_) => exportRun(runtype))
		$(`#auto-${runtype}`).click((_) => placePools(runtype))
		$(`#reset-${runtype}`).click((_) => resetRun(runtype))

		generateUI(runtype, spiked())
	}
}

function updateState() {
	for (const runtype of Object.keys(state)) {
		state[runtype] = $(`#${runtype}-pools .run-plan`).sortable("toArray")
	}
}

function handleCompatibility(pool, receiver, sender) {
	if (shouldCancel($(pool).data("runtype"), $(receiver).data("runtype"))) {
		$(sender).sortable("cancel")
		pool.effect("shake")
	}
}

function idsToSizes(ids) {
	return ids.map((id) => $("#" + id).data("size"))
}

function shouldCancel(pool_type, target_type) {
	if (compatibility_table[pool_type][target_type]) {
		const next_local_state = $(`#${target_type}-pools .run-plan`).sortable(
			"toArray"
		)
		const sizes = idsToSizes(next_local_state)

		if (sizes.reduce((a, b) => a + b, 0) > 8) {
			return true
		} else {
			for (let i = 0; i < sizes.length; i++) {
				if (sizes[i] % 1 != 0) {
					if (sizes[i + 1] % 1 == 0) {
						return true
					} else {
						i++
					}
				}
			}
		}
	} else {
		return true
	}

	return false
}

function exportRun(runtype) {
	localStorage.setItem(
		`${runtype}-export`,
		state[runtype].map((poolID) => idToGroup(poolID))
	)

	if (spiked()) {
		const spikes = new Array()
		for (let lane = 1; lane <= 8; lane++) {
			spikes.push(
				$(`#${runtype}-spikes .lane-${lane} .spikes-container`)
					.sortable("toArray")
					.map((spikeID) => idToGroup(spikeID))
			)
		}
		localStorage.setItem("spiked", true)
		localStorage.setItem(`${runtype}-spikes`, JSON.stringify(spikes))
	} else {
		localStorage.setItem("spiked", false)
	}

	window.open(`/export.html?runtype=${runtype}`)
}

function idToGroup(id) {
	return $(`#${id}`).data("group")
}

$(function () {
	$("#load").click((_) => loadData())

	welcome("plan")
	generatePlanners()

	$(".run-plan").sortable({
		connectWith: ".run-plan, #pools",
		cursor: "grabbing",
		update: function (event, ui) {
			if (ui.sender === null) {
				handleCompatibility(ui.item, event.target, event.target)
			}
			updateState()
		},
		receive: function (event, ui) {
			handleCompatibility(ui.item, event.target, ui.sender)
		},
		scrollSensitivity: 150,
		scrollSpeed: 150,
	})
	$("#pools").sortable({
		connectWith: ".run-plan",
		cursor: "grabbing",
		scrollSensitivity: 150,
		scrollSpeed: 150,
	})

	$(".spikes-container").sortable({
		connectWith: ".spikes-container, #spikes",
		cursor: "grabbing",
		scrollSensitivity: 150,
		scrollSpeed: 150,
	})
	$("#spikes").sortable({
		connectWith: ".spikes-container",
		cursor: "grabbing",
		scrollSensitivity: 150,
		scrollSpeed: 150,
	})
})
