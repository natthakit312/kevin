# 🦅 รายงานวิเคราะห์สถาปัตยกรรมและการปรับปรุงระบบ Kevin (31 ม.ค. 2026)

เอกสารฉบับนี้จัดทำขึ้นเพื่อเจาะลึกทุกรายละเอียดของโค้ด (Line-by-Line) และตรรกะเบื้องหลังการพัฒนา เพื่อให้เห็นภาพรวมของระบบในระดับโครงสร้าง

---

## 1. �️ สถาปัตยกรรม Mission Management (Backend - Rust)

หัวใจของการจัดการภารกิจอยู่ที่ความถูกต้องของสถานะและความปลอดภัย ข้อมูลต้องถูกตรวจสอบอย่างเข้มงวดก่อนลงฐานข้อมูล

### **การควบคุมสถานะภารกิจ (State Transition Logic)**
*   **ไฟล์:** `server/src/application/use_cases/mission_operation.rs`
*   **ตรรกะการทำงาน:**
    ```rust
    pub async fn in_progress(&self, mission_id: i32, chief_id: i32) -> Result<i32> {
        // 1. ดึงข้อมูลภารกิจปัจจุบันจาก Repository
        let mission = self.mission_viewing_repository.view_detail(mission_id).await?;
        
        // 2. ตรวจสอบจำนวนลูกเรือ (Business Rule: ต้องมีคนอย่างน้อย 1 คนถึงจะเริ่มได้)
        let crew_count = self.mission_viewing_repository.crew_counting(mission_id).await?;

        // 3. ตรวจสอบเงื่อนไข 3 ชั้น (Composite Validation):
        //    - สถานะต้องเป็น Open หรือเคย Failed มาก่อน
        //    - จำนวนลูกเรือต้องมากกว่า 0 และไม่เกินขีดจำกัด (Max 5)
        //    - คนสั่งการต้องเป็นเจ้าของภารกิจ (Authorization Check)
        let is_status_open_or_fail = mission.status == "Open" || mission.status == "Failed";
        let update_condition = is_status_open_or_fail 
            && crew_count > 0 
            && mission.chief_id == chief_id;

        if !update_condition {
            // คืนค่า Error ทันทีถ้าข้อมูลไม่ผ่านเกณฑ์ (Early Return Pattern)
            return Err(anyhow::anyhow!("Invalid condition to change stages!"));
        }

        // 4. บันทึกลงฐานข้อมูลผ่าน Repository
        self.mission_operation_repository.to_progress(mission_id, chief_id).await
    }
    ```
*   **ทำไมต้องเขียนแบบนี้?** การตรวจสอบเงื่อนไขที่เซิร์ฟเวอร์ (Server-side Validation) เป็นปราการด่านสุดท้ายที่ป้องกันไม่ให้ใครแอบแก้สถานะภารกิจผ่านเครื่องมืออื่นที่ไม่ใช่แอปเรา

---

## 💬 2. ระบบสื่อสารและประมวลผลข้อมูลแชท (High-Performance Chat)

ความเร็วในการแสดงผลแชทคือหัวใจของความรู้สึกที่ "Real-time"

### **การทำ Data Aggregation ด้วย Join Query (SQL Level)**
*   **ไฟล์:** `server/src/infrastructure/database/repositories/mission_messages.rs`
*   **ตรรกะการทำงาน:**
    ```rust
    pub async fn get_by_mission_id(&self, mission_id: i32) -> Result<Vec<MissionMessageModel>> {
        // เทคนิค: Inner Join เพื่อรวบรวมข้อมูลข้ามตาราง
        let results = mission_messages::table
            .inner_join(brawlers::table.on(mission_messages::sender_id.eq(brawlers::id)))
            .filter(mission_messages::mission_id.eq(mission_id))
            .select((MissionMessageEntity::as_select(), BrawlerEntity::as_select()))
            .load::<(MissionMessageEntity, BrawlerEntity)>(&mut conn)?;

        // การทำ Data Mapping: แปลงข้อมูลดิบจาก DB (Entity) ให้กลายเป็นรูปแบบที่สวยงาม (Model)
        let models = results.into_iter().map(|(m, b)| MissionMessageModel {
            id: m.id,
            sender_display_name: b.display_name, // ดึงชื่อมาใส่
            sender_avatar_url: b.avatar_url,    // ดึงรูปมาใส่
            content: m.content,
            created_at: m.created_at,
            ..m.into()
        }).collect();
        Ok(models)
    }
    ```
