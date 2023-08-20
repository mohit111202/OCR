
function createHtml(ocr_data) {

	var numberOfRows =  ocr_data.split(/\r\n|\r|\n/).length;

	var numberOfColumns = getColumnCount(ocr_data);
	
	console.log(ocr_data);

	var div = document.createElement('div');
	div.innerHTML = `
	<div class="code-box" id="code-box"> 
		<div class="text-container">
			<textarea rows="${numberOfRows}" cols="${numberOfColumns}" id="resultText">${ocr_data}</textarea>
		</div>
		<div class="button-container">
			<div class="copy-button"  id="copyButton">
				Copy to Clipboard
			</div>
		</div>

	</div>`;
	document.body.appendChild(div);

	document.getElementById('copyButton').addEventListener('click', copyResultToClipboard, false)
}

function getColumnCount(text) {
	var lines =  text.split("\n");

	var longestLine = lines.reduce(function (a, b) { return a.length > b.length ? a : b; })

	return longestLine.length ; 
}

function copyResultToClipboard() {

	document.oncopy = function (event) {
		var text = document.getElementById('resultText').value;
		event.clipboardData.setData('text/plain',text);
		event.preventDefault();
	};
	document.execCommand("copy", false, null);
}

function getParameters (url) {
	var target = url.substring(url.indexOf('?') + 1);
	return target.replace(new RegExp('%2520', 'g'), ' ');
};



var ocr_data = decodeURI(getParameters(window.location.href));
createHtml(ocr_data);




