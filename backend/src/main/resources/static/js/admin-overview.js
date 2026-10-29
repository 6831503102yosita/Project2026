
window.BTAdminOverview = (() => {
  let data = null;
  let loading = false;
  let error = "";
  let loaded = false;

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  async function load() {
    if (loading) return;

    loading = true;
    error = "";

    try {
      const response = await fetch("/api/admin/overview", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      data = await response.json();
      loaded = true;
    } catch (e) {
      error = e.message;
      loaded = false;
    } finally {
      loading = false;

      if (typeof AT !== "undefined" &&
          AT === "ov" &&
          location.hash.startsWith("#/admin") &&
          typeof draw === "function") {
        draw();
      }
    }
  }

  function refresh() {
    loaded = false;
    error = "";
    load();
  }

  function render() {
    if (!loaded && !loading && !error) {
      load();
    }

    if (error) {
      return `
        <div class="card pad">
          <p style="color:#dc2626">
            โหลด Dashboard จาก MySQL ไม่สำเร็จ:
            ${esc(error)}
          </p>
          <button class="btn"
            onclick="BTAdminOverview.refresh()">
            ลองใหม่
          </button>
        </div>`;
    }

    if (!loaded) {
      return `<div class="card pad">
        กำลังโหลด Dashboard จาก MySQL...
      </div>`;
    }

    const stats = [
      ["Events / Tours", data.events],
      ["Bookings", data.bookings],
      ["สลิปรอตรวจ", data.pendingSlips],
      ["Event Requests", data.requests],
      ["Users", data.users]
    ];

    return `
      <div class="sh">
        <h2>ภาพรวมระบบ BlueTrail</h2>
        <button class="btn sm o"
          onclick="BTAdminOverview.refresh()">
          โหลดใหม่
        </button>
      </div>



      <div class="sum">
        ${stats.map(([label, value]) => `
          <div class="card">
            <b>${Number(value ?? 0).toLocaleString("th-TH")}</b>
            ${esc(label)}
          </div>
        `).join("")}
      </div>`;
  }

  return {render, refresh};
})();
