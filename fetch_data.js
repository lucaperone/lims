const puppeteer = require("puppeteer")

const login_url = "https://lims.ige3.genomics.unige.ch/"
const requests_url =
	"https://lims.ige3.genomics.unige.ch/table/requests/selactive"
const libraries_url =
	"https://lims.ige3.genomics.unige.ch/table/libraries/selactive"

async function fetchData() {
	console.log("Starting applcation...\n")
	const { libraries, requests } = await webScrapper()

	console.log("Merging requests...")

	const pools = new Array()

	for (let i = 0; i < requests.length; i++) {
		multiplex = parseInt(requests[i][7])
		if (multiplex === NaN) {
			return {
				error: `Error with request ${requests[i][0]} - Multiplex# "${requests[i][7]}" is not a number`,
			}
		}

		const pool = parseAndMergeRequests(
			requests.slice(i, i + multiplex),
			multiplex
		)

		if (pool.error != "") {
			return { error: pool.error }
		} else {
			pool.ready = isReady(pool, libraries)
			pools.push(pool)
		}
		i += multiplex - 1
	}

	console.log("Merged requests into " + pools.length + " pools\n")

	return {
		error: "",
		pools: pools,
	}
}

async function webScrapper() {
	results = {
		libraries: [],
		requests: [],
	}

	const browser = await puppeteer.launch()
	const page = await browser.newPage()
	await page.goto(login_url)

	// Login
	await page.type("#lg_name", "lperone")
	await page.type("#lg_password", "tkk4dbvb")
	await page.click("input[type='submit']")

	// Get cookies
	const cookies = await page.cookies()

	console.log("Fetching libraries...")

	// Use cookies in another tab or browser
	const new_page = await browser.newPage()
	await new_page.setCookie(...cookies)
	// Open the page as a logged-in user
	await new_page.goto(libraries_url)

	results.libraries = await new_page.$$eval(
		"table.sortable tbody tr td:nth-child(2)",
		(names) => {
			return Array.from(names, (name) => name.innerText)
		}
	)
	console.log("Found " + results.libraries.length + " libraries\n")
	console.log("Fetching requests...")

	await new_page.goto(requests_url)

	results.requests = await new_page.$$eval(
		"table.sortable tbody tr",
		(rows) => {
			return Array.from(rows, (row) => {
				const columns = row.querySelectorAll("td")
				return Array.from(columns, (column) => column.innerText)
			})
		}
	)

	console.log("Found " + results.requests.length + " requests\n")

	await browser.close()

	return results
}

function parseAndMergeRequests(requests, multiplex) {
	if (requests.every((request) => similar(request, requests))) {
		const run_type = parseRun(requests[0][4])
		if (run_type === "error") {
			return {
				error: `Error with request ${requests[0][0]} - Unkown run type "${requests[0][4]}"`,
			}
		} else {
			const lanes = parseFloat(requests[0][6])
			if (lanes === NaN) {
				return {
					error: `Error with request ${requests[0][0]} - Nb lanes "${requests[0][6]}" is not a number`,
				}
			}
			return {
				error: "",
				libraries: groupLibraries(requests),
				lab: requests[0][2],
				protocol: requests[0][3],
				run: run_type,
				read: requests[0][5],
				lanes: lanes,
				multiplex: multiplex,
				group: requests[0][8],
				submitter: requests[0][9],
				ready: false,
			}
		}
	} else {
		return {
			error: `Error with request ${requests[0][0]} - Number of multiplex given: ${requests[0][7]}, not enough similar requests found.`,
		}
	}
}

function similar(request, requests) {
	let similar = true
	for (let i = 2; i < 10; i++) {
		similar &= request[i] === requests[0][i]
	}
	return similar
}

function groupLibraries(requests) {
	const libraries = new Array()
	requests.forEach((request) => {
		libraries.push(request[1])
	})
	return libraries
}

function parseRun(run) {
	switch (run) {
		case "single read":
			return "SR"
		case "paired-end reads":
			return "PE"
		default:
			return "error"
	}
}

function isReady(pool, libraries) {
	return pool.libraries.every((library) => libraries.includes(library))
}

function cleanupRow(row) {
	return [row[8], [], row[2], row[9], row[3], row[4], row[5], [], []]
}

module.exports = {
	fetchData: async function () {
		return await fetchData()
	},
}

// async function main() {
// 	console.log(await fetchData())
// }

// main()
