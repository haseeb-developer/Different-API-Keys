class NetworkMonitor {
  constructor() {
    this.offlineOverlay = document.getElementById("offline-overlay");
    this.wifiIndicator = document.getElementById("wifi-indicator");
    this.wifiIcon = this.wifiIndicator.querySelector(".wifi-icon");
    this.wifiText = this.wifiIndicator.querySelector(".wifi-text");
    this.lastState = null;

    // Initial check
    this.checkConnection(true);

    // Event listeners for immediate response
    window.addEventListener("online", () => this.handleConnection(true));
    window.addEventListener("offline", () => this.handleConnection(false));

    // Active monitoring with fast interval
    this.checkInterval = setInterval(() => {
      this.activeConnectionCheck();
    }, 1000); // Check every second

    // First active check immediately
    this.activeConnectionCheck();
  }

  async activeConnectionCheck() {
    try {
      // Use a fast-checking endpoint with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);

      await fetch("https://connectivitycheck.gstatic.com/generate_204", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.handleConnection(true);
    } catch {
      this.handleConnection(false);
    }
  }

  handleConnection(isOnline) {
    if (this.lastState === isOnline) return;
    this.lastState = isOnline;

    // Update body class for overflow control
    document.body.classList.toggle("offline-mode", !isOnline);

    if (isOnline) {
      // Connection restored - INSTANT UPDATE
      this.offlineOverlay.classList.remove("active");
      this.wifiIndicator.classList.remove("offline");
      this.wifiIcon.classList.replace("fa-unlink", "fa-wifi");
      this.wifiText.textContent = "Secure Connection";

      // Visual confirmation
      this.wifiIndicator.style.animation = "celebrate 0.5s";
      setTimeout(() => (this.wifiIndicator.style.animation = ""), 500);
    } else {
      // Connection lost - INSTANT UPDATE
      this.offlineOverlay.classList.add("active");
      this.wifiIndicator.classList.add("offline");
      this.wifiIcon.classList.replace("fa-wifi", "fa-unlink");
      this.wifiText.textContent = "No Connection";

      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }

  // Initial check with visual feedback
  checkConnection(initial = false) {
    const wasOnline = navigator.onLine;
    this.activeConnectionCheck().then(() => {
      if (initial && !wasOnline) {
        // Force UI update on initial load if offline
        this.handleConnection(false);
      }
    });
  }
}

// Start monitoring immediately
document.addEventListener("DOMContentLoaded", () => new NetworkMonitor());
