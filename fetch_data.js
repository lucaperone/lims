const puppeteer = require("puppeteer")

const login_url = "https://lims.ige3.genomics.unige.ch/"
const requests_url =
	"https://lims.ige3.genomics.unige.ch/table/requests/selactive"
const libraries_url =
	"https://lims.ige3.genomics.unige.ch/table/libraries/selactive"

async function fetchData() {
	console.log("Starting applcation...\n")
	const browser = await puppeteer.launch()
	const login_page = await browser.newPage()
	await login_page.goto(login_url)

	// Login
	await login_page.type("#lg_name", "lperone")
	await login_page.type("#lg_password", "tkk4dbvb")
	await login_page.click("input[type='submit']")

	// Get cookies
	const cookies = await login_page.cookies()

	console.log("Fetching libraries...")

	// Use cookies in another tab or browser
	const libraries_page = await browser.newPage()
	await libraries_page.setCookie(...cookies)
	// Open the page as a logged-in user
	await libraries_page.goto(libraries_url)

	const libraries = await libraries_page.$$eval(
		"table.sortable tbody tr td:nth-child(2)",
		(names) => {
			return Array.from(names, (name) => name.innerText)
		}
	)
	console.log("Found " + libraries.length + " libraries\n")
	console.log("Fetching requests...")

	// Use cookies in another tab or browser
	const requests_page = await browser.newPage()
	await requests_page.setCookie(...cookies)
	// Open the page as a logged-in user
	await requests_page.goto(requests_url)

	const requests = await requests_page.$$eval(
		"table.sortable tbody tr",
		(rows) => {
			return Array.from(rows, (row) => {
				const columns = row.querySelectorAll("td")
				return Array.from(columns, (column) => column.innerText)
			})
		}
	)
	await browser.close()

	console.log("Found " + requests.length + " requests\n")

	console.log("Merging requests...")

	var merged_requests = new Array()
	var groups_indexed = new Array()
	var nb_untitled = addRequest(
		requests[0],
		merged_requests,
		0,
		groups_indexed
	)

	for (let i = 0; i < requests.length - 1; i++) {
		const row = requests[i]
		const next_row = requests[i + 1]

		if (
			row[2] == next_row[2] && // Same Laboratory
			row[3] == next_row[3] && // Same Library
			row[4] == next_row[4] && // Same Run type
			row[5] == next_row[5] && // Same Read Length
			row[8] == next_row[8] && // Same Group
			row[9] == next_row[9] // Same Submitter
		) {
			if (row[8] == "") {
				updateRequest(
					next_row,
					merged_requests,
					groups_indexed.indexOf("untitled" + nb_untitled)
				) // Similar but untitled
			} else {
				updateRequest(
					next_row,
					merged_requests,
					groups_indexed.indexOf(row[8])
				) // Similar and titled
			}
		} else {
			if (groups_indexed.includes(next_row[8]) && next_row != "") {
				updateRequest(
					next_row,
					merged_requests,
					groups_indexed.indexOf(next_row[8])
				) // Not similar, titled, already present
			} else {
				nb_untitled = addRequest(
					next_row,
					merged_requests,
					nb_untitled,
					groups_indexed
				) // New
			}
		}
	}
	console.log("Merged requests into " + merged_requests.length + " pools\n")
	console.log("Filtering pools...")

	filtered_requests = merged_requests.filter((request) =>
		request[1].every((library) => libraries.includes(library))
	)
	console.log(filtered_requests.length + " pools after filtering\n")

	return filtered_requests
}

function cleanupRow(row) {
	return [row[8], [], row[2], row[9], row[3], row[4], row[5], [], []]
}

function addRequest(row, requests, nb_untitled, groups_indexed) {
	var cleaned_row = cleanupRow(row)
	if (row[8] == "") {
		nb_untitled++
		cleaned_row[0] = "untitled" + nb_untitled
	} else {
		cleaned_row[0] = row[8]
	}
	groups_indexed.push(cleaned_row[0])
	requests.push(cleaned_row)

	return nb_untitled
}

function updateRequest(row, requests, index) {
	requests[index][1].push(row[1]) // Store all libraries
	requests[index][7].push(row[6]) // Store all lanes (should be 1)
	requests[index][8].push(row[7]) // Store all Multiplex (should be 1)
}

module.exports = {
	fetchData: async function () {
		return await fetchData()
	},
}
