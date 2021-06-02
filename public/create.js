import { welcome, getData, getFilter } from "./utils.js"

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

function hideRuns() {
	const filter = getFilter()
	for (const runtype of Object.keys(filter)) {
		if (!filter[runtype]) $(`#${runtype}`).remove()
	}
}

function loadData() {
	$(".pool").remove()
	getData("create")
}

function placePools() {
	$($(".pool:not(.spike-pool)").get().reverse()).each(function () {
		const run_plan = `#${$(this).data("runtype")} .run-plan`
		const pool_size = $(this).data("size")
		const current_size = idsToSizes($(run_plan).sortable("toArray")).reduce(
			(a, b) => a + b,
			0
		)

		if (current_size + pool_size <= 8 && pool_size % 1 == 0) {
			$(this).appendTo(run_plan)
		}
	})
	const runtypes = ["SR50", "SR100", "PE50", "PE100"]
	runtypes.forEach(
		(runtype) =>
			(state[runtype] = $(`#${runtype} .run-plan`).sortable("toArray"))
	)
	console.log(state)
}

function handleCompatibility(event, ui) {
	// TODO: merge with update ? in else statement
	const target_type = $(event.target).data("runtype")
	const pool_type = $(ui.item).data("runtype")
	const sender = ui.sender

	if (shouldCancel(pool_type, target_type)) {
		$(sender).sortable("cancel")
		ui.item.effect("shake")
	}
}

function handleUpdate(event, ui, source) {
	const source_type = $(source).data("runtype")
	const pool_type = $(ui.item).data("runtype")

	if (ui.sender === null) {
		if (shouldCancel(pool_type, source_type)) {
			$(source).sortable("cancel")
			ui.item.effect("shake")
		}
	} else {
		state[source_type] = $(source).sortable("toArray")
	}
}

function idsToSizes(ids) {
	return ids.map((id) => $("#" + id).data("size"))
}

function shouldCancel(pool_type, target_type) {
	if (compatibility_table[pool_type][target_type]) {
		const next_local_state = $(`#${target_type} .run-plan`).sortable(
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

function getSpikeFilter() {
	const filter = {
		SR50: false,
		SR100: false,
		PE50: false,
		PE100: false,
	}
	$("#spikes > div").each(function () {
		filter[$(this).data("runtype")] = true
	})
	console.log(filter)
	return filter
}

function generatePlanners(spike_filter) {
	for (const runtype of Object.keys(spike_filter)) {
		for (let lane = 1; lane <= 8; lane++) {
			let spike_html = ""
			if (spike_filter[runtype]) {
				spike_html = '<div class="placeholder placeholder-spike"></div>'
				$(`#${runtype}`).removeClass("col-6").addClass("col-12")
				$(`#${runtype} .run-container`).addClass("spiked")
			}
			$(`#${runtype} .run-ui`).append(`
				<div class="lane-row lane-${lane}">
					<div class="lane-number">${lane}</div>
					<div class="placeholder"></div>
					${spike_html}
				</div>
			`)
		}
	}
}

function test(event, ui) {
	const pool_type = $(ui.item).data("runtype")

	let height = 0
	console.log(pool_type)
	$(`#${pool_type} .placeholder-spike`).each(function () {
		height += $(this).outerHeight() + 5
		console.log($(this).outerHeight() + 5)
	})
	$(`#${pool_type} .run-container`).height(height)
}

$(function () {
	hideRuns()

	$("#load").click((_) => loadData())
	$("#auto").click((_) => placePools())
	// TODO : Spike
	welcome("create")
	generatePlanners(getSpikeFilter())

	$(".run-plan").sortable({
		connectWith: ".run-plan, #pools",
		cursor: "grabbing",
		receive: function (event, ui) {
			handleCompatibility(event, ui)
		},
		update: function (event, ui) {
			handleUpdate(event, ui, this)
		},
	})
	$("#pools").sortable({
		connectWith: ".run-plan",
		cursor: "grabbing",
	})

	$(".placeholder-spike").sortable({
		connectWith: ".placeholder-spike, #spikes",
		cursor: "grabbing",
		receive: function (event, ui) {
			test(event, ui)
		},
	})
	$("#spikes").sortable({
		connectWith: ".placeholder-spike",
		cursor: "grabbing",
	})
})
