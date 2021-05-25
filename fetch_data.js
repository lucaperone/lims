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
	merged_requests.push(cleanupRow(requests[0]))

	for (let i = 0; i < requests.length - 1; i++) {
		const row = requests[i]
		const next_row = requests[i + 1]

		if (
			JSON.stringify(cleanupRow(row)) ===
			JSON.stringify(cleanupRow(next_row))
		) {
			merged_requests[merged_requests.length - 1][1].push(row[1])
		} else {
			merged_requests.push(cleanupRow(next_row))
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
	return [row[8], [], row[2], row[9], row[3], row[4], row[5], row[6], row[7]]
}

module.exports = {
	fetchData: async function () {
		return await fetchData()
	},
}
