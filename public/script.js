async function getData() {
	$.ajax({
		type: "GET",
		url: "http://localhost:3000/data",
		success: function (response) {
			displayData(response)
		},
		error: function (xhr, status, err) {
			console.log(xhr.responseText)
		},
	})
}

function displayData(data) {
	$("#data").html("<table id='data-table'></table>")
	data.forEach((row) => {
		var html_string = "<tr>"

		row.forEach((col, index) => {
			if (index == 1) {
				html_string += "<td>[Libraries]</td>"
			} else {
				html_string += `<td>${col}</td>`
			}
		})

		html_string += "</tr>"
		$("#data-table").append(html_string)
	})
}

$("#data").html("<p>Fetching data...</p>")
getData()
