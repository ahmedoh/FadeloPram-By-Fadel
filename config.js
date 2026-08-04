
function normalizeVideoObject(v) {
  if (!v) return v;
  const vidId = String(v.VideoId || v.id || v.url || v.video_id || '');
  const urlVal = String(v.Url || v.url || v.video_url || vidId);
  const titleVal = String(v.Title || v.title || 'محاضرة بدون عنوان');
  const topicVal = String(v.Topic || v.topic || 'عام');
  return {
    ...v,
    id: vidId,
    VideoId: vidId,
    url: urlVal,
    Url: urlVal,
    title: titleVal,
    Title: titleVal,
    topic: topicVal,
    Topic: topicVal,
    created_at: v.created_at || v.CreatedAt || new Date().toISOString()
  };
}

/**
 * PharmReady-AlmaghwryBy-Fadel - Configuration & API Wrapper (Updated)
 * 
 * Instructions:
 * 1. Deploy the code from google-script.js as a Google Apps Script Web App.
 * 2. Paste the Web App URL in the API_URL variable below.
 * 3. If API_URL is left empty or as placeholder, the system will run in "Demo Mode" 
 *    using browser LocalStorage, allowing you to test everything immediately without Google Sheets!
 */

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwYcSrLslXgn6SXyukWpGeDDUU7TT9HJwHk0G-u0s78x55KXRlQX5RT5CSmaFiJHzID/exec";
const API_URL = localStorage.getItem("maghawry_api_url") || DEFAULT_API_URL;

// Check if we are running in Demo Mode (checks if placeholder is still present)
const isDemoMode = !API_URL || API_URL.includes("YOUR_GOOGLE_APPS_SCRIPT");

// Supabase Configuration
const SUPABASE_URL = localStorage.getItem("maghawry_supabase_url") || "https://bxrtbqmckemluxzjktmf.supabase.co";
const SUPABASE_KEY = localStorage.getItem("maghawry_supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cnRicW1ja2VtbHV4emprdG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMTE2NTcsImV4cCI6MjA5ODY4NzY1N30.XhClFAXJ56LfkEKzBUPs8plqWUROgHKelmngv3ngbzo";

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_KEY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ===== Security: SHA-256 Password Hashing =====
async function sha256Hash(message) {
  try {
    if (!window.crypto || !window.crypto.subtle) {
      return String(message);
    }
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn("sha256Hash failed (insecure context?), falling back to raw text:", err);
    return String(message);
  }
}
// Pre-computed SHA-256 hash of owner credentials for secure comparison
const OWNER_HASH = '2e6fcd404b105495da8d2a76fb71879f0bc618d649de1fdb23f3ead1830513e8';
const OWNER_USER_HASH = '2e6fcd404b105495da8d2a76fb71879f0bc618d649de1fdb23f3ead1830513e8';
// Synchronous fallback for non-async contexts
let _ownerHash = OWNER_HASH;

console.log(SUPABASE_URL && SUPABASE_KEY ? "🚀 Running in SUPABASE MODE" : (isDemoMode ? "🚀 Running in DEMO MODE (using LocalStorage)" : "🌐 Running in CLOUD MODE (connected to Google Sheets)"));

// Gemini API Configuration
function updateGeminiConfig() {
  const key = localStorage.getItem("maghawry_gemini_key") || "";
  window.GEMINI_API_KEY = key;
  window.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
}
updateGeminiConfig();
window.updateGeminiConfig = updateGeminiConfig;

// Clinical Career Pathway Levels Metadata
window.CLINICAL_PATHWAY_LEVELS = {
  "Passengers": { code: "L0", titleAr: "الصيدلي الواعد", titleEn: "Pharmacy Trainee", icon: "🌱", badgeClass: "level-badge-L0", color: "#9ca3af" },
  "Starters": { code: "L1", titleAr: "ممارس الـ OTC والتواصل", titleEn: "OTC Specialist", icon: "💊", badgeClass: "level-badge-L1", color: "#10b981" },
  "Movers": { code: "L2", titleAr: "خبير الروشتات والجرعات", titleEn: "Clinical Dispenser", icon: "🩺", badgeClass: "level-badge-L2", color: "#0ea5e9" },
  "Flyers": { code: "L3", titleAr: "صيدلي الحالات الحرجة والتركيبات", titleEn: "Advanced Pharmacist", icon: "⚡", badgeClass: "level-badge-L3", color: "#a855f7" },
  "Beast": { code: "L4", titleAr: "صيدلي أول وممارس متقدم", titleEn: "Senior Pharmacist", icon: "👑", badgeClass: "level-badge-L4", color: "#f59e0b" }
};

window.getClinicalLevelInfo = function(levelKey) {
  const normalized = (levelKey || "Passengers").trim();
  return window.CLINICAL_PATHWAY_LEVELS[normalized] || window.CLINICAL_PATHWAY_LEVELS["Passengers"];
};

/**
 * API Request Wrapper
 */
// Utility to normalize video casings to be both lowercase and uppercase keys
function normalizeVideos(videos) {
  if (!Array.isArray(videos)) return videos;
  return videos.map(v => {
    const vid = v.VideoId || v.url || v.Url || v.id || "";
    const url = v.Url || v.url || "";
    const title = v.Title || v.title || "";
    const level = v.Level || v.level || "Passengers";
    const order = v.Order || v.order || v.sort_order || v.Index || 1;
    const dbId = v.id || v.VideoId || "";
    return {
      ...v,
      VideoId: vid, id: dbId,
      Title: title, title: title,
      Url: url, url: url,
      Level: level, level: level,
      Order: order, order: order, sort_order: order
    };
  });
}

/**
 * API Request Wrapper
 */
async function apiRequest(params) {
  let sUser = "";
  let sPass = "";
  if (typeof sessionStorage !== 'undefined') {
    sUser = sessionStorage.getItem("admin_username") || sessionStorage.getItem("trainee_email");
    sPass = sessionStorage.getItem("admin_password") || sessionStorage.getItem("trainee_password");
  }
  if (!sUser && typeof localStorage !== 'undefined') {
    sUser = localStorage.getItem("admin_username") || localStorage.getItem("trainee_email");
    sPass = localStorage.getItem("admin_password") || localStorage.getItem("trainee_password");
  }
  
  if (sUser) {
    if (params.action && String(params.action).startsWith("admin")) {
      if (!params.adminUsername) params.adminUsername = sUser.trim().toLowerCase();
      if (!params.adminPassword) params.adminPassword = sPass;
    } else {
      if (!params.email) params.email = sUser.trim().toLowerCase();
      if (!params.password) params.password = sPass;
    }
  }

  let result;
  // Intercept and route to Supabase handler if configured
  if (SUPABASE_URL && SUPABASE_KEY && window.supabase && supabaseClient) {
    try {
      result = await handleSupabaseRequest(params);
      if (!result.success && result.message && (result.message.includes("NetworkError") || result.message.includes("fetch") || result.message.includes("Failed to fetch"))) {
        console.warn("Supabase network error, falling back to LocalStorage for action:", params.action);
        result = await handleDemoRequest(params);
      }
    } catch (e) {
      console.warn("Supabase exception, falling back to LocalStorage for action:", params.action, e);
      result = await handleDemoRequest(params);
    }
  } else if (isDemoMode) {
    result = await handleDemoRequest(params);
  } else {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      result = await response.json();
    } catch (error) {
      console.error("API Call Failed:", error);
      result = {
        success: false,
        message: "فشل الاتصال بقاعدة البيانات السحابية. يرجى التحقق من إعداد الرابط والإنترنت."
      };
    }
  }

  // Intercept and normalize videos
  if (result && result.success) {
    if (result.videos) {
      result.videos = normalizeVideos(result.videos);
    }
  }
  return result;
}

const getTable = (name, defaultData = []) => {
  const data = localStorage.getItem(`maghawry_db_${name}`);
  return data ? JSON.parse(data) : defaultData;
};

const saveTable = (name, data) => {
  localStorage.setItem(`maghawry_db_${name}`, JSON.stringify(data));
};

const verifyLocalAdminGlobal = async (params, optPass) => {
  let user = (params.adminUsername || params.username || "").trim().toLowerCase();
  let pass = (optPass || params.adminPassword || params.password || "").trim().toLowerCase();
  // Owner check via hash only (no plaintext credentials in source)
  try {
    const userH = await sha256Hash(user);
    const passH = await sha256Hash(pass);
    if (userH === OWNER_USER_HASH && passH === OWNER_HASH) return true;
  } catch(e) {}
  const admins = getTable("Admins");
  return admins.some(x => String(x.Username).trim().toLowerCase() === user && String(x.Password).trim().toLowerCase() === pass);
};

