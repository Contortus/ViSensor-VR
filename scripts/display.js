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

		display(sensorData);
	});
});

// display data in 3d space
function display(data) {

	var subData = {};
	var dataArray = [];

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([0, 100])
		.range([0.5, 4]);

	var scene = d3.select("a-scene");

	// define subData as all newest values with disjunct position values
	for (var i = 0; i < data.length; i++) {
		// if subData doesn't contain coordinate or older value for that coordianate, add datapoint
		if (!subData[data[i]["coordinate"]]) {
			subData[data[i]["coordinate"]] = data[i];
		} else if (Date.parse(subData[data[i]["coordinate"]]["time"]) > Date.parse(data[i]["time"])) {
			subData[data[i]["coordinate"]] = data[i];
		}
	}

	// move data to array
	for (var key in subData) {
		dataArray.push(subData[key]);
	}

	// create spheres
	var spheres = scene.selectAll("a-sphere.datapoint").data(dataArray);
	spheres.enter().append("a-sphere").attr("class", "datapoint")
		.attr("position", function (d, i) {
			return d["coordinate"];
		}).attr("radius", function (d, i) {
			return hscale(d["value"]);
		});

	// TODO: add texts for spheres

	// var texts = scene.selectAll("a-text.datapoint").data(dataArray);
	// texts.enter().append("a-text").attr("class", "datapoint")
	// 	.attr("position", function (d, i) {
	// 		var coordinates = d["coordinates"].substr(1).split(" ");

	// 		 console.log(coordinates);
	// 	});

	// TODO: implement time change
}