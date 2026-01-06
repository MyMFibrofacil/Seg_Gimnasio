(function () {
  var STORAGE_KEY = "workoutWorkbook";
  var SELECTED_DAY_KEY = "workoutSelectedDay";

  var fileInput = document.getElementById("workout-file-input");
  var fileButton = document.getElementById("workout-file-button");
  var fileButtonLabel = document.getElementById("workout-file-button-label");
  var daySelect = document.getElementById("workout-day-select");
  var errorText = document.getElementById("workout-file-error");
  var timerButton = document.getElementById("timer-start-button");
  var reportesButton = document.getElementById("reportes-button");

  var defaultFileButtonText = "Cargar Archivo Excel";
  var loadedFileButtonText = "Rutina Cargada";
  var hasStoredWorkbook = false;

  if (!fileInput || !daySelect || !errorText) {
    return;
  }

  function showError(message) {
    errorText.textContent = message || "";
    errorText.hidden = !message;
  }

  function setFileButtonText(text) {
    if (fileButtonLabel) {
      fileButtonLabel.textContent = text;
    }
  }

  function resetDaySelect() {
    daySelect.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un dia";
    placeholder.disabled = true;
    placeholder.selected = true;
    daySelect.appendChild(placeholder);
    daySelect.disabled = true;
  }

  function populateDaySelects(sheetNames) {
    resetDaySelect();
    sheetNames.forEach(function (sheetName) {
      var option = document.createElement("option");
      option.value = sheetName;
      option.textContent = sheetName;
      daySelect.appendChild(option);
    });
    daySelect.disabled = sheetNames.length === 0;
  }

  function normalizeHeader(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
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
    if (!window.sessionStorage) {
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
    if (!window.sessionStorage || !window.XLSX) {
      return null;
    }
    var base64 = sessionStorage.getItem(STORAGE_KEY);
    if (!base64) {
      return null;
    }
    try {
      var buffer = base64ToArrayBuffer(base64);
      return XLSX.read(buffer, { type: "array" });
    } catch (error) {
      return null;
    }
  }

  function hydrateWorkbook(workbook) {
    if (!workbook) {
      return [];
    }
    var sheetNames = workbook.SheetNames || [];
    if (!sheetNames.length) {
      showError("El archivo no contiene hojas.");
      return [];
    }
    var daySheetNames = sheetNames.filter(function (name) {
      return normalizeHeader(name) !== "datos";
    });
    populateDaySelects(daySheetNames);
    if (daySheetNames.length) {
      setFileButtonText(loadedFileButtonText);
    }
    return daySheetNames;
  }

  resetDaySelect();

  if (fileButton) {
    fileButton.addEventListener("click", function () {
      showError("");
      fileInput.click();
    });
  }

  daySelect.addEventListener("change", function () {
    if (window.sessionStorage) {
      sessionStorage.setItem(SELECTED_DAY_KEY, daySelect.value);
    }
    if (hasStoredWorkbook && daySelect.value) {
      window.location.href = "rutina.html";
    }
  });

  if (timerButton) {
    timerButton.addEventListener("click", function () {
      if (window.sessionStorage) {
        sessionStorage.setItem("timerOnlyMode", "1");
      }
      window.location.href = "rutina.html";
    });
  }

  if (reportesButton) {
    reportesButton.addEventListener("click", function () {
      window.location.href = "reportes.html";
    });
  }

  fileInput.addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    showError("");
    setFileButtonText(defaultFileButtonText);
    resetDaySelect();
    if (window.sessionStorage) {
      sessionStorage.removeItem(SELECTED_DAY_KEY);
    }

    if (!/\.xlsx$/i.test(file.name)) {
      showError("El archivo debe ser .xlsx.");
      return;
    }

    if (!window.XLSX) {
      showError("No se cargo la libreria para leer archivos .xlsx.");
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var workbook = XLSX.read(reader.result, { type: "array" });
        hydrateWorkbook(workbook);
        hasStoredWorkbook = storeWorkbookBuffer(reader.result);
        if (!hasStoredWorkbook) {
          showError("No se pudo guardar el archivo en esta sesion.");
        }
      } catch (error) {
        showError("No se pudo leer el archivo. Verifica que sea .xlsx valido.");
      }
    };
    reader.readAsArrayBuffer(file);
  });

  var storedWorkbook = loadWorkbookFromStorage();
  if (storedWorkbook) {
    hasStoredWorkbook = true;
    var storedDays = hydrateWorkbook(storedWorkbook);
    var storedSelectedDay = window.sessionStorage ? sessionStorage.getItem(SELECTED_DAY_KEY) : "";
    if (storedSelectedDay && storedDays.indexOf(storedSelectedDay) !== -1) {
      daySelect.value = storedSelectedDay;
    }
  }
})();
