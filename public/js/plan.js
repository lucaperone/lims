import { welcome, getData, getFilter, generateUI, idToTitle } from "./utils.js"

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
	// $("#auto").click((_) => placePools())
	// $("#reset").click((_) => location.reload())

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
