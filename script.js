var fieldsPermittivities = [];
const MAX_X_DOMAIN = 10;
var k = 9 * Math.pow(10, 9);

var showFieldStrength = true;
var showElectricDisplacement = false;

var epsilon_0 = 1 / (k * 4 * Math.PI);

var outerFieldStrength = [1, 1];

var arrowDensity = 30;

var color_gradient_start = 0;
var color_gradient_finish = 40;

var dontShowStrengthBound = 0;
var dontShowDisplacementBound = 0;

var border = null;
var potentialStep = 1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRainbowColor(value) {
  value = (clamp(value, color_gradient_start, color_gradient_finish) - color_gradient_start) /
    (color_gradient_finish - color_gradient_start);

  value = clamp(value, 0, 1);

  const angle = value * 300;

  return "hsl(" + Math.round(angle) + " 80 50 / 75%)";
}


function round(number, a) {
  if (a > 0) {
    return (number).toFixed(a);
  } else if (a == 0) {
    return Math.round(number);
  } else {
    let r = number % Math.pow(10, -a);

    if (r / Math.pow(10, -a) > 0.5) {
      return number - number % Math.pow(10, -a);
    } else {
      return number - number % Math.pow(10, -a) + 1;
    }

  }
}

function digitnumber(number) {
  let a = 0;
  if (number == 0) {
    return 0;
  }
  number = Math.abs(number);
  if (number > 1) {
    while (number > 10) {
      number /= 10;
      a++;
    }
    return a;
  }
  while (number < 1) {
    number *= 10;
    a--;
  }
  return a;
}

function to_scientific_notation(number) {
  exponent = digitnumber(number);
  if (exponent != 0 && exponent != 1) {
    number = number * Math.pow(10, -exponent);
  }

  let string = round(number, 3);
  if (exponent != 0 && exponent != 1) {
    string += ' x 10^(' + exponent + ')';
  }
  return string;
}


const EPSILON = 0.01;


function innerSizes(node) {
  var computedStyle = getComputedStyle(node);

  let width = node.clientWidth;
  let height = node.clientHeight;
  
  width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
  height -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
  return [width, height];
}

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Border {
  constructor(id){
    this.id = id;
    this.DOMObject = document.getElementById(this.id);

    this.x_domain_start = -MAX_X_DOMAIN;
    this.x_domain = MAX_X_DOMAIN;
    this.width = innerSizes(this.DOMObject)[0];
    this.height = innerSizes(this.DOMObject)[1];
    this.y_domain_start = -this.height / this.width * MAX_X_DOMAIN;
    this.y_domain = this.height / this.width * MAX_X_DOMAIN;
  }
  getDOMObject(){
    this.DOMObject = document.getElementById(this.id);
    return this.DOMObject;
  }
}

function createHiPPICanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = (width) + "px";
  canvas.style.height = (height - 6) + "px";
  canvas.getContext("2d").scale(ratio, ratio);

  return canvas;
}

function canvasToModelCoords(i, j) {
  return [
    i / border.width * (border.x_domain - border.x_domain_start) + border.x_domain_start,
    (border.height - j) / border.height * (border.y_domain - border.y_domain_start) + border.y_domain_start
  
  ];
}

function modelToCanvasCoords(x, y) {
  return [
    (x - border.x_domain_start) / (border.x_domain - border.x_domain_start) * border.width,
    border.height - (y - border.y_domain_start) / (border.y_domain - border.y_domain_start) * border.height
  ]
}

function calculateFieldStrength(x, y) {
  let index = parseInt(((x + MAX_X_DOMAIN) / (2 * MAX_X_DOMAIN) * fieldsPermittivities.length));

  let result = [outerFieldStrength[0] / fieldsPermittivities[index], outerFieldStrength[1]];

  return result;
}

function calculateElectricDisplacement(x, y) {
  let index = parseInt(((x + MAX_X_DOMAIN) / (2 * MAX_X_DOMAIN) * fieldsPermittivities.length));

  let E = calculateFieldStrength(x, y);

  return [E[0] * epsilon_0 * fieldsPermittivities[index], E[1] * epsilon_0 * fieldsPermittivities[index]];
}

function drawVector(ctx, x, y, E_vector, arrowLength=30, lineWidth=2, color=null) {
  const arrowSize = 10;
  let E_vector_length = Math.hypot(E_vector[0], E_vector[1]);

  let [fromX, fromY] = modelToCanvasCoords(x, y);
  let [toX, toY] = modelToCanvasCoords(E_vector[0] + x, E_vector[1] + y);

  let vector = [toX - fromX, toY - fromY];
  let vectorLength = Math.hypot(vector[0], vector[1]);
  vector = [Math.round(vector[0] * arrowLength / vectorLength), Math.round(vector[1] * arrowLength / vectorLength)];

  [toX, toY] = [fromX + vector[0], fromY + vector[1]]

  const angle = Math.atan2(toY - fromY, toX - fromX);

  if (color === null){
    color = getRainbowColor(E_vector_length);
  }

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.lineTo(toX, toY);
  ctx.closePath();
  ctx.fill();
}

