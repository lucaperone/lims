import { welcome, getData } from "./utils.js"

$(function () {
	$("#load").click(() => getData("index"))
	welcome("index")
})
