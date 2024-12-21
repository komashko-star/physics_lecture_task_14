var charges = [];
var MAX_X_DOMAIN = 10;
var k = 9 * Math.pow(10, 9);

var arrowDensity = 30;

var color_gradient_start = 0;
var color_gradient_finish = 40;

var dontShowBound = 0;

var border = null;
var potentialStep = 1;

const defaultChargeValues = [0, 0, 1, -9];

class Charge {
  constructor(x, y, charge) {
    this.type = "charge";
    this.x = x;
    this.y = y;
    this.charge = charge;
  }

  calculatePotential(x0, y0) {
    if (x0 == this.x && y0 == this.y) {
      return 0;
    }

    let hypot = Math.hypot(this.x - x0, this.y - y0);

    return k * this.charge / hypot;
  }

  calculateStrength(x0, y0) {
    if (x0 == this.x && y0 == this.y) {
      return [0, 0];
    }

    let r = [x0 - this.x, y0 - this.y];
    let r_length = Math.hypot(r[0], r[1]);

    let E_q = k * this.charge / Math.pow(r_length, 3);

    return [E_q * r[0], E_q * r[1]];
  }
}

var scalar_product = (a, b) => { return a[0] * b[0] + a[1] * b[1]; };

class Dipole {
  constructor(x, y, moment) {
    this.type = "dipole";
    this.x = x;
    this.y = y;
    this.moment = Math.abs(moment[0], moment[1]);
    this.moment_vector = moment;
  }

  calculatePotential(x0, y0) {
    if (x0 == this.x && y0 == this.y) {
      return 0;
    }

    let r = [x0 - this.x, y0 - this.y];
    let hypot = Math.hypot(r[0], r[1]);

    let r_n = [r[0] / hypot, r[1] / hypot];

    return k / hypot / hypot * scalar_product(this.moment_vector, r_n);
  }

  calculateStrength(x0, y0) {
    if (x0 == this.x && y0 == this.y) {
      return [0, 0];
    }

    let r = [x0 - this.x, y0 - this.y];
    let hypot = Math.hypot(r[0], r[1]);

    let r_n = [r[0] / hypot, r[1] / hypot];

    let t = 2 * scalar_product(r_n, this.moment_vector);

    let t1 = [t * r_n[0], t * r_n[1]];
    let t2 = [t1[0] - this.moment_vector[0], t1[1] - this.moment_vector[1]]

    let E_q = k / Math.pow(hypot, 3);

    return [E_q * t2[0], E_q * t2[1]];

  }
}

