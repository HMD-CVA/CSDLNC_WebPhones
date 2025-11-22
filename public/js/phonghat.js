document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addPH").onclick = async () => {
    const TenPhong = document.getElementById("ph_name").value;
    const LoaiPhong = document.getElementById("ph_type").value;
    const GiaPhong = Number(document.getElementById("ph_price").value);
    const SucChua = Number(document.getElementById("ph_size").value);
    const TrangThai = Number(document.getElementById("ph_status").value);
    const MoTa = document.getElementById("ph_description").value;
    const AnhPhong = document.getElementById("ph_image").value;

    // Kiểm tra dữ liệu đầu vào
    if (!TenPhong || !LoaiPhong || !GiaPhong || !SucChua) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        confirmButtonText: 'Đã hiểu'
      });
      return;
    }

    // Xác nhận thêm phòng hát
    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận thêm phòng hát',
      html: `
        <div style="text-align: left;">
          <p><strong>Tên phòng:</strong> ${TenPhong}</p>
          <p><strong>Loại phòng:</strong> ${LoaiPhong}</p>
          <p><strong>Giá phòng:</strong> ${GiaPhong.toLocaleString()} VNĐ</p>
          <p><strong>Sức chứa:</strong> ${SucChua} người</p>
          <p><strong>Trạng thái:</strong> ${TrangThai === 1 ? 'Hoạt động' : 'Không hoạt động'}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Có, thêm phòng hát',
      cancelButtonText: 'Không, hủy bỏ',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (!confirmResult.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Đã hủy',
        text: 'Thao tác thêm phòng hát đã được hủy',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      });
      return;
    }

    try {
      const res = await fetch("/api/phonghat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThai, MoTa, AnhPhong }),
      });

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Thêm phòng hát thành công',
          confirmButtonText: 'OK',
          timer: 2000,
          timerProgressBar: true
        });
        location.reload();
      } else {
        const err = await res.json();
        await Swal.fire({
          icon: 'error',
          title: 'Thất bại',
          text: 'Thêm phòng hát thất bại: ' + err.error,
          confirmButtonText: 'Đã hiểu'
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Lỗi kết nối',
        text: 'Có lỗi xảy ra khi kết nối đến server',
        confirmButtonText: 'Đã hiểu'
      });
    }
  };

  document.querySelectorAll(".editPH").forEach((btn) => {
    btn.onclick = () => {
      document.getElementById("ph_id").value = btn.dataset.id;
      document.getElementById("ph_name").value = btn.dataset.name;
      document.getElementById("ph_type").value = btn.dataset.type;
      document.getElementById("ph_price").value = btn.dataset.price;
      document.getElementById("ph_size").value = btn.dataset.size;
      document.getElementById("ph_status").value = btn.dataset.status;
      document.getElementById("ph_description").value = btn.dataset.description;
      document.getElementById("ph_image").value = btn.dataset.image;

      document.getElementById("addPH").classList.add("d-none");
      document.getElementById("updatePH").classList.remove("d-none");
      document.getElementById("cancelEditPH").classList.remove("d-none");
    };
  });

  document.getElementById("updatePH").onclick = async () => {
    const id = document.getElementById("ph_id").value;
    const TenPhong = document.getElementById("ph_name").value;
    const LoaiPhong = document.getElementById("ph_type").value;
    const GiaPhong = Number(document.getElementById("ph_price").value);
    const SucChua = Number(document.getElementById("ph_size").value);
    const TrangThai = Number(document.getElementById("ph_status").value);
    const MoTa = document.getElementById("ph_description").value;
    const AnhPhong = document.getElementById("ph_image").value;

    // Kiểm tra dữ liệu đầu vào
    if (!TenPhong || !LoaiPhong || !GiaPhong || !SucChua) {
      await Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        confirmButtonText: 'Đã hiểu'
      });
      return;
    }

    // Xác nhận cập nhật phòng hát
    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận cập nhật',
      html: `
        <div style="text-align: left;">
          <p><strong>ID phòng:</strong> ${id}</p>
          <p><strong>Tên phòng:</strong> ${TenPhong}</p>
          <p><strong>Loại phòng:</strong> ${LoaiPhong}</p>
          <p><strong>Giá phòng:</strong> ${GiaPhong.toLocaleString()} VNĐ</p>
          <p><strong>Sức chứa:</strong> ${SucChua} người</p>
          <p><strong>Trạng thái:</strong> ${TrangThai === 1 ? 'Hoạt động' : 'Không hoạt động'}</p>
        </div>
        <p style="color: #e74c3c; font-weight: bold; margin-top: 10px;">Bạn có chắc muốn cập nhật thông tin phòng hát này?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Có, cập nhật ngay',
      cancelButtonText: 'Không, hủy bỏ',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (!confirmResult.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Đã hủy',
        text: 'Thao tác cập nhật đã được hủy',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      });
      return;
    }

    try {
      const res = await fetch(`/api/phonghat/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThai, MoTa, AnhPhong }),
      });

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Cập nhật phòng hát thành công',
          confirmButtonText: 'OK',
          timer: 2000,
          timerProgressBar: true
        });
        location.reload();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Thất bại',
          text: 'Cập nhật phòng hát thất bại',
          confirmButtonText: 'Đã hiểu'
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Lỗi kết nối',
        text: 'Có lỗi xảy ra khi kết nối đến server',
        confirmButtonText: 'Đã hiểu'
      });
    }
  };

  document.getElementById("cancelEditPH").onclick = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Hủy chỉnh sửa?',
      text: 'Bạn có chắc muốn hủy thao tác chỉnh sửa? Tất cả thay đổi chưa lưu sẽ bị mất.',
      showCancelButton: true,
      confirmButtonText: 'Có, hủy bỏ',
      cancelButtonText: 'Tiếp tục chỉnh sửa',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      document.getElementById("ph_id").value = "";
      document.getElementById("ph_name").value = "";
      document.getElementById("ph_type").value = "";
      document.getElementById("ph_price").value = "";
      document.getElementById("ph_size").value = "";
      document.getElementById("ph_status").value = "";
      document.getElementById("ph_description").value = "";
      document.getElementById("ph_image").value = "";

      document.getElementById("addPH").classList.remove("d-none");
      document.getElementById("updatePH").classList.add("d-none");
      document.getElementById("cancelEditPH").classList.add("d-none");

      await Swal.fire({
        icon: 'info',
        title: 'Đã hủy',
        text: 'Thao tác chỉnh sửa đã được hủy',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };

  document.querySelectorAll(".deletePH").forEach((btn) => {
  btn.onclick = async function () {
    // Lấy thông tin phòng hát từ các data attribute
    const roomId = btn.dataset.id;
    const roomName = btn.dataset.TenPhong || btn.getAttribute('data-name') || 'phòng hát này';
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Xác nhận xóa',
      html: `
        <p>Bạn có chắc chắn muốn xóa phòng hát:</p>
        <p style="color: #e74c3c; font-weight: bold; font-size: 1.2em;">"${roomName}"</p>
        <p style="color: #e74c3c;">Hành động này không thể hoàn tác!</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Có, xóa ngay',
      cancelButtonText: 'Hủy bỏ',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/phonghat/" + roomId, { method: "DELETE" });
        
        if (res.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'Đã xóa!',
            text: `Phòng hát "${roomName}" đã được xóa thành công`,
            confirmButtonText: 'OK',
            timer: 2000,
            timerProgressBar: true
          });
          location.reload();
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Thất bại',
            text: `Xóa phòng hát "${roomName}" thất bại`,
            confirmButtonText: 'Đã hiểu'
          });
        }
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi kết nối',
          text: 'Có lỗi xảy ra khi kết nối đến server',
          confirmButtonText: 'Đã hiểu'
        });
      }
    }
  };
  });
});