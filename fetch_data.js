const puppeteer = require("puppeteer")

const login_url = "https://lims.ige3.genomics.unige.ch/"
const requests_url =
	"https://lims.ige3.genomics.unige.ch/table/requests/selactive"
const libraries_url =
	"https://lims.ige3.genomics.unige.ch/table/libraries/selactive"

const credentials = require("./credentials.json")

async function fetchData() {
	console.log("Starting browser...\n")
	const { libraries, requests } = await webScrapper()

	console.log("Merging requests...")

	const pools = new Array()
	const pool_names = new Array()

	for (let i = 0; i < requests.length; i++) {
		const pool_name = requests[i][8]
		if (pool_name === "") {
			return error(requests[i][0], "No group name")
		}

		if (pool_names.includes(pool_name)) {
			continue
		}
		pool_names.push(pool_name)

		let multiplex
		if (requests[i][7] === "No") {
			multiplex = 1
		} else if (requests[i][7] === "Spike") {
			multiplex = -1
		} else {
			multiplex = parseInt(requests[i][7])
		}

		if (isNaN(multiplex)) {
			return error(
				requests[i][0],
				`Multiplex# "${requests[i][7]}" should be a number, "Spike" or "No"`
			)
		}

		const pool = parseAndMergeRequests(
			requests.filter((request) => request[8] === pool_name),
			multiplex
		)

		if (pool.error != undefined) {
			return { error: pool.error }
		}

		pool.ready = isReady(pool, libraries)
		pools.push(pool)

		i += multiplex - 1
	}

	console.log("Merged requests into " + pools.length + " pools\n")

	return {
		error: "",
		pools: pools,
	}
}

async function webScrapper() {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()
	await page.goto(login_url)

	// Login
	console.log("Logging in...\n")
	await page.type("#lg_name", credentials.username)
	await page.type("#lg_password", credentials.password)
	await page.click("input[type='submit']")

	// Get cookies
	const cookies = await page.cookies()

	console.log("Fetching libraries...")

	// Use cookies in another tab or browser
	const new_page = await browser.newPage()
	await new_page.setCookie(...cookies)
	// Open the page as a logged-in user
	await new_page.goto(libraries_url)

	const libraries = await new_page.$$eval(
		"table.sortable tbody tr td:nth-child(2)",
		(names) => {
			return Array.from(names, (name) => name.innerText)
		}
	)

	console.log("Found " + libraries.length + " libraries\n")
	console.log("Fetching requests...")

	await new_page.goto(requests_url)

	const requests = await new_page.$$eval(
		"table.sortable tbody tr",
		(rows) => {
			return Array.from(rows, (row) => {
				const columns = row.querySelectorAll("td")
				return Array.from(columns, (column) => column.innerText)
			})
		}
	)

	console.log("Found " + requests.length + " requests\n")
	
	await page.click("#StatusRight > a") // Log out
	await browser.close()

	return {
		libraries: libraries,
		requests: requests,
	}
}

function parseAndMergeRequests(requests, multiplex) {
	if (requests.length != multiplex && multiplex !== -1) {
		return error(
			requests[0][0],
			`Couldn't find ${requests[0][7]} requests for pool "${requests[0][8]}"`
		)
	}

	if (!requests.every((request) => similar(request, requests))) {
		return error(
			requests[0][0],
			`Requests in pool ${requests[0][8]} don't share the same information`
		)
	}

	const run_type = parseRun(requests[0][4])
	if (run_type === "error") {
		return error(requests[0][0], `Unkown run type "${requests[0][4]}"`)
	} else if (run_type === "MiSeq") {
		continue
	}

	let read_length = requests[0][5] === "2890" ? "100" : requests[0][5]

	const lanes = parseFloat(requests[0][6])
	if (isNaN(lanes)) {
		return error(
			requests[0][0],
			`Nb lanes "${requests[0][6]}" is not a number`
		)
	}

	return {
		libraries: groupLibraries(requests),
		lab: requests[0][2],
		protocol: requests[0][3],
		run: run_type,
		read: read_length,
		lanes: lanes,
		multiplex: multiplex,
		group: requests[0][8],
		submitter: requests[0][9],
		ready: false,
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
		case "MiSeq paired-end reads":
			return "MiSeq"
		default:
			return "error"
	}
}

function isReady(pool, libraries) {
	return pool.libraries.every((library) => libraries.includes(library))
}

function error(request_id, message) {
	console.error(
		`\nError with request ${request_id} - ${message}.\nAborting process.\n`
	)
	return {
		error: `Error with request ${request_id} - ${message}.`,
	}
}

module.exports = {
	fetchData: async function () {
		return await fetchData()
	},
}
