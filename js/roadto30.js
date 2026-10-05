const START_DT = new Date('2026-08-01T00:00:00');
const END_DT   = new Date('2027-09-01T00:00:00');
const DAY_MS   = 86400000;
const START  = { x: 12, y: 18 };
const END = { x: 88, y: 82 };
const leBoys = [
	{ name: 'Philly',   date: '2026-09-11', x: 20, y: 20, face: 'assets/faces/philly.svg' },
	{ name: 'Ali',      date: '2026-09-18', x: 33, y: 26, face: 'assets/faces/ali.svg' },
	{ name: 'Rob III',  date: '2026-09-29', x: 51, y: 22, face: 'assets/faces/rob.svg' },
	{ name: 'Bush',     date: '2026-12-03', x: 69, y: 18, face: 'assets/faces/bush.svg' },
	{ name: 'Keano',    date: '2027-01-21', x: 85, y: 38, face: 'assets/faces/keano.svg' },
	{ name: 'Ben',      date: '2027-03-23', x: 70, y: 55, face: 'assets/faces/benhead.png' },
	{ name: 'Rossi T',  date: '2027-04-13', x: 45, y: 55, face: 'assets/faces/rossi.svg' },
	{ name: 'Gaz',      date: '2027-05-27', x: 26, y: 61, face: 'assets/faces/gaz.svg' },
	{ name: 'Si',       date: '2027-05-31', x: 27, y: 90, face: 'assets/faces/si.svg' },
	{ name: 'Timmy B',  date: '2027-06-28', x: 50, y: 80, face: 'assets/faces/timmy.svg' },
	{ name: 'Babyface', date: '2027-08-03', x: 74, y: 80, face: 'assets/faces/babyface.svg' },
];

let W, H, scene;
let stops = [], nodes = [], nodesPx = [], segSamples = [];
const SAMP = 24;
let totalDays, targetDay = 0, targetDate;
const car = { x: 0, y: 0, ready: false };
let doneState = [];
const confetti = [], faces = {}, palette = [], el = {};
let playing = false, playStep = 1;

function loadFaces() {
	leBoys.forEach((f, i) => {
		if (!f.face) return;
		const img = new Image();
		img.onload = () => { faces[i] = img; };
		img.onerror = () => { faces[i] = null; };
		img.src = f.face;
	});
}

function setup() {
	const stage = document.getElementById('stage');
	createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
	pixelDensity(Math.min(2, window.devicePixelRatio || 1));
	textFont('Roboto Mono');

	leBoys.forEach((f, i) => { f.when = new Date(f.date + 'T00:00:00'); f.idx = i; });
	stops = [...leBoys].sort((a, b) => a.when - b.when);
	stops.forEach((f, i) => { f.num = i + 1; palette[i] = colorFor(i); });

	nodes = [
		{ x: START.x, y: START.y, when: START_DT },
		...stops.map(f => ({ x: f.x, y: f.y, when: f.when })),
		{ x: END.x, y: END.y, when: END_DT },
	];
	totalDays = Math.round((END_DT - START_DT) / DAY_MS);

	wireControls();
	loadFaces();
	rebuild();

	const today = new Date(); today.setHours(0, 0, 0, 0);
	setDay(constrain(Math.round((today - START_DT) / DAY_MS), 0, totalDays), true);
	doneState = stops.map(f => targetDate >= f.when);

	if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
}

function windowResized() {
	const stage = document.getElementById('stage');
	resizeCanvas(stage.clientWidth, stage.clientHeight);
	rebuild();
	const p = roadPointByDate(targetDate);
	car.x = p.x; car.y = p.y;
}

function draw() {
	if (playing) {
		setDay(targetDay + playStep);
		if (targetDay >= totalDays) stopPlay();
	}
	const t = millis() / 1000;

	imageMode(CORNER);
	image(scene, 0, 0);

	const tp = roadPointByDate(targetDate);
	if (!car.ready) { car.x = tp.x; car.y = tp.y; car.ready = true; }
	car.x = lerp(car.x, tp.x, 0.12);
	car.y = lerp(car.y, tp.y, 0.12);

	const done = stops.map(f => targetDate >= f.when);
	done.forEach((d, i) => { if (d && !doneState[i]) burstConfetti(i); });
	doneState = done;

	stops.forEach((f, i) => { if (done[i]) drawFigure(f, i, t); });
	drawBus(car.x, car.y, stops.filter((f, i) => !done[i]), t);
	updateConfetti();
}

function rebuild() {
	W = width; H = height;
	nodesPx = nodes.map(n => ({ x: n.x / 100 * W, y: n.y / 100 * H }));
	segSamples = [];
	for (let i = 0; i < nodesPx.length - 1; i++) {
		const p0 = nodesPx[i - 1] || nodesPx[i];
		const p1 = nodesPx[i];
		const p2 = nodesPx[i + 1];
		const p3 = nodesPx[i + 2] || nodesPx[i + 1];
		const arr = [];
		for (let s = 0; s <= SAMP; s++) arr.push(catmull(p0, p1, p2, p3, s / SAMP));
		segSamples.push(arr);
	}
	renderScene();
}

