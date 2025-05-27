class NetworkMonitor {
  constructor() {
    this.wifiStatus = document.getElementById("wifi-status");
    this.offlineOverlay = document.getElementById("offline-overlay");
    this.lastOnline = true;

    // Initial check
    this.handleConnectionChange();

    // Event listeners
    window.addEventListener("online", this.handleConnectionChange.bind(this));
    window.addEventListener("offline", this.handleConnectionChange.bind(this));

    // Continuous monitoring (for cases where events don't fire)
    setInterval(() => this.checkConnection(), 5000);
  }

  checkConnection() {
    // More reliable than navigator.onLine for WiFi detection
    fetch("https://connectivitycheck.gstatic.com/generate_204", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
    })
      .then(() => {
        if (!navigator.onLine) this.handleConnectionChange(true);
      })
      .catch(() => {
        if (navigator.onLine) this.handleConnectionChange(false);
      });
  }

  handleConnectionChange(forceState) {
    const isOnline = forceState !== undefined ? forceState : navigator.onLine;

    if (isOnline === this.lastOnline) return;
    this.lastOnline = isOnline;

    if (isOnline) {
      this.wifiStatus.style.display = "flex";
      this.offlineOverlay.classList.remove("active");

      // Add celebration effect
      this.wifiStatus.style.animation = "none";
      void this.wifiStatus.offsetWidth; // Trigger reflow
      this.wifiStatus.style.animation = "celebrate 0.5s ease";

      setTimeout(() => {
        this.wifiStatus.style.animation = "";
      }, 500);
    } else {
      this.wifiStatus.style.display = "none";
      this.offlineOverlay.classList.add("active");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NetworkMonitor();
});