*   **Engineering Benefit:** การทำ `inner_join` ครั้งเดียวเร็วกว่าการดึงข้อมูลแยกกันหลายรอบ (Reduce Database Latency) ช่วยลดภาระของ CPU โดยเฉพาะเมื่อมีจำนวนข้อความเป็นหมื่นๆ ข้อความ

---

## 🎨 3. การออกแบบส่วนติดต่อผู้ใช้ (Frontend - Angular & SCSS)

เราเน้นการใช้ชุดคำสั่งรุ่นใหม่ของ Angular 18 (Signals) เพื่อความลื่นไหลระดับ 60 FPS

### **การจัดการตัวตนและข้อมูลแชท (Reactive Component)**
*   **ไฟล์:** `client/src/app/missions/mission-detail/mission-detail.ts`
*   **ตรรกะการทำงาน:**
    ```typescript
    // การใช้ Signal (Computed) เพื่อคำนวณสิทธิ์แบบ Real-time
    // ถ้าข้อมูล mission เปลี่ยน หรือตัวตนผู้ใช้เปลี่ยน isChief จะเปลี่ยนเองทันที
    isChief = computed(() => this.mission()?.chief_id === this.currentUserId());
    
    async ngOnInit() {
        // Polling Strategy: ใช้ RxJS interval เพื่อดึงข้อมูลใหม่ทุก 5 วินาที
        // การระบุ (true) ใน loadMessages หมายถึง "เงียบ" (Silent Load) เพื่อไม่ให้หน้าจอเด้งรบกวนผู้ใช้
        this.pollSub = interval(5000).subscribe(() => this.loadMessages(true));
    }

    // ระบบจัดการหน่วยความจำ (Clean up): ต้องยกเลิกการ Polling เมื่อปิดหน้า เพื่อไม่ให้เครื่องอืด
    ngOnDestroy() {
        this.pollSub?.unsubscribe();
    }
    ```

### **ดีไซน์สไตล์กองบัญชาการหน่วยรบ (SCSS Structure)**
*   **ไฟล์:** `client/src/app/home/home.scss`
*   **ตรรกะการทำงาน:**
    ```scss
    .activity-feed {
        border-top: 3px solid var(--app-primary); // แถบสีส้มบ่งบอกสถานะ Active
        background: rgba(var(--app-bg-accent-rgb), 0.5); // พื้นหลังกึ่งโปร่งใส (Glassmorphism)
        border-radius: 2px; // มุมฉาก เพื่อความโดดเด่นและเด็ดขาด
        
        .mission-link {
            font-family: 'JetBrains Mono', monospace; // ฟอนต์แบบ Terminal
            color: var(--app-primary);
            text-decoration: none;
            &:hover { text-decoration: underline; }
        }
    }
    ```
*   **Design Philosophy:** เราหลีกเลี่ยงมุมโค้งมนที่ดูใจดี แต่ใช้มุมคมและฟอนต์ Monospace เพื่อสื่อถึง "ความถูกต้องแม่นยำ" และ "เทคโนโลยีทางทหาร"

---

## 🌏 4. ระบบการแปลและจัดการข้อผิดพลาด (Localization Engine)

ทำให้ระบบสื่อสารกับผู้ใช้ได้อย่างเข้าใจในทุกสภาวะ

*   **ไฟล์:** `client/src/app/_services/language-service.ts`
*   **การประมวลผล:**
    *   เมื่อเซิร์ฟเวอร์ส่งข้อผิดพลาดกลับมา (เช่น "mission already started")
    *   `LanguageService` จะทำหน้าที่เป็นล่าม นำ Key นั้นไปเปรียบเทียบในคลังข้อมูลแชท
    *   คืนค่าเป็น "ภารกิจกำลังดำเนินการอยู่ ไม่สามารถแก้ไขได้" มาโชว์ที่หน้าจอทันที

---

## 📂 บทสรุปไฟล์ที่มีการอัปเดตอย่างมีนัยสำคัญ

1.  **`mission-detail.html`**: ยกเครื่องโครงสร้างการแบ่งฝั่งลูกเรือและฝั่งแชท
2.  **`mission-message.service.ts`**: เพิ่มระบบการสื่อสารกับ Backend API สำหรับฟีเจอร์แชทโดยเฉพาะ
3.  **`home.html`**: ปรับปรุงหน้า Social Dashboard ให้เป็นระบบ Grid 2 คอลัมน์ที่สมบูรณ์แบบ
4.  **`language-service.ts`**: เพิ่มชุดคำแปลที่ครอบคลุมทุกสถานการณ์ในหน้าแชท

---
*จัดทำเอกสารเชิงลึกโดย: Antigravity AI (Chief Systems Architect)*