function drawPoint(ctx, i, j) {
  ctx.fillStyle = 'black';
  ctx.fillRect(i, j, 1, 1);
}

function redraw() {
  let chartObject = document.getElementById('mainchart');
  createHiPPICanvas(chartObject, border.width, border.height);

  let chartContext = chartObject.getContext('2d');
  chartContext.clearRect(0, 0, chartObject.width, chartObject.height);


  dx = (border.x_domain - border.x_domain_start) / border.width * arrowDensity;
  dy = dx;
  
  if (showElectricDisplacement){ 
    let defaultArrow = calculateElectricDisplacement(-MAX_X_DOMAIN, 0);
    let defaultArrowLengthMultiplier = 30 / Math.hypot(defaultArrow[0], defaultArrow[1]);

    for (let x = border.x_domain_start + dx / 2; x < border.x_domain; x += dx) {
      for (let y = border.y_domain_start + dy / 2; y < border.y_domain; y += dy) {      
        let E_vector = calculateElectricDisplacement(x, y);
        
        let E_vector_length = Math.hypot(E_vector[0], E_vector[1]);
        if (E_vector_length >= dontShowDisplacementBound) {
          drawVector(chartContext, x, y, E_vector, parseInt(defaultArrowLengthMultiplier * E_vector_length));
        }
      }
    }
  }

  if (showFieldStrength){ 
    let defaultArrow = calculateFieldStrength(-MAX_X_DOMAIN, 0);
    let defaultArrowLengthMultiplier = 30 / Math.hypot(defaultArrow[0], defaultArrow[1]);

    for (let x = border.x_domain_start; x < border.x_domain; x += dx) {
      for (let y = border.y_domain_start; y < border.y_domain; y += dy) {      
        let E_vector = calculateFieldStrength(x, y);
        
        let E_vector_length = Math.hypot(E_vector[0], E_vector[1]);
        if (E_vector_length >= dontShowStrengthBound) {
          drawVector(chartContext, x, y, E_vector, parseInt(defaultArrowLengthMultiplier * E_vector_length));
        }
      }
    }
  }

  
}



function reloadModel() {
    objects = [];
    border = new Border('border');

    redraw();
}

function collectData() {
  let outerFieldStrength_ = [
    parseFloat(document.getElementById('E_x').value) * Math.pow(10, parseFloat(document.getElementById('E_x_exp').value)),
    parseFloat(document.getElementById('E_y').value) * Math.pow(10, parseFloat(document.getElementById('E_y_exp').value)),
  ];

  let fieldsPermittivities_ = [];

  for (let i = 1; i <= fieldsPermittivities.length; i++) { 
    let epsilon = parseFloat(document.getElementById('epsilon_' + i).value);
    if (epsilon <= 0) {
      window.alert('Диэлектрическая проницаемость не может быть неположительной');
      return;
    }
      
    fieldsPermittivities_.push(epsilon);
  }
  
  let arrowDensity_ = parseInt(document.getElementById('arrowdensity').value);
  if (arrowDensity_ <= 0) {
    window.alert('Плотность стрелок не может быть неположительной');
    return;
  }

  let dontShowBound_ = parseFloat(document.getElementById('dontshowbound').value) * 
    Math.pow(10, parseInt(document.getElementById('dontshowboundexp').value));

  let dontShowDisplacementBound_ = parseFloat(document.getElementById('dontshowdisplacementbound').value) *
    Math.pow(10, parseInt(document.getElementById('dontshowbounddisplacementexp').value));

  color_gradient_finish = parseFloat(document.getElementById('colorsq5value').value);
  color_gradient_finish *= Math.pow(10, parseInt(document.getElementById('colorsq5exp').value));

  return [
    fieldsPermittivities_, arrowDensity_, 
    dontShowBound_, dontShowDisplacementBound_, outerFieldStrength_,
    document.getElementById('fieldStrength').checked,
    document.getElementById('electricDisplacement').checked,
  ];
}


function reloadForm() {
  let data = collectData();
  if (data == null) {
    return;
  }
  let old_data = [
    fieldsPermittivities, arrowDensity, 
    dontShowStrengthBound, dontShowDisplacementBound, outerFieldStrength, 
    showFieldStrength, showElectricDisplacement];
  let are_equal = old_data.length === data.length && old_data.every(function(value, index) { return value === data[index]});
  if (are_equal){
    document.getElementById('curtain').style.visibility = 'visible';
    redraw();
    document.getElementById('curtain').style.visibility = 'hidden';
    return;
  }
  [fieldsPermittivities, arrowDensity, dontShowStrengthBound, dontShowDisplacementBound, outerFieldStrength, showFieldStrength, showElectricDisplacement] = data;

  document.getElementById('curtain').style.visibility = 'visible';
  reloadModel();
  document.getElementById('curtain').style.visibility = 'hidden';
}


