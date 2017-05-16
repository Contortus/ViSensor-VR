$(document).ready(function () {
	var sensor = window.location.search.substr(1).split("=")[1];
	var sensorData = [];
	var data = "data.json";
	$.getJSON(data, function (result) {
		// console.log(result);
		$.each(result, function (i, sensorField) {
			// console.log(sensorField);
			if (sensorField.sensor == sensor) {
				$.each(sensorField.data, function (i, data) {
					sensorData.push({
						"time": data["time"],
						"value": data["value"],
						"coordinate" : data["coordinate"]
					});
				});
			}
		});
	});
	// console.log(sensorData);
	//display(sensorData);
});

// display data in 3d space
function display(data) {

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([getMin(), getMax()])
		.range([1, 8]);

	var scene = d3.select("a-scene");

	// TODO: define subData as all newest values with disjunct position values

	// create text-fields for displaying values
	var texts = scene.selectAll("a-text.bar").data(subData);
	texts.enter().append("a-text").attr("class", "bar")
		.attr("position", d[position])
		.attr("value", function (d, i) {
			return Math.round(d["value"] * 100) / 100 + "\n" + d["time"];
		}).attr("color", "red").attr("align", "center");

	// TODO: create spheres with corresponding diameters

	// TODO: implement time change
	render();
}