function catmull(p0, p1, p2, p3, t) {
	const t2 = t * t, t3 = t2 * t;
	return {
		x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
		y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
	};
}

function fullPath() {
	const out = [];
	segSamples.forEach((arr, si) => arr.forEach((p, pi) => { if (!(si > 0 && pi === 0)) out.push(p); }));
	return out;
}

function roadPointByDate(date) {
	if (!segSamples.length) return { x: 0, y: 0 };
	const lastSeg = segSamples.length - 1;
	if (date <= nodes[0].when) return sampleAt(0, 0);
	if (date >= nodes[nodes.length - 1].when) return sampleAt(lastSeg, 1);
	for (let i = 0; i < nodes.length - 1; i++) {
		if (date <= nodes[i + 1].when) {
			const t = (date - nodes[i].when) / ((nodes[i + 1].when - nodes[i].when) || 1);
			return sampleAt(i, t);
		}
	}
	return sampleAt(lastSeg, 1);
}

function sampleAt(seg, t) {
	const arr = segSamples[seg];
	const f = constrain(t, 0, 1) * (arr.length - 1);
	const a = Math.floor(f), b = Math.min(a + 1, arr.length - 1), fr = f - a;
	return { x: lerp(arr[a].x, arr[b].x, fr), y: lerp(arr[a].y, arr[b].y, fr) };
}

function renderScene() {
	if (scene) scene.remove();
	scene = createGraphics(W, H);
	const g = scene;
	g.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
	g.textFont('Roboto Mono');

	const ctx = g.drawingContext;
	const grad = ctx.createLinearGradient(0, 0, 0, H);
	grad.addColorStop(0, '#f4f4f2');
	grad.addColorStop(1, '#e3e5e2');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, W, H);

	g.noStroke(); g.fill(54, 69, 79, 12);
	for (let y = 26; y < H; y += 46)
		for (let x = 26; x < W; x += 46) g.circle(x, y, 3);

	g.push();
	g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
	g.textSize(Math.min(W, H) * 0.85);
	g.fill(175, 29, 36, 14);
	g.text('30', W / 2, H / 2);
	g.pop();

	drawRoadInto(g);
	drawFlag(g, nodesPx[0], 'start');
	drawFlag(g, nodesPx[nodesPx.length - 1], 'finish');
	stops.forEach((f, i) => drawCheckpoint(g, f, i));
}

function drawRoadInto(g) {
	const pts = fullPath(), w = rwRoad();
	g.noFill(); g.strokeJoin(ROUND); g.strokeCap(ROUND);
	g.stroke('#2c3842'); g.strokeWeight(w + 8); polyline(g, pts);
	g.stroke('#4a5b68'); g.strokeWeight(w); polyline(g, pts);
	g.drawingContext.save();
	g.stroke('#ededed'); g.strokeWeight(Math.max(3, w * 0.08));
	g.drawingContext.setLineDash([2, w * 0.7]);
	polyline(g, pts);
	g.drawingContext.setLineDash([]);
	g.drawingContext.restore();
}

function polyline(g, pts) {
	g.beginShape();
	pts.forEach(p => g.vertex(p.x, p.y));
	g.endShape();
}

function drawCheckpoint(g, f) {
	const x = f.x / 100 * W, y = f.y / 100 * H, r = tileR();
	g.noStroke(); g.fill(0, 0, 0, 45); g.ellipse(x, y + r * 0.55, r * 2.1, r * 1.1);
	g.fill('#ededed'); g.stroke('#af1d24'); g.strokeWeight(Math.max(3, r * 0.22));
	g.circle(x, y, r * 2);
	g.noStroke(); g.fill('#af1d24');
	g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(r * 0.95);
	g.text(f.num, x, y + 1);
	drawLabel(g, f, x, y - r);
}

function drawLabel(g, f, cx, tileTop) {
	const name = f.name, date = fmtShort(f.when);
	const ns = Math.max(11, Math.min(W, H) * 0.02);
	const ds = Math.max(9, Math.min(W, H) * 0.016);
	g.textStyle(BOLD); g.textSize(ns); const wN = g.textWidth(name);
	g.textStyle(NORMAL); g.textSize(ds); const wD = g.textWidth(date);
	const padX = ns * 0.7, padY = ns * 0.5;
	const wCard = Math.max(wN, wD) + padX * 2;
	const hCard = ns + ds + padY * 2 + 3;
	const cy = tileTop - 8 - hCard / 2;

	g.rectMode(CENTER);
	g.noStroke(); g.fill(0, 0, 0, 30); g.rect(cx, cy + 2, wCard, hCard, 8);
	g.fill('#ffffff'); g.stroke('#36454f'); g.strokeWeight(1.2); g.rect(cx, cy, wCard, hCard, 8);
	g.noStroke();
	g.fill('#36454f'); g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(ns);
	g.text(name, cx, cy - ds * 0.55);
	g.fill('#6b7680'); g.textStyle(NORMAL); g.textSize(ds);
	g.text(date, cx, cy + ns * 0.6);
}

