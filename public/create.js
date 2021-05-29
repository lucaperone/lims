import { welcome, getData } from "./utils.js"

var url_string = window.location.href
var url = new URL(url_string)

const sr50 = url.searchParams.get("sr50")
const sr100 = url.searchParams.get("sr100")
const pe50 = url.searchParams.get("pe50")
const pe100 = url.searchParams.get("pe100")

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
	if (!sr50) $("#SR50").remove()
	if (!sr100) $("#SR100").remove()
	if (!pe50) $("#PE50").remove()
	if (!pe100) $("#PE100").remove()
}

function loadData() {
	getData("create")
	$(".pool").remove()
}

function placePools() {
	$($(".pool").get().reverse()).each(function () {
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
	runtypes.forEach(function (runtype) {
		state[runtype] = $(`#${runtype} .run-plan`).sortable("toArray")
	})
}

function handleCompatibility(event, ui) {
	const target_type = $(event.target).data("runtype")
	const pool_type = $(ui.item).data("runtype")
	const sender = ui.sender

	if (shouldCancel(pool_type, target_type)) {
		$(sender).sortable("cancel")
		animateError(ui.item)
	}
}

function handleUpdate(event, ui, source) {
	const source_type = $(source).data("runtype")
	const pool_type = $(ui.item).data("runtype")

	if (ui.sender === null) {
		if (shouldCancel(pool_type, source_type)) {
			$(source).sortable("cancel")
			animateError(ui.item)
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

function animateError(pool) {
	$(pool).effect("shake")
}

$(function () {
	hideRuns()

	$("#load").click((_) => loadData())
	$("#auto").click((_) => placePools())
	// TODO : Spike
	welcome("create", {
		SR50: sr50,
		SR100: sr100,
		PE50: pe50,
		PE100: pe100,
	})

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
})
