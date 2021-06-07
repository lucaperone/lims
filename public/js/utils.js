export async function getData(page) {
	start()
	$.ajax({
		type: "GET",
		url: "/data",
		success: function (response) {
			displayBasicData(response)

			if (response.error === "") {
				if (page === "index") {
					displayIndexData(response)
				} else {
					displayPlanData(response)
				}
			}
		},
		error: function (xhr, status, err) {
			console.log(xhr.responseText)
		},
	}).then((response) => end(response))
}

function start() {
	$("button#load").prop("disabled", true)
	$(".loader").removeClass("d-none")
	$(".cache").addClass("d-none")
}

function end(response) {
	$("button#load").prop("disabled", false)
	$(".loader").addClass("d-none")
	$(".cache").removeClass("d-none")

	localStorage.setItem("lims-requests", JSON.stringify(response))

	const now = new Date()
	localStorage.setItem("lims-date", now.toString())
	$(".cache").html(`Last time: ${now.toLocaleString("fr-CH")}`)
}

export function welcome(page) {
	const cache = localStorage.getItem("lims-requests")
	if (cache) {
		const requests = JSON.parse(cache)
		displayBasicData(requests)

		if (requests.error === "") {
			if (page === "index") {
				displayIndexData(requests)
			} else {
				displayPlanData(requests)
			}
		}
	} else {
		getData(page)
	}
}

function displayBasicData(data) {
	const date = new Date(localStorage.getItem("lims-date")).toLocaleString(
		"fr-CH"
	)
	$(".cache").html(`Last time: ${date}`)
	const { error, pools } = data

	if (error != "") {
		$("#error").removeClass("d-none")
		$("#error").html(error)
	} else {
		$("#error").addClass("d-none")
	}
}

function displayIndexData(data) {
	const { error, pools } = data

	let html_string = ""
	pools.forEach((pool) => {
		let spike = ""
		if (pool.multiplex === -1) {
			spike = "spike"
		}
		html_string += `
			<tr class="${pool.run}${pool.read} ${spike}">
				<td>${pool.group}</td>
				<td>${pool.lab} (${pool.submitter})</td>
				<td>${pool.libraries.length}</td>
				<td>${pool.protocol}</td>
				<td>${pool.run} ${pool.read}</td>
				<td>${pool.lanes}</td>
				<td>${pool.ready ? "✔️" : "❌"}</td>
			</tr>
		`
	})
	$("table#pools tbody").html(html_string)
}

function displayPlanData(data) {
	const { error, pools } = data
	const filter = getFilter()

	let pools_html = ""
	let spikes_html = ""
	let order = 1
	pools.forEach((pool) => {
		if (filter[`${pool.run}${pool.read}`] || pool.multiplex === -1) {
			let spike = ""
			let pool_height = ""
			let data_order = ""
			if (pool.multiplex === -1) {
				spike = "spike-pool"
			} else {
				pool_height = `style = "height: calc(${pool.lanes} * 60px - 5px)"`
				data_order = `data-order="${order++}"`
			}
			const temp_html = `
                <div
                    id="${groupToID(pool.group)}"
                    class="pool ${pool.run}${pool.read} ${spike}"
                    ${pool_height}
                    data-size="${pool.lanes}"
					data-group="${pool.group}"
                    data-runtype="${pool.run}${pool.read}"
					${data_order}>
                        <span>${pool.group}</span>
                        <span class="pool-runtype">${pool.run} ${
				pool.read
			}</span>
                        <span>${pool.ready ? "✔️" : "❌"}</span>
                </div>
		    `
			if (pool.multiplex === -1) {
				spikes_html += temp_html
			} else {
				pools_html += temp_html
			}
		}
	})
	$("#spikes").html(spikes_html)
	$("#pools").html(pools_html)
}

export function getFilter() {
	const url = new URL(window.location.href)
	return {
		SR50: url.searchParams.get("sr50"),
		SR100: url.searchParams.get("sr100"),
		PE50: url.searchParams.get("pe50"),
		PE100: url.searchParams.get("pe100"),
	}
}

export function groupToID(group) {
	return group.replaceAll(/\W/g, "")
}

export function generateUI(runtype, spiked) {
	for (let lane = 1; lane <= 8; lane++) {
		$(`#${runtype}-pools .run-ui`).append(`
			<div class="lane-row lane-${lane}">
				<div class="lane-number"><span>${lane}</span></div>
				<div class="placeholder"></div>
			</div>
		`)

		if (spiked) {
			$(`#${runtype}-spikes .run-container`).append(`
				<div class="lane-row lane-${lane}">
					<div class="lane-number"><span>${lane}</span></div>
					<div class="spikes-container"></div>
				</div>
			`)
		}
	}
}

export function idToTitle(id) {
	const table = {
		SR50: "Single Read 50",
		SR100: "Single Read 100",
		PE50: "Paired-end Reads 50",
		PE100: "Paired-end Reads 100",
	}
	return table[id]
}