function drawFlag(g, p, kind) {
	const s = Math.min(W, H) * 0.045;
	g.push(); g.translate(p.x, p.y);
	g.stroke('#36454f'); g.strokeWeight(Math.max(2, s * 0.12));
	g.line(0, s * 0.2, 0, -s * 1.5);
	g.noStroke();
	if (kind === 'finish') {
		const sq = s * 0.3;
		for (let r = 0; r < 3; r++)
			for (let c = 0; c < 4; c++) {
				g.fill((r + c) % 2 ? '#36454f' : '#ededed');
				g.rect(2 + c * sq, -s * 1.5 + r * sq, sq, sq);
			}
	} else {
		g.fill('#2e8b57'); g.triangle(2, -s * 1.5, 2, -s * 0.85, s * 1.1, -s * 1.17);
	}
	g.pop();
}

function drawHead(x, y, r, img, col, num) {
	noStroke();
	fill(col); circle(x, y, r * 2);
	if (img && img.complete && img.naturalWidth) {
		drawingContext.save();
		drawingContext.beginPath();
		drawingContext.arc(x, y, r, 0, Math.PI * 2);
		drawingContext.clip();
		drawingContext.drawImage(img, x - r, y - r, r * 2, r * 2);
		drawingContext.restore();
	} else {
		fill('#36454f'); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(r * 0.95);
		text(num, x, y + 1);
	}
	noFill(); stroke('#36454f'); strokeWeight(Math.max(2, r * 0.14)); circle(x, y, r * 2);
}

function drawFigure(f, i, t) {
	const x = f.x / 100 * W, y = f.y / 100 * H, R = tileR(), hr = R * 0.62;
	const bob = Math.sin(t * 2 + i) * hr * 0.12;
	push();
	translate(x + R * 1.05, y - R * 0.05 - bob);

	noStroke(); fill(0, 0, 0, 30); ellipse(0, hr * 2.3, hr * 2.0, hr * 0.7);

	stroke('#36454f'); strokeWeight(hr * 0.3);
	line(-hr * 0.4, hr * 2.2, -hr * 0.4, hr * 1.5);
	line(hr * 0.4, hr * 2.2, hr * 0.4, hr * 1.5);
	line(-hr * 0.7, hr * 0.4, -hr * 1.15, hr * 0.9);

	rectMode(CENTER);
	stroke('#36454f'); strokeWeight(hr * 0.22); fill('#af1d24');
	rect(0, hr * 0.8, hr * 1.5, hr * 1.7, hr * 0.7);

	push(); translate(hr * 0.7, hr * 0.35);
	rotate(-0.6 + Math.sin(t * 6 + i) * 0.5);
	stroke('#36454f'); strokeWeight(hr * 0.28); line(0, 0, hr * 1.1, 0);
	pop();

	drawHead(0, -hr * 0.45, hr, faces[f.idx], palette[i], f.num);

	noStroke(); fill(palette[i]);
	triangle(-hr * 0.75, -hr * 1.05, hr * 0.75, -hr * 1.05, 0, -hr * 2.2);
	fill('#ffffff'); circle(0, -hr * 2.2, hr * 0.32);
	pop();
}

function drawBus(cx, cy, riding, t) {
	const bw = busW(), bh = busH(), hr = headR();
	const bob = Math.sin(t * 3) * bh * 0.04;
	push();
	translate(cx, cy + bob);

	noStroke(); fill(0, 0, 0, 38); ellipse(0, bh * 0.72, bw * 1.02, bh * 0.32);

	drawWheel(-bw * 0.3, bh * 0.56, bh * 0.2, t);
	drawWheel(bw * 0.3, bh * 0.56, bh * 0.2, t);

	rectMode(CENTER);
	stroke('#36454f'); strokeWeight(Math.max(2, bh * 0.04));
	fill('#af1d24'); rect(0, 0, bw, bh, bh * 0.3);
	noStroke(); fill('#8f1a1f'); rect(0, bh * 0.3, bw - bh * 0.06, bh * 0.26, bh * 0.14);
	fill('#e9eff1'); rect(0, -bh * 0.04, bw * 0.9, bh * 0.3, bh * 0.1);
	fill('#ffd34e');
	circle(bw * 0.46, bh * 0.1, bh * 0.16);
	circle(-bw * 0.46, bh * 0.1, bh * 0.16);

	const layout = headLayout(riding.length, bw);
	riding.forEach((f, k) => {
		const p = layout[k];
		const hb = Math.sin(t * 4 + k) * hr * 0.14;
		drawHead(p.x, -bh * 0.3 + p.y + hb, hr, faces[f.idx], palette[f.num - 1], f.num);
	});
	pop();
}

