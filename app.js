const path = require("path")
const express = require("express")
const logger = require("morgan")
const dataFetcher = require("./fetch_data")

const app = express()

// Log the requests
app.use(logger("dev"))

// Serve static files
app.use(express.static(path.join(__dirname, "public")))

// Fetch data route
app.get("/data", async (req, res) => {
	const data = await dataFetcher.fetchData()
	res.send(data)
})

app.listen(3000)
console.log("Listening on port 3000")
