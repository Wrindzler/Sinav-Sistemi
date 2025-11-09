# 🎓 KOSTÜ Sınav Sistemi

**Kocaeli Sağlık ve Teknoloji Üniversitesi Sınav Yönetim Sistemi**

![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green?logo=flask)
![React](https://img.shields.io/badge/React-18.0-61DAFB?logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?logo=mysql)
![License](https://img.shields.io/badge/License-MIT-yellow)

Web tabanlı sınav yönetim sistemi. Öğretim üyeleri test oluşturabilir, öğrenciler sınavlara katılabilir ve notlar otomatik hesaplanır.

---

## 🚀 TEK TUŞLA BAŞLAT

**BASLAT.bat** dosyasına çift tıklayın, sistem otomatik başlayacak!

```
✅ Backend:  http://localhost:5000
✅ Frontend: http://localhost:3000
```

### İlk Giriş

- **Kullanıcı**: `admin`
- **Şifre**: `admin123`

---

## ✨ Özellikler

### 👥 Roller

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Kullanıcı, ders, kayıt yönetimi |
| **Öğretim Üyesi** | Test/soru oluşturma, sonuç görüntüleme |
| **Öğrenci** | Sınav alma, sonuç görüntüleme |
| **Bölüm Başkanı** | Tüm istatistikleri görüntüleme |

### 🎯 Sistem Gereksinimleri

- ✅ Minimum 10 öğrenci, 2 öğretim üyesi
- ✅ Minimum 4 ders
- ✅ Her test için minimum 5 soru
- ✅ Sınav süresi: 10 dakika
- ✅ Otomatik not hesaplama (ağırlıklı)
- ✅ Rastgele soru dağılımı

---

## 🛠️ Teknolojiler

- **Backend**: Flask + SQLAlchemy + MySQL
- **Frontend**: React.js (JSX kullanılmadan)
- **Auth**: JWT
- **Database**: MySQL

---

## 📦 Manuel Kurulum

### 1. Python Bağımlılıkları

```bash
py -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Node.js Bağımlılıkları

```bash
npm install
```

### 3. MySQL Veritabanı

`.env` dosyası oluşturun:

```env
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost/exam_system
JWT_SECRET_KEY=your-secret-key-change-in-production
```

MySQL'de veritabanı oluşturun:

```sql
CREATE DATABASE exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Başlatma

```bash
# Backend
py app.py

# Frontend (yeni terminal)
npm run dev
```

---

## 📋 Kullanım Senaryosu

### 1️⃣ Admin (İlk Kurulum)
- 10+ öğrenci ekle
- 2+ öğretim üyesi ekle
- 4+ ders oluştur
- Öğrencileri derslere kaydet

### 2️⃣ Öğretim Üyesi
- Vize testi oluştur (%40)
- Final testi oluştur (%60)
- Her teste 5+ soru ekle
- Sınav tarih ve saatlerini belirle
  - **Tarih**: Sınav günü (Örn: 15 Ocak 2025)
  - **Saat Aralığı**: Başlangıç-Bitiş (Örn: 10:00-12:00)
  - **Öğrenci Süresi**: Her öğrenci için 10 dakika

### 3️⃣ Öğrenci
- Sınav saatinde teste gir
- 10 dakika içinde cevapla
- Puanını ve ortalamasını gör

### 4️⃣ Bölüm Başkanı
- Tüm ders istatistiklerini görüntüle
- Öğrenci başarı oranlarını incele

---

## 🔒 Güvenlik

⚠️ **ÖNEMLİ:** `.env` dosyası şifrelerinizi içerir ve **asla GitHub'a yüklenmemelidir!**

```
✅ .env dosyası .gitignore'da
✅ Şifreler sadece .env'de
✅ env.example örnek şablon olarak
```

---

## 📤 GitHub'a Yükleme

### Kontrol Listesi

```bash
# 1. .env dosyasının ignore edildiğini kontrol edin
git status

# .env görünmemeli! Görünüyorsa:
git rm --cached .env
```

### Yükleme

```bash
git init
git add .
git commit -m "Initial commit: Exam System"
git remote add origin https://github.com/USERNAME/exam-system.git
git branch -M main
git push -u origin main
```

---

## 🎊 Proje Tamamlandı!

**Tüm gereksinimler karşılandı. Sistem production-ready!**

Sorularınız için: `README.md` dosyasını kontrol edin.

**TEK TUŞLA BAŞLATMAK İÇİN: BASLAT.bat**
