const puppeteer = require("puppeteer")

const login_url = "https://lims.ige3.genomics.unige.ch/"
const requests_url = "https://lims.ige3.genomics.unige.ch/table/requests";

(async () => {
	const browser = await puppeteer.launch()
	const login_page = await browser.newPage()
	await login_page.goto(login_url)

	// Login
	await login_page.type("#lg_name", "lperone")
	await login_page.type("#lg_password", "tkk4dbvb")
	await login_page.click("input[type='submit']")

	// Get cookies
	const cookies = await login_page.cookies()

	// Use cookies in another tab or browser
	const requests_page = await browser.newPage()
	await requests_page.setCookie(...cookies)
	// Open the page as a logged-in user
	await requests_page.goto(requests_url)

	const requests = await requests_page.$$eval('table.sortable tr', rows => {
		return Array.from(rows, row => {
			const columns = row.querySelectorAll('td');
			return Array.from(columns, column => column.innerText);
		});
	});
	console.log(requests)

	await browser.close()
})();
