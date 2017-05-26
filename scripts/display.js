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
		// if subData doesn't contain coordinate or older value for that coordianate add datapoint
		if (!subData[data[i]["coordinate"]]) {
			console.log("not included");
			subData[data[i]["coordinate"]] = data[i];
		} else if (Date.parse(subData[data[i]["coordinate"]]["time"]) > Date.parse(data[i]["time"])) {
			console.log("newer timestamp");
			subData[data[i]["coordinate"]] = data[i];
		}
	}

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

	// TODO: implement time change

	// update-loop
	function render() {
		requestAnimationFrame(render);

		var cameraPos = {
			"x": 0,
			"y": 0,
			"z": 0
		};

		var cameraRotation = cameraPos;

		if (d3.select('a-camera').attr("position") != null)
			cameraPos = d3.select('a-camera').attr("position");

		if (d3.select('a-camera').attr("rotation") != null)
			cameraRotation = d3.select('a-camera').attr("rotation");

		console.log(cameraRotation);

		d3.select('a-camera').attr('rotation', function () {
			cameraRotation['y'];
			return cameraRotation;
		});
	}
	render();
}