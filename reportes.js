(function () {
  var STORAGE_KEY = "workoutWorkbook";
  var fileInput = document.getElementById("reportes-file-input");
  var fileButton = document.getElementById("reportes-file-button");
  var fileStatus = document.getElementById("reportes-file-status");
  var fileError = document.getElementById("reportes-file-error");
  var emptyState = document.getElementById("reportes-empty-state");
  var exerciseSelect = document.getElementById("reportes-exercise-select");
  var statSessions = document.getElementById("stat-sessions");
  var statSeries = document.getElementById("stat-series");
  var statVolume = document.getElementById("stat-volume");
  var statSessionsSubtitle = document.getElementById("stat-sessions-subtitle");
  var statSeriesSubtitle = document.getElementById("stat-series-subtitle");
  var statVolumeSubtitle = document.getElementById("stat-volume-subtitle");
  var chartTitle = document.getElementById("reportes-chart-title");
  var chartValue = document.getElementById("reportes-chart-value");
  var chartSubtitle = document.getElementById("reportes-chart-subtitle");
  var chartCaption = document.getElementById("reportes-chart-caption");
  var chartLine = document.getElementById("reportes-chart-line");
  var chartArea = document.getElementById("reportes-chart-area");
  var chartPoints = document.getElementById("reportes-chart-points");
  var xAxis = document.getElementById("reportes-x-axis");
  var yAxisLabels = [
    document.getElementById("reportes-y-3"),
    document.getElementById("reportes-y-2"),
    document.getElementById("reportes-y-1"),
    document.getElementById("reportes-y-0")
  ];
  var historyList = document.getElementById("reportes-history-list");

  if (!fileInput || !exerciseSelect || !historyList) {
    return;
  }

  var allEntries = [];
  var selectedExercise = "";

  function setError(message) {
    if (!fileError) {
      return;
    }
    fileError.textContent = message || "";
    fileError.hidden = !message;
  }

  function setStatus(message) {
    if (fileStatus) {
      fileStatus.textContent = message || "";
    }
  }

  function setEmptyStateVisible(isVisible) {
    if (emptyState) {
      emptyState.hidden = !isVisible;
    }
  }

  function normalizeHeader(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function parseDateValue(value) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "number" && window.XLSX && XLSX.SSF && XLSX.SSF.parse_date_code) {
      var parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return new Date(parsed.y, parsed.m - 1, parsed.d);
      }
    }
    var text = String(value).trim();
    var match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      var day = parseInt(match[1], 10);
      var month = parseInt(match[2], 10);
      var year = parseInt(match[3], 10);
      if (year < 100) {
        year += 2000;
      }
      return new Date(year, month - 1, day);
    }
    return null;
  }

  function formatDate(dateObj) {
    if (!dateObj) {
      return "";
    }
    var day = String(dateObj.getDate()).padStart(2, "0");
    var month = String(dateObj.getMonth() + 1).padStart(2, "0");
    var year = String(dateObj.getFullYear());
    return day + "/" + month + "/" + year;
  }

  function parseNumber(value) {
    if (value === null || value === undefined) {
      return null;
    }
    var text = String(value).trim();
    if (!text) {
      return null;
    }
    var normalized = text.replace(",", ".");
    var parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer || []);
    var chunkSize = 0x8000;
    var binary = "";
    for (var i = 0; i < bytes.length; i += chunkSize) {
      var chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var length = binary.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function storeWorkbookBuffer(buffer) {
    if (!buffer || !window.sessionStorage) {
      return false;
    }
    try {
      var base64 = arrayBufferToBase64(buffer);
      sessionStorage.setItem(STORAGE_KEY, base64);
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadWorkbookFromStorage() {
    if (!window.sessionStorage) {
      return null;
    }
    var base64 = sessionStorage.getItem(STORAGE_KEY);
    if (!base64 || !window.XLSX) {
      return null;
    }
    try {
      var buffer = base64ToArrayBuffer(base64);
      return XLSX.read(buffer, { type: "array" });
    } catch (error) {
      return null;
    }
  }

  function parseDatosSheet(workbook) {
    if (!workbook || !workbook.Sheets || !workbook.Sheets.Datos || !window.XLSX) {
      return [];
    }
    var sheet = workbook.Sheets.Datos;
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) {
      return [];
    }
    var startIndex = 0;
    if (rows[0] && normalizeHeader(rows[0][0]) === "fecha") {
      startIndex = 1;
    }
    var entries = [];
    for (var i = startIndex; i < rows.length; i += 1) {
      var row = rows[i];
      var exercise = String(row[5] || "").trim();
      if (!exercise) {
        continue;
      }
      var dateObj = parseDateValue(row[0]);
      var dateText = dateObj ? formatDate(dateObj) : String(row[0] || "").trim();
      var seriesIndex = parseInt(row[6], 10);
      if (Number.isNaN(seriesIndex)) {
        seriesIndex = 0;
      }
      var repsValue = parseInt(row[7], 10);
      var reps = Number.isNaN(repsValue) ? 0 : repsValue;
      var weight = parseNumber(row[8]);
      var barWeight = parseNumber(row[9]);
      var totalWeight = 0;
      if (weight !== null) {
        totalWeight += weight;
      }
      if (barWeight !== null && barWeight > 0) {
        totalWeight += barWeight;
      }
      entries.push({
        exercise: exercise,
        date: dateObj,
        dateText: dateText,
        seriesIndex: seriesIndex,
        reps: reps,
        weight: weight,
        barWeight: barWeight,
        totalWeight: totalWeight,
        timestamp: dateObj ? dateObj.getTime() : 0
      });
    }
    return entries;
  }

  function getExerciseNames(entries) {
    var counts = {};
    entries.forEach(function (entry) {
      counts[entry.exercise] = (counts[entry.exercise] || 0) + 1;
    });
    var names = Object.keys(counts);
    names.sort(function (a, b) {
      if (counts[b] !== counts[a]) {
        return counts[b] - counts[a];
      }
      return a.localeCompare(b);
    });
    return names;
  }

  function formatNumber(value, decimals) {
    var safeValue = value || 0;
    var formatter = new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: typeof decimals === "number" ? decimals : 0
    });
    return formatter.format(safeValue);
  }

  function populateSelect(exercises) {
    exerciseSelect.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un ejercicio";
    placeholder.disabled = true;
    placeholder.selected = true;
    exerciseSelect.appendChild(placeholder);

    exercises.forEach(function (exercise) {
      var option = document.createElement("option");
      option.value = exercise;
      option.textContent = exercise;
      exerciseSelect.appendChild(option);
    });

    exerciseSelect.disabled = exercises.length === 0;
    if (selectedExercise) {
      exerciseSelect.value = selectedExercise;
    }
  }

  function getLatestEntry(entries) {
    var latest = null;
    entries.forEach(function (entry) {
      if (!latest || entry.timestamp > latest.timestamp) {
        latest = entry;
      }
    });
    return latest;
  }

  function updateStats(entries) {
    var sessionMap = {};
    var sessions = {};

    entries.forEach(function (entry) {
      if (entry.dateText) {
        sessionMap[entry.dateText] = true;
      }
      if (!entry.date) {
        return;
      }
      var sessionKey = entry.dateText || entry.date.toDateString();
      if (!sessions[sessionKey]) {
        sessions[sessionKey] = {
          timestamp: entry.date.getTime(),
          bestWeight: 0,
          volume: 0
        };
      }
      var session = sessions[sessionKey];
      var weightValue = entry.weight !== null && entry.weight !== undefined ? entry.weight : 0;
      if (weightValue > session.bestWeight) {
        session.bestWeight = weightValue;
      }
      if (entry.totalWeight && entry.reps) {
        session.volume += entry.totalWeight * entry.reps;
      }
    });

    var weightImprovement = null;
    var volumeImprovement = null;
    var sessionList = Object.keys(sessions).map(function (key) {
      return sessions[key];
    });
    sessionList.sort(function (a, b) {
      return a.timestamp - b.timestamp;
    });
    if (sessionList.length >= 2) {
      var firstSession = sessionList[0];
      var lastSession = sessionList[sessionList.length - 1];
      if (firstSession.bestWeight > 0) {
        weightImprovement = ((lastSession.bestWeight - firstSession.bestWeight) / firstSession.bestWeight) * 100;
      }
      if (firstSession.volume > 0) {
        volumeImprovement = ((lastSession.volume - firstSession.volume) / firstSession.volume) * 100;
      }
    }

    if (statSessions) {
      statSessions.textContent = String(Object.keys(sessionMap).length);
    }
    if (statSeries) {
      if (weightImprovement === null || Number.isNaN(weightImprovement)) {
        statSeries.textContent = "--";
      } else {
        var sign = weightImprovement > 0 ? "+" : "";
        statSeries.textContent = sign + formatNumber(weightImprovement, 1) + "%";
      }
    }
    if (statVolume) {
      if (volumeImprovement === null || Number.isNaN(volumeImprovement)) {
        statVolume.textContent = "--";
      } else {
        var volumeSign = volumeImprovement > 0 ? "+" : "";
        statVolume.textContent = volumeSign + formatNumber(volumeImprovement, 1) + "%";
      }
    }
    if (statSessionsSubtitle) {
      statSessionsSubtitle.textContent = "Total";
    }
    if (statSeriesSubtitle) {
      statSeriesSubtitle.textContent = weightImprovement === null ? "Sin datos" : "Ultima vs primera";
    }
    if (statVolumeSubtitle) {
      statVolumeSubtitle.textContent = volumeImprovement === null ? "Sin datos" : "Ultima vs primera";
    }
  }

  function getWeekOfMonth(date) {
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var firstWeekday = firstDay.getDay();
    var offset = (firstWeekday + 6) % 7;
    return Math.floor((date.getDate() + offset - 1) / 7) + 1;
  }

  function buildMonthlySeries(entries) {
    var byMonth = {};
    var latestIndex = null;
    var monthCount = 0;
    entries.forEach(function (entry) {
      if (!entry.date) {
        return;
      }
      var year = entry.date.getFullYear();
      var month = entry.date.getMonth();
      var key = (year * 12) + month;
      if (!Object.prototype.hasOwnProperty.call(byMonth, key)) {
        monthCount += 1;
      }
      var weightValue = entry.weight !== null && entry.weight !== undefined ? entry.weight : 0;
      if (!byMonth[key] || weightValue > byMonth[key]) {
        byMonth[key] = weightValue;
      }
      if (latestIndex === null || key > latestIndex) {
        latestIndex = key;
      }
    });

    if (latestIndex === null) {
      return { labels: [], values: [], max: 0, mode: "month", monthCount: 0 };
    }

    var monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    var labels = [];
    var values = [];
    var maxValue = 0;
    var startIndex = latestIndex - 5;

    for (var i = 0; i < 6; i += 1) {
      var key = startIndex + i;
      var yearValue = Math.floor(key / 12);
      var monthValue = key % 12;
      if (monthValue < 0) {
        monthValue += 12;
        yearValue -= 1;
      }
      labels.push(monthLabels[monthValue]);
      var value = Object.prototype.hasOwnProperty.call(byMonth, key) ? byMonth[key] : null;
      values.push(value);
      if (value !== null && value > maxValue) {
        maxValue = value;
      }
    }

    return { labels: labels, values: values, max: maxValue, mode: "month", monthCount: monthCount };
  }

  function buildWeeklySeries(entries) {
    var latest = getLatestEntry(entries);
    if (!latest || !latest.date) {
      return { labels: [], values: [], max: 0, mode: "week" };
    }
    var year = latest.date.getFullYear();
    var month = latest.date.getMonth();
    var byWeek = {};
    var lastDay = new Date(year, month + 1, 0);
    var weeksInMonth = getWeekOfMonth(lastDay);
    var maxValue = 0;

    entries.forEach(function (entry) {
      if (!entry.date) {
        return;
      }
      if (entry.date.getFullYear() !== year || entry.date.getMonth() !== month) {
        return;
      }
      var week = getWeekOfMonth(entry.date);
      var weightValue = entry.weight !== null && entry.weight !== undefined ? entry.weight : 0;
      if (!byWeek[week] || weightValue > byWeek[week]) {
        byWeek[week] = weightValue;
      }
    });

    var labels = [];
    var values = [];
    for (var i = 1; i <= weeksInMonth; i += 1) {
      labels.push("Sem " + i);
      var value = Object.prototype.hasOwnProperty.call(byWeek, i) ? byWeek[i] : null;
      values.push(value);
      if (value !== null && value > maxValue) {
        maxValue = value;
      }
    }

    return { labels: labels, values: values, max: maxValue, mode: "week" };
  }

  function buildChartSeries(entries) {
    var monthSeries = buildMonthlySeries(entries);
    if (monthSeries.monthCount <= 1) {
      return buildWeeklySeries(entries);
    }
    return monthSeries;
  }

  function updateYAxis(maxValue) {
    if (!yAxisLabels.length) {
      return;
    }
    var safeMax = maxValue > 0 ? maxValue : 1;
    var decimals = safeMax < 10 ? 1 : 0;
    var ticks = [
      safeMax,
      safeMax * 0.66,
      safeMax * 0.33,
      0
    ];

    yAxisLabels.forEach(function (label, index) {
      if (!label) {
        return;
      }
      label.textContent = formatNumber(ticks[index], decimals) + " kg";
    });
  }

  function updateXAxis(labels) {
    if (!xAxis) {
      return;
    }
    xAxis.innerHTML = "";
    if (!labels.length) {
      labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
    }
    labels.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      xAxis.appendChild(span);
    });
  }

  function updateChartPaths(values, maxValue) {
    if (!chartLine || !chartArea || !chartPoints) {
      return;
    }
    chartLine.setAttribute("d", "");
    chartArea.setAttribute("d", "");
    chartPoints.innerHTML = "";

    if (!values.length) {
      return;
    }

    var width = 380;
    var height = 150;
    var safeMax = maxValue > 0 ? maxValue : 1;
    var pathParts = [];
    var areaParts = [];
    var currentArea = "";
    var lastValidIndex = -1;

    values.forEach(function (value, index) {
      if (value !== null) {
        lastValidIndex = index;
      }
    });

    for (var i = 0; i < values.length; i += 1) {
      var value = values[i];
      if (value === null) {
        if (currentArea) {
          var lastX = i === 0 ? 0 : (values.length === 1 ? width / 2 : ((i - 1) / (values.length - 1)) * width);
          currentArea += " L " + lastX + " " + height + " Z";
          areaParts.push(currentArea);
          currentArea = "";
        }
        continue;
      }

      var x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
      var y = height - ((value / safeMax) * height);
      if (!currentArea) {
        pathParts.push("M " + x + " " + y);
        currentArea = "M " + x + " " + height + " L " + x + " " + y;
      } else {
        pathParts.push("L " + x + " " + y);
        currentArea += " L " + x + " " + y;
      }

      var point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      point.setAttribute("cx", x);
      point.setAttribute("cy", y);
      point.setAttribute("r", i === lastValidIndex ? "6" : "4");
      point.setAttribute("stroke-width", i === lastValidIndex ? "0" : "2");
      point.setAttribute("class", i === lastValidIndex ? "fill-primary" : "fill-background-light dark:fill-card-dark stroke-primary");
      chartPoints.appendChild(point);
    }

    if (currentArea) {
      var lastIndex = values.length - 1;
      var finalX = values.length === 1 ? width / 2 : (lastIndex / (values.length - 1)) * width;
      currentArea += " L " + finalX + " " + height + " Z";
      areaParts.push(currentArea);
    }

    chartLine.setAttribute("d", pathParts.join(" "));
    chartArea.setAttribute("d", areaParts.join(" "));
  }

  function updateChart(entries) {
    var series = buildChartSeries(entries);
    updateXAxis(series.labels);
    updateYAxis(series.max);
    updateChartPaths(series.values, series.max);

    if (chartValue) {
      chartValue.textContent = formatNumber(series.max, 1);
    }
    if (chartSubtitle) {
      if (!series.labels.length) {
        chartSubtitle.textContent = "Sin datos";
      } else if (series.mode === "week") {
        chartSubtitle.textContent = "Ultimas semanas";
      } else {
        chartSubtitle.textContent = "Ultimos 6 meses";
      }
    }
    if (chartCaption) {
      chartCaption.textContent = series.labels.length && selectedExercise
        ? "Ejercicio: " + selectedExercise
        : "Selecciona un ejercicio";
    }
    if (chartTitle) {
      chartTitle.textContent = "Maximo peso";
    }
  }

  function buildHistoryItem(entry) {
    var months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    var month = "--";
    var day = "--";
    if (entry.date) {
      month = months[entry.date.getMonth()];
      day = String(entry.date.getDate()).padStart(2, "0");
    }

    var wrapper = document.createElement("div");
    wrapper.className =
      "group flex items-center justify-between rounded-xl bg-white dark:bg-card-dark border border-gray-100 dark:border-white/5 p-4 transition-all active:scale-[0.98]";

    var left = document.createElement("div");
    left.className = "flex items-center gap-4";

    var dateBox = document.createElement("div");
    dateBox.className = "flex flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 h-12 w-12 text-center";
    var monthLabel = document.createElement("span");
    monthLabel.className = "text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400";
    monthLabel.textContent = month;
    var dayLabel = document.createElement("span");
    dayLabel.className = "text-lg font-bold leading-none text-slate-800 dark:text-white";
    dayLabel.textContent = day;
    dateBox.appendChild(monthLabel);
    dateBox.appendChild(dayLabel);

    var info = document.createElement("div");
    info.className = "flex flex-col";
    var title = document.createElement("p");
    title.className = "text-base font-bold text-slate-800 dark:text-white";
    title.textContent = entry.exercise;
    info.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "flex items-center gap-2 mt-0.5";
    var repsLabel = document.createElement("span");
    repsLabel.className = "text-xs text-gray-500 dark:text-gray-400";
    repsLabel.textContent = entry.reps ? entry.reps + " reps" : "Sin reps";
    meta.appendChild(repsLabel);

    if (entry.seriesIndex) {
      var divider = document.createElement("span");
      divider.className = "text-xs text-gray-400";
      divider.textContent = "-";
      meta.appendChild(divider);

      var seriesLabel = document.createElement("span");
      seriesLabel.className = "text-xs text-gray-500 dark:text-gray-400";
      seriesLabel.textContent = "Serie " + entry.seriesIndex;
      meta.appendChild(seriesLabel);
    }

    if (entry.barWeight && entry.barWeight > 0) {
      var barDivider = document.createElement("span");
      barDivider.className = "text-xs text-gray-400";
      barDivider.textContent = "-";
      meta.appendChild(barDivider);

      var barLabel = document.createElement("span");
      barLabel.className = "text-xs text-gray-500 dark:text-gray-400";
      barLabel.textContent = "Barra " + formatNumber(entry.barWeight, 1) + " kg";
      meta.appendChild(barLabel);
    }

    info.appendChild(meta);
    left.appendChild(dateBox);
    left.appendChild(info);

    var right = document.createElement("div");
    right.className = "flex flex-col items-end gap-1";
    var weightRow = document.createElement("div");
    weightRow.className = "flex items-baseline gap-1";
    var weightValue = document.createElement("span");
    weightValue.className = "text-lg font-bold text-slate-800 dark:text-white";
    var weightValueNumber = entry.weight !== null && entry.weight !== undefined ? entry.weight : 0;
    weightValue.textContent = formatNumber(weightValueNumber, 1);
    var weightUnit = document.createElement("span");
    weightUnit.className = "text-xs text-gray-500 font-medium";
    weightUnit.textContent = "kg";
    weightRow.appendChild(weightValue);
    weightRow.appendChild(weightUnit);
    right.appendChild(weightRow);

    wrapper.appendChild(left);
    wrapper.appendChild(right);
    return wrapper;
  }

  function updateHistory(entries) {
    historyList.innerHTML = "";
    if (!entries.length) {
      var emptyMessage = document.createElement("div");
      emptyMessage.className = "text-sm text-gray-500 dark:text-gray-400";
      emptyMessage.textContent = "Sin registros.";
      historyList.appendChild(emptyMessage);
      return;
    }
    var bestBySession = {};
    entries.forEach(function (entry) {
      var sessionKey = entry.dateText || "Sin fecha";
      var existing = bestBySession[sessionKey];
      var weightValue = entry.weight !== null && entry.weight !== undefined ? entry.weight : 0;
      var existingWeight = existing && existing.weight !== null && existing.weight !== undefined ? existing.weight : 0;
      if (!existing || weightValue > existingWeight) {
        bestBySession[sessionKey] = entry;
        return;
      }
      if (weightValue === existingWeight && entry.reps > existing.reps) {
        bestBySession[sessionKey] = entry;
      }
    });

    var bestEntries = Object.keys(bestBySession).map(function (key) {
      return bestBySession[key];
    });
    bestEntries.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });
    bestEntries.slice(0, 6).forEach(function (entry) {
      historyList.appendChild(buildHistoryItem(entry));
    });
  }

  function updateForExercise() {
    var filtered = allEntries.filter(function (entry) {
      return entry.exercise === selectedExercise;
    });
    updateStats(filtered);
    updateHistory(filtered);
    updateChart(filtered);
  }

  function render(entries) {
    allEntries = entries;
    if (!allEntries.length) {
      setEmptyStateVisible(true);
      exerciseSelect.innerHTML = "";
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecciona un ejercicio";
      placeholder.disabled = true;
      placeholder.selected = true;
      exerciseSelect.appendChild(placeholder);
      exerciseSelect.disabled = true;
      selectedExercise = "";
      updateStats([]);
      updateHistory([]);
      updateChart([]);
      return;
    }
    setEmptyStateVisible(false);
    var exercises = getExerciseNames(allEntries);
    if (!selectedExercise || exercises.indexOf(selectedExercise) === -1) {
      selectedExercise = exercises[0] || "";
    }
    populateSelect(exercises);
    updateForExercise();
  }

  function handleWorkbook(workbook) {
    var entries = parseDatosSheet(workbook);
    if (!entries.length) {
      setError("La hoja Datos esta vacia o no contiene registros.");
      setEmptyStateVisible(true);
      exerciseSelect.disabled = true;
    } else {
      setError("");
      setEmptyStateVisible(false);
    }
    render(entries);
  }

  exerciseSelect.addEventListener("change", function () {
    if (!exerciseSelect.value) {
      return;
    }
    selectedExercise = exerciseSelect.value;
    updateForExercise();
  });

  if (fileButton) {
    fileButton.addEventListener("click", function () {
      setError("");
      fileInput.click();
    });
  }

  fileInput.addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    setError("");
    if (!/\.xlsx$/i.test(file.name)) {
      setError("El archivo debe ser .xlsx.");
      return;
    }
    if (!window.XLSX) {
      setError("No se cargo la libreria para leer archivos .xlsx.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var workbook = XLSX.read(reader.result, { type: "array" });
        var stored = storeWorkbookBuffer(reader.result);
        setStatus(stored ? "Archivo cargado." : "Archivo cargado (sin guardar).");
        handleWorkbook(workbook);
      } catch (error) {
        setError("No se pudo leer el archivo. Verifica que sea .xlsx valido.");
      }
    };
    reader.readAsArrayBuffer(file);
  });

  var storedWorkbook = loadWorkbookFromStorage();
  if (storedWorkbook) {
    setStatus("Usando el archivo cargado en esta sesion.");
    handleWorkbook(storedWorkbook);
  } else {
    setStatus("No hay archivo cargado.");
    setEmptyStateVisible(true);
  }
})();
