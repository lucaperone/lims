import { generateUI, idToTitle } from "./lims-utils.js"

const url = new URL(window.location.href)
const runtype = url.searchParams.get("runtype")

const worker = html2pdf()

function formatPools() {
	const pool_names = localStorage.getItem(`${runtype}-export`).split(",")
	const { error, pools } = JSON.parse(localStorage.getItem("lims-requests"))

	return pool_names.map((pool_name) => {
		return pools.find((pool) => pool.group == pool_name)
	})
}

function generatePools(pools) {
	for (const pool of pools) {
		const libraries = pool.libraries.join(", ")
		// prettier-ignore
		$(`#${runtype}-pools .run-plan`).append(
			`<div
				class="pool ${pool.run}${pool.read}"
				style = "height: calc(${pool.lanes} * 90px - 5px)">
				
				<div><span>${pool.group}</span></div>
				<div><span class="pool-libraries"><b>${pool.libraries.length} samples:</b> ${libraries}</span></div>
				<div><span class="text-center">${pool.lab}<br />(${pool.submitter})</span></div>
				<div><span class="text-center">${pool.protocol}</span></div>
				<div><span class="pool-runtype">${pool.run} ${pool.read}</span></div>
				<div><span>${pool.ready ? "✔️" : "❌"}</span></div>
			</div>`
		)
	}
}

function generateSpikes(spikes) {
	for (let lane = 1; lane <= 8; lane++) {
		$(`.spikes-col .lane-${lane} .spikes-container`).html(
			spikes[lane - 1].join(", ")
		)
	}
}

function exportAsPDF() {
	const element = document.getElementById("export")
	const now = new Date()

	const options = {
		filename: generateFilename(now),
		jsPDF: {
			orientation: "landscape",
			unit: "mm",
			format: "a4",
			putOnlyUsedFonts: true,
		},
	}

	$("#date").html(now.toLocaleString("fr-CH"))
	html2pdf()
		.set(options)
		.from(element)
		.save()
		.then(() => $("#date").html(""))
}

function exportAsCSV(pools, spiked, spikes) {
	const data = new Array()
	data.push([
		runtype,
		"Pool",
		"Samples",
		"Laboratory",
		"Submitter",
		"Protocol",
		"Run type",
		"Lanes",
		"Ready",
		"Spikes",
		"Comments",
	])

	let lane = 1
	let isFirstHalf = true

	for (const pool of pools) {
		const repeat = Math.ceil(pool.lanes)
		for (let i = 0; i < repeat; i++) {
			data.push([
				`Lane ${lane}`,
				pool.group,
				`${pool.libraries.join(", ")}`,
				pool.lab,
				pool.submitter,
				pool.protocol,
				pool.run + pool.read,
				pool.lanes,
				pool.ready,
				`${spiked ? spikes[lane - 1] : ""}`,
				"",
			])
			lane++
		}
		if (pool.lanes === 0.5 && isFirstHalf) {
			lane--
		}
		isFirstHalf = pool.lanes === 0.5 ? !isFirstHalf : isFirstHalf
	}

	for (let empty_lane = lane; empty_lane <= 8; empty_lane++) {
		data.push([
			`Lane ${empty_lane}`,
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			`${spiked ? spikes[empty_lane - 1] : ""}`,
			"",
		])
	}

	// prettier-ignore
	const csvContent =
		`data:text/csv;charset=utf-8,` +
		data.map((row) => {return row.map((cell) => {

				let string = cell.toString()
				string.replace(/"/g, '""')
				if (string.search(/("|,|\n)/g) >= 0)
					string = `"${string}"`
				return string

			}).join($('input[name="separator"]:checked').val())
		}).join("\n")

	const encodedUri = encodeURI(csvContent)
	const link = document.createElement("a")
	link.setAttribute("href", encodedUri)
	link.setAttribute("download", `${generateFilename(new Date())}.csv`)
	document.body.appendChild(link) // Required for FF
	link.click()
}

function generateFilename(date) {
	// prettier-ignore
	const formattedDate = `${
		date.getFullYear()}${
		date.getMonth() + 1}${
		date.getDate()}${
		date.getHours()}${
		date.getMinutes()}${
		date.getSeconds()}`
	return `${runtype}-${formattedDate}`
}

$(function () {
	const spiked = localStorage.getItem("spiked") === "true"
	const pools = formatPools()
	let spikes = []

	$("#title").html(idToTitle(runtype))
	$(".pools-col").attr("id", `${runtype}-pools`)
	$(".spikes-col").attr("id", `${runtype}-spikes`)

	generateUI(runtype, spiked)
	generatePools(pools)

	if (spiked) {
		$("#export > .row").addClass("spiked")
		$("#spikes-title").removeClass("d-none")
		$(".spikes-col").removeClass("d-none")
		spikes = JSON.parse(localStorage.getItem(`${runtype}-spikes`))
		generateSpikes(spikes)
	}

	$("#pdf").click(() => exportAsPDF())
	$("#csv").click(() => exportAsCSV(pools, spiked, spikes))
})
