document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const keyForm = document.getElementById("key-form");
  const keysContainer = document.getElementById("keys-container");
  const searchInput = document.getElementById("search-keys");
  const filterSelect = document.getElementById("filter-keys");
  const themeToggle = document.getElementById("theme-toggle");
  const toast = document.getElementById("toast");
  const keyDetailsModal = document.getElementById("key-details-modal");
  const ieModal = document.getElementById("import-export-modal");
  const modalCloseButtons = document.querySelectorAll(".close-modal");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const generateBtn = document.getElementById("generate-btn");
  const editKeyBtn = document.getElementById("edit-key-btn");
  const deleteKeyBtn = document.getElementById("delete-key-btn");

  // State
  let keys = JSON.parse(localStorage.getItem("keys")) || [];
  let currentSelectedKey = null;
  let isEditMode = false;

  // Initialize the app
  init();

  function init() {
    // Load theme preference
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeToggle.checked = savedTheme === "light";

    // Render existing keys
    renderKeys();

    // Set up event listeners
    setupEventListeners();
  }

  function setupEventListeners() {
    // Form submission
    keyForm.addEventListener("submit", handleFormSubmit);

    // Generate random key
    generateBtn.addEventListener("click", generateRandomKey);

    // Search and filter
    searchInput.addEventListener("input", debounce(renderKeys, 300));
    filterSelect.addEventListener("change", renderKeys);

    // Theme toggle
    themeToggle.addEventListener("change", toggleTheme);

    // Modal close buttons
    modalCloseButtons.forEach((btn) => {
      btn.addEventListener("click", closeAllModals);
    });

    // Click outside modal to close
    window.addEventListener("click", function (e) {
      if (e.target === keyDetailsModal || e.target === ieModal) {
        closeAllModals();
      }
    });

    // Import/Export buttons
    exportBtn.addEventListener("click", showExportModal);
    importBtn.addEventListener("click", showImportModal);

    // Toggle visibility buttons
    document.addEventListener("click", function (e) {
      if (e.target.closest(".toggle-visibility")) {
        toggleVisibility(e);
      }
      if (e.target.closest(".btn-copy")) {
        copyToClipboard(e);
      }
    });

    // Modal action buttons
    editKeyBtn.addEventListener("click", editSelectedKey);
    deleteKeyBtn.addEventListener("click", deleteSelectedKey);
  }

  // Form submission handler
  function handleFormSubmit(e) {
    e.preventDefault();

    const keyName = document.getElementById("key-name").value.trim();
    const keyType = document.getElementById("key-type").value;
    const keyService = document.getElementById("key-service").value;
    const keyValue = document.getElementById("key-value").value.trim();
    const keyDesc = document.getElementById("key-desc").value.trim();

    if (!keyName || !keyValue) {
      showToast("Key name and value are required", "error");
      return;
    }

    const keyData = {
      name: keyName,
      type: keyType,
      service: keyService,
      value: keyValue,
      description: keyDesc,
      updatedAt: new Date().toISOString(),
    };

    if (isEditMode && currentSelectedKey) {
      // Update existing key
      const keyIndex = keys.findIndex((k) => k.id === currentSelectedKey);
      if (keyIndex !== -1) {
        keys[keyIndex] = { ...keys[keyIndex], ...keyData };
        showToast("Key updated successfully", "success");
      }
    } else {
      // Add new key
      const newKey = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...keyData,
      };
      keys.push(newKey);
      showToast("Key saved successfully", "success");
      currentSelectedKey = newKey.id;
    }

    saveKeys();
    resetForm();
    renderKeys();
    animateKeyCard(currentSelectedKey);
    closeAllModals();
  }

  // Generate a random secure key
  function generateRandomKey() {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=[]{}|;:,.<>?";
    let result = "";
    const length = 32 + Math.floor(Math.random() * 16); // 32-48 characters

    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    document.getElementById("key-value").value = result;
    showToast("Generated secure random key", "success");
  }

  // Render keys based on search and filter
  function renderKeys() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterType = filterSelect.value;

    let filteredKeys = keys.filter((key) => {
      const matchesSearch =
        key.name.toLowerCase().includes(searchTerm) ||
        (key.description &&
          key.description.toLowerCase().includes(searchTerm)) ||
        key.value.toLowerCase().includes(searchTerm);
      const matchesFilter = filterType === "all" || key.type === filterType;
      return matchesSearch && matchesFilter;
    });

    if (filteredKeys.length === 0) {
      keysContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-key"></i>
                    <h3>No Keys Found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
      return;
    }

    // Sort by most recently updated
    filteredKeys.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    keysContainer.innerHTML = filteredKeys
      .map((key) => createKeyCard(key))
      .join("");

    // Add event listeners to key cards and action buttons
    document.querySelectorAll(".key-card").forEach((card) => {
      card.addEventListener("click", () => {
        const keyId = card.dataset.keyId;
        showKeyDetails(keyId);
      });
    });

    document.querySelectorAll(".key-card-action").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const keyId = btn.dataset.keyId;

        if (action === "edit") {
          editKey(keyId);
        } else if (action === "delete") {
          currentSelectedKey = keyId;
          showDeleteConfirmation();
        }
      });
    });
  }

  // Create HTML for a key card
  function createKeyCard(key) {
    const typeLabels = {
      api: "API Key",
      public: "Public Key",
      private: "Private Key",
      secret: "Secret Key",
      token: "Access Token",
      other: "Other",
    };

    const serviceLabels = {
      aws: "AWS",
      stripe: "Stripe",
      google: "Google Cloud",
      azure: "Azure",
      github: "GitHub",
      twilio: "Twilio",
      mailchimp: "Mailchimp",
      custom: "Custom",
    };

    const formattedDate = new Date(key.updatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return `
            <div class="key-card ${key.type}" data-key-id="${key.id}">
                <div class="key-card-header">
                    <h3 class="key-card-name">${key.name}</h3>
                    <div class="key-card-actions">
                        <button class="key-card-action" data-action="edit" data-key-id="${
                          key.id
                        }">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="key-card-action" data-action="delete" data-key-id="${
                          key.id
                        }">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="key-card-meta">
                    <span class="key-type-badge">${
                      typeLabels[key.type] || "Key"
                    }</span>
                    <span class="key-service-badge">${
                      serviceLabels[key.service] || "Custom"
                    }</span>
                </div>
                <div class="key-card-value">
                    <input type="password" value="${key.value}" readonly>
                </div>
                ${
                  key.description
                    ? `<div class="key-card-desc">${key.description}</div>`
                    : ""
                }
                <div class="key-card-footer">
                    <span>Last updated: ${formattedDate}</span>
                </div>
            </div>
        `;
  }

  // Show key details in modal
  function showKeyDetails(keyId) {
    const key = keys.find((k) => k.id === keyId);
    if (!key) return;

    currentSelectedKey = keyId;

    const typeLabels = {
      api: "API Key",
      public: "Public Key",
      private: "Private Key",
      secret: "Secret Key",
      token: "Access Token",
      other: "Other",
    };

    const serviceLabels = {
      aws: "AWS",
      stripe: "Stripe",
      google: "Google Cloud",
      azure: "Azure",
      github: "GitHub",
      twilio: "Twilio",
      mailchimp: "Mailchimp",
      custom: "Custom",
    };

    const formattedDate = new Date(key.updatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    document.getElementById("modal-key-name").textContent = key.name;
    document.getElementById("modal-key-type").textContent =
      typeLabels[key.type] || "Key";
    document.getElementById("modal-key-service").textContent =
      serviceLabels[key.service] || "Custom";
    document.getElementById(
      "modal-key-date"
    ).textContent = `Updated: ${formattedDate}`;
    document.getElementById("modal-key-value").value = key.value;
    document.getElementById("modal-key-desc").textContent =
      key.description || "No description provided";

    keyDetailsModal.classList.add("active");
  }

  // Edit key functionality
  function editKey(keyId) {
    const key = keys.find((k) => k.id === keyId);
    if (!key) return;

    currentSelectedKey = keyId;
    isEditMode = true;

    document.getElementById("key-name").value = key.name;
    document.getElementById("key-type").value = key.type;
    document.getElementById("key-service").value = key.service;
    document.getElementById("key-value").value = key.value;
    document.getElementById("key-desc").value = key.description || "";

    keyForm.dataset.editId = keyId;
    document.querySelector("main").scrollIntoView({ behavior: "smooth" });
    document.getElementById("key-name").focus();

    closeAllModals();
  }

  function editSelectedKey() {
    if (currentSelectedKey) {
      editKey(currentSelectedKey);
    }
  }

  // Delete key functionality
  function showDeleteConfirmation() {
    if (!currentSelectedKey) return;

    const key = keys.find((k) => k.id === currentSelectedKey);
    if (!key) return;

    showToast(
      `Are you sure you want to delete "${key.name}"?`,
      "warning",
      5000
    );

    // Create a confirmation button in the toast
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-danger btn-sm";
    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Confirm Delete';
    confirmBtn.onclick = () => {
      deleteSelectedKey();
      toast.innerHTML = "";
      toast.classList.remove("show");
    };

    toast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Are you sure you want to delete "${key.name}"?</span>
        `;
    toast.classList.add("show", "warning");
    toast.appendChild(confirmBtn);
  }

  function deleteSelectedKey() {
    if (!currentSelectedKey) return;

    keys = keys.filter((key) => key.id !== currentSelectedKey);
    saveKeys();
    renderKeys();
    showToast("Key deleted successfully", "success");
    closeAllModals();
    currentSelectedKey = null;
  }

  // Import/Export functionality
  function showExportModal() {
    document.getElementById("ie-modal-title").textContent = "Export Keys";

    const exportContent = `
            <div class="ie-option">
                <label>Export Format</label>
                <select id="export-format">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                </select>
                
                <div class="password-protect">
                    <label>
                        <input type="checkbox" id="export-password-protect">
                        Password Protect
                    </label>
                    <div class="password-input" id="export-password-input">
                        <input type="password" id="export-password" placeholder="Enter password">
                    </div>
                </div>
                
                <div class="ie-actions">
                    <button class="btn btn-secondary" id="copy-export">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="btn btn-primary" id="download-export">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;

    document.getElementById("ie-modal-content").innerHTML = exportContent;
    ieModal.classList.add("active");

    // Set up export modal event listeners
    document
      .getElementById("export-password-protect")
      .addEventListener("change", function () {
        document
          .getElementById("export-password-input")
          .classList.toggle("active", this.checked);
      });

    document
      .getElementById("copy-export")
      .addEventListener("click", copyExportData);
    document
      .getElementById("download-export")
      .addEventListener("click", downloadExportData);
  }

  function showImportModal() {
    document.getElementById("ie-modal-title").textContent = "Import Keys";

    const importContent = `
            <div class="ie-option">
                <textarea id="import-data" placeholder="Paste your exported keys here..."></textarea>
                
                <div class="password-protect" id="import-password-section" style="display: none;">
                    <div class="password-input">
                        <input type="password" id="import-password" placeholder="Enter password">
                    </div>
                </div>
                
                <div class="ie-actions">
                    <button class="btn btn-primary" id="process-import">
                        <i class="fas fa-file-import"></i> Import Keys
                    </button>
                </div>
            </div>
        `;

    document.getElementById("ie-modal-content").innerHTML = importContent;
    ieModal.classList.add("active");

    // Set up import modal event listeners
    document
      .getElementById("import-data")
      .addEventListener("input", function () {
        try {
          const data = JSON.parse(this.value);
          const hasPassword = data.encrypted || false;
          document.getElementById("import-password-section").style.display =
            hasPassword ? "block" : "none";
        } catch (e) {
          document.getElementById("import-password-section").style.display =
            "none";
        }
      });

    document
      .getElementById("process-import")
      .addEventListener("click", processImport);
  }

  function copyExportData() {
    const exportData = prepareExportData();
    navigator.clipboard
      .writeText(exportData)
      .then(() => showToast("Export data copied to clipboard", "success"))
      .catch(() => showToast("Failed to copy data", "error"));
  }

  function downloadExportData() {
    const exportData = prepareExportData();
    const format = document.getElementById("export-format").value;
    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `keyvault-export-${
      new Date().toISOString().split("T")[0]
    }.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Export downloaded successfully", "success");
  }

  function prepareExportData() {
    const format = document.getElementById("export-format").value;
    const usePassword = document.getElementById(
      "export-password-protect"
    ).checked;
    const password = usePassword
      ? document.getElementById("export-password").value
      : null;

    let exportData;

    if (format === "json") {
      const dataToExport = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        keys: keys,
        encrypted: false,
      };

      if (usePassword && password) {
        // In a real app, you would use proper encryption here
        dataToExport.encrypted = true;
        dataToExport.keys = btoa(JSON.stringify(keys) + password); // Simple obfuscation
      }

      exportData = JSON.stringify(dataToExport, null, 2);
    } else {
      // CSV format
      const headers = [
        "Name",
        "Type",
        "Service",
        "Value",
        "Description",
        "Created",
        "Updated",
      ];
      const rows = keys.map((key) => [
        `"${key.name.replace(/"/g, '""')}"`,
        `"${key.type}"`,
        `"${key.service}"`,
        `"${key.value.replace(/"/g, '""')}"`,
        `"${(key.description || "").replace(/"/g, '""')}"`,
        `"${key.createdAt}"`,
        `"${key.updatedAt}"`,
      ]);

      exportData = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");
    }

    return exportData;
  }

  function processImport() {
    const importData = document.getElementById("import-data").value.trim();
    if (!importData) {
      showToast("No import data provided", "error");
      return;
    }

    try {
      const data = JSON.parse(importData);
      let importedKeys = [];

      if (data.encrypted) {
        const password = document.getElementById("import-password").value;
        if (!password) {
          showToast("Password is required for encrypted import", "error");
          return;
        }

        // In a real app, you would use proper decryption here
        try {
          const decrypted = atob(data.keys);
          const keyData = decrypted.slice(0, -password.length);
          if (decrypted !== keyData + password) {
            throw new Error("Invalid password");
          }
          importedKeys = JSON.parse(keyData);
        } catch (e) {
          showToast("Failed to decrypt - wrong password?", "error");
          return;
        }
      } else if (Array.isArray(data.keys)) {
        importedKeys = data.keys;
      } else if (Array.isArray(data)) {
        importedKeys = data;
      } else {
        // Try to parse as CSV
        importedKeys = parseCSV(importData);
      }

      if (!Array.isArray(importedKeys)) {
        throw new Error("Invalid import format");
      }

      // Validate keys
      const validKeys = importedKeys.filter(
        (key) =>
          key.name &&
          key.value &&
          (key.type || "api") &&
          (key.service || "custom")
      );

      if (validKeys.length === 0) {
        throw new Error("No valid keys found in import data");
      }

      // Merge with existing keys (skip duplicates by name)
      const existingNames = keys.map((k) => k.name.toLowerCase());
      const newKeys = validKeys.filter(
        (k) => !existingNames.includes(k.name.toLowerCase())
      );

      if (newKeys.length === 0) {
        showToast("All keys in import already exist", "warning");
        return;
      }

      keys = [
        ...keys,
        ...newKeys.map((key) => ({
          ...key,
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          createdAt: key.createdAt || new Date().toISOString(),
          updatedAt: key.updatedAt || new Date().toISOString(),
        })),
      ];

      saveKeys();
      renderKeys();
      showToast(`Imported ${newKeys.length} new keys successfully`, "success");
      closeAllModals();
    } catch (e) {
      console.error("Import error:", e);
      showToast("Failed to import keys: " + e.message, "error");
    }
  }

  function parseCSV(csvData) {
    const lines = csvData.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length !== headers.length) continue;

      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j].toLowerCase()] = values[j].replace(/^"|"$/g, "").trim();
      }

      if (obj.name && obj.value) {
        result.push({
          name: obj.name,
          type: obj.type || "api",
          service: obj.service || "custom",
          value: obj.value,
          description: obj.description || "",
          createdAt: obj.created || new Date().toISOString(),
          updatedAt: obj.updated || new Date().toISOString(),
        });
      }
    }

    return result;
  }

  // Toggle password visibility
  function toggleVisibility(e) {
    const targetId = e.target.closest(".toggle-visibility").dataset.target;
    const input = document.getElementById(targetId);
    const icon = e.target.closest(".toggle-visibility").querySelector("i");

    if (input.type === "password") {
      input.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  }

  // Copy to clipboard
  function copyToClipboard(e) {
    const targetId = e.target.closest(".btn-copy").dataset.target;
    const input = document.getElementById(targetId);

    input.select();
    document.execCommand("copy");

    // Show feedback
    const originalText = e.target.closest(".btn-copy").innerHTML;
    e.target.closest(".btn-copy").innerHTML = '<i class="fas fa-check"></i>';

    setTimeout(() => {
      e.target.closest(".btn-copy").innerHTML = originalText;
    }, 2000);

    showToast("Copied to clipboard", "success");
  }

  // Toggle theme
  function toggleTheme() {
    const newTheme = themeToggle.checked ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  }

  // Save keys to localStorage
  function saveKeys() {
    localStorage.setItem("keys", JSON.stringify(keys));
  }

  // Reset form
  function resetForm() {
    keyForm.reset();
    delete keyForm.dataset.editId;
    isEditMode = false;
    currentSelectedKey = null;
  }

  // Close all modals
  function closeAllModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("active");
    });
  }

  // Show toast notification
  function showToast(message, type = "success", duration = 3000) {
    toast.innerHTML = `
            <i class="fas fa-${
              type === "success"
                ? "check-circle"
                : type === "error"
                ? "times-circle"
                : "exclamation-circle"
            }"></i>
            <span>${message}</span>
        `;
    toast.className = "toast show " + type;

    if (duration) {
      clearTimeout(toast.timeout);
      toast.timeout = setTimeout(() => {
        toast.classList.remove("show");
      }, duration);
    }
  }

  // Animate key card
  function animateKeyCard(keyId) {
    const card = document.querySelector(`.key-card[data-key-id="${keyId}"]`);
    if (card) {
      card.style.transform = "scale(1.05)";
      card.style.boxShadow = "0 10px 20px rgba(0,0,0,0.3)";

      setTimeout(() => {
        card.style.transform = "";
        card.style.boxShadow = "";
      }, 500);
    }
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
});
