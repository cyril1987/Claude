const Chart = {
  line(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 10, bottom: 25, left: 50 };
    const color = options.color || '#3b82f6';

    const values = data.values;
    const labels = data.labels || [];

    if (!values || values.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', w / 2, h / 2);
      return;
    }

    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const filteredVals = values.filter((v) => v !== null);
    const minVal = Math.min(...filteredVals);
    const maxVal = Math.max(...filteredVals);
    const range = maxVal - minVal || 1;

    function xPos(i) {
      return padding.left + (i / (values.length - 1 || 1)) * plotW;
    }

    function yPos(val) {
      return padding.top + plotH - ((val - minVal) / range) * plotH;
    }

    // Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = minVal + (range / ySteps) * i;
      const y = yPos(val);
      ctx.fillText(Math.round(val) + 'ms', padding.left - 6, y + 3);
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(labels.length / 6));
    for (let i = 0; i < labels.length; i += labelStep) {
      ctx.fillText(labels[i], xPos(i), h - 4);
    }

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i] === null) continue;
      const x = xPos(i);
      const y = yPos(values[i]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill area
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = color;
    ctx.lineTo(xPos(values.length - 1), padding.top + plotH);
    ctx.lineTo(xPos(0), padding.top + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Dots
    ctx.fillStyle = color;
    for (let i = 0; i < values.length; i++) {
      if (values[i] === null) continue;
      ctx.beginPath();
      ctx.arc(xPos(i), yPos(values[i]), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  sparkline(canvas, values, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const color = options.color || '#3b82f6';
    const failColor = options.failColor || '#ef4444';

    if (!values || values.length === 0) return;

    const successVals = values.map((v) => (v.isSuccess ? v.responseTimeMs : null));
    const filtered = successVals.filter((v) => v !== null);
    if (filtered.length === 0) return;

    const minVal = Math.min(...filtered);
    const maxVal = Math.max(...filtered);
    const range = maxVal - minVal || 1;
    const pad = 2;

    function xPos(i) {
      return pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
    }

    function yPos(val) {
      return pad + (h - pad * 2) - ((val - minVal) / range) * (h - pad * 2);
    }

    // Draw failure bars
    for (let i = 0; i < values.length; i++) {
      if (!values[i].isSuccess) {
        ctx.fillStyle = failColor;
        ctx.globalAlpha = 0.2;
        const bw = Math.max(2, (w - pad * 2) / values.length);
        ctx.fillRect(xPos(i) - bw / 2, 0, bw, h);
        ctx.globalAlpha = 1;
      }
    }

    // Draw line for successful checks
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < values.length; i++) {
      if (successVals[i] === null) continue;
      const x = xPos(i);
      const y = yPos(successVals[i]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  },
};