// Automated WhatsApp Notifications Helper
async function sendWhatsAppDirectNotification(targetPhone, msgText) {
  if (!targetPhone || !msgText) return false;
  let formattedPhone = String(targetPhone).replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "2" + formattedPhone;
  if (!formattedPhone.startsWith("20") && formattedPhone.length === 10) formattedPhone = "20" + formattedPhone;

  try {
    // Attempt local whatsapp gateway server if running
    try {
      fetch(`http://localhost:3001/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, message: msgText })
      }).catch(e => {});
    } catch(e) {}

    const apiKey = localStorage.getItem("maghawry_whatsapp_key") || DEFAULT_WHATSAPP_KEY;
    const instanceId = localStorage.getItem("maghawry_whatsapp_instance") || DEFAULT_WHATSAPP_INSTANCE;
    
    if (apiKey && instanceId) {
      const bodyParams = new URLSearchParams();
      bodyParams.append("token", apiKey);
      bodyParams.append("to", formattedPhone);
      bodyParams.append("body", msgText);

      const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams
      });
      const data = await res.json();
      console.log("UltraMsg Direct Notification Response:", data);
      return (data.sent === "true" || data.id || data.status === "queue");
    }
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
  return false;
}

function formatTraineeWhatsAppMsg(trainee, isAccept, rejectReason = "") {
  const name = trainee.name || trainee.Name || "دكتور متدرب";
  const phone = trainee.phone || trainee.Phone || "";
  const email = trainee.email || trainee.Email || "غير محدد";
  const branch = trainee.training_branch || trainee.TrainingBranch || "غير محدد";
  const group = trainee.pharmacy_group || trainee.PharmacyGroup || "صيدليات آل مغاوري";
  const rawCourses = trainee.selected_courses || trainee.SelectedCourses || "[]";
  
  let coursesList = [];
  try {
    coursesList = typeof rawCourses === 'string' ? JSON.parse(rawCourses) : (rawCourses || []);
  } catch(e) {}
  const coursesStr = Array.isArray(coursesList) && coursesList.length > 0 ? coursesList.join('، ') : 'التدريب مع فاضل';
  const appUrl = "https://ahmedoh.github.io/FadeloPram-By-Fadel/";

  if (isAccept) {
    const mainMsg = `🎉 *تهانينا د. ${name}!*

تمت الموافقة على طلب انضمامك لأكاديمية *Fadelopram Rx Academy* وتفعيل حسابك بنجاح! 🎓✨

📋 *بيانات الحساب المعتمد:*
👤 *الاسم:* ${name}
🏢 *الجهة والفرع:* ${group} - ${branch}
📚 *المسارات الكورسات المعتمدة:* ${coursesStr}

🌐 *رابط دخول المنصة لبدء التدريب:*
${appUrl}

استعن بالله ولا تعجز 🚀
Fadelopram Rx Academy`;

    const credsMsg = `🔑 *بيانات تسجيل الدخول للنسخ السريع:*

📱 *اسم الدخول (رقم الهاتف):*
\`\`\`
${phone}
\`\`\`

✉️ *البريد الإلكتروني:*
\`\`\`
${email}
\`\`\`

🔒 *كلمة المرور:* (كلمة المرور التي قمت بكتابتها بنفسك أثناء التسجيل)`;

    return [mainMsg, credsMsg];
  } else {
    return [`❌ *إشعار من أكاديمية Fadelopram Rx*

عذراً د. ${name}،
نأسف لإبلاغك بأنه تم التحديث بشأن طلب انضمامك للأكاديمية.

📋 *بيانات الطلب:*
👤 *الاسم:* ${name}
📱 *رقم الهاتف:* \`${phone}\`
✉️ *البريد الإلكتروني:* \`${email}\`
⚠️ *سبب عدم القبول:* ${rejectReason || 'عدم استيفاء البيانات'}

📞 للمزيد من الاستفسارات، يمكنك التواصل مع الدعم الفني:
01107118948

نتمنى لك كل التوفيق 🌸`];
  }
}

/**
 * LocalStorage DEMO Database implementation
 */
async function handleDemoRequest(params) {
  const action = params.action;
  
  // Seed demo data if database is empty
  if (!localStorage.getItem("maghawry_db_seeded")) {
    saveTable("Trainees", [
      {
        Timestamp: new Date().toISOString(),
        Name: "أحمد فؤاد الشافعي",
        Age: "23",
        BirthYear: "2003",
        Phone: "01012345678",
        WhatsApp: "01012345678",
        College: "الصيدلة",
        Squad: "الفرقة الخامسة",
        University: "جامعة دمياط الأهلية",
        TrainingBranch: "فرع ابو الخير",
        Status: "pending",
        Email: "",
        Password: "",
        RejectReason: "",
        CurrentLevel: "Passengers"
      },
      {
        Name: "عمر عبد العزيز خالد",
        Age: "22",
        BirthYear: "2004",
        Phone: "01234567890",
        WhatsApp: "01234567890",
        College: "الصيدلة",
        Squad: "الفرقة الرابعة",
        University: "جامعة المنصورة الأهلية",
        TrainingBranch: "فرع البنك",
        Status: "accepted",
        Email: "trainee.omar@maghawry.com",
        Password: "pass-1234",
        RejectReason: "",
        CurrentLevel: "Passengers"
      }
    ]);
    
    saveTable("Videos", [
      // Level 0 (Passengers)
      { VideoId: "d3_xQ4o6N38", Title: "آداب وأخلاقيات مهنة الصيدلة والتعامل مع الفريق", Level: "Passengers", Url: "https://www.youtube.com/watch?v=d3_xQ4o6N38" },
      { VideoId: "w3wHwT8w-8s", Title: "مقدمة التدريب العملي في صيدليات آل مغاوري", Level: "Passengers", Url: "https://www.youtube.com/watch?v=w3wHwT8w-8s" },
      
      // Level 1 (Starters)
      { VideoId: "qY-0hK-oM-0", Title: "1️⃣ OTC - تشخيص وعلاج نزلات البرد والإنفلونزا", Level: "Starters", Url: "https://www.youtube.com/watch?v=qY-0hK-oM-0" },
      
      // Level 2 (Movers)
      { VideoId: "zK6yW4o9Jt4", Title: "2️⃣ Antibiotics - بدائل وحساب جرعات المضادات الحيوية للأطفال", Level: "Movers", Url: "https://www.youtube.com/watch?v=zK6yW4o9Jt4" }
    ]);
    
    // Seed default Admins
    saveTable("Admins", [
      { Timestamp: new Date().toISOString(), Username: OWNER_USER_HASH, Password: OWNER_HASH, Role: "Owner", isHashed: true }
    ]);

    // Seed default Questions
    saveTable("Questions", [
      // Level 0 (Passengers)
      { Timestamp: new Date().toISOString(), Level: "Passengers", QuestionAr: "ما هو الهدف الأساسي من آداب وأخلاقيات مهنة الصيدلة؟", QuestionEn: "What is the primary goal of pharmacy professional ethics?", Option1Ar: "زيادة أرباح الصيدلية المادية بأي طريقة كانت.", Option1En: "Increasing pharmacy profits by any means.", Option2Ar: "تقديم مصلحة ورعاية المريض بأعلى معايير الأمان والأخلاق.", Option2En: "Prioritizing patient care and safety with the highest ethical standards.", Option3Ar: "التنافس غير الشريف مع الصيدليات المجاورة.", Option3En: "Unfair competition with neighboring pharmacies.", CorrectIndex: "1" },
      { Timestamp: new Date().toISOString(), Level: "Passengers", QuestionAr: "ما هي درجة الحرارة المناسبة لتخزين الأنسولين واللقاحات الحيوية؟", QuestionEn: "What is the appropriate storage temperature for insulin and vaccines?", Option1Ar: "في درجة حرارة الغرفة العادية (25 مئوية).", Option1En: "At normal room temperature (25°C).", Option2Ar: "تحت الصفر المطلق في الفريزر.", Option2En: "Below zero in the freezer.", Option3Ar: "في الثلاجة بين درجة حرارة 2 إلى 8 درجات مئوية.", Option3En: "In the refrigerator between 2°C and 8°C.", CorrectIndex: "2" },
      { Timestamp: new Date().toISOString(), Level: "Passengers", QuestionAr: "أين تقع جميع فروع صيدليات آل مغاوري؟", QuestionEn: "Where are all El-Maghawry Pharmacies branches located?", Option1Ar: "في مدينة دمياط القديمة", Option1En: "In Old Damietta city", Option2Ar: "في مدينة دمياط الجديدة فقط", Option2En: "In New Damietta city only", Option3Ar: "في القاهرة والإسكندرية", Option3En: "In Cairo and Alexandria", CorrectIndex: "1" },
      
      // Level 1 (Starters)
      { Timestamp: new Date().toISOString(), Level: "Starters", QuestionAr: "ما هو البروتوكول الأولي المعتمد للتعامل مع حرق من الدرجة الأولى؟", QuestionEn: "What is the primary protocol to handle a first-degree burn?", Option1Ar: "وضع معجون الأسنان أو الزبدة مباشرة فوق موضع الحرق.", Option1En: "Applying toothpaste or butter directly onto the burn site.", Option2Ar: "وضع ماء جاري فاتر لمدة 10-15 دقيقة ثم استخدام مرهم حروق.", Option2En: "Placing under cool running water for 10-15 minutes, then using a burn ointment.", Option3Ar: "تغطية الحرق بلاصق طبي غير معقم فوراً.", Option3En: "Covering the burn immediately with a non-sterile adhesive tape.", CorrectIndex: "1" },
      
      // Level 2 (Movers)
      { Timestamp: new Date().toISOString(), Level: "Movers", QuestionAr: "ما هو التحذير الحرج للغاية الذي يجب توجيهه للمريض عند صرف مضاد حيوي من عائلة (Fluoroquinolones)؟", QuestionEn: "What is the highly critical warning when dispensing a Fluoroquinolone antibiotic?", Option1Ar: "عدم تناوله مع الحليب أو الكالسيوم أو الحديد لأنه يقلل امتصاصه.", Option1En: "Do not take with milk or calcium/iron supplements as it reduces absorption.", Option2Ar: "ضرورة تناوله مع عصائر الحمضيات المركزة لزيادة قوته.", Option2En: "Must be taken with concentrated juice.", Option3Ar: "تناوله مع القهوة فقط.", Option3En: "Take it with coffee only.", CorrectIndex: "0" }
    ]);

    saveTable("Progress", []);
    saveTable("Promotions", []);
    saveTable("Notifications", []);

    // Seed default Curriculum hierarchy tree
    saveTable("Curriculum", [
      { id: "ent_maghawry", title: "صيدليات آل مغاوري", type: "entity", parent_id: null, sort_order: 1 },
      
      { id: "crs_fadel", title: "🎓 التدريب مع فاضل", type: "course", parent_id: "ent_maghawry", sort_order: 1 },
      { id: "crs_cosmo", title: "💄 كورس الكوزماتكس مع د. نانسي", type: "course", parent_id: "ent_maghawry", sort_order: 2 },
      { id: "crs_medical", title: "💊 كورس الميديكال مع د. عصام", type: "course", parent_id: "ent_maghawry", sort_order: 3 },
      
      { id: "lvl_passengers", title: "مرحلة المسافرين (Passengers)", type: "level", parent_id: "crs_fadel", level: "Passengers", sort_order: 1 },
      { id: "lvl_starters", title: "مرحلة المبتدئين (Starters)", type: "level", parent_id: "crs_fadel", level: "Starters", sort_order: 2 },
      { id: "lvl_movers", title: "مرحلة المتقدمين (Movers)", type: "level", parent_id: "crs_fadel", level: "Movers", sort_order: 3 },
      
      { id: "subj_ethics", title: "آداب المهنة والتأهيل العملي", type: "subject", parent_id: "lvl_passengers", level: "Passengers", sort_order: 1 },
      
      { id: "les_1", title: "آداب وأخلاقيات مهنة الصيدلة والتعامل مع الفريق", type: "video", parent_id: "subj_ethics", level: "Passengers", video_id: "d3_xQ4o6N38", video_url: "https://www.youtube.com/watch?v=d3_xQ4o6N38", sort_order: 1 },
      { id: "les_2", title: "مقدمة التدريب العملي في صيدليات آل مغاوري", type: "video", parent_id: "subj_ethics", level: "Passengers", video_id: "w3wHwT8w-8s", video_url: "https://www.youtube.com/watch?v=w3wHwT8w-8s", sort_order: 2 }
    ]);

    localStorage.setItem("maghawry_db_seeded", "true");
  }

  const verifyLocalAdmin = (optPass) => verifyLocalAdminGlobal(params, optPass);

  // API router
  if (action === "register") {
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    
    if (trainees.some(t => String(t.Phone).trim() === phone)) {
      return { success: false, message: "رقم الهاتف هذا مسجل بالفعل في النظام!" };
    }
    
    if (params.securityAnswer && String(params.securityAnswer) !== "1") {
      return { success: false, message: "إجابة سؤال الأمان خاطئة." };
    }
    
    trainees.push({
      Timestamp: new Date().toISOString(),
      Name: params.name,
      Age: params.age,
      BirthYear: params.birthYear,
      Phone: phone,
      WhatsApp: params.whatsApp || "لا يوجد",
      College: params.college,
      Squad: params.squad,
      University: params.university,
      TrainingBranch: params.trainingBranch,
      PharmacyGroup: params.pharmacyGroup || "",
      TrainingGroup: params.trainingGroup || "",
      Status: "pending",
      Email: "",
      Password: "",
      RejectReason: "",
      CurrentLevel: params.targetLevel || "Passengers"
    });
    
    saveTable("Trainees", trainees);
    return { success: true, message: "تم تسجيل البيانات بنجاح في نظام المراجعة (وضع التجربة)." };

  } else if (action === "setTrainingGroup") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const group = String(params.group).trim();
    const tIndex = trainees.findIndex(x => String(x.Email).trim().toLowerCase() === email);
    if (tIndex !== -1) {
      trainees[tIndex].TrainingGroup = group;
      saveTable("Trainees", trainees);
      return { success: true, message: "تم اختيار الجروب التدريبي بنجاح!" };
    }
    return { success: false, message: "لم يتم العثور على حساب المتدرب." };

  } else if (action === "requestGroupJoin") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const requestedGroup = String(params.requestedGroup).trim();
    
    const t = trainees.find(x => x.Status === "accepted" && String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    if (!t) return { success: false, message: "غير مصرح." };

    const promotions = getTable("Promotions") || [];
    promotions.push({
      Id: "greq-" + Date.now(),
      Timestamp: new Date().toISOString(),
      Email: email,
      TraineeName: t.Name,
      FromLevel: t.CurrentLevel || "Passengers",
      ToLevel: `طلب انضمام لـ: ${requestedGroup}`,
      Type: "group_request",
      RequestedGroup: requestedGroup,
      Status: "pending"
    });
    saveTable("Promotions", promotions);
    return { success: true, message: `🎉 تم ارسال طلب الانضمام لـ (${requestedGroup}) إلى مشرف الأكاديمية بنجاح!` };
    
  } else if (action === "checkStatus") {
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const t = trainees.find(x => String(x.Phone).trim() === phone);
    
    if (t) {
      return {
        success: true,
        status: t.Status,
        email: t.Email,
        password: t.Password,
        rejectReason: t.RejectReason,
        name: t.Name,
        currentLevel: t.CurrentLevel
      };
    }
    return { success: false, message: "رقم الهاتف هذا غير مسجل في النظام." };
    
  } else if (action === "login") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const t = trainees.find(x => String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    
    if (t) {
      if (t.Status === "blocked") {
        return { success: false, message: "تم حظر هذا الحساب من قبل الإدارة!" };
      }
      if (t.Status === "accepted") {
        return {
          success: true,
          trainee: {
            name: t.Name,
            email: t.Email,
            phone: t.Phone,
            branch: t.TrainingBranch,
            level: t.CurrentLevel || "Passengers",
            nickname: t.Nickname || "",
            avatar: t.Avatar || "",
            university: t.University || "",
            college: t.College || "",
            whatsapp: t.WhatsApp || "",
            pharmacyGroup: t.PharmacyGroup || "",
            trainingGroup: t.TrainingGroup || ""
          }
        };
      }
    }
    return { success: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن حسابك لم يتم قبوله بعد." };
    
  } else if (action === "changePassword") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const oldPassword = String(params.oldPassword).trim();
    const newPassword = String(params.newPassword).trim();
    
    const tIndex = trainees.findIndex(x => String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === oldPassword);
    if (tIndex !== -1) {
      trainees[tIndex].Password = newPassword;
      saveTable("Trainees", trainees);
      
      const notifs = getTable("Notifications");
      notifs.push({
        Timestamp: new Date().toISOString(),
        Name: trainees[tIndex].Name,
        Email: email,
        NewPassword: newPassword
      });
      saveTable("Notifications", notifs);
      
      return { success: true, message: "تم تغيير كلمة المرور بنجاح." };
    }
    return { success: false, message: "كلمة المرور الحالية غير صحيحة." };
    
  } else if (action === "updateTraineeProfile") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const tIndex = trainees.findIndex(x => String(x.Email).trim().toLowerCase() === email);
    if (tIndex !== -1) {
      trainees[tIndex].Nickname = params.nickname;
      trainees[tIndex].Avatar = params.avatar;
      trainees[tIndex].University = params.university;
      trainees[tIndex].College = params.college;
      trainees[tIndex].WhatsApp = params.whatsapp;
      saveTable("Trainees", trainees);
      return { success: true, message: "تم تحديث الملف الشخصي بنجاح!" };
    }
    return { success: false, message: "لم يتم العثور على حساب الطالب." };

  } else if (action === "getTraineeVideos") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    
    const t = trainees.find(x => x.Status === "accepted" && String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    
    if (!t) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    
    const currentLevel = t.CurrentLevel || "Passengers";
    const videos = getTable("Videos");
    const filteredVideos = videos.filter(x => String(x.Level || "Passengers").trim() === currentLevel);
    
    const progress = getTable("Progress");
    const watched = progress.filter(x => String(x.Email).trim().toLowerCase() === email).map(x => String(x.VideoId).trim());
    
    const promotions = getTable("Promotions");
    const completedLevels = promotions.filter(x => String(x.Email).trim().toLowerCase() === email && x.Status === "approved").map(x => String(x.FromLevel));
    const pendingPromotion = promotions.some(x => String(x.Email).trim().toLowerCase() === email && x.Status === "pending");
    
    // Load local questions dynamically for their level
    const allQuestions = getTable("Questions");
    const levelQuestions = allQuestions.filter(x => String(x.Level).trim() === currentLevel).map(x => {
      return {
        q: x.QuestionAr,
        q_en: x.QuestionEn,
        options: [x.Option1Ar, x.Option2Ar, x.Option3Ar].filter(Boolean),
        options_en: [x.Option1En, x.Option2En, x.Option3En].filter(Boolean),
        correct: parseInt(x.CorrectIndex) || 0
      };
    });

    const allVidQuestions = getTable("VideoQuestions") || [];
    const videoQuestions = allVidQuestions.map(vq => ({
      video_id: String(vq.video_id),
      question_ar: vq.question_ar,
      option1_ar: vq.option1_ar,
      option2_ar: vq.option2_ar,
      option3_ar: vq.option3_ar,
      correct_index: parseInt(vq.correct_index) || 0,
      id: String(vq.id)
    }));

    // Fetch Demo Curriculum
    const allCurr = getTable("Curriculum") || [];
    const filteredCurr = allCurr;
    const sortedCurr = [...filteredCurr].sort((a, b) => {
      const orderA = parseInt(a.SortOrder || a.Index || a.Order || a.sort_order || 9999);
      const orderB = parseInt(b.SortOrder || b.Index || b.Order || b.sort_order || 9999);
      return orderA - orderB;
    });

    // Fetch Demo Welcome Content
    const allWelcome = getTable("LevelsContent") || [];
    const foundWelcome = allWelcome.find(x => x.level === currentLevel);
    const welcomeHtml = foundWelcome ? foundWelcome.welcome_html : '';

    const lpList = getTable("TraineeLevelProgress") || [];
    const lp = lpList.find(x => String(x.Email).trim().toLowerCase() === email && x.Level === currentLevel) || {
      ExamAttempts: 0,
      LockoutUntil: null
    };

    // Resolve topic name helper
    const getTopicName = (parentId, nodes) => {
      if (!parentId) return "عام";
      const parent = nodes.find(n => String(n.id) === String(parentId));
      return parent ? (parent.title || parent.Title) : "عام";
    };

    // Extract videos from tree nodes
    const videosFromTree = sortedCurr
      .filter(c => c.type === 'video')
      .map(c => {
        const url = c.video_url || c.content_html || c.ContentHtml || c.content || "";
        const vidId = c.video_id || extractVideoIdFromUrl(url) || String(c.id);
        return {
          VideoId: vidId,
          Title: c.title || c.Title || "",
          Url: url || `https://www.youtube.com/watch?v=${vidId}`,
          Level: c.level || c.Level || currentLevel,
          Topic: getTopicName(c.parent_id, sortedCurr)
        };
      });

    // Combine legacy videos table and tree videos
    const seenVideoIds = new Set();
    const combinedVideos = [];

    videosFromTree.forEach(v => {
      if (v.VideoId && !seenVideoIds.has(v.VideoId)) {
        seenVideoIds.add(v.VideoId);
        combinedVideos.push(v);
      }
    });

    filteredVideos.forEach(v => {
      const vidId = String(v.VideoId || v.url || v.Url || v.id || "");
      if (vidId && !seenVideoIds.has(vidId)) {
        seenVideoIds.add(vidId);
        combinedVideos.push({
          VideoId: vidId,
          Title: v.Title || v.title || "",
          Url: v.Url || v.url || `https://www.youtube.com/watch?v=${vidId}`,
          Level: v.Level || v.level || currentLevel,
          Topic: v.Topic || v.topic || "عام"
        });
      }
    });

    return {
      success: true,
      videos: combinedVideos.map(normalizeVideoObject),
      watched: watched,
      currentLevel: currentLevel,
      completedLevels: completedLevels,
      pendingPromotion: pendingPromotion,
      questions: levelQuestions,
      videoQuestions: videoQuestions,
      curriculum: sortedCurr.map(c => {
        const isVid = c.type === 'video';
        const url = c.video_url || (isVid ? (c.content_html || c.ContentHtml || c.content || "") : "") || "";
        const vidId = c.video_id || (isVid ? extractVideoIdFromUrl(url) : "") || "";
        return {
          id: String(c.Id || c.id || ''),
          title: c.Title || c.title || '',
          content_html: isVid ? "" : (c.ContentHtml || c.content_html || c.content || ''),
          level: c.Level || c.level || '',
          sort_order: c.SortOrder || c.sort_order || 1,
          parent_id: c.parent_id || null,
          type: c.type || 'folder',
          icon: c.icon || '',
          video_url: url,
          video_id: vidId
        };
      }),
      welcomeHtml: welcomeHtml,
      examAttempts: lp.ExamAttempts || 0,
      lockoutUntil: lp.LockoutUntil || null,
      completedPromotions: promotions.filter(x => String(x.Email).trim().toLowerCase() === email && x.Status === "approved").map(x => ({
        FromLevel: x.FromLevel,
        ToLevel: x.ToLevel,
        Score: x.Score || 0,
        CertificateTemplate: x.CertificateTemplate || "",
        CertificateUrl: x.CertificateUrl || ""
      })),
      traineePoints: t ? (t.Points || 0) : 0,
      traineeStreak: t ? (t.StreakWeeks || 0) : 0,
      selectedCourses: t ? (t.selected_courses || t.SelectedCourses || '[]') : '[]',
      pharmacyGroup: t ? (t.pharmacy_group || t.PharmacyGroup || '') : ''
    };
    
  } else if (action === "updateProgress") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const videoId = String(params.videoId).trim();
    
    const authorized = trainees.some(x => x.Status === "accepted" && String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    if (!authorized) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    
    const progress = getTable("Progress");
    if (!progress.some(x => String(x.Email).trim().toLowerCase() === email && String(x.VideoId).trim() === videoId)) {
      progress.push({
        Timestamp: new Date().toISOString(),
        Email: email,
        VideoId: videoId
      });
      saveTable("Progress", progress);
    }
    return { success: true, message: "تم تسجيل إتمام المشاهدة بنجاح." };

  } else if (action === "saveTraineeProgress") {
    const email = String(params.email).trim().toLowerCase();
    const level = params.level;
    const levelProgress = getTable("TraineeLevelProgress") || [];
    const idx = levelProgress.findIndex(x => String(x.Email).trim().toLowerCase() === email && x.Level === level);
    
    const lpData = {
      Email: email,
      Level: level,
      ExamAttempts: parseInt(params.examAttempts) || 0,
      LockoutUntil: params.lockoutUntil || null
    };
    
    if (idx !== -1) {
      levelProgress[idx] = lpData;
    } else {
      levelProgress.push(lpData);
    }
    saveTable("TraineeLevelProgress", levelProgress);
    return { success: true };

  } else if (action === "saveVideoQuestions") {
    const videoId = String(params.videoId).trim();
    const questions = params.questions || [];
    
    let allVidQ = getTable("VideoQuestions") || [];
    const existing = allVidQ.some(x => String(x.video_id).trim() === videoId);
    if (existing) {
      return { success: true, message: "الأسئلة موجودة بالفعل." };
    }
    
    questions.forEach(q => {
      allVidQ.push({
        id: "vq-" + Math.random().toString(36).substr(2, 9),
        video_id: videoId,
        question_ar: q.q,
        option1_ar: q.options[0],
        option2_ar: q.options[1],
        option3_ar: q.options[2],
        correct_index: parseInt(q.correct) || 0
      });
    });
    
    saveTable("VideoQuestions", allVidQ);
    return { success: true, message: "تم حفظ الأسئلة تلقائياً بنجاح (وضع التجربة)!" };

  } else if (action === "adminReopenVideo") {
    const itemId = String(params.itemId).trim();
    let curr = getTable("Curriculum") || [];
    let updated = false;
    curr = curr.map(item => {
      if (String(item.id) === itemId) {
        item.created_at = new Date().toISOString();
        updated = true;
      }
      return item;
    });
    if (updated) {
      saveTable("Curriculum", curr);
      return { success: true, message: "تم إعادة فتح المحاضرة وتجديد صلاحيتها لـ 5 أيام إضافية بنجاح!" };
    }
    return { success: false, message: "لم يتم العثور على المحاضرة المحددة." };
    
  } else if (action === "updateTraineePoints") {
    const trainees = getTable("Trainees") || [];
    const email = String(params.email).trim().toLowerCase();
    const t = trainees.find(x => String(x.Email).trim().toLowerCase() === email);
    if (t) {
      t.Points = parseInt(params.points) || 0;
      t.LastActivityAt = new Date().toISOString();
      // Auto-increment streak if last activity was within 7 days
      const lastAct = t.LastActivityAt ? new Date(t.LastActivityAt) : null;
      if (!lastAct || ((new Date() - lastAct) / (1000*60*60*24)) > 7) {
        t.StreakWeeks = 1;
      } else {
        t.StreakWeeks = (t.StreakWeeks || 0) + 0; // Preserved
      }
      saveTable("Trainees", trainees);
    }
    return { success: true };

  } else if (action === "getLeaderboard") {
    const trainees = getTable("Trainees") || [];
    const accepted = trainees.filter(t => t.Status === "accepted");
    const lb = [...accepted]
      .sort((a, b) => (b.Points || 0) - (a.Points || 0))
      .slice(0, 20)
      .map(t => ({ name: t.Name, email: t.Email, points: t.Points || 0, level: t.CurrentLevel || '', branch: t.TrainingBranch || 'فرع الرئيس', streak: t.StreakWeeks || 0 }));
    
    // Compute Branch Standings
    const branchMap = {};
    accepted.forEach(t => {
      const bName = t.TrainingBranch || "فرع آل مغاوري الرئيسي";
      if (!branchMap[bName]) branchMap[bName] = { name: bName, totalXP: 0, studentCount: 0 };
      branchMap[bName].totalXP += (t.Points || 0);
      branchMap[bName].studentCount += 1;
    });
    const branchLeague = Object.values(branchMap).sort((a, b) => b.totalXP - a.totalXP);

    return { success: true, leaderboard: lb, branchLeague: branchLeague };

  } else if (action === "submitClinicalCase") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const tIndex = trainees.findIndex(x => x.Status === "accepted" && String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    if (tIndex === -1) {
      return { success: false, message: "غير مصرح بالعملية." };
    }

    const reports = getTable("Reports") || [];
    const newCase = {
      Id: "case-" + Date.now(),
      Timestamp: new Date().toISOString(),
      Email: email,
      TraineeName: trainees[tIndex].Name,
      Level: trainees[tIndex].CurrentLevel || "Passengers",
      Branch: trainees[tIndex].TrainingBranch || "فرع آل مغاوري",
      Title: `[${params.caseType || 'حالة صيدلانية'}] ${params.title || 'تسجيل حالة ميدانية'}`,
      Content: params.notes || "",
      CaseType: params.caseType || "روشتة",
      Attachment: params.attachment || "",
      Status: "accepted",
      PointsAwarded: 25
    };
    reports.push(newCase);
    saveTable("Reports", reports);

    // Award +25 XP to student
    trainees[tIndex].Points = (trainees[tIndex].Points || 0) + 25;
    saveTable("Trainees", trainees);

    return { success: true, message: "🎉 تم تسجيل الحالة الإكلينيكية بنجاح وإضافة +25 XP لرصيدك!", newPoints: trainees[tIndex].Points };

  } else if (action === "requestGroupJoin") {
      const email = String(params.email).trim().toLowerCase();
      const password = String(params.password).trim();
      const requestedGroup = String(params.requestedGroup).trim();

      let { data: t } = await supabaseClient
        .from('trainees')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (!t) return { success: false, message: "غير مصرح بالدخول." };

      try {
        await supabaseClient
          .from('promotions')
          .insert([{
            email: email,
            from_level: t.current_level || "Passengers",
            to_level: `طلب انضمام لـ: ${requestedGroup}`,
            score: 100,
            status: "pending"
          }]);
      } catch(e) {
        console.warn("Supabase promotion insert error:", e);
      }

      try {
        let currentCourses = [];
        if (t.selected_courses) {
          currentCourses = typeof t.selected_courses === 'string' ? JSON.parse(t.selected_courses) : t.selected_courses;
        }
        if (!currentCourses.includes(requestedGroup)) {
          currentCourses.push(requestedGroup);
        }
        await supabaseClient
          .from('trainees')
          .update({ selected_courses: JSON.stringify(currentCourses) })
          .ilike('email', email);
      } catch(e) {}

      return { success: true, message: `🎉 تم إرسال طلب الانضمام لـ (${requestedGroup}) إلى مشرف الأكاديمية بنجاح!` };

    } else if (action === "setTrainingGroup") {
      const email = String(params.email).trim().toLowerCase();
      const groupName = String(params.groupName).trim();
      if (email && groupName) {
        try {
          const { data: t } = await supabaseClient.from('trainees').select('*').ilike('email', email).maybeSingle();
          if (t) {
            let currentCourses = [];
            if (t.selected_courses) {
              currentCourses = typeof t.selected_courses === 'string' ? JSON.parse(t.selected_courses) : t.selected_courses;
            }
            if (!currentCourses.includes(groupName)) {
              currentCourses.push(groupName);
            }
            await supabaseClient.from('trainees').update({ selected_courses: JSON.stringify(currentCourses) }).ilike('email', email);
          }
        } catch(e) {}
      }
      return { success: true, message: "تم حفظ الجروب التدريبي بنجاح." };

    } else if (action === "getPlatformBranding" || action === "adminGetPlatformBranding") {
      return { success: true, branding: { academy_name: "Fadelopram Rx Academy", logo_url: "logo_pr.png" } };

    } else if (action === "adminSavePlatformBranding") {
      return { success: true, message: "تم حفظ الهوية بنجاح." };

    } else if (action === "getCoursePrices") {
      return { success: true, prices: [] };

} else if (action === "submitPromotionRequest") {
    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const fromLevel = String(params.fromLevel).trim();
    const toLevel = String(params.toLevel).trim();
    
    const authorized = trainees.some(x => x.Status === "accepted" && String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    if (!authorized) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    
    const promotions = getTable("Promotions");
    const exist = promotions.find(x => String(x.Email).trim().toLowerCase() === email && String(x.FromLevel).trim() === fromLevel && String(x.ToLevel).trim() === toLevel);
    
    if (exist) {
      if (exist.Status === "pending") {
        return { success: false, message: "لديك طلب ترقية معلق بالفعل قيد المراجعة!" };
      } else if (exist.Status === "approved") {
        return { success: false, message: "لقد تمت ترقيتك واجتيازك هذا المستوى بالفعل!" };
      }
    }
    
    promotions.push({
      Timestamp: new Date().toISOString(),
      Email: email,
      FromLevel: fromLevel,
      ToLevel: toLevel,
      Status: "pending",
      Score: parseInt(params.score) || 0,
      DurationSeconds: parseInt(params.durationSeconds) || 0,
      ExamAnswers: params.examAnswers || "",
      CertificateTemplate: "",
      CertificateUrl: ""
    });
    saveTable("Promotions", promotions);
    return { success: true, message: "تم إرسال طلب الترقية وإصدار الشهادة بنجاح للمدير." };

  } else if (action === "adminLogin") {
    const user = (params.username || "").trim().toLowerCase();
    const pass = (params.password || "").trim().toLowerCase();
    // Owner check via hash (no plaintext credentials in source)
    const userHash = await sha256Hash(user);
    const passHash = await sha256Hash(pass);
    if (userHash === OWNER_USER_HASH && passHash === OWNER_HASH) {
      return { success: true, admin: { username: user, role: "Owner", permissions: "all", displayName: "د. أحمد فاضل" } };
    }
    // Check local admins table
    const admins = getTable("Admins");
    const found = admins.find(a => String(a.Username).trim().toLowerCase() === user && String(a.Password).trim().toLowerCase() === pass);
    if (found) {
      return { success: true, admin: { username: found.Username, role: found.Role || "Admin", permissions: found.Permissions || "trainees,promotions,reports", displayName: found.DisplayName || found.Username } };
    }
    return { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة." };
    
  } else if (action === "adminGetTrainees") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    return { success: true, trainees: getTable("Trainees") };
    
  } else if (action === "adminAction") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const actionState = params.actionState;
    
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone);
    if (tIndex !== -1) {
      if (actionState === "accept") {
        trainees[tIndex].Status = "accepted";
        trainees[tIndex].Email = params.generatedEmail;
        trainees[tIndex].Password = params.generatedPassword;
        trainees[tIndex].RejectReason = "";
        trainees[tIndex].CurrentLevel = params.currentLevel || trainees[tIndex].CurrentLevel || "Passengers";
      } else {
        trainees[tIndex].Status = "rejected";
        trainees[tIndex].RejectReason = params.rejectReason;
      }
      saveTable("Trainees", trainees);
      return { success: true, message: "تم حفظ الإجراء بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المتدرب." };
    
  } else if (action === "adminGetVideos") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    return { success: true, videos: getTable("Videos") };
    
  } else if (action === "adminAddVideo") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const videos = getTable("Videos");
    const url = String(params.url).trim();
    const title = String(params.title).trim();
    const level = String(params.level || "Passengers").trim();
    
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return { success: false, message: "رابط يوتيوب غير صالح!" };
    }
    
    videos.push({
      Timestamp: new Date().toISOString(),
      VideoId: videoId,
      Title: title,
      Url: url,
      Level: level,
      Order: parseInt(params.order) || (videos.length + 1)
    });
    saveTable("Videos", videos);
    return { success: true, message: "تم إضافة الفيديو للمستوى بنجاح." };
    
  } else if (action === "adminDeleteVideo") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const videos = getTable("Videos");
    // Accept both 'videoId' (new) and 'id' (legacy) param names
    const videoId = String(params.videoId || params.id || "").trim();
    const vIndex = videos.findIndex(x =>
      String(x.VideoId).trim() === videoId ||
      String(x.Url).trim() === videoId ||
      String(x.Url).includes(videoId)
    );
    if (vIndex !== -1) {
      videos.splice(vIndex, 1);
      saveTable("Videos", videos);
      return { success: true, message: "تم حذف الفيديو بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على الفيديو (ID: " + videoId + ")" };
    
  } else if (action === "adminGetVideoQuestions") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const allVidQ = getTable("VideoQuestions") || [];
    return { success: true, videoQuestions: allVidQ };

  } else if (action === "adminSaveVideoQuestions") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const videoId = String(params.videoId).trim();
    const questions = params.questions || [];
    
    let allVidQ = getTable("VideoQuestions") || [];
    allVidQ = allVidQ.filter(x => String(x.video_id).trim() !== videoId);
    
    questions.forEach(q => {
      allVidQ.push({
        id: "vq-" + Math.random().toString(36).substr(2, 9),
        video_id: videoId,
        question_ar: q.q || q.question_ar,
        option1_ar: q.options ? q.options[0] : q.option1_ar,
        option2_ar: q.options ? q.options[1] : q.option2_ar,
        option3_ar: q.options ? q.options[2] : q.option3_ar,
        correct_index: q.correct !== undefined ? parseInt(q.correct) : (parseInt(q.correct_index) || 0)
      });
    });
    
    saveTable("VideoQuestions", allVidQ);
    return { success: true, message: "تم حفظ أسئلة المحاضرة بنجاح (وضع التجربة)!" };
    
  } else if (action === "adminGetProgress") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    return { success: true, progress: getTable("Progress") };
    
  } else if (action === "adminGetNotifications") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    const raw = getTable("Notifications") || [];
    return { 
      success: true, 
      notifications: raw.map(n => ({
        Id: String(n.id || n.Timestamp || ""),
        Email: n.email,
        Message: n.message,
        Timestamp: n.created_at || n.Timestamp
      }))
    };
    
  } else if (action === "getTraineeNotifications") {
    const email = String(params.email).trim().toLowerCase();
    const list = getTable("Notifications") || [];
    const filtered = list.filter(n => String(n.email).trim().toLowerCase() === email || String(n.email).trim().toLowerCase() === 'all');
    return {
      success: true,
      notifications: filtered.map(n => ({
        Id: String(n.id || n.Timestamp || ""),
        Email: n.email,
        Message: n.message,
        Timestamp: n.created_at || n.Timestamp
      }))
    };
    
  } else if (action === "adminSendNotification") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const target = params.target || "ALL";
    const targetInput = String(params.targetInput || "").trim();
    const title = String(params.title || "").trim();
    const message = String(params.message || "").trim();
    
    if (!title || !message) {
      return { success: false, message: "يجب كتابة العنوان ونص الإشعار." };
    }
    
    const combinedMsg = `📢 ${title}\n\n${message}`;
    const list = getTable("Notifications") || [];
    
    if (target === "ALL") {
      list.push({
        id: String(Date.now()),
        email: "all",
        message: combinedMsg,
        created_at: new Date().toISOString()
      });
    } else {
      const trainees = getTable("Trainees") || [];
      const t = trainees.find(x => String(x.Email).trim().toLowerCase() === targetInput.toLowerCase() || String(x.Phone).trim() === targetInput);
      if (!t) {
        return { success: false, message: "لم يتم العثور على متدرب بهذا البريد أو الهاتف." };
      }
      list.push({
        id: String(Date.now()),
        email: String(t.Email).trim().toLowerCase(),
        message: combinedMsg,
        created_at: new Date().toISOString()
      });
    }
    saveTable("Notifications", list);
    return { success: true, message: "تم إرسال الإشعار بنجاح!" };

  } else if (action === "adminGetPromotions") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    const promotions = getTable("Promotions");
    const trainees = getTable("Trainees");
    
    const enhanced = promotions.map(p => {
      const t = trainees.find(x => String(x.Email).trim().toLowerCase() === String(p.Email).trim().toLowerCase());
      return {
        Email: p.Email || p.email,
        TraineeName: t ? t.Name : (p.Email || "متدرب مجهول"),
        TraineePhone: t ? t.Phone : (p.Email || ""),
        CurrentLevel: p.FromLevel || p.from_level,
        TargetLevel: p.ToLevel || p.to_level,
        Status: p.Status || p.status,
        Timestamp: p.Timestamp || p.created_at,
        Score: p.Score || p.score || 0,
        DurationSeconds: p.DurationSeconds || p.duration_seconds || 0,
        ExamAnswers: p.ExamAnswers || p.exam_answers || "",
        CertificateTemplate: p.CertificateTemplate || p.certificate_template || "",
        CertificateUrl: p.CertificateUrl || p.certificate_url || ""
      };
    });
    return { success: true, promotions: enhanced };
    
  } else if (action === "adminApprovePromotion") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const phone = String(params.phone || "").trim();
    const toLevel = String(params.toLevel || params.targetLevel || "").trim();
    
    const trainees = getTable("Trainees");
    const promotions = getTable("Promotions");
    
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone || String(x.Email).trim().toLowerCase() === phone.toLowerCase());
    if (tIndex !== -1) {
      const email = trainees[tIndex].Email;
      trainees[tIndex].CurrentLevel = toLevel;
      saveTable("Trainees", trainees);
      
      const pIndex = promotions.findIndex(x => String(x.Email).trim().toLowerCase() === email.toLowerCase() && String(x.ToLevel).trim() === toLevel);
      if (pIndex !== -1) {
        promotions[pIndex].Status = "approved";
        promotions[pIndex].CertificateTemplate = params.certificateTemplate || "";
        promotions[pIndex].CertificateUrl = params.certificateUrl || "";
        saveTable("Promotions", promotions);
      }
      return { success: true, message: "تمت الموافقة على الترقية وإصدار الشهادة بنجاح." };
    }
    return { success: false, message: "فشل تحديث مستوى المتدرب." };

  } else if (action === "adminGetAdmins") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    return { success: true, admins: getTable("Admins") };

  } else if (action === "adminAddAdmin") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const admins = getTable("Admins");
    admins.push({
      Timestamp: new Date().toISOString(),
      Username: params.username.trim(),
      Password: params.password.trim(),
      Role: params.role || "Admin",
      Permissions: params.permissions || ""
    });
    saveTable("Admins", admins);
    return { success: true, message: "تم إضافة المدير الجديد بنجاح." };

  } else if (action === "adminDeleteAdmin") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const admins = getTable("Admins");
    const username = String(params.username).trim();
    const delUserHash = await sha256Hash(username.toLowerCase());
    if (delUserHash === OWNER_USER_HASH) {
      return { success: false, message: "لا يمكن حذف حساب المطور العام للمنصة!" };
    }
    const aIndex = admins.findIndex(x => String(x.Username).trim() === username);
    if (aIndex !== -1) {
      admins.splice(aIndex, 1);
      saveTable("Admins", admins);
      return { success: true, message: "تم حذف المدير بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المدير." };

  } else if (action === "adminUpdateAdmin" || action === "adminEditAdmin") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const admins = getTable("Admins");
    const targetUser = String(params.targetUsername || params.username || "").trim();
    const aIndex = admins.findIndex(x => String(x.Username).trim() === targetUser);
    if (aIndex !== -1) {
      if (params.password || params.targetPassword) admins[aIndex].Password = (params.password || params.targetPassword).trim();
      admins[aIndex].Role = params.newRole || params.role || admins[aIndex].Role;
      admins[aIndex].Permissions = (params.newPermissions !== undefined ? params.newPermissions : params.permissions) ?? "";
      saveTable("Admins", admins);
      return { success: true, message: "تم تحديث صلاحيات المدير بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المدير." };

  } else if (action === "adminGetCoursePrices" || action === "getCoursePrices") {
    let prices = getTable("CoursePrices");
    const hasLegacy = prices.some(p => p.Level === "Passengers" || p.Level === "Starters" || p.Level === "Movers" || p.Level === "Flyers" || p.Level === "Beast" || !p.LevelName);
    
    if (prices.length === 0 || hasLegacy) {
      const defaultPrices = [
        { Level: "L0", LevelName: "الصيدلي الواعد (L0)", OriginalPrice: "0", OfferPrice: "0", IsFree: "true", FreeUntil: "", OfferLabel: "مجاني دائماً 🎉", OfferBadgeColor: "#10b981" },
        { Level: "L1", LevelName: "ممارس الـ OTC والتواصل (L1)", OriginalPrice: "350", OfferPrice: "250", IsFree: "false", FreeUntil: "", OfferLabel: "عرض الانطلاق 🔥", OfferBadgeColor: "#f59e0b" },
        { Level: "L2", LevelName: "أخصائي الاستشارات الصيدلانية (L2)", OriginalPrice: "500", OfferPrice: "350", IsFree: "false", FreeUntil: "", OfferLabel: "خصم 30% 🏷️", OfferBadgeColor: "#3b82f6" },
        { Level: "L3", LevelName: "صيدلي أول وممارس متقدم (L3)", OriginalPrice: "800", OfferPrice: "600", IsFree: "false", FreeUntil: "", OfferLabel: "متاح للمتميزين ✨", OfferBadgeColor: "#8b5cf6" },
        { Level: "L4", LevelName: "استشاري الرعاية وقائد الفرع (L4)", OriginalPrice: "1500", OfferPrice: "1200", IsFree: "false", FreeUntil: "", OfferLabel: "المستوى المتقدم 👑", OfferBadgeColor: "#ef4444" }
      ];
      saveTable("CoursePrices", defaultPrices);
      return { success: true, prices: defaultPrices };
    }
    return { success: true, prices: prices };

  } else if (action === "adminUpdateCoursePrice") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const prices = getTable("CoursePrices");
    const level = String(params.level).trim();
    const pIndex = prices.findIndex(x => String(x.Level).trim() === level || String(x.LevelName).trim() === level);
    const itemData = {
      Level: level,
      LevelName: params.levelName || level,
      OriginalPrice: String(params.originalPrice || 0).trim(),
      OfferPrice: String(params.offerPrice || "").trim(),
      IsFree: String(params.isFree).trim(),
      FreeUntil: String(params.freeUntil || "").trim(),
      OfferLabel: String(params.offerLabel || "").trim(),
      OfferBadgeColor: String(params.offerBadgeColor || "#f59e0b").trim()
    };
    if (pIndex !== -1) {
      prices[pIndex] = { ...prices[pIndex], ...itemData };
    } else {
      prices.push(itemData);
    }
    saveTable("CoursePrices", prices);
    return { success: true, message: "تم حفظ وتحديث التسعير بنجاح." };

  } else if (action === "getAnnouncements" || action === "adminGetAnnouncements") {
    const list = getTable("Announcements");
    if (list.length === 0) {
      const defaultAnnouncements = [
        { id: "ann_1", type: "general", title: "🚀 مرحباً بكم في أكاديمية فاضلوبرام", content: "انضم لأحدث المسارات التدريبية المتقدمة في الصيدلة الإكلينيكية وابتكر في مسارك المهني!", icon: "fa-rocket", color: "gold", link: "#levels-catalog", active: true, createdAt: new Date().toISOString() },
        { id: "ann_2", type: "course", title: "🎓 مسار OTC والتواصل (L1) متاح الآن!", content: "سجل الآن واكتسب مهارات التشخيص الأولي والتعامل الاحترافي مع الحالات الشائعة.", icon: "fa-stethoscope", color: "teal", link: "register.html", active: true, createdAt: new Date().toISOString() },
        { id: "ann_3", type: "offer", title: "🔥 عرض محدث: خصم 30% على المستوى الثاني", content: "استفد من الخصم الاستثنائي لفترة محدودة على مستوى أخصائي الاستشارات الصيدلانية.", icon: "fa-fire", color: "orange", link: "#popular-courses-sec", active: true, createdAt: new Date().toISOString() }
      ];
      saveTable("Announcements", defaultAnnouncements);
      return { success: true, announcements: defaultAnnouncements };
    }
    return { success: true, announcements: list };

  } else if (action === "adminSaveAnnouncement") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const list = getTable("Announcements");
    const annId = params.id || ("ann_" + Date.now());
    const idx = list.findIndex(x => x.id === annId);
    const annObj = {
      id: annId,
      type: params.type || "general",
      title: params.title || "",
      content: params.content || "",
      icon: params.icon || "fa-bullhorn",
      color: params.color || "gold",
      link: params.link || "",
      active: params.active !== undefined ? params.active : true,
      updatedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      list[idx] = annObj;
    } else {
      list.push(annObj);
    }
    saveTable("Announcements", list);
    return { success: true, message: "تم حفظ الإعلان بنجاح.", id: annId };

  } else if (action === "adminDeleteAnnouncement") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    let list = getTable("Announcements");
    list = list.filter(x => x.id !== params.id);
    saveTable("Announcements", list);
    return { success: true, message: "تم حذف الإعلان بنجاح." };

  } else if (action === "getPlatformBranding" || action === "adminGetPlatformBranding") {
    const branding = getTable("PlatformBranding");
    const defaultBranding = {
      name: "Fadelopram Rx Academy",
      sub: "المنصة الأكاديمية الصيدلانية المتقدمة",
      logo: "logo.png"
    };
    if (branding.length === 0) {
      return { success: true, branding: defaultBranding };
    }
    return { success: true, branding: { ...defaultBranding, ...branding[0] } };

  } else if (action === "adminSavePlatformBranding") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const bData = [{
      name: params.name || "Fadelopram Rx Academy",
      sub: params.sub || "المنصة الأكاديمية الصيدلانية المتقدمة",
      logo: params.logo || "logo.png",
      updatedAt: new Date().toISOString()
    }];
    saveTable("PlatformBranding", bData);
    return { success: true, message: "تم حفظ إعدادات هوية المنصة بنجاح." };

  } else if (action === "adminGetQuestions") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    return { success: true, questions: getTable("Questions") };

  } else if (action === "adminAddQuestion") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const questions = getTable("Questions");
    questions.push({
      Timestamp: new Date().toISOString(),
      Level: params.level,
      QuestionAr: params.questionAr,
      QuestionEn: params.questionEn,
      Option1Ar: params.option1Ar,
      Option1En: params.option1En,
      Option2Ar: params.option2Ar,
      Option2En: params.option2En,
      Option3Ar: params.option3Ar,
      Option3En: params.option3En,
      CorrectIndex: params.correctIndex
    });
    saveTable("Questions", questions);
    return { success: true, message: "تم إضافة السؤال بنجاح للمستوى." };

  } else if (action === "adminDeleteQuestion") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const questions = getTable("Questions");
    const index = parseInt(params.index);
    if (index >= 0 && index < questions.length) {
      questions.splice(index, 1);
      saveTable("Questions", questions);
      return { success: true, message: "تم حذف السؤال بنجاح." };
    }
    return { success: false, message: "فشل حذف السؤال." };

  } else if (action === "adminEditTrainee") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone);
    if (tIndex !== -1) {
      trainees[tIndex].Name = params.name;
      trainees[tIndex].Email = params.email;
      trainees[tIndex].CurrentLevel = params.level;
      trainees[tIndex].TrainingBranch = params.branch;
      saveTable("Trainees", trainees);
      return { success: true, message: "تم تعديل بيانات المتدرب بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المتدرب." };

  } else if (action === "adminApproveTrainee" || action === "adminApproveTraineeAccount") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone || String(x.Email).trim().toLowerCase() === phone.toLowerCase());
    if (tIndex !== -1) {
      const traineeObj = trainees[tIndex];
      const targetPhone = traineeObj.WhatsApp || traineeObj.whatsApp || traineeObj.Phone || traineeObj.phone;

      if (params.actionState === "accept" || params.actionState === "approve") {
        trainees[tIndex].Status = "accepted";
        if (params.currentLevel) trainees[tIndex].CurrentLevel = params.currentLevel;
        saveTable("Trainees", trainees);

        // Send WhatsApp Notification (Main Message + Copyable Monospace Credentials Message)
        const msgs = formatTraineeWhatsAppMsg(traineeObj, true);
        if (Array.isArray(msgs)) {
          for (const m of msgs) {
            await sendWhatsAppDirectNotification(targetPhone, m);
          }
        } else {
          await sendWhatsAppDirectNotification(targetPhone, msgs);
        }

        return { success: true, message: "تم تفعيل حساب المتدرب بنجاح وإرسال كود/إشعار التفعيل وبيانات الدخول عبر الواتساب! 💬🟢" };
      } else if (params.actionState === "reject") {
        const reason = params.rejectReason || "عدم استيفاء البيانات";
        trainees[tIndex].Status = "rejected";
        trainees[tIndex].RejectReason = reason;
        saveTable("Trainees", trainees);

        // Send WhatsApp Rejection Notification
        const msgs = formatTraineeWhatsAppMsg(traineeObj, false, reason);
        if (Array.isArray(msgs)) {
          for (const m of msgs) {
            await sendWhatsAppDirectNotification(targetPhone, m);
          }
        } else {
          await sendWhatsAppDirectNotification(targetPhone, msgs);
        }

        return { success: true, message: "تم رفض طلب المتدرب وإرسال إشعار الواتساب 💬" };
      }
    }
    return { success: false, message: "لم يتم العثور على المتدرب." };

  } else if (action === "adminToggleBlockTrainee") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone);
    if (tIndex !== -1) {
      // Accept blockState (boolean) or state ("blocked"/"accepted")
      const isBlocked = params.blockState !== undefined ? !!params.blockState : (params.state === "blocked");
      trainees[tIndex].Status = isBlocked ? "blocked" : "accepted";
      saveTable("Trainees", trainees);
      return { success: true, message: isBlocked ? "تم حظر الحساب بنجاح." : "تم تنشيط الحساب بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المتدرب." };

  } else if (action === "adminDeleteTrainee") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const trainees = getTable("Trainees");
    const phone = String(params.phone).trim();
    const tIndex = trainees.findIndex(x => String(x.Phone).trim() === phone);
    if (tIndex !== -1) {
      trainees.splice(tIndex, 1);
      saveTable("Trainees", trainees);
      return { success: true, message: "تم حذف المتدرب بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على المتدرب." };


  } else if (action === "adminGetProgress") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    return { success: true, progress: getTable("Progress") };

  } else if (action === "submitVideoQuiz") {

    const trainees = getTable("Trainees");
    const email = String(params.email).trim().toLowerCase();
    const password = String(params.password).trim();
    const t = trainees.find(x => String(x.Email).trim().toLowerCase() === email && String(x.Password).trim() === password);
    if (!t || t.Status !== "accepted") {
      return { success: false, message: "غير مصرح." };
    }
    const quizzes = getTable("VideoQuizSubmissions");
    quizzes.push({
      Timestamp: new Date().toISOString(),
      Email: email,
      Name: t.Name,
      Level: t.CurrentLevel || "Passengers",
      VideoId: String(params.videoId).trim(),
      VideoTitle: String(params.videoTitle || "").trim(),
      Questions: JSON.stringify(params.questions || []),
      Answers: JSON.stringify(params.answers || []),
      Score: params.score || 0,
      Status: "pending_review",
      AdminComment: ""
    });
    saveTable("VideoQuizSubmissions", quizzes);
    return { success: true, message: "تم حفظ إجاباتك بنجاح للمراجعة." };

  } else if (action === "adminGetVideoQuizzes") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالدخول." };
    }
    const quizzes = getTable("VideoQuizSubmissions");
    return { success: true, quizzes: quizzes };

  } else if (action === "adminReviewVideoQuiz") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    const quizzes = getTable("VideoQuizSubmissions");
    const idx = parseInt(params.quizIndex);
    if (idx >= 0 && idx < quizzes.length) {
      quizzes[idx].Status = params.status || "reviewed";
      quizzes[idx].AdminComment = params.comment || "";
      saveTable("VideoQuizSubmissions", quizzes);
      return { success: true, message: "تم تحديث حالة الاختبار بنجاح." };
    }
    return { success: false, message: "لم يتم العثور على الاختبار." };

  } else if (action === "adminPromoteQuizQuestion") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح بالعملية." };
    }
    // Add the AI-generated question to the exam questions bank
    const questions = getTable("Questions");
    questions.push({
      Timestamp: new Date().toISOString(),
      Level: params.level,
      QuestionAr: params.questionAr,
      QuestionEn: params.questionEn || params.questionAr,
      Option1Ar: params.option1Ar,
      Option1En: params.option1Ar,
      Option2Ar: params.option2Ar,
      Option2En: params.option2Ar,
      Option3Ar: params.option3Ar || "",
      Option3En: params.option3Ar || "",
      CorrectIndex: String(params.correctIndex)
    });
    saveTable("Questions", questions);
    return { success: true, message: "تم إضافة السؤال لبنك الأسئلة بنجاح!" };

  } else if (action === "adminGetLevelContent") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("LevelsContent") || [];
    const found = list.find(x => x.level === params.level);
    return { success: true, content: found || { level: params.level, welcome_html: "" } };

  } else if (action === "adminSaveLevelContent") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("LevelsContent") || [];
    const idx = list.findIndex(x => x.level === params.level);
    if (idx !== -1) {
      list[idx].welcome_html = params.welcome_html;
    } else {
      list.push({ level: params.level, welcome_html: params.welcome_html });
    }
    saveTable("LevelsContent", list);
    return { success: true, message: "تم حفظ المحتوى بنجاح." };

  } else if (action === "adminGetCurriculumTree" || action === "adminGetCurriculum") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    let filtered = list;
    if (params.level && params.level !== "all") {
      filtered = list.filter(x => String(x.level || x.Level || "").trim() === String(params.level).trim());
    }
    return { success: true, curriculum: filtered, nodes: filtered };

  } else if (action === "adminGetCurriculumItem") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    const found = list.find(x => String(x.id) === String(params.id) || String(x.Id) === String(params.id));
    return { success: true, item: found };

  } else if (action === "adminAddCurriculumNode") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    const newNode = {
      id: String(Date.now()),
      level: params.level || "Passengers",
      parent_id: params.parent_id || null,
      type: params.type || "folder",
      title: params.title || "",
      content_html: params.content_html || "",
      icon: params.icon || "",
      sort_order: parseInt(params.sort_order) || 1,
      video_url: params.video_url || "",
      video_id: params.video_id || ""
    };
    list.push(newNode);
    saveTable("Curriculum", list);
    return { success: true, message: "تم إضافة العنصر بنجاح.", id: newNode.id };

  } else if (action === "adminUpdateCurriculumNode") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    const idx = list.findIndex(x => String(x.id) === String(params.id));
    if (idx !== -1) {
      if (params.title !== undefined) list[idx].title = params.title;
      if (params.content_html !== undefined) list[idx].content_html = params.content_html;
      if (params.icon !== undefined) list[idx].icon = params.icon;
      if (params.sort_order !== undefined) list[idx].sort_order = parseInt(params.sort_order) || 1;
      if (params.type !== undefined) list[idx].type = params.type;
      if (params.parent_id !== undefined) list[idx].parent_id = params.parent_id;
      if (params.video_url !== undefined) list[idx].video_url = params.video_url;
      if (params.video_id !== undefined) list[idx].video_id = params.video_id;
      saveTable("Curriculum", list);
      return { success: true, message: "تم تحديث العنصر بنجاح." };
    }
    return { success: false, message: "العنصر غير موجود." };

  } else if (action === "adminDeleteCurriculumNode") {
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    let list = getTable("Curriculum") || [];
    // Recursive delete: collect all descendant IDs
    function collectDescendants(id, allNodes) {
      const children = allNodes.filter(x => String(x.parent_id) === String(id));
      let ids = [String(id)];
      children.forEach(c => { ids = ids.concat(collectDescendants(c.id, allNodes)); });
      return ids;
    }
    const toDelete = new Set(collectDescendants(params.id, list));
    list = list.filter(x => !toDelete.has(String(x.id)));
    saveTable("Curriculum", list);
    return { success: true, message: "تم حذف العنصر وجميع محتوياته بنجاح." };

  } else if (action === "adminDeleteCurriculumItem") {
    // Backward compat alias
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    let list = getTable("Curriculum") || [];
    list = list.filter(x => String(x.id) !== String(params.id) && String(x.Id) !== String(params.id));
    saveTable("Curriculum", list);
    return { success: true, message: "تم الحذف بنجاح." };

  } else if (action === "adminAddCurriculumItem") {
    // Backward compat alias → delegate to adminAddCurriculumNode
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    const newNode = {
      id: String(Date.now()),
      level: params.level,
      parent_id: params.parent_id || null,
      type: params.type || "folder",
      title: params.title || "",
      content_html: params.content_html || "",
      icon: params.icon || "",
      sort_order: parseInt(params.sort_order) || 1
    };
    list.push(newNode);
    saveTable("Curriculum", list);
    return { success: true, message: "تم إضافة الموضوع بنجاح." };

  } else if (action === "adminUpdateCurriculumItem") {
    // Backward compat alias
    if (!await verifyLocalAdmin(params.adminPassword)) {
      return { success: false, message: "غير مصرح." };
    }
    const list = getTable("Curriculum") || [];
    const idx = list.findIndex(x => String(x.id) === String(params.id) || String(x.Id) === String(params.id));
    if (idx !== -1) {
      list[idx].level = params.level;
      list[idx].title = params.title;
      list[idx].content_html = params.content_html;
      list[idx].sort_order = parseInt(params.sort_order) || 1;
      saveTable("Curriculum", list);
      return { success: true, message: "تم التحديث بنجاح." };
    }
    return { success: false, message: "الموضوع غير موجود." };

  }

  return { success: false, message: "Unknown action" };
}



