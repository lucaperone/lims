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

export function welcome(page, filter) {
	const cache = localStorage.getItem("lims-requests")
	if (cache) {
		const requests = JSON.parse(cache)
		displayBasicData(requests)

		if (requests.error === "") {
			if (page === "index") {
				displayIndexData(requests)
			} else {
				displayCreateData(requests, filter)
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
		let untitled = ""
		if (pool.group.includes("Untitled")) {
			untitled = " class='untitled'"
		}
		html_string += `
			<tr class="${pool.run}${pool.read}">
				<td${untitled}>${pool.group}</td>
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

function displayCreateData(data, filter) {
	const { error, pools } = data

	let html_string = ""
	pools.forEach((pool) => {
		if (filter[`${pool.run}${pool.read}`]) {
			let untitled = ""
			if (pool.group.includes("Untitled")) {
				untitled = " class='untitled'"
			}
			html_string += `
                <div
                    id="${pool.group}"
                    class="pool ${pool.run}${pool.read}"
                    style="height: calc(${pool.lanes} * 60px - 5px"
                    data-size="${pool.lanes}"
                    data-runtype="${pool.run}${pool.read}">
                        <span${untitled}>${pool.group}</span>
                        <span>${pool.run} ${pool.read}</span>
                        <span>${pool.ready ? "✔️" : "❌"}</span>
                </div>
		    `
		}
	})
	$("#pools").html(html_string)
}