const defaultChargeFactory = () => new Charge(0, 0, Math.pow(10, -9));
const defaultDipoleFactory = () => new Dipole(0, 0, [Math.pow(10, -9), 0]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRainbowColor(value) {
  value = (clamp(value, color_gradient_start, color_gradient_finish) - color_gradient_start) /
    (color_gradient_finish - color_gradient_start);

  value = clamp(value, 0, 1);

  const angle = value * 300;

  return "hsl(" + Math.round(angle) + " 80 50)";
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

class Equipotential {
  constructor(targetValue, potentialFunc) {
    this.targetValue = targetValue;
    this.potentialFunc = potentialFunc;
    this.cells = {};
  }

  Search(startCell) {
    let startNeighbors = [];
    for (let d of [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let newCell = [startCell[0] + d[0], startCell[1] + d[1]];
      startNeighbors.push(newCell);
    }

    startNeighbors.sort((a, b) => {
        let p1 = canvasToModelCoords(a[0], a[1]);
        let p2 = canvasToModelCoords(b[0], b[1]);
        let abs1 = Math.abs(this.targetValue - calculateFieldPotential(p1[0], p1[1]));
        let abs2 = Math.abs(this.targetValue - calculateFieldPotential(p2[0], p2[1]));
        return abs1 - abs2;
      }
    )

    this.Add(new Vec2(startCell[0], startCell[1]));

    while (true){
      let neighbors = [];
      for (let d of [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let newCell = [startCell[0] + d[0], startCell[1] + d[1]];
        neighbors.push(newCell);
      }

      neighbors.sort((a, b) => {
          let p1 = canvasToModelCoords(a[0], a[1]);
          let p2 = canvasToModelCoords(b[0], b[1]);
          let abs1 = Math.abs(this.targetValue - calculateFieldPotential(p1[0], p1[1]));
          let abs2 = Math.abs(this.targetValue - calculateFieldPotential(p2[0], p2[1]));
          return abs1 - abs2;
        }
      )

      let success = false;

      let i = 0;
      while (i < 4) {
        if (!this.Exists(new Vec2(neighbors[i][0], neighbors[i][1]))) {
          this.Add(new Vec2(neighbors[i][0], neighbors[i][1]));
          if (0 <= neighbors[i][0] && neighbors[i][0] < border.width && 0 <= neighbors[i][1] && neighbors[i][1] < border.height) {
            startCell = neighbors[i];
          } else if (0 <= startNeighbors[1][0] && startNeighbors[1][0] < border.width && 0 <= startNeighbors[1][1] && startNeighbors[1][1] < border.height) {
            startCell = startNeighbors[1];
          }
          success = true;
          break;
        }
        i++
      }
      if (success) {
        continue;
      }
      
      break;
    }
  }

  Exists(vec) {
    return this.cells[vec.x] != undefined && this.cells[vec.x][vec.y] === 1;
  }

  Add(vec) {
    if (!(vec.x in this.cells)) {
      this.cells[vec.x] = {};
    }
    this.cells[vec.x][vec.y] = 1;
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
  let vector = [0, 0];

  for (var i = 0; i < charges.length; i++) {
    let E_q = charges[i].calculateStrength(x, y);

    vector = [vector[0] + E_q[0], vector[1] + E_q[1]];
  }

  return vector;
}

function calculateFieldPotential(x, y) {
  let potential = 0;

  for (var i = 0; i < charges.length; i++) {
    potential += charges[i].calculatePotential(x, y);
  }

  return potential;
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

  drawEquipotentials(chartContext);

  dx = (border.x_domain - border.x_domain_start) / border.width * arrowDensity;
  dy = dx;
  for (let x = border.x_domain_start; x < border.x_domain; x += dx) {
    for (let y = border.y_domain_start; y < border.y_domain; y += dy) {      
      let E_vector = calculateFieldStrength(x, y);
      
      let E_vector_length = Math.hypot(E_vector[0], E_vector[1]);
      if (E_vector_length >= dontShowBound) {
        drawVector(chartContext, x, y, E_vector);
      }
    }
  }

  for (var i = 0; i < charges.length; i++) {
    let [i_0, j_0] = modelToCanvasCoords(charges[i].x, charges[i].y);

    let radius = 10;

    let F = calculateForceForCharge(i);

    drawVector(chartContext, charges[i].x, charges[i].y, F, 60, 5, 'Indigo');

    if (charges[i].type == 'charge') {
      chartContext.fillStyle = charges[i].charge > 0 ? 'red' : charges[i].charge < 0 ? 'blue' : 'gray';
      chartContext.beginPath();
      chartContext.arc(i_0, j_0, radius, 0, 2 * Math.PI);
      chartContext.fill();
    } else {
      let angle = Math.atan2(-charges[i].moment_vector[1], charges[i].moment_vector[0]);

      chartContext.fillStyle = 'red';
      chartContext.beginPath();
      chartContext.arc(i_0, j_0, radius, angle - Math.PI / 2, angle + Math.PI / 2);
      chartContext.fill();
      chartContext.fillStyle = 'blue';
      chartContext.beginPath();
      chartContext.arc(i_0, j_0, radius, angle - Math.PI / 2, angle + Math.PI / 2, true);
      chartContext.fill();
    }
  }
}

var cells = {};

function Exists(i, j) {
  return cells[i] != undefined && cells[i][j] === 1;
}

function Add(i, j) {
  if (!(i in cells)) {
    cells[i] = {};
  }
  cells[i][j] = 1;
}


function drawEquipotentials(chartContext) {
  cells = {};


  for (let i = 0; i < border.width; i++) {
    for (let j = 0; j < border.height; j++) {      
      if (Exists(i, j)) {
        continue;
      }

      let [x, y] = canvasToModelCoords(i, j);
      let potential = calculateFieldPotential(x, y);

      if (Math.abs(potential % potentialStep) > 0.01 * potentialStep) {
        continue;
      }
      
      let equipotential = new Equipotential(potential);
      equipotential.Search([i, j]);
      for (let x0 in equipotential.cells) {
        for (let y0 in equipotential.cells[x0]) {
          drawPoint(chartContext, x0, y0);
          Add(x0, y0);
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
  let charges_ = [];

  for (let i = 1; i <= charges.length; i++) { 
    let x_0_ = parseFloat(document.getElementById('x_' + i).value);
    let y_0_ = parseFloat(document.getElementById('y_' + i).value);
    let type_ = document.getElementById('x_' + i).classList.contains('dipole') ? 'dipole' : 'charge';

    if (type_ == 'charge') {
      let q_0_ = parseFloat(document.getElementById('q_' + i).value);
      let q_0_exp = parseFloat(document.getElementById('q_' + i + '_exp').value);

      charges_.push(new Charge(x_0_, y_0_, q_0_ * Math.pow(10, q_0_exp)));
    } else {
      let p_x = parseFloat(document.getElementById('p_x_' + i).value);
      let p_x_exp = parseFloat(document.getElementById('p_x_' + i + '_exp').value);
      let p_y = parseFloat(document.getElementById('p_y_' + i).value);
      let p_y_exp = parseFloat(document.getElementById('p_y_' + i + '_exp').value);

      charges_.push(new Dipole(x_0_, y_0_, [p_x * Math.pow(10, p_x_exp), p_y * Math.pow(10, p_y_exp)]));
    }

  }
  
  let arrowDensity_ = parseInt(document.getElementById('arrowdensity').value);
  if (arrowDensity_ <= 0) {
    window.alert('Плотность стрелок не может быть неположительной');
    return;
  }

  let potentialStep_ = parseInt(document.getElementById('potentialStep').value);
  if (potentialStep_ <= 0) {
    window.alert('Плотность эквипотенциальных поверхностей не может быть неположительной');
    return;
  }
  
  let dontShowBound_ = parseFloat(document.getElementById('dontshowbound').value);
  dontShowBound_ *= Math.pow(10, parseInt(document.getElementById('dontshowboundexp').value));

  let MAX_X_DOMAIN_ = parseFloat(document.getElementById('x_domain').value) / 2;
  if (MAX_X_DOMAIN_ <= 0) {
    window.alert('Ширина области не может быть неположительной');
    return;
  }
  color_gradient_finish = parseFloat(document.getElementById('colorsq5value').value);
  color_gradient_finish *= Math.pow(10, parseInt(document.getElementById('colorsq5exp').value));

  return [charges_, MAX_X_DOMAIN_, arrowDensity_, dontShowBound_, potentialStep_];
}


function reloadForm() {
  let data = collectData();
  if (data == null) {
    return;
  }
  let old_data = [charges, MAX_X_DOMAIN, arrowDensity, dontShowBound, potentialStep];
  let are_equal = old_data.length === data.length && old_data.every(function(value, index) { return value === data[index]});
  if (are_equal){
    document.getElementById('curtain').style.visibility = 'visible';
    redraw();
    document.getElementById('curtain').style.visibility = 'hidden';
    return;
  }
  [charges, MAX_X_DOMAIN, arrowDensity, dontShowBound, potentialStep] = data;

  document.getElementById('curtain').style.visibility = 'visible';
  reloadModel();
  document.getElementById('curtain').style.visibility = 'hidden';
  
  updateChargesForces();
}


function showEnergyValue(event) {
  let shower = document.getElementById('chargeshower');
  shower.style.display = 'inline';

  let [x, y] = canvasToModelCoords(event.offsetX, event.offsetY);
  let fieldStrength = calculateFieldStrength(x, y);
  let fieldStrengthLength = Math.hypot(fieldStrength[0], fieldStrength[1]);
  
  shower.innerHTML = "(" + to_scientific_notation(x) + ' м, ' + to_scientific_notation(y) + " м)<br/>" + 
    "(" + to_scientific_notation(fieldStrength[0]) + ' В/м, ' + to_scientific_notation(fieldStrength[1]) + ' В/м)<br/>' + 
    to_scientific_notation(fieldStrengthLength) + ' В/м<br/>' + 
    to_scientific_notation(calculateFieldPotential(x, y)) + ' В';

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

function fieldGradient(func, r, delta = 1e-5) {
  const grad = [[0, 0], [0, 0]];

  for (let i = 0; i < 2; i++) {
    const dr = [0, 0];
    dr[i] = delta;

    const E_forward = func(r[0] + dr[0], r[1] + dr[1]);
    const E_backward = func(r[0] - dr[0], r[1] - dr[1]);

    for (let j = 0; j < 2; j++) {
      grad[j][i] = (E_forward[j] - E_backward[j]) / (2 * delta);
    }
  }
  return grad;
}

function calculateForceForCharge(i) {
  if (charges[i].type == 'charge'){
    let E = calculateFieldStrength(charges[i].x, charges[i].y);

    return [charges[i].charge * E[0], charges[i].charge * E[1]];
  } else {      
    let gradE = fieldGradient(calculateFieldStrength, [charges[i].x, charges[i].y]);

    const F = [0, 0];

    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < 2; j++) {
        F[k] += gradE[k][j] * charges[i].moment_vector[j];
      }
    }

    return F;
  }
}

function updateChargesForces() {
  for (let i = 0; i < charges.length; i++) {
    if (charges[i].type == 'charge'){
      let F = calculateForceForCharge(i);

      document.getElementById('F_x_' + (i + 1)).innerHTML = to_scientific_notation(F[0]);
      document.getElementById('F_y_' + (i + 1)).innerHTML = to_scientific_notation(F[1]);
    } else {
      let E = calculateFieldStrength(charges[i].x, charges[i].y);
      
      let F = calculateForceForCharge(i);

      document.getElementById('F_x_' + (i + 1)).innerHTML = to_scientific_notation(F[0]);
      document.getElementById('F_y_' + (i + 1)).innerHTML = to_scientific_notation(F[1]);

      let M = charges[i].moment_vector[0] * E[1] - charges[i].moment_vector[1] * E[0];

      document.getElementById('M_' + (i + 1)).innerHTML = to_scientific_notation(M);
    }
  }
}

function updateChargesForm() {
  let oneChargeForm = `
            Заряд №$1: <br/> 
            
            <label for="x_$1">x<sub>$1</sub></label> = <input type="number" step="0.001" value="$2" id="x_$1" class="exponent_input" required> м;
            <label for="y_$1">y<sub>$1</sub></label> = <input type="number" step="0.001" value="$3" id="y_$1" class="exponent_input" required> м <br/>
                
            <label for="q_$1">q<sub>$1</sub></label> = <input type="number" step="0.001" value="$4" id="q_$1" class="exponent_input" required> x 
            10^<input type="number" step="1" value="$5" id="q_$1_exp" class="exponent_input" required> Кл <br/>

            Сила со стороны поля: <br/>

            F<sub>$1</sub> = (<span id="F_x_$1"> $6 </span> Н, <span id="F_y_$1"> $7 </span> Н)<br/>
            `
  let oneDipoleForm = `
            Диполь №$1: <br/> 
            
            <label for="x_$1">x<sub>$1</sub></label> = <input type="number" step="0.001" value="$2" id="x_$1" class="exponent_input dipole" required> м;
            <label for="y_$1">y<sub>$1</sub></label> = <input type="number" step="0.001" value="$3" id="y_$1" class="exponent_input" required> м <br/>
                
            <label for="p_x_$1">p<sub>$1</sub></label> = (
            <input type="number" step="0.001" value="$4" id="p_x_$1" class="exponent_input" required> x 
            10^<input type="number" step="1" value="$5" id="p_x_$1_exp" class="exponent_input" required> Кл⋅м, <br/>
            <input type="number" step="0.001" value="$6" id="p_y_$1" class="exponent_input" required> x 
            10^<input type="number" step="1" value="$7" id="p_y_$1_exp" class="exponent_input" required> Кл⋅м)<br/>

            Сила со стороны поля: <br/>

            F<sub>$1</sub> = (<span id="F_x_$1"> $8 </span> Н, <span id="F_y_$1"> $9 </span> Н)<br/>

            Момент сил: M<sub>$1</sub> = <span id="M_$1"> $10 </span> Н⋅м<br/>
            `

  let removeChargeButton = "<button id=\"removeCharge$1\" type=\"button\">Удалить заряд</button><br/>";

  let chargesForm = document.getElementById('chargesForm');

  chargesForm.innerHTML = "";

  for (let i = 1; i <= charges.length; i++) {
    let data = [i, charges[i - 1].x, charges[i - 1].y];
    if (charges[i - 1].type == 'charge'){
      let number = charges[i - 1].charge;

      let exponent = digitnumber(number);
      if (exponent != 0 && exponent != 1) {
        number = number * Math.pow(10, -exponent);
      }
    
      data.push(round(number, 3));
      data.push(exponent);
    } else {
      let number1 = charges[i - 1].moment_vector[0];

      let exponent = digitnumber(number1);
      if (exponent != 0 && exponent != 1) {
        number1 = number1 * Math.pow(10, -exponent);
      }
    
      data.push(round(number1, 3));
      data.push(exponent);

      number1 = charges[i - 1].moment_vector[1];

      exponent = digitnumber(number1);
      if (exponent != 0 && exponent != 1) {
        number1 = number1 * Math.pow(10, -exponent);
      }
    
      data.push(round(number1, 3));
      data.push(exponent);
    }

    let t = charges[i - 1].type == 'charge' ? oneChargeForm : oneDipoleForm;
    for (let i = 1; i <= data.length; i++) {
      t = t.replaceAll('$' + i, data[i - 1]);
    }
    chargesForm.innerHTML += t + '\n';
  
    if (charges.length > 1) {
      chargesForm.innerHTML += removeChargeButton.replaceAll("$1", i);
    }
  }
  if (charges.length > 1) {
    for (let i = 1; i <= charges.length; i++) {
      document.getElementById('removeCharge' + i).addEventListener('click', removeChargeForm);
    }
  }
  
  updateChargesForces();
}

function addChargeForm() {
  charges.push(defaultChargeFactory());
  updateChargesForm();
}

function addDipoleForm() {
  charges.push(defaultDipoleFactory());
  updateChargesForm();
}

function removeChargeForm(event) {
  let n = event.currentTarget.id.slice("removeCharge".length, event.currentTarget.id.length) - 1;

  charges = charges.filter(function(_, i) {
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

  document.getElementById('addCharge').addEventListener('click', addChargeForm);
  document.getElementById('addDipole').addEventListener('click', addDipoleForm);

  let ch = 1 / (k / 9);

  charges = [
    new Dipole(0, 0, [ch, ch]),
  ]
  updateChargesForm();
  reloadForm();

  document.getElementById('collisionForm').addEventListener('submit', function(event) {
    event.preventDefault();
    reloadForm();
  });

}
