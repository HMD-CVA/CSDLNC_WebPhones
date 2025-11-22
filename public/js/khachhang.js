const addKH = document.getElementById("addKH");
if (addKH) {
  addKH.onclick = async () => {
    const name = document.getElementById("kh_name").value;
    const phone = document.getElementById("kh_phone").value;
    const address = document.getElementById("kh_address").value;

    const res = await fetch("/api/khachhang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address }),
    });

    if (res.ok) {
      location.reload();
    } else {
      alert("❌ Thêm khách hàng thất bại");
    }
  };
}

// Edit khách hàng
document.querySelectorAll(".editKH").forEach((btn) => {
  btn.onclick = () => {
    document.getElementById("kh_id").value = btn.dataset.id;
    document.getElementById("kh_name").value = btn.dataset.name;
    document.getElementById("kh_phone").value = btn.dataset.phone;
    document.getElementById("kh_address").value = btn.dataset.address;

    document.getElementById("addKH").classList.add("d-none");
    document.getElementById("updateKH").classList.remove("d-none");
    document.getElementById("cancelEditKH").classList.remove("d-none");
  };
});

// Update khách hàng
const updateKH = document.getElementById("updateKH");
if (updateKH) {
  updateKH.onclick = async () => {
    const id = document.getElementById("kh_id").value;
    const name = document.getElementById("kh_name").value;
    const phone = document.getElementById("kh_phone").value;
    const address = document.getElementById("kh_address").value;

    const res = await fetch(`/api/khachhang/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address }),
    });

    if (res.ok) {
      location.reload();
    } else {
      alert("❌ Cập nhật thất bại");
    }
  };
}

// Cancel edit khách hàng
const cancelEditKH = document.getElementById("cancelEditKH");
if (cancelEditKH) {
  cancelEditKH.onclick = () => {
    document.getElementById("kh_id").value = "";
    document.getElementById("kh_name").value = "";
    document.getElementById("kh_phone").value = "";
    document.getElementById("kh_address").value = "";

    document.getElementById("addKH").classList.remove("d-none");
    document.getElementById("updateKH").classList.add("d-none");
    document.getElementById("cancelEditKH").classList.add("d-none");
  };
}

// Delete khách hàng
document.querySelectorAll(".deleteKH").forEach((btn) => {
  btn.onclick = async () => {
    const id = btn.dataset.id;
    if (!confirm("Bạn có chắc muốn xoá khách hàng này?")) return;

    const res = await fetch(`/api/khachhang/${id}`, { method: "DELETE" });
    if (res.ok) {
      location.reload();
    } else {
      alert("❌ Xoá thất bại");
    }
  };
});