function headLayout(n, bw) {
	const inner = bw * 0.82, hr = headR();
	const rows = n > 6 ? 2 : 1;
	const per = Math.ceil(n / rows);
	const pos = [];
	for (let i = 0; i < n; i++) {
		const r = Math.floor(i / per);
		const count = Math.min(per, n - r * per);
		const idx = i - r * per;
		const step = count > 1 ? inner / (count - 1) : 0;
		const x = count > 1 ? -inner / 2 + idx * step : 0;
		const y = rows === 1 ? 0 : (r === 0 ? -hr * 0.95 : hr * 0.5);
		pos.push({ x, y });
	}
	return pos;
}

function drawWheel(x, y, r, t) {
	push(); translate(x, y);
	noStroke(); fill('#2b3640'); circle(0, 0, r * 2);
	fill('#c9ccce'); circle(0, 0, r * 0.9);
	stroke('#2b3640'); strokeWeight(Math.max(1, r * 0.12));
	const a = t * 6;
	for (let k = 0; k < 4; k++) {
		const ang = a + k * (Math.PI / 2);
		line(0, 0, Math.cos(ang) * r * 0.7, Math.sin(ang) * r * 0.7);
	}
	pop();
}

function burstConfetti(i) {
	const x = stops[i].x / 100 * W, y = stops[i].y / 100 * H;
	const cols = [palette[i], '#af1d24', '#ffd34e', '#36454f', '#2e8b57'];
	for (let k = 0; k < 36; k++) {
		confetti.push({
			x, y: y - tileR(),
			vx: random(-2.6, 2.6), vy: random(-5.5, -1.5),
			g: 0.12 + random(0.06), rot: random(Math.PI * 2), vr: random(-0.3, 0.3),
			s: random(4, 9), col: random(cols), life: 1,
		});
	}
}

function updateConfetti() {
	for (let k = confetti.length - 1; k >= 0; k--) {
		const p = confetti[k];
		p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
		if (p.life <= 0 || p.y > H + 20) { confetti.splice(k, 1); continue; }
		push(); translate(p.x, p.y); rotate(p.rot);
		const c = color(p.col); c.setAlpha(255 * Math.max(0, p.life));
		noStroke(); fill(c); rectMode(CENTER); rect(0, 0, p.s, p.s * 0.5);
		pop();
	}
}

function wireControls() {
	el.slider = document.getElementById('scrubber');
	el.today = document.getElementById('today-btn');
	el.play = document.getElementById('play-btn');
	el.date = document.getElementById('readout-date');
	el.count = document.getElementById('readout-count');

	el.slider.min = 0; el.slider.max = totalDays; el.slider.step = 1;
	el.slider.addEventListener('input', () => setDay(Number(el.slider.value)));
	el.today.addEventListener('click', () => {
		const t = new Date(); t.setHours(0, 0, 0, 0);
		setDay(constrain(Math.round((t - START_DT) / DAY_MS), 0, totalDays));
	});
	el.play.addEventListener('click', togglePlay);
	playStep = totalDays / (60 * 9);
}

function setDay(d, initial) {
	targetDay = constrain(d, 0, totalDays);
	targetDate = new Date(START_DT.getTime() + targetDay * DAY_MS);
	el.slider.value = targetDay;
	updateReadout();
	if (initial) { const p = roadPointByDate(targetDate); car.x = p.x; car.y = p.y; car.ready = true; }
}

function updateReadout() {
	const done = stops.filter(f => targetDate >= f.when).length;
	el.date.textContent = fmtLong(targetDate);
	el.count.textContent = `${done} of the boys have turned 30`;
}

function togglePlay() {
	if (playing) { stopPlay(); return; }
	if (targetDay >= totalDays) setDay(0);
	playing = true;
	el.play.textContent = '\u275A\u275A Pause';
}

function stopPlay() {
	playing = false;
	el.play.textContent = '\u25B6 Play the year';
}

function colorFor(i) { return `hsl(${(i * 33) % 360}, 62%, 68%)`; }
function fmtLong(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
function fmtShort(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function rwRoad() { return Math.max(16, Math.min(W, H) * 0.058); }
function tileR() { return Math.max(15, Math.min(W, H) * 0.03); }
function busW() { return Math.min(W, H) * 0.37; }
function busH() { return Math.min(W, H) * 0.15; }
function headR() { return Math.min(W, H) * 0.026; }
