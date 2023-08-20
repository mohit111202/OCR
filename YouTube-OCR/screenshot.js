var selection = {};
var drag = false;

var imageManipulator = new Imagely();
var originalCroppedImage;
var offset;
var imageProportions = {};

async function setScreenshotUrl(url) {

    var canvas = document.getElementById('canvas');
    
    toggleLoader(false);
    toggleSetting(false);
    toggleInstructions("selecting");

    document.addEventListener('keydown', onSelectedRegion, false);
    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('mouseup', mouseUp, false);
    canvas.addEventListener('mousemove', mouseMove, false);

    iniatlizeToolbar();

    var ctx = canvas.getContext('2d');
    var img = new Image;
    var originalImage = new Image;

    var browserWidth = getWidth();
    var browserHeight = getHeight();

    ctx.canvas.width = browserWidth;
    ctx.canvas.height  = browserHeight;


    var urlCopy = (' ' + url).slice(1);
    img.src = url;
    originalImage.src = urlCopy;

    await loadImage();

    await loadImageOriginalImage();

    
    offset = imageOffsetCalculations(originalImage);

    var newUrl = canvas.toDataURL("image/png", 1.0);

    img.src = newUrl;

    await loadImage();

    function mouseDown(e) {
      selection.startX = e.pageX - this.offsetLeft;
      selection.startY = e.pageY - this.offsetTop;
      drag = true;
    }

    function mouseUp() {
      drag = false;
    }

    function iniatlizeToolbar() {
        document.getElementById('thresholdButton').addEventListener('click', function(event) { onButtonClick('Threshold', event, updateThreshold, 50);}, false);
        document.getElementById('invertButton').addEventListener('click', function(event) { onButtonClick('Invert', event, invertImage, 100);}, false);
        document.getElementById('analyseButton').addEventListener('click', submitImage, false);
    }

    function onButtonClick(name, event, manipulate, startingValue) {
        //discardUnappliedChanges();
        removeActiveClassFromAllButtons();
        event.target.classList.add("active");
        removeElementFromDOM('#slider');
        addNewSlider(name, manipulate, startingValue);
    }

    function removeActiveClassFromAllButtons() {
        var buttons = document.querySelectorAll('.setting-button-choose');
        buttons.forEach(function(button) {
            button.classList.remove("active");
        });
    }

    function addNewSlider(name, manipulate, startingValue) {
        currentSlider = new Slider(name, startingValue);
        manipulate();
        document.getElementById('rangeSlider').addEventListener('change', manipulate, false);
        document.getElementById('apply-button').addEventListener('click', applyChanges, false);
    }

    function removeElementFromDOM(name) {
        var element = document.querySelector(name);
    
        if(element) {   
            element.parentNode.removeChild(element);
        }
    } 

    async function applyChanges() {
        removeElementFromDOM('#slider');
        originalCroppedImage = ctx.getImageData(0, 0, imageProportions.width, imageProportions.height);  
    }

    function discardUnappliedChanges() {
        cropImage();
        
    }

    function mouseMove(e) {
      if (drag) {
        toggleSetting(false);
        toggleInstructions("selecting");
        removeElementFromDOM('#slider');
        setSelectionWidth((e.pageX - this.offsetLeft) - selection.startX);
        setSelectionHeight(selection.h = (e.pageY - this.offsetTop) - selection.startY);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        draw();
      }
    }

    function setSelectionHeight(value) {
        selection.h = value;
    }

    function setSelectionWidth(value) {
        selection.w = value;
    }

    function draw() {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img,0,0, img.width, img.height, 0, 0, browserWidth, browserHeight);
      ctx.globalAlpha = 0.1;
      ctx.fillRect(selection.startX, selection.startY, selection.w, selection.h);
      ctx.globalAlpha = 1.0;
    }

    function onSelectedRegion(e) {
        
        if (13 == e.keyCode) {
            onEnter();
        }

        if(e.key === "Escape") {
            ctx.drawImage(img,0,0, img.width, img.height, 0, 0, browserWidth, browserHeight);
            drag = false;
            toggleInstructions("selecting");
            toggleSetting(false);
            removeElementFromDOM('#slider');
            removeElementFromDOM('#code-box');
                    }
    }

    function onEnter() {
        cropImage();
        toggleSetting(true);
        toggleInstructions("settings");

    }

    function toggleLoader(state) {
        if(state) {
            document.getElementById('load').style.display = 'block';    
            return;
        }

        document.getElementById('load').style.display = 'none';
    }

    function toggleSetting(state) {
        if(state) {
            document.getElementById('image-settings').style.display = 'block';
            return;
        }

        document.getElementById('image-settings').style.display = 'none';

    }

    function toggleInstructions(state) {
        if (state === "selecting") {
            document.getElementById('select-instructions').style.display = 'block';
            document.getElementById('setting-instructions').style.display = 'none';
            return;
        }

        document.getElementById('select-instructions').style.display = 'none';
        document.getElementById('setting-instructions').style.display = 'block';
    }

    function submitImage() {
        var myImage = ctx.getImageData(0, 0, imageProportions.width, imageProportions.height);

        toggleLoader(true);
      
        Tesseract.recognize(myImage)
        .then(function(result){
            var formattedData = formatReturnedData(result.text);
            console.log(formattedData);
            toggleLoader(false);
            chrome.windows.create({
                url: chrome.runtime.getURL(`./code-box.html?${formattedData}`),
                width: 800,
                height: 800
            });
        })
    }

    function copyImageData(context, src) {
        var dst = context.createImageData(src.width, src.height);
        dst.data.set(src.data);
        return dst;
    }

    function invertImage() {
        var value = document.getElementById('rangeSlider').value;
        var copy = copyImageData(ctx, originalCroppedImage);
        var adjustedImage = imageManipulator.invert(copy, value);
        ctx.putImageData(adjustedImage, 0, 0);
    }

    function updateThreshold() {
        var value = document.getElementById('rangeSlider').value;
        var copy = copyImageData(ctx, originalCroppedImage);
        var adjustedImage = imageManipulator.threshold(copy, value);
        ctx.putImageData(adjustedImage, 0, 0);
    }

    function formatReturnedData(data) {
        return data.replace(/\n/g, "%0D%0A");
    }

    function createHtmlElemntForData(dataAsHtml, data) {
        var div = document.createElement('div');
        div.innerHTML = `<div class="code-box" id="code-box"> 
            <div class="code-box-header"><h2> Here is your text: </h2></div> 
                <div class="code-box-body" id="actual-code">
                    ${dataAsHtml}
                </div>
                <div class="code-box-disclaimer">
                    <p> Not happy with the result? <br/>Make sure your adjust the image with the settings on the right <br/> to be clear black text on a white background</p>
                </div>
                <div class="code-box-footer">

                    <div class="submit-image-button" id="copyButton">
                      Copy to Clipboard
                    </div>
                </div>
                
            </div>`;
        document.body.appendChild(div);

        document.getElementById('copyButton').addEventListener('click', function(){copyReturnedTextToClipboard(data)}, false);
    }

    function copyReturnedTextToClipboard(data) {    
       var el = document.createElement('textarea');
       el.value = data;
       el.setAttribute('readonly', '');
       el.style = {position: 'absolute', left: '-9999px'};
       document.body.appendChild(el);
       el.select();
       document.execCommand('copy');
       document.body.removeChild(el);
    }

    function cropImage() {

        if (!selection.startX) {
                aler("Please create a selection");
                toggleSetting(false);
                return;
        }

        ctx.clearRect(0,0,canvas.width,canvas.height);

        var startX = selection.startX * offset.width;
        var startY = selection.startY * offset.height;

        var width = selection.w * offset.width;
        var height = selection.h * offset.height;

        setImageProportions(browserWidth * 0.9, browserHeight * 0.9,height, width);

        ctx.drawImage(originalImage, startX, startY, width, height, 0, 0, imageProportions.width, imageProportions.height);
        originalCroppedImage = ctx.getImageData(0, 0, imageProportions.width, imageProportions.width);  
    }

    function setImageProportions(maxWidth, maxHeight, height, width) {
        var ratio = 0; 
        
        if (width > maxWidth){
            ratio = maxWidth / width;   
            height = height * ratio;   
            width = width * ratio;    
        }

        
        if (height > maxHeight){
            ratio = maxHeight / height; 
            width = width * ratio;    
            height = height * ratio;    
        }

        imageProportions.height = height;
        imageProportions.width = width;
    }

    function getWidth() {
      return Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
      );
    }

    function getHeight() {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      );
    }

    function imageOffsetCalculations(image) {
        var offset = {};
        offset.width = image.width / browserWidth;
        offset.height = image.height / browserHeight;

        return offset;
    }

    function loadImageOriginalImage() {
        return new Promise(function(resolve, reject) {
            try {
                originalImage.onload = function() {
                    resolve();
                } 
            }
            catch(error){
                reject(error);
            }
            
        });
    
    }

    function loadImage() {
        return new Promise(function(resolve, reject) {
            try {
                img.onload = function() {

                    ctx.drawImage(img,0,0, img.width, img.height, 0, 0, browserWidth, browserHeight);
                    resolve();
                } 
            }
            catch(error){
                reject(error);
            }
            
        });
    
    }
}
