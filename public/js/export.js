const url = new URL(window.location.href)
const runtype = url.searchParams.get("runtype")

const requests = JSON.parse(localStorage.getItem("lims-requests"))
const plan = localStorage.getItem(`${runtype}-export`).split(",")
const spikes = JSON.parse(localStorage.getItem(`${runtype}-spikes`))

console.log(plan)
console.log(spikes)

const pool = {
	libraries: [],
	lab: "",
	protocol: "",
	//runtype: '',
	lanes: 0,
	//libraries.length,
	group: "",
	submitter: "",
	spikes: [],
}

// map -plan- : replace pool names with -pool- according to -requests- and -spikes-
