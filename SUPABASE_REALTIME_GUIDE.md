# ⚡ คู่มือการเปิดใช้งาน Real-time Chat (Supabase)

ผมได้ทำการวางโครงสร้างระบบแชทแบบ Real-time ให้เรียบร้อยแล้วครับ! เพื่อให้ระบบทำงานได้สมบูรณ์ บอสต้องทำขั้นตอนสุดท้ายดังนี้ครับ:

### 1. ใส่กุญแจ API ในหน้าบ้าน (Client Setup)
เปิดไฟล์โครงการฝั่ง Client และใส่ค่าจาก Supabase Dashboard ของบอสในไฟล์:
*   `client/src/environments/environment.ts`
*   `client/src/environments/environment.development.ts`

**ค่าที่ต้องใส่:**
```typescript
supabaseUrl: 'https://XXXXXXXX.supabase.co',
supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### 2. เปิดสวิตช์ Realtime บน Supabase Dashboard
ระบบจะไม่เด้งเองจนกว่าบอสจะไปเปิดอนุญาตในฐานข้อมูลครับ:
1.  ไปที่ **Supabase Dashboard** ของบอส
2.  เมนูซ้ายมือเลือก **Database** -> **Replication**
3.  ในส่วนของ **Source**, ให้มองหาตารางที่ชื่อว่า **`supabase_realtime`** (หรือกดปุ่ม `1 table` ในแถบ `public`)
4.  หาตาราง **`mission_messages`** แล้วกด **เปิด (Enable)** สวิตช์ให้เป็นสีเขียวครับ

### 🚀 สิ่งที่เปลี่ยนไปหลังจากนี้:
*   🔴 **ยกเลิกระบบ Polling:** ผมลบโค้ดเดิมที่สั่งให้หน้าจอไปถามเซิร์ฟเวอร์ทุกๆ 5 วินาทีทิ้งแล้ว ทำให้ลดภาระของเซิร์ฟเวอร์ไปมหาศาล
*   🟢 **Instant Delivery:** ทันทีที่มีคนกดส่งข้อความ ข้อความจะไปเด้งที่หน้าจอของลูกเรือทุกคนในภารกิจนั้นทันที (Real-time)
*   🟢 **Smart Sync:** ผมใส่ระบบเช็ค ID ซ้ำไว้ให้ด้วย เพื่อป้องกันข้อความเด้งซ้อนกันครับ

---
*จัดการความแรงโดย: Antigravity AI 🫡🦅✨*
