# � เจาะลึกโค้ดระบบ Join & Leave Mission (Detailed Code Guide)

เอกสารนี้แสดงโค้ดฉบับเต็มและอธิบายหน้าที่ของแต่ละส่วนในระบบการเข้าร่วมและออกจากภารกิจครับ

---

## 1. ฝั่ง Backend (Rust)

### 📂 ไฟล์: `server/src/application/use_cases/crew_operation.rs`
**หน้าที่:** จัดการ Business Logic ทั้งหมดก่อนจะบันทึกลงฐานข้อมูล

```rust
// ส่วนของ Logic การเข้าร่วม (Join)
pub async fn join(&self, mission_id: i32, brawler_id: i32) -> Result<()> {
    // 1. ดึงข้อมูลภารกิจมาดูก่อนว่ามีจริงไหม
    let mission = self.mission_viewing_repository.view_detail(mission_id).await?;

    // 2. นับจำนวนลูกเรือปัจจุบัน
    let crew_count = self.mission_viewing_repository.crew_counting(mission_id).await?;

    // 3. ตรวจสอบสถานะ: ต้องเป็น 'Open' เท่านั้นถึงจะเข้าได้
    if mission.status != MissionStatuses::Open.to_string() {
        return Err(anyhow::anyhow!("ภารกิจนี้ไม่เปิดรับลูกเรือแล้ว"));
    }

    // 4. ตรวจสอบจำนวนคน: ต้องไม่เกินค่า max_crew ที่ตั้งไว้
    if (crew_count as i32) >= mission.max_crew {
        return Err(anyhow::anyhow!("ภารกิจนี้เต็มแล้ว"));
    }

    // 5. บันทึกลงฐานข้อมูล (ตาราง crew_memberships)
    match self.crew_operation_repository.join(CrewMemberShips { mission_id, brawler_id }).await {
        Ok(_) => Ok(()),
        Err(e) => {
            // ถ้าเคย Join ไปแล้ว (Duplicate Key) ให้ถือว่าสำเร็จ (Success) เพื่อไม่ให้หน้าจอ Error
            if e.to_string().contains("duplicate key") { return Ok(()); }
            Err(e)
        }
    }
}

// ส่วนของ Logic การออก (Leave)
pub async fn leave(&self, mission_id: i32, brawler_id: i32) -> Result<()> {
    let mission = self.mission_viewing_repository.view_detail(mission_id).await?;

    // ตรวจสอบ: ถ้าภารกิจสำเร็จหรือล้มเหลวไปแล้ว จะกดออกจากทีมไม่ได้ (เพื่อเก็บประวัติ)
    if mission.status == MissionStatuses::Completed.to_string() || mission.status == MissionStatuses::Failed.to_string() {
        return Err(anyhow::anyhow!("ไม่สามารถออกจากภารกิจที่สิ้นสุดไปแล้วได้"));
    }

    // ลบทิ้งจากฐานข้อมูล
    self.crew_operation_repository.leave(CrewMemberShips { mission_id, brawler_id }).await
}
```

---

## 2. ฝั่ง API Router

### 📂 ไฟล์: `server/src/infrastructure/http/routers/crew_operation.rs`
**หน้าที่:** เปิดประตู (Endpoint) ให้หน้าบ้านเรียกใช้ และตรวจสอบสิทธิ์ของผู้ใช้ (Auth)

```rust
pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    // ... การตั้งค่า Repository และ UseCase ...

    Router::new()
        // POST: สำหรับส่งข้อมูลเข้า (Join)
        .route("/join/{mission_id}", post(join))
        // DELETE: สำหรับลบข้อมูลออก (Leave)
        .route("/leave/{mission_id}", delete(leave))
        // บังคับว่าต้อง Login ก่อนเท่านั้น (Authorization Middleware)
        .route_layer(axum::middleware::from_fn(auth::authorization))
        .with_state(Arc::new(use_case))
}
```

---

## 3. ฝั่ง Frontend (Service)

### 📂 ไฟล์: `client/src/app/_services/mission-service.ts`
**หน้าที่:** เป็นตัวกลางส่ง Request จากหน้า GUI ไปยัง Server API

```typescript
// ฟังก์ชัน Join: ส่ง POST request ไปที่ /api/crew/join/ID
async join(missionId: number): Promise<void> {
  const url = `${this._baseUrl}/crew/join/${missionId}`;
  await firstValueFrom(this._http.post(url, {}, { responseType: 'text' }));
}

// ฟังก์ชัน Leave: ส่ง DELETE request ไปที่ /api/crew/leave/ID
async leave(missionId: number): Promise<void> {
  const url = `${this._baseUrl}/crew/leave/${missionId}`;
  await firstValueFrom(this._http.delete(url, { responseType: 'text' }));
}
```

---

## 4. ฝั่ง UI Logic (Component)

### 📂 ไฟล์: `client/src/app/missions/missions.ts`
**หน้าที่:** รับคำสั่งจากปุ่มที่บอสกดยก และจัดการการรอ (Loading/Refresh)

```typescript
// เมื่อบอสกดปุ่ม Join
async onJoin(mission: Mission) {
  try {
    await this._missionService.join(mission.id);
    // หลังจากสำเร็จ ให้โหลดข้อมูลใหม่ (Refresh) เพื่ออัปเดตเลขจำนวนลูกเรือบนหน้าจอ
    await this.onSubmit(); 
  } catch (error) {
    alert("เข้าร่วมภารกิจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
}

// เมื่อบอสกดปุ่ม Leave
async onLeave(mission: Mission) {
  // 1. เปิด Dialog ยืนยันเพื่อกันมือลั่น
  const dialogRef = this._dialog.open(ConfirmDialog, { ... });

  if (await firstValueFrom(dialogRef.afterClosed())) {
    try {
      await this._missionService.leave(mission.id);
      // โหลดข้อมูลใหม่เพื่อลบชื่อเราออกจากทีมในหน้าจอ
      await this.onSubmit();
    } catch (error) {
      alert("ออกจากภารกิจไม่สำเร็จ");
    }
  }
}
```

---

### � สรุปการทำงาน (Flow)
1. **User** กดปุ่มบนหน้าจอ -> `missions.ts`
2. **Component** เรียกฟังก์ชันใน -> `mission-service.ts`
3. **Service** ยิง API ไปที่ -> `crew_operation.rs` (Router)
4. **Router** ตรวจสอบสิทธิ์ (Token) แล้วส่งต่อให้ -> `crew_operation.rs` (UseCase)
5. **UseCase** ตรวจเช็คเงื่อนไข (เช่น คนเต็มไหม?) แล้วสั่ง -> **Database** แก้ไขข้อมูล
6. เมื่อทุกอย่างเรียบร้อย ระบบจะส่งสัญญาณกลับมาให้ **หน้าบ้าน** ทำการ Refresh ข้อมูลใหม่ครับ

---
*จัดทำโดย: Antigravity AI 🫡🦅✨*
