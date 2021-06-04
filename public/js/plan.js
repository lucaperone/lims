import { welcome, getData, getFilter } from "./utils.js"

const state = {
	SR50: [],
	SR100: [],
	PE50: [],
	PE100: [],
}

const idToTitle = {
	SR50: "Single Read 50",
	SR100: "Single Read 100",
	PE50: "Paired-end Reads 50",
	PE100: "Paired-end Reads 100",
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
	updateState()
}

function updateState() {
	for (const runtype of Object.keys(state)) {
		state[runtype] = $(`#${runtype} .run-plan`).sortable("toArray")
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
		$("#runs .row").append(`
			<div id="${runtype}" class="col-6 pools-col">
				<h4 class="text-center mb-3">${idToTitle[runtype]}</h4>
				<div class="run-container">
					<div class="run-ui"></div>
					<div class="run-plan" data-runtype="${runtype}"></div>
				</div>
			</div>
		`)

		if (spiked()) {
			$("#spikes-title, #spikes").removeClass("d-none")
			$("#runs .row").addClass("spiked")
			$("#runs .row").append(`
				<div id="${runtype}-spikes" class="col-6 spikes-col">
					<h4 class="text-center mb-3">${runtype} Spikes</h4>
					<div class="run-container" data-runtype="${runtype}">
					</div>
				</div>
			`)
		}

		for (let lane = 1; lane <= 8; lane++) {
			$(`#${runtype} .run-ui`).append(`
				<div class="lane-row lane-${lane}">
					<div class="lane-number"><span>${lane}</span></div>
					<div class="placeholder"></div>
				</div>
			`)

			if (spiked()) {
				$(`#${runtype}-spikes .run-container`).append(`
					<div class="lane-row lane-${lane}">
						<div class="lane-number"><span>${lane}</span></div>
						<div class="spikes-container"></div>
					</div>
				`)
			}
		}
	}
}

$(function () {
	$("#load").click((_) => loadData())
	$("#auto").click((_) => placePools())
	$("#reset").click((_) => location.reload())

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
