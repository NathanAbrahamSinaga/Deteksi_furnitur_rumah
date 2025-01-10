let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let btnMulaiKamera = document.getElementById('mulaiKamera');
let btnAmbilFoto = document.getElementById('ambilFoto');
let errorMessage = document.getElementById('errorMessage');
let uploadFile = document.getElementById('uploadFile');
let pilihFileBtn = document.getElementById('pilihFile');

pilihFileBtn.addEventListener('click', () => {
    uploadFile.click();
});

uploadFile.addEventListener('change', async () => {
    const file = uploadFile.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);

    document.getElementById('hasilGambar').src = fileURL;

    document.getElementById('hasilDeteksi').style.display = 'block';

    const reader = new FileReader();
    reader.onloadend = () => {
        const gambarBase64 = reader.result;
        fetch('/prediksi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gambar: gambarBase64 })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            sembunyikanError();
            document.getElementById('hasilKelas').textContent = data.kelas;
            document.getElementById('hasilKeyakinan').textContent = 
                `${(data.keyakinan * 100).toFixed(2)}%`;
        })
        .catch(error => {
            tampilkanError('Error saat memproses gambar: ' + error.message);
        });
    };
    reader.readAsDataURL(file);
});

function tampilkanError(pesan) {
    errorMessage.textContent = pesan;
    errorMessage.style.display = 'block';
}

function sembunyikanError() {
    errorMessage.style.display = 'none';
}

async function mulaiKamera() {
    try {
        sembunyikanError();
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        await video.play();
        
        btnAmbilFoto.disabled = false;
        btnMulaiKamera.textContent = 'Matikan Kamera';
        btnMulaiKamera.classList.replace('btn-primary', 'btn-danger');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    } catch (err) {
        console.error('Error:', err);
        if (err.name === 'NotAllowedError') {
            tampilkanError('Mohon izinkan akses kamera untuk menggunakan fitur ini.');
        } else if (err.name === 'NotFoundError') {
            tampilkanError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.');
        } else {
            tampilkanError('Terjadi kesalahan saat mengakses kamera: ' + err.message);
        }
    }
}

function matikanKamera() {
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        btnAmbilFoto.disabled = true;
        btnMulaiKamera.textContent = 'Mulai Kamera';
        btnMulaiKamera.classList.replace('btn-danger', 'btn-primary');
    }
}

video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

btnMulaiKamera.addEventListener('click', () => {
    if (video.srcObject === null) {
        mulaiKamera();
    } else {
        matikanKamera();
    }
});

btnAmbilFoto.addEventListener('click', () => {
    if (!video.srcObject) {
        tampilkanError('Kamera tidak aktif. Mohon aktifkan kamera terlebih dahulu.');
        return;
    }

    try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const gambarBase64 = canvas.toDataURL('image/jpeg');

        fetch('/prediksi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gambar: gambarBase64 })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            sembunyikanError();
            document.getElementById('hasilDeteksi').style.display = 'block';
            document.getElementById('hasilGambar').src = gambarBase64;
            document.getElementById('hasilKelas').textContent = data.kelas;
            document.getElementById('hasilKeyakinan').textContent = 
                `${(data.keyakinan * 100).toFixed(2)}%`;
        })
        .catch(error => {
            tampilkanError('Error saat memproses gambar: ' + error.message);
        });
    } catch (error) {
        tampilkanError('Error saat mengambil foto: ' + error.message);
    }
});

if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    tampilkanError('Browser Anda tidak mendukung akses kamera. Mohon gunakan browser modern seperti Chrome atau Firefox.');
    btnMulaiKamera.disabled = true;
}