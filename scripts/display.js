$(document).ready(function () {
	var sensor = window.location.search.substr(1).split("=")[1];
	var sensorData = [];
	var data = "data.json";
	//TODO: check for correct input
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
	console.log(sensorData);
	//display(sensorData);
});

// display data in 3d space
function display(data) {
	var begin = 0;
	var end = 5;
	var spacing = 2.5;
	var length = data.length;
	var hasChanged = false;
	var subData = data.slice(begin, end);

	function getMin() {
		min = subData[0]["sensorData"];
		var d;
		for (d in subData) {
			if (subData[d]["sensorData"] < min)
				min = subData[d]["sensorData"];
		}

		return min;
	}

	function getMax() {
		max = subData[0]["sensorData"];
		var d;
		for (d in subData) {
			if (subData[d]["sensorData"] > max)
				max = subData[d]["sensorData"];
		}

		return max;
	}

	// scale input data for better representation
	var hscale = d3.scaleLinear()
		.domain([getMin(), getMax()])
		.range([1, 8]);

	var scene = d3.select("a-scene");

	// create text-fields for displaying values
	var texts = scene.selectAll("a-text.bar").data(subData);
	texts.enter().append("a-text").attr("class", "bar")
		.attr("position", function (d, i) {
			var x = -5 + (i * spacing);
			var y = 4;
			var z = -3.5;

			return x + " " + y + " " + z;
		}).attr("value", function (d, i) {
			return Math.round(d["sensorData"] * 100) / 100 + "\n" + d["time"];
		}).attr("color", "red").attr("align", "center");

	// create bar graph
	var boxes = scene.selectAll("a-box.bar").data(subData);
	boxes.enter().append("a-box")
		.attr("class", "bar")
		.attr("color", "grey")
		.attr("position", function (d, i) {
			var x = -5 + (i * spacing);
			var y = hscale(d["sensorData"]) / 2;
			var z = -4;

			return x + " " + y + " " + z;
		}).attr("height", function (d, i) {
			return hscale(d["sensorData"]);
		});

	// next-button has been clicked
	document.querySelector('#next').addEventListener('click', function () {
		if (end < length - 1) {
			end += 1;
			begin += 1;
			hasChanged = true;
		}
	});

	// prev-button has been clicked
	document.querySelector('#prev').addEventListener('click', function () {
		if (begin > 0) {
			end -= 1;
			begin -= 1;
			hasChanged = true;
		}
	});

	// update-loop
	function render() {
		requestAnimationFrame(render);

		var cameraPos = {
			"x": 0,
			"y": 0,
			"z": 0
		};

		var cameraRotation = cameraPos;

		if (document.querySelector('#camera').getAttribute("position") != null)
			cameraPos = document.querySelector('#camera').getAttribute("position");

		if (document.querySelector('#camera').getAttribute("rotation") != null)
			cameraRotation = document.querySelector('#camera').getAttribute("rotation");

		var next = scene.select("a-box#next");
		var prev = scene.select("a-box#prev");

		// TODO: rotate boxes with camera

		// move boxes with camera
		next.transition().duration(50).attr("position", function () {
			return (cameraPos["x"] + 2) + " " + (2) + " " + (cameraPos["z"] - 1);
		}).attr("rotation", function () {
			return cameraRotation["x"] + " " + cameraRotation["y"] + " " + cameraRotation["z"];
		});

		prev.transition().duration(50).attr("position", function () {
			return (cameraPos["x"] - 2) + " " + (2) + " " + (cameraPos["z"] - 1);
		}).attr("rotation", function () {
			return cameraRotation["x"] + " " + cameraRotation["y"] + " " + cameraRotation["z"];
		});

		// we want to display a different segment of the data
		if (hasChanged) {
			subData = data.slice(begin, end);

			// change text-fields
			texts = scene.selectAll("a-text.bar").data(subData);
			texts.attr("position", function (d, i) {
				var x = -5 + (i * spacing);
				var y = 4;
				var z = -3.5;

				return x + " " + y + " " + z;
			}).attr("value", function (d, i) {
				return Math.round(d["sensorData"] * 100) / 100 + "\n" + d["time"];
			}).attr("color", "red").attr("align", "center");

			// change bar graphs
			boxes = scene.selectAll("a-box.bar").data(subData);
			boxes.attr("class", "bar")
				.attr("color", "grey")
				.attr("position", function (d, i) {
					var x = -5 + (i * spacing);
					var y = hscale(d["sensorData"]) / 2;
					var z = -4;

					return x + " " + y + " " + z;
				}).attr("height", function (d, i) {
					return hscale(d["sensorData"]);
				});

			hasChanged = false;
		}
	}
	render();
}