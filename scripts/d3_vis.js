// create fake data TODO: include json-data
var data = [];

for (var i = 0; i < 8; i++) {
	data[i] = (Math.sin(2 + i)*0.2+1);
}

// function for scaling data to correct height
var hscale = d3.scaleLinear()
.domain([0, d3.max(data)])
.range([0, 5]);

var scene = d3.select("a-scene");

// create text-fields for displaying value
var texts = scene.selectAll("a-text.bar").data(data);
texts.enter().append("a-text").attr("class", "bar")
	.attr("position", function(d,i) {
		var x = i * 2;
		var y = 1;
		var z = -3.5;

		return x + " " + y + " " + z;
	}).attr("value", function(d,i) {
		return Math.round(d * 100) / 100;
	})
	.attr("color", "red")
	.attr("align", "center");

// create boxes with correspoing heights
var boxes = scene.selectAll("a-box.bar").data(data);
boxes.enter().append("a-box").attr("class", "bar").attr("color","grey").attr("position", function(d,i) {
	var x = i * 2;
	var y = hscale(d) / 2;
	var z = -4;

	return x + " " + y + " " + z;
}).attr("height", function(d,i) {
	return hscale(d);
});

var t = 0;
function render() {
	// TODO: change data intervall if requested
	t += 0.01;
	requestAnimationFrame(render);
	
	// alter fake values
	for (var i = 0; i < 15; i++) {
		data[i] = (Math.sin(t*2 + i)*0.2+1);
	}

	// change bar-height to new value
	var boxes = scene.selectAll("a-box.bar").data(data);
	boxes.transition().duration(50).attr("height", function(d,i) {
		return hscale(d);
	}).attr("position", function(d,i) {
		var x = i * 2;
		var y = hscale(d) / 2;
		var z = -4;

		return x + " " + y + " " + z;
	});
	
	// change value in front of corresponding bar
	var texts = scene.selectAll("a-text.bar").data(data);
	texts.attr("value", function(d,i) {
		console.log(Math.round(d * 100) / 100);
		return Math.round(d * 100) / 100;
	});

}
render();