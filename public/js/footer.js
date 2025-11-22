// document.getElementById('addKH').addEventListener('click', async function() {
//     const name = document.getElementById('name').value;
//     const phone = document.getElementById('phone').value;
//     const address = document.getElementById('address').value;

//     const res = await fetch('/api/khachhang', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ name, phone, address })
//     });

//     if (res.ok) {
//         alert('Thêm khách hàng thành công!');
//         location.reload(); // reload để cập nhật danh sách
//     } else {
//         alert('Thêm khách hàng thất bại!');
//     }
// });

// // Xử lý nút Edit
// document.querySelectorAll('.editKH').forEach(btn => {
//     btn.addEventListener('click', function() {
//         document.getElementById('name').value = btn.dataset.name;
//         document.getElementById('phone').value = btn.dataset.phone;
//         document.getElementById('address').value = btn.dataset.address;
//         document.getElementById('addKH').style.display = 'none';

//         let editBtn = document.getElementById('saveEditKH');
//         if (!editBtn) {
//             editBtn = document.createElement('button');
//             editBtn.id = 'saveEditKH';
//             editBtn.textContent = 'Save';
//             document.getElementById('test').appendChild(editBtn);
//         }
//         editBtn.style.display = 'inline-block';

//         editBtn.onclick = async function() {
//             const name = document.getElementById('name').value;
//             const phone = document.getElementById('phone').value;
//             const address = document.getElementById('address').value;
//             const id = btn.dataset.id;
//             const res = await fetch(`/api/khachhang/${id}`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ name, phone, address })
//             });
//             if (res.ok) {
//                 alert('Cập nhật khách hàng thành công!');
//                 location.reload();
//             } else {
//                 alert('Cập nhật thất bại!');
//             }
//         };
//     });
// });

// document.querySelectorAll('.deleteKH').forEach(btn => {
//     btn.addEventListener('click', async function() {
//         if (confirm(`Bạn có chắc muốn xóa khách hàng ${btn.dataset.name}?`)) {
//             const id = btn.dataset.id;
//             const res = await fetch(`/api/khachhang/${id}`, {
//                 method: 'DELETE',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ name, phone, address })
//             });
//             if (res.ok) {
//                 alert('Xóa khách hàng thành công!');
//                 location.reload();
//             } else {
//                 alert('Xóa khách hàng thất bại!');
//             }
//         }
//     });
// });

// document.getElementById('addSP').addEventListener('click', async function() {
//     const name = document.getElementById('sp_name').value;
//     const price = document.getElementById('sp_price').value;
//     const description = document.getElementById('sp_description').value;
//     const image = document.getElementById('sp_image').value;

//     const res = await fetch('/api/sanpham', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ name, price, description, image })
//     });

//     if (res.ok) {
//         alert('Thêm sản phẩm thành công!');
//         location.reload(); // reload để cập nhật danh sách
//     } else {
//         alert('Thêm sản phẩm thất bại!');
//     }
// });

// document.querySelectorAll('.editSP').forEach(btn => {
//     btn.addEventListener('click', function() {
//         document.getElementById('sp_name').value = btn.dataset.name;
//         document.getElementById('sp_price').value = btn.dataset.price;
//         document.getElementById('sp_description').value = btn.dataset.description;
//         document.getElementById('sp_image').value = btn.dataset.image;
//         document.getElementById('addSP').style.display = 'none';

//         let editBtn = document.getElementById('saveEditSP');
//         if (!editBtn) {
//             editBtn = document.createElement('button');
//             editBtn.id = 'saveEditSP';
//             editBtn.textContent = 'Save';
//             document.getElementById('testproduct').appendChild(editBtn);
//         }
//         editBtn.style.display = 'inline-block';

//         editBtn.onclick = async function() {
//             const name = document.getElementById('sp_name').value;
//             const price = document.getElementById('sp_price').value;
//             const description = document.getElementById('sp_description').value;
//             const image = document.getElementById('sp_image').value;
//             const id = btn.dataset.id;
//             const res = await fetch(`/api/sanpham/${id}`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ name, price, description, image })
//             });
//             if (res.ok) {
//                 alert('Cập nhật sản phẩm thành công!');
//                 location.reload();
//             } else {
//                 alert('Cập nhật thất bại!');
//             }
//         };
//     });
// });




