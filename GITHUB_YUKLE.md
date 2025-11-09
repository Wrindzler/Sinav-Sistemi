# 📤 KOSTÜ SINAV SİSTEMİ - GITHUB'A YÜKLEME REHBERİ

## ✅ ÖN KONTROL

Aşağıdaki dosyaların hazır olduğundan emin olun:

- ✅ `.env` dosyası `.gitignore`'da (GİZLİ)
- ✅ `env.example` dosyası var (ŞABLON)
- ✅ `node_modules/` ignore edilmiş
- ✅ `venv/` ignore edilmiş
- ✅ `instance/` ignore edilmiş (database)
- ✅ `__pycache__/` ignore edilmiş

---

## 🚀 GITHUB'A YÜKLEME ADIMLARI

### Adım 1: Git İnit (İlk Kez)

```bash
# Projenizin klasöründe
cd C:\Users\EMRE\Desktop\proje

# Git başlat (sadece ilk kez)
git init

# Kullanıcı bilgilerinizi ayarlayın (sadece ilk kez)
git config user.name "Adınız Soyadınız"
git config user.email "email@example.com"
```

### Adım 2: .env Dosyasını Kontrol Edin

```bash
# .env dosyasının ignore edildiğini kontrol edin
git status

# ÇIKTI:
# .env GÖRÜNMEMELI! ✅
# Görünüyorsa:
git rm --cached .env
```

### Adım 3: Tüm Dosyaları Ekleyin

```bash
# Tüm dosyaları staging'e ekle
git add .

# Durumu kontrol et
git status

# ÇIKTI:
# .env GÖRÜNMEMELI! ✅
# env.example GÖRÜNMELI! ✅
```

### Adım 4: İlk Commit

```bash
git commit -m "Initial commit: KOSTÜ Sınav Sistemi

- KOSTÜ branding ve yeşil-beyaz tema
- 4 rol sistemi (Admin, Öğretim Üyesi, Öğrenci, Bölüm Başkanı)
- Soru havuzu sistemi (rastgele soru seçimi)
- Test oluşturma ve yönetim
- Sınav alma sistemi (10 dakika)
- Ağırlıklı not hesaplama (Vize %40, Final %60)
- Kullanıcı, ders, test, soru silme özellikleri
- Otomatik kaydetme ve puanlama
- JWT authentication ve güvenlik
- Responsive tasarım"
```

### Adım 5: GitHub'da Repository Oluşturun

1. https://github.com adresine gidin
2. Sağ üstte **"+"** → **"New repository"**
3. Repository adı: `kostu-sinav-sistemi`
4. Açıklama: `Kocaeli Sağlık ve Teknoloji Üniversitesi Web Tabanlı Sınav Yönetim Sistemi`
5. **Public** veya **Private** seçin
6. ❌ **README eklemeyin** (zaten var)
7. ❌ **.gitignore eklemeyin** (zaten var)
8. **"Create repository"** tıklayın

### Adım 6: Remote Ekleyin ve Push Yapın

```bash
# GitHub'daki repository URL'inizi ekleyin
git remote add origin https://github.com/KULLANICI_ADINIZ/kostu-sinav-sistemi.git

# Branch adını main yap
git branch -M main

# Push yap
git push -u origin main
```

**BAŞARILI! ✅**

---

## 🔒 GÜVENLİK KONTROLÜ

### Push Yapmadan Önce Kontrol Edin:

```bash
# .env dosyasının OLMAYACAĞINDAN emin olun
git ls-files | findstr .env

# ÇIKTI: Boş olmalı!
# env.example olmalı, .env olmamalı!
```

### Eğer .env Yanlışlıkla Eklendiyse:

```bash
# .env'i git'ten kaldır
git rm --cached .env

# Tekrar commit
git commit -m "Remove .env from git"

# Push
git push
```

---

## 📝 BAŞKA BİRİ NASIL KULLANIR?

### 1. Repository'yi Clone Edin:

```bash
git clone https://github.com/KULLANICI_ADINIZ/kostu-sinav-sistemi.git
cd kostu-sinav-sistemi
```

### 2. .env Dosyası Oluşturun:

```bash
# env.example'ı kopyalayın
copy env.example .env

# .env dosyasını düzenleyin ve kendi şifrelerinizi girin
notepad .env
```

### 3. Python Bağımlılıklarını Yükleyin:

```bash
# Virtual environment oluştur
python -m venv venv

# Aktif et
.\venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt
```

### 4. Node.js Bağımlılıklarını Yükleyin:

```bash
npm install
```

### 5. MySQL Veritabanı Oluşturun:

```sql
CREATE DATABASE exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. Başlatın:

```bash
# Tek tuşla
BASLAT.bat

# veya manuel
# Terminal 1: .\venv\Scripts\activate && python app.py
# Terminal 2: npm run dev
```

---

## 📋 GITHUB REPOSITORY İÇERİĞİ

```
kostu-sinav-sistemi/
├── app.py                  ✅ Backend
├── requirements.txt        ✅ Python bağımlılıkları
├── package.json            ✅ Node bağımlılıkları
├── .gitignore             ✅ Güvenlik
├── env.example            ✅ Şablon
├── BASLAT.bat             ✅ Kolay başlatma
├── README.md              ✅ Dokümantasyon
├── NASIL_KULLANILIR.txt   ✅ Kullanım rehberi
├── PROJE_OZET.md          ✅ Proje özeti
├── index.html             ✅ HTML
├── vite.config.js         ✅ Vite config
├── logo.png               ✅ KOSTÜ logosu
├── src/                   ✅ Frontend kodları
│   ├── components/
│   ├── context/
│   └── utils/
└── public/                ✅ Static dosyalar

ÇIKMAYANlar:
❌ .env (GİZLİ!)
❌ venv/ (Local)
❌ node_modules/ (Local)
❌ instance/ (Database)
❌ __pycache__/ (Cache)
```

---

## 🎊 README.md için GitHub Badge Ekleyelim mi?

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">README.md
