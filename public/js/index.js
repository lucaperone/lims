import { welcome, getData } from "./lims-utils.js"

$(function () {
	$("#load").click(() => getData("index"))
	welcome("index")
	$('[data-toggle="tooltip"]').tooltip()
})