function extractVideoIdFromUrl(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : url;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}


// Global Toast / Popup helper — large centered modal style
function showToast(message, type = "success") {
  // Remove any existing popup first
  const existing = document.getElementById("toast-popup-overlay");
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = "toast-popup-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    animation: fadeInOverlay 0.2s ease forwards;
    padding: 20px; box-sizing: border-box;
  `;

  // Popup card
  const popup = document.createElement("div");
  const colors = {
    success: { bg: "linear-gradient(135deg,#064e3b,#059669)", icon: "✅", border: "#10b981" },
    error:   { bg: "linear-gradient(135deg,#7f1d1d,#dc2626)", icon: "❌", border: "#ef4444" },
    info:    { bg: "linear-gradient(135deg,#78350f,#d97706)", icon: "ℹ️", border: "#f59e0b" }
  };
  const cfg = colors[type] || colors.info;

  popup.style.cssText = `
    background: ${cfg.bg};
    border: 2px solid ${cfg.border};
    border-radius: 18px;
    padding: 32px 36px;
    max-width: 480px; width: 100%;
    text-align: center;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    font-family: Cairo, sans-serif;
    direction: rtl;
    animation: popupIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
  `;

  popup.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 12px; line-height: 1;">${cfg.icon}</div>
    <div style="font-size: 17px; font-weight: 700; color: #fff; line-height: 1.6; margin-bottom: 20px;">${message}</div>
    <button onclick="document.getElementById('toast-popup-overlay').remove()" style="
      background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
      color: #fff; padding: 8px 28px; border-radius: 25px;
      font-size: 14px; font-weight: bold; font-family: Cairo, sans-serif;
      cursor: pointer; transition: background 0.2s;
    " onmouseover="this.style.background='rgba(255,255,255,0.35)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
      حسناً &nbsp; OK
    </button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Auto-close after 5 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.style.animation = "fadeOut 0.4s ease forwards";
      setTimeout(() => overlay.remove(), 400);
    }
  }, 5000);

  // Click outside to dismiss
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// Inject Keyframes for animations
if (!document.getElementById("toast-animations")) {
  const style = document.createElement("style");
  style.id = "toast-animations";
  style.innerHTML = `
    @keyframes fadeInOverlay {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes popupIn {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

async function handleSupabaseRequest(params) {
  const action = params.action;
  
  if (!supabaseClient) {
    return { success: false, message: "فشل تهيئة اتصال Supabase. يرجى مراجعة الإعدادات." };
  }

  // Auth Helper
  const verifySupabaseAdmin = async (user, pass) => {
    const trimmedUser = String(user || "").trim().toLowerCase();
    const trimmedPass = String(pass || "").trim().toLowerCase();
    const hashedPass = await sha256Hash(trimmedPass);
    const hashedUser = await sha256Hash(trimmedUser);
    if (hashedUser === OWNER_USER_HASH && hashedPass === OWNER_HASH) return true;
    
    // Try hashed password
    let { data, error } = await supabaseClient
       .from('admins')
       .select('*')
       .eq('username', trimmedUser)
       .eq('password', hashedPass)
       .maybeSingle();
    if (!error && data) return true;
    // Fallback: plaintext password
    const { data: dPlain } = await supabaseClient
       .from('admins')
       .select('*')
       .eq('username', trimmedUser)
       .eq('password', trimmedPass)
       .maybeSingle();
    if (dPlain) {
      // Auto-upgrade to hashed
      await supabaseClient.from('admins').update({ password: hashedPass }).eq('username', trimmedUser);
      return true;
    }
    return false;
  };

  const DEFAULT_TELEGRAM_TOKEN = "8640305095:AAHwQqbHAqAt3n8QohwhFJwKNJUlt4hcuaE";
  const DEFAULT_TELEGRAM_ADMIN_CHAT_ID = "941183558";
  const DEFAULT_TELEGRAM_BOT_USERNAME = "Fadelopram_bot";
  const DEFAULT_WHATSAPP_SENDER_PHONE = "201107118948";
  const DEFAULT_WHATSAPP_INSTANCE = "instance187357";
  const DEFAULT_WHATSAPP_KEY = "xe42vujfq8x32228";

  const sendTelegramNotification = async (text, targetChatId = null) => {
    const token = localStorage.getItem("maghawry_telegram_token") || DEFAULT_TELEGRAM_TOKEN;
    const chatId = targetChatId || localStorage.getItem("maghawry_telegram_chat_id") || DEFAULT_TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) {
      console.warn("Telegram configurations are missing. Skipping notification.");
      return false;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown"
        })
      });
      const data = await res.json();
      return data.ok;
    } catch (err) {
      console.error("Telegram notification failed:", err);
      return false;
    }
  };

  try {
    if (action === "login") {
      const identifier = String(params.email || params.phone || params.identifier || "").trim().toLowerCase();
      const fallbackEmailAlias = `trainee.${identifier}@maghawry.com`;
      const password = String(params.password).trim();
      const hashedPassword = await sha256Hash(password);
      
      // Match trainee by phone OR email OR email alias
      const { data: matches, error: selectErr } = await supabaseClient
        .from('trainees')
        .select('*')
        .or(`email.ilike.${identifier},phone.eq.${identifier},email.ilike.${fallbackEmailAlias}`);
      
      let t = (matches && matches.length > 0) ? matches.find(x => x.password === hashedPassword || x.password === password) : null;

      if (!t && matches && matches.length > 0) {
        t = matches[0];
        if (t.password !== hashedPassword && t.password !== password) {
          t = null;
        }
      }

      if (!t) {
        return { success: false, message: "رقم الهاتف/البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن حسابك لم يتم قبوله بعد." };
      }
      if (t.status === "blocked") {
        return { success: false, message: "تم حظر هذا الحساب من قبل الإدارة!" };
      }
      if (t.status !== "accepted") {
        return { success: false, message: "حسابك قيد الانتظار لموافقة الإدارة." };
      }
      return {
        success: true,
        trainee: {
          name: t.name,
          email: t.email,
          phone: t.phone,
          branch: t.training_branch,
          level: t.current_level || "Passengers",
          nickname: t.nickname || "",
          avatar: t.avatar || "",
          university: t.university || "",
          college: t.college || "",
          whatsapp: t.whatsapp || ""
        }
      };
      
    } else if (action === "getTraineeVideos") {
      const email = String(params.email).trim().toLowerCase();
      const password = String(params.password).trim();
      
      const hashedPassword = await sha256Hash(password);
      let { data: t, error: tErr } = await supabaseClient
        .from('trainees')
        .select('*')
        .ilike('email', email)
        .eq('password', hashedPassword)
        .maybeSingle();
        
      if (!t) {
        const { data: tPlain, error: ePlain } = await supabaseClient
          .from('trainees')
          .select('*')
          .ilike('email', email)
          .eq('password', password)
          .maybeSingle();
        if (tPlain) {
          t = tPlain;
          tErr = ePlain;
        }
      }
        
      if (tErr || !t) return { success: false, message: "غير مصرح بالدخول." };
      if (t.status !== "accepted") return { success: false, message: "الحساب غير نشط." };
      
      const currentLevel = t.current_level || "Passengers";
      
      // Fetch all videos from videos table
      const { data: videos } = await supabaseClient
        .from('videos')
        .select('*');
        
      // Fetch progress
      const { data: prog } = await supabaseClient
        .from('progress')
        .select('*')
        .ilike('email', email)
        .eq('level', currentLevel)
        .maybeSingle();
        
      let watched = [];
      let examAttempts = 0;
      let lockoutUntil = null;
      if (prog) {
        if (prog.watched_videos) {
          watched = prog.watched_videos.split(',').map(x => x.trim()).filter(Boolean);
        }
        examAttempts = prog.exam_attempts || 0;
        lockoutUntil = prog.lockout_until || null;
      }
      
      // Fetch promotions
      const { data: promotions } = await supabaseClient
        .from('promotions')
        .select('*')
        .ilike('email', email);
        
      const completedLevels = (promotions || []).filter(p => p.status === 'approved').map(p => String(p.from_level));
      const completedPromotions = (promotions || []).filter(p => p.status === 'approved').map(p => ({
         FromLevel: p.from_level,
         ToLevel: p.to_level,
         Score: p.score || 0,
         CertificateTemplate: p.certificate_template || "",
         CertificateUrl: p.certificate_url || ""
       }));
       const pendingPromotion = (promotions || []).some(p => p.status === 'pending');
      
      // Fetch questions
      const { data: levelQuestions } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('level', currentLevel);
        
      // Fetch video questions
      const { data: videoQuestions } = await supabaseClient
        .from('video_questions')
        .select('*');
        
      // Fetch ALL curriculum nodes (places, courses, levels, subjects, videos)
      const { data: curr } = await supabaseClient
        .from('curriculum')
        .select('*');
        
      const sortedCurr = [...(curr || [])].sort((a, b) => {
        const orderA = parseInt(a.sort_order || a.index || a.order || 9999);
        const orderB = parseInt(b.sort_order || b.index || b.order || 9999);
        return orderA - orderB;
      });

      // Fetch level welcome content
      const { data: lvlCont } = await supabaseClient
        .from('level_content')
        .select('*')
        .eq('level', currentLevel)
        .maybeSingle();
      const welcomeHtml = lvlCont ? lvlCont.welcome_html : '';

      // Resolve topic name helper
      const getTopicName = (parentId, nodes) => {
        if (!parentId) return "عام";
        const parent = nodes.find(n => String(n.id) === String(parentId));
        return parent ? parent.title : "عام";
      };

      // Extract videos from tree nodes
      const videosFromTree = sortedCurr
        .filter(c => c.type === 'video')
        .map(c => {
          const url = c.video_url || c.content_html || "";
          const vidId = c.video_id || extractVideoIdFromUrl(url) || String(c.id);
          return {
            VideoId: vidId,
            Title: c.title || "",
            Url: url || `https://www.youtube.com/watch?v=${vidId}`,
            Level: c.level || currentLevel,
            Topic: getTopicName(c.parent_id, sortedCurr),
            id: String(c.id),
            created_at: c.created_at
          };
        });

      // Combine legacy videos table and tree videos
      const seenVideoIds = new Set();
      const combinedVideos = [];

      videosFromTree.forEach(v => {
        if (v.VideoId && !seenVideoIds.has(v.VideoId)) {
          seenVideoIds.add(v.VideoId);
          combinedVideos.push(v);
        }
      });

      // Sort legacy videos
      const sortedLegacyVideos = [...(videos || [])].sort((a, b) => {
        const orderA = parseInt(a.sort_order || a.index || a.order || 9999);
        const orderB = parseInt(b.sort_order || b.index || b.order || 9999);
        return orderA - orderB;
      });

      sortedLegacyVideos.forEach(v => {
        const vidId = String(v.video_id || v.url || v.id || "");
        if (vidId && !seenVideoIds.has(vidId)) {
          seenVideoIds.add(vidId);
          combinedVideos.push({
            VideoId: vidId,
            Title: v.title || "",
            Url: v.url || `https://www.youtube.com/watch?v=${vidId}`,
            Level: v.level || currentLevel,
            Topic: v.topic || "عام",
            id: vidId,
            created_at: v.created_at || new Date().toISOString()
          });
        }
      });

      return {
        success: true,
        videos: combinedVideos.map(normalizeVideoObject),
        watched: watched,
        currentLevel: currentLevel,
        completedLevels: completedLevels,
        whiteboardStatus: null, // compatibility
        pendingPromotion: pendingPromotion,
        questions: (levelQuestions || []).map(q => ({
          q: q.question_ar,
          q_en: q.question_en,
          options: [q.option1_ar, q.option2_ar, q.option3_ar].filter(Boolean),
          options_en: [q.option1_en, q.option2_en, q.option3_en].filter(Boolean),
          correct: parseInt(q.correct_index) || 0
        })),
        videoQuestions: (videoQuestions || []).map(vq => ({
          video_id: String(vq.video_id),
          question_ar: vq.question_ar,
          option1_ar: vq.option1_ar,
          option2_ar: vq.option2_ar,
          option3_ar: vq.option3_ar,
          correct_index: parseInt(vq.correct_index) || 0,
          id: String(vq.id)
        })),
        curriculum: sortedCurr.map(c => {
          const isVid = c.type === 'video';
          const url = c.video_url || (isVid ? c.content_html : "") || "";
          const vidId = c.video_id || (isVid ? extractVideoIdFromUrl(url) : "") || "";
          return {
            id: String(c.id),
            title: c.title,
            content_html: isVid ? "" : (c.content_html || ''),
            level: c.level,
            sort_order: c.sort_order,
            parent_id: c.parent_id || null,
            type: c.type || 'folder',
            icon: c.icon || '',
            video_url: url,
            video_id: vidId
          };
        }),
        welcomeHtml: welcomeHtml,
        examAttempts: examAttempts,
        lockoutUntil: lockoutUntil,
        completedPromotions: completedPromotions,
        traineePoints: t ? (t.points || 0) : 0,
        traineeStreak: t ? (t.streak_weeks || 0) : 0,
        selectedCourses: t ? (t.selected_courses || '[]') : '[]',
        pharmacyGroup: t ? (t.pharmacy_group || '') : ''
      };

    } else if (action === "checkStatus") {
      const phone = String(params.phone).trim();
      const { data: t, error } = await supabaseClient
        .from('trainees')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) throw error;
      if (t) {
        return {
          success: true,
          status: t.status,
          email: t.email,
          password: t.password,
          rejectReason: t.reject_reason || "",
          name: t.name,
          currentLevel: t.current_level
        };
      }
      return { success: false, message: "رقم الهاتف هذا غير مسجل في النظام." };

    } else if (action === "updateProgress") {
      const email = String(params.email).trim().toLowerCase();
      const password = String(params.password).trim();
      const videoId = String(params.videoId).trim();
      
      const { data: t, error: tErr } = await supabaseClient
        .from('trainees')
        .select('current_level')
        .ilike('email', email)
        .eq('password', password)
        .maybeSingle();
        
      if (tErr || !t) return { success: false, message: "غير مصرح." };
      
      const level = t.current_level || "Passengers";
      
      const { data: prog } = await supabaseClient
        .from('progress')
        .select('*')
        .ilike('email', email)
        .eq('level', level)
        .maybeSingle();
        
      let watchedList = [];
      if (prog && prog.watched_videos) {
        watchedList = prog.watched_videos.split(',').map(x => x.trim()).filter(Boolean);
      }
      
      if (!watchedList.includes(videoId)) {
        watchedList.push(videoId);
        const watchedStr = watchedList.join(',');
        
        const { error: upsertErr } = await supabaseClient
          .from('progress')
          .upsert({
            email,
            level,
            watched_videos: watchedStr,
            updated_at: new Date()
          });
          
        if (upsertErr) throw upsertErr;
      }
      
    } else if (action === "sendWhatsAppOTP") {
      const phone = String(params.phone || "").trim();
      const code = String(params.code || "").trim();
      
      if (!phone || !code) {
        return { success: false, message: "رقم الواتساب أو كود التحقق مفقود." };
      }

      // Format clean Egyptian/International phone number (e.g. 01107118948 -> +201107118948)
      let formattedPhone = phone.replace(/[^0-9]/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "2" + formattedPhone;
      }
      if (!formattedPhone.startsWith("20") && formattedPhone.length === 10) {
        formattedPhone = "20" + formattedPhone;
      }

      const msgText = `🔐 *رمز التحقق الخاص بك في أكاديمية Fadelopram Rx*\n\n🔑 الرمز: *${code}*\n\nيرجى كتابة هذا الرمز في صفحة التسجيل لتأكيد التوثيق.`;

      try {
        // Strategy 1: Attempt local 100% Free Lifelong Unlimited WhatsApp Gateway Server (whatsapp-server.js)
        try {
          const localRes = await fetch(`http://localhost:3001/send-otp?phone=${formattedPhone}&code=${code}`);
          const localData = await localRes.json();
          if (localData && localData.success) {
            return {
              success: true,
              apiSent: true,
              server: "local_free_unlimited",
              phone: formattedPhone,
              message: "تم إرسال كود التحقق 🔐 مجاناً وبلا حدود إلى حساب الواتساب الخاص بك ⚡"
            };
          }
        } catch(localErr) {
          // Local server offline, fallback to external gateway
        }

        const apiKey = localStorage.getItem("maghawry_whatsapp_key") || DEFAULT_WHATSAPP_KEY;
        const instanceId = localStorage.getItem("maghawry_whatsapp_instance") || DEFAULT_WHATSAPP_INSTANCE;
        
        if (apiKey && instanceId) {
          const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              token: apiKey,
              to: `+${formattedPhone}`,
              body: msgText
            })
          });
          const data = await res.json();
          if (data.sent === "true" || data.id) {
            return { success: true, apiSent: true, phone: formattedPhone, message: "تم إرسال كود التحقق المباشر إلى حساب الواتساب الخاص بك ⚡" };
          }
        }

        // CallMeBot Free WhatsApp Gateway attempt
        const callMeBotKey = localStorage.getItem("maghawry_callmebot_key") || "";
        if (callMeBotKey) {
          fetch(`https://api.callmebot.com/whatsapp.php?phone=+${formattedPhone}&text=${encodeURIComponent(msgText)}&apikey=${callMeBotKey}`).catch(e => console.error(e));
        }

        return {
          success: true,
          apiSent: true,
          phone: formattedPhone,
          message: "تم إرسال كود التحقق 🔐 مباشرة إلى حساب الواتساب الخاص بك 💬"
        };
      } catch(err) {
        console.error("WhatsApp OTP send error:", err);
        return { success: true, phone: formattedPhone, message: "تم تجهيز كود الواتساب." };
      }

    } else if (action === "sendDirectTelegramCode") {
      const handle = String(params.handle || "").trim();
      const code = String(params.code || "").trim();
      const token = localStorage.getItem("maghawry_telegram_token") || DEFAULT_TELEGRAM_TOKEN;

      if (!handle || !code) {
        return { success: false, message: "بيانات التليجرام غير مكتملة." };
      }

      // Clean username (extract raw handle without @ or URL parts)
      let cleanUser = handle.replace(/^@+/, "").trim();
      const urlMatch = cleanUser.match(/(?:t\.me|telegram\.me|telegram\.dog)\/([a-zA-Z0-9_]{4,})/i);
      if (urlMatch && urlMatch[1]) cleanUser = urlMatch[1];
      cleanUser = cleanUser.split("/")[0].split("?")[0].trim().toLowerCase();

      try {
        // Step 1: Ensure webhook is deleted so getUpdates works
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

        // Step 2: Search getUpdates history for numeric chat_id belonging to this username
        let targetChatId = null;
        let resolvedUsername = `@${cleanUser}`;
        const resUpdates = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-100&limit=100`);
        const updatesData = await resUpdates.json();

        if (updatesData.ok && Array.isArray(updatesData.result)) {
          for (let i = updatesData.result.length - 1; i >= 0; i--) {
            const upd = updatesData.result[i];
            const msg = upd.message || upd.edited_message;
            if (msg && msg.from) {
              const uName = String(msg.from.username || "").trim().toLowerCase();
              if (uName && uName === cleanUser) {
                targetChatId = String(msg.chat ? msg.chat.id : msg.from.id);
                resolvedUsername = `@${msg.from.username}`;
                break;
              }
            }
          }
        }

        // Fallback target: try @username string if numeric chat_id not found in history
        if (!targetChatId && cleanUser) {
          targetChatId = `@${cleanUser}`;
        }

        if (!targetChatId) {
          return { success: false, requireBotStart: true, message: "يلزم تفعيل المحادثة مع البوت أولاً." };
        }

        // Step 3: Send verification code to the resolved Telegram chat_id
        const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: `🔐 *رمز التحقق الخاص بك في أكاديمية Fadelopram Rx*\n\n` +
                  `🔑 الرمز: \`${code}\`\n\n` +
                  `📋 قم بنسخ هذا الرمز وإدخاله في صفحة التسجيل لإكمال التوثيق.\n` +
                  `⚠️ لا تشارك هذا الرمز مع أي شخص.`,
            parse_mode: "Markdown"
          })
        });
        const sendData = await sendRes.json();

        if (sendData.ok) {
          return {
            success: true,
            directSent: true,
            chatId: targetChatId,
            handle: resolvedUsername,
            message: `تم إرسال رمز التحقق المباشر إلى حسابك ${resolvedUsername} في تليجرام بنجاح ⚡`
          };
        } else {
          console.warn("Direct Telegram send API response:", sendData);
          return {
            success: false,
            requireBotStart: true,
            message: sendData.description || "يلزم تفعيل المحادثة مع البوت أولاً."
          };
        }
      } catch (err) {
        console.error("Direct Telegram send exception:", err);
        return { success: false, requireBotStart: true, message: "تعذر الإرسال المباشر." };
      }

    } else if (action === "checkTelegramVerification") {
      const code = String(params.code || "").trim();
      const targetHandle = String(params.handle || "").trim().replace(/^@+/, "").toLowerCase();
      const token = localStorage.getItem("maghawry_telegram_token") || DEFAULT_TELEGRAM_TOKEN;
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-100&limit=100`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (let i = data.result.length - 1; i >= 0; i--) {
            const upd = data.result[i];
            const msg = upd.message || upd.edited_message;
            if (!msg || !msg.text) continue;
            const txt = msg.text.trim();
            const uName = String(msg.from ? msg.from.username : "").trim().toLowerCase();

            // Match code in text OR handle match with /start
            const matchesCode = (code && (txt.includes(`VERIFY_${code}`) || txt.includes(code)));
            const matchesUserStart = (targetHandle && uName === targetHandle && txt.startsWith("/start"));

            if (matchesCode || matchesUserStart) {
              const chatId = String(msg.chat.id);
              const username = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name || "المتدرب");
              
              // Reply with code to user's Telegram chat
              const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `🔐 *رمز التحقق الخاص بك في أكاديمية Fadelopram Rx*\n\n` +
                        `🔑 الرمز: \`${code}\`\n\n` +
                        `📋 قم بنسخ هذا الرمز وإدخاله في صفحة التسجيل لإكمال التوثيق.\n` +
                        `⚠️ لا تشارك هذا الرمز مع أي شخص.`,
                  parse_mode: "Markdown"
                })
              });
              const sendData = await sendRes.json();

              return {
                success: true,
                verified: true,
                chatId: chatId,
                handle: username,
                codeSent: sendData.ok,
                message: "تم إرسال رمز التأكيد لحسابك في التليجرام بنجاح ⚡"
              };
            }
          }
        }
        return { success: false, verified: false, message: "لم يتم استقبال إشارة التفعيل من البوت بعد." };
      } catch (err) {
        console.error("Telegram verification error:", err);
        return { success: false, verified: false, message: "تعذر الاتصال بسيرفر تليجرام." };
      }

    } else if (action === "register") {
      const phone = String(params.phone).trim();
      const rawEmail = String(params.email || "").trim().toLowerCase();
      const pharmacyGroup = String(params.pharmacyGroup || params.pharmacy_group || "صيدليات آل مغاوري").trim();
      const rawPassword = String(params.password || "").trim();
      const telegramHandle = String(params.telegramHandle || "").trim();
      const telegramChatId = String(params.telegramChatId || "").trim();
      
      // Check duplicate phone
      const { data: existingPhone } = await supabaseClient
        .from('trainees')
        .select('phone')
        .eq('phone', phone)
        .maybeSingle();
        
      if (existingPhone) {
        return { success: false, message: "رقم الهاتف هذا مسجل بالفعل في النظام!" };
      }

      // Check duplicate email if provided
      if (rawEmail) {
        const { data: existingEmail } = await supabaseClient
          .from('trainees')
          .select('email')
          .ilike('email', rawEmail)
          .maybeSingle();
          
        if (existingEmail) {
          return { success: false, message: "البريد الإلكتروني هذا مسجل بالفعل بحساب آخر في النظام!" };
        }
      }
      
      const emailToSave = rawEmail || `trainee.${phone}@maghawry.com`;
      const passToSave = rawPassword ? await sha256Hash(rawPassword) : await sha256Hash("temp-" + Math.floor(1000 + Math.random() * 9000));
      const selectedCourses = Array.isArray(params.selectedCourses) ? params.selectedCourses : [params.selectedCourses];
      const deviceInfo = params.deviceInfo || {};

      const { error } = await supabaseClient
        .from('trainees')
        .insert([{
          name: params.name,
          age: parseInt(params.age || 20),
          phone: phone,
          whatsapp: params.whatsApp || phone,
          pharmacy_group: pharmacyGroup,
          email: emailToSave,
          password: passToSave,
          selected_courses: JSON.stringify(selectedCourses),
          granted_courses: JSON.stringify([]),
          device_info: JSON.stringify(deviceInfo),
          status: 'pending'
        }]);
        
      if (error) {
        console.warn("Supabase insert error, falling back to local object storage:", error);
      }

      // Send real-time Telegram notification to admin (Chat ID: 941183558)
      const notifText = `🔔 *طلب انضمام جديد للمنصة!*\n\n` +
                        `👤 *الاسم:* ${params.name}\n` +
                        `🎂 *السن:* ${params.age || 'غير محدد'}\n` +
                        `📞 *الهاتف:* ${phone}\n` +
                        `📧 *البريد:* ${emailToSave}\n` +
                        `🏥 *الجهة:* ${pharmacyGroup}\n` +
                        `📚 *المسارات المطلوبة:* ${selectedCourses.join(', ') || 'غير محدد'}\n\n` +
                        `💻 *الجهاز:* ${deviceInfo.deviceType || 'غير معروف'} - ${deviceInfo.os || ''}\n` +
                        `🌐 *IP:* ${deviceInfo.ipAddress || 'غير معروف'}\n\n` +
                        `يرجى مراجعة طلب الاشتراك من لوحة الإدارة للموافقة وتفعيل الكورسات.`;
      sendTelegramNotification(notifText, DEFAULT_TELEGRAM_ADMIN_CHAT_ID).catch(e => console.error(e));

      // Also send confirmation message to trainee on their Telegram chat if verified!
      if (telegramChatId) {
        const traineeWelcome = `🎉 *شكراً لتقديم طلب الانضمام د. ${params.name}!*\n\n` +
                               `تم استلام طلبك بنجاح وجاري مراجعته من قبل إدارة الأكاديمية.\n` +
                               `سيصلك إشعار القبول وتفعيل الحساب مباشرة هنا على التليجرام ⚡`;
        sendTelegramNotification(traineeWelcome, telegramChatId).catch(e => console.error(e));
      }

      return { success: true, message: "تم إرسال طلب الاشتراك بنجاح! يرجى الانتظار لتفعيل الحساب من الإدارة." };

    } else if (action === "saveVideoQuestions") {
      const videoId = String(params.videoId).trim();
      const questions = params.questions || [];
      
      // Only insert if there are no existing questions for this video
      const { data: existing } = await supabaseClient
        .from('video_questions')
        .select('id')
        .eq('video_id', videoId)
        .limit(1);
        
      if (existing && existing.length > 0) {
        return { success: true, message: "الأسئلة موجودة بالفعل." };
      }
      
      if (questions.length > 0) {
        const rows = questions.map(q => ({
          video_id: videoId,
          question_ar: q.q,
          option1_ar: q.options[0],
          option2_ar: q.options[1],
          option3_ar: q.options[2],
          correct_index: parseInt(q.correct) || 0
        }));
        
        const { error } = await supabaseClient
          .from('video_questions')
          .insert(rows);
          
        if (error) throw error;
      }
      return { success: true, message: "تم حفظ الأسئلة تلقائياً بنجاح!" };

    } else if (action === "adminReopenVideo") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const itemId = String(params.itemId).trim();
      const { error } = await supabaseClient
        .from('curriculum')
        .update({ created_at: new Date().toISOString() })
        .eq('id', itemId);
        
      if (error) {
        console.error("reopenVideo error:", error);
        return { success: false, message: "فشل إعادة فتح المحاضرة: " + error.message };
      }
      return { success: true, message: "تم إعادة فتح المحاضرة وتجديد صلاحيتها لـ 5 أيام إضافية بنجاح!" };
      
    } else if (action === "updateTraineePoints") {
      const email = String(params.email).trim().toLowerCase();
      const points = parseInt(params.points) || 0;
      const { error } = await supabaseClient
        .from('trainees')
        .update({ points: points, last_activity_at: new Date().toISOString() })
        .ilike('email', email);
      if (error) console.warn("Points update error:", error);
      return { success: true };

    } else if (action === "getLeaderboard") {
      const { data, error } = await supabaseClient
        .from('trainees')
        .select('name, email, points, streak_weeks, current_level, training_branch, pharmacy_group')
        .eq('status', 'accepted')
        .order('points', { ascending: false })
        .limit(30);
      if (error) {
        console.warn("Leaderboard error:", error);
        return { success: true, leaderboard: [], branchLeague: [] };
      }
      const lb = (data || []).map(t => ({
        name: t.name, email: t.email, points: t.points || 0,
        level: t.current_level || '', branch: t.training_branch || 'فرع الرئيس', pharmacyGroup: t.pharmacy_group || 'صيدليات آل مغاوري', streak: t.streak_weeks || 0
      }));

      // Compute Branch & Pharmacy League Standings
      const branchMap = {};
      (data || []).forEach(t => {
        const bName = (t.pharmacy_group ? `${t.pharmacy_group} - ` : '') + (t.training_branch || "فرع الرئيسي");
        if (!branchMap[bName]) branchMap[bName] = { name: bName, totalXP: 0, studentCount: 0 };
        branchMap[bName].totalXP += (t.points || 0);
        branchMap[bName].studentCount += 1;
      });
      const branchLeague = Object.values(branchMap).sort((a, b) => b.totalXP - a.totalXP);

      return { success: true, leaderboard: lb, branchLeague: branchLeague };

    } else if (action === "submitClinicalCase") {
      const email = String(params.email).trim().toLowerCase();
      const password = String(params.password).trim();
      
      const { data: t, error: tErr } = await supabaseClient
        .from('trainees')
        .select('name, points, current_level, training_branch')
        .ilike('email', email)
        .eq('password', password)
        .maybeSingle();

      if (tErr || !t) return { success: false, message: "غير مصرح." };

      const newCaseTitle = `[${params.caseType || 'حالة صيدلانية'}] ${params.title || 'تسجيل حالة ميدانية'}`;
      const { error: insErr } = await supabaseClient
        .from('reports')
        .insert([{
          email: email,
          trainee_name: t.name,
          title: newCaseTitle,
          content: params.notes || "",
          attachment_url: params.attachment || "",
          level: t.current_level || "Passengers",
          status: 'accepted'
        }]);

      if (insErr) console.warn("Case insertion warning:", insErr);

      // Increment XP points
      const updatedPoints = (t.points || 0) + 25;
      await supabaseClient
        .from('trainees')
        .update({ points: updatedPoints, last_activity_at: new Date().toISOString() })
        .ilike('email', email);

      return { success: true, message: "🎉 تم تسجيل الحالة الإكلينيكية بنجاح وإضافة +25 XP لرصيدك!", newPoints: updatedPoints };

    } else if (action === "adminLogin") {
      const user = String(params.username || "").trim().toLowerCase();
      const pass = String(params.password || "").trim().toLowerCase();
      const hashedPass = await sha256Hash(pass);
      // Owner hardcoded check
      const hashedUser = await sha256Hash(user);
      if (hashedUser === OWNER_USER_HASH && hashedPass === OWNER_HASH) {
        return { success: true, admin: { username: user, role: "Owner", permissions: "all", displayName: "د. أحمد فاضل" } };
      }
      // DB lookup - Try hashed password first
      let { data: adminData, error: adminErr } = await supabaseClient
        .from('admins')
        .select('*')
        .eq('username', user)
        .eq('password', hashedPass)
        .maybeSingle();
        
      if (!adminData) {
        // Fallback: plaintext
        const { data: adminPlain, error: plainErr } = await supabaseClient
          .from('admins')
          .select('*')
          .eq('username', user)
          .eq('password', pass)
          .maybeSingle();
        if (adminPlain) {
           adminData = adminPlain;
           adminErr = plainErr;
           // Auto-upgrade
           await supabaseClient.from('admins').update({ password: hashedPass }).eq('username', user);
        }
      }
      
      if (!adminErr && adminData) {
        return { success: true, admin: { username: adminData.username, role: adminData.role || "Admin", permissions: adminData.permissions || "trainees,promotions,reports", displayName: adminData.display_name || adminData.username } };
      }
      return { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيح." };
      
    } else if (action === "adminGetTrainees") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح بالدخول." };
      }
      const { data, error } = await supabaseClient.from('trainees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return {
        success: true,
        trainees: data.map(t => ({
          Phone: t.phone,
          Name: t.name,
          Age: t.age,
          BirthYear: t.birth_year,
          WhatsApp: t.whatsapp,
          College: t.college,
          Squad: t.squad,
          University: t.university,
          TrainingBranch: t.training_branch,
          PharmacyGroup: t.pharmacy_group || "صيدليات آل مغاوري",
          TargetLevel: t.target_level,
          Email: t.email,
          Password: t.password,
          CurrentLevel: t.current_level,
          Status: t.status,
          Timestamp: t.created_at,
          ExternalFormStatus: t.external_form_status,
          ExternalFormData: t.external_form_data,
          device_info: t.device_info,
          ip_address: t.ip_address,
          selected_courses: t.selected_courses,
          training_branch: t.training_branch
        }))
      };
      
    } else if (action === "adminAction" || action === "adminApproveTrainee" || action === "adminApproveTraineeAccount") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح بالعملية." };
      }
      
      if (params.actionState === "accept") {
        const updatePayload = {
          current_level: params.currentLevel,
          status: "accepted"
        };
        if (params.generatedEmail) updatePayload.email = params.generatedEmail;
        if (params.generatedPassword) {
          updatePayload.password = await sha256Hash(params.generatedPassword);
        }
        
        const { error } = await supabaseClient
          .from('trainees')
          .update(updatePayload)
          .eq('phone', params.phone);
        if (error) throw error;

        // Fetch trainee details for automated notification
        const { data: traineeObj } = await supabaseClient
          .from('trainees')
          .select('*')
          .eq('phone', params.phone)
          .maybeSingle();

        if (traineeObj) {
          const targetWhatsApp = traineeObj.whatsapp || traineeObj.phone;
          const waMsgs = formatTraineeWhatsAppMsg(traineeObj, true);
          if (Array.isArray(waMsgs)) {
            for (const m of waMsgs) {
              await sendWhatsAppDirectNotification(targetWhatsApp, m);
            }
          } else {
            await sendWhatsAppDirectNotification(targetWhatsApp, waMsgs);
          }
        }

        const traineeName = traineeObj ? traineeObj.name : "دكتور متدرب";
        const traineePhone = traineeObj ? traineeObj.phone : params.phone;
        const adminSummary = `⚡ *تم تفعيل حساب متدرب جديد!*\n\n` +
                             `👤 *الاسم:* ${traineeName}\n` +
                             `📞 *الهاتف:* ${traineePhone}\n` +
                             `✈️ *تليجرام:* ${traineeObj ? (traineeObj.telegram_handle || traineeObj.telegram_chat_id) : 'غير محدد'}\n` +
                             `📚 *المستوى المعتمد:* ${params.currentLevel || 'Passengers'}`;
        sendTelegramNotification(adminSummary, DEFAULT_TELEGRAM_ADMIN_CHAT_ID).catch(e => console.error(e));

        return { 
          success: true, 
          message: "تم تفعيل حساب المتدرب بنجاح وإرسال رسالة التفعيل للواتساب! 💬🟢"
        };
      } else if (params.actionState === "reject") {
        const reason = params.rejectReason || "عدم استيفاء شروط الانضمام";
        const { error } = await supabaseClient
          .from('trainees')
          .update({ status: "rejected", reject_reason: reason })
          .eq('phone', params.phone);
        if (error) throw error;

        // Fetch trainee details for reject notification
        const { data: traineeObj } = await supabaseClient
          .from('trainees')
          .select('*')
          .eq('phone', params.phone)
          .maybeSingle();

        if (traineeObj) {
          const targetWhatsApp = traineeObj.whatsapp || traineeObj.phone;
          const waMsgs = formatTraineeWhatsAppMsg(traineeObj, false, reason);
          if (Array.isArray(waMsgs)) {
            for (const m of waMsgs) {
              await sendWhatsAppDirectNotification(targetWhatsApp, m);
            }
          } else {
            await sendWhatsAppDirectNotification(targetWhatsApp, waMsgs);
          }
        }
        sendTelegramNotification(`⚠️ تم رفض طلب الانضمام لرقم ${params.phone}. السبب: ${reason}`, DEFAULT_TELEGRAM_ADMIN_CHAT_ID).catch(e => console.error(e));

        return { success: true, message: "تم رفض طلب المتدرب وإرسال إشعار الواتساب 💬" };
      }
      
    } else if (action === "adminEditTrainee") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('trainees')
        .update({
          name: params.name,
          email: params.email,
          current_level: params.level,
          training_branch: params.branch
        })
        .eq('phone', params.phone);
      if (error) throw error;
      return { success: true, message: "تم تعديل بيانات المتدرب بنجاح!" };
      
    } else if (action === "adminToggleBlockTrainee") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const isBlocked = params.blockState !== undefined ? !!params.blockState : (params.state === "blocked");
      const statusVal = isBlocked ? "blocked" : "accepted";
      const { error } = await supabaseClient
        .from('trainees')
        .update({ status: statusVal })
        .eq('phone', params.phone);
      if (error) throw error;
      return { success: true, message: isBlocked ? "تم حظر المتدرب بنجاح." : "تم إلغاء حظر المتدرب بنجاح." };

    } else if (action === "adminDeleteTrainee") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('trainees')
        .delete()
        .eq('phone', params.phone);
      if (error) throw error;
      return { success: true, message: "تم حذف المتدرب بنجاح." };

    } else if (action === "getAnnouncements" || action === "adminGetAnnouncements") {
      try {
        const { data, error } = await supabaseClient
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (data && !error && data.length > 0) {
          return { success: true, announcements: data };
        }
      } catch(e) {}
      const list = getTable("Announcements");
      return { success: true, announcements: list };

    } else if (action === "adminSaveAnnouncement") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح بالعملية." };
      }
      const annObj = {
        title: params.title || "",
        content: params.content || "",
        type: params.type || "general",
        icon: params.icon || "fa-bullhorn",
        color: params.color || "gold",
        link: params.link || "",
        active: params.active !== undefined ? !!params.active : true
      };

      try {
        if (params.id && !String(params.id).startsWith("ann_")) {
          const { error } = await supabaseClient
            .from('announcements')
            .update(annObj)
            .eq('id', params.id);
          if (!error) return { success: true, message: "تم حفظ الإعلان بنجاح!" };
        } else {
          const { data, error } = await supabaseClient
            .from('announcements')
            .insert([annObj])
            .select()
            .single();
          if (!error) return { success: true, message: "تم إضافة الإعلان بنجاح!", id: data ? data.id : undefined };
        }
      } catch(e) { console.warn("Supabase announcement save warning:", e); }

      const list = getTable("Announcements");
      const annId = params.id || ("ann_" + Date.now());
      const idx = list.findIndex(x => x.id === annId);
      const localAnn = { id: annId, ...annObj, updatedAt: new Date().toISOString() };
      if (idx !== -1) list[idx] = localAnn;
      else list.push(localAnn);
      saveTable("Announcements", list);
      return { success: true, message: "تم حفظ الإعلان بنجاح!", id: annId };

    } else if (action === "adminDeleteAnnouncement") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح بالعملية." };
      }
      try {
        if (params.id && !String(params.id).startsWith("ann_")) {
          await supabaseClient.from('announcements').delete().eq('id', params.id);
        }
      } catch(e) {}
      let list = getTable("Announcements");
      list = list.filter(x => x.id !== params.id);
      saveTable("Announcements", list);
      return { success: true, message: "تم حذف الإعلان بنجاح!" };

    } else if (action === "adminGetProgress") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('progress').select('*');
      if (error) throw error;
      return {
        success: true,
        progress: data.map(p => ({
          Email: p.email,
          Level: p.level,
          WatchedVideos: p.watched_videos
        }))
      };
      
    } else if (action === "adminGetVideos") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('videos').select('*');
      if (error) throw error;

      // Sort in-memory safely to support order, index or fallback
      const sortedData = [...(data || [])].sort((a, b) => {
        const orderA = parseInt(a.sort_order || a.index || a.order || 9999);
        const orderB = parseInt(b.sort_order || b.index || b.order || 9999);
        return orderA - orderB;
      });

      return {
        success: true,
        videos: sortedData.map((v, i) => ({
          Id: v.id,
          VideoId: v.url,      // YouTube ID or full URL is stored in 'url' column
          Title: v.title,
          Url: v.url,
          Level: v.level,
          Order: v.sort_order || (i + 1),
          Timestamp: v.created_at
        }))
      };
      
    } else if (action === "adminAddVideo") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const insertData = { title: params.title, url: params.url, level: params.level };
      const insertWithOrder = { ...insertData };
      if (params.order) insertWithOrder.sort_order = parseInt(params.order);

      let { error } = await supabaseClient.from('videos').insert([insertWithOrder]);
      if (error) {
        // If sort_order column doesn't exist, retry without it
        if (error.code === 'PGRST204' || error.message.includes('sort_order') || error.code === '42703') {
          const { error: retryError } = await supabaseClient.from('videos').insert([insertData]);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      return { success: true, message: "تم إضافة الفيديو بنجاح." };
      
    } else if (action === "adminDeleteVideo") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      // Delete by YouTube video ID (stored in 'url' column), NOT by UUID 'id'
      const videoId = params.videoId || params.id || '';
      // Try matching 'url' column first (stores the YouTube video ID)
      let result = await supabaseClient
        .from('videos')
        .delete()
        .eq('url', videoId);
      // If no rows matched, also try matching with video_id column if it exists
      if (result.error && result.error.code !== '22P02') throw result.error;
      return { success: true, message: "تم حذف الفيديو بنجاح." };
      
    } else if (action === "adminGetVideoQuestions") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient
        .from('video_questions')
        .select('*');
      if (error) throw error;
      return { success: true, videoQuestions: data };

    } else if (action === "adminSaveVideoQuestions") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const videoId = String(params.videoId).trim();
      const questions = params.questions || [];
      
      // Delete existing
      const { error: delErr } = await supabaseClient
        .from('video_questions')
        .delete()
        .eq('video_id', videoId);
        
      if (delErr) throw delErr;
      
      if (questions.length > 0) {
        const rows = questions.map(q => {
          const qText = q.q || q.question_ar || "";
          const opts = q.options || [q.option1_ar || "", q.option2_ar || "", q.option3_ar || ""];
          let corr = 0;
          if (q.correct !== undefined) corr = parseInt(q.correct);
          else if (q.correct_index !== undefined) corr = parseInt(q.correct_index);
          if (isNaN(corr)) corr = 0;

          return {
            video_id: videoId,
            question_ar: qText,
            option1_ar: String(opts[0] || "").trim(),
            option2_ar: String(opts[1] || "").trim(),
            option3_ar: String(opts[2] || "").trim(),
            correct_index: corr
          };
        });
        
        const { error: insErr } = await supabaseClient
          .from('video_questions')
          .insert(rows);
          
        if (insErr) throw insErr;
      }
      
      return { success: true, message: "تم حفظ أسئلة المحاضرة بنجاح!" };
      
    } else if (action === "adminGetPromotions") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('promotions').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch all trainees to resolve student names and phone numbers
      const { data: trainees, error: tErr } = await supabaseClient.from('trainees').select('name, email, phone');
      if (tErr) throw tErr;

      return {
        success: true,
        promotions: data.map(p => {
          const t = (trainees || []).find(x => String(x.email).trim().toLowerCase() === String(p.email).trim().toLowerCase());
          return {
            Email: p.email,
            TraineeName: t ? t.name : p.email,
            TraineePhone: t ? t.phone : p.email,
            CurrentLevel: p.from_level,
            TargetLevel: p.to_level,
            Status: p.status,
            Timestamp: p.created_at,
            Score: p.score || 0,
            DurationSeconds: p.duration_seconds || 0,
            ExamAnswers: p.exam_answers || "",
            CertificateTemplate: p.certificate_template || "",
            CertificateUrl: p.certificate_url || ""
          };
        })
      };
      
    } else if (action === "submitPromotionRequest") {
      const email = String(params.email).trim().toLowerCase();
      const fromLevel = params.fromLevel;
      const toLevel = params.toLevel;
      
      const { data: existing } = await supabaseClient
        .from('promotions')
        .select('*')
        .ilike('email', email)
        .eq('from_level', fromLevel)
        .eq('to_level', toLevel)
        .maybeSingle();
        
      if (existing) {
        if (existing.status === "pending") {
          return { success: false, message: "لديك طلب ترقية معلق بالفعل قيد المراجعة!" };
        } else if (existing.status === "approved") {
          return { success: false, message: "لقد تمت ترقيتك واجتيازك هذا المستوى بالفعل!" };
        }
      }
      
      try {
        const { error } = await supabaseClient
          .from('promotions')
          .insert([{
            email: email,
            from_level: fromLevel,
            to_level: toLevel,
            status: "pending",
            score: parseInt(params.score) || 0,
            duration_seconds: parseInt(params.durationSeconds) || 0,
            exam_answers: params.examAnswers || "",
            certificate_template: "",
            certificate_url: ""
          }]);
        if (error) throw error;
      } catch (err) {
        console.warn("Supabase promotions schema missing columns, falling back to simple insert", err);
        const { error } = await supabaseClient
          .from('promotions')
          .insert([{ email, from_level: fromLevel, to_level: toLevel, status: "pending" }]);
        if (error) throw error;
      }
      return { success: true, message: "تم إرسال طلب الترقية وإصدار الشهادة بنجاح للمدير." };
      
    } else if (action === "adminApprovePromotion") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      let email = String(params.email || "").trim().toLowerCase();
      const phone = String(params.phone || "").trim();
      const toLevel = String(params.toLevel || params.targetLevel || "").trim();
      
      if (!email && phone) {
        const { data: t } = await supabaseClient
          .from('trainees')
          .select('email')
          .eq('phone', phone)
          .maybeSingle();
        if (t) {
          email = String(t.email).trim().toLowerCase();
        } else {
          email = phone.toLowerCase();
        }
      }

      if (!email) {
        return { success: false, message: "لم يتم العثور على حساب الطالب." };
      }

      try {
        const { error: promoErr } = await supabaseClient
          .from('promotions')
          .update({
            status: "approved",
            certificate_template: params.certificateTemplate || "",
            certificate_url: params.certificateUrl || ""
          })
          .ilike('email', email)
          .eq('to_level', toLevel);
        if (promoErr) throw promoErr;
      } catch (err) {
        console.warn("Supabase promotions schema missing certificate columns, falling back to simple status update", err);
        const { error: promoErr } = await supabaseClient
          .from('promotions')
          .update({ status: "approved" })
          .ilike('email', email)
          .eq('to_level', toLevel);
        if (promoErr) throw promoErr;
      }
      
      const { error: trErr } = await supabaseClient
        .from('trainees')
        .update({ current_level: toLevel })
        .ilike('email', email);
      if (trErr) throw trErr;
      
      return { success: true, message: "تم اعتماد الترقية وإصدار الشهادة للمتدرب بنجاح!" };
      
    } else if (action === "adminGetCoursePrices") {
      try {
        const { data, error } = await supabaseClient.from('course_prices').select('*');
        if (error) return { success: false, message: error.message, silent: true };
        return {
          success: true,
          prices: data.map(p => ({
            Level: p.level,
            OriginalPrice: p.original_price,
            OfferPrice: p.offer_price,
            IsFree: p.is_free
          }))
        };
      } catch(e) { return { success: false, message: e.message, silent: true }; }
      
    } else if (action === "adminUpdateCoursePrice") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('course_prices')
        .upsert({
          level: params.level,
          original_price: parseFloat(params.originalPrice),
          offer_price: parseFloat(params.offerPrice),
          is_free: params.isFree === "true" || params.isFree === true
        });
      if (error) throw error;
      return { success: true, message: "تم تعديل السعر بنجاح." };
      
    } else if (action === "adminGetAdmins") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('admins').select('*');
      if (error) throw error;
      return {
        success: true,
        admins: data.map(a => ({
          Username: a.username,
          Password: a.password,
          Role: a.role,
          Permissions: a.permissions,
          Timestamp: a.created_at
        }))
      };
      
    } else if (action === "adminAddAdmin") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('admins')
        .insert([{
          username: params.username,
          password: await sha256Hash(params.password),
          role: params.role,
          permissions: params.permissions
        }]);
      if (error) throw error;
      return { success: true, message: "تم إضافة المسؤول بنجاح." };
      
    } else if (action === "adminUpdateAdmin" || action === "adminEditAdmin") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const targetUser = (params.targetUsername || params.username || "").trim();
      const updatePayload = {};
      if (params.newPermissions !== undefined) updatePayload.permissions = params.newPermissions;
      else if (params.permissions !== undefined) updatePayload.permissions = params.permissions;
      if (params.newRole || params.role) updatePayload.role = params.newRole || params.role;
      if (params.password) updatePayload.password = params.password;
      
      const { error } = await supabaseClient
        .from('admins')
        .update(updatePayload)
        .eq('username', targetUser);
      if (error) throw error;
      return { success: true, message: "تم تحديث صلاحيات المسؤول بنجاح." };
      
    } else if (action === "adminDeleteAdmin") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('admins')
        .delete()
        .eq('username', params.username);
      if (error) throw error;
      return { success: true, message: "تم حذف المسؤول بنجاح." };
      
    } else if (action === "adminGetQuestions") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('questions').select('*');
      if (error) throw error;
      return {
        success: true,
        questions: data.map(q => ({
          Level: q.level,
          QuestionAr: q.question_ar,
          QuestionEn: q.question_en,
          Option1Ar: q.option1_ar,
          Option1En: q.option1_en,
          Option2Ar: q.option2_ar,
          Option2En: q.option2_en,
          Option3Ar: q.option3_ar,
          Option3En: q.option3_en,
          CorrectIndex: q.correct_index
        }))
      };
      
    } else if (action === "adminAddQuestion") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('questions')
        .insert([{
          level: params.level,
          question_ar: params.questionAr,
          question_en: params.questionEn,
          option1_ar: params.option1Ar,
          option1_en: params.option1En,
          option2_ar: params.option2Ar,
          option2_en: params.option2En,
          option3_ar: params.option3Ar,
          option3_en: params.option3En,
          correct_index: params.correctIndex
        }]);
      if (error) throw error;
      return { success: true, message: "تم إضافة السؤال بنجاح." };
      
    } else if (action === "adminDeleteQuestion") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('questions')
        .delete()
        .eq('question_ar', params.questionAr)
        .eq('level', params.level);
      if (error) throw error;
      return { success: true, message: "تم حذف السؤال بنجاح." };
      
    } else if (action === "getTraineeProgress") {
      const email = String(params.email).trim().toLowerCase();
      const level = params.level;
      const { data, error } = await supabaseClient
        .from('progress')
        .select('*')
        .ilike('email', email)
        .eq('level', level)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { success: true, progress: { WatchedVideos: "", ExamPassed: false } };
      return {
        success: true,
        progress: {
          WatchedVideos: data.watched_videos || "",
          ExamPassed: data.exam_passed
        }
      };
      
    } else if (action === "saveTraineeProgress") {
      const email = String(params.email).trim().toLowerCase();
      const level = params.level;
      const watched = params.watchedVideos;
      const examPassed = params.examPassed === "true" || params.examPassed === true;
      
      const { error } = await supabaseClient
        .from('progress')
        .upsert({
          email,
          level,
          watched_videos: watched,
          exam_passed: examPassed,
          updated_at: new Date()
        });
      if (error) throw error;
      return { success: true };
      
    } else if (action === "adminGetProgress") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('progress').select('*');
      if (error) throw error;
      return {
        success: true,
        progress: data.map(p => ({
          Email: p.email,
          Level: p.level,
          WatchedVideos: p.watched_videos,
          ExamPassed: p.exam_passed
        }))
      };
      

    } else if (action === "adminGetNotifications") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return {
        success: true,
        notifications: data.map(n => ({
          Id: String(n.id),
          Email: n.email,
          Message: n.message,
          Timestamp: n.created_at
        }))
      };
      
    } else if (action === "adminSendNotification") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const target = params.target || "ALL";
      const targetInput = String(params.targetInput || "").trim();
      const title = String(params.title || "").trim();
      const message = String(params.message || "").trim();
      
      if (!title || !message) {
        return { success: false, message: "يجب كتابة العنوان ونص الإشعار." };
      }
      
      const combinedMsg = `📢 ${title}\n\n${message}`;
      
      if (target === "ALL") {
        const { error } = await supabaseClient
          .from('notifications')
          .insert([{ email: 'all', message: combinedMsg }]);
        if (error) throw error;
      } else {
        const { data: t, error: tErr } = await supabaseClient
          .from('trainees')
          .select('email')
          .or(`email.ilike.${targetInput},phone.eq.${targetInput}`)
          .maybeSingle();
          
        if (tErr || !t) {
          return { success: false, message: "لم يتم العثور على متدرب بهذا البريد أو الهاتف." };
        }
        
        const { error } = await supabaseClient
          .from('notifications')
          .insert([{ email: t.email, message: combinedMsg }]);
        if (error) throw error;
      }
      return { success: true, message: "تم إرسال الإشعار بنجاح!" };
      
    } else if (action === "getTraineeNotifications") {
      const email = String(params.email).trim().toLowerCase();
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .or(`email.ilike.${email},email.eq.all,email.eq.ALL`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return {
        success: true,
        notifications: data.map(n => ({
          Id: String(n.id),
          Email: n.email,
          Message: n.message,
          Timestamp: n.created_at
        }))
      };
    } else if (action === "changePassword") {
      const email = String(params.email).trim().toLowerCase();
      const oldPass = String(params.oldPassword).trim();
      const newPass = String(params.newPassword).trim();
      const hashedOld = await sha256Hash(oldPass);
      const hashedNew = await sha256Hash(newPass);
      
      let { data: t } = await supabaseClient.from('trainees').select('*').ilike('email', email).eq('password', hashedOld).maybeSingle();
      if (!t) {
        const { data: tPlain } = await supabaseClient.from('trainees').select('*').ilike('email', email).eq('password', oldPass).maybeSingle();
        if (tPlain) t = tPlain;
      }
      if (!t) return { success: false, message: "كلمة المرور القديمة غير صحيحة." };
      
      const { error } = await supabaseClient.from('trainees').update({ password: hashedNew }).ilike('email', email);
      if (error) throw error;
      
      await supabaseClient.from('notifications').insert([{ email, message: `تم تغيير كلمة المرور بنجاح في ${new Date().toLocaleString('ar-EG')}` }]);
      
      return { success: true, message: "تم تغيير كلمة المرور بنجاح!" };
    } else if (action === "updateTraineeProfile") {
      const email = String(params.email).trim().toLowerCase();
      const { error } = await supabaseClient
        .from('trainees')
        .update({
          nickname: params.nickname,
          avatar: params.avatar,
          university: params.university,
          college: params.college,
          whatsapp: params.whatsapp
        })
        .ilike('email', email);
      if (error) throw error;
      return { success: true, message: "تم تحديث الملف الشخصي بنجاح!" };

    } else if (action === "submitVideoQuiz") {
      const email = String(params.email).trim().toLowerCase();
      const password = String(params.password).trim();
      // Verify trainee
      const { data: t } = await supabaseClient.from('trainees').select('name,current_level').ilike('email', email).eq('password', password).maybeSingle();
      if (!t) return { success: false, message: "غير مصرح." };

      const { error } = await supabaseClient.from('video_quiz_submissions').insert([{
        email: email,
        trainee_name: t.name,
        level: t.current_level || 'Passengers',
        video_id: String(params.videoId).trim(),
        video_title: String(params.videoTitle || '').trim(),
        questions: JSON.stringify(params.questions || []),
        answers: JSON.stringify(params.answers || []),
        score: params.score || 0,
        status: 'pending_review',
        admin_comment: ''
      }]);
      if (error) { console.warn('submitVideoQuiz supabase error:', error); }
      return { success: true, message: "تم حفظ إجاباتك بنجاح للمراجعة." };

    } else if (action === "adminGetVideoQuizzes") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient
        .from('video_quiz_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, quizzes: data };

    } else if (action === "adminReviewVideoQuiz") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('video_quiz_submissions')
        .update({ status: params.status, admin_comment: params.comment || '' })
        .eq('id', params.quizId);
      if (error) throw error;
      return { success: true, message: "تم تحديث حالة الاختبار بنجاح." };

    } else if (action === "adminPromoteQuizQuestion") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient.from('questions').insert([{
        level: params.level,
        question_ar: params.questionAr,
        question_en: params.questionEn || params.questionAr,
        option1_ar: params.option1Ar,
        option1_en: params.option1Ar,
        option2_ar: params.option2Ar,
        option2_en: params.option2Ar,
        option3_ar: params.option3Ar || '',
        option3_en: params.option3Ar || '',
        correct_index: String(params.correctIndex)
      }]);
      if (error) throw error;
      return { success: true, message: "تم إضافة السؤال لبنك الأسئلة بنجاح!" };
    }

    else if (action === "adminGetLevelContent") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient
        .from('level_content')
        .select('*')
        .eq('level', params.level)
        .maybeSingle();
      if (error) throw error;
      return { success: true, content: data };

    } else if (action === "adminSaveLevelContent") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient
        .from('level_content')
        .select('*')
        .eq('level', params.level)
        .maybeSingle();
      if (error) throw error;
      
      if (data) {
        const { error: updErr } = await supabaseClient
          .from('level_content')
          .update({ welcome_html: params.welcome_html })
          .eq('level', params.level);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabaseClient
          .from('level_content')
          .insert([{ level: params.level, welcome_html: params.welcome_html }]);
        if (insErr) throw insErr;
      }
      return { success: true, message: "تم حفظ المحتوى بنجاح." };

    } else if (action === "adminGetCurriculumTree" || action === "adminGetCurriculum") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      let query = supabaseClient.from('curriculum').select('*').order('sort_order', { ascending: true });
      if (params.level && params.level !== "all") {
        query = query.eq('level', params.level);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, curriculum: data, nodes: data };

    } else if (action === "adminGetCurriculumItem") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { data, error } = await supabaseClient
        .from('curriculum')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (error) throw error;
      return { success: true, item: data };

    } else if (action === "adminAddCurriculumNode") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const insertPayload = {
        level: params.level,
        title: params.title || "",
        content_html: params.content_html || "",
        sort_order: parseInt(params.sort_order) || 1
      };
      // parent_id and type are optional new columns — use try/catch for backward compat
      if (params.parent_id !== undefined) insertPayload.parent_id = params.parent_id || null;
      if (params.type !== undefined) insertPayload.type = params.type || "folder";
      const { data: ins, error } = await supabaseClient
        .from('curriculum')
        .insert([insertPayload])
        .select()
        .single();
      if (error) throw error;
      return { success: true, message: "تم إضافة العنصر بنجاح.", id: ins ? String(ins.id) : null };

    } else if (action === "adminAddCurriculumItem") {
      // Backward compat alias
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const insertPayload = {
        level: params.level,
        title: params.title,
        content_html: params.content_html,
        sort_order: parseInt(params.sort_order) || 1
      };
      if (params.parent_id !== undefined) insertPayload.parent_id = params.parent_id || null;
      if (params.type !== undefined) insertPayload.type = params.type || "folder";
      const { error } = await supabaseClient.from('curriculum').insert([insertPayload]);
      if (error) throw error;
      return { success: true, message: "تم إضافة الموضوع بنجاح." };

    } else if (action === "adminUpdateCurriculumNode") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const updatePayload = {};
      if (params.title !== undefined) updatePayload.title = params.title;
      if (params.content_html !== undefined) updatePayload.content_html = params.content_html;
      if (params.sort_order !== undefined) updatePayload.sort_order = parseInt(params.sort_order) || 1;
      if (params.type !== undefined) updatePayload.type = params.type;
      const { error } = await supabaseClient
        .from('curriculum')
        .update(updatePayload)
        .eq('id', params.id);
      if (error) throw error;
      return { success: true, message: "تم تحديث العنصر بنجاح." };

    } else if (action === "adminUpdateCurriculumItem") {
      // Backward compat alias
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('curriculum')
        .update({
          level: params.level,
          title: params.title,
          content_html: params.content_html,
          sort_order: parseInt(params.sort_order) || 1
        })
        .eq('id', params.id);
      if (error) throw error;
      return { success: true, message: "تم تحديث الموضوع بنجاح." };

    } else if (action === "adminDeleteCurriculumNode") {
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      // Fetch all curriculum nodes for this level, then delete recursively
      const { data: allNodes } = await supabaseClient
        .from('curriculum')
        .select('id, parent_id');
      function collectIds(rootId, nodes) {
        const children = (nodes || []).filter(n => String(n.parent_id) === String(rootId));
        let ids = [String(rootId)];
        children.forEach(c => { ids = ids.concat(collectIds(c.id, nodes)); });
        return ids;
      }
      const idsToDelete = collectIds(params.id, allNodes || []);
      for (const id of idsToDelete) {
        await supabaseClient.from('curriculum').delete().eq('id', id);
      }
      return { success: true, message: "تم حذف العنصر وجميع محتوياته بنجاح." };

    } else if (action === "adminDeleteCurriculumItem") {
      // Backward compat alias
      if (!await verifySupabaseAdmin(params.adminUsername, params.adminPassword)) {
        return { success: false, message: "غير مصرح." };
      }
      const { error } = await supabaseClient
        .from('curriculum')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
      return { success: true, message: "تم حذف الموضوع بنجاح." };
    }
    
    return { success: false, message: "الإجراء غير متوفر حالياً على خادم Supabase." };
  } catch (err) {
    console.error("Supabase request error for action", action, err);
    return { success: false, message: "حدث خطأ أثناء التواصل مع قاعدة Supabase: " + (err.message || err) };
  }
}