function showEnergyValue(event) {
  let shower = document.getElementById('chargeshower');
  shower.style.display = 'inline';

  let [x, y] = canvasToModelCoords(event.offsetX, event.offsetY);
  let fieldStrength = calculateFieldStrength(x, y);
  let fieldStrengthLength = Math.hypot(fieldStrength[0], fieldStrength[1]);

  let electricDisplacement = calculateElectricDisplacement(x, y);
  let electricDisplacementLength = Math.hypot(electricDisplacement[0], electricDisplacement[1]);

  let index = parseInt(((x + MAX_X_DOMAIN) / (2 * MAX_X_DOMAIN) * fieldsPermittivities.length));
  
  shower.innerHTML = "E = (" + to_scientific_notation(fieldStrength[0]) + ' В/м, ' + to_scientific_notation(fieldStrength[1]) + ' В/м)<br/>' + 
    '|E| = ' + to_scientific_notation(fieldStrengthLength) + ' В/м<br/>' + 
    "D = (" + to_scientific_notation(electricDisplacement[0]) + ' Кл/м<sup>2</sup>, ' + to_scientific_notation(electricDisplacement[1]) + ' Кл/м<sup>2</sup>)<br/>' + 
    '|D| = ' + to_scientific_notation(electricDisplacementLength) + ' Кл/м<sup>2</sup><br/>' + 
    'ε = ' + to_scientific_notation(fieldsPermittivities[index]) + '';

  let shower_width = getComputedStyle(shower).width;
  shower_width = +(shower_width.slice(0, shower_width.length - 2));

  shower.style.top = event.offsetY + 'px';
  if (shower_width + event.offsetX + 10 > border.width) {
    shower.style.left = event.offsetX - shower_width - 10 + 'px';
  } else {
    shower.style.left = event.offsetX + 10 + 'px';
  }
}

function removeEnergyValue(event) {
  let shower = document.getElementById('chargeshower');
  shower.style.display = 'none';
}

function updateColorGradient(event) {
  color_gradient_finish = parseFloat(document.getElementById('colorsq5value').value);
  color_gradient_finish *= Math.pow(10, parseInt(document.getElementById('colorsq5exp').value));

  for (let i = 1; i <= 4; i++) {
    document.getElementById('colorsq' + i + 'value').innerHTML = 
      to_scientific_notation(color_gradient_start + (i - 1) * (color_gradient_finish - color_gradient_start) / 4);
  }
}


function updateChargesForm() {
  let oneEnvironmentForm = `
            Среда №$1: <br/> 
            
            <label for="epsilon_$1">ε<sub>$1</sub></label> = <input type="number" step="0.001" value="$2" id="epsilon_$1" class="exponent_input" required>;
            `
  
  let removeChargeButton = "<button id=\"removeCharge$1\" type=\"button\">Удалить среду</button><br/>";

  let chargesForm = document.getElementById('chargesForm');

  chargesForm.innerHTML = "";

  for (let i = 1; i <= fieldsPermittivities.length; i++) {
    data = [i, fieldsPermittivities[i - 1]];

    let t = oneEnvironmentForm;
    for (let i = 1; i <= data.length; i++) {
      t = t.replaceAll('$' + i, data[i - 1]);
    }
    chargesForm.innerHTML += t + '\n';
  
    if (fieldsPermittivities.length > 1) {
      chargesForm.innerHTML += removeChargeButton.replaceAll("$1", i);
    }
  }
  if (fieldsPermittivities.length > 1) {
    for (let i = 1; i <= fieldsPermittivities.length; i++) {
      document.getElementById('removeCharge' + i).addEventListener('click', removeChargeForm);
    }
  }
}

function addEnvironmentForm() {
  fieldsPermittivities.push(1);
  updateChargesForm();
}

function removeChargeForm(event) {
  let n = event.currentTarget.id.slice("removeCharge".length, event.currentTarget.id.length) - 1;

  fieldsPermittivities = fieldsPermittivities.filter(function(_, i) {
    return i != n;
  });
  updateChargesForm();
}

window.onload = () => {
  let canvas = document.getElementById('mainchart');
  canvas.addEventListener("mousemove", showEnergyValue);
  canvas.addEventListener("mouseleave", removeEnergyValue);

  document.getElementById('colorsq5value').addEventListener('change', updateColorGradient);
  document.getElementById('colorsq5exp').addEventListener('change', updateColorGradient);
  updateColorGradient(1);

  document.getElementById('addEnvironment').addEventListener('click', addEnvironmentForm);

  fieldsPermittivities = [1, 2];
  updateChargesForm();
  reloadForm();

  document.getElementById('collisionForm').addEventListener('submit', function(event) {
    event.preventDefault();
    reloadForm();
  });

}
