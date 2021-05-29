import { welcome, getData } from "./utils.js"

$(function () {
	$("#load").click((_) => getData("index"))
	welcome("index")
})
