(function() {
  const canvas = document.getElementById('pemmCanvas');
  const ctx = canvas.getContext('2d');
  const infoEl = document.getElementById('pemmInfo');
  
  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
  }
  window.addEventListener('resize', resize);
  resize();
  setTimeout(resize, 150);

  const vertices = [
    {x: -1, y: -1, z: -1, id: '1', col: '#1a73e8'},
    {x:  1, y: -1, z: -1, id: '6', col: '#ff7b00'},
    {x:  1, y:  1, z: -1, id: '4', col: '#d90429'},
    {x: -1, y:  1, z: -1, id: '2', col: '#ffb703'},
    {x: -1, y: -1, z:  1, id: '8', col: '#d90429'},
    {x:  1, y: -1, z:  1, id: '7', col: '#70e000'},
    {x:  1, y:  1, z:  1, id: '5', col: '#1a73e8'},
    {x: -1, y:  1, z:  1, id: '3', col: '#70e000'}
  ];
  
  // РЕБРА ПРОПИСАНЫ СТРОГО ПО ПАРАМ ДЛЯ СБОРКИ КУБА
  const edges = [
    0,1, 1,2, 2,3, 3,0,
    4,5, 5,6, 6,7, 7,4,
    0,4, 1,5, 2,6, 3,7
  ];
  
  let angleX = 0.4;
  let angleY = 0.6;
  let scale = 25;
  let isDragging = false;
  let hoveredVertex = -1;
  let prevM = { x: 0, y: 0 };

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevM = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    if (isDragging) {
      angleY += (e.clientX - prevM.x) * 0.01;
      angleX += (e.clientY - prevM.y) * 0.01;
      prevM = { x: e.clientX, y: e.clientY };
    } else {
      hoveredVertex = -1;
      for (let i = 0; i < vertices.length; i++) {
        const p = project(vertices[i], angleX, angleY, canvas.width/2, canvas.height/2);
        const dx = mx - p.x;
        const dy = my - p.y;
        if (dx*dx + dy*dy < 144) {
          hoveredVertex = i;
          break;
        }
      }
      if (hoveredVertex !== -1) {
        infoEl.innerHTML = `Вектор №${vertices[hoveredVertex].id}: R=0.25 фм<br>Углы полей: 70.53° / 109.47°`;
      } else {
        infoEl.innerHTML = `Позитрон (0.833 фм) включает керн (0.25 фм) и 8 мюонов по 0.25 фм.`;
      }
    }
  });

  function project(v, ax, ay, cx, cy) {
    let x1 = v.x * Math.cos(ay) - v.z * Math.sin(ay);
    let z1 = v.x * Math.sin(ay) + v.z * Math.cos(ay);
    let y2 = v.y * Math.cos(ax) - z1 * Math.sin(ax);
    let z2 = v.y * Math.sin(ax) + z1 * Math.cos(ax);
    return { x: cx + x1 * scale, y: cy + y2 * scale, z: z2, id: v.id, col: v.col };
  }

  function drawKern(cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2*Math.PI);
    ctx.clip();
    let sz = 3;
    for (let i = cx - r; i < cx + r; i += sz) {
      for (let j = cy - r; j < cy + r; j += sz) {
        let xi = Math.floor((i-cx)/sz);
        let yi = Math.floor((j-cy)/sz);
        ctx.fillStyle = (xi + yi) % 2 === 0 ? '#ff2a2a' : '#1a73e8';
        ctx.fillRect(i, j, sz, sz);
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2*Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
  }

  function draw() {
    if(!canvas || canvas.width === 0) return requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r_pos = 0.833 * 50;
    const r_k = 0.25 * 50;
    const r_m = 0.25 * 50;
    scale = (r_pos * (2/3)) / Math.sqrt(3);

    const proj = vertices.map(v => project(v, angleX, angleY, cx, cy));
    let items = proj.map((p, i) => ({ type: 'muon', z: p.z, data: p, idx: i }));
    items.push({ type: 'kern', z: 0 });
    items.sort((a, b) => b.z - a.z);

    ctx.beginPath();
    ctx.arc(cx, cy, r_pos, 0, 2*Math.PI);
    let g = ctx.createRadialGradient(cx, cy, r_k, cx, cy, r_pos);
    g.addColorStop(0, 'rgba(255,74,74,0.12)');
    g.addColorStop(1, 'rgba(255,74,74,0.03)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.lineWidth = 0.8;
    for(let i=0; i<edges.length; i+=2) {
      ctx.beginPath();
      ctx.moveTo(proj[edges[i]].x, proj[edges[i]].y);
      ctx.lineTo(proj[edges[i+1]].x, proj[edges[i+1]].y);
      let h1 = hoveredVertex === edges[i];
      let h2 = hoveredVertex === edges[i+1];
      ctx.strokeStyle = (h1 || h2) ? '#ffb703' : 'rgba(255,255,255,0.1)';
      ctx.stroke();
    }

    items.forEach(item => {
      if (item.type === 'kern') {
        drawKern(cx, cy, r_k);
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, 2*Math.PI);
        ctx.fillStyle = '#ffea00';
        ctx.fill();
      } else {
        let p = item.data;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(cx + (p.x-cx)*2.6, cy + (p.y-cy)*2.6);
        ctx.strokeStyle = item.idx === hoveredVertex ? '#ffea00' : p.col;
        ctx.lineWidth = item.idx === hoveredVertex ? 3 : 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, r_m, 0, 2*Math.PI);
        let mg = ctx.createRadialGradient(p.x-r_m*0.2, p.y-r_m*0.2, r_m*0.1, p.x, p.y, r_m);
        mg.addColorStop(0, '#ff6b6b');
        mg.addColorStop(1, '#5c0f0f');
        ctx.fillStyle = item.idx === hoveredVertex ? '#ffb703' : mg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.id, p.x, p.y+2.5);
      }
    });
    if (!isDragging) angleY += 0.002;
    requestAnimationFrame(draw);
  }
  draw();

  const m_e = 0.0005458310;
  const m_mu = 0.1128803326;
  const m_yen = 0.0010971602;
  const aem_to_mev = 931.49432;
  
  const inp = document.getElementById('inputAem');
  const txtM = document.getElementById('valMev');
  const sP = document.getElementById('selPlus');
  const sM = document.getElementById('selMinus');
  const o1 = document.getElementById('resN1');
  const o2 = document.getElementById('resN2');
  const o3 = document.getElementById('resN3');
  const oM = document.getElementById('resPhotMev');
  const oA = document.getElementById('resPhotAem');

  function run() {
    if (!inp) return;
    let clean = inp.value.replace(/,/g, '.').replace(/\s/g, '');
    let aem = parseFloat(clean) || 0;
    txtM.innerText = (aem * aem_to_mev).toFixed(5);
    
    let n3 = (parseInt(sP.value) || 0) + (parseInt(sM.value) || 0);
    let subL = aem - (m_e * n3);
    
    let n1 = Math.floor((subL + 1e-9) / m_mu);
    if (n1 < 0) n1 = 0;
    let rem1 = subL - (n1 * m_mu);
    
    let n2 = Math.floor((rem1 + 1e-9) / m_yen);
    if (n2 < 0) n2 = 0;
    let ph_aem = rem1 - (n2 * m_yen);
    
    o3.innerText = n3;
    o1.innerText = n1;
    o2.innerText = n2;
    oM.innerText = (ph_aem * aem_to_mev).toFixed(8);
    oA.innerText = ph_aem.toFixed(10);
  }
  
  if (inp) {
    [inp, sP, sM].forEach(el => {
      el.addEventListener('input', run);
      el.addEventListener('change', run);
    });
    run();
  }
})();
