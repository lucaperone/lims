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
					displayCreateData(response)
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
				displayCreateData(requests)
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
			spike = " class='spike'"
		}
		html_string += `
			<tr class="${pool.run}${pool.read}">
				<td${spike}>${pool.group}</td>
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

function displayCreateData(data) {
	const { error, pools } = data
	const filter = getFilter()

	let html_string = ""
	pools.forEach((pool) => {
		if (filter[`${pool.run}${pool.read}`]) {
			let spike = ""
			if (pool.multiplex === -1) {
				spike = " class='spike'"
			}
			html_string += `
                <div
                    id="${pool.group.replaceAll(/\W/g, "")}"
                    class="pool ${pool.run}${pool.read}"
                    style="height: calc(${pool.lanes} * 60px - 5px"
                    data-size="${pool.lanes}"
					data-group="${pool.group}"
                    data-runtype="${pool.run}${pool.read}">
                        <span${spike}>${pool.group}</span>
                        <span>${pool.run} ${pool.read}</span>
                        <span>${pool.ready ? "✔️" : "❌"}</span>
                </div>
		    `
		}
	})
	$("#pools").html(html_string)
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
