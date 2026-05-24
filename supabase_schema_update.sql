-- Fuar/Çalışan Takip: Aşama 1 - Mimari Dönüşüm SQL Scripti
-- Lütfen bu scripti Supabase SQL Editor üzerinden çalıştırınız.

-- 1. Fairs tablosunu Stand mantığına çevirme
ALTER TABLE fairs 
-- DROP COLUMN IF EXISTS event_date,
-- DROP COLUMN IF EXISTS start_time,
-- DROP COLUMN IF EXISTS end_time;

ALTER TABLE fairs 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- 2. Transactions tablosuna yeni alanlar ekleme
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Nakit',
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Genel';

-- 3. Mevcut JSONB items yapısındaki değişiklikler kod tarafında yönetilecektir.
-- (id ve category alanları eklenecek, UI bunu yönetecek).

-- 4. Assignments (Görevlendirmeler / Vardiyalar) tablosundaki mevcut yapının teyidi
-- Assignments tablosunda id, worker_id, fair_id, template_id, start_time, end_time, is_paid var.
-- Herhangi bir yapısal değişime gerek yok, kod tarafında shift mantığına göre kullanılacaktır.
