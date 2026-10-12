// =============================================================
// ✏️ UBAH DI SINI: tanggapan website untuk setiap emosi
// Ganti teks dan emoji sesuai karakter website kelompok kalian.
// =============================================================
const TANGGAPAN = {
  happy:     { nama: "Senang",   emoji: "😄", teks: "Wah, kamu lagi senang ya! Pertahankan senyummu!" },
  sad:       { nama: "Sedih",    emoji: "😢", teks: "Jangan sedih, semangat ya! Semua pasti ada jalannya." },
  angry:     { nama: "Marah",    emoji: "😠", teks: "Tarik napas dulu... tenang, semuanya bisa dibicarakan." },
  surprised: { nama: "Terkejut", emoji: "😲", teks: "Kaget ya? Ada apa nih?" },
  neutral:   { nama: "Netral",   emoji: "😐", teks: "Coba tunjukkan ekspresimu!" },
  fearful:   { nama: "Takut",    emoji: "😨", teks: "Tenang, kamu aman kok." },
  disgusted: { nama: "Jijik",    emoji: "🤢", teks: "Hmm, sepertinya ada yang kurang enak ya?" },
};

// Teks saat tidak ada wajah di depan kamera
const TANPA_WAJAH = { emoji: "👀", nama: "Wajah tidak terlihat", teks: "Halo? Aku tidak melihat wajahmu!" };

// Seberapa sering AI menganalisis kamera (milidetik)
const JEDA_ANALISIS = 300;

// =============================================================
// Bagian di bawah ini adalah logika program. Tidak perlu diubah.
// =============================================================
const video = document.getElementById("video");
const tombolMulai = document.getElementById("tombolMulai");
const statusEl = document.getElementById("status");
const placeholder = document.getElementById("placeholder");
const emojiEl = document.getElementById("emoji");
const namaEmosiEl = document.getElementById("namaEmosi");
const tanggapanEl = document.getElementById("tanggapan");
const daftarPeluang = document.getElementById("daftarPeluang");

tombolMulai.disabled = true;

function tampilkanStatus(teks, error = false) {
  statusEl.textContent = teks;
  statusEl.classList.toggle("error", error);
}

// Buat bar probabilitas untuk setiap emosi
for (const [kunci, data] of Object.entries(TANGGAPAN)) {
  daftarPeluang.insertAdjacentHTML("beforeend", `
    <div class="baris">
      <span class="label">${data.nama}</span>
      <div class="bar"><div class="isi" id="isi-${kunci}"></div></div>
      <span class="persen" id="persen-${kunci}">0%</span>
    </div>`);
}

// 1. Memuat model AI pre-trained dari folder "models"
async function muatModel() {
  try {
    // Pakai kartu grafis (WebGL) jika ada; jika tidak, AI tetap jalan dengan CPU
    const pakaiWebgl = await faceapi.tf.setBackend("webgl").catch(() => false);
    if (!pakaiWebgl) await faceapi.tf.setBackend("cpu");
    await faceapi.tf.ready();

    await faceapi.nets.tinyFaceDetector.loadFromUri("models");
    await faceapi.nets.faceExpressionNet.loadFromUri("models");
    tampilkanStatus("Model AI siap. Klik tombol untuk menyalakan kamera.");
    tombolMulai.disabled = false;
  } catch (err) {
    console.error(err);
    tampilkanStatus(
      "Model AI gagal dimuat. Website ini harus dibuka lewat server (misalnya setelah di-deploy ke Netlify), bukan dengan membuka file index.html langsung.",
      true
    );
  }
}

// 2. Menyalakan kamera (hanya diizinkan browser di halaman HTTPS atau localhost)
async function nyalakanKamera() {
  if (!window.isSecureContext || !navigator.mediaDevices) {
    tampilkanStatus("Kamera hanya bisa dipakai di halaman HTTPS. Deploy website ini ke Netlify dulu, ya!", true);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;
    await video.play();
    placeholder.style.display = "none";
    tombolMulai.disabled = true;
    tombolMulai.textContent = "📷 Kamera aktif";
    tampilkanStatus("AI sedang membaca ekspresimu...");
    analisis();
  } catch (err) {
    console.error(err);
    tampilkanStatus("Izin kamera ditolak atau kamera tidak ditemukan.", true);
  }
}

// 3. Menganalisis wajah terus-menerus
async function analisis() {
  const opsi = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const hasil = await faceapi.detectSingleFace(video, opsi).withFaceExpressions();

  if (hasil) {
    const peluang = hasil.expressions; // contoh: { happy: 0.81, neutral: 0.12, ... }
    const emosiTeratas = Object.keys(peluang).reduce((a, b) => (peluang[a] > peluang[b] ? a : b));
    tampilkanHasil(TANGGAPAN[emosiTeratas]);
    perbaruiBar(peluang);
  } else {
    tampilkanHasil(TANPA_WAJAH);
    perbaruiBar({});
  }

  setTimeout(analisis, JEDA_ANALISIS);
}

function tampilkanHasil(data) {
  emojiEl.textContent = data.emoji;
  namaEmosiEl.textContent = data.nama;
  tanggapanEl.textContent = data.teks;
}

function perbaruiBar(peluang) {
  for (const kunci of Object.keys(TANGGAPAN)) {
    const persen = Math.round((peluang[kunci] || 0) * 100);
    document.getElementById(`isi-${kunci}`).style.width = persen + "%";
    document.getElementById(`persen-${kunci}`).textContent = persen + "%";
  }
}

tombolMulai.addEventListener("click", nyalakanKamera);
muatModel();
