import { generateUI, idToTitle } from "./utils.js"

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

function generatePools(runtype, pools) {
	for (const pool of pools) {
		const libraries = pool.libraries.join(", ")
		$(`#${runtype}-pools .run-plan`).append(
			`
                <div
                    class="pool ${pool.run}${pool.read}"
                    style = "height: calc(${pool.lanes} * 90px - 5px)">
                        <div><span>${pool.group}</span></div>
                        <div><span class="pool-libraries"><b>${
							pool.libraries.length
						} samples:</b> ${libraries}</span></div>
                        <div><span class="text-center">${pool.lab}<br />(${
				pool.submitter
			})</span></div>
                        <div><span class="text-center">${
							pool.protocol
						}</span></div>
                        <div><span class="pool-runtype">${pool.run} ${
				pool.read
			}</span></div>
                        <div><span>${pool.ready ? "✔️" : "❌"}</span></div>
                </div>
		    `
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
	const formattedDate = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`
	const options = {
		filename: `${runtype}-${formattedDate}`,
		jsPDF: {
			orientation: "landscape",
			unit: "mm",
			format: "a4",
			putOnlyUsedFonts: true,
		},
	}
	html2pdf().set(options).from(element).save()
}

$(function () {
	const spiked = localStorage.getItem("spiked")
	const pools = formatPools()

	$("#title").html(idToTitle(runtype))
	$(".pools-col").attr("id", `${runtype}-pools`)
	$(".spikes-col").attr("id", `${runtype}-spikes`)

	generateUI(runtype, spiked)
	generatePools(runtype, pools)

	if (spiked) {
		$("#export > .row").addClass("spiked")
		$("#spikes-title").removeClass("d-none")
		generateSpikes(JSON.parse(localStorage.getItem(`${runtype}-spikes`)))
	}

	$("#pdf").click((_) => exportAsPDF())
})
