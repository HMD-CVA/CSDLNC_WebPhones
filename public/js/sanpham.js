document.addEventListener("DOMContentLoaded", () => {
  // Xử lý thêm sản phẩm
  const addBtn = document.getElementById("addSP");
  if (addBtn) {
    addBtn.onclick = async () => {
      const name = document.getElementById("sp_name").value;
      const price = Number(document.getElementById("sp_price").value);
      const description = document.getElementById("sp_description").value;
      const image = document.getElementById("sp_image").value;
      const sale = document.getElementById("sp_sale").checked;

      const res = await fetch("/api/sanpham", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, description, image, sale }),
      });

      if (res.ok) {
        location.reload();
      } else {
        alert("❌ Thêm sản phẩm thất bại");
      }
    };
  }
  

  // Xử lý xoá sản phẩm
  document.querySelectorAll(".deleteSP").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm("Bạn có chắc muốn xoá sản phẩm này?")) return;

      const res = await fetch(`/api/sanpham/${id}`, { method: "DELETE" });
      if (res.ok) {
        location.reload();
      } else {
        alert("❌ Xoá thất bại");
      }
    };
  });

  // Xử lý sửa sản phẩm
  document.querySelectorAll(".editSP").forEach((btn) => {
    btn.onclick = () => {
      document.getElementById("sp_id").value = btn.dataset.id;
      document.getElementById("sp_name").value = btn.dataset.name;
      document.getElementById("sp_price").value = btn.dataset.price;
      document.getElementById("sp_description").value = btn.dataset.description;
      document.getElementById("sp_image").value = btn.dataset.image;
      document.getElementById("sp_sale").checked = btn.dataset.sale === "true";

      document.getElementById("addSP").classList.add("d-none");
      document.getElementById("updateSP").classList.remove("d-none");
      document.getElementById("cancelEdit").classList.remove("d-none");
    };
  }); 

  // Xử lý cập nhật sản phẩm
  const updateBtn = document.getElementById("updateSP");
  if (updateBtn) {
    updateBtn.onclick = async () => {
      const id = document.getElementById("sp_id").value;
      const name = document.getElementById("sp_name").value;
      const price = Number(document.getElementById("sp_price").value);
      const description = document.getElementById("sp_description").value;
      const image = document.getElementById("sp_image").value;
      const sale = document.getElementById("sp_sale").checked;

      const res = await fetch(`/api/sanpham/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, description, image, sale }),
      });

      if (res.ok) {
        location.reload();
      } else {
        alert("❌ Cập nhật thất bại");
      }
    };
  }

  // Xử lý huỷ chỉnh sửa
  const cancelBtn = document.getElementById("cancelEdit");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      document.getElementById("sp_id").value = "";
      document.getElementById("sp_name").value = "";
      document.getElementById("sp_price").value = "";
      document.getElementById("sp_description").value = "";
      document.getElementById("sp_image").value = "";
      document.getElementById("sp_sale").checked = false;

      document.getElementById("addSP").classList.remove("d-none");
      document.getElementById("updateSP").classList.add("d-none");
      document.getElementById("cancelEdit").classList.add("d-none");
    };
  }
});

// document.getElementById('addSP').onclick = async function() {
//   const name = document.getElementById('sp_name').value;
//   const price = Number(document.getElementById('sp_price').value);
//   const description = document.getElementById('sp_description').value;
//   const image = document.getElementById('sp_image').value;
//   const sale = document.getElementById('sp_sale').checked;
//   const res = await fetch('/api/sanpham', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, price, description, image, sale })
//   });
//   if(res.ok) location.reload();
//   else alert('Thêm thất bại');
// };

// document.querySelectorAll('.deleteSP').forEach(btn => {
//   btn.onclick = async function() {
//     if(confirm('Xoá sản phẩm này?')) {
//       const id = btn.dataset.id;
//       const res = await fetch('/api/sanpham/' + id, { method: 'DELETE' });
//       if(res.ok) location.reload();
//       else alert('Xoá thất bại');
//     }
//   }
// });

// document.querySelectorAll('.editSP').forEach(btn => {
//   btn.onclick = function() {
//     document.getElementById('sp_id').value = btn.dataset.id;
//     document.getElementById('sp_name').value = btn.dataset.name;
//     document.getElementById('sp_price').value = btn.dataset.price;
//     document.getElementById('sp_description').value = btn.dataset.description;
//     document.getElementById('sp_image').value = btn.dataset.image;
//     document.getElementById('sp_sale').checked = btn.dataset.sale === "true";

//     document.getElementById('addSP').classList.add('d-none');
//     document.getElementById('updateSP').classList.remove('d-none');
//     document.getElementById('cancelEdit').classList.remove('d-none');
//   }
// });

// document.getElementById('updateSP').onclick = async function() {
//   const id = document.getElementById('sp_id').value;
//   const name = document.getElementById('sp_name').value;
//   const price = Number(document.getElementById('sp_price').value);
//   const description = document.getElementById('sp_description').value;
//   const image = document.getElementById('sp_image').value;
//   const sale = document.getElementById('sp_sale').checked;
//   const res = await fetch('/api/sanpham/' + id, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, price, description, image, sale })
//   });
//   if(res.ok) location.reload();
//   else alert('Cập nhật thất bại');
// };

// document.getElementById('cancelEdit').onclick = function() {
//   document.getElementById('sp_id').value = '';
//   document.getElementById('sp_name').value = '';
//   document.getElementById('sp_price').value = '';
//   document.getElementById('sp_description').value = '';
//   document.getElementById('sp_image').value = '';
//   document.getElementById('sp_sale').checked = false;

//   document.getElementById('addSP').classList.remove('d-none');
//   document.getElementById('updateSP').classList.add('d-none');
//   this.classList.add('d-none');
// };