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
						"coordinate": data["coordinate"]
					});
				});
			}
		});

		// console.log(sensorData);
		display(sensorData);
	});
});

// display data in 3d space
function display(data) {

	console.log(data);
	var subData = {};

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([0, 100])
		.range([1, 8]);

	var scene = d3.select("a-scene");

	// define subData as all newest values with disjunct position values
	for (var i = 0; i < data.length; i++) {
		// if subData doesn't contain coordinate or older value for that coordianate add datapoint
		if (!subData[data[i]["coordinate"]]) {
			console.log("not included");
			subData[data[i]["coordinate"]] = data[i];
		} else if (Date.parse(subData[data[i]["coordinate"]]["time"]) > Date.parse(data[i]["time"])) {
			console.log("newer timestamp");
			subData[data[i]["coordinate"]] = data[i];
		}
	}

	console.log(subData);

	// create text-fields for displaying values
	// var texts = scene.selectAll("a-text.bar").data(subData);
	// texts.enter().append("a-text").attr("class", "bar")
	// 	.attr("position", d[position])
	// 	.attr("value", function (d, i) {
	// 		return Math.round(d["value"] * 100) / 100 + "\n" + d["time"];
	// 	}).attr("color", "red").attr("align", "center");

	// // TODO: create spheres
	var spheres = scene.selectAll("a-sphere.datapoint").data(subData);
	spheres.enter().append("a-sphere").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return d["position"];
		})
		.attr("radius", function (d, i) {
			console.log("radius: " +  hscale(d["value"]));
			return hscale(d["value"]);
		});
	
	console.log(spheres);

	// TODO: implement time change
	//render();
}