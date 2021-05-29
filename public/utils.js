export async function getData(page) {
	start()
	$.ajax({
		type: "GET",
		url: "/data",
		success: function (response) {
			if (response.error === "") {
				document.cookie = "error= ;"
			}

			if (page === "index") {
				displayIndexData(response)
			} else {
				displayCreateData(response)
			}
		},
		error: function (xhr, status, err) {
			console.log(xhr.responseText)
		},
	}).then((res) => end(res))
}

function start() {
	$("button#load").prop("disabled", true)
	$(".loader").removeClass("d-none")
	$(".cache").addClass("d-none")
}

function end(res) {
	$("button#load").prop("disabled", false)
	$(".loader").addClass("d-none")
	$(".cache").removeClass("d-none")
	document.cookie = "lims-requests = " + JSON.stringify(res)
	const now = new Date()
	document.cookie = "lims-date = " + now.toString()
	$(".cache").html(`Last time: ${now.toLocaleString("fr-CH")}`)
}

function getCookie(name) {
	const value = `; ${document.cookie}`
	const parts = value.split(`; ${name}=`)
	if (parts.length === 2) return parts.pop().split(";").shift()
}

export function welcome(page, filter) {
	if (document.cookie.includes("lims-requests")) {
		if (page === "index") {
			displayIndexData(JSON.parse(getCookie("lims-requests")))
		} else {
			displayCreateData(JSON.parse(getCookie("lims-requests")), filter)
		}
	} else {
		getData(page)
	}
}

function displayIndexData(data) {
	const date = new Date(getCookie("lims-date")).toLocaleString("fr-CH")
	$(".cache").html(`Last time: ${date}`)
	const { error, pools } = data

	if (error != "") {
		$("#error").removeClass("d-none")
		$("#error").html(error)
		return
	}

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
	const date = new Date(getCookie("lims-date")).toLocaleString("fr-CH")
	$(".cache").html(`Last time: ${date}`)
	const { error, pools } = data

	if (error != "") {
		$("#error").removeClass("d-none")
		$("#error").html(error)
		return
	}

